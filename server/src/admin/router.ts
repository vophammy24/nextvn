import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { db } from '../prisma/db.js';
import { requireSystemAdmin } from './security.js';
import { AdminConflict, createAdminService } from './service.js';

const router = Router();
router.use(authenticate, requireSystemAdmin);
const service = createAdminService();
const idSchema = z.uuid();
const actions = [
  'APPLICATION_APPROVED',
  'APPLICATION_REJECTED',
  'BUSINESS_ACTIVE',
  'BUSINESS_SUSPENDED',
  'ADMIN_BOOTSTRAPPED',
] as const;
const filters = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().trim().max(120).default(''),
    status: z
      .enum([
        '',
        'PENDING',
        'APPROVED',
        'REJECTED',
        'ACTIVE',
        'INACTIVE',
        'SUSPENDED',
        'TRIALING',
        'PAST_DUE',
        'CANCELED',
        'EXPIRED',
      ])
      .default(''),
    operationalStatus: z.enum(['', 'ACTIVE', 'SUSPENDED']).default(''),
    action: z.enum(['', ...actions]).default(''),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    sort: z.enum(['newest', 'oldest']).default('newest'),
  })
  .strict()
  .refine((v) => !v.from || !v.to || v.from <= v.to);

router.get('/session', (_req, res) => res.json({ user: res.locals.admin, role: 'SYSTEM_ADMIN' }));
router.get('/dashboard', async (_req, res, next) => {
  try {
    const rows = await db.transaction((tx) =>
      tx.query(
        db.raw.sql`SELECT json_build_object(
      'businesses', (SELECT count(*) FROM public."Business"),
      'pending', (SELECT count(*) FROM public."BusinessApplication" WHERE status = 'PENDING'),
      'approved', (SELECT count(*) FROM public."Business" WHERE "approvalStatus" = 'APPROVED'),
      'suspended', (SELECT count(*) FROM public."Business" WHERE "operationalStatus" = 'SUSPENDED'),
      'owners', (SELECT count(DISTINCT "userId") FROM public."BusinessMember" WHERE role = 'OWNER'),
      'activeSubscriptions', (SELECT count(*) FROM public."BusinessSubscription" WHERE status = 'ACTIVE'),
      'expiringSubscriptions', (SELECT count(*) FROM public."BusinessSubscription" WHERE status IN ('ACTIVE', 'TRIALING') AND "periodEndsAt" >= now() AND "periodEndsAt" < now() + interval '30 days')
    ) AS data`
          .returnsRow({ data: 'pg/json@1' })
          .build(),
      ),
    );
    res.json(rows[0]?.data);
  } catch (error) {
    next(error);
  }
});

