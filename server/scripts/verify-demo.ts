import 'dotenv/config';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import request from 'supertest';
import app from '../src/app.js';
import { db } from '../src/prisma/db.js';
import { accounts, businessId, demoId } from '../src/prisma/demo-data.js';
import { salesTransaction } from '../src/lib/repositories.js';
import { createOrder, notifyInventoryConsumption } from '../src/modules/orders/orders.service.js';
let stage = 'accounts';
async function verify() {
  const password =
    process.env.DEMO_PASSWORD || (process.env.NODE_ENV !== 'production' ? 'NextvnDemo@2026' : '');
  assert(password, 'DEMO_PASSWORD required');
  let ownerToken = '';
  for (const [username, , role, b] of accounts) {
    const login = await request(app).post('/api/auth/login').send({ username, password });
    assert.equal(login.status, 200);
    assert(!JSON.stringify(login.body).includes('passwordHash'));
    if (role === 'OWNER') ownerToken = login.body.accessToken;
    const workspace = await request(app)
      .get('/api/workspace')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    assert.equal(workspace.status, 200);
    assert.equal(workspace.body.business.id, businessId);
    assert.equal(workspace.body.role, role);
    if (b !== null) assert.equal(workspace.body.branch.id, demoId(`branch:${b}`));
  }
  stage = 'database counts';
  const business = await db.orm.public.Business.where({ id: businessId }).first();
  assert(business);
  const branches = await db.orm.public.Branch.where({ businessId, isActive: true }).all();
  assert.equal(branches.length, 2);
  const summary = [],
    fingerprint = [];
  for (let b = 0; b < 2; b++) {
    const scope = { businessId, branchId: demoId(`branch:${b}`) };
    const orders = await db.orm.public.Order.where({ branchId: scope.branchId })
      .include('items')
      .include('payments')
      .all();
    const menu = await db.orm.public.MenuItem.where({ branchId: scope.branchId }).all();
    const ingredients = await db.orm.public.Ingredient.where(scope)
      .include('balance')
      .include('lots')
      .all();
    const recipes = await db.orm.public.Recipe.where(scope).include('ingredients').all();
    const transactions = await db.orm.public.StockTransaction.where(scope).all();
    const alerts = await db.orm.public.InventoryAlert.where(scope).all();
    assert.equal(menu.length, 15);
    assert.equal(ingredients.length, 21);
    assert.equal(recipes.length, 15);
    for (const i of ingredients) {
      assert(i.balance && i.balance.quantityMilli >= 0);
      assert.equal(
        i.lots.reduce((s, l) => s + l.quantityMilli, 0),
        i.balance.quantityMilli,
      );
    }
    for (const r of recipes) {
      assert(menu.some((m) => m.id === r.menuItemId));
      assert(r.ingredients.every((p) => ingredients.some((i) => i.id === p.ingredientId)));
    }
    assert.equal(
      transactions.filter((t) => t.type === 'SALE_CONSUMPTION').length,
      orders.filter((o) => o.status === 'PAID').length,
    );
    assert(orders.every((o) => o.items.every((i) => menu.some((m) => m.id === i.menuItemId))));
    summary.push({
      branch: branches.find((x) => x.id === scope.branchId)!.name,
      menu: menu.length,
      ingredients: ingredients.length,
      recipes: recipes.length,
      orders: orders.length,
      paid: orders.filter((o) => o.status === 'PAID').length,
      revenue: orders.filter((o) => o.status === 'PAID').reduce((s, o) => s + o.total, 0),
      transactions: transactions.length,
      alerts: alerts
        .filter((a) => a.conditionActive)
        .map((a) => ({
          ingredient: ingredients.find((i) => i.id === a.ingredientId)!.name,
          type: a.type,
        })),
      firstOrder: orders.map((o) => o.createdAt).sort()[0],
      lastOrder: orders
        .map((o) => o.createdAt)
        .sort()
        .at(-1),
    });
    fingerprint.push(
      ...orders.map((o) => ({ id: o.id, total: o.total, status: o.status })),
      ...ingredients.map((i) => ({ id: i.id, quantity: i.balance!.quantityMilli })),
      ...transactions.map((t) => ({ id: t.id, requestHash: t.requestHash })),
    );
  }
  stage = 'owner APIs';
  const apiChecks = [];
  for (const endpoint of [
    'owner/overview',
    'owner/revenue?period=month',
    'owner/menu-profit?period=month',
    'owner/branches',
    'owner/subscription',
    'inventory/summary',
  ]) {
    const started = Date.now();
    const result = await request(app)
      .get(`/api/business/${businessId}/${endpoint}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(result.status, 200, endpoint);
    if (endpoint === 'owner/overview') assert(result.body.data.orderCount > 0);
    if (endpoint.startsWith('owner/revenue')) assert(result.body.data.categories.length > 0);
    if (endpoint === 'owner/branches')
      assert(result.body.data.every((b: { revenueVnd: number }) => b.revenueVnd > 0));
    apiChecks.push({ endpoint, status: result.status, milliseconds: Date.now() - started });
  }
  stage = 'atomic POS and stock rollback';
  const rollback = new Error('ROLLBACK_VERIFICATION');
  const branchId = demoId('branch:0'),
    ingredientId = demoId('ingredient:0:0');
  const before = (await db.orm.public.InventoryBalance.where({ ingredientId }).first())!
    .quantityMilli;
  await db
    .transaction(async (tx) =>
      salesTransaction.run(tx, async () => {
        const order = await createOrder({
          branchId,
          cashierId: demoId('user:staff.demo'),
          orderType: 'TAKEAWAY',
          items: [{ menuItemId: demoId('menu:0:1'), quantity: 1 }],
          paymentMethod: 'CASH',
        });
        assert.equal(order.status, 'PAID');
        assert.equal(
          (await tx.orm.public.InventoryBalance.where({ ingredientId }).first())!.quantityMilli,
          before - 18000,
        );
        await notifyInventoryConsumption(order.id);
        assert.equal(
          (await tx.orm.public.InventoryBalance.where({ ingredientId }).first())!.quantityMilli,
          before - 18000,
        );
        assert.equal(
          (await tx.orm.public.StockTransaction.where({ orderId: order.id }).all()).length,
          1,
        );
        throw rollback;
      }),
    )
    .catch((e) => {
      if (e !== rollback) throw e;
    });
  assert.equal(
    (await db.orm.public.InventoryBalance.where({ ingredientId }).first())!.quantityMilli,
    before,
  );
  stage = 'insufficient-stock rollback';
  const orderCount = (await db.orm.public.Order.where({ branchId }).all()).length;
  await assert.rejects(
    createOrder({
      branchId,
      cashierId: demoId('user:staff.demo'),
      orderType: 'TAKEAWAY',
      items: [{ menuItemId: demoId('menu:0:4'), quantity: 10000 }],
      paymentMethod: 'CASH',
    }),
  );
  assert.equal((await db.orm.public.Order.where({ branchId }).all()).length, orderCount);
  assert.equal(
    (await db.orm.public.InventoryBalance.where({ ingredientId }).first())!.quantityMilli,
    before,
  );
  const hash = createHash('sha256')
    .update(JSON.stringify(fingerprint.sort((a, b) => a.id.localeCompare(b.id))))
    .digest('hex');
  console.log(
    JSON.stringify(
      {
        business: business.name,
        businessId,
        branches: summary,
        apiChecks,
        atomicSale: 'verified and rolled back',
        fingerprint: hash,
      },
      null,
      2,
    ),
  );
}
verify()
  .then(() => process.exit(0))
  .catch(() => {
    console.error(
      `Demo verification failed at: ${stage}. Credentials and response bodies suppressed.`,
    );
    process.exit(1);
  });
