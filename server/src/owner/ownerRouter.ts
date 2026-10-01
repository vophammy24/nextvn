import { Router, type NextFunction, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../prisma/db.js';
import { calculateMenuProfit, getOwnerAnalyticsReaders } from './analyticsReaders.js';
import { branchRepository } from './branchRepository.js';
import { invitationService } from './invitationService.js';
import { memberRepository } from './memberRepository.js';
import { settingsRepository } from './settingsRepository.js';
import { subscriptionRepository } from './subscriptionRepository.js';
import {
  categories,
  devBusinessId,
  devSecret,
  plans,
  profitRows,
  recommendPromotions,
  state,
  trends,
} from './developmentAdapter.js';

const router = Router();
type Role = 'OWNER' | 'MANAGER' | 'STAFF';
type Identity = { userId: string; businessId: string; role: Role };

function parseRole(value: unknown): value is Role {
  return value === 'OWNER' || value === 'MANAGER' || value === 'STAFF';
}

function verifyIdentity(token: string, secret: string): Identity | null {
  try {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded === 'string') return null;
    const claims = decoded as JwtPayload;
    if (
      typeof claims.userId !== 'string' ||
      typeof claims.businessId !== 'string' ||
      !parseRole(claims.role)
    )
      return null;
    return { userId: claims.userId, businessId: claims.businessId, role: claims.role };
  } catch {
    return null;
  }
}

async function requireOwner(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  const environment = process.env.NODE_ENV;
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const identity = token
    ? (accessSecret && verifyIdentity(token, accessSecret)) ||
      (environment === 'development' && verifyIdentity(token, devSecret))
    : null;
  if (!identity)
    return res.status(401).json({ message: 'Cần đăng nhập bằng tài khoản doanh nghiệp.' });

  let currentIdentity = identity;
  if (!['development', 'test'].includes(environment ?? '')) {
    try {
      const membership = await db.orm.public.BusinessMember.where({
        businessId: identity.businessId,
        userId: identity.userId,
        status: 'ACTIVE',
      })
        .include('user', (user) => user.select('status'))
        .first();
      if (!membership || !membership.user || membership.user.status !== 'ACTIVE')
        return res
          .status(403)
          .json({ message: 'Tài khoản không còn quyền truy cập doanh nghiệp.' });
      currentIdentity = { ...identity, role: membership.role };
    } catch {
      return unavailable(res);
    }
  }

  if (currentIdentity.role !== 'OWNER')
    return res.status(403).json({ message: 'Chỉ Chủ doanh nghiệp được sử dụng chức năng này.' });
  res.locals.owner = currentIdentity;
  next();
}

function responseData(res: Response) {
  const identity = res.locals.owner as Identity;
  if (!['development', 'test'].includes(process.env.NODE_ENV ?? '')) return null;
  if (identity.businessId !== devBusinessId) return undefined;
  return identity;
}

function unavailable(res: Response) {
  return res.status(503).json({ message: 'Dịch vụ dữ liệu doanh nghiệp chưa được kết nối.' });
}

export function issueDevelopmentOwnerToken() {
  if (process.env.NODE_ENV !== 'development') return null;
  return jwt.sign({ userId: 'dev-owner', businessId: devBusinessId, role: 'OWNER' }, devSecret, {
    expiresIn: '2h',
  });
}

router.use(requireOwner);

router.get('/overview', async (_req, res) => {
  const identity = responseData(res);
  if (identity === undefined)
    return res.status(404).json({ message: 'Không tìm thấy doanh nghiệp.' });
  if (identity === null) {
    try {
      const data = await getOwnerAnalyticsReaders().sales.overview(
        (res.locals.owner as Identity).businessId,
        'week',
      );
      if (!data) return unavailable(res);
      return res.json({ source: 'sales-read-model', data });
    } catch {
      return unavailable(res);
    }
  }
  res.json({
    source: 'development-fixture',
    data: {
      revenueVnd: 32_230_000,
      grossProfitVnd: 18_045_000,
      averageOrderVnd: 143_244,
      orderCount: 225,
      revenueTrend: trends,
      categoryRevenue: categories,
      peakHours: [
        { label: '11:00–13:00', value: 41 },
        { label: '17:00–19:00', value: 35 },
        { label: '19:00–21:00', value: 24 },
      ],
      highlights: [
        'Doanh thu tuần tăng 8% so với tuần trước trong dữ liệu phát triển.',
        'Chi nhánh Quận 1 đang có doanh thu cao nhất.',
      ],
      profitableItems: profitRows.map((item) => ({
        name: item.name,
        grossProfitVnd: item.revenueVnd - item.ingredientCostVnd,
      })),
    },
  });
});

