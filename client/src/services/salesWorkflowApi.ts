import { api } from '@/services/api';
import type { Order, PaginatedResponse, RestaurantArea } from '@/types/sales';

export type ServiceType = 'TAKEAWAY' | 'DINE_IN' | 'BOTH';
export type CounterPolicy = 'IMMEDIATE_ONLY' | 'PAY_LATER_ALLOWED' | 'STAFF_CHOICE';
export type DineInMode = 'COUNTER_ONLY' | 'TABLE_ONLY' | 'BOTH';
export interface SalesSettings {
  serviceType: ServiceType;
  counterPaymentPolicy: CounterPolicy;
  dineInOrderingMode: DineInMode;
}
export interface SalesModifier {
  key: string;
  name: string;
  priceExtra: number;
}
export interface SalesProduct {
  id: string;
  name: string;
  price: number;
  description: string | null;
  imageUrl: string | null;
  categoryId: string;
  categoryName?: string;
  modifiers: SalesModifier[];
}
export interface SalesTable {
  id: string;
  branchId: string;
  areaId: string;
  name: string;
  seats: number;
  isActive: boolean;
  effectiveStatus: 'AVAILABLE' | 'OCCUPIED' | 'DISABLED' | 'RESERVED' | 'CLEANING';
  currentOrder: { id: string; total: number; createdAt: string } | null;
  inconsistent: boolean;
}
export type SalesArea = RestaurantArea & { isActive: boolean };
export type SalesOrder = Omit<Order, 'items'> & {
  orderingMode: 'COUNTER' | 'TABLE' | null;
  revision: number;
  requestKey: string | null;
  items: (Order['items'][number] & { modifierKeys: string[] | null })[];
};
export interface SalesLine {
  menuItemId: string;
  quantity: number;
  note: string;
  modifierKeys: string[];
}
export interface SalesOrderInput {
  requestKey: string;
  branchId: string;
  orderType: 'TAKEAWAY' | 'DINE_IN';
  orderingMode: 'COUNTER' | 'TABLE';
  paymentTiming: 'NOW' | 'LATER';
  tableId: string | null;
  items: SalesLine[];
  note: string;
  discount: number;
}
export interface LiveShiftSummary {
  shift: { id: string; status: string; startedAt: string; staffId: string };
  summary: {
    totalOrders: number;
    paidOrders: number;
    unpaidOrders: number;
    cancelledOrders: number;
    collectedRevenue: number;
    cashReceived: number;
    bankTransferReceived: number;
    occupiedTables: number;
  };
  recentTransactions: {
    orderId: string;
    method: 'CASH' | 'BANK_TRANSFER';
    amount: number;
    createdAt: string;
  }[];
}
export async function currentSalesBranchId(): Promise<string> {
  const { data } =
    await api.get<import('@/features/auth/workspaceContext').WorkspaceContext>('/workspace');
  if (!data.branch?.id) throw new Error('Chưa chọn chi nhánh bán hàng.');
  return data.branch.id;
}

async function base(branchId?: string) {
  const { data } =
    await api.get<import('@/features/auth/workspaceContext').WorkspaceContext>('/workspace');
  if (!data.business?.id) throw new Error('Chưa chọn doanh nghiệp.');
  const branch = branchId ?? data.branch?.id;
  if (!branch) throw new Error('Chưa chọn chi nhánh.');
  return `/business/${encodeURIComponent(data.business.id)}/sales/${encodeURIComponent(branch)}`;
}
async function get<T>(branchId: string | undefined, path: string): Promise<T> {
  return (await api.get<{ data: T }>(`${await base(branchId)}${path}`)).data.data;
}
async function send<T>(
  branchId: string | undefined,
  path: string,
  method: 'POST' | 'PUT' | 'PATCH',
  body: unknown,
): Promise<T> {
  return (
    await api.request<{ data: T }>({ url: `${await base(branchId)}${path}`, method, data: body })
  ).data.data;
}

export const fetchSalesSettings = (branchId?: string) => get<SalesSettings>(branchId, '/settings');
export const updateSalesSettings = (branchId: string, settings: SalesSettings) =>
  send<SalesSettings>(branchId, '/settings', 'PUT', settings);
export const fetchSalesCatalog = () => get<SalesProduct[]>(undefined, '/catalog');
export const fetchSalesTables = (branchId?: string) => get<SalesTable[]>(branchId, '/tables');
export const fetchSalesAreas = (branchId?: string) => get<SalesArea[]>(branchId, '/areas');
export const createSalesArea = (name: string, branchId?: string) =>
  send<RestaurantArea>(branchId, '/areas', 'POST', { name });
export const updateSalesArea = (
  id: string,
  body: { name?: string; isActive?: boolean },
  branchId?: string,
) => send<RestaurantArea>(branchId, `/areas/${id}`, 'PATCH', body);
export const createSalesTable = (
  body: { areaId: string; name: string; seats: number },
  branchId?: string,
) => send<SalesTable>(branchId, '/tables', 'POST', body);
export const updateSalesTable = (
  id: string,
  body: { name?: string; areaId?: string; seats?: number; isActive?: boolean },
  branchId?: string,
) => send<SalesTable>(branchId, `/tables/${id}`, 'PATCH', body);
export const createSalesOrder = (body: SalesOrderInput) =>
  send<SalesOrder>(body.branchId, '/orders', 'POST', body);
export const checkoutSalesOrder = (
  body: SalesOrderInput,
  method: 'CASH' | 'BANK_TRANSFER',
  expectedTotal: number,
) =>
  send<SalesOrder>(body.branchId, '/checkout', 'POST', {
    ...body,
    method,
    confirmed: true,
    expectedTotal,
  });
export const fetchSalesOrders = (
  status: 'OPEN' | 'PAID' | 'CANCELLED',
  page = 1,
  search = '',
  dateFrom = '',
  dateTo = '',
) =>
  get<PaginatedResponse<SalesOrder>>(
    undefined,
    `/orders?status=${status}&page=${page}&limit=20&q=${encodeURIComponent(search)}${dateFrom ? `&dateFrom=${dateFrom}` : ''}${dateTo ? `&dateTo=${dateTo}` : ''}`,
  );
export const fetchSalesOrder = (id: string) => get<SalesOrder>(undefined, `/orders/${id}`);
export const fetchSalesOrderByRequestKey = (key: string) =>
  get<SalesOrder>(undefined, `/orders/request/${key}`);
export const editSalesOrder = (
  id: string,
  body: { revision: number; items: SalesLine[]; note: string; discount: number },
) => send<SalesOrder>(undefined, `/orders/${id}`, 'PATCH', body);
export const paySalesOrder = (id: string, method: 'CASH' | 'BANK_TRANSFER') =>
  send<SalesOrder>(undefined, `/orders/${id}/pay`, 'POST', { method, confirmed: true });
export const cancelSalesOrder = (id: string) =>
  send<SalesOrder>(undefined, `/orders/${id}/cancel`, 'POST', {});
export const transferSalesOrder = (id: string, tableId: string) =>
  send<SalesOrder>(undefined, `/orders/${id}/transfer`, 'POST', { tableId });
export const fetchLiveShiftSummary = (id: string) =>
  get<LiveShiftSummary>(undefined, `/shifts/${id}/summary`);
