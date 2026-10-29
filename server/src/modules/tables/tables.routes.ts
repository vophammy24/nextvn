import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { resolveMembership } from '../../middleware/membership.js';
import type { MemberRequest } from '../../middleware/membership.js';
import * as tablesController from './tables.controller.js';

const router = Router({ mergeParams: true });

router.use(authenticate, resolveMembership);
router.use((req, res, next) => {
  const branchId = req.path.split('/')[1];
  const member = (req as MemberRequest).membership;
  if (member.role !== 'OWNER' && member.branchId !== branchId) {
    res.status(403).json({ message: 'Bạn không được phép truy cập bàn của chi nhánh khác.' });
    return;
  }
  next();
});

// Areas
router.get('/:branchId/areas', tablesController.getAreas);
router.post('/:branchId/areas', (_req, res) => {
  res
    .status(410)
    .json({ code: 'SALES_API_REPLACED', message: 'Dùng API bán hàng mới để tạo khu vực.' });
});

// Tables
router.get('/:branchId', tablesController.getTables);
router.post('/:branchId', (_req, res) => {
  res
    .status(410)
    .json({ code: 'SALES_API_REPLACED', message: 'Dùng API bán hàng mới để tạo bàn.' });
});
router.patch('/:branchId/:tableId/status', (_req, res) => {
  res
    .status(410)
    .json({ code: 'SALES_API_REPLACED', message: 'Trạng thái bàn được xác định từ đơn đang mở.' });
});
router.get('/:branchId/:tableId/bill', tablesController.getTableBill);

export default router;
