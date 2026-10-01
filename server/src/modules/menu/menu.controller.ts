import type { Request, Response } from 'express';
import { sendSuccess, sendError, sendNotFound, sendServerError } from '../../lib/api-response.js';
import type { MemberRequest } from '../../middleware/membership.js';
import { validateBranchOwnership } from '../../middleware/membership.js';
import { menuCategorySchema, menuItemSchema, menuQuerySchema } from './menu.schema.js';
import * as menuService from './menu.service.js';

function paramStr(val: string | string[] | undefined): string {
  return Array.isArray(val) ? val[0] : (val ?? '');
}

export async function getCategories(req: Request, res: Response): Promise<void> {
  try {
    const branchId = paramStr(req.params['branchId']);
    const memberReq = req as MemberRequest;
    const valid = await validateBranchOwnership(memberReq.membership.businessId, branchId);
    if (!valid) {
      sendError(res, 'Chi nhánh không hợp lệ.', 403);
      return;
    }
    const categories = await menuService.getCategories(branchId);
    sendSuccess(res, categories);
  } catch {
    sendServerError(res, 'Không thể tải danh mục.');
  }
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  try {
    const branchId = paramStr(req.params['branchId']);
    const memberReq = req as MemberRequest;
    const valid = await validateBranchOwnership(memberReq.membership.businessId, branchId);
    if (!valid) {
      sendError(res, 'Chi nhánh không hợp lệ.', 403);
      return;
    }
    const parsed = menuCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Dữ liệu danh mục không hợp lệ.');
      return;
    }
    const category = await menuService.createCategory({
      branchId,
      ...parsed.data,
    });
    sendSuccess(res, category, 'Tạo danh mục thành công.', 201);
  } catch {
    sendServerError(res, 'Không thể tạo danh mục.');
  }
}

export async function getMenuItems(req: Request, res: Response): Promise<void> {
  try {
    const branchId = paramStr(req.params['branchId']);
    const memberReq = req as MemberRequest;
    const valid = await validateBranchOwnership(memberReq.membership.businessId, branchId);
    if (!valid) {
      sendError(res, 'Chi nhánh không hợp lệ.', 403);
      return;
    }
    const query = menuQuerySchema.safeParse(req.query);
    const items = await menuService.getMenuItems({
      branchId,
      categoryId: query.success ? query.data.categoryId : undefined,
      search: query.success ? query.data.search : undefined,
      activeOnly: query.success ? query.data.activeOnly : true,
    });
    sendSuccess(res, items);
  } catch {
    sendServerError(res, 'Không thể tải thực đơn.');
  }
}

export async function createMenuItem(req: Request, res: Response): Promise<void> {
  try {
    const branchId = paramStr(req.params['branchId']);
    const memberReq = req as MemberRequest;
    const valid = await validateBranchOwnership(memberReq.membership.businessId, branchId);
    if (!valid) {
      sendError(res, 'Chi nhánh không hợp lệ.', 403);
      return;
    }
    const parsed = menuItemSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Dữ liệu món không hợp lệ.');
      return;
    }
    const category = await menuService.getCategoryById(parsed.data.categoryId, branchId);
    if (!category) {
      sendNotFound(res, 'Danh mục không tồn tại.');
      return;
    }
    const item = await menuService.createMenuItem({
      branchId,
      ...parsed.data,
    });
    sendSuccess(res, item, 'Tạo món thành công.', 201);
  } catch {
    sendServerError(res, 'Không thể tạo món.');
  }
}
