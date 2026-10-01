import type { BusinessRole } from '@/app/navigation';
export type ManagerView =
  'dashboard' | 'inventory' | 'stockTransactions' | 'recipes' | 'reports' | 'alerts' | 'staff';
export type InventoryStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NEAR_EXPIRY';
export interface Ingredient {
  id: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  minimum: number;
  expiry: string | null;
  costPerUnit: number;
}
export interface RevenueDay {
  date: string;
  revenue: number;
  orders: number;
  foodCost: number;
}
export interface HourSales {
  hour: string;
  orders: number;
  revenue: number;
}
export interface Recipe {
  id: string;
  name: string;
  category: string;
  price: number;
  ingredients: { ingredientId: string; quantity: number }[];
  modifiers: { name: string; ingredientId: string; quantity: number; priceExtra: number }[];
}
export type TransactionType = 'IN' | 'OUT' | 'ADJUST' | 'WASTE';
export interface StockTransaction {
  id: string;
  type: TransactionType;
  ingredientId: string;
  quantity: number;
  supplier: string;
  expiry: string | null;
  note: string;
  at: string;
}
export interface InventoryAlert {
  id: string;
  category: 'NEAR_EXPIRY' | 'OUT_OF_STOCK' | 'LOW_STOCK' | 'DISCREPANCY';
  ingredientId: string;
  title: string;
  detail: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  at: string;
}
export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: BusinessRole;
  shift: string;
  lastLogin: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}
export interface ManagerData {
  businessId: string;
  branchId: string;
  asOf: string;
  ingredients: Ingredient[];
  days: RevenueDay[];
  hours: HourSales[];
  recipes: Recipe[];
  bestSellers: { recipeId: string; quantity: number }[];
  transactions: StockTransaction[];
  alerts: InventoryAlert[];
  staff: StaffMember[];
}
