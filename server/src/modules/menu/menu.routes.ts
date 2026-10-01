import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { resolveMembership } from '../../middleware/membership.js';
import * as menuController from './menu.controller.js';

const router = Router({ mergeParams: true });

// All menu routes require authentication and business membership
router.use(authenticate, resolveMembership);

// Categories
router.get('/:branchId/categories', menuController.getCategories);
router.post('/:branchId/categories', menuController.createCategory);

// Menu items
router.get('/:branchId/items', menuController.getMenuItems);
router.post('/:branchId/items', menuController.createMenuItem);

export default router;
