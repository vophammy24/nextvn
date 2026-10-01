import { createHash } from 'node:crypto';
import {
  emptyState,
  unitLabel,
  type BaseUnit,
  type InventoryState,
  type InventoryStore,
} from '../inventory/domain.js';
import { InventoryService, evaluateAlerts } from '../inventory/service.js';
export const DEMO_DATE = '2026-10-01';
export const START_DATE = '2026-08-25';
export const demoId = (key: string) => {
  const h = createHash('sha256').update(`nextvn:may-demo:v1:${key}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
export const businessId = demoId('business');
export const accounts = [
  ['owner.demo', 'Nguyễn Minh Anh', 'OWNER', null],
  ['manager.haichau', 'Trần Quốc Huy', 'MANAGER', 0],
  ['manager.sontra', 'Lê Thanh Vy', 'MANAGER', 1],
  ['staff.demo', 'Phạm Gia Bảo', 'STAFF', 0],
] as const;
export const branches = [
  {
    name: 'Mây Coffee Hải Châu',
    address: 'Hải Châu, Đà Nẵng',
    description: 'Chi nhánh trung tâm, lượng khách cao vào buổi sáng và chiều.',
  },
  {
    name: 'Mây Coffee Sơn Trà',
    address: 'Sơn Trà, Đà Nẵng',
    description: 'Chi nhánh gần khu dân cư và khu du lịch, lượng khách cao vào chiều tối.',
  },
];
export const categories = ['Cà phê', 'Trà', 'Matcha & Chocolate', 'Đá xay', 'Bánh ngọt'];
// Cost per base unit (g/ml/piece), final stock, minimum, shelf life in days.
export const ingredients: {
  name: string;
  unit: BaseUnit;
  cost: number;
  stock: number;
  minimum: number;
  life: number;
}[] = [
  ['Cà phê hạt', 'G', 270, 7200, 1500, 150],
  ['Sữa tươi', 'ML', 35, 30000, 5000, 7],
  ['Sữa đặc', 'ML', 65, 10000, 2000, 120],
  ['Kem tươi', 'ML', 125, 2000, 500, 7],
  ['Bột matcha', 'G', 950, 850, 900, 240],
  ['Bột chocolate', 'G', 230, 2000, 400, 240],
  ['Trà đen', 'G', 220, 2000, 400, 240],
  ['Syrup đào', 'ML', 150, 6000, 1000, 240],
  ['Syrup vải', 'ML', 145, 5000, 1000, 240],
  ['Syrup caramel', 'ML', 160, 5000, 1000, 240],
  ['Mật ong', 'ML', 160, 2000, 400, 365],
  ['Cam tươi', 'G', 32, 5000, 1000, 8],
  ['Sả', 'G', 35, 1000, 200, 10],
  ['Đào miếng', 'G', 95, 700, 800, 10],
  ['Vải', 'G', 100, 2500, 600, 10],
  ['Đá viên', 'G', 2, 25000, 3000, 2],
  ['Đường', 'G', 24, 6000, 1000, 400],
  ['Bánh cookies', 'PIECE', 3500, 100, 20, 120],
  ['Croissant bơ', 'PIECE', 18000, 28, 8, 2],
  ['Tiramisu', 'PIECE', 25000, 20, 4, 3],
  ['Chanh tươi', 'G', 30, 3000, 500, 8],
].map(([name, unit, cost, stock, minimum, life]) => ({
  name: name as string,
  unit: unit as BaseUnit,
  cost: cost as number,
  stock: stock as number,
  minimum: minimum as number,
  life: life as number,
}));
type Menu = { name: string; price: number; category: number; parts: [number, number][] };
export const menu: Menu[] = [
  {
    name: 'Cà phê đen',
    price: 29000,
    category: 0,
    parts: [
      [0, 22],
      [16, 12],
      [15, 160],
    ],
  },
  {
    name: 'Cà phê sữa',
    price: 32000,
    category: 0,
    parts: [
      [0, 18],
      [2, 28],
      [15, 160],
    ],
  },
  {
    name: 'Bạc xỉu',
    price: 35000,
    category: 0,
    parts: [
      [0, 10],
      [1, 100],
      [2, 25],
      [15, 160],
    ],
  },
  {
    name: 'Americano',
    price: 35000,
    category: 0,
    parts: [
      [0, 24],
      [15, 160],
    ],
  },
  {
    name: 'Latte',
    price: 42000,
    category: 0,
    parts: [
      [0, 18],
      [1, 180],
    ],
  },
  {
    name: 'Cappuccino',
    price: 42000,
    category: 0,
    parts: [
      [0, 18],
      [1, 150],
    ],
  },
  {
    name: 'Trà đào cam sả',
    price: 39000,
    category: 1,
    parts: [
      [6, 5],
      [7, 20],
      [11, 40],
      [12, 5],
      [13, 30],
      [15, 180],
    ],
  },
  {
    name: 'Trà vải',
    price: 39000,
    category: 1,
    parts: [
      [6, 5],
      [8, 25],
      [14, 40],
      [15, 180],
    ],
  },
  {
    name: 'Trà chanh mật ong',
    price: 35000,
    category: 1,
    parts: [
      [6, 5],
      [10, 25],
      [20, 60],
      [15, 180],
    ],
  },
  {
    name: 'Matcha Latte',
    price: 45000,
    category: 2,
    parts: [
      [4, 5],
      [1, 180],
      [16, 12],
      [15, 140],
    ],
  },
  {
    name: 'Chocolate Latte',
    price: 42000,
    category: 2,
    parts: [
      [5, 22],
      [1, 180],
      [16, 12],
      [15, 140],
    ],
  },
  {
    name: 'Caramel Coffee Frappe',
    price: 49000,
    category: 3,
    parts: [
      [0, 18],
      [1, 100],
      [9, 25],
      [3, 15],
      [15, 200],
    ],
  },
  {
    name: 'Cookies & Cream',
    price: 49000,
    category: 3,
    parts: [
      [1, 120],
      [17, 2],
      [3, 20],
      [15, 200],
    ],
  },
  { name: 'Croissant bơ', price: 32000, category: 4, parts: [[18, 1]] },
  { name: 'Tiramisu', price: 42000, category: 4, parts: [[19, 1]] },
];
export type DemoOrder = {
  id: string;
  branchId: string;
  cashierId: string;
  shiftId: string;
  status: 'PAID' | 'CANCELLED';
  createdAt: string;
  total: number;
  payment: 'CASH' | 'BANK_TRANSFER';
  lines: { index: number; quantity: number }[];
};
const addDays = (date: string, n: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
export async function buildDemo() {
  let seed = 20260825;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const orders: DemoOrder[] = [];
  const shifts: {
    id: string;
    branchId: string;
    staffId: string;
    startedAt: string;
    endedAt: string;
  }[] = [];
  const states: InventoryState[] = [];
  const popular = [0, 1, 1, 1, 1, 2, 2, 2, 3, 4, 4, 5, 6, 6, 6, 7, 8, 9, 9, 10, 11, 12];
  for (let b = 0; b < 2; b++) {
    const branchId = demoId(`branch:${b}`),
      cashierId = demoId(`user:${b === 0 ? 'staff.demo' : 'manager.sontra'}`);
    const state = emptyState();
    states.push(state);
    let now = new Date(`${START_DATE}T06:00:00+07:00`);
    const store: InventoryStore = {
      branches: async () => [],
      transaction: async (_scope, run) => run(state),
    };
    const service = new InventoryService(store, () => now);
    const scope = { businessId, branchId };
    const principal = {
      ...scope,
      userId: demoId(`user:${b === 0 ? 'manager.haichau' : 'manager.sontra'}`),
      role: 'MANAGER' as const,
      branchIds: [branchId],
    };
    state.ingredients = ingredients.map((i, n) => ({
      id: demoId(`ingredient:${b}:${n}`),
      name: i.name,
      unit: i.unit,
      category: n >= 18 && n <= 19 ? 'Bánh' : 'Nguyên liệu pha chế',
      quantityMilli: 0,
      minimumMilli: i.minimum * 1000,
      unitCost: i.cost,
    }));
    state.recipes = menu.map((m, n) => ({
      id: demoId(`recipe:${b}:${n}`),
      menuItemId: demoId(`menu:${b}:${n}`),
      name: m.name,
      sellingPrice: m.price,
      version: 1,
      modifiers: [],
      ingredients: m.parts.map(([i, q]) => ({
        ingredientId: state.ingredients[i].id,
        quantityMilli: q * 1000,
      })),
    }));
    for (let d = 0; d < 38; d++) {
      const date = addDays(START_DATE, d),
        weekend = [0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay());
      for (let half = 0; half < (d === 37 ? 1 : 2); half++)
        shifts.push({
          id: demoId(`shift:${b}:${d}:${half}`),
          branchId,
          staffId: cashierId,
          startedAt: new Date(`${date}T${half ? '14:00' : '06:45'}:00+07:00`).toISOString(),
          endedAt: new Date(
            `${date}T${d === 37 ? '11:00' : half ? '22:15' : '14:00'}:00+07:00`,
          ).toISOString(),
        });
      const count = (b === 0 ? 7 : 5) + (weekend ? 2 : 0);
      for (let n = 0; n < count; n++) {
        const morning = n < count * (b === 0 ? 0.55 : 0.35);
        const minute =
          d === 37
            ? 450 + Math.floor(random() * 150)
            : morning
              ? (weekend ? 540 : 450) + Math.floor(random() * 150)
              : (weekend ? 900 : 840) + Math.floor(random() * (weekend ? 300 : 210));
        const createdAt = new Date(
          `${date}T${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}:00+07:00`,
        ).toISOString();
        const index = popular[Math.floor(random() * popular.length)];
        const lines = [{ index, quantity: random() < 0.15 ? 2 : 1 }];
        if (random() < 0.38) lines.push({ index: [9, 6].includes(index) ? 14 : 13, quantity: 1 });
        orders.push({
          id: demoId(`order:${b}:${d}:${n}`),
          branchId,
          cashierId,
          shiftId: demoId(`shift:${b}:${d}:${minute < 840 ? 0 : 1}`),
          createdAt,
          status: random() < 0.035 ? 'CANCELLED' : 'PAID',
          payment: random() < 0.65 ? 'BANK_TRANSFER' : 'CASH',
          lines,
          total: lines.reduce((s, l) => s + menu[l.index].price * l.quantity, 0),
        });
      }
    }
    // Replay chronologically. Fresh stock is replenished daily, dry goods every four days.
    const branchOrders = orders
      .filter((o) => o.branchId === branchId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (let d = 0; d < 38; d++) {
      const date = addDays(START_DATE, d);
      now = new Date(`${date}T06:00:00+07:00`);
      const horizon = addDays(date, 4);
      for (let i = 0; i < ingredients.length; i++) {
        const spec = ingredients[i];
        if (spec.life <= 10 || d % 4 === 0) {
          const windowOrders = branchOrders.filter(
            (o) =>
              o.status === 'PAID' &&
              o.createdAt >= now.toISOString() &&
              o.createdAt <
                new Date(
                  `${spec.life <= 10 ? addDays(date, 1) : horizon}T00:00:00+07:00`,
                ).toISOString(),
          );
          const needed = windowOrders.reduce(
            (s, o) =>
              s +
              o.lines.reduce(
                (v, l) => v + (menu[l.index].parts.find(([p]) => p === i)?.[1] ?? 0) * l.quantity,
                0,
              ),
            0,
          );
          if (needed)
            await service.transact(principal, scope, {
              type: 'IMPORT',
              ingredientId: state.ingredients[i].id,
              quantity: needed,
              unit: unitLabel(spec.unit),
              unitCost: spec.cost,
              supplier: 'Nhà cung cấp demo Đà Nẵng',
              expiry: addDays(date, spec.life),
              reason: 'Nhập nguyên liệu theo lịch',
              requestKey: `import:${b}:${d}:${i}`,
            });
        }
      }
      if (d % 7 === 0) {
        now = new Date(`${date}T06:01:00+07:00`);
        for (const [i, qty] of [
          [1, 120],
          [11, 80],
          [18, 1],
        ]) {
          await service.transact(principal, scope, {
            type: 'IMPORT',
            ingredientId: state.ingredients[i].id,
            quantity: qty,
            unit: unitLabel(ingredients[i].unit),
            unitCost: ingredients[i].cost,
            supplier: 'Nhà cung cấp demo',
            expiry: addDays(date, ingredients[i].life),
            reason: 'Bổ sung lô hàng',
            requestKey: `waste-import:${b}:${d}:${i}`,
          });
          await service.transact(principal, scope, {
            type: 'WASTE',
            ingredientId: state.ingredients[i].id,
            quantity: qty,
            unit: unitLabel(ingredients[i].unit),
            reason: i === 1 ? 'Sữa hỏng khi bảo quản' : i === 11 ? 'Cam dập' : 'Bánh hỏng bao bì',
            requestKey: `waste:${b}:${d}:${i}`,
          });
        }
      }
      for (const o of branchOrders.filter(
        (o) =>
          o.createdAt >= now.toISOString() &&
          o.createdAt < new Date(`${addDays(date, 1)}T00:00:00+07:00`).toISOString(),
      )) {
        now = new Date(o.createdAt);
        if (o.status === 'PAID')
          await service.consumeSale({ ...principal, userId: cashierId }, scope, {
            orderId: o.id,
            state: o.status,
            items: o.lines.map((l) => ({
              menuItemId: demoId(`menu:${b}:${l.index}`),
              quantity: l.quantity,
              modifiers: [],
            })),
          });
      }
    }
    now = new Date(`${DEMO_DATE}T11:45:00+07:00`);
    for (let i = 0; i < ingredients.length; i++) {
      const spec = ingredients[i];
      let target = b === 0 ? spec.stock : Math.round(spec.stock * 0.75);
      if (b === 1 && i === 1) target = 4200;
      if (b === 1 && i === 14) target = 550;
      if (b === 1 && i === 19) target = 2;
      // Physical closing count, audited rather than overwriting balances.
      await service.transact(principal, scope, {
        type: 'IMPORT',
        ingredientId: state.ingredients[i].id,
        quantity: target,
        unit: unitLabel(spec.unit),
        unitCost: spec.cost,
        supplier: 'Nhà cung cấp demo Đà Nẵng',
        expiry: addDays(DEMO_DATE, spec.life),
        reason: 'Tồn kho phục vụ buổi demo',
        requestKey: `closing-import:${b}:${i}`,
      });
      await service.transact(principal, scope, {
        type: 'ADJUSTMENT',
        ingredientId: state.ingredients[i].id,
        quantity: target,
        unit: unitLabel(spec.unit),
        reason: 'Kiểm kê cuối kỳ demo',
        requestKey: `closing-count:${b}:${i}`,
      });
    }
    evaluateAlerts(state, now);
    // The service uses UUIDs for audit/lot rows; assign stable fixture IDs and remap references.
    const ids = new Map<string, string>();
    for (const [kind, rows] of [
      ['lot', state.lots],
      ['transaction', state.transactions],
      ['alert', state.alerts],
    ] as const)
      rows.forEach((row, i) => ids.set(row.id, demoId(`${kind}:${b}:${i}`)));
    const stable = JSON.parse(JSON.stringify(state), (_key, value) =>
      typeof value === 'string' ? (ids.get(value) ?? value) : value,
    ) as InventoryState;
    states[b] = stable;
  }
  return { orders, shifts, states };
}