router.get('/revenue', async (req, res) => {
  const period = z.enum(['week', 'month', 'quarter']).safeParse(req.query.period ?? 'week');
  if (!period.success) return res.status(400).json({ message: 'Khoảng thời gian không hợp lệ.' });
  const identity = responseData(res);
  if (identity === undefined)
    return res.status(404).json({ message: 'Không tìm thấy doanh nghiệp.' });
  if (identity === null) {
    try {
      const data = await getOwnerAnalyticsReaders().sales.revenue(
        (res.locals.owner as Identity).businessId,
        period.data,
      );
      if (!data) return unavailable(res);
      return res.json({ source: 'sales-read-model', data });
    } catch {
      return unavailable(res);
    }
  }
  const multiplier = period.data === 'week' ? 1 : period.data === 'month' ? 4 : 12;
  res.json({
    source: 'development-fixture',
    data: {
      revenueVnd: trends.reduce((sum, point) => sum + point.value, 0) * multiplier,
      orderCount: 225 * multiplier,
      averageOrderVnd: 143_244,
      bestWindow: '11:00–13:00',
      trend: trends,
      categories,
      topItems: [
        { name: 'Cơm gà nướng', quantity: 186, revenueVnd: 8_370_000 },
        { name: 'Trà đào cam sả', quantity: 142, revenueVnd: 5_680_000 },
        { name: 'Bún bò Huế', quantity: 97, revenueVnd: 5_335_000 },
      ],
    },
  });
});

router.get('/menu-profit', async (req, res) => {
  const period = z.enum(['week', 'month', 'quarter']).safeParse(req.query.period ?? 'week');
  if (!period.success) return res.status(400).json({ message: 'Khoảng thời gian không hợp lệ.' });
  const identity = responseData(res);
  if (identity === undefined)
    return res.status(404).json({ message: 'Không tìm thấy dữ liệu thực đơn.' });
  if (identity === null) {
    const businessId = (res.locals.owner as Identity).businessId;
    const readers = getOwnerAnalyticsReaders();
    try {
      const [sales, foodCosts] = await Promise.all([
        readers.sales.itemSales(businessId, period.data),
        readers.recipes.aggregateFoodCost(businessId, period.data),
      ]);
      if (!sales || !foodCosts) return unavailable(res);
      const data = calculateMenuProfit(sales, foodCosts);
      if (!data) return unavailable(res);
      return res.json({ source: 'sales-and-recipe-read-model', costingBasis: 'aggregate', data });
    } catch {
      return unavailable(res);
    }
  }
  res.json({
    source: 'development-fixture',
    costingBasis: 'aggregate',
    data: profitRows.map((item) => ({
      ...item,
      grossProfitVnd: item.revenueVnd - item.ingredientCostVnd,
      margin:
        item.revenueVnd > 0
          ? ((item.revenueVnd - item.ingredientCostVnd) / item.revenueVnd) * 100
          : 0,
    })),
  });
});

router.get('/inventory', async (_req, res) => {
  const identity = responseData(res);
  if (identity === undefined)
    return res.status(404).json({ message: 'Không tìm thấy dữ liệu tồn kho.' });
  if (identity === null) {
    try {
      const data = await getOwnerAnalyticsReaders().inventory.ownerOverview(
        (res.locals.owner as Identity).businessId,
      );
      if (!data) return unavailable(res);
      return res.json({ source: 'inventory-read-model', data });
    } catch {
      return unavailable(res);
    }
  }
  res.json({
    source: 'development-fixture',
    data: {
      ingredientCount: 42,
      lowStockCount: 5,
      nearExpiryCount: 3,
      stockValueVnd: 24_850_000,
      consumption: [
        { name: 'Thịt gà', value: 82 },
        { name: 'Gạo', value: 75 },
        { name: 'Trà đào', value: 61 },
      ],
      statusDistribution: [
        { name: 'Đủ hàng', value: 31 },
        { name: 'Sắp hết', value: 8 },
        { name: 'Sắp hết hạn', value: 3 },
      ],
      byBranch: [
        {
          branchName: 'Chi nhánh Quận 1',
          ingredientCount: 30,
          lowStockCount: 2,
          nearExpiryCount: 1,
          stockValueVnd: 12_480_000,
        },
        {
          branchName: 'Chi nhánh Thảo Điền',
          ingredientCount: 27,
          lowStockCount: 3,
          nearExpiryCount: 2,
          stockValueVnd: 12_370_000,
        },
      ],
    },
  });
});

