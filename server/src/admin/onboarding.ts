import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../prisma/db.js';

const router = Router();
router.use(authenticate);
router.use(async (req, res, next) => {
  try {
    const user = await db.orm.public.User.where({
      id: (req as AuthenticatedRequest).user.userId,
      status: 'ACTIVE',
    })
      .select('id', 'status', 'platformRole')
      .first();
    if (!user || user.status !== 'ACTIVE' || user.platformRole === 'ADMIN')
      return res.status(403).json({ message: 'Tài khoản không thể gửi hồ sơ doanh nghiệp.' });
    next();
  } catch {
    res.status(503).json({ message: 'Không thể xác minh tài khoản.' });
  }
});
router.get('/', async (req, res) => {
  try {
    const ownerId = (req as AuthenticatedRequest).user.userId;
    const rows = await db.transaction((tx) =>
      tx.query(
        db.raw.sql`SELECT json_build_object('application', COALESCE(
      (SELECT json_build_object('id', a.id, 'businessId', a."businessId", 'name', b.name, 'status', a.status, 'operationalStatus', b."operationalStatus", 'submittedAt', a."submittedAt", 'reviewedAt', a."reviewedAt", 'reviewReason', a."reviewReason") FROM public."BusinessApplication" a JOIN public."Business" b ON b.id = a."businessId" WHERE a."ownerId" = ${ownerId}::uuid ORDER BY a."submittedAt" DESC LIMIT 1),
      (SELECT json_build_object('businessId', b.id, 'name', b.name, 'status', b."approvalStatus", 'operationalStatus', b."operationalStatus", 'reviewReason', NULL) FROM public."BusinessMember" m JOIN public."Business" b ON b.id = m."businessId" WHERE m."userId" = ${ownerId}::uuid AND m."isActive" = true ORDER BY b.id LIMIT 1)
    )) AS data`
          .returnsRow({ data: 'pg/json@1' })
          .build(),
      ),
    );
    res.json(rows[0]?.data);
  } catch {
    res.status(503).json({ message: 'Không thể tải hồ sơ doanh nghiệp.' });
  }
});
router.post('/', async (req, res) => {
  const input = z
    .object({
      name: z.string().trim().min(2).max(120),
      contactPhone: z.string().trim().min(5).max(30),
      address: z.string().trim().min(5).max(240),
    })
    .strict()
    .safeParse(req.body);
  if (!input.success)
    return res.status(400).json({ message: 'Thông tin doanh nghiệp không hợp lệ.' });
  try {
    const ownerId = (req as AuthenticatedRequest).user.userId;
    const data = await db.transaction(async (tx) => {
      await tx.query(
        db.raw.sql`SELECT id FROM public."User" WHERE id = ${ownerId}::uuid FOR UPDATE`
          .returnsRow({ id: 'pg/uuid@1' })
          .build(),
      );
      // A public account may submit one application; no privileged member or existing tenant is repurposed.
      const existing = await tx.orm.public.BusinessMember.where({ userId: ownerId }).first();
      if (existing) return null;
      const businessId = randomUUID();
      await tx.orm.public.Business.create({
        id: businessId,
        name: input.data.name,
        approvalStatus: 'PENDING',
        operationalStatus: 'ACTIVE',
      });
      await tx.orm.public.BusinessMember.create({
        id: randomUUID(),
        businessId,
        userId: ownerId,
        role: 'OWNER',
        isActive: true,
      });
      const application = await tx.orm.public.BusinessApplication.create({
        id: randomUUID(),
        businessId,
        ownerId,
        status: 'PENDING',
        contactPhone: input.data.contactPhone,
        address: input.data.address,
      });
      await tx.orm.public.BusinessSettings.create({
        businessId,
        contactPhone: input.data.contactPhone,
        address: input.data.address,
      });
      return { id: application.id, businessId, status: 'PENDING' };
    });
    return data
      ? res.status(201).json(data)
      : res
          .status(409)
          .json({ message: 'Tài khoản đã thuộc doanh nghiệp. Không thể gửi hồ sơ trùng.' });
  } catch {
    res.status(503).json({ message: 'Không thể gửi hồ sơ. Vui lòng thử lại.' });
  }
});
export default router;
