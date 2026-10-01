import type { Response } from 'express';

export interface ApiSuccess<T = unknown> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

export function sendSuccess<T>(res: Response, data: T, message?: string, status = 200): void {
  const body: ApiSuccess<T> = { success: true, data };
  if (message) body.message = message;
  res.status(status).json(body);
}

export function sendError(res: Response, message: string, status = 400): void {
  const body: ApiError = { success: false, message };
  res.status(status).json(body);
}

export function sendNotFound(res: Response, message = 'Không tìm thấy.'): void {
  sendError(res, message, 404);
}

export function sendForbidden(res: Response, message = 'Không có quyền truy cập.'): void {
  sendError(res, message, 403);
}

export function sendUnauthorized(res: Response, message = 'Chưa đăng nhập.'): void {
  sendError(res, message, 401);
}

export function sendServerError(res: Response, message = 'Lỗi hệ thống.'): void {
  sendError(res, message, 500);
}