router.get('/promotions', async (_req, res) => {
  const identity = responseData(res);
  if (identity === undefined) return res.status(404).json({ message: 'Không tìm thấy gợi ý.' });
  if (identity === null) {
    try {
      const data = await getOwnerAnalyticsReaders().inventory.promotionSuggestions(
        (res.locals.owner as Identity).businessId,
      );
      if (!data) return unavailable(res);
      return res.json({ source: 'inventory-sales-read-model', data });
    } catch {
      return unavailable(res);
    }
  }
  res.json({
    source: 'development-fixture',
    data: recommendPromotions({ nearExpiryCount: 3, slowWindowShare: 0.09, upsellMargin: 0.38 }),
  });
});

router.get('/branches', async (_req, res) => {
  const identity = responseData(res);
  if (identity === undefined)
    return res.status(404).json({ message: 'Không tìm thấy doanh nghiệp.' });
  if (identity) {
    res.json({
      source: 'development-fixture',
      data: state.branches.map((branch) => ({ ...branch, businessId: devBusinessId })),
    });
    return;
  }

  const owner = res.locals.owner as Identity;
  try {
    const branches = await branchRepository.list(owner.businessId);
    res.json({
      source: 'database',
      data: branches.map((branch) => ({
        ...branch,
        managerName: null,
        orderCount: null,
        revenueVnd: null,
      })),
    });
  } catch {
    unavailable(res);
  }
});

const branchSchema = z.object({
  name: z.string().trim().min(2).max(100),
  address: z.string().trim().max(240).optional(),
  phone: z.string().trim().max(30).optional(),
});
router.post('/branches', async (req, res) => {
  const body = branchSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ message: 'Thông tin chi nhánh không hợp lệ.' });
  const identity = responseData(res);
  if (identity === undefined)
    return res.status(404).json({ message: 'Không tìm thấy doanh nghiệp.' });
  if (identity) {
    const branch = {
      id: randomUUID(),
      ...body.data,
      address: body.data.address ?? '',
      phone: body.data.phone ?? '',
      isActive: true,
      managerName: '',
      orderCount: 0,
      revenueVnd: 0,
    };
    state.branches.push(branch);
    res.status(201).json({ source: 'development-fixture', data: branch });
    return;
  }

  const owner = res.locals.owner as Identity;
  try {
    const branch = await branchRepository.create(owner.businessId, body.data);
    res.status(201).json({
      source: 'database',
      data: { ...branch, managerName: null, orderCount: null, revenueVnd: null },
    });
  } catch {
    unavailable(res);
  }
});

router.patch('/branches/:branchId', async (req, res) => {
  const branchId = z.string().uuid().safeParse(req.params.branchId);
  if (!branchId.success) return res.status(400).json({ message: 'Mã chi nhánh không hợp lệ.' });
  const body = branchSchema
    .partial()
    .extend({ isActive: z.boolean().optional() })
    .refine((value) => Object.keys(value).length > 0)
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ message: 'Thông tin chi nhánh không hợp lệ.' });
  const identity = responseData(res);
  if (identity === undefined) return res.status(404).json({ message: 'Không tìm thấy chi nhánh.' });
  if (identity) {
    const branch = state.branches.find((item) => item.id === branchId.data);
    if (!branch) return res.status(404).json({ message: 'Không tìm thấy chi nhánh.' });
    Object.assign(branch, body.data);
    res.json({ source: 'development-fixture', data: branch });
    return;
  }

  const owner = res.locals.owner as Identity;
  try {
    const branch = await branchRepository.update(owner.businessId, branchId.data, body.data);
    if (!branch) return res.status(404).json({ message: 'Không tìm thấy chi nhánh.' });
    res.json({
      source: 'database',
      data: { ...branch, managerName: null, orderCount: null, revenueVnd: null },
    });
  } catch {
    unavailable(res);
  }
});

