import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
const mocks = vi.hoisted(() => ({
  member: vi.fn(),
  members: vi.fn(),
  user: vi.fn(),
  business: vi.fn(),
  branch: vi.fn(),
  memberWhere: vi.fn(),
  branchWhere: vi.fn(),
}));
vi.mock('../src/prisma/db.js', () => ({
  db: {
    orm: {
      public: {
        BusinessMember: {
          where: (scope: unknown) => {
            mocks.memberWhere(scope);
            return { first: mocks.member, all: mocks.members };
          },
        },
        User: { where: () => ({ select: () => ({ first: mocks.user }) }) },
        Business: { where: () => ({ select: () => ({ first: mocks.business }) }) },
        Branch: {
          where: (scope: unknown) => {
            mocks.branchWhere(scope);
            return { select: () => ({ first: mocks.branch }), first: mocks.branch };
          },
        },
      },
    },
  },
}));
import app from '../src/app.js';
const businessId = '58dd232c-43e6-49af-bfd5-f42888401cd8';
const branchId = 'd962d695-319c-48db-b4a2-dfeb78681a6e';
const userId = '64bdc5e2-ae67-477f-90eb-d76656b4c421';
const token = () =>
  jwt.sign({ userId, email: 'test@example.test', platformRole: 'ADMIN' }, env.JWT_ACCESS_SECRET, {
    expiresIn: '5m',
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.member.mockResolvedValue({ businessId, branchId, role: 'MANAGER', isActive: true });
  mocks.members.mockResolvedValue([{ businessId, branchId, role: 'MANAGER', isActive: true }]);
  mocks.user.mockResolvedValue({ id: userId, fullName: 'Nguyễn An' });
  mocks.business.mockResolvedValue({ id: businessId, name: 'Doanh nghiệp kiểm thử' });
  mocks.branch.mockResolvedValue({ id: branchId, name: 'Chi nhánh kiểm thử' });
});

