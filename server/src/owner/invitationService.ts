import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db } from '../prisma/db.js';
import { createSmtpInvitationMailer, type InvitationMailer } from './invitationMailer.js';
export const invitationInput = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
    role: z.enum(['MANAGER', 'STAFF']),
    branchId: z.uuid(),
  })
  .strict();
export type BusinessInvitationInput = z.infer<typeof invitationInput> & {
  businessId: string;
  invitedByUserId: string;
};
export class InvitationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
const fail = (code: string, message: string, status = 409): never => {
  throw new InvitationError(code, message, status);
};
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
type Database = typeof db;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type Invitation = Awaited<ReturnType<Database['orm']['public']['BusinessInvitation']['create']>>;
const safe = (r: Invitation) => ({
  id: r.id,
  email: r.email,
  fullName: r.fullName,
  role: r.role,
  branchId: r.branchId,
  status: r.status,
  deliveryStatus: r.deliveryStatus,
  expiresAt: r.expiresAt,
  createdAt: r.createdAt,
});
export function createInvitationService(
  database: Database = db,
  mailer: InvitationMailer = createSmtpInvitationMailer(),
  config: { publicUrl?: string; ttlHours?: number; now?: () => number } = {},
) {
  const now = config.now ?? Date.now;
  const ttl = config.ttlHours ?? Number(process.env.INVITATION_TTL_HOURS ?? 72);
  function publicUrl() {
    try {
      const url = new URL(
        config.publicUrl ?? process.env.INVITATION_PUBLIC_URL ?? process.env.CLIENT_URL ?? '',
      );
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') ||
        !Number.isInteger(ttl) ||
        ttl < 1 ||
        ttl > 168
      )
        throw new Error();
      return new URL('/invitations/accept', url.origin);
    } catch {
      return fail(
        'INVITATIONS_NOT_CONFIGURED',
        'Chưa cấu hình URL hoặc thời hạn lời mời hợp lệ.',
        503,
      );
    }
  }
  async function lockBusiness(tx: Transaction, businessId: string) {
    const rows = await tx.query(
      database.raw.sql`SELECT id FROM public."Business" WHERE id = ${businessId}::uuid FOR UPDATE`
        .returnsRow({ id: 'pg/uuid@1' })
        .build(),
    );
    if (!rows.length) fail('BUSINESS_NOT_FOUND', 'Không tìm thấy doanh nghiệp.', 404);
    const business = await tx.orm.public.Business.where({ id: businessId }).first();
    if (
      !business ||
      business.approvalStatus !== 'APPROVED' ||
      business.operationalStatus !== 'ACTIVE'
    )
      fail('BUSINESS_ACCESS_RESTRICTED', 'Doanh nghiệp không còn hoạt động.', 403);
    return business!;
  }
  async function owner(tx: Transaction, businessId: string, userId: string) {
    const member = await tx.orm.public.BusinessMember.where({
      businessId,
      userId,
      role: 'OWNER',
      isActive: true,
    }).first();
    const user = await tx.orm.public.User.where({ id: userId, status: 'ACTIVE' }).first();
    if (!member || !user) fail('FORBIDDEN', 'Bạn không có quyền mời thành viên.', 403);
  }
  async function branch(tx: Transaction, businessId: string, branchId: string) {
    if (!(await tx.orm.public.Branch.where({ id: branchId, businessId, isActive: true }).first()))
      fail('INVALID_BRANCH', 'Chi nhánh không hợp lệ.', 400);
  }
  async function alreadyMember(tx: Transaction, businessId: string, email: string) {
    const user = await tx.orm.public.User.where({ email }).first();
    if (user?.platformRole === 'ADMIN')
      fail('PLATFORM_ACCOUNT', 'Không thể mời tài khoản quản trị nền tảng.', 400);
    if (user && (await tx.orm.public.BusinessMember.where({ businessId, userId: user.id }).first()))
      fail(
        'ALREADY_MEMBER',
        'Email đã là thành viên doanh nghiệp; hãy quản lý quyền trên danh sách hiện có.',
      );
  }
  async function dispatch(row: Invitation, token: string, businessName: string) {
    const url = publicUrl();
    url.hash = `token=${token}`;
    try {
      await mailer.send({
        invitationId: row.id,
        attemptId: row.attemptId,
        email: row.email,
        businessName,
        acceptUrl: url.href,
        expiresAt: row.expiresAt,
      });
    } catch (error) {
      const providerCode =
        error && typeof error === 'object' && 'code' in error
          ? String(error.code)
          : 'DELIVERY_FAILED';
      console.warn('[INVITATION_DELIVERY_FAILED]', {
        invitationId: row.id,
        attemptId: row.attemptId,
        code: ['EAUTH', 'ECONNECTION', 'ETIMEDOUT', 'EDNS', 'ESOCKET', 'ETLS'].includes(
          providerCode,
        )
          ? providerCode
          : 'DELIVERY_FAILED',
      });
      await database.orm.public.BusinessInvitation.where({
        id: row.id,
        attemptId: row.attemptId,
        status: 'PENDING',
      }).update({ deliveryStatus: 'FAILED' });
      return fail(
        'INVITATION_DELIVERY_FAILED',
        'Chưa xác nhận gửi được email. Lời mời đã được lưu, chưa tạo thành viên. Dùng Gửi lại để thử lại.',
        503,
      );
    }
    const updated = await database.orm.public.BusinessInvitation.where({
      id: row.id,
      attemptId: row.attemptId,
      status: 'PENDING',
    }).update({ deliveryStatus: 'SENT' });
    if (!updated)
      fail(
        'INVITATION_CHANGED',
        'Lời mời đã thay đổi trong khi gửi. Hãy kiểm tra lại danh sách.',
        409,
      );
    return { invitationId: row.id, status: 'PENDING' as const, deliveryStatus: 'SENT' as const };
  }
  return {
    async invite(input: BusinessInvitationInput) {
      if (!mailer.available)
        fail(
          'INVITATIONS_NOT_CONFIGURED',
          'Chưa cấu hình dịch vụ gửi lời mời. Chưa tạo tài khoản hoặc thành viên.',
          503,
        );
      publicUrl();
      const { businessId, invitedByUserId, ...details } = input;
      const parsed = invitationInput.safeParse(details);
      if (
        !z.uuid().safeParse(businessId).success ||
        !z.uuid().safeParse(invitedByUserId).success ||
        !parsed.success
      )
        return fail('INVALID_INPUT', 'Thông tin lời mời không hợp lệ.', 400);
      const token = randomBytes(32).toString('hex');
      const result = await database.transaction(async (tx) => {
        const business = await lockBusiness(tx, businessId);
        await owner(tx, businessId, invitedByUserId);
        await branch(tx, businessId, parsed.data.branchId);
        await alreadyMember(tx, businessId, parsed.data.email);
        const existing = await tx.orm.public.BusinessInvitation.where({
          businessId,
          email: parsed.data.email,
        }).first();
        if (
          existing &&
          (existing.status === 'ACCEPTED' ||
            (existing.status === 'PENDING' && Date.parse(existing.expiresAt) > now()))
        )
          fail(
            'INVITATION_EXISTS',
            'Email đã có lời mời. Dùng Gửi lại hoặc Thu hồi trong danh sách lời mời.',
          );
        if (
          existing?.deliveryStatus === 'PENDING_DELIVERY' &&
          now() - Date.parse(existing.attemptedAt) < 60000
        )
          fail('DELIVERY_IN_PROGRESS', 'Lời mời đang được gửi. Vui lòng thử lại sau một phút.');
        const patch = {
          businessId,
          invitedByUserId,
          ...parsed.data,
          status: 'PENDING' as const,
          deliveryStatus: 'PENDING_DELIVERY' as const,
          tokenHash: hash(token),
          attemptId: randomUUID(),
          expiresAt: new Date(now() + ttl * 3600000).toISOString(),
          attemptedAt: new Date(now()).toISOString(),
          acceptedAt: null,
        };
        let row: Invitation;
        if (existing) {
          await tx.orm.public.BusinessInvitation.where({ id: existing.id, businessId }).update(
            patch,
          );
          row = { ...existing, ...patch };
        } else row = await tx.orm.public.BusinessInvitation.create({ id: randomUUID(), ...patch });
        return { row, name: business.name };
      });
      return dispatch(result.row, token, result.name);
    },
    async list(businessId: string, page = 1) {
      return database.transaction(async (tx) => {
        const rows = await tx.query(
          database.raw
            .sql`SELECT id FROM public."BusinessInvitation" WHERE "businessId" = ${businessId}::uuid ORDER BY "createdAt" DESC, id LIMIT 21 OFFSET ${(page - 1) * 20}`
            .returnsRow({ id: 'pg/uuid@1' })
            .build(),
        );
        const invitations = await Promise.all(
          rows
            .slice(0, 20)
            .map(async (row) =>
              safe(
                (await tx.orm.public.BusinessInvitation.where({ id: row.id, businessId }).first())!,
              ),
            ),
        );
        return { invitations, page, hasNext: rows.length > 20 };
      });
    },
    async manage(businessId: string, userId: string, id: string, action: 'resend' | 'revoke') {
      if (action === 'resend' && !mailer.available)
        fail('INVITATIONS_NOT_CONFIGURED', 'Chưa cấu hình dịch vụ gửi lời mời.', 503);
      if (action === 'resend') publicUrl();
      const token = randomBytes(32).toString('hex');
      const result = await database.transaction(async (tx) => {
        const business = await lockBusiness(tx, businessId);
        await owner(tx, businessId, userId);
        const row = await tx.orm.public.BusinessInvitation.where({ id, businessId }).first();
        if (!row) return fail('NOT_FOUND', 'Không tìm thấy lời mời.', 404);
        if (row.status === 'ACCEPTED') fail('ALREADY_ACCEPTED', 'Lời mời đã được chấp nhận.');
        if (action === 'revoke') {
          await tx.orm.public.BusinessInvitation.where({ id, businessId }).update({
            status: 'REVOKED',
          });
          return { row, name: business.name };
        }
        if (
          row.deliveryStatus === 'PENDING_DELIVERY' &&
          now() - Date.parse(row.attemptedAt) < 60000
        )
          fail('DELIVERY_IN_PROGRESS', 'Lời mời đang được gửi. Vui lòng thử lại sau một phút.');
        await branch(tx, businessId, row.branchId);
        await alreadyMember(tx, businessId, row.email);
        const patch = {
          tokenHash: hash(token),
          attemptId: randomUUID(),
          invitedByUserId: userId,
          status: 'PENDING' as const,
          deliveryStatus: 'PENDING_DELIVERY' as const,
          expiresAt: new Date(now() + ttl * 3600000).toISOString(),
          attemptedAt: new Date(now()).toISOString(),
        };
        await tx.orm.public.BusinessInvitation.where({ id, businessId }).update(patch);
        return { row: { ...row, ...patch }, name: business.name };
      });
      return action === 'revoke'
        ? { invitationId: id, status: 'REVOKED' }
        : dispatch(result.row, token, result.name);
    },
    async accept(userId: string, token: string) {
      if (!tokenSchema.safeParse(token).success)
        return fail('INVALID_INVITATION', 'Lời mời không hợp lệ hoặc đã hết hạn.', 400);
      return database.transaction(async (tx) => {
        await tx.query(
          database.raw.sql`SELECT id FROM public."User" WHERE id = ${userId}::uuid FOR UPDATE`
            .returnsRow({ id: 'pg/uuid@1' })
            .build(),
        );
        const user = await tx.orm.public.User.where({ id: userId, status: 'ACTIVE' }).first();
        if (!user || user.platformRole === 'ADMIN')
          fail('FORBIDDEN', 'Tài khoản không thể nhận lời mời.', 403);
        const row = await tx.orm.public.BusinessInvitation.where({
          tokenHash: hash(token),
        }).first();
        if (!row) return fail('INVALID_INVITATION', 'Lời mời không hợp lệ hoặc đã hết hạn.', 400);
        await lockBusiness(tx, row.businessId);
        const current = await tx.orm.public.BusinessInvitation.where({
          id: row.id,
          tokenHash: hash(token),
          status: 'PENDING',
        }).first();
        if (!current || Date.parse(current.expiresAt) <= now())
          fail('INVALID_INVITATION', 'Lời mời đã hết hạn, bị thu hồi hoặc đã sử dụng.', 409);
        if (user!.email.trim().toLowerCase() !== row.email)
          fail('EMAIL_MISMATCH', 'Hãy đăng nhập bằng đúng email nhận lời mời.', 403);
        await owner(tx, row.businessId, current!.invitedByUserId);
        await branch(tx, row.businessId, row.branchId);
        if (
          await tx.orm.public.BusinessMember.where({ userId, businessId: row.businessId }).first()
        )
          fail('ALREADY_MEMBER', 'Tài khoản đã là thành viên doanh nghiệp.');
        // Do not strand an existing account: workspace selection is not yet implemented.
        if (await tx.orm.public.BusinessMember.where({ userId, isActive: true }).first())
          fail(
            'WORKSPACE_SELECTION_UNAVAILABLE',
            'Tài khoản đã có doanh nghiệp hoạt động. Hiện chưa hỗ trợ chọn nhiều workspace.',
            409,
          );
        if (!['MANAGER', 'STAFF'].includes(row.role))
          fail('INVALID_ROLE', 'Vai trò lời mời không hợp lệ.', 400);
        await tx.orm.public.BusinessMember.create({
          id: randomUUID(),
          businessId: row.businessId,
          userId,
          branchId: row.branchId,
          role: row.role,
          isActive: true,
        });
        await tx.orm.public.BusinessInvitation.where({
          id: row.id,
          status: 'PENDING',
          tokenHash: hash(token),
        }).update({ status: 'ACCEPTED', acceptedAt: new Date(now()).toISOString() });
        return { businessId: row.businessId, role: row.role };
      });
    },
  };
}
export const invitationService = createInvitationService();
