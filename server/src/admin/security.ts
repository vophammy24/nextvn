import type { Request, Response, NextFunction } from 'express';
import { db } from '../prisma/db.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

// ADMIN is the existing platform-level SYSTEM_ADMIN equivalent. Ignore JWT role claims.
export async function requireSystemAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await db.orm.public.User.where({
      id: (req as AuthenticatedRequest).user.userId,
      status: 'ACTIVE',
      platformRole: 'ADMIN',
    })
      .select('id', 'fullName', 'platformRole', 'status')
      .first();
    if (!user || user.platformRole !== 'ADMIN' || user.status !== 'ACTIVE') {
      res.status(403).json({ message: 'Chỉ quản trị viên hệ thống được truy cập.' });
      return;
    }
    res.locals.admin = { id: user.id, fullName: user.fullName };
    next();
  } catch {
    res.status(503).json({ message: 'Không thể xác minh quyền quản trị.' });
  }
}