// Explicit projections: never select User.*, billing provider references or tenant transactions.
router.get('/:collection', async (req, res, next) => {
  const parsed = filters.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: 'Bộ lọc không hợp lệ.' });
  const { page, pageSize, q, status, operationalStatus, action, from, to, sort } = parsed.data;
  const offset = (page - 1) * pageSize;
  const search = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
  try {
    let result;
    switch (req.params.collection) {
      case 'approvals':
        result = await db.transaction((tx) =>
          tx.query(
            db.raw.sql`WITH filtered AS (
          SELECT a.id, a."businessId", a."ownerId", b.name, a.status, a."contactPhone", a.address, a."submittedAt", a."reviewedAt", a."reviewerId", a."reviewReason", u."fullName" AS "ownerName", u.email AS "ownerEmail"
          FROM public."BusinessApplication" a JOIN public."Business" b ON b.id = a."businessId" JOIN public."User" u ON u.id = a."ownerId"
          WHERE (${status} = '' OR a.status::text = ${status}) AND (b.name ILIKE ${search} OR u.email ILIKE ${search} OR u."fullName" ILIKE ${search})
        ), page AS (SELECT * FROM filtered ORDER BY CASE WHEN ${sort} = 'oldest' THEN "submittedAt" END ASC, CASE WHEN ${sort} = 'newest' THEN "submittedAt" END DESC, id LIMIT ${pageSize} OFFSET ${offset})
        SELECT json_build_object('rows', COALESCE((SELECT json_agg(page) FROM page), '[]'::json), 'total', (SELECT count(*) FROM filtered)) AS data`
              .returnsRow({ data: 'pg/json@1' })
              .build(),
          ),
        );
        break;
      case 'businesses':
        result = await db.transaction((tx) =>
          tx.query(
            db.raw.sql`WITH filtered AS (
          SELECT b.id, b.name, b."approvalStatus", b."operationalStatus", b."createdAt"
          FROM public."Business" b WHERE b.name ILIKE ${search} AND (${status} = '' OR b."approvalStatus"::text = ${status}) AND (${operationalStatus} = '' OR b."operationalStatus"::text = ${operationalStatus})
        ), page AS (SELECT * FROM filtered ORDER BY CASE WHEN ${sort} = 'oldest' THEN "createdAt" END ASC, CASE WHEN ${sort} = 'newest' THEN "createdAt" END DESC, id LIMIT ${pageSize} OFFSET ${offset}), enriched AS (
          SELECT b.*,
          (SELECT count(*) FROM public."Branch" br WHERE br."businessId" = b.id) AS "branchCount",
          (SELECT json_agg(json_build_object('id', u.id, 'fullName', u."fullName", 'email', u.email, 'isActive', m."isActive")) FROM public."BusinessMember" m JOIN public."User" u ON u.id = m."userId" WHERE m."businessId" = b.id AND m.role = 'OWNER') AS owners,
          (SELECT json_build_object('plan', p.name, 'status', s.status, 'startedAt', s."startedAt", 'periodEndsAt', s."periodEndsAt") FROM public."BusinessSubscription" s JOIN public."SubscriptionPlan" p ON p.id = s."planId" WHERE s."businessId" = b.id) AS subscription,
          (SELECT json_build_object('address', bs.address, 'contactEmail', bs."contactEmail", 'contactPhone', bs."contactPhone") FROM public."BusinessSettings" bs WHERE bs."businessId" = b.id) AS profile FROM page b
        ) SELECT json_build_object('rows', COALESCE((SELECT json_agg(enriched) FROM enriched), '[]'::json), 'total', (SELECT count(*) FROM filtered)) AS data`
              .returnsRow({ data: 'pg/json@1' })
              .build(),
          ),
        );
        break;
      case 'owners':
        result = await db.transaction((tx) =>
          tx.query(
            db.raw.sql`WITH filtered AS (
          SELECT u.id, u.username, u."fullName", u.email, u.status, u."createdAt"
          FROM public."User" u WHERE EXISTS(SELECT 1 FROM public."BusinessMember" m WHERE m."userId" = u.id AND m.role = 'OWNER') AND (${status} = '' OR u.status::text = ${status}) AND (u."fullName" ILIKE ${search} OR u.email ILIKE ${search} OR u.username ILIKE ${search})
        ), page AS (SELECT * FROM filtered ORDER BY CASE WHEN ${sort} = 'oldest' THEN "createdAt" END ASC, CASE WHEN ${sort} = 'newest' THEN "createdAt" END DESC, id LIMIT ${pageSize} OFFSET ${offset}), enriched AS (
          SELECT u.*, (SELECT json_agg(json_build_object('businessId', b.id, 'name', b.name, 'approvalStatus', b."approvalStatus", 'operationalStatus', b."operationalStatus", 'isActive', m."isActive", 'role', m.role, 'branchId', m."branchId", 'branchName', (SELECT br.name FROM public."Branch" br WHERE br.id = m."branchId" AND br."businessId" = b.id))) FROM public."BusinessMember" m JOIN public."Business" b ON b.id = m."businessId" WHERE m."userId" = u.id) AS businesses FROM page u
        ) SELECT json_build_object('rows', COALESCE((SELECT json_agg(enriched) FROM enriched), '[]'::json), 'total', (SELECT count(*) FROM filtered)) AS data`
              .returnsRow({ data: 'pg/json@1' })
              .build(),
          ),
        );
        break;
      case 'subscriptions':
        result = await db.transaction((tx) =>
          tx.query(
            db.raw.sql`WITH filtered AS (
          SELECT s.id, b.name, s."businessId", p.name AS plan, p.code AS "planCode", s.status, s."startedAt", s."periodEndsAt", s."createdAt"
          FROM public."BusinessSubscription" s JOIN public."Business" b ON b.id = s."businessId" JOIN public."SubscriptionPlan" p ON p.id = s."planId"
          WHERE (${status} = '' OR s.status::text = ${status}) AND (b.name ILIKE ${search} OR p.name ILIKE ${search})
          AND (NULLIF(${from ?? ''}, '')::date IS NULL OR s."periodEndsAt" >= NULLIF(${from ?? ''}, '')::date) AND (NULLIF(${to ?? ''}, '')::date IS NULL OR s."periodEndsAt" < NULLIF(${to ?? ''}, '')::date + interval '1 day')
        ), page AS (SELECT * FROM filtered ORDER BY CASE WHEN ${sort} = 'oldest' THEN "createdAt" END ASC, CASE WHEN ${sort} = 'newest' THEN "createdAt" END DESC, id LIMIT ${pageSize} OFFSET ${offset})
        SELECT json_build_object('rows', COALESCE((SELECT json_agg(page) FROM page), '[]'::json), 'total', (SELECT count(*) FROM filtered)) AS data`
              .returnsRow({ data: 'pg/json@1' })
              .build(),
          ),
        );
        break;
      case 'audit-logs':
        result = await db.transaction((tx) =>
          tx.query(
            db.raw.sql`WITH filtered AS (
          SELECT e.*, u."fullName" AS "actorName" FROM public."AdminAuditEvent" e LEFT JOIN public."User" u ON u.id = e."actorId"
          WHERE (${action} = '' OR e.action = ${action}) AND (e.reason ILIKE ${search} OR e."entityId"::text ILIKE ${search} OR e."correlationId" ILIKE ${search} OR u."fullName" ILIKE ${search})
          AND (NULLIF(${from ?? ''}, '')::date IS NULL OR e."createdAt" >= NULLIF(${from ?? ''}, '')::date) AND (NULLIF(${to ?? ''}, '')::date IS NULL OR e."createdAt" < NULLIF(${to ?? ''}, '')::date + interval '1 day')
        ), page AS (SELECT * FROM filtered ORDER BY CASE WHEN ${sort} = 'oldest' THEN "createdAt" END ASC, CASE WHEN ${sort} = 'newest' THEN "createdAt" END DESC, id LIMIT ${pageSize} OFFSET ${offset})
        SELECT json_build_object('rows', COALESCE((SELECT json_agg(page) FROM page), '[]'::json), 'total', (SELECT count(*) FROM filtered)) AS data`
              .returnsRow({ data: 'pg/json@1' })
              .build(),
          ),
        );
        break;
      default:
        return res.status(404).json({ message: 'Không tìm thấy chức năng.' });
    }
    return res.json({ ...(result[0]?.data as object), page, pageSize });
  } catch (error) {
    next(error);
  }
});

