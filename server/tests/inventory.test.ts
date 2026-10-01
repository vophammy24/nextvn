import { randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  emptyState,
  InventoryError,
  toMilli,
  type InventoryState,
  type InventoryStore,
  type Principal,
  type Scope,
  type TransactionType,
} from '../src/inventory/domain';
import { InventoryService } from '../src/inventory/service';
import { createInventoryRouter } from '../src/inventory/router';

// Transactional fake for domain tests; not evidence of PostgreSQL lock behavior.
class MemoryStore implements InventoryStore {
  states = new Map<string, InventoryState>();
  queue = Promise.resolve();
  constructor(
    public scope: Scope,
    public otherBranch = randomUUID(),
  ) {}
  async branches(businessId: string) {
    return businessId === this.scope.businessId
      ? [
          { id: this.scope.branchId, name: 'Chi nhánh A' },
          { id: this.otherBranch, name: 'Chi nhánh B' },
        ]
      : [];
  }
  async transaction<T>(scope: Scope, run: (state: InventoryState) => T | Promise<T>): Promise<T> {
    const prior = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>((r) => {
      release = r;
    });
    await prior;
    try {
      if (
        scope.businessId !== this.scope.businessId ||
        ![this.scope.branchId, this.otherBranch].includes(scope.branchId)
      )
        throw new InventoryError(404, 'BRANCH_NOT_FOUND', 'Không tìm thấy chi nhánh.');
      const state = structuredClone(this.states.get(scope.branchId) ?? emptyState());
      const result = await run(state);
      for (const [id, other] of this.states)
        if (
          id !== scope.branchId &&
          state.transactions.some(
            (t) => t.orderId && other.transactions.some((o) => o.orderId === t.orderId),
          )
        )
          throw new InventoryError(
            409,
            'ORDER_BRANCH_CONFLICT',
            'Đơn đã được ghi nhận tại chi nhánh khác.',
          );
      this.states.set(scope.branchId, state);
      return result;
    } finally {
      release();
    }
  }
}
function setup() {
  const scope = { businessId: randomUUID(), branchId: randomUUID() };
  const manager: Principal = {
    userId: randomUUID(),
    ...scope,
    role: 'MANAGER',
    branchIds: [scope.branchId],
  };
  const store = new MemoryStore(scope);
  const service = new InventoryService(store, () => new Date('2026-10-01T03:00:00Z'));
  const ingredient = async (name = 'Cà phê', unit = 'g', unitCost = 200, minimum = 20) =>
    service.saveIngredient(manager, scope, { name, category: 'Cà phê', unit, unitCost, minimum });
  const move = async (
    ingredientId: string,
    type: TransactionType,
    quantity: number,
    extra: Record<string, unknown> = {},
  ) =>
    service.transact(manager, scope, {
      ingredientId,
      type,
      quantity,
      unit: 'g',
      unitCost: 200,
      supplier: 'Nhà cung cấp thử nghiệm',
      reason: 'Kiểm thử',
      requestKey: randomUUID(),
      ...extra,
    });
  const recipe = async (id: string) =>
    service.saveRecipe(manager, scope, {
      menuItemId: 'latte',
      name: 'Cà phê sữa',
      sellingPrice: 50000,
      ingredients: [{ ingredientId: id, quantity: 0.018, unit: 'kg' }],
      modifiers: [],
    });
  const sale = (quantity = 2, orderId = 'order-1') => ({
    orderId,
    state: 'PAID',
    items: [{ menuItemId: 'latte', quantity, modifiers: [] }],
  });
  return { scope, manager, store, service, ingredient, move, recipe, sale };
}
describe('Inventory domain', () => {
  it('converts explicit compatible units and rejects precision loss / dimensions', () => {
    expect(toMilli(0.018, 'kg', 'G')).toBe(18000);
    expect(toMilli(0.2, 'L', 'ML')).toBe(200000);
    expect(toMilli(2, 'cái', 'PIECE')).toBe(2000);
    expect(() => toMilli(1, 'kg', 'ML')).toThrow('Đơn vị');
    expect(() => toMilli(0.0001, 'g')).toThrow();
    expect(() => toMilli(1e-12, 'g')).toThrow();
    expect(() => toMilli(-1, 'g')).toThrow();
  });
  it('imports, exports, wastes and adjusts with a complete immutable quantity ledger', async () => {
    const t = setup(),
      i = await t.ingredient();
    await t.move(i.id, 'IMPORT', 100);
    await t.move(i.id, 'EXPORT', 20);
    await t.move(i.id, 'WASTE', 10);
    await t.move(i.id, 'ADJUSTMENT', 45);
    const view = await t.service.read(t.manager, t.scope);
    expect(view.ingredients[0].stock).toBe(45);
    expect(view.transactions).toHaveLength(5);
    const items = view.transactions.flatMap((x) => x.items);
    expect(items.reduce((sum, p) => sum + p.quantityMilli, 0)).toBe(45000);
    for (const p of items) expect(p.afterMilli - p.beforeMilli).toBe(p.quantityMilli);
  });
  it('rolls back insufficient stock without an audit or partial lot change', async () => {
    const t = setup(),
      i = await t.ingredient();
    await t.move(i.id, 'IMPORT', 10);
    const before = structuredClone(t.store.states);
    await expect(t.move(i.id, 'EXPORT', 11)).rejects.toMatchObject({ status: 409 });
    expect(t.store.states).toEqual(before);
    await expect(t.move(i.id, 'WASTE', 11)).rejects.toMatchObject({ status: 409 });
  });
  it('uses moving weighted average cost and recalculates recipe cost on import', async () => {
    const t = setup(),
      i = await t.ingredient();
    await t.move(i.id, 'IMPORT', 100, { unitCost: 100 });
    await t.move(i.id, 'IMPORT', 100, { unitCost: 300 });
    const r = await t.recipe(i.id);
    expect(r.foodCost).toBe(3600);
    expect(r.grossProfit).toBe(46400);
    expect(r.marginPercent).toBe(92.8);
    await t.move(i.id, 'IMPORT', 200, { unitCost: 400 });
    expect((await t.service.read(t.manager, t.scope)).recipes[0].foodCost).toBe(5400);
  });
  it('protects manual idempotency and detects conflicting payloads', async () => {
    const t = setup(),
      i = await t.ingredient();
    const first = await t.move(i.id, 'IMPORT', 100, { requestKey: 'once' });
    const second = await t.move(i.id, 'IMPORT', 100, { requestKey: 'once' });
    expect(second.id).toBe(first.id);
    await expect(t.move(i.id, 'IMPORT', 101, { requestKey: 'once' })).rejects.toMatchObject({
      code: 'IDEMPOTENCY_CONFLICT',
    });
    expect((await t.service.read(t.manager, t.scope)).ingredients[0].stock).toBe(100);
  });
  it('deducts converted recipe quantities and modifiers; paid replay after confirmation is safe', async () => {
    const t = setup(),
      coffee = await t.ingredient(),
      milk = await t.ingredient('Sữa', 'ml', 30, 0);
    await t.move(coffee.id, 'IMPORT', 100);
    await t.move(milk.id, 'IMPORT', 1, { unit: 'L', unitCost: 30000 });
    await t.service.saveRecipe(t.manager, t.scope, {
      menuItemId: 'latte',
      name: 'Cà phê sữa',
      sellingPrice: 50000,
      ingredients: [
        { ingredientId: coffee.id, quantity: 0.018, unit: 'kg' },
        { ingredientId: milk.id, quantity: 0.2, unit: 'L' },
      ],
      modifiers: [
        {
          key: 'extra',
          name: 'Thêm sữa',
          priceExtra: 5000,
          ingredients: [{ ingredientId: milk.id, quantity: 50, unit: 'ml' }],
        },
      ],
    });
    const input = t.sale();
    input.items[0].modifiers = ['extra'] as never[];
    const first = await t.service.consumeSale({ ...t.manager, role: 'STAFF' }, t.scope, {
      ...input,
      state: 'CONFIRMED',
    });
    const repeat = await t.service.consumeSale(t.manager, t.scope, input);
    expect(repeat.id).toBe(first.id);
    const view = await t.service.read(t.manager, t.scope);
    expect(view.ingredients.map((i) => i.stock)).toEqual([64, 500]);
    expect(first.type).toBe('SALE_CONSUMPTION');
    expect(first.items[0].recipeVersions).toEqual([{ recipeId: view.recipes[0].id, version: 1 }]);
    await expect(t.service.consumeSale(t.manager, t.scope, t.sale(3))).rejects.toMatchObject({
      code: 'IDEMPOTENCY_CONFLICT',
    });
  });
  it('atomically rolls back an order when a later ingredient is insufficient', async () => {
    const t = setup(),
      a = await t.ingredient(),
      b = await t.ingredient('Sữa', 'ml');
    await t.move(a.id, 'IMPORT', 100);
    await t.service.saveRecipe(t.manager, t.scope, {
      menuItemId: 'latte',
      name: 'Cà phê sữa',
      sellingPrice: 1,
      ingredients: [
        { ingredientId: a.id, quantity: 18, unit: 'g' },
        { ingredientId: b.id, quantity: 200, unit: 'ml' },
      ],
    });
    const before = structuredClone(t.store.states);
    await expect(t.service.consumeSale(t.manager, t.scope, t.sale())).rejects.toMatchObject({
      status: 409,
    });
    expect(t.store.states).toEqual(before);
  });
  it('serializes competing consumption and duplicate requests', async () => {
    const t = setup(),
      i = await t.ingredient();
    await t.move(i.id, 'IMPORT', 36);
    await t.recipe(i.id);
    const repeated = await Promise.all([
      t.service.consumeSale(t.manager, t.scope, t.sale(1)),
      t.service.consumeSale(t.manager, t.scope, t.sale(1)),
    ]);
    expect(repeated[0].id).toBe(repeated[1].id);
    const results = await Promise.allSettled([
      t.service.consumeSale(t.manager, t.scope, t.sale(1, 'order-2')),
      t.service.consumeSale(t.manager, t.scope, t.sale(1, 'order-3')),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await t.service.read(t.manager, t.scope)).ingredients[0].stock).toBe(0);
  });
  it('consumes earliest expiry first; expired lots are available only for waste / adjustment', async () => {
    const t = setup(),
      i = await t.ingredient();
    await t.move(i.id, 'IMPORT', 10, { expiry: '2026-10-10' });
    await t.move(i.id, 'IMPORT', 20, { expiry: '2026-10-02' });
    const output = await t.move(i.id, 'EXPORT', 15);
    const state = t.store.states.get(t.scope.branchId)!;
    expect(state.lots.find((l) => l.id === output.items[0].lotChanges[0].lotId)?.expiry).toBe(
      '2026-10-02',
    );
    state.lots.forEach((l) => {
      l.expiry = '2026-09-30';
    });
    await expect(t.move(i.id, 'EXPORT', 1)).rejects.toMatchObject({
      code: 'INSUFFICIENT_USABLE_STOCK',
    });
    await t.move(i.id, 'WASTE', 15);
    await expect(t.move(i.id, 'IMPORT', 1, { expiry: '2026-09-30' })).rejects.toMatchObject({
      code: 'EXPIRED_IMPORT',
    });
  });
  it('deduplicates alerts, supports acknowledgement and reopens only after a new episode', async () => {
    const t = setup(),
      i = await t.ingredient();
    await t.move(i.id, 'IMPORT', 20, { expiry: '2026-10-04' });
    let view = await t.service.read(t.manager, t.scope);
    expect(
      view.alerts
        .filter((a) => a.conditionActive)
        .map((a) => a.type)
        .sort(),
    ).toEqual(['LOW_STOCK', 'NEAR_EXPIRY']);
    const low = view.alerts.find((a) => a.type === 'LOW_STOCK')!;
    await t.service.setAlertStatus(t.manager, t.scope, low.id, 'IN_PROGRESS');
    await t.service.setAlertStatus(t.manager, t.scope, low.id, 'RESOLVED');
    expect(
      (await t.service.read(t.manager, t.scope)).alerts.find((a) => a.id === low.id)?.status,
    ).toBe('RESOLVED');
    await t.move(i.id, 'IMPORT', 10);
    await t.move(i.id, 'EXPORT', 10);
    view = await t.service.read(t.manager, t.scope);
    expect(view.alerts.filter((a) => a.type === 'LOW_STOCK')).toHaveLength(1);
    expect(view.alerts.find((a) => a.id === low.id)?.status).toBe('OPEN');
    await t.move(i.id, 'WASTE', 20);
    expect(
      (await t.service.read(t.manager, t.scope)).alerts.find((a) => a.type === 'OUT_OF_STOCK'),
    ).toMatchObject({ conditionActive: true, status: 'OPEN' });
  });
  it('rejects missing recipes, invalid sale states, incompatible recipe units and unknown modifiers', async () => {
    const t = setup(),
      i = await t.ingredient();
    await expect(t.service.consumeSale(t.manager, t.scope, t.sale())).rejects.toMatchObject({
      code: 'RECIPE_MISSING',
    });
    await t.recipe(i.id);
    await expect(
      t.service.consumeSale(t.manager, t.scope, { ...t.sale(), state: 'DRAFT' }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(
      t.service.saveRecipe(t.manager, t.scope, {
        menuItemId: 'other',
        name: 'Khác',
        sellingPrice: 0,
        ingredients: [{ ingredientId: i.id, quantity: 1, unit: 'L' }],
      }),
    ).rejects.toMatchObject({ code: 'UNIT_MISMATCH' });
    await expect(
      t.service.consumeSale(t.manager, t.scope, {
        ...t.sale(),
        items: [{ menuItemId: 'latte', quantity: 1, modifiers: ['unknown'] }],
      }),
    ).rejects.toMatchObject({ code: 'MODIFIER_UNKNOWN' });
  });
  it('enforces branch/business isolation and OWNER read-only aggregation', async () => {
    const t = setup(),
      i = await t.ingredient();
    await t.move(i.id, 'IMPORT', 10);
    const other = { ...t.scope, branchId: t.store.otherBranch };
    await expect(t.service.read(t.manager, other)).rejects.toMatchObject({ status: 403 });
    const granted = { ...t.manager, branchIds: [t.scope.branchId, t.store.otherBranch] };
    expect((await t.service.read(granted, other)).ingredients).toEqual([]);
    await expect(
      t.service.transact(granted, other, {
        ingredientId: i.id,
        type: 'WASTE',
        quantity: 1,
        unit: 'g',
        reason: 'Kiểm thử',
        requestKey: 'x',
      }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      t.service.read(t.manager, { ...t.scope, businessId: randomUUID() }),
    ).rejects.toMatchObject({ status: 403 });
    const owner = { ...t.manager, role: 'OWNER' as const };
    expect((await t.service.ownerSummary(owner)).branches).toHaveLength(2);
    expect((await t.service.ownerSummary(owner)).branches[0].inventoryValue).toBe(2000);
    await expect(t.service.saveIngredient(owner, t.scope, {})).rejects.toMatchObject({
      status: 403,
    });
  });
});
describe('Inventory API boundary', () => {
  function api(t: ReturnType<typeof setup>, principal: Principal | null = t.manager) {
    const app = express();
    app.use(express.json());
    app.use(
      '/inventory',
      createInventoryRouter(t.service, async () => principal),
    );
    return app;
  }
  it('rejects spoofed identities when no authenticated resolver is connected', async () => {
    const t = setup();
    const app = express();
    app.use(createInventoryRouter(t.service));
    await request(app)
      .get(`/branches/${t.scope.branchId}`)
      .set('x-role', 'OWNER')
      .set('x-business-id', t.scope.businessId)
      .expect(401);
  });
  it('rejects Staff mutation and direct branch access regardless of body role', async () => {
    const t = setup(),
      app = api(t, { ...t.manager, role: 'STAFF' });
    await request(app)
      .post(`/inventory/branches/${t.scope.branchId}/ingredients`)
      .send({ role: 'MANAGER' })
      .expect(403);
    await request(app).get(`/inventory/branches/${t.scope.branchId}`).expect(403);
    await request(api(t)).get(`/inventory/branches/${t.store.otherBranch}`).expect(403);
    await request(api(t)).get('/inventory/summary').expect(403);
  });
  it('validates payloads in Vietnamese and creates/reads through authorized API', async () => {
    const t = setup(),
      app = api(t);
    const invalid = await request(app)
      .post(`/inventory/branches/${t.scope.branchId}/ingredients`)
      .send({})
      .expect(400);
    expect(invalid.body.message).toBe('Dữ liệu không hợp lệ.');
    await request(app)
      .post(`/inventory/branches/${t.scope.branchId}/ingredients`)
      .send({ name: 'Bột', category: 'Bột', unit: 'kg', minimum: 1, unitCost: 20000 })
      .expect(201);
    const result = await request(app).get(`/inventory/branches/${t.scope.branchId}`).expect(200);
    expect(result.body.ingredients[0]).toMatchObject({
      unit: 'g',
      stock: 0,
      minimum: 1000,
      status: 'OUT_OF_STOCK',
    });
    await request(app)
      .post(`/inventory/branches/${t.scope.branchId}/transactions`)
      .send({ type: 'SALE_CONSUMPTION' })
      .expect(400);
  });
  it('hides internal storage errors', async () => {
    const t = setup();
    t.store.transaction = async () => {
      throw new Error('secret database URL');
    };
    const response = await request(api(t))
      .get(`/inventory/branches/${t.scope.branchId}`)
      .expect(503);
    expect(response.text).not.toContain('secret');
    expect(response.body.message).toContain('Vui lòng thử lại');
  });
});
