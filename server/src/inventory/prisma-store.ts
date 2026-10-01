import { db } from '../prisma/db.js';
import { randomUUID } from 'node:crypto';
import {
  fail,
  type InventoryState,
  type InventoryStore,
  type Modifier,
  type Scope,
  type StockItem,
} from './domain.js';
type Database = typeof db;
export class PrismaInventoryStore implements InventoryStore {
  constructor(private database: Database = db) {}
  async branches(businessId: string) {
    return this.database.orm.public.Branch.where({ businessId, isActive: true })
      .select('id', 'name')
      .all();
  }
  async transaction<T>(scope: Scope, run: (state: InventoryState) => Promise<T> | T): Promise<T> {
    return this.database.transaction(async (tx) => {
      // Serialize all inventory changes in one branch, including the first import.
      // The lock and the domain reads/writes use the SAME PostgreSQL transaction.
      const locked = await tx.query(
        this.database.raw
          .sql`SELECT id FROM public."Branch" WHERE id = ${scope.branchId}::uuid AND "businessId" = ${scope.businessId}::uuid AND "isActive" = true FOR UPDATE`
          .returnsRow({ id: 'pg/uuid@1' })
          .build(),
      );
      if (!locked.length)
        fail('BRANCH_NOT_FOUND', 'Chi nhánh không tồn tại hoặc không hoạt động.', 404);
      const orm = tx.orm.public;
      const ingredients = await orm.Ingredient.where(scope)
        .include('balance')
        .include('lots')
        .all();
      const balances = ingredients.map((i) => {
        if (!i.balance) fail('INVENTORY_INCONSISTENT', 'Dữ liệu tồn kho cần được kiểm tra.', 409);
        return i.balance!;
      });
      const lots = ingredients.flatMap((i) => i.lots);
      const recipes = await orm.Recipe.where(scope).include('ingredients').all();
      const recipeParts = recipes.flatMap((r) => r.ingredients);
      const transactions = await orm.StockTransaction.where(scope).all();
      const alerts = await orm.InventoryAlert.where(scope).all();
      const state: InventoryState = {
        ingredients: ingredients.map((i) => {
          const balance = balances.find((b) => b.ingredientId === i.id)!;
          return {
            id: i.id,
            name: i.name,
            category: i.category,
            unit: i.unit,
            quantityMilli: balance.quantityMilli,
            minimumMilli: balance.minimumMilli,
            unitCost: balance.unitCost,
          };
        }),
        lots: lots.map((l) => ({ ...l })),
        recipes: recipes.map((r) => ({
          id: r.id,
          menuItemId: r.menuItemId,
          name: r.name,
          sellingPrice: r.sellingPrice,
          version: r.version,
          ingredients: recipeParts
            .filter((p) => p.recipeId === r.id && p.modifierKey === '')
            .map((p) => ({ ingredientId: p.ingredientId, quantityMilli: p.quantityMilli })),
          modifiers: (r.modifiers as unknown as Omit<Modifier, 'ingredients'>[]).map((m) => ({
            ...m,
            ingredients: recipeParts
              .filter((p) => p.recipeId === r.id && p.modifierKey === m.key)
              .map((p) => ({ ingredientId: p.ingredientId, quantityMilli: p.quantityMilli })),
          })),
        })),
        transactions: transactions.map((t) => ({ ...t, items: t.items as unknown as StockItem[] })),
        alerts: alerts.map((a) => ({ ...a })),
      };
      const before = structuredClone(state);
      const result = await run(state);
      const changed = <R extends { id: string }>(rows: R[], original: R[]) =>
        rows.filter(
          (r) => JSON.stringify(r) !== JSON.stringify(original.find((o) => o.id === r.id)),
        );
      for (const i of changed(state.ingredients, before.ingredients)) {
        const metadata = { name: i.name, category: i.category, unit: i.unit };
        const balance = {
          quantityMilli: i.quantityMilli,
          minimumMilli: i.minimumMilli,
          unitCost: i.unitCost,
        };
        if (before.ingredients.some((o) => o.id === i.id)) {
          await orm.Ingredient.where({ id: i.id }).update(metadata);
          await orm.InventoryBalance.where({ ingredientId: i.id }).update(balance);
        } else {
          await orm.Ingredient.create({ id: i.id, ...scope, ...metadata });
          await orm.InventoryBalance.create({ id: randomUUID(), ingredientId: i.id, ...balance });
        }
      }
      for (const l of changed(state.lots, before.lots)) {
        if (before.lots.some((o) => o.id === l.id))
          await orm.InventoryLot.where({ id: l.id }).update({ quantityMilli: l.quantityMilli });
        else await orm.InventoryLot.create(l);
      }
      for (const r of changed(state.recipes, before.recipes)) {
        const metadata = {
          menuItemId: r.menuItemId,
          name: r.name,
          sellingPrice: r.sellingPrice,
          version: r.version,
          modifiers: r.modifiers.map((m) => ({
            key: m.key,
            name: m.name,
            priceExtra: m.priceExtra,
          })),
        };
        if (before.recipes.some((o) => o.id === r.id)) {
          await orm.Recipe.where({ id: r.id }).update(metadata);
          await orm.RecipeIngredient.where({ recipeId: r.id }).delete();
        } else await orm.Recipe.create({ id: r.id, ...scope, ...metadata });
        for (const p of r.ingredients)
          await orm.RecipeIngredient.create({
            id: randomUUID(),
            recipeId: r.id,
            ...p,
            modifierKey: '',
          });
        for (const m of r.modifiers)
          for (const p of m.ingredients)
            await orm.RecipeIngredient.create({
              id: randomUUID(),
              recipeId: r.id,
              ...p,
              modifierKey: m.key,
            });
      }
      // Append only: never overwrite or delete an audit transaction.
      for (const t of state.transactions.filter(
        (t) => !before.transactions.some((o) => o.id === t.id),
      ))
        await orm.StockTransaction.create({
          ...t,
          ...scope,
          items: JSON.parse(JSON.stringify(t.items)),
        });
      for (const a of changed(state.alerts, before.alerts)) {
        if (before.alerts.some((o) => o.id === a.id))
          await orm.InventoryAlert.where({ id: a.id }).update({
            status: a.status,
            conditionActive: a.conditionActive,
            updatedAt: a.updatedAt,
          });
        else await orm.InventoryAlert.create({ ...a, ...scope });
      }
      return result;
    });
  }
}
