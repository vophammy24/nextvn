import type { Request, Response } from 'express';
import type { MemberRequest, Membership } from '../middleware/membership.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../prisma/db.js';

async function resolveWorkspaceMembership(membership: Membership) {
  const business = await db.orm.public.Business.where({ id: membership.businessId })
    .select('id', 'name')
    .first();
  if (!business || !membership.isActive) return null;
  const branch =
    membership.role !== 'OWNER' && membership.branchId
      ? await db.orm.public.Branch.where({
          id: membership.branchId,
          businessId: membership.businessId,
          isActive: true,
        })
          .select('id', 'name')
          .first()
      : null;
  if (membership.role !== 'OWNER' && !branch) return null;
  return { business, role: membership.role, ...(branch ? { branch } : {}) };
}

// Discover memberships using only the verified JWT identity, never a client-supplied scope.
export async function bootstrapWorkspace(req: Request, res: Response) {
  const { user: identity } = req as AuthenticatedRequest;
  try {
    const user = await db.orm.public.User.where({ id: identity.userId, status: 'ACTIVE' })
      .select('id', 'fullName')
      .first();
    if (!user) {
      res.status(403).json({ message: 'Tài khoản không còn quyền truy cập.' });
      return;
    }
    const memberships = await db.orm.public.BusinessMember.where({
      userId: identity.userId,
      isActive: true,
    }).all();
    if (!memberships.length) {
      res.status(403).json({ message: 'Tài khoản chưa có doanh nghiệp đang hoạt động.' });
      return;
    }
    // Stable ordering independent of the database's physical row order.
    memberships.sort(
      (a, b) =>
        a.businessId.localeCompare(b.businessId) ||
        (a.branchId ?? '').localeCompare(b.branchId ?? ''),
    );
    const workspaces = await Promise.all(memberships.map(resolveWorkspaceMembership));
    if (memberships.length > 1) {
      res.status(409).json({
        code: 'WORKSPACE_SELECTION_REQUIRED',
        message: 'Tài khoản thuộc nhiều doanh nghiệp. Vui lòng chọn doanh nghiệp làm việc.',
        workspaces: workspaces.filter((w) => w !== null),
      });
      return;
    }
    if (!workspaces[0]) {
      res
        .status(403)
        .json({ message: 'Doanh nghiệp hoặc chi nhánh được phân công không còn hoạt động.' });
      return;
    }
    res.json({ user, ...workspaces[0] });
  } catch {
    res.status(503).json({ message: 'Không thể tải phiên làm việc. Vui lòng thử lại.' });
  }
}

// Read-only projection of the existing JWT + membership middleware, not a login endpoint.
export async function readWorkspace(req: Request, res: Response) {
  const { user: identity, membership } = req as MemberRequest;
  try {
    const [user, business] = await Promise.all([
      db.orm.public.User.where({ id: identity.userId, status: 'ACTIVE' })
        .select('id', 'fullName')
        .first(),
      db.orm.public.Business.where({ id: membership.businessId }).select('id', 'name').first(),
    ]);
    if (!user || !business || !membership.isActive) {
      res.status(403).json({ message: 'Phiên làm việc không còn quyền truy cập.' });
      return;
    }
    const branch =
      membership.role !== 'OWNER' && membership.branchId
        ? await db.orm.public.Branch.where({
            id: membership.branchId,
            businessId: membership.businessId,
            isActive: true,
          })
            .select('id', 'name')
            .first()
        : null;
    if (membership.role !== 'OWNER' && !branch) {
      res.status(403).json({ message: 'Bạn chưa được phân công chi nhánh đang hoạt động.' });
      return;
    }
    res.json({ user, business, role: membership.role, ...(branch ? { branch } : {}) });
  } catch {
    res.status(503).json({ message: 'Không thể tải phiên làm việc. Vui lòng thử lại.' });
  }
}
