import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { resolveMembership } from '../../middleware/membership.js';
import type { MemberRequest } from '../../middleware/membership.js';
import * as shiftsController from './shifts.controller.js';

const router = Router({ mergeParams: true });

router.use(authenticate, resolveMembership);
router.use((req, res, next) => {
  const member = (req as MemberRequest).membership;
  const branchId =
    req.path === '/start'
      ? req.body?.branchId
      : req.path.startsWith('/end')
        ? null
        : req.path.split('/')[1];
  if (member.role !== 'OWNER' && branchId && member.branchId !== branchId) {
    res.status(403).json({ message: 'Bạn không được phép truy cập ca của chi nhánh khác.' });
    return;
  }
  next();
});

router.post('/start', shiftsController.startShift);
router.post('/end', shiftsController.endShift);
router.get('/:branchId/active', shiftsController.getActiveShift);
router.get('/:branchId', shiftsController.getShifts);
router.get('/:branchId/:shiftId/summary', shiftsController.getShiftSummary);

export default router;
