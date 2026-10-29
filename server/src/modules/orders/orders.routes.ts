import { Router } from 'express';
import { db } from '../../prisma/db.js';
import { authenticate } from '../../middleware/auth.js';
import { resolveMembership } from '../../middleware/membership.js';
import type { MemberRequest } from '../../middleware/membership.js';
import * as ordersController from './orders.controller.js';

export function createOrdersRouter(
  options: {
    database?: typeof db;
    authenticate?: typeof authenticate;
    resolveMembership?: typeof resolveMembership;
  } = {},
) {
  const router = Router({ mergeParams: true });

  router.use(options.authenticate ?? authenticate, options.resolveMembership ?? resolveMembership);
  router.use((req, res, next) => {
    res.locals.ordersDatabase = options.database;
    const member = (req as MemberRequest).membership;
    const branchId = req.method === 'POST' ? req.body?.branchId : req.path.split('/')[1];
    if (member.role !== 'OWNER' && branchId && member.branchId !== branchId) {
      res.status(403).json({ message: 'Bạn không có quyền truy cập đơn hàng tại chi nhánh này.' });
      return;
    }
    next();
  });

  // The legacy checkout endpoint had no stable request key and bypassed the
  // unpaid-order/table policy. Keep reads for old clients; mutations use /sales.
  router.post('/', (_req, res) => {
    res
      .status(410)
      .json({ code: 'SALES_API_REPLACED', message: 'Dùng API bán hàng mới để tạo đơn.' });
  });
  router.get('/:branchId', ordersController.getOrders);
  router.get('/:branchId/:orderId', ordersController.getOrderById);
  router.patch('/:branchId/:orderId/status', (_req, res) => {
    res.status(410).json({
      code: 'SALES_API_REPLACED',
      message: 'Dùng API bán hàng mới để đổi trạng thái đơn.',
    });
  });

  return router;
}
export default createOrdersRouter();
