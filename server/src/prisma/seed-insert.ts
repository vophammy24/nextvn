import { db } from './db.js';
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
// Fixed SQL identifiers; every fixture value is a bound JSON parameter.
export async function insertDemoRows(
  tx: Transaction,
  rows: Record<string, Record<string, unknown>[]>,
) {
  await tx.query(
    db.raw
      .sql`INSERT INTO public."MenuCategory" ("id", "branchId", "name", "displayOrder", "isActive", "createdAt", "updatedAt") SELECT "id", "branchId", "name", "displayOrder", "isActive", "createdAt", "updatedAt" FROM jsonb_populate_recordset(NULL::public."MenuCategory", ${JSON.stringify(rows.MenuCategory)}::jsonb)`
      .affectedCount()
      .build(),
  );
  await tx.query(
    db.raw
      .sql`INSERT INTO public."MenuItem" ("id", "branchId", "categoryId", "name", "description", "price", "isActive", "createdAt", "updatedAt") SELECT "id", "branchId", "categoryId", "name", "description", "price", "isActive", "createdAt", "updatedAt" FROM jsonb_populate_recordset(NULL::public."MenuItem", ${JSON.stringify(rows.MenuItem)}::jsonb)`
      .affectedCount()
      .build(),
  );
  await tx.query(
    db.raw
      .sql`INSERT INTO public."RestaurantArea" ("id", "branchId", "name", "displayOrder", "createdAt", "updatedAt") SELECT "id", "branchId", "name", "displayOrder", "createdAt", "updatedAt" FROM jsonb_populate_recordset(NULL::public."RestaurantArea", ${JSON.stringify(rows.RestaurantArea)}::jsonb)`
      .affectedCount()
      .build(),
  );
  await tx.query(
    db.raw
      .sql`INSERT INTO public."RestaurantTable" ("id", "branchId", "areaId", "name", "seats", "status", "createdAt", "updatedAt") SELECT "id", "branchId", "areaId", "name", "seats", "status", "createdAt", "updatedAt" FROM jsonb_populate_recordset(NULL::public."RestaurantTable", ${JSON.stringify(rows.RestaurantTable)}::jsonb)`
      .affectedCount()
      .build(),
  );
  await tx.query(
    db.raw
      .sql`INSERT INTO public."Ingredient" ("id", "businessId", "branchId", "name", "category", "unit") SELECT "id", "businessId", "branchId", "name", "category", "unit" FROM jsonb_populate_recordset(NULL::public."Ingredient", ${JSON.stringify(rows.Ingredient)}::jsonb)`
      .affectedCount()
      .build(),
  );
  await tx.query(
    db.raw
      .sql`INSERT INTO public."InventoryBalance" ("id", "ingredientId", "quantityMilli", "minimumMilli", "unitCost") SELECT "id", "ingredientId", "quantityMilli", "minimumMilli", "unitCost" FROM jsonb_populate_recordset(NULL::public."InventoryBalance", ${JSON.stringify(rows.InventoryBalance)}::jsonb)`
      .affectedCount()
      .build(),
  );
  await tx.query(
    db.raw
      .sql`INSERT INTO public."InventoryLot" ("id", "ingredientId", "quantityMilli", "expiry", "createdAt") SELECT "id", "ingredientId", "quantityMilli", "expiry", "createdAt" FROM jsonb_populate_recordset(NULL::public."InventoryLot", ${JSON.stringify(rows.InventoryLot)}::jsonb)`
      .affectedCount()
      .build(),
  );
  await tx.query(
    db.raw
      .sql`INSERT INTO public."Recipe" ("id", "businessId", "branchId", "menuItemId", "name", "sellingPrice", "version", "modifiers") SELECT "id", "businessId", "branchId", "menuItemId", "name", "sellingPrice", "version", "modifiers" FROM jsonb_populate_recordset(NULL::public."Recipe", ${JSON.stringify(rows.Recipe)}::jsonb)`
      .affectedCount()
      .build(),
  );
  await tx.query(
    db.raw
      .sql`INSERT INTO public."RecipeIngredient" ("id", "recipeId", "ingredientId", "quantityMilli", "modifierKey") SELECT "id", "recipeId", "ingredientId", "quantityMilli", "modifierKey" FROM jsonb_populate_recordset(NULL::public."RecipeIngredient", ${JSON.stringify(rows.RecipeIngredient)}::jsonb)`
      .affectedCount()
      .build(),
  );
  await tx.query(
    db.raw
      .sql`INSERT INTO public."Shift" ("id", "branchId", "staffId", "status", "startedAt", "endedAt", "createdAt", "updatedAt") SELECT "id", "branchId", "staffId", "status", "startedAt", "endedAt", "createdAt", "updatedAt" FROM jsonb_populate_recordset(NULL::public."Shift", ${JSON.stringify(rows.Shift)}::jsonb)`
      .affectedCount()
      .build(),
  );
  await tx.query(
    db.raw
      .sql`INSERT INTO public."Order" ("id", "branchId", "shiftId", "cashierId", "orderType", "status", "subtotal", "discount", "total", "note", "createdAt", "updatedAt") SELECT "id", "branchId", "shiftId", "cashierId", "orderType", "status", "subtotal", "discount", "total", "note", "createdAt", "updatedAt" FROM jsonb_populate_recordset(NULL::public."Order", ${JSON.stringify(rows.Order)}::jsonb)`
      .affectedCount()
      .build(),
  );
  await tx.query(
    db.raw
      .sql`INSERT INTO public."OrderItem" ("id", "orderId", "menuItemId", "name", "unitPrice", "quantity", "total", "createdAt", "updatedAt") SELECT "id", "orderId", "menuItemId", "name", "unitPrice", "quantity", "total", "createdAt", "updatedAt" FROM jsonb_populate_recordset(NULL::public."OrderItem", ${JSON.stringify(rows.OrderItem)}::jsonb)`
      .affectedCount()
      .build(),
  );
  await tx.query(
    db.raw
      .sql`INSERT INTO public."OrderPayment" ("id", "orderId", "method", "amount", "createdAt") SELECT "id", "orderId", "method", "amount", "createdAt" FROM jsonb_populate_recordset(NULL::public."OrderPayment", ${JSON.stringify(rows.OrderPayment)}::jsonb)`
      .affectedCount()
      .build(),
  );
  await tx.query(
    db.raw
      .sql`INSERT INTO public."StockTransaction" ("id", "businessId", "branchId", "actorId", "type", "requestKey", "requestHash", "orderId", "note", "supplier", "items", "createdAt") SELECT "id", "businessId", "branchId", "actorId", "type", "requestKey", "requestHash", "orderId", "note", "supplier", "items", "createdAt" FROM jsonb_populate_recordset(NULL::public."StockTransaction", ${JSON.stringify(rows.StockTransaction)}::jsonb)`
      .affectedCount()
      .build(),
  );
  await tx.query(
    db.raw
      .sql`INSERT INTO public."InventoryAlert" ("id", "businessId", "branchId", "ingredientId", "type", "status", "conditionActive", "updatedAt") SELECT "id", "businessId", "branchId", "ingredientId", "type", "status", "conditionActive", "updatedAt" FROM jsonb_populate_recordset(NULL::public."InventoryAlert", ${JSON.stringify(rows.InventoryAlert)}::jsonb)`
      .affectedCount()
      .build(),
  );
}
