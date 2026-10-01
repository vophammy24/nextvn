import { AsyncLocalStorage } from 'node:async_hooks';
import { db } from '../prisma/db.js';

// Keep the sales repository contract while using Prisma 8's actual query API.
// A request-local transaction also lets sales and inventory commit atomically.
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const salesTransaction = new AsyncLocalStorage<Transaction>();
export const salesDatabase = () => salesTransaction.getStore() ?? db;
export async function atomicSale<T>(run: () => Promise<T>): Promise<T> {
  if (salesTransaction.getStore()) return run();
  return db.transaction((tx) => salesTransaction.run(tx, run));
}
function repository(name: string) {
  const model = () => (salesDatabase().orm.public as any)[name];
  const query = (args: any) => {
    let q = model().where(args.where ?? {});
    for (const [relation, enabled] of Object.entries(args.include ?? {})) {
      if (enabled) q = q.include(relation);
    }
    for (const [column, direction] of Object.entries(args.orderBy ?? {})) {
      q = q.orderBy((row: any) => row[column][direction === 'desc' ? 'desc' : 'asc']());
    }
    return q;
  };
  return {
    findMany: (args: any): Promise<any[]> => query(args).all(),
    findFirst: (args: any): Promise<any> => query(args).first(),
    create: (args: any): Promise<any> => model().create(args.data),
    update: async (args: any): Promise<any> => {
      await model().where(args.where).update(args.data);
      return model().where(args.where).first();
    },
  };
}
export const MenuCategoryRepo = repository('MenuCategory');
export const MenuItemRepo = repository('MenuItem');
export const RestaurantAreaRepo = repository('RestaurantArea');
export const RestaurantTableRepo = repository('RestaurantTable');
export const OrderRepo = repository('Order');
export const OrderItemRepo = repository('OrderItem');
export const OrderPaymentRepo = repository('OrderPayment');
export const ShiftRepo = repository('Shift');
