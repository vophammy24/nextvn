import { Router } from 'express';
import { db } from '../../prisma/db.js';
import { authenticate } from '../../middleware/auth.js';
import { resolveMembership } from '../../middleware/membership.js';
import type { MemberRequest } from '../../middleware/membership.js';
import * as menuController from './menu.controller.js';

export function createMenuRouter(
  options: {
    database?: typeof db;
    authenticate?: typeof authenticate;
    resolveMembership?: typeof resolveMembership;
  } = {},
) {
  const router = Router({ mergeParams: true });

  // All menu routes require authentication and business membership
  router.use(options.authenticate ?? authenticate, options.resolveMembership ?? resolveMembership);
  router.use((req, res, next) => {
    res.locals.menuDatabase = options.database;
    const member = (req as MemberRequest).membership;
    const branchId = req.path.split('/')[1];
    if (member.role !== 'OWNER' && branchId && member.branchId !== branchId) {
      res.status(403).json({ message: 'Bạn không có quyền truy cập thực đơn tại chi nhánh này.' });
      return;
    }
    next();
  });

  // Categories
  router.get('/:branchId/categories', menuController.getCategories);
  router.post('/:branchId/categories', menuController.createCategory);

  // Menu items
  router.get('/:branchId/items', menuController.getMenuItems);
  router.post('/:branchId/items', menuController.createMenuItem);

  return router;
}
export default createMenuRouter();
