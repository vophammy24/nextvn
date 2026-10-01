import type { Request, Response } from 'express';
import { sendSuccess, sendError, sendNotFound, sendServerError } from '../../lib/api-response.js';
import type { MemberRequest } from '../../middleware/membership.js';
import { validateBranchOwnership } from '../../middleware/membership.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { startShiftSchema, endShiftSchema } from './shifts.schema.js';
import * as shiftsService from './shifts.service.js';

function paramStr(val: string | string[] | undefined): string {
  return Array.isArray(val) ? val[0] : (val ?? '');
}

export async function startShift(req: Request, res: Response): Promise<void> {
  try {
    const memberReq = req as MemberRequest;
    const parsed = startShiftSchema.safeParse(req.body);

    if (!parsed.success) {
      sendError(res, 'Dữ liệu không hợp lệ.');
      return;
    }

    const valid = await validateBranchOwnership(
      memberReq.membership.businessId,
      parsed.data.branchId,
    );
    if (!valid) {
      sendError(res, 'Chi nhánh không hợp lệ.', 403);
      return;
    }

    const userId = (req as AuthenticatedRequest).user.userId;
    const shift = await shiftsService.startShift(userId, parsed.data.branchId);
    sendSuccess(res, shift, 'Bắt đầu ca thành công.', 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Không thể bắt đầu ca.';
    sendError(res, message);
  }
}

export async function endShift(req: Request, res: Response): Promise<void> {
  try {
    const parsed = endShiftSchema.safeParse(req.body);

    if (!parsed.success) {
      sendError(res, 'Dữ liệu không hợp lệ.');
      return;
    }

    const userId = (req as AuthenticatedRequest).user.userId;
    const shift = await shiftsService.endShift(parsed.data.shiftId, userId);

    if (!shift) {
      sendNotFound(res, 'Phiên làm việc không hợp lệ.');
      return;
    }

    sendSuccess(res, shift, 'Kết thúc ca thành công.');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Không thể kết thúc ca.';
    sendError(res, message);
  }
}

export async function getActiveShift(req: Request, res: Response): Promise<void> {
  try {
    const branchId = paramStr(req.params['branchId']);
    const memberReq = req as MemberRequest;
    const valid = await validateBranchOwnership(memberReq.membership.businessId, branchId);
    if (!valid) {
      sendError(res, 'Chi nhánh không hợp lệ.', 403);
      return;
    }

    const userId = (req as AuthenticatedRequest).user.userId;
    const shift = await shiftsService.getActiveShift(userId, branchId);
    sendSuccess(res, shift);
  } catch {
    sendServerError(res, 'Không thể tải ca hiện tại.');
  }
}

export async function getShiftSummary(req: Request, res: Response): Promise<void> {
  try {
    const branchId = paramStr(req.params['branchId']);
    const shiftId = paramStr(req.params['shiftId']);
    const memberReq = req as MemberRequest;
    const valid = await validateBranchOwnership(memberReq.membership.businessId, branchId);
    if (!valid) {
      sendError(res, 'Chi nhánh không hợp lệ.', 403);
      return;
    }

    const result = await shiftsService.getShiftSummary(shiftId, branchId);
    if (!result) {
      sendNotFound(res, 'Ca không tồn tại.');
      return;
    }

    sendSuccess(res, result);
  } catch {
    sendServerError(res, 'Không thể tải báo cáo ca.');
  }
}

export async function getShifts(req: Request, res: Response): Promise<void> {
  try {
    const branchId = paramStr(req.params['branchId']);
    const memberReq = req as MemberRequest;
    const valid = await validateBranchOwnership(memberReq.membership.businessId, branchId);
    if (!valid) {
      sendError(res, 'Chi nhánh không hợp lệ.', 403);
      return;
    }

    // Manager can view all shifts, Staff sees only their own
    const userId =
      memberReq.membership.role === 'STAFF' ? (req as AuthenticatedRequest).user.userId : undefined;

    const shifts = await shiftsService.getShifts(branchId, userId);
    sendSuccess(res, shifts);
  } catch {
    sendServerError(res, 'Không thể tải danh sách ca.');
  }
}