router.get('/members', async (_req, res) => {
  const identity = responseData(res);
  if (identity === undefined)
    return res.status(404).json({ message: 'Không tìm thấy doanh nghiệp.' });
  if (identity) {
    res.json({
      source: 'development-fixture',
      data: state.members.map((member) => ({ ...member, businessId: devBusinessId })),
    });
    return;
  }

  const owner = res.locals.owner as Identity;
  try {
    const members = await memberRepository.list(owner.businessId);
    res.json({
      source: 'database',
      data: members.flatMap((member) =>
        member.user
          ? [
              {
                id: member.id,
                userId: member.userId,
                fullName: member.user.fullName,
                email: member.user.email,
                role: member.role,
                branchId: member.branchId,
                branchName: member.branch?.name ?? 'Toàn doanh nghiệp',
                lastActive: 'Chưa có dữ liệu',
                isActive: member.status === 'ACTIVE' && member.user.status === 'ACTIVE',
              },
            ]
          : [],
      ),
    });
  } catch {
    unavailable(res);
  }
});

const memberSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  role: z.enum(['MANAGER', 'STAFF']),
  branchId: z.string().uuid().nullable().optional(),
});
router.post('/members', async (req, res) => {
  const body = memberSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ message: 'Thông tin thành viên không hợp lệ.' });
  const identity = responseData(res);
  if (identity === undefined)
    return res.status(404).json({ message: 'Không tìm thấy doanh nghiệp.' });
  if (identity) {
    const branch = body.data.branchId
      ? state.branches.find((item) => item.id === body.data.branchId)
      : null;
    if (body.data.branchId && !branch)
      return res.status(404).json({ message: 'Không tìm thấy chi nhánh.' });
    const member = {
      id: `member-${Date.now()}`,
      userId: `invite-${Date.now()}`,
      ...body.data,
      branchId: branch?.id ?? null,
      branchName: branch?.name ?? 'Toàn doanh nghiệp',
      lastActive: 'Chưa hoạt động',
      isActive: true,
    };
    state.members.push(member);
    res.status(201).json({ source: 'development-fixture', data: member });
    return;
  }

  try {
    const result = await invitationService.invite({
      businessId: (res.locals.owner as Identity).businessId,
      invitedByUserId: (res.locals.owner as Identity).userId,
      ...body.data,
    });
    res.status(202).json({ source: 'invitation-service', data: result });
  } catch {
    unavailable(res);
  }
});

router.patch('/members/:memberId', async (req, res) => {
  const body = z
    .object({
      role: z.enum(['MANAGER', 'STAFF']).optional(),
      isActive: z.boolean().optional(),
      branchId: z.string().uuid().nullable().optional(),
    })
    .refine((value) => Object.keys(value).length > 0)
    .safeParse(req.body);
  if (!body.success)
    return res.status(400).json({ message: 'Vai trò hoặc chi nhánh không hợp lệ.' });
  const identity = responseData(res);
  if (identity === undefined)
    return res.status(404).json({ message: 'Không tìm thấy thành viên.' });
  if (identity) {
    const member = state.members.find((item) => item.id === req.params.memberId);
    if (!member) return res.status(404).json({ message: 'Không tìm thấy thành viên.' });
    if (member.role === 'OWNER' || member.userId === identity.userId)
      return res
        .status(403)
        .json({ message: 'Không thể thay đổi quyền Chủ doanh nghiệp của tài khoản này.' });
    const branch = body.data.branchId
      ? state.branches.find((item) => item.id === body.data.branchId)
      : null;
    if (body.data.branchId && !branch)
      return res.status(404).json({ message: 'Không tìm thấy chi nhánh.' });
    Object.assign(member, body.data);
    if (body.data.branchId !== undefined) member.branchName = branch?.name ?? 'Toàn doanh nghiệp';
    res.json({ source: 'development-fixture', data: member });
    return;
  }

  const owner = res.locals.owner as Identity;
  try {
    const member = await memberRepository.find(owner.businessId, req.params.memberId);
    if (!member || !member.user)
      return res.status(404).json({ message: 'Không tìm thấy thành viên.' });
    if (member.role === 'OWNER' || member.userId === owner.userId)
      return res
        .status(403)
        .json({ message: 'Không thể thay đổi quyền Chủ doanh nghiệp của tài khoản này.' });
    let branchName = member.branch?.name ?? 'Toàn doanh nghiệp';
    if (body.data.branchId !== undefined) {
      const branch = body.data.branchId
        ? await branchRepository.find(owner.businessId, body.data.branchId)
        : null;
      if (body.data.branchId && !branch)
        return res.status(404).json({ message: 'Không tìm thấy chi nhánh.' });
      branchName = branch?.name ?? 'Toàn doanh nghiệp';
    }
    const updated = await memberRepository.update(owner.businessId, member.id, {
      ...(body.data.role ? { role: body.data.role } : {}),
      ...(body.data.branchId !== undefined ? { branchId: body.data.branchId } : {}),
      ...(body.data.isActive !== undefined
        ? { status: body.data.isActive ? 'ACTIVE' : 'INACTIVE' }
        : {}),
    });
    if (!updated) return res.status(404).json({ message: 'Không tìm thấy thành viên.' });
    res.json({
      source: 'database',
      data: {
        ...member,
        ...updated,
        branchName,
        isActive: updated.status === 'ACTIVE' && member.user.status === 'ACTIVE',
      },
    });
  } catch {
    unavailable(res);
  }
});

