/**
 * Database access helpers for Sales Operations models.
 *
 * The new models (MenuCategory, MenuItem, RestaurantArea, RestaurantTable,
 * Order, OrderItem, OrderPayment, Shift) have been added to contract.prisma
 * but `prisma contract emit` has NOT been run yet.
 *
 * Once the contract is regenerated and the migration applied, these helpers
 * should be replaced with direct db.ModelName calls.
 *
 * Until then, we use the raw db client via (db as any) to access new models.
 */
import { db } from '../prisma/db.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rawDb = db as any;

export const MenuCategoryRepo = {
  findMany: (args: Record<string, unknown>) =>
    rawDb.MenuCategory?.findMany(args) ?? Promise.resolve([]),
  findFirst: (args: Record<string, unknown>) =>
    rawDb.MenuCategory?.findFirst(args) ?? Promise.resolve(null),
  create: (args: Record<string, unknown>) =>
    rawDb.MenuCategory?.create(args) ?? Promise.resolve(null),
};

export const MenuItemRepo = {
  findMany: (args: Record<string, unknown>) =>
    rawDb.MenuItem?.findMany(args) ?? Promise.resolve([]),
  findFirst: (args: Record<string, unknown>) =>
    rawDb.MenuItem?.findFirst(args) ?? Promise.resolve(null),
  create: (args: Record<string, unknown>) => rawDb.MenuItem?.create(args) ?? Promise.resolve(null),
};

export const RestaurantAreaRepo = {
  findMany: (args: Record<string, unknown>) =>
    rawDb.RestaurantArea?.findMany(args) ?? Promise.resolve([]),
  findFirst: (args: Record<string, unknown>) =>
    rawDb.RestaurantArea?.findFirst(args) ?? Promise.resolve(null),
  create: (args: Record<string, unknown>) =>
    rawDb.RestaurantArea?.create(args) ?? Promise.resolve(null),
};

export const RestaurantTableRepo = {
  findMany: (args: Record<string, unknown>) =>
    rawDb.RestaurantTable?.findMany(args) ?? Promise.resolve([]),
  findFirst: (args: Record<string, unknown>) =>
    rawDb.RestaurantTable?.findFirst(args) ?? Promise.resolve(null),
  create: (args: Record<string, unknown>) =>
    rawDb.RestaurantTable?.create(args) ?? Promise.resolve(null),
  update: (args: Record<string, unknown>) =>
    rawDb.RestaurantTable?.update(args) ?? Promise.resolve(null),
};

export const OrderRepo = {
  findMany: (args: Record<string, unknown>) => rawDb.Order?.findMany(args) ?? Promise.resolve([]),
  findFirst: (args: Record<string, unknown>) =>
    rawDb.Order?.findFirst(args) ?? Promise.resolve(null),
  create: (args: Record<string, unknown>) => rawDb.Order?.create(args) ?? Promise.resolve(null),
  update: (args: Record<string, unknown>) => rawDb.Order?.update(args) ?? Promise.resolve(null),
};

export const OrderItemRepo = {
  create: (args: Record<string, unknown>) => rawDb.OrderItem?.create(args) ?? Promise.resolve(null),
};

export const OrderPaymentRepo = {
  create: (args: Record<string, unknown>) =>
    rawDb.OrderPayment?.create(args) ?? Promise.resolve(null),
};

export const ShiftRepo = {
  findMany: (args: Record<string, unknown>) => rawDb.Shift?.findMany(args) ?? Promise.resolve([]),
  findFirst: (args: Record<string, unknown>) =>
    rawDb.Shift?.findFirst(args) ?? Promise.resolve(null),
  create: (args: Record<string, unknown>) => rawDb.Shift?.create(args) ?? Promise.resolve(null),
  update: (args: Record<string, unknown>) => rawDb.Shift?.update(args) ?? Promise.resolve(null),
};
