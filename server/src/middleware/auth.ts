import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { sendUnauthorized, sendForbidden } from '../lib/api-response.js';

export interface JwtPayload {
  userId: string;
  email: string;
  platformRole: string;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    sendUnauthorized(res, 'Token không hợp lệ.');
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch {
    sendUnauthorized(res, 'Token đã hết hạn hoặc không hợp lệ.');
  }
}

/**
 * Middleware to require a specific business role.
 * Must be used AFTER authenticate and AFTER resolveMembership.
 */
export function requireBusinessRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const memberReq = req as AuthenticatedRequest & { membership?: { role: string } };
    if (!memberReq.membership) {
      sendForbidden(res, 'Bạn không phải thành viên của doanh nghiệp này.');
      return;
    }
    if (!roles.includes(memberReq.membership.role)) {
      sendForbidden(res, 'Bạn không có quyền thực hiện thao tác này.');
      return;
    }
    next();
  };
}
