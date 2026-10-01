import type { BusinessRole } from '@/app/navigation';
import type { Status } from '@/locales/vi';
export interface Branch {
  id: string;
  name: string;
  location: string;
  status: 'ACTIVE' | 'INACTIVE';
  manager: string;
}
export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
}
export interface Sale {
  date: string;
  branchId: string;
  itemId: string;
  quantity: number;
  orders: number;
  hour: string;
}
export interface Stock {
  id: string;
  ingredientId: string;
  branchId: string;
  name: string;
  unit: string;
  quantity: number;
  minimum: number;
  unitCost: number;
  expiry: string;
  consumed: number;
  status: Extract<Status, 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NEAR_EXPIRY'>;
}
export interface BusinessUser {
  id: string;
  name: string;
  email: string;
  role: BusinessRole;
  branchId: string;
  lastActive: string;
  status: 'ACTIVE' | 'INACTIVE';
}
export interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  branches: number;
  users: number;
  features: string[];
}
export interface Promotion {
  id: string;
  title: string;
  priority: string;
  reason: string;
  items: string;
  benefit: string;
  action: string;
}
export interface OwnerData {
  businessId: string;
  asOf: string;
  branches: Branch[];
  menu: MenuItem[];
  sales: Sale[];
  stock: Stock[];
  users: BusinessUser[];
  promotions: Promotion[];
  subscription: {
    planId: string;
    renewal: string;
    plans: Plan[];
    invoices: { id: string; date: string; amount: number; status: 'PAID' }[];
  };
  settings: {
    name: string;
    email: string;
    phone: string;
    address: string;
    taxCode: string;
    tax: number;
    fee: number;
    invoicePrefix: string;
    invoiceFooter: string;
    stockNotice: boolean;
    revenueNotice: boolean;
    billingNotice: boolean;
  };
}
export type Period = 'week' | 'month' | 'quarter';
