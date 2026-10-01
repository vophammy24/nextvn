import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { resolveMembership } from '../../middleware/membership.js';
import * as ordersController from './orders.controller.js';

const router = Router({ mergeParams: true });

router.use(authenticate, resolveMembership);

router.post('/', ordersController.createOrder);
router.get('/:branchId', ordersController.getOrders);
router.get('/:branchId/:orderId', ordersController.getOrderById);
router.patch('/:branchId/:orderId/status', ordersController.updateOrderStatus);

export default router;
