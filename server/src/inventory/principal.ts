import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { MemberRequest } from '../middleware/membership.js';
import type { Principal } from './domain.js';

export async function resolveInventoryPrincipal(
  req: Request,
  _res: Response,
): Promise<Principal | null> {
  const authReq = req as AuthenticatedRequest;
  const memberReq = req as MemberRequest;

  if (!authReq.user || !memberReq.membership) {
    return null;
  }

  const { membership } = memberReq;

  const branchIds =
    membership.role === 'OWNER' ? [] : membership.branchId ? [membership.branchId] : [];

  return {
    userId: authReq.user.userId,
    businessId: membership.businessId,
    role: membership.role,
    branchIds,
  };
}
