import request from 'supertest';
import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../src/app';
import { calculateMenuProfit } from '../src/owner/analyticsReaders';
import { createBranchRepository } from '../src/owner/branchRepository';
import { invitationService } from '../src/owner/invitationService';
import { createMemberRepository } from '../src/owner/memberRepository';
import { createSettingsRepository } from '../src/owner/settingsRepository';
import { createSubscriptionRepository } from '../src/owner/subscriptionRepository';
import { unavailableSubscriptionPaymentProvider } from '../src/owner/subscriptionPaymentProvider';

const secret = 'owner-test-secret';
const previousNodeEnv = process.env.NODE_ENV;
const token = (role: string, businessId = 'dev-business', userId = `${role.toLowerCase()}-user`) =>
  jwt.sign({ role, businessId, userId }, secret);

beforeEach(() => {
  process.env.NODE_ENV = 'development';
  process.env.JWT_ACCESS_SECRET = secret;
});

afterEach(() => {
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
  delete process.env.JWT_ACCESS_SECRET;
  delete process.env.PAYOS_API_KEY;
  delete process.env.PAYOS_CHECKSUM_KEY;
});

describe('owner business API', () => {
  it('rejects managers and staff from owner endpoints', async () => {
    for (const role of ['MANAGER', 'STAFF']) {
      const response = await request(app)
        .get('/api/owner/overview')
        .set('Authorization', `Bearer ${token(role)}`);
      expect(response.status).toBe(403);
    }
    const managerBranch = await request(app)
      .post('/api/owner/branches')
      .set('Authorization', `Bearer ${token('MANAGER')}`)
      .send({ name: 'Chi nhánh mới' });
    const staffSubscription = await request(app)
      .get('/api/owner/subscription')
      .set('Authorization', `Bearer ${token('STAFF')}`);
    expect(managerBranch.status).toBe(403);
    expect(staffSubscription.status).toBe(403);
  });

  it('does not expose another business through the development adapter', async () => {
    const response = await request(app)
      .get('/api/owner/branches')
      .set('Authorization', `Bearer ${token('OWNER', 'other-business')}`);
    const subscription = await request(app)
      .get('/api/owner/subscription')
      .set('Authorization', `Bearer ${token('OWNER', 'other-business')}`);
    expect(response.status).toBe(404);
    expect(subscription.status).toBe(404);
  });

  it('does not serve fixture analytics outside development', async () => {
    process.env.NODE_ENV = 'production';
    const response = await request(app)
      .get('/api/owner/overview')
      .set('Authorization', `Bearer ${token('OWNER')}`);

    expect(response.status).toBe(503);
    expect(response.body.message).toContain('chưa được kết nối');
  });

  it('calculates menu profit from revenue and ingredient cost read data', async () => {
    const response = await request(app)
      .get('/api/owner/menu-profit')
      .set('Authorization', `Bearer ${token('OWNER')}`);

    expect(response.status).toBe(200);
    expect(response.body.data[0]).toMatchObject({
      revenueVnd: 8_370_000,
      ingredientCostVnd: 5_130_000,
      grossProfitVnd: 3_240_000,
    });
    expect(response.body.costingBasis).toBe('aggregate');
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
      status: 'INACTIVE',
      branchId: 'branch-b',
    });

    expect(filters).toContainEqual({ businessId: 'business-b', id: 'member-a' });
    expect(model.update).toHaveBeenCalledWith({
      role: 'MANAGER',
      status: 'INACTIVE',
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
    const ownerToken = token('OWNER');
    const revenue = await request(app)
      .get('/api/owner/revenue?period=week')
      .set('Authorization', `Bearer ${ownerToken}`);
    const promotions = await request(app)
      .get('/api/owner/promotions')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(revenue.body.data.revenueVnd).toBe(32_230_000);
    expect(promotions.body.data).toHaveLength(3);
    expect(promotions.body.data[0].basis).toContain('chưa ước tính doanh thu');
  });

  it('validates branch creation and prevents OWNER assignment', async () => {
    const ownerToken = token('OWNER');
    const invalidBranch = await request(app)
      .post('/api/owner/branches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'A' });
    const ownerElevation = await request(app)
      .post('/api/owner/members')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ fullName: 'Nguyen A', email: 'a@example.test', role: 'OWNER' });

    expect(invalidBranch.status).toBe(400);
    expect(ownerElevation.status).toBe(400);
  });

  it('validates settings and never returns payOS secrets', async () => {
    process.env.PAYOS_API_KEY = 'private-api-key';
    process.env.PAYOS_CHECKSUM_KEY = 'private-checksum';
    const ownerToken = token('OWNER');
    const invalidSettings = await request(app)
      .patch('/api/owner/settings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ taxRate: 900 });
    const subscription = await request(app)
      .get('/api/owner/subscription')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(invalidSettings.status).toBe(400);
    expect(JSON.stringify(subscription.body)).not.toContain('private-api-key');
    expect(JSON.stringify(subscription.body)).not.toContain('private-checksum');
  });
});
