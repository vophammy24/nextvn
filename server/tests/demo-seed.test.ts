import { beforeAll, describe, expect, it } from 'vitest';
import { buildDemo, demoId, menu, ingredients, DEMO_DATE } from '../src/prisma/demo-data.js';
let data: Awaited<ReturnType<typeof buildDemo>>;
beforeAll(async () => {
  data = await buildDemo();
});
describe('deterministic coffee demo', () => {
  it('creates two branches and realistic scoped history', () => {
    expect(data.states).toHaveLength(2);
    expect(data.orders.length).toBeGreaterThanOrEqual(300);
    expect(data.orders.length).toBeLessThanOrEqual(600);
    for (const o of data.orders) {
      expect([demoId('branch:0'), demoId('branch:1')]).toContain(o.branchId);
      const shift = data.shifts.find((s) => s.id === o.shiftId)!;
      expect(shift.branchId).toBe(o.branchId);
      expect(o.createdAt >= shift.startedAt && o.createdAt <= shift.endedAt).toBe(true);
    }
    const paid = data.orders.filter((o) => o.status === 'PAID');
    const average = paid.reduce((s, o) => s + o.total, 0) / paid.length;
    expect(average).toBeGreaterThan(40000);
    expect(average).toBeLessThan(75000);
  });
  it('keeps balances, lots and audit deltas consistent with real recipe consumption', () => {
    data.states.forEach((state, b) => {
      expect(state.ingredients).toHaveLength(ingredients.length);
      expect(state.recipes).toHaveLength(menu.length);
      for (const r of state.recipes) {
        expect(menu.some((_m, n) => r.menuItemId === demoId(`menu:${b}:${n}`))).toBe(true);
        for (const p of r.ingredients)
          expect(state.ingredients.some((i) => i.id === p.ingredientId)).toBe(true);
      }
      for (const i of state.ingredients) {
        expect(i.quantityMilli).toBeGreaterThanOrEqual(0);
        expect(
          state.lots
            .filter((l) => l.ingredientId === i.id)
            .reduce((s, l) => s + l.quantityMilli, 0),
        ).toBe(i.quantityMilli);
        expect(
          state.transactions
            .flatMap((t) => t.items)
            .filter((p) => p.ingredientId === i.id)
            .reduce((s, p) => s + p.quantityMilli, 0),
        ).toBe(i.quantityMilli);
      }
      for (const l of state.lots.filter((l) => l.quantityMilli > 0)) {
        expect(l.expiry! >= DEMO_DATE).toBe(true);
        expect(Number.isNaN(Date.parse(l.expiry!))).toBe(false);
      }
      expect(state.alerts.some((a) => a.conditionActive && a.type === 'LOW_STOCK')).toBe(true);
      expect(state.alerts.some((a) => a.conditionActive && a.type === 'NEAR_EXPIRY')).toBe(true);
      expect(state.transactions.filter((t) => t.type === 'SALE_CONSUMPTION')).toHaveLength(
        data.orders.filter((o) => o.branchId === demoId(`branch:${b}`) && o.status === 'PAID')
          .length,
      );
    });
  });
  it('rebuilds exactly the same fixture including audit hashes and IDs', async () => {
    expect(await buildDemo()).toEqual(data);
  });
});
