import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireBusinessRole } from '../middleware/auth.js';
import { resolveMembership, type MemberRequest } from '../middleware/membership.js';
import { db } from '../prisma/db.js';
import type { Principal } from '../inventory/domain.js';
import { branchRepository } from './branchRepository.js';
import { memberRepository } from './memberRepository.js';
import { settingsRepository } from './settingsRepository.js';
import { subscriptionRepository } from './subscriptionRepository.js';
import { salesAnalytics, menuProfit } from './persistedAnalytics.js';
const router = Router({ mergeParams: true });
router.use(authenticate, resolveMembership, requireBusinessRole('OWNER'));
router.use(async (req, res, next) => {
  try {
    const user = await db.orm.public.User.where({
      id: (req as MemberRequest).user.userId,
      status: 'ACTIVE',
    })
      .select('id')
      .first();
    if (!user) {
      res.status(403).json({ message: 'Tài khoản không có quyền truy cập.' });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
});
const business = (req: Request) => (req as MemberRequest).membership.businessId;
const principal = (req: Request): Principal => ({
  userId: (req as MemberRequest).user.userId,
  businessId: business(req),
  role: 'OWNER',
  branchIds: [],
});
const periodSchema = z.enum(['week', 'month', 'quarter']).default('week');
const envelope = (res: Response, data: unknown) => res.json({ source: 'database', data });
router.get('/overview', async (req, res) => {
  const [sales, profit] = await Promise.all([
    salesAnalytics(business(req), 'week'),
    menuProfit(principal(req), 'week'),
  ]);
  return envelope(res, {
    ...sales,
    revenueTrend: sales.trend,
    categoryRevenue: sales.categories,
    grossProfitVnd: profit ? profit.reduce((sum, row) => sum + row.grossProfitVnd, 0) : null,
    profitableItems: profit?.sort((a, b) => b.grossProfitVnd - a.grossProfitVnd) ?? [],
    highlights: [
      sales.orderCount
        ? 'Chi phí và lợi nhuận được ước tính theo công thức hiện tại.'
        : 'Chưa có dữ liệu bán hàng trong bảy ngày gần nhất.',
    ],
  });
});
router.get('/revenue', async (req, res) => {
  const period = periodSchema.safeParse(req.query.period);
  if (!period.success) return res.status(400).json({ message: 'Khoảng thời gian không hợp lệ.' });
  return envelope(res, await salesAnalytics(business(req), period.data));
});
router.get('/menu-profit', async (req, res) => {
  const period = periodSchema.safeParse(req.query.period);
  if (!period.success) return res.status(400).json({ message: 'Khoảng thời gian không hợp lệ.' });
  const data = await menuProfit(principal(req), period.data);
  if (data === null)
    return res
      .status(409)
      .json({ message: 'Chưa đủ dữ liệu công thức để ước tính lợi nhuận món.' });
  return envelope(res, data);
});
router.get('/promotions', async (req, res) => {
  const sales = await salesAnalytics(business(req), 'month');
  const item = sales.topItems[0];
  return envelope(
    res,
    sales.orderCount >= 10 && item
      ? [
          {
            id: 'best-seller',
            title: 'Giới thiệu món bán chạy',
            reason: 'Dựa trên doanh thu thực tế trong 30 ngày gần nhất.',
            relatedItems: [item.name],
            evidence: item.quantity + ' phần đã bán',
            action: 'Cân nhắc giới thiệu món này khi khách chọn món.',
            basis: 'Gợi ý theo quy tắc; chưa ước tính doanh thu tăng thêm.',
          },
        ]
      : [],
  );
});
const branchInput = z
  .object({
    name: z.string().trim().min(2).max(100),
    address: z.string().trim().max(240).optional(),
    phone: z.string().trim().max(30).optional(),
  })
  .strict();
router.get('/branches', async (req, res) => {
  const rows = await branchRepository.list(business(req));
  const data = await Promise.all(
    rows.map(async (row) => {
      const [orders, managers] = await Promise.all([
        db.orm.public.Order.where({ branchId: row.id, status: 'PAID' }).all(),
        db.orm.public.BusinessMember.where({
          businessId: business(req),
          branchId: row.id,
          role: 'MANAGER',
          isActive: true,
        })
          .include('user')
          .all(),
      ]);
      const recent = orders.filter(
        (o) =>
          Date.parse(o.createdAt) >= Date.now() - 30 * 86400000 &&
          Date.parse(o.createdAt) <= Date.now(),
      );
      return {
        ...row,
        managerName: managers.map((m) => m.user.fullName).join(', ') || null,
        orderCount: recent.length,
        revenueVnd: recent.reduce((sum, o) => sum + o.total, 0),
      };
    }),
  );
  return envelope(res, data);
});
router.post('/branches', async (req, res) => {
  const input = branchInput.safeParse(req.body);
  if (!input.success) return res.status(400).json({ message: 'Thông tin chi nhánh không hợp lệ.' });
  return res
    .status(201)
    .json({ source: 'database', data: await branchRepository.create(business(req), input.data) });
});
router.patch('/branches/:id', async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  const input = branchInput
    .partial()
    .extend({ isActive: z.boolean().optional() })
    .strict()
    .refine((v) => Object.keys(v).length > 0)
    .safeParse(req.body);
  if (!id.success || !input.success)
    return res.status(400).json({ message: 'Thông tin chi nhánh không hợp lệ.' });
  const data = await branchRepository.update(business(req), id.data, input.data);
  return data
    ? envelope(res, data)
    : res.status(404).json({ message: 'Không tìm thấy chi nhánh.' });
});
router.get('/members', async (req, res) =>
  envelope(
    res,
    (await memberRepository.list(business(req))).map((row) => ({
      id: row.id,
      fullName: row.user?.fullName ?? 'Chưa có tên',
      email: row.user?.email ?? '',
      role: row.role,
      branchId: row.branchId,
      branchName: row.branch?.name ?? 'Toàn doanh nghiệp',
      lastActive: 'Chưa có dữ liệu',
      isActive: row.isActive && row.user?.status === 'ACTIVE',
      canManageAccess: row.role !== 'OWNER' && row.userId !== (req as MemberRequest).user.userId,
    })),
  ),
);
router.post('/members', async (req, res) => {
  const input = z
    .object({
      fullName: z.string().trim().min(2).max(120),
      email: z.string().email(),
      role: z.enum(['STAFF', 'MANAGER']),
      branchId: z.string().uuid(),
    })
    .strict()
    .safeParse(req.body);
  if (!input.success)
    return res.status(400).json({ message: 'Thông tin thành viên không hợp lệ.' });
  const branch = await branchRepository.find(business(req), input.data.branchId);
  if (!branch?.isActive) return res.status(400).json({ message: 'Chi nhánh không hợp lệ.' });
  return res.status(503).json({
    code: 'INVITATIONS_NOT_CONFIGURED',
    message: 'Chưa cấu hình dịch vụ mời thành viên. Chưa tạo tài khoản hoặc gửi lời mời.',
  });
});
router.patch('/members/:id', async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  const input = z
    .object({
      role: z.enum(['STAFF', 'MANAGER']).optional(),
      isActive: z.boolean().optional(),
      branchId: z.string().uuid().nullable().optional(),
    })
    .strict()
    .refine((v) => Object.keys(v).length > 0)
    .safeParse(req.body);
  if (!id.success || !input.success)
    return res.status(400).json({ message: 'Thông tin thành viên không hợp lệ.' });
  const member = await memberRepository.find(business(req), id.data);
  if (!member) return res.status(404).json({ message: 'Không tìm thấy thành viên.' });
  if (member.role === 'OWNER' || member.userId === principal(req).userId)
    return res
      .status(403)
      .json({ message: 'Không thể thay đổi quyền của chủ doanh nghiệp hoặc chính mình.' });
  const branchId = input.data.branchId === undefined ? member.branchId : input.data.branchId;
  if ((input.data.isActive ?? member.isActive) || branchId) {
    const branch = branchId ? await branchRepository.find(business(req), branchId) : null;
    if (!branch?.isActive)
      return res
        .status(400)
        .json({ message: 'Thành viên cần được gán chi nhánh đang hoạt động trong doanh nghiệp.' });
  }
  return envelope(res, await memberRepository.update(business(req), id.data, input.data));
});
router.get('/settings', async (req, res) => {
  const data = await settingsRepository.get(business(req));
  return data
    ? envelope(res, data)
    : res.status(404).json({ message: 'Không tìm thấy doanh nghiệp.' });
});
router.patch('/settings', async (req, res) => {
  const body = z
    .object({
      businessName: z.string().trim().min(2).max(120),
      contactEmail: z.string().email().nullable().optional().default(null),
      contactPhone: z.string().trim().max(30).nullable().optional().default(null),
      address: z.string().trim().max(240).nullable().optional().default(null),
      taxRate: z.number().min(0).max(100),
      serviceFeeRate: z.number().min(0).max(100),
      invoicePrefix: z.string().trim().min(1).max(12),
      receiptTitle: z.string().trim().max(120).nullable().optional().default(null),
      receiptFooter: z.string().trim().max(500).nullable().optional().default(null),
      notifyLowStock: z.boolean(),
      notifyNearExpiry: z.boolean(),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ message: 'Cài đặt doanh nghiệp không hợp lệ.' });

  return envelope(res, await settingsRepository.save(business(req), body.data));
});
router.get('/subscription', async (req, res) => {
  const data = await subscriptionRepository.getBusinessView(business(req));
  const statuses: Record<string, string> = {
    TRIALING: 'Dùng thử',
    ACTIVE: 'Đang hoạt động',
    PAST_DUE: 'Quá hạn',
    CANCELED: 'Đã hủy',
    EXPIRED: 'Đã hết hạn',
    PENDING: 'Chờ thanh toán',
    PAID: 'Đã thanh toán',
    FAILED: 'Thất bại',
    REFUNDED: 'Đã hoàn tiền',
  };
  return envelope(res, {
    ...data,
    status: statuses[data.status] ?? data.status,
    billingHistory: data.billingHistory.map((row) => ({
      ...row,
      status: statuses[row.status] ?? row.status,
    })),
  });
});
router.post('/subscription/checkout', (_req, res) =>
  res.status(503).json({
    code: 'PROVIDER_NOT_CONFIGURED',
    message: 'Thanh toán gói dịch vụ qua payOS chưa được cấu hình.',
  }),
);
router.use((_error: unknown, _req: Request, res: Response, _next: NextFunction) =>
  res
    .status(503)
    .json({ message: 'Không thể tải hoặc cập nhật dữ liệu doanh nghiệp. Vui lòng thử lại.' }),
);
export default router;
