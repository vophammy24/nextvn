import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db } from '../../prisma/db.js';
import { createSmtpMessageMailer, type MessageMailer } from '../../lib/smtpMailer.js';
import { hashPassword, passwordPolicy } from './passwordPolicy.js';

export const recoveryEmail = z.string().trim().toLowerCase().max(254).pipe(z.email());
export const resetToken = z.string().regex(/^[a-f0-9]{64}$/);
export const forgotMessage =
  'Nếu email được liên kết với một tài khoản NextVN, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.';
export const invalidResetMessage =
  'Liên kết đặt lại mật khẩu không hợp lệ, đã sử dụng hoặc hết hạn. Vui lòng yêu cầu liên kết mới.';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
type Database = typeof db;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
export class PasswordResetError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export function createPasswordResetService(
  database: Database = db,
  mailer: MessageMailer = createSmtpMessageMailer(),
  config: { publicUrl?: string; now?: () => number } = {},
) {
  const now = config.now ?? Date.now;
  async function lockUser(tx: Transaction, userId: string) {
    await tx.query(
      database.raw.sql`SELECT id FROM public."User" WHERE id = ${userId}::uuid FOR UPDATE`
        .returnsRow({ id: 'pg/uuid@1' })
        .build(),
    );
  }
  // Persistent across workers. No raw IP, email or token is stored in throttle keys.
  async function allow(scope: string, identifier: string, limit: number, cooldown = 0) {
    const id = digest(`${scope}:${identifier}`);
    return database.transaction(async (tx) => {
      await tx.query(
        database.raw.sql`SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))::text AS locked`
          .returnsRow({ locked: 'pg/text@1' })
          .build(),
      );
      const row = await tx.orm.public.PasswordResetThrottle.where({ id }).first();
      const active = row && Date.parse(row.windowEndsAt) > now();
      if (active && (row.hits >= limit || now() - Date.parse(row.lastRequestAt) < cooldown))
        return false;
      const data = {
        hits: active ? row.hits + 1 : 1,
        windowEndsAt: active ? row.windowEndsAt : new Date(now() + 15 * 60000).toISOString(),
        lastRequestAt: new Date(now()).toISOString(),
      };
      if (row) await tx.orm.public.PasswordResetThrottle.where({ id }).update(data);
      else await tx.orm.public.PasswordResetThrottle.create({ id, ...data });
      return true;
    });
  }
  function frontendUrl(token: string) {
    const url = new URL(
      config.publicUrl ?? process.env.PASSWORD_RESET_PUBLIC_URL ?? process.env.CLIENT_URL ?? '',
    );
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')
    )
      throw new Error('INVALID_RECOVERY_ORIGIN');
    const link = new URL('/reset-password', url.origin);
    link.searchParams.set('token', token);
    return link.href;
  }
  return {
    async forgot(emailInput: string, ip: string): Promise<(() => Promise<void>) | null> {
      const email = recoveryEmail.parse(emailInput);
      if (!(await allow('forgot-ip', ip, 5)) || !(await allow('forgot-email', email, 3, 60000)))
        return null;
      // Config and account failures deliberately share the generic public response.
      if (!mailer.available) return null;
      const token = randomBytes(32).toString('hex');
      const link = frontendUrl(token);
      const account = await database.orm.public.User.where({ email, status: 'ACTIVE' }).first();
      if (!account) return null;
      const issued = await database.transaction(async (tx) => {
        await lockUser(tx, account.id);
        const user = await tx.orm.public.User.where({
          id: account.id,
          email,
          status: 'ACTIVE',
        }).first();
        if (!user) return false;
        // Serialize replacement with reset consumption and recheck identity under the lock.
        const previous = await tx.orm.public.PasswordResetToken.where({ userId: user.id }).first();
        const data = {
          tokenHash: digest(token),
          consumedAt: null,
          credentialVersion: user.credentialVersion,
          expiresAt: new Date(now() + 30 * 60000).toISOString(),
          createdAt: new Date(now()).toISOString(),
        };
        if (previous)
          await tx.orm.public.PasswordResetToken.where({ id: previous.id }).update(data);
        else
          await tx.orm.public.PasswordResetToken.create({
            id: randomUUID(),
            userId: user.id,
            ...data,
          });
        await tx.orm.public.AuthSecurityEvent.create({
          id: randomUUID(),
          userId: user.id,
          action: 'PASSWORD_RESET_REQUESTED',
        });
        return true;
      });
      if (!issued) return null;
      // Invoke after replying: SMTP latency/failure must not disclose account existence.
      // Token exists only in this short-lived closure, never in a durable plaintext queue.
      return async () => {
        try {
          await mailer.send({
            email,
            subject: 'Đặt lại mật khẩu NextVN',
            text: `Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản NextVN của bạn.\n\nNhấn vào liên kết bên dưới để tạo mật khẩu mới:\n${link}\n\nLiên kết chỉ có hiệu lực trong 30 phút và chỉ dùng một lần.\nNếu bạn không gửi yêu cầu này, bạn có thể bỏ qua email.\n\nNextVN`,
          });
        } catch {
          console.warn('[PASSWORD_RESET_DELIVERY_FAILED]');
        }
      };
    },
    async reset(token: string, newPassword: string, ip: string) {
      if (!(await allow('reset-ip', ip, 10)))
        throw new PasswordResetError(
          429,
          'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.',
        );
      if (!resetToken.safeParse(token).success)
        throw new PasswordResetError(400, invalidResetMessage);
      if (!passwordPolicy.safeParse(newPassword).success)
        throw new PasswordResetError(400, 'Mật khẩu cần ít nhất 8 ký tự và tối đa 72 byte UTF-8.');
      const tokenHash = digest(token);
      const candidate = await database.orm.public.PasswordResetToken.where({ tokenHash }).first();
      if (!candidate || candidate.consumedAt || Date.parse(candidate.expiresAt) <= now())
        throw new PasswordResetError(400, invalidResetMessage);
      const passwordHash = await hashPassword(newPassword);
      await database.transaction(async (tx) => {
        await lockUser(tx, candidate.userId);
        const row = await tx.orm.public.PasswordResetToken.where({
          id: candidate.id,
          tokenHash,
          consumedAt: null,
        }).first();
        const user = await tx.orm.public.User.where({
          id: candidate.userId,
          status: 'ACTIVE',
        }).first();
        if (
          !row ||
          !user ||
          Date.parse(row.expiresAt) <= now() ||
          row.credentialVersion !== user.credentialVersion
        )
          throw new PasswordResetError(400, invalidResetMessage);
        await tx.orm.public.User.where({ id: user.id }).update({
          passwordHash,
          credentialVersion: user.credentialVersion + 1,
        });
        await tx.orm.public.PasswordResetToken.where({ id: row.id, consumedAt: null }).update({
          consumedAt: new Date(now()).toISOString(),
        });
        await tx.orm.public.AuthSecurityEvent.create({
          id: randomUUID(),
          userId: user.id,
          action: 'PASSWORD_RESET_COMPLETED',
        });
      });
    },
  };
}
export const passwordResetService = createPasswordResetService();
