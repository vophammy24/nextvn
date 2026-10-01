import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { resolveMembership } from '../../middleware/membership.js';
import * as tablesController from './tables.controller.js';

const router = Router({ mergeParams: true });

router.use(authenticate, resolveMembership);

// Areas
router.get('/:branchId/areas', tablesController.getAreas);
router.post('/:branchId/areas', tablesController.createArea);

// Tables
router.get('/:branchId', tablesController.getTables);
router.post('/:branchId', tablesController.createTable);
router.patch('/:branchId/:tableId/status', tablesController.updateTableStatus);
router.get('/:branchId/:tableId/bill', tablesController.getTableBill);

export default router;
