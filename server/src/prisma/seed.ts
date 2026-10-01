import 'dotenv/config';
import bcrypt from 'bcrypt';
import { db } from './db.js';
import {
  accounts,
  branches,
  businessId,
  buildDemo,
  categories,
  DEMO_DATE,
  demoId,
  menu,
  START_DATE,
} from './demo-data.js';
import { insertDemoRows } from './seed-insert.js';

export async function seedDemo() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true')
    throw new Error('Production demo seeding requires ALLOW_DEMO_SEED=true.');
  const password =
    process.env.DEMO_PASSWORD || (process.env.NODE_ENV !== 'production' ? 'NextvnDemo@2026' : '');
  if (password.length < 8 || Buffer.byteLength(password) > 72)
    throw new Error('Set DEMO_PASSWORD to 8+ characters, at most 72 UTF-8 bytes.');
  const data = await buildDemo();
  const passwordHash = await bcrypt.hash(password, 12);
  const createdAt = new Date(`${START_DATE}T07:00:00+07:00`).toISOString();
  const stamps = { createdAt, updatedAt: createdAt };
  const seeded = await db.transaction(async (tx) => {
    await tx.query(
      db.raw.sql`SELECT pg_advisory_xact_lock(20260825)`
        .returnsRow({ pg_advisory_xact_lock: 'pg/text@1' })
        .build(),
    );
    const existing = await tx.orm.public.Business.where({ id: businessId }).first();
    if (existing) {
      if (existing.name !== 'Mây Coffee & Tea')
        throw new Error('Demo ID belongs to another business; refusing to modify it.');
      return false;
    }
    for (const [username] of accounts) {
      if (
        (await tx.orm.public.User.where({ username }).first()) ||
        (await tx.orm.public.User.where({ email: `${username}@nextvn.local` }).first())
      )
        throw new Error(`Account collision: ${username}. No records changed.`);
    }
    await tx.orm.public.Business.create({ id: businessId, name: 'Mây Coffee & Tea', ...stamps });
    for (let b = 0; b < 2; b++)
      await tx.orm.public.Branch.create({
        id: demoId(`branch:${b}`),
        businessId,
        name: branches[b].name,
        address: branches[b].address,
        isActive: true,
        ...stamps,
      });
    for (const [username, fullName, role, b] of accounts) {
      const userId = demoId(`user:${username}`);
      await tx.orm.public.User.create({
        id: userId,
        username,
        email: `${username}@nextvn.local`,
        fullName,
        passwordHash,
        status: 'ACTIVE',
        platformRole: 'USER',
        ...stamps,
      });
      await tx.orm.public.BusinessMember.create({
        id: demoId(`membership:${username}`),
        businessId,
        userId,
        role,
        branchId: b === null ? null : demoId(`branch:${b}`),
        isActive: true,
        ...stamps,
      });
    }
    await tx.orm.public.BusinessSettings.create({
      businessId,
      currency: 'VND',
      locale: 'vi-VN',
      taxRate: 0,
      serviceChargeRate: 0,
      address: 'Đà Nẵng, Việt Nam',
      contactEmail: 'owner.demo@nextvn.local',
      receiptTitle: 'Mây Coffee & Tea',
      receiptFooter: 'Cảm ơn bạn! Mở cửa mỗi ngày 07:00–22:00.',
      invoicePrefix: 'MAY',
      notifyLowStock: true,
      notifyNearExpiry: true,
      ...stamps,
    });
    for (const [code, price] of [
      ['FREE', 0],
      ['STANDARD', 199000],
      ['PRO', 399000],
    ] as const) {
      if (!(await tx.orm.public.SubscriptionPlan.where({ code }).first()))
        await tx.orm.public.SubscriptionPlan.create({
          id: demoId(`plan:${code}`),
          code,
          name: code,
          description: 'Gói dịch vụ NextVN',
          monthlyPriceVnd: price,
          annualPriceVnd: price * 10,
          isActive: true,
          ...stamps,
        });
    }
    const plan = await tx.orm.public.SubscriptionPlan.where({ code: 'STANDARD' }).first();
    await tx.orm.public.BusinessSubscription.create({
      id: demoId('subscription'),
      businessId,
      planId: plan!.id,
      status: 'ACTIVE',
      startedAt: createdAt,
      periodEndsAt: '2026-10-25T00:00:00+07:00',
      providerReference: 'demo:internal:no-payment',
      ...stamps,
    });
    await tx.orm.public.BillingRecord.create({
      id: demoId('billing'),
      businessId,
      subscriptionId: demoId('subscription'),
      amountVnd: 199000,
      currency: 'VND',
      status: 'PENDING',
      providerReference: 'demo:internal:unpaid',
      createdAt,
    });
    const rows: Record<string, Record<string, unknown>[]> = {};
    const add = (table: string, row: Record<string, unknown>) => (rows[table] ??= []).push(row);
    for (let b = 0; b < 2; b++) {
      const branchId = demoId(`branch:${b}`),
        scope = { businessId, branchId },
        state = data.states[b];
      categories.forEach((name, i) =>
        add('MenuCategory', {
          id: demoId(`category:${b}:${i}`),
          branchId,
          name,
          displayOrder: i,
          isActive: true,
          ...stamps,
        }),
      );
      menu.forEach((m, i) =>
        add('MenuItem', {
          id: demoId(`menu:${b}:${i}`),
          branchId,
          categoryId: demoId(`category:${b}:${m.category}`),
          name: m.name,
          description: 'Thực đơn Mây Coffee & Tea',
          price: m.price,
          isActive: true,
          ...stamps,
        }),
      );
      add('RestaurantArea', {
        id: demoId(`area:${b}`),
        branchId,
        name: 'Tầng trệt',
        displayOrder: 0,
        ...stamps,
      });
      for (let n = 0; n < 6; n++)
        add('RestaurantTable', {
          id: demoId(`table:${b}:${n}`),
          branchId,
          areaId: demoId(`area:${b}`),
          name: `Bàn ${n + 1}`,
          seats: 4,
          status: 'AVAILABLE',
          ...stamps,
        });
      state.ingredients.forEach((i) => {
        add('Ingredient', { id: i.id, ...scope, name: i.name, category: i.category, unit: i.unit });
        add('InventoryBalance', {
          id: demoId(`balance:${i.id}`),
          ingredientId: i.id,
          quantityMilli: i.quantityMilli,
          minimumMilli: i.minimumMilli,
          unitCost: i.unitCost,
        });
      });
      state.lots.forEach((l) => add('InventoryLot', { ...l }));
      state.recipes.forEach((r) => {
        add('Recipe', {
          id: r.id,
          ...scope,
          menuItemId: r.menuItemId,
          name: r.name,
          sellingPrice: r.sellingPrice,
          version: r.version,
          modifiers: [],
        });
        r.ingredients.forEach((p) =>
          add('RecipeIngredient', {
            id: demoId(`part:${r.id}:${p.ingredientId}`),
            recipeId: r.id,
            ...p,
            modifierKey: '',
          }),
        );
      });
      state.transactions.forEach((t) => add('StockTransaction', { ...t, ...scope }));
      state.alerts.forEach((a) => add('InventoryAlert', { ...a, ...scope }));
    }
    data.shifts.forEach((s) =>
      add('Shift', { ...s, status: 'CLOSED', createdAt: s.startedAt, updatedAt: s.endedAt }),
    );
    data.orders.forEach((o) => {
      const b = o.branchId === demoId('branch:0') ? 0 : 1;
      add('Order', {
        id: o.id,
        branchId: o.branchId,
        shiftId: o.shiftId,
        cashierId: o.cashierId,
        orderType: 'TAKEAWAY',
        status: o.status,
        subtotal: o.total,
        discount: 0,
        total: o.total,
        note: 'Demo lịch sử',
        createdAt: o.createdAt,
        updatedAt: o.createdAt,
      });
      o.lines.forEach((l, n) =>
        add('OrderItem', {
          id: demoId(`line:${o.id}:${n}`),
          orderId: o.id,
          menuItemId: demoId(`menu:${b}:${l.index}`),
          name: menu[l.index].name,
          unitPrice: menu[l.index].price,
          quantity: l.quantity,
          total: menu[l.index].price * l.quantity,
          createdAt: o.createdAt,
          updatedAt: o.createdAt,
        }),
      );
      if (o.status === 'PAID')
        add('OrderPayment', {
          id: demoId(`payment:${o.id}`),
          orderId: o.id,
          method: o.payment,
          amount: o.total,
          createdAt: o.createdAt,
        });
    });
    await insertDemoRows(tx, rows);
    return true;
  });
  console.log(
    seeded
      ? 'Demo tenant created.'
      : 'Demo tenant already exists; preserved all records and current stock.',
  );
  console.log(
    `Accounts: ${accounts.map((a) => a[0]).join(', ')}. Password: DEMO_PASSWORD (development fallback documented).`,
  );
  console.log(`Business: ${businessId}; fixture period: ${START_DATE}–${DEMO_DATE}`);
}
seedDemo()
  .then(() => process.exit(0))
  .catch(() => {
    console.error(
      'Demo seed failed; transaction rolled back. Check DB readiness, account collisions, and demo environment settings. No credentials printed.',
    );
    process.exit(1);
  });
