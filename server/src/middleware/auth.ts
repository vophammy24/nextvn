import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { sendUnauthorized, sendForbidden } from '../lib/api-response.js';
import { db } from '../prisma/db.js';

export interface JwtPayload {
  userId: string;
  email: string;
  platformRole: string;
  credentialVersion?: number;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

export function createAuthenticate(database: typeof db = db) {
  return async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      sendUnauthorized(res, 'Token không hợp lệ.');
      return;
    }

    const token = authHeader.slice(7);

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
      if (
        typeof decoded !== 'object' ||
        decoded === null ||
        typeof decoded.userId !== 'string' ||
        !decoded.userId.trim()
      ) {
        sendUnauthorized(res, 'Token không hợp lệ.');
        return;
      }
      const version = decoded.credentialVersion ?? 0;
      if (!Number.isSafeInteger(version) || version < 0) {
        sendUnauthorized(res, 'Token không hợp lệ.');
        return;
      }
      let user;
      try {
        user = await database.orm.public.User.where({ id: decoded.userId, status: 'ACTIVE' })
          .select('credentialVersion')
          .first();
      } catch {
        res.status(503).json({ message: 'Không thể xác minh phiên đăng nhập. Vui lòng thử lại.' });
        return;
      }
      if (!user || (user.credentialVersion ?? 0) !== version) {
        sendUnauthorized(res, 'Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.');
        return;
      }
      (req as AuthenticatedRequest).user = decoded;
      next();
    } catch {
      sendUnauthorized(res, 'Token đã hết hạn hoặc không hợp lệ.');
    }
  };
}
export const authenticate = createAuthenticate();

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
