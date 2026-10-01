import type { Status } from '@/locales/vi';
export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  sizes: { name: string; extra: number }[];
}
export interface CartLine {
  key: string;
  item: MenuItem;
  size: string;
  unitPrice: number;
  quantity: number;
  note: string;
}
export interface DiningTable {
  id: string;
  name: string;
  area: string;
  seats: number;
  status: Extract<Status, 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'NEED_PAYMENT'>;
  guests?: number;
  openedAt?: string;
  billId?: string;
  lines: { name: string; quantity: number; price: number }[];
}
export interface Order {
  id: string;
  at: string;
  cashier: string;
  type: string;
  table: string;
  total: number;
  status: 'PAID' | 'CANCELLED';
  payment: 'CASH' | 'BANK';
  shiftId: string;
  branchId: string;
  cashierId: string;
}
export interface OperationsData {
  businessId: string;
  branchId: string;
  menu: MenuItem[];
  tables: DiningTable[];
  orders: Order[];
  shift: { id: string; start: string; asOf: string; status: string };
}
