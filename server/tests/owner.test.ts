import request from 'supertest';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../src/app';
import { calculateMenuProfit } from '../src/owner/analyticsReaders';
import { createBranchRepository } from '../src/owner/branchRepository';
import { invitationService } from '../src/owner/invitationService';
import { createMemberRepository } from '../src/owner/memberRepository';
import { createSettingsRepository } from '../src/owner/settingsRepository';
import { createSubscriptionRepository } from '../src/owner/subscriptionRepository';
import { unavailableSubscriptionPaymentProvider } from '../src/owner/subscriptionPaymentProvider';

import { env } from '../src/config/env';
import {
  inventoryAnalytics,
  aggregateSales,
  salesAnalytics,
} from '../src/owner/persistedAnalytics';
const mock = vi.hoisted(() => ({
  members: [] as Record<string, unknown>[],
  rows: [] as Record<string, unknown>[],
  activeUser: true,
  branchWhere: vi.fn(),
  orderWhere: vi.fn(),
  updates: vi.fn(),
  settings: null as Record<string, unknown> | null,
}));
vi.mock('../src/prisma/db', () => {
  const query = (rows: Record<string, unknown>[]) => {
    const value = {
      first: async () => rows[0] ?? null,
      all: async () => rows,
      select: (..._args: unknown[]) => value,
      include: (..._args: unknown[]) => value,
      orderBy: (..._args: unknown[]) => value,
      update: async (data: unknown) => {
        mock.updates(data);
        return rows.length ? { ...rows[0], ...(data as object) } : null;
      },
      upsert: async (data: { create: Record<string, unknown> }) => {
        mock.settings = data.create;
        return data.create;
      },
    };
    return value;
  };
  const models = {
    BusinessMember: {
      where: (scope: Record<string, unknown>) =>
        query(mock.members.filter((row) => Object.entries(scope).every(([k, v]) => row[k] === v))),
    },
    User: { where: () => query(mock.activeUser ? [{ id: 'owner-user' }] : []) },
    Branch: {
      where: (scope: Record<string, unknown>) => {
        mock.branchWhere(scope);
        return query(
          scope.businessId === 'business-a' &&
            (!scope.id || scope.id === '11111111-1111-4111-8111-111111111111')
            ? [
                {
                  id: '11111111-1111-4111-8111-111111111111',
                  businessId: 'business-a',
                  name: 'Chi nhánh thử nghiệm',
                  isActive: true,
                },
              ]
            : [],
        );
      },
    },
    Order: {
      where: (scope: Record<string, unknown>) => {
        mock.orderWhere(scope);
        return query(
          scope.branchId === '11111111-1111-4111-8111-111111111111' && scope.status === 'PAID'
            ? mock.rows
            : [],
        );
      },
    },
    Business: { where: () => query([{ id: 'business-a', name: 'Doanh nghiệp thử nghiệm' }]) },
    MenuItem: { where: () => query([]) },
    BusinessSettings: { where: () => query(mock.settings ? [mock.settings] : []) },
    BusinessSubscription: { where: () => query([]) },
    SubscriptionPlan: { where: () => query([]) },
    BillingRecord: { where: () => query([]) },
  };
  const db = {
    orm: { public: models },
    transaction: async (run: (tx: unknown) => unknown) => run(db),
  };
  return { db };
});
const token = (role: string, businessId = 'business-a', userId = role.toLowerCase() + '-user') =>
  jwt.sign({ userId, role: 'OWNER', businessId, platformRole: 'ADMIN' }, env.JWT_ACCESS_SECRET);
beforeEach(() => {
  vi.restoreAllMocks();
  mock.activeUser = true;
  mock.rows = [];
  mock.settings = null;
  mock.updates.mockClear();
  mock.branchWhere.mockClear();
  mock.orderWhere.mockClear();
  mock.members = ['OWNER', 'MANAGER', 'STAFF'].map((role) => ({
    id: role,
    userId: role.toLowerCase() + '-user',
    businessId: 'business-a',
    role,
    isActive: true,
    branchId: null,
  }));
});