router.get('/businesses/:id/history', async (req, res, next) => {
  const id = idSchema.safeParse(req.params.id);
  const query = z
    .object({ page: z.coerce.number().int().min(1).max(100000).default(1) })
    .strict()
    .safeParse(req.query);
  if (!id.success || !query.success)
    return res.status(400).json({ message: 'Yêu cầu không hợp lệ.' });
  const offset = (query.data.page - 1) * 20;
  try {
    if (!(await db.orm.public.Business.where({ id: id.data }).select('id').first()))
      return res.status(404).json({ message: 'Không tìm thấy doanh nghiệp.' });
    const rows = await db.transaction((tx) =>
      tx.query(
        db.raw.sql`SELECT json_build_object(
      'application', (SELECT row_to_json(a) FROM public."BusinessApplication" a WHERE "businessId" = ${id.data}::uuid),
      'events', COALESCE((SELECT json_agg(e) FROM (SELECT * FROM public."AdminAuditEvent" WHERE "entityId" = ${id.data}::uuid ORDER BY "createdAt" DESC, id LIMIT 21 OFFSET ${offset}) e), '[]'::json),
      'billing', COALESCE((SELECT json_agg(r) FROM (SELECT id, "amountVnd", currency, status, "createdAt", "paidAt" FROM public."BillingRecord" WHERE "businessId" = ${id.data}::uuid ORDER BY "createdAt" DESC, id LIMIT 21 OFFSET ${offset}) r), '[]'::json)
    ) AS data`
          .returnsRow({ data: 'pg/json@1' })
          .build(),
      ),
    );
    res.json(rows[0]?.data);
  } catch (error) {
    next(error);
  }
});
router.post('/approvals/:id/review', async (req, res, next) => {
  const id = idSchema.safeParse(req.params.id);
  const input = z
    .object({
      status: z.enum(['APPROVED', 'REJECTED']),
      reason: z.string().trim().min(1).max(1000).optional(),
    })
    .strict()
    .safeParse(req.body);
  if (!id.success || !input.success || (input.data.status === 'REJECTED' && !input.data.reason))
    return res.status(400).json({ message: 'Trạng thái hoặc lý do không hợp lệ.' });
  try {
    res.json(
      await service.review(
        id.data,
        res.locals.admin.id,
        input.data.status,
        input.data.reason,
        randomUUID(),
      ),
    );
  } catch (error) {
    next(error);
  }
});
router.post('/businesses/:id/status', async (req, res, next) => {
  const id = idSchema.safeParse(req.params.id);
  const input = z
    .object({ status: z.enum(['ACTIVE', 'SUSPENDED']), reason: z.string().trim().min(1).max(1000) })
    .strict()
    .safeParse(req.body);
  if (!id.success || !input.success)
    return res.status(400).json({ message: 'Trạng thái hoặc lý do không hợp lệ.' });
  try {
    res.json(
      await service.operation(
        id.data,
        res.locals.admin.id,
        input.data.status,
        input.data.reason,
        randomUUID(),
      ),
    );
  } catch (error) {
    next(error);
  }
});
router.use(
  (
    error: unknown,
    _req: import('express').Request,
    res: import('express').Response,
    _next: import('express').NextFunction,
  ) => {
    res.status(error instanceof AdminConflict ? 409 : 503).json({
      message:
        error instanceof AdminConflict
          ? error.message
          : 'Không thể xử lý dữ liệu quản trị. Vui lòng thử lại.',
    });
  },
);
export default router;
