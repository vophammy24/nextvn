import type { Request, Response } from 'express';
import { sendSuccess, sendError, sendNotFound, sendServerError } from '../../lib/api-response.js';
import type { MemberRequest } from '../../middleware/membership.js';
import { validateBranchOwnership } from '../../middleware/membership.js';
import { createAreaSchema, createTableSchema, updateTableStatusSchema } from './tables.schema.js';
import * as tablesService from './tables.service.js';

function paramStr(val: string | string[] | undefined): string {
  return Array.isArray(val) ? val[0] : (val ?? '');
}

export async function getAreas(req: Request, res: Response): Promise<void> {
  try {
    const branchId = paramStr(req.params['branchId']);
    const memberReq = req as MemberRequest;
    const valid = await validateBranchOwnership(memberReq.membership.businessId, branchId);
    if (!valid) {
      sendError(res, 'Chi nhánh không hợp lệ.', 403);
      return;
    }
    const areas = await tablesService.getAreas(branchId);
    sendSuccess(res, areas);
  } catch {
    sendServerError(res, 'Không thể tải danh sách khu vực.');
  }
}

export async function createArea(req: Request, res: Response): Promise<void> {
  try {
    const branchId = paramStr(req.params['branchId']);
    const memberReq = req as MemberRequest;
    const valid = await validateBranchOwnership(memberReq.membership.businessId, branchId);
    if (!valid) {
      sendError(res, 'Chi nhánh không hợp lệ.', 403);
      return;
    }
    const parsed = createAreaSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Dữ liệu khu vực không hợp lệ.');
      return;
    }
    const area = await tablesService.createArea({ branchId, ...parsed.data });
    sendSuccess(res, area, 'Tạo khu vực thành công.', 201);
  } catch {
    sendServerError(res, 'Không thể tạo khu vực.');
  }
}

export async function getTables(req: Request, res: Response): Promise<void> {
  try {
    const branchId = paramStr(req.params['branchId']);
    const areaId = req.query['areaId'] as string | undefined;
    const memberReq = req as MemberRequest;
    const valid = await validateBranchOwnership(memberReq.membership.businessId, branchId);
    if (!valid) {
      sendError(res, 'Chi nhánh không hợp lệ.', 403);
      return;
    }
    const tables = await tablesService.getTables(branchId, areaId);
    sendSuccess(res, tables);
  } catch {
    sendServerError(res, 'Không thể tải danh sách bàn.');
  }
}

export async function createTable(req: Request, res: Response): Promise<void> {
  try {
    const branchId = paramStr(req.params['branchId']);
    const memberReq = req as MemberRequest;
    const valid = await validateBranchOwnership(memberReq.membership.businessId, branchId);
    if (!valid) {
      sendError(res, 'Chi nhánh không hợp lệ.', 403);
      return;
    }
    const parsed = createTableSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Dữ liệu bàn không hợp lệ.');
      return;
    }
    const table = await tablesService.createTable({ branchId, ...parsed.data });
    sendSuccess(res, table, 'Tạo bàn thành công.', 201);
  } catch {
    sendServerError(res, 'Không thể tạo bàn.');
  }
}

export async function updateTableStatus(req: Request, res: Response): Promise<void> {
  try {
    const branchId = paramStr(req.params['branchId']);
    const tableId = paramStr(req.params['tableId']);
    const memberReq = req as MemberRequest;
    const valid = await validateBranchOwnership(memberReq.membership.businessId, branchId);
    if (!valid) {
      sendError(res, 'Chi nhánh không hợp lệ.', 403);
      return;
    }
    const parsed = updateTableStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Trạng thái không hợp lệ.');
      return;
    }
    const table = await tablesService.updateTableStatus(tableId, branchId, parsed.data.status);
    if (!table) {
      sendNotFound(res, 'Bàn không tồn tại.');
      return;
    }
    sendSuccess(res, table, 'Cập nhật trạng thái bàn thành công.');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Không thể cập nhật bàn.';
    sendError(res, message);
  }
}

export async function getTableBill(req: Request, res: Response): Promise<void> {
  try {
    const branchId = paramStr(req.params['branchId']);
    const tableId = paramStr(req.params['tableId']);
    const memberReq = req as MemberRequest;
    const valid = await validateBranchOwnership(memberReq.membership.businessId, branchId);
    if (!valid) {
      sendError(res, 'Chi nhánh không hợp lệ.', 403);
      return;
    }
    const order = await tablesService.getTableCurrentOrder(tableId, branchId);
    sendSuccess(res, order);
  } catch {
    sendServerError(res, 'Không thể tải hóa đơn bàn.');
  }
}