describe('owner business API', () => {
  it('rejects managers and staff from owner endpoints', async () => {
    for (const role of ['MANAGER', 'STAFF']) {
      const response = await request(app)
        .get('/api/business/business-a/owner/overview')
        .set('Authorization', `Bearer ${token(role)}`);
      expect(response.status).toBe(403);
    }
    const managerBranch = await request(app)
      .post('/api/business/business-a/owner/branches')
      .set('Authorization', `Bearer ${token('MANAGER')}`)
      .send({ name: 'Chi nhánh mới' });
    const staffSubscription = await request(app)
      .get('/api/business/business-a/owner/subscription')
      .set('Authorization', `Bearer ${token('STAFF')}`);
    expect(managerBranch.status).toBe(403);
    expect(staffSubscription.status).toBe(403);
  });

  it('does not expose another business even when signed claims claim ownership', async () => {
    const response = await request(app)
      .get('/api/business/business-a/owner/branches')
      .set('Authorization', `Bearer ${token('OWNER', 'other-business', 'foreign-user')}`);
    const subscription = await request(app)
      .get('/api/business/business-a/owner/subscription')
      .set('Authorization', `Bearer ${token('OWNER', 'other-business', 'foreign-user')}`);
    expect(response.status).toBe(403);
    expect(subscription.status).toBe(403);
  });

  it('does not serve fixture analytics outside development', async () => {
    const response = await request(app)
      .get('/api/business/business-a/owner/overview')
      .set('Authorization', `Bearer ${token('OWNER')}`);

    expect(response.status).toBe(200);
    expect(response.body.source).toBe('database');
    expect(response.body.data).toMatchObject({ revenueVnd: 0, orderCount: 0, grossProfitVnd: 0 });
  });

  it('calculates menu profit from revenue and ingredient cost read data', async () => {
    mock.rows = [
      {
        createdAt: new Date().toISOString(),
        total: 8370000,
        items: [{ menuItemId: 'dish-1', name: 'Món thử', quantity: 10, total: 8370000 }],
      },
    ];
    vi.spyOn(inventoryAnalytics, 'ownerRecipeCosts').mockResolvedValue([
      { menuItemId: 'dish-1', foodCost: 513000 },
    ]);
    const response = await request(app)
      .get('/api/business/business-a/owner/menu-profit')
      .set('Authorization', `Bearer ${token('OWNER')}`);

    expect(response.status).toBe(200);
    expect(response.body.data[0]).toMatchObject({
      revenueVnd: 8_370_000,
      ingredientCostVnd: 5_130_000,
      grossProfitVnd: 3_240_000,
    });
    expect(mock.orderWhere).toHaveBeenCalledWith({
      branchId: '11111111-1111-4111-8111-111111111111',
      status: 'PAID',
    });
  });

  it('calculates gross margin as a percentage and handles zero revenue', () => {
    const result = calculateMenuProfit(
      [
        { itemId: 'dish-1', name: 'Món thử', quantity: 2, revenueVnd: 200_000 },
        { itemId: 'dish-2', name: 'Món miễn phí', quantity: 1, revenueVnd: 0 },
      ],
      [
        { itemId: 'dish-1', ingredientCostVnd: 100_000 },
        { itemId: 'dish-2', ingredientCostVnd: 15_000 },
      ],
    );

    expect(result?.[0]).toMatchObject({ grossProfitVnd: 100_000, margin: 50 });
    expect(result?.[1]).toMatchObject({ grossProfitVnd: -15_000, margin: 0 });
    expect(
      calculateMenuProfit(
        [{ itemId: 'missing-cost', name: 'Món thiếu giá vốn', quantity: 1, revenueVnd: 10 }],
        [],
      ),
    ).toBeNull();
  });

  it('scopes persisted branch operations by business ID', async () => {
    const calls: unknown[] = [];
    const row = {
      id: 'branch-row',
      businessId: 'business-a',
      name: 'Cơ sở A',
      address: null,
      phone: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    let model: Record<string, ReturnType<typeof vi.fn>>;
    model = {
      where: vi.fn((filter: unknown) => {
        calls.push(filter);
        return model;
      }),
      orderBy: vi.fn(() => model),
      all: vi.fn(async () => [row]),
      create: vi.fn(async (input: Record<string, unknown>) => ({ ...row, ...input })),
      select: vi.fn(() => model),
      update: vi.fn(async (input: Record<string, unknown>) => ({ ...row, ...input })),
    };
    const repository = createBranchRepository(model as never);

    await repository.list('business-a');
    const created = await repository.create('business-a', { name: 'Cơ sở mới' });
    await repository.update('business-a', 'branch-row', { isActive: false });

    expect(calls).toContainEqual({ businessId: 'business-a' });
    expect(calls).toContainEqual({ id: 'branch-row', businessId: 'business-a' });
    expect(created.businessId).toBe('business-a');
  });

  it('scopes member role, status, and branch assignment updates by business ID', async () => {
    const filters: unknown[] = [];
    let model: Record<string, ReturnType<typeof vi.fn>>;
    model = {
      where: vi.fn((filter: unknown) => {
        filters.push(filter);
        return model;
      }),
      include: vi.fn(() => model),
      orderBy: vi.fn(() => model),
      all: vi.fn(async () => []),
      first: vi.fn(async () => null),
      select: vi.fn(() => model),
      update: vi.fn(async (input: Record<string, unknown>) => input),
    };
    const repository = createMemberRepository(model as never);

    await repository.update('business-b', 'member-a', {
      role: 'MANAGER',
      isActive: false,
      branchId: 'branch-b',
    });

    expect(filters).toContainEqual({ businessId: 'business-b', id: 'member-a' });
    expect(model.update).toHaveBeenCalledWith({
      role: 'MANAGER',
      isActive: false,
      branchId: 'branch-b',
    });
  });

  it('does not fabricate an invitation when storage and email are unavailable', async () => {
    await expect(
      invitationService.invite({
        businessId: 'business-a',
        invitedByUserId: 'owner-a',
        fullName: 'Nguyen A',
        email: 'a@example.test',
        role: 'STAFF',
      }),
    ).rejects.toThrow('Persistent invitations and transactional email are not configured.');
  });

  it('does not fabricate payOS checkout or verified webhook success', async () => {
    const result = await unavailableSubscriptionPaymentProvider.createPaymentLink({
      businessId: 'business-a',
      subscriptionId: 'subscription-a',
      planId: 'plan-a',
      amountVnd: 100_000,
      returnUrl: 'https://example.test/return',
      cancelUrl: 'https://example.test/cancel',
    });

    expect(result).toEqual({ available: false, reason: 'PROVIDER_NOT_CONFIGURED' });
    expect(await unavailableSubscriptionPaymentProvider.verifyWebhook('{}', 'sig')).toBeNull();
  });

  it('persists business settings and business name in one transaction', async () => {
    const settingRow = {
      businessId: 'business-settings',
      contactEmail: 'owner@example.test',
      contactPhone: null,
      address: null,
      taxRate: 8,
      serviceChargeRate: 2,
      invoicePrefix: 'BNM',
      receiptTitle: null,
      receiptFooter: null,
      notifyLowStock: true,
      notifyNearExpiry: true,
    };
    const businessQuery = {
      first: vi.fn(async () => ({ id: 'business-settings', name: 'Bếp Nhà Mình' })),
      update: vi.fn(async () => []),
    };
    const settingsQuery = {
      first: vi.fn(async () => settingRow),
      upsert: vi.fn(async () => settingRow),
    };
    const businessModel = { where: vi.fn(() => businessQuery) };
    const settingsModel = { where: vi.fn(() => settingsQuery) };
    const transactionContext = {
      orm: {
        public: {
          Business: businessModel,
          BusinessSettings: settingsModel,
        },
      },
    };
    const transaction = vi.fn(
      async (callback: (context: typeof transactionContext) => Promise<unknown>) =>
        callback(transactionContext),
    );
    const repository = createSettingsRepository(
      settingsModel as never,
      businessModel as never,
      transaction as never,
    );

    const saved = await repository.save('business-settings', {
      businessName: 'Bếp Nhà Mình',
      contactEmail: 'owner@example.test',
      contactPhone: null,
      address: null,
      taxRate: 8,
      serviceFeeRate: 2,
      invoicePrefix: 'BNM',
      receiptTitle: null,
      receiptFooter: null,
      notifyLowStock: true,
      notifyNearExpiry: true,
    });

    expect(transaction).toHaveBeenCalledOnce();
    expect(businessQuery.update).toHaveBeenCalledWith({ name: 'Bếp Nhà Mình' });
    expect(settingsQuery.upsert).toHaveBeenCalledOnce();
    expect(saved?.serviceFeeRate).toBe(2);
  });

  it('loads subscription and billing data scoped to the requested business', async () => {
    const subscriptionQuery = {
      include: vi.fn(() => subscriptionQuery),
      first: vi.fn(async () => ({
        periodEndsAt: '2026-11-01T00:00:00Z',
        status: 'ACTIVE',
        plan: { name: 'Phát triển' },
      })),
    };
    const planQuery = {
      orderBy: vi.fn(() => planQuery),
      all: vi.fn(async () => [
        {
          id: 'plan-id',
          code: 'growth',
          name: 'Phát triển',
          description: null,
          monthlyPriceVnd: null,
          annualPriceVnd: null,
        },
      ]),
    };
    const billingQuery = {
      orderBy: vi.fn(() => billingQuery),
      all: vi.fn(async () => [{ createdAt: '2026-10-01T00:00:00Z', amountVnd: 0, status: 'PAID' }]),
    };
    const branchQuery = {
      select: vi.fn(() => branchQuery),
      all: vi.fn(async () => [{ id: 'branch-1' }]),
    };
    const subscriptions = { where: vi.fn(() => subscriptionQuery) };
    const planModel = { where: vi.fn(() => planQuery) };
    const billing = { where: vi.fn(() => billingQuery) };
    const branches = { where: vi.fn(() => branchQuery) };
    const repository = createSubscriptionRepository(
      subscriptions as never,
      planModel as never,
      billing as never,
      branches as never,
    );

    const view = await repository.getBusinessView('business-subscription');

    expect(subscriptions.where).toHaveBeenCalledWith({ businessId: 'business-subscription' });
    expect(billing.where).toHaveBeenCalledWith({ businessId: 'business-subscription' });
    expect(branches.where).toHaveBeenCalledWith({
      businessId: 'business-subscription',
      isActive: true,
    });
    expect(view.plan).toBe('Phát triển');
    expect(view.usage).toBe('1 chi nhánh đang hoạt động');
    expect(view.billingHistory[0].amountVnd).toBe(0);
  });

  it('aggregates revenue in the API and returns deterministic promotion rules', async () => {
    mock.rows = Array.from({ length: 10 }, () => ({
      createdAt: new Date().toISOString(),
      total: 3223000,
      items: [{ menuItemId: 'dish-1', name: 'Món thử', quantity: 1, total: 3223000 }],
    }));
    const ownerToken = token('OWNER');
    const revenue = await request(app)
      .get('/api/business/business-a/owner/revenue?period=week')
      .set('Authorization', `Bearer ${ownerToken}`);
    const promotions = await request(app)
      .get('/api/business/business-a/owner/promotions')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(revenue.body.data.revenueVnd).toBe(32_230_000);
    expect(promotions.body.data).toHaveLength(1);
    expect(promotions.body.data[0].basis).toContain('chưa ước tính doanh thu');
  });

  it('validates branch creation and prevents OWNER assignment', async () => {
    const ownerToken = token('OWNER');
    const invalidBranch = await request(app)
      .post('/api/business/business-a/owner/branches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'A' });
    const ownerElevation = await request(app)
      .post('/api/business/business-a/owner/members')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ fullName: 'Nguyen A', email: 'a@example.test', role: 'OWNER' });

    expect(invalidBranch.status).toBe(400);
    expect(ownerElevation.status).toBe(400);
  });

  it('validates settings and never returns payOS secrets', async () => {
    const ownerToken = token('OWNER');
    const invalidSettings = await request(app)
      .patch('/api/business/business-a/owner/settings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ taxRate: 900 });
    const subscription = await request(app)
      .get('/api/business/business-a/owner/subscription')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(invalidSettings.status).toBe(400);
    expect(JSON.stringify(subscription.body)).not.toContain('private-api-key');
    expect(JSON.stringify(subscription.body)).not.toContain('private-checksum');
  });
});

describe('integrated owner authorization and reads', () => {
  it('rejects anonymous, inactive and platform ADMIN-only users', async () => {
    await request(app).get('/api/business/business-a/owner/settings').expect(401);
    await request(app)
      .get('/api/business/business-a/owner/settings')
      .set('Authorization', 'Bearer ' + token('ADMIN'))
      .expect(403);
    mock.members[0]!.isActive = false;
    await request(app)
      .get('/api/business/business-a/owner/settings')
      .set('Authorization', 'Bearer ' + token('OWNER'))
      .expect(403);
    mock.members[0]!.isActive = true;
    mock.activeUser = false;
    await request(app)
      .get('/api/business/business-a/owner/settings')
      .set('Authorization', 'Bearer ' + token('OWNER'))
      .expect(403);
  });
  it('scopes analytics to owned branches and dates and allocates discounts', async () => {
    mock.rows = [
      {
        createdAt: new Date().toISOString(),
        total: 900,
        items: [
          { menuItemId: 'a', name: 'Món A', quantity: 1, total: 600 },
          { menuItemId: 'b', name: 'Món B', quantity: 1, total: 400 },
        ],
      },
      { createdAt: '2020-01-01T00:00:00Z', total: 99999, items: [] },
    ];
    const sales = await salesAnalytics('business-a', 'week');
    expect(sales.revenueVnd).toBe(900);
    expect(sales.topItems[0]?.revenueVnd).toBe(540);
    expect(mock.branchWhere).toHaveBeenCalledWith({ businessId: 'business-a' });
    expect((await salesAnalytics('foreign-business', 'week')).revenueVnd).toBe(0);
    expect(aggregateSales([])).toMatchObject({ revenueVnd: 0, orderCount: 0, topItems: [] });
  });
  it('persists validated settings and scopes all writes to authenticated business', async () => {
    const body = {
      businessName: 'Tên mới',
      taxRate: 8,
      serviceFeeRate: 0,
      invoicePrefix: 'VN',
      notifyLowStock: true,
      notifyNearExpiry: true,
    };
    await request(app)
      .patch('/api/business/business-a/owner/settings')
      .set('Authorization', 'Bearer ' + token('OWNER'))
      .send(body)
      .expect(200);
    expect(mock.settings).toMatchObject({ businessId: 'business-a', taxRate: 8, currency: 'VND' });
    expect(mock.updates).toHaveBeenCalledWith({ name: 'Tên mới' });
    const result = await request(app)
      .get('/api/business/business-a/owner/settings')
      .set('Authorization', 'Bearer ' + token('OWNER'))
      .expect(200);
    expect(result.body.data.taxRate).toBe(8);
    await request(app)
      .patch('/api/business/foreign/owner/settings')
      .set('Authorization', 'Bearer ' + token('OWNER'))
      .send(body)
      .expect(403);
  });
  it('updates isActive and roles only on owned non-owner memberships', async () => {
    const id = '22222222-2222-4222-8222-222222222222';
    mock.members.push({
      id,
      userId: 'employee',
      businessId: 'business-a',
      role: 'STAFF',
      isActive: true,
      branchId: '11111111-1111-4111-8111-111111111111',
    });
    const path = '/api/business/business-a/owner/members/' + id;
    await request(app)
      .patch(path)
      .set('Authorization', 'Bearer ' + token('OWNER'))
      .send({ role: 'MANAGER' })
      .expect(200);
    expect(mock.updates).toHaveBeenCalledWith({ role: 'MANAGER' });
    await request(app)
      .patch(path)
      .set('Authorization', 'Bearer ' + token('OWNER'))
      .send({ isActive: false })
      .expect(200);
    expect(mock.updates).toHaveBeenCalledWith({ isActive: false });
    await request(app)
      .patch(path)
      .set('Authorization', 'Bearer ' + token('OWNER'))
      .send({ role: 'OWNER' })
      .expect(400);
    await request(app)
      .patch(path)
      .set('Authorization', 'Bearer ' + token('OWNER'))
      .send({ branchId: '33333333-3333-4333-8333-333333333333' })
      .expect(400);
    mock.members.at(-1)!.role = 'OWNER';
    await request(app)
      .patch(path)
      .set('Authorization', 'Bearer ' + token('OWNER'))
      .send({ isActive: false })
      .expect(403);
    mock.members.at(-1)!.businessId = 'foreign';
    await request(app)
      .patch(path)
      .set('Authorization', 'Bearer ' + token('OWNER'))
      .send({ isActive: false })
      .expect(404);
  });
  it('does not update branches in another business or create fake checkout', async () => {
    await request(app)
      .patch('/api/business/business-a/owner/branches/33333333-3333-4333-8333-333333333333')
      .set('Authorization', 'Bearer ' + token('OWNER'))
      .send({ name: 'Chi nhánh khác' })
      .expect(404);
    const checkout = await request(app)
      .post('/api/business/business-a/owner/subscription/checkout')
      .set('Authorization', 'Bearer ' + token('OWNER'))
      .expect(503);
    expect(checkout.body.code).toBe('PROVIDER_NOT_CONFIGURED');
    const sub = await request(app)
      .get('/api/business/business-a/owner/subscription')
      .set('Authorization', 'Bearer ' + token('OWNER'))
      .expect(200);
    expect(sub.body.data).toMatchObject({ billingHistory: [], plans: [], payOSAvailable: false });
    await request(app).get('/api/dev/session').expect(404);
  });
});

describe('owner API failure boundaries', () => {
  it('rejects signed tokens without a user identity before membership lookup', async () => {
    const token = jwt.sign({ role: 'OWNER', businessId: 'business-a' }, env.JWT_ACCESS_SECRET);
    await request(app)
      .get('/api/business/business-a/owner/settings')
      .set('Authorization', 'Bearer ' + token)
      .expect(401);
  });
  it('returns unavailable when database reads fail without exposing internals', async () => {
    mock.branchWhere.mockImplementationOnce(() => {
      throw new Error('internal database detail');
    });
    const result = await request(app)
      .get('/api/business/business-a/owner/revenue')
      .set('Authorization', 'Bearer ' + token('OWNER'))
      .expect(503);
    expect(JSON.stringify(result.body)).not.toContain('internal database detail');
  });
  it('does not invent recipe costs for sales without recipes', async () => {
    mock.rows = [
      {
        createdAt: new Date().toISOString(),
        total: 100,
        items: [{ menuItemId: 'missing', name: 'Món thử', quantity: 1, total: 100 }],
      },
    ];
    vi.spyOn(inventoryAnalytics, 'ownerRecipeCosts').mockResolvedValue([]);
    await request(app)
      .get('/api/business/business-a/owner/menu-profit')
      .set('Authorization', 'Bearer ' + token('OWNER'))
      .expect(409);
  });
  it('validates reporting periods', async () => {
    await request(app)
      .get('/api/business/business-a/owner/revenue?period=invalid')
      .set('Authorization', 'Bearer ' + token('OWNER'))
      .expect(400);
  });
});