router.get('/subscription', async (_req, res) => {
  const identity = responseData(res);
  if (identity === undefined) return res.status(404).json({ message: 'Không tìm thấy đăng ký.' });
  if (identity) {
    res.json({
      source: 'development-fixture',
      billing: 'not-connected',
      data: {
        plan: 'Gói dùng thử',
        usage: '2/3 chi nhánh',
        renewalDate: null,
        status: 'Chưa kết nối thanh toán',
        billingHistory: [],
        plans: plans.map((plan) => ({
          id: plan.id,
          code: plan.id,
          name: plan.name,
          description: plan.description,
          monthlyPriceVnd: plan.priceVnd,
          annualPriceVnd: null,
        })),
        payOSAvailable: false,
      },
    });
    return;
  }

  try {
    const subscription = await subscriptionRepository.getBusinessView(
      (res.locals.owner as Identity).businessId,
    );
    const statusLabels: Record<string, string> = {
      TRIALING: 'Đang dùng thử',
      ACTIVE: 'Đang hoạt động',
      PAST_DUE: 'Chưa thanh toán',
      CANCELED: 'Đã hủy',
      EXPIRED: 'Đã hết hạn',
      'Chưa đăng ký': 'Chưa đăng ký gói',
    };
    const billingLabels: Record<string, string> = {
      PENDING: 'Đang chờ thanh toán',
      PAID: 'Đã thanh toán',
      FAILED: 'Thanh toán thất bại',
      REFUNDED: 'Đã hoàn tiền',
    };
    res.json({
      source: 'database',
      billing: subscription.billing,
      data: {
        ...subscription,
        status: statusLabels[subscription.status] ?? 'Không xác định',
        billingHistory: subscription.billingHistory.map((record) => ({
          ...record,
          status: billingLabels[record.status] ?? 'Không xác định',
        })),
      },
    });
  } catch {
    unavailable(res);
  }
});

router.get('/settings', async (_req, res) => {
  const identity = responseData(res);
  if (identity === undefined) return res.status(404).json({ message: 'Không tìm thấy cài đặt.' });
  if (identity) {
    res.json({ source: 'development-fixture', data: state.settings });
    return;
  }
  try {
    const settings = await settingsRepository.get((res.locals.owner as Identity).businessId);
    if (!settings) return res.status(404).json({ message: 'Không tìm thấy doanh nghiệp.' });
    res.json({ source: 'database', data: settings });
  } catch {
    unavailable(res);
  }
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
  const identity = responseData(res);
  if (identity === undefined) return res.status(404).json({ message: 'Không tìm thấy cài đặt.' });
  if (identity) {
    Object.assign(state.settings, body.data);
    res.json({ source: 'development-fixture', data: state.settings });
    return;
  }
  try {
    const settings = await settingsRepository.save(
      (res.locals.owner as Identity).businessId,
      body.data,
    );
    if (!settings) return res.status(404).json({ message: 'Không tìm thấy doanh nghiệp.' });
    res.json({ source: 'database', data: settings });
  } catch {
    unavailable(res);
  }
});

export default router;
