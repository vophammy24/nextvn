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
  async recipeCatalog(scope: Scope) {
    const branch = await this.database.orm.public.Branch.where({
      id: scope.branchId,
      businessId: scope.businessId,
      isActive: true,
    })
      .select('name')
      .first();
    if (!branch) fail('BRANCH_NOT_FOUND', 'Chi nhánh không tồn tại hoặc không hoạt động.', 404);
    const orm = this.database.orm.public;
    const categories = await orm.MenuCategory.where({ branchId: scope.branchId })
      .select('id', 'name', 'isActive')
      .all();
    const items = await orm.MenuItem.where({ branchId: scope.branchId })
      .select('id', 'name', 'price', 'categoryId', 'description', 'isActive')
      .all();
    const recipes = await orm.Recipe.where(scope).select('id', 'menuItemId').all();
    const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
    const recipeIds = new Map(recipes.map((recipe) => [recipe.menuItemId, recipe.id]));
    return {
      branchName: branch!.name,
      categories,
      menuItems: items.map((item) => ({
        ...item,
        categoryName: categoryNames.get(item.categoryId) ?? '',
        recipeId: recipeIds.get(item.id) ?? null,
      })),
    };
  }
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
      ingredients.forEach((i) => {
        if (!i.balance) fail('INVENTORY_INCONSISTENT', 'Dữ liệu tồn kho cần được kiểm tra.', 409);
      });
      const lots = ingredients.flatMap((i) => i.lots);
      const recipes = await orm.Recipe.where(scope).include('ingredients').all();
      const transactions = await orm.StockTransaction.where(scope).all();
      const alerts = await orm.InventoryAlert.where(scope).all();
      const state: InventoryState = {
        menuItems: await orm.MenuItem.where({ branchId: scope.branchId })
          .select('id', 'name', 'price', 'isActive', 'categoryId', 'description')
          .all(),
        menuCategories: await orm.MenuCategory.where({ branchId: scope.branchId })
          .select('id', 'name', 'isActive', 'displayOrder')
          .all(),
        ingredients: ingredients.map((i) => {
          const balance = i.balance!;
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
          ingredients: r.ingredients
            .filter((p) => p.recipeId === r.id && p.modifierKey === '')
            .map((p) => ({ ingredientId: p.ingredientId, quantityMilli: p.quantityMilli })),
          modifiers: (r.modifiers as unknown as Omit<Modifier, 'ingredients'>[]).map((m) => ({
            ...m,
            ingredients: r.ingredients
              .filter((p) => p.recipeId === r.id && p.modifierKey === m.key)
              .map((p) => ({ ingredientId: p.ingredientId, quantityMilli: p.quantityMilli })),
          })),
        })),
        transactions: transactions.map((t) => ({ ...t, items: t.items as unknown as StockItem[] })),
        alerts: alerts.map((a) => ({ ...a })),
      };
      const before = structuredClone(state);
      const result = await run(state);
      for (const category of (state.menuCategories ?? []).filter(
        (item) => !(before.menuCategories ?? []).some((old) => old.id === item.id),
      ))
        await orm.MenuCategory.create({ ...category, branchId: scope.branchId });
      for (const item of state.menuItems.filter(
        (menu) => !before.menuItems.some((old) => old.id === menu.id),
      )) {
        if (!item.categoryId) fail('CATEGORY_REQUIRED', 'Món cần danh mục hợp lệ.');
        await orm.MenuItem.create({
          id: item.id,
          branchId: scope.branchId,
          categoryId: item.categoryId,
          name: item.name,
          price: item.price,
          description: item.description ?? null,
          isActive: item.isActive,
        });
      }
      const changed = <R extends { id: string }>(rows: R[], original: R[]) => {
        const originals = new Map(original.map((row) => [row.id, row]));
        return rows.filter((row) => JSON.stringify(row) !== JSON.stringify(originals.get(row.id)));
      };
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
          // Prisma 8 model.delete() removes one matching row. Replace every current
          // part in this scoped recipe atomically; historical sales/stock JSON stays intact.
          await orm.RecipeIngredient.where({ recipeId: r.id }).deleteAll();
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
      const previousTransactionIds = new Set(
        before.transactions.map((transaction) => transaction.id),
      );
      for (const t of state.transactions.filter((t) => !previousTransactionIds.has(t.id)))
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
