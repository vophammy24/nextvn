import { isAxiosError } from 'axios';
import { api } from '@/services/api';
import type { InventoryStatus } from '@/features/manager/types';
export interface RecipeDraft {
  menuItemId: string;
  name: string;
  sellingPrice: number;
  ingredients: { ingredientId: string; quantity: number; unit: string }[];
  modifiers: {
    key: string;
    name: string;
    priceExtra: number;
    ingredients: RecipeDraft['ingredients'];
  }[];
}
export interface InventorySnapshot {
  asOf: string;
  ingredients: {
    id: string;
    name: string;
    category: string;
    unit: string;
    stock: number;
    minimum: number;
    unitCost: number;
    expiry: string | null;
    status: InventoryStatus;
  }[];
  recipes: {
    id: string;
    menuItemId: string;
    name: string;
    sellingPrice: number;
    foodCost: number;
    marginPercent: number;
    ingredients: { ingredientId: string; quantityMilli: number }[];
    modifiers: {
      key: string;
      name: string;
      priceExtra: number;
      ingredients: { ingredientId: string; quantityMilli: number }[];
    }[];
  }[];
  transactions: {
    id: string;
    type: 'IMPORT' | 'EXPORT' | 'ADJUSTMENT' | 'WASTE' | 'SALE_CONSUMPTION';
    note: string;
    supplier: string;
    createdAt: string;
    items: { ingredientId: string; quantityMilli: number }[];
  }[];
  alerts: {
    id: string;
    ingredientId: string;
    type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NEAR_EXPIRY';
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
    updatedAt: string;
  }[];
}
export async function inventoryRequest<T>(
  businessId: string,
  branchId: string,
  path = '',
  method = 'GET',
  data?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  try {
    return (
      await api.request<T>({
        url: `/business/${encodeURIComponent(businessId)}/inventory/branches/${encodeURIComponent(branchId)}${path}`,
        method,
        data,
        signal,
      })
    ).data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response?.status === 401) throw new Error('Vui lòng đăng nhập để tiếp tục.');
      if (error.response?.status === 403)
        throw new Error('Bạn không có quyền quản lý kho tại chi nhánh này.');
      if (
        [400, 404, 409, 422].includes(error.response?.status ?? 0) &&
        typeof error.response?.data?.message === 'string'
      )
        throw new Error(error.response.data.message);
    }
    throw new Error('Không thể xử lý dữ liệu kho. Vui lòng thử lại.');
  }
}
