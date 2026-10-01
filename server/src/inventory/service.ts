import { createHash, randomUUID } from 'node:crypto';
import {
  authorize,
  baseUnit,
  fail,
  ingredientInput,
  parse,
  recipeInput,
  saleInput,
  stockInput,
  toMilli,
  unitLabel,
  type AlertType,
  type Ingredient,
  type InventoryState,
  type InventoryStore,
  type Part,
  type Principal,
  type Recipe,
  type Scope,
  type StockItem,
  type StockTransaction,
  type Unit,
} from './domain';
export const EXPIRY_WARNING_DAYS = 3;
const day = (now: Date) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const findIngredient = (state: InventoryState, id: string) =>
  state.ingredients.find((i) => i.id === id) ??
  fail('NOT_FOUND', 'Không tìm thấy nguyên liệu trong chi nhánh.', 404);
function conditions(state: InventoryState, item: Ingredient, now: Date): AlertType[] {
  const types: AlertType[] =
    item.quantityMilli <= 0
      ? ['OUT_OF_STOCK']
      : item.quantityMilli <= item.minimumMilli
        ? ['LOW_STOCK']
        : [];
  const limit = new Date(now.getTime() + EXPIRY_WARNING_DAYS * 86400000);
  if (
    state.lots.some(
      (l) =>
        l.ingredientId === item.id && l.quantityMilli > 0 && l.expiry && l.expiry <= day(limit),
    )
  )
    types.push('NEAR_EXPIRY');
  return types;
}
export function evaluateAlerts(state: InventoryState, now: Date) {
  for (const ingredient of state.ingredients) {
    const active = conditions(state, ingredient, now);
    for (const type of ['LOW_STOCK', 'OUT_OF_STOCK', 'NEAR_EXPIRY'] as const) {
      const alert = state.alerts.find((a) => a.ingredientId === ingredient.id && a.type === type);
      if (active.includes(type)) {
        if (!alert)
          state.alerts.push({
            id: randomUUID(),
            ingredientId: ingredient.id,
            type,
            status: 'OPEN',
            conditionActive: true,
            updatedAt: now.toISOString(),
          });
        else if (!alert.conditionActive)
          Object.assign(alert, {
            status: 'OPEN',
            conditionActive: true,
            updatedAt: now.toISOString(),
          });
      } else if (alert?.conditionActive)
        Object.assign(alert, {
          status: 'RESOLVED',
          conditionActive: false,
          updatedAt: now.toISOString(),
        });
    }
  }
}
export function foodCost(recipe: Recipe, state: InventoryState, modifierKeys: string[] = []) {
  const parts = [...recipe.ingredients];
  let sellingPrice = recipe.sellingPrice;
  if (new Set(modifierKeys).size !== modifierKeys.length)
    fail('MODIFIER_DUPLICATE', 'Không được lặp tùy chọn trong cùng món.');
  for (const key of modifierKeys) {
    const modifier =
      recipe.modifiers.find((m) => m.key === key) ??
      fail('MODIFIER_UNKNOWN', 'Tùy chọn không có trong công thức.');
    parts.push(...modifier.ingredients);
    sellingPrice += modifier.priceExtra;
  }
  const cost = money(
    parts.reduce(
      (sum, part) =>
        sum + (part.quantityMilli / 1000) * findIngredient(state, part.ingredientId).unitCost,
      0,
    ),
  );
  return {
    foodCost: cost,
    sellingPrice,
    grossProfit: money(sellingPrice - cost),
    marginPercent: sellingPrice > 0 ? money(((sellingPrice - cost) / sellingPrice) * 100) : 0,
  };
}
function mutateQuantity(
  state: InventoryState,
  item: Ingredient,
  delta: number,
  expiry: string | null,
  now: Date,
  allowExpired: boolean,
): StockItem {
  if (
    !Number.isSafeInteger(delta) ||
    item.quantityMilli + delta < 0 ||
    item.quantityMilli + delta > 2_000_000_000
  )
    fail('INSUFFICIENT_STOCK', 'Không đủ tồn kho hoặc số lượng vượt giới hạn.', 409);
  const beforeMilli = item.quantityMilli;
  const changes: StockItem['lotChanges'] = [];
  if (delta > 0) {
    const lot = {
      id: randomUUID(),
      ingredientId: item.id,
      quantityMilli: delta,
      expiry,
      createdAt: now.toISOString(),
    };
    state.lots.push(lot);
    changes.push({ lotId: lot.id, quantityMilli: delta });
  } else if (delta < 0) {
    const lots = state.lots
      .filter(
        (l) =>
          l.ingredientId === item.id &&
          l.quantityMilli > 0 &&
          (allowExpired || !l.expiry || l.expiry >= day(now)),
      )
      .sort(
        (a, b) =>
          (a.expiry ?? '9999').localeCompare(b.expiry ?? '9999') ||
          a.createdAt.localeCompare(b.createdAt) ||
          a.id.localeCompare(b.id),
      );
    if (lots.reduce((sum, l) => sum + l.quantityMilli, 0) < -delta)
      fail('INSUFFICIENT_USABLE_STOCK', 'Không đủ nguyên liệu còn hạn sử dụng.', 409);
    let remaining = -delta;
    for (const lot of lots) {
      const consumed = Math.min(remaining, lot.quantityMilli);
      if (!consumed) break;
      lot.quantityMilli -= consumed;
      remaining -= consumed;
      changes.push({ lotId: lot.id, quantityMilli: -consumed });
    }
  }
  item.quantityMilli += delta;
  return {
    ingredientId: item.id,
    quantityMilli: delta,
    beforeMilli,
    afterMilli: item.quantityMilli,
    unitCost: item.unitCost,
    lotChanges: changes,
  };
}
function replay(state: InventoryState, key: string, hash: string) {
  const existing = state.transactions.find((t) => t.requestKey === key);
  if (existing && existing.requestHash !== hash)
    fail('IDEMPOTENCY_CONFLICT', 'Mã yêu cầu đã được dùng với nội dung khác.', 409);
  return existing;
}
export class InventoryService {
  constructor(
    private store: InventoryStore,
    private clock = () => new Date(),
  ) {}
  async read(principal: Principal, scope: Scope) {
    authorize(principal, scope);
    return this.store.transaction(scope, (state) => {
      evaluateAlerts(state, this.clock());
      return this.present(state);
    });
  }
  private present(state: InventoryState) {
    const now = this.clock();
    return {
      asOf: now.toISOString(),
      ingredients: state.ingredients.map((item) => {
        const near =
          state.lots
            .filter((l) => l.ingredientId === item.id && l.quantityMilli > 0 && l.expiry)
            .map((l) => l.expiry!)
            .sort()[0] ?? null;
        const active = conditions(state, item, now);
        return {
          ...item,
          unit: unitLabel(item.unit),
          stock: item.quantityMilli / 1000,
          minimum: item.minimumMilli / 1000,
          expiry: near,
          status: active.includes('OUT_OF_STOCK')
            ? 'OUT_OF_STOCK'
            : active.includes('NEAR_EXPIRY')
              ? 'NEAR_EXPIRY'
              : active.includes('LOW_STOCK')
                ? 'LOW_STOCK'
                : 'IN_STOCK',
        };
      }),
      recipes: state.recipes.map((recipe) => ({
        ...recipe,
        ...foodCost(recipe, state),
        modifiers: recipe.modifiers.map((modifier) => ({
          ...modifier,
          ...foodCost(recipe, state, [modifier.key]),
        })),
      })),
      transactions: [...state.transactions]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 100),
      alerts: [...state.alerts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    };
  }
  async saveIngredient(principal: Principal, scope: Scope, input: unknown, id?: string) {
    authorize(principal, scope);
    const value = parse(ingredientInput, input);
    return this.store.transaction(scope, (state) => {
      const existing = id ? findIngredient(state, id) : undefined;
      const base = baseUnit(value.unit);
      if (existing && existing.unit !== base)
        fail('UNIT_IMMUTABLE', 'Không thể đổi loại đơn vị của nguyên liệu đã tạo.');
      const now = this.clock();
      const item: Ingredient = existing ?? {
        id: randomUUID(),
        quantityMilli: 0,
        minimumMilli: 0,
        name: '',
        category: '',
        unit: base,
        unitCost: 0,
      };
      const before = { ...item };
      const cost = value.unitCost / (value.unit === 'kg' || value.unit === 'L' ? 1000 : 1);
      if (existing && Math.abs(existing.unitCost - cost) > 0.000001)
        fail('COST_IMPORT_REQUIRED', 'Đơn giá được cập nhật qua nhập kho, không sửa trực tiếp.');
      Object.assign(item, {
        name: value.name,
        category: value.category,
        minimumMilli: toMilli(value.minimum, value.unit, base),
        unitCost: cost,
      });
      if (!existing) state.ingredients.push(item);
      const audit: StockTransaction = {
        id: randomUUID(),
        actorId: principal.userId,
        type: 'ADJUSTMENT',
        requestKey: randomUUID(),
        requestHash: digest(value),
        orderId: null,
        note: `${existing ? 'Cập nhật' : 'Tạo'} nguyên liệu; định mức ${before.minimumMilli / 1000} → ${item.minimumMilli / 1000}; tên ${before.name} → ${item.name}; danh mục ${before.category} → ${item.category}`,
        supplier: '',
        items: [
          {
            ingredientId: item.id,
            quantityMilli: 0,
            beforeMilli: item.quantityMilli,
            afterMilli: item.quantityMilli,
            unitCost: item.unitCost,
            lotChanges: [],
          },
        ],
        createdAt: now.toISOString(),
      };
      state.transactions.push(audit);
      evaluateAlerts(state, now);
      return item;
    });
  }
  async transact(principal: Principal, scope: Scope, input: unknown) {
    authorize(principal, scope);
    const value = parse(stockInput, input);
    const hash = digest(value);
    return this.store.transaction(scope, (state) => {
      const existing = replay(state, `manual:${value.requestKey}`, hash);
      if (existing) return existing;
      const item = findIngredient(state, value.ingredientId);
      const unitCostBefore = item.unitCost;
      const qty = toMilli(value.quantity, value.unit, item.unit);
      const now = this.clock();
      if (value.expiry && value.expiry < day(now) && value.type === 'IMPORT')
        fail('EXPIRED_IMPORT', 'Không nhập nguyên liệu đã hết hạn.');
      const delta =
        value.type === 'ADJUSTMENT'
          ? qty - item.quantityMilli
          : value.type === 'IMPORT'
            ? qty
            : -qty;
      if (value.type === 'IMPORT') {
        const price = value.unitCost! / (value.unit === 'kg' || value.unit === 'L' ? 1000 : 1);
        item.unitCost =
          (item.quantityMilli * item.unitCost + qty * price) / (item.quantityMilli + qty);
      }
      const changed = mutateQuantity(
        state,
        item,
        delta,
        value.expiry,
        now,
        value.type === 'ADJUSTMENT' || value.type === 'WASTE',
      );
      changed.unitCostBefore = unitCostBefore;
      if (value.type === 'IMPORT')
        changed.purchaseUnitCost =
          value.unitCost! / (value.unit === 'kg' || value.unit === 'L' ? 1000 : 1);
      const transaction: StockTransaction = {
        id: randomUUID(),
        actorId: principal.userId,
        type: value.type,
        requestKey: `manual:${value.requestKey}`,
        requestHash: hash,
        orderId: null,
        note: `${value.reason}${value.note ? ` · ${value.note}` : ''}`,
        supplier: value.supplier,
        items: [changed],
        createdAt: now.toISOString(),
      };
      state.transactions.push(transaction);
      evaluateAlerts(state, now);
      return transaction;
    });
  }
  async saveRecipe(principal: Principal, scope: Scope, input: unknown, id?: string) {
    authorize(principal, scope);
    const value = parse(recipeInput, input);
    return this.store.transaction(scope, (state) => {
      const existing = id
        ? (state.recipes.find((r) => r.id === id) ??
          fail('NOT_FOUND', 'Không tìm thấy công thức.', 404))
        : undefined;
      if (state.recipes.some((r) => r.menuItemId === value.menuItemId && r.id !== id))
        fail('RECIPE_EXISTS', 'Món đã có công thức tại chi nhánh.', 409);
      const convert = (parts: { ingredientId: string; quantity: number; unit: Unit }[]): Part[] => {
        if (new Set(parts.map((p) => p.ingredientId)).size !== parts.length)
          fail('PART_DUPLICATE', 'Nguyên liệu không được lặp trong cùng định lượng.');
        return parts.map((p) => ({
          ingredientId: p.ingredientId,
          quantityMilli: toMilli(p.quantity, p.unit, findIngredient(state, p.ingredientId).unit),
        }));
      };
      if (new Set(value.modifiers.map((m) => m.key)).size !== value.modifiers.length)
        fail('MODIFIER_DUPLICATE', 'Mã tùy chọn không được trùng.');
      const recipe: Recipe = {
        ...value,
        id: existing?.id ?? randomUUID(),
        version: (existing?.version ?? 0) + 1,
        ingredients: convert(value.ingredients),
        modifiers: value.modifiers.map((m) => ({ ...m, ingredients: convert(m.ingredients) })),
      };
      if (existing) state.recipes[state.recipes.indexOf(existing)] = recipe;
      else state.recipes.push(recipe);
      return { ...recipe, ...foodCost(recipe, state) };
    });
  }
  // Internal Sales boundary only: caller must verify order state/lines from its DB.
  // Never mounted as a client-callable endpoint.
  async consumeSale(principal: Principal, scope: Scope, input: unknown) {
    authorize(principal, scope, 'sale');
    const sale = parse(saleInput, input);
    const normalized = {
      orderId: sale.orderId,
      items: sale.items
        .map((i) => ({ ...i, modifiers: [...i.modifiers].sort() }))
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    };
    const hash = digest(normalized);
    return this.store.transaction(scope, (state) => {
      const existing = replay(state, `sale:${sale.orderId}`, hash);
      if (existing) return existing;
      const consumption = new Map<
        string,
        { quantity: number; recipes: { recipeId: string; version: number }[] }
      >();
      for (const line of sale.items) {
        const recipe =
          state.recipes.find((r) => r.menuItemId === line.menuItemId) ??
          fail('RECIPE_MISSING', 'Món chưa có công thức tại chi nhánh.', 409);
        foodCost(recipe, state, line.modifiers); // Validate selected modifiers before mutation.
        const parts = [
          ...recipe.ingredients,
          ...line.modifiers.flatMap(
            (key) => recipe.modifiers.find((m) => m.key === key)!.ingredients,
          ),
        ];
        for (const part of parts) {
          const total = consumption.get(part.ingredientId) ?? { quantity: 0, recipes: [] };
          total.quantity += part.quantityMilli * line.quantity;
          if (!total.recipes.some((r) => r.recipeId === recipe.id && r.version === recipe.version))
            total.recipes.push({ recipeId: recipe.id, version: recipe.version });
          consumption.set(part.ingredientId, total);
        }
      }
      const now = this.clock();
      const items: StockItem[] = [];
      for (const [id, total] of [...consumption].sort(([a], [b]) => a.localeCompare(b)))
        items.push({
          ...mutateQuantity(state, findIngredient(state, id), -total.quantity, null, now, false),
          recipeVersions: total.recipes,
        });
      const transaction: StockTransaction = {
        id: randomUUID(),
        actorId: principal.userId,
        type: 'SALE_CONSUMPTION',
        requestKey: `sale:${sale.orderId}`,
        requestHash: hash,
        orderId: sale.orderId,
        note: `Tiêu thụ cho đơn ${sale.orderId}`,
        supplier: '',
        items,
        createdAt: now.toISOString(),
      };
      state.transactions.push(transaction);
      evaluateAlerts(state, now);
      return transaction;
    });
  }
  async setAlertStatus(
    principal: Principal,
    scope: Scope,
    id: string,
    status: 'IN_PROGRESS' | 'RESOLVED',
  ) {
    authorize(principal, scope);
    if (!['IN_PROGRESS', 'RESOLVED'].includes(status))
      fail('VALIDATION', 'Trạng thái cảnh báo không hợp lệ.');
    return this.store.transaction(scope, (state) => {
      evaluateAlerts(state, this.clock());
      const alert =
        state.alerts.find((a) => a.id === id) ?? fail('NOT_FOUND', 'Không tìm thấy cảnh báo.', 404);
      if (!alert.conditionActive && status === 'IN_PROGRESS')
        fail('ALERT_CLOSED', 'Điều kiện cảnh báo đã hết hiệu lực.', 409);
      alert.status = status;
      alert.updatedAt = this.clock().toISOString();
      return alert;
    });
  }
  async ownerSummary(principal: Principal) {
    authorize(principal, { businessId: principal.businessId, branchId: '' }, 'owner');
    const results = [];
    for (const branch of await this.store.branches(principal.businessId)) {
      const summary = await this.store.transaction(
        { businessId: principal.businessId, branchId: branch.id },
        (state) => {
          evaluateAlerts(state, this.clock());
          const view = this.present(state);
          const start = this.clock().getTime() - 30 * 86400000;
          return {
            branch,
            asOf: view.asOf,
            ingredients: view.ingredients,
            lowStockCount: state.ingredients.filter((i) => i.quantityMilli <= i.minimumMilli)
              .length,
            nearExpiryCount: state.ingredients.filter((i) =>
              conditions(state, i, this.clock()).includes('NEAR_EXPIRY'),
            ).length,
            inventoryValue: money(
              state.ingredients.reduce((sum, i) => sum + (i.quantityMilli / 1000) * i.unitCost, 0),
            ),
            consumptionLast30Days: state.ingredients
              .map((i) => ({
                ingredientId: i.id,
                name: i.name,
                unit: unitLabel(i.unit),
                quantity: state.transactions
                  .filter((t) => t.type === 'SALE_CONSUMPTION' && Date.parse(t.createdAt) >= start)
                  .flatMap((t) => t.items)
                  .filter((p) => p.ingredientId === i.id)
                  .reduce((sum, p) => sum - p.quantityMilli / 1000, 0),
                estimatedCost: money(
                  state.transactions
                    .filter(
                      (t) => t.type === 'SALE_CONSUMPTION' && Date.parse(t.createdAt) >= start,
                    )
                    .flatMap((t) => t.items)
                    .filter((p) => p.ingredientId === i.id)
                    .reduce((sum, p) => sum - (p.quantityMilli / 1000) * p.unitCost, 0),
                ),
              }))
              .sort(
                (a, b) =>
                  b.estimatedCost - a.estimatedCost || a.ingredientId.localeCompare(b.ingredientId),
              ),
          };
        },
      );
      results.push(summary);
    }
    return { costingMethod: 'MOVING_WEIGHTED_AVERAGE', branches: results };
  }
  async ownerRecipeCosts(principal: Principal) {
    authorize(principal, { businessId: principal.businessId, branchId: '' }, 'owner');
    const result: { menuItemId: string; foodCost: number }[] = [];
    for (const branch of await this.store.branches(principal.businessId)) {
      const rows = await this.store.transaction(
        { businessId: principal.businessId, branchId: branch.id },
        (state) =>
          state.recipes.map((recipe) => ({
            menuItemId: recipe.menuItemId,
            foodCost: foodCost(recipe, state).foodCost,
          })),
      );
      result.push(...rows);
    }
    return result;
  }
}
