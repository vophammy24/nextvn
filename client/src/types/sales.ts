export interface MenuItem {
  id: string;
  branchId: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isActive: boolean;
  category?: MenuCategory;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategory {
  id: string;
  branchId: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantArea {
  id: string;
  branchId: string;
  name: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantTable {
  id: string;
  branchId: string;
  areaId: string;
  name: string;
  seats: number;
  status: TableStatus;
  area?: RestaurantArea;
  createdAt: string;
  updatedAt: string;
}

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'NEED_PAYMENT';

export interface Order {
  id: string;
  branchId: string;
  tableId: string | null;
  shiftId: string | null;
  cashierId: string;
  orderType: OrderType;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  total: number;
  note: string | null;
  items: OrderItem[];
  payments: OrderPayment[];
  createdAt: string;
  updatedAt: string;
}

export type OrderType = 'DINE_IN' | 'TAKEAWAY';
export type OrderStatus = 'OPEN' | 'CONFIRMED' | 'PAID' | 'CANCELLED';

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  total: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderPayment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  amount: number;
  createdAt: string;
}

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER';

export interface Shift {
  id: string;
  branchId: string;
  staffId: string;
  status: ShiftStatus;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ShiftStatus = 'ACTIVE' | 'CLOSED';

export interface ShiftSummary {
  shift: Shift;
  summary: {
    totalOrders: number;
    paidOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    cashReceived: number;
    bankTransferReceived: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  note?: string;
}