describe('JWT workspace discovery without a business ID', () => {
  it('requires authentication', async () => {
    await request(app).get('/api/workspace').expect(401);
    expect(mocks.members).not.toHaveBeenCalled();
  });
  it('resolves one manager membership and ignores client identity/scope', async () => {
    const result = await request(app)
      .get('/api/workspace?businessId=forged&userId=forged')
      .set('Authorization', `Bearer ${token()}`)
      .set('x-role', 'OWNER')
      .set('x-branch-id', 'forged')
      .expect(200);
    expect(result.body).toMatchObject({
      user: { id: userId },
      business: { id: businessId },
      branch: { id: branchId },
      role: 'MANAGER',
    });
    expect(mocks.memberWhere).toHaveBeenCalledWith({ userId, isActive: true });
    expect(mocks.member).not.toHaveBeenCalled();
  });
  it('resolves owner with no branch and does not promote platform ADMIN', async () => {
    mocks.members.mockResolvedValue([
      { businessId, branchId: null, role: 'OWNER', isActive: true },
    ]);
    const result = await request(app)
      .get('/api/workspace')
      .set('Authorization', `Bearer ${token()}`)
      .expect(200);
    expect(result.body.role).toBe('OWNER');
    expect(result.body.branch).toBeUndefined();
    expect(mocks.branch).not.toHaveBeenCalled();
  });
  it('denies no active memberships or inactive users', async () => {
    mocks.members.mockResolvedValue([]);
    await request(app).get('/api/workspace').set('Authorization', `Bearer ${token()}`).expect(403);
    mocks.user.mockResolvedValue(null);
    await request(app).get('/api/workspace').set('Authorization', `Bearer ${token()}`).expect(403);
  });
  it('denies missing, inactive or foreign assigned branches', async () => {
    mocks.members.mockResolvedValue([
      { businessId, branchId: null, role: 'STAFF', isActive: true },
    ]);
    await request(app).get('/api/workspace').set('Authorization', `Bearer ${token()}`).expect(403);
    mocks.members.mockResolvedValue([{ businessId, branchId, role: 'MANAGER', isActive: true }]);
    mocks.branch.mockResolvedValue(null);
    await request(app).get('/api/workspace').set('Authorization', `Bearer ${token()}`).expect(403);
    expect(mocks.branchWhere).toHaveBeenCalledWith({ id: branchId, businessId, isActive: true });
  });
  it('returns deterministic selection-required response for multiple memberships', async () => {
    const other = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
    mocks.members.mockResolvedValue([
      { businessId: other, branchId: null, role: 'OWNER', isActive: true },
      { businessId, branchId, role: 'MANAGER', isActive: true },
    ]);
    mocks.business
      .mockResolvedValueOnce({ id: businessId, name: 'A' })
      .mockResolvedValueOnce({ id: other, name: 'B' });
    const result = await request(app)
      .get('/api/workspace')
      .set('Authorization', `Bearer ${token()}`)
      .expect(409);
    expect(result.body.code).toBe('WORKSPACE_SELECTION_REQUIRED');
    expect(result.body.workspaces.map((w: { business: { id: string } }) => w.business.id)).toEqual([
      businessId,
      other,
    ]);
    expect(result.body.user).toBeUndefined();
    expect(mocks.member).not.toHaveBeenCalled();
  });
});
describe('Verified workspace using the existing JWT and membership middleware', () => {
  it('requires a signed Bearer token', async () => {
    await request(app).get(`/api/business/${businessId}/workspace`).expect(401);
    expect(mocks.member).not.toHaveBeenCalled();
  });
  it('derives scope from database membership, ignores arbitrary role headers, and returns no credentials', async () => {
    const result = await request(app)
      .get(`/api/business/${businessId}/workspace`)
      .set('Authorization', `Bearer ${token()}`)
      .set('x-role', 'OWNER')
      .expect(200);
    expect(result.body).toEqual({
      user: { id: userId, fullName: 'Nguyễn An' },
      business: { id: businessId, name: 'Doanh nghiệp kiểm thử' },
      branch: { id: branchId, name: 'Chi nhánh kiểm thử' },
      role: 'MANAGER',
    });
    expect(mocks.memberWhere).toHaveBeenCalledWith({ userId, businessId });
    expect(mocks.branchWhere).toHaveBeenCalledWith({ id: branchId, businessId, isActive: true });
  });
  it('rejects missing or inactive membership', async () => {
    mocks.member.mockResolvedValue(null);
    await request(app)
      .get(`/api/business/${businessId}/workspace`)
      .set('Authorization', `Bearer ${token()}`)
      .expect(403);
    mocks.member.mockResolvedValue({ businessId, branchId, role: 'MANAGER', isActive: false });
    await request(app)
      .get(`/api/business/${businessId}/workspace`)
      .set('Authorization', `Bearer ${token()}`)
      .expect(403);
  });
  it('rejects an inactive user or a foreign/inactive branch', async () => {
    mocks.user.mockResolvedValue(null);
    await request(app)
      .get(`/api/business/${businessId}/workspace`)
      .set('Authorization', `Bearer ${token()}`)
      .expect(403);
    mocks.user.mockResolvedValue({ id: userId, fullName: 'Nguyễn An' });
    mocks.branch.mockResolvedValue(null);
    await request(app)
      .get(`/api/business/${businessId}/workspace`)
      .set('Authorization', `Bearer ${token()}`)
      .expect(403);
  });
  it('does not turn a platform ADMIN into an OWNER and blocks Staff inventory URLs', async () => {
    mocks.member.mockResolvedValue({ businessId, branchId, role: 'STAFF', isActive: true });
    const result = await request(app)
      .get(`/api/business/${businessId}/workspace`)
      .set('Authorization', `Bearer ${token()}`)
      .expect(200);
    expect(result.body.role).toBe('STAFF');
    await request(app)
      .get(`/api/business/${businessId}/inventory/branches/${branchId}`)
      .set('Authorization', `Bearer ${token()}`)
      .expect(403);
  });
  it('keeps Owner workspace business-wide without assigning a branch', async () => {
    mocks.member.mockResolvedValue({ businessId, branchId: null, role: 'OWNER', isActive: true });
    const result = await request(app)
      .get(`/api/business/${businessId}/workspace`)
      .set('Authorization', `Bearer ${token()}`)
      .expect(200);
    expect(result.body.branch).toBeUndefined();
    expect(result.body.role).toBe('OWNER');
  });
  it('does not expose internal database failures', async () => {
    mocks.user.mockRejectedValue(new Error('private credential'));
    const result = await request(app)
      .get(`/api/business/${businessId}/workspace`)
      .set('Authorization', `Bearer ${token()}`)
      .expect(503);
    expect(result.text).not.toContain('credential');
  });
});
