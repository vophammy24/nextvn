import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { resolveMembership } from '../../middleware/membership.js';
import * as shiftsController from './shifts.controller.js';

const router = Router({ mergeParams: true });

router.use(authenticate, resolveMembership);

router.post('/start', shiftsController.startShift);
router.post('/end', shiftsController.endShift);
router.get('/:branchId/active', shiftsController.getActiveShift);
router.get('/:branchId', shiftsController.getShifts);
router.get('/:branchId/:shiftId/summary', shiftsController.getShiftSummary);

export default router;
