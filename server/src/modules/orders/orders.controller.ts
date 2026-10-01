import type { Request, Response } from 'express';
import { sendSuccess, sendError, sendNotFound, sendServerError } from '../../lib/api-response.js';
import type { MemberRequest } from '../../middleware/membership.js';
import { validateBranchOwnership } from '../../middleware/membership.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { createOrderSchema, updateOrderStatusSchema, orderQuerySchema } from './orders.schema.js';
import * as ordersService from './orders.service.js';

function paramStr(val: string | string[] | undefined): string {
  return Array.isArray(val) ? val[0] : (val ?? '');
}

export async function createOrder(req: Request, res: Response): Promise<void> {
  try {
    const memberReq = req as MemberRequest;
    const parsed = createOrderSchema.safeParse(req.body);

    if (!parsed.success) {
      sendError(res, 'Dữ liệu đơn hàng không hợp lệ.');
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

    const order = await ordersService.createOrder({
      ...parsed.data,
      cashierId: (req as AuthenticatedRequest).user.userId,
      tableId: parsed.data.tableId ?? null,
    });

    sendSuccess(res, order, 'Tạo đơn hàng thành công.', 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Không thể tạo đơn hàng.';
    sendError(res, message);
  }
}

export async function getOrders(req: Request, res: Response): Promise<void> {
  try {
    const branchId = paramStr(req.params['branchId']);
    const memberReq = req as MemberRequest;

    const valid = await validateBranchOwnership(memberReq.membership.businessId, branchId);
    if (!valid) {
      sendError(res, 'Chi nhánh không hợp lệ.', 403);
      return;
    }

    const query = orderQuerySchema.safeParse(req.query);
    const filters = query.success ? query.data : { page: 1, limit: 20 };

    const result = await ordersService.getOrders({
      branchId,
      ...filters,
    });

    sendSuccess(res, result);
  } catch {
    sendServerError(res, 'Không thể tải danh sách đơn hàng.');
  }
}

export async function getOrderById(req: Request, res: Response): Promise<void> {
  try {
    const branchId = paramStr(req.params['branchId']);
    const orderId = paramStr(req.params['orderId']);
    const memberReq = req as MemberRequest;

    const valid = await validateBranchOwnership(memberReq.membership.businessId, branchId);
    if (!valid) {
      sendError(res, 'Chi nhánh không hợp lệ.', 403);
      return;
    }

    const order = await ordersService.getOrderById(orderId, branchId);
    if (!order) {
      sendNotFound(res, 'Đơn hàng không tồn tại.');
      return;
    }

    sendSuccess(res, order);
  } catch {
    sendServerError(res, 'Không thể tải đơn hàng.');
  }
}

export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  try {
    const branchId = paramStr(req.params['branchId']);
    const orderId = paramStr(req.params['orderId']);
    const memberReq = req as MemberRequest;

    const valid = await validateBranchOwnership(memberReq.membership.businessId, branchId);
    if (!valid) {
      sendError(res, 'Chi nhánh không hợp lệ.', 403);
      return;
    }

    const parsed = updateOrderStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Trạng thái không hợp lệ.');
      return;
    }

    const order = await ordersService.updateOrderStatus(
      orderId,
      branchId,
      parsed.data.status,
      parsed.data.paymentMethod,
    );
    if (!order) {
      sendNotFound(res, 'Đơn hàng không tồn tại.');
      return;
    }

    sendSuccess(res, order, 'Cập nhật trạng thái thành công.');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Không thể cập nhật đơn hàng.';
    sendError(res, message);
  }
}
