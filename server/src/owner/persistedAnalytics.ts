import { db } from '../prisma/db.js';
import { InventoryService } from '../inventory/service.js';
import { PrismaInventoryStore } from '../inventory/prisma-store.js';
import type { Principal } from '../inventory/domain.js';
import { calculateMenuProfit, type AnalyticsPeriod } from './analyticsReaders.js';
const days = { week: 7, month: 30, quarter: 90 };
export interface SalesRow {
  createdAt: string;
  total: number;
  items: { menuItemId: string; name: string; quantity: number; total: number }[];
}
export function aggregateSales(orders: SalesRow[]) {
  const byItem = new Map<
    string,
    { itemId: string; name: string; quantity: number; revenueVnd: number }
  >();
  const dates = new Map<string, number>(),
    hours = new Map<string, number>();
  for (const order of orders) {
    const date = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).format(
      new Date(order.createdAt),
    );
    const hour =
      new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        hourCycle: 'h23',
        timeZone: 'Asia/Ho_Chi_Minh',
      }).format(new Date(order.createdAt)) + ':00';
    dates.set(date, (dates.get(date) ?? 0) + order.total);
    hours.set(hour, (hours.get(hour) ?? 0) + 1);
    const subtotal = order.items.reduce((sum, i) => sum + i.total, 0);
    for (const item of order.items) {
      const row = byItem.get(item.menuItemId) ?? {
        itemId: item.menuItemId,
        name: item.name,
        quantity: 0,
        revenueVnd: 0,
      };
      row.quantity += item.quantity;
      row.revenueVnd += subtotal > 0 ? (item.total / subtotal) * order.total : 0;
      byItem.set(item.menuItemId, row);
    }
  }
  const revenueVnd = orders.reduce((sum, o) => sum + o.total, 0);
  return {
    revenueVnd,
    orderCount: orders.length,
    averageOrderVnd: orders.length ? Math.round(revenueVnd / orders.length) : 0,
    bestWindow:
      [...hours].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ??
      'Chưa có dữ liệu',
    trend: [...dates].map(([label, value]) => ({ label, value })),
    categories: [],
    topItems: [...byItem.values()].sort((a, b) => b.revenueVnd - a.revenueVnd),
    peakHours: [...hours].sort().map(([label, value]) => ({ label, value })),
  };
}
export const inventoryAnalytics = new InventoryService(new PrismaInventoryStore());
export async function salesAnalytics(businessId: string, period: AnalyticsPeriod) {
  const start = Date.now() - days[period] * 86400000;
  const branches = await db.orm.public.Branch.where({ businessId }).select('id').all();
  const orders: SalesRow[] = [];
  for (const branch of branches) {
    const rows = await db.orm.public.Order.where({ branchId: branch.id, status: 'PAID' })
      .include('items')
      .all();
    orders.push(
      ...rows.filter(
        (o) => Date.parse(o.createdAt) >= start && Date.parse(o.createdAt) <= Date.now(),
      ),
    );
  }
  return aggregateSales(orders.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
}
export async function menuProfit(principal: Principal, period: AnalyticsPeriod) {
  const sales = await salesAnalytics(principal.businessId, period);
  if (!sales.topItems.length) return [];
  const recipes = await inventoryAnalytics.ownerRecipeCosts(principal);
  return calculateMenuProfit(
    sales.topItems,
    sales.topItems.flatMap((i) => {
      const r = recipes.find((r) => r.menuItemId === i.itemId);
      return r ? [{ itemId: i.itemId, ingredientCostVnd: r.foodCost * i.quantity }] : [];
    }),
  );
}
