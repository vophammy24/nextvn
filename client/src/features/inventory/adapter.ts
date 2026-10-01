import type { InventorySnapshot } from './api';
import type { ManagerData } from '@/features/manager/types';
import { alertLabels } from '@/features/manager/model';
export function adaptInventory(
  snapshot: InventorySnapshot,
  businessId: string,
  branchId: string,
): ManagerData {
  const types = {
    IMPORT: 'IN',
    EXPORT: 'OUT',
    ADJUSTMENT: 'ADJUST',
    WASTE: 'WASTE',
    SALE_CONSUMPTION: 'SALE',
  } as const;
  return {
    businessId,
    branchId,
    asOf: snapshot.asOf,
    days: [],
    hours: [],
    bestSellers: [],
    staff: [],
    ingredients: snapshot.ingredients.map((i) => ({ ...i, costPerUnit: i.unitCost })),
    recipes: snapshot.recipes.map((r) => ({
      ...r,
      category: '',
      price: r.sellingPrice,
      ingredients: r.ingredients.map((p) => ({
        ingredientId: p.ingredientId,
        quantity: p.quantityMilli / 1000,
      })),
      modifiers: r.modifiers.flatMap((m) =>
        m.ingredients.map((p) => ({
          name: m.name,
          ingredientId: p.ingredientId,
          quantity: p.quantityMilli / 1000,
          priceExtra: m.priceExtra,
        })),
      ),
    })),
    transactions: snapshot.transactions.flatMap((t) =>
      t.items.map((p, index) => ({
        id: `${t.id}:${index}`,
        type: types[t.type],
        ingredientId: p.ingredientId,
        quantity: p.quantityMilli / 1000,
        note: t.note,
        supplier: t.supplier,
        expiry: null,
        at: t.createdAt,
      })),
    ),
    alerts: snapshot.alerts.map((a) => ({
      ...a,
      category: a.type,
      title: `${alertLabels[a.type]} · ${snapshot.ingredients.find((i) => i.id === a.ingredientId)?.name ?? 'Nguyên liệu'}`,
      detail:
        a.type === 'NEAR_EXPIRY'
          ? 'Có lô còn tồn đã hết hạn hoặc sẽ hết hạn trong 3 ngày. Kiểm tra hạn sử dụng trước khi dùng.'
          : 'Mức tồn kho cần được kiểm tra và bổ sung nếu phù hợp.',
      at: a.updatedAt,
    })),
  };
}
