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

// Resolve scope from the verified session, never from build-time demo IDs.
async function salesScope() {
  const { data } =
    await api.get<import('@/features/auth/workspaceContext').WorkspaceContext>('/workspace');
  if (!data.branch || !['STAFF', 'MANAGER'].includes(data.role))
    throw new Error('A sales branch assignment is required.');
  return { base: '/business/' + data.business.id, branchId: data.branch.id };
}
export async function getBusinessId() {
  return (await api.get('/workspace')).data.business.id;
}
export async function getBranchId() {
  return (await salesScope()).branchId;
}

export async function fetchCategories(): Promise<MenuCategory[]> {
  const { base, branchId } = await salesScope();
  const res = await api.get<ApiResponse<MenuCategory[]>>(`${base}/menu/${branchId}/categories`);
  return res.data.data;
}

export async function fetchMenuItems(params?: {
  categoryId?: string;
  search?: string;
}): Promise<MenuItem[]> {
  const { base, branchId } = await salesScope();
  const res = await api.get<ApiResponse<MenuItem[]>>(`${base}/menu/${branchId}/items`, {
    params,
  });
  return res.data.data;
}

// ─── Tables ────────────────────────────────────────

export async function fetchAreas(): Promise<RestaurantArea[]> {
  const { base, branchId } = await salesScope();
  const res = await api.get<ApiResponse<RestaurantArea[]>>(`${base}/tables/${branchId}/areas`);
  return res.data.data;
}

export async function fetchTables(areaId?: string): Promise<RestaurantTable[]> {
  const { base, branchId } = await salesScope();
  const res = await api.get<ApiResponse<RestaurantTable[]>>(`${base}/tables/${branchId}`, {
    params: areaId ? { areaId } : {},
  });
  return res.data.data;
}

export async function updateTableStatus(tableId: string, status: string): Promise<RestaurantTable> {
  const { base, branchId } = await salesScope();
  const res = await api.patch<ApiResponse<RestaurantTable>>(
    `${base}/tables/${branchId}/${tableId}/status`,
    { status },
  );
  return res.data.data;
}

export async function fetchTableBill(tableId: string): Promise<Order | null> {
  const { base, branchId } = await salesScope();
  const res = await api.get<ApiResponse<Order | null>>(
    `${base}/tables/${branchId}/${tableId}/bill`,
  );
  return res.data.data;
}

// ─── Orders ────────────────────────────────────────

export async function createOrder(data: {
  orderType: string;
  tableId?: string | null;
  items: Array<{ menuItemId: string; quantity: number; note?: string }>;
  paymentMethod: string;
  shiftId?: string;
  discount?: number;
  note?: string;
}): Promise<Order> {
  const { base, branchId } = await salesScope();
  const res = await api.post<ApiResponse<Order>>(`${base}/orders`, {
    ...data,
    branchId: branchId,
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
  const { base, branchId } = await salesScope();
  const res = await api.get<ApiResponse<PaginatedResponse<Order>>>(`${base}/orders/${branchId}`, {
    params,
  });
  return res.data.data;
}

export async function fetchOrderById(orderId: string): Promise<Order> {
  const { base, branchId } = await salesScope();
  const res = await api.get<ApiResponse<Order>>(`${base}/orders/${branchId}/${orderId}`);
  return res.data.data;
}

// ─── Shifts ────────────────────────────────────────

export async function startShift(): Promise<Shift> {
  const { base, branchId } = await salesScope();
  const res = await api.post<ApiResponse<Shift>>(`${base}/shifts/start`, {
    branchId: branchId,
  });
  return res.data.data;
}

export async function endShift(shiftId: string): Promise<Shift> {
  const { base } = await salesScope();
  const res = await api.post<ApiResponse<Shift>>(`${base}/shifts/end`, {
    shiftId,
  });
  return res.data.data;
}

export async function fetchActiveShift(): Promise<Shift | null> {
  const { base, branchId } = await salesScope();
  const res = await api.get<ApiResponse<Shift | null>>(`${base}/shifts/${branchId}/active`);
  return res.data.data;
}

export async function fetchShiftSummary(shiftId: string): Promise<ShiftSummary> {
  const { base, branchId } = await salesScope();
  const res = await api.get<ApiResponse<ShiftSummary>>(
    `${base}/shifts/${branchId}/${shiftId}/summary`,
  );
  return res.data.data;
}

export async function fetchShifts(): Promise<Shift[]> {
  const { base, branchId } = await salesScope();
  const res = await api.get<ApiResponse<Shift[]>>(`${base}/shifts/${branchId}`);
  return res.data.data;
}
