import { api } from '@/services/api';
import type {
  ApiResponse,
  MenuCategory,
  MenuItem,
  RestaurantArea,
  RestaurantTable,
  Order,
  PaginatedResponse,
  Shift,
  ShiftSummary,
} from '@/types/sales';

// For demo/development — in production these come from auth context
const BUSINESS_ID = import.meta.env['VITE_BUSINESS_ID'] || 'demo-business-id';
const BRANCH_ID = import.meta.env['VITE_BRANCH_ID'] || 'demo-branch-id';

function getBase() {
  return `/business/${BUSINESS_ID}`;
}

export function getBranchId() {
  return BRANCH_ID;
}

export function getBusinessId() {
  return BUSINESS_ID;
}

// ─── Menu ──────────────────────────────────────────

export async function fetchCategories(): Promise<MenuCategory[]> {
  const res = await api.get<ApiResponse<MenuCategory[]>>(
    `${getBase()}/menu/${BRANCH_ID}/categories`,
  );
  return res.data.data;
}

export async function fetchMenuItems(params?: {
  categoryId?: string;
  search?: string;
}): Promise<MenuItem[]> {
  const res = await api.get<ApiResponse<MenuItem[]>>(`${getBase()}/menu/${BRANCH_ID}/items`, {
    params,
  });
  return res.data.data;
}

// ─── Tables ────────────────────────────────────────

export async function fetchAreas(): Promise<RestaurantArea[]> {
  const res = await api.get<ApiResponse<RestaurantArea[]>>(
    `${getBase()}/tables/${BRANCH_ID}/areas`,
  );
  return res.data.data;
}

export async function fetchTables(areaId?: string): Promise<RestaurantTable[]> {
  const res = await api.get<ApiResponse<RestaurantTable[]>>(`${getBase()}/tables/${BRANCH_ID}`, {
    params: areaId ? { areaId } : {},
  });
  return res.data.data;
}

export async function updateTableStatus(tableId: string, status: string): Promise<RestaurantTable> {
  const res = await api.patch<ApiResponse<RestaurantTable>>(
    `${getBase()}/tables/${BRANCH_ID}/${tableId}/status`,
    { status },
  );
  return res.data.data;
}

export async function fetchTableBill(tableId: string): Promise<Order | null> {
  const res = await api.get<ApiResponse<Order | null>>(
    `${getBase()}/tables/${BRANCH_ID}/${tableId}/bill`,
  );
  return res.data.data;
}

// ─── Orders ────────────────────────────────────────

export async function createOrder(data: {
  orderType: string;
  tableId?: string | null;
  items: Array<{ menuItemId: string; quantity: number; note?: string }>;
  paymentMethod: string;
  discount?: number;
  note?: string;
}): Promise<Order> {
  const res = await api.post<ApiResponse<Order>>(`${getBase()}/orders`, {
    ...data,
    branchId: BRANCH_ID,
  });
  return res.data.data;
}

export async function fetchOrders(params?: {
  page?: number;
  limit?: number;
  status?: string;
  orderType?: string;
  today?: string;
  shiftId?: string;
}): Promise<PaginatedResponse<Order>> {
  const res = await api.get<ApiResponse<PaginatedResponse<Order>>>(
    `${getBase()}/orders/${BRANCH_ID}`,
    { params },
  );
  return res.data.data;
}

export async function fetchOrderById(orderId: string): Promise<Order> {
  const res = await api.get<ApiResponse<Order>>(`${getBase()}/orders/${BRANCH_ID}/${orderId}`);
  return res.data.data;
}

// ─── Shifts ────────────────────────────────────────

export async function startShift(): Promise<Shift> {
  const res = await api.post<ApiResponse<Shift>>(`${getBase()}/shifts/start`, {
    branchId: BRANCH_ID,
  });
  return res.data.data;
}

export async function endShift(shiftId: string): Promise<Shift> {
  const res = await api.post<ApiResponse<Shift>>(`${getBase()}/shifts/end`, {
    shiftId,
  });
  return res.data.data;
}

export async function fetchActiveShift(): Promise<Shift | null> {
  const res = await api.get<ApiResponse<Shift | null>>(`${getBase()}/shifts/${BRANCH_ID}/active`);
  return res.data.data;
}

export async function fetchShiftSummary(shiftId: string): Promise<ShiftSummary> {
  const res = await api.get<ApiResponse<ShiftSummary>>(
    `${getBase()}/shifts/${BRANCH_ID}/${shiftId}/summary`,
  );
  return res.data.data;
}

export async function fetchShifts(): Promise<Shift[]> {
  const res = await api.get<ApiResponse<Shift[]>>(`${getBase()}/shifts/${BRANCH_ID}`);
  return res.data.data;
}
