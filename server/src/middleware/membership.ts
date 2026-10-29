import type { Request, Response, NextFunction } from 'express';
import { db } from '../prisma/db.js';
import type { AuthenticatedRequest } from './auth.js';
import { sendError } from '../lib/api-response.js';

export interface Membership {
  businessId: string;
  branchId: string | null;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  isActive: boolean;
}

export interface MemberRequest extends AuthenticatedRequest {
  membership: Membership;
}

/**
 * Middleware to verify that the authenticated user is an active member
 * of the business specified in the route params.
 */
export function createResolveMembership(database: typeof db = db) {
  return async function resolveMembership(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const authReq = req as AuthenticatedRequest;
    const businessId = Array.isArray(req.params['businessId'])
      ? req.params['businessId'][0]
      : req.params['businessId'];

    if (!businessId) {
      sendError(res, 'Missing business ID in request params.', 400);
      return;
    }

    try {
      const membership = await database.orm.public.BusinessMember.where({
        userId: authReq.user.userId,
        businessId,
      }).first();

      if (!membership || !membership.isActive) {
        sendError(res, 'Tài khoản không có quyền truy cập vào doanh nghiệp này.', 403);
        return;
      }

      const [user, business] = await Promise.all([
        database.orm.public.User.where({ id: authReq.user.userId, status: 'ACTIVE' })
          .select('id')
          .first(),
        database.orm.public.Business.where({ id: businessId })
          .select('id', 'approvalStatus', 'operationalStatus')
          .first(),
      ]);
      if (
        !user ||
        !business ||
        business.approvalStatus !== 'APPROVED' ||
        business.operationalStatus !== 'ACTIVE'
      ) {
        res.status(403).json({
          code: 'BUSINESS_ACCESS_RESTRICTED',
          message: 'Doanh nghiệp chưa được phê duyệt hoặc đã tạm ngưng hoạt động.',
        });
        return;
      }

      (req as MemberRequest).membership = {
        businessId: membership.businessId,
        branchId: membership.branchId,
        role: membership.role,
        isActive: membership.isActive,
      };

      next();
    } catch {
      sendError(res, 'Lỗi xác thực quyền hạn.', 503);
    }
  };
}
export const resolveMembership = createResolveMembership();

/**
 * Helper to validate if a branch belongs to the given business.
 */
export async function validateBranchOwnership(
  businessId: string,
  branchId: string,
  database: typeof db = db,
): Promise<boolean> {
  try {
    const branch = await database.orm.public.Branch.where({
      id: branchId,
      businessId,
      isActive: true,
    }).first();
    return !!branch;
  } catch {
    return false;
  }
}
