import { z } from 'zod';
import type { SalesLine } from '@/services/salesWorkflowApi';

export const MAX_SALES_TABS = 5;
const PREFIX = 'nextvn:sales-drafts:v1:';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const lineSchema = z.object({
  menuItemId: z.string().min(1).max(100),
  quantity: z.number().int().min(1).max(999),
  note: z.string().max(500),
  modifierKeys: z.array(z.string().max(100)).max(20),
});
const tabSchema = z.object({
  id: z.uuid(),
  label: z.string().min(1).max(40),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  orderId: z.uuid().nullable(),
  savedRevision: z.number().int().positive().nullable(),
  status: z.enum(['DRAFT', 'OPEN', 'PAID', 'CANCELLED']),
  dirty: z.boolean(),
  lines: z.array(lineSchema).max(100),
  orderType: z.enum(['TAKEAWAY', 'DINE_IN']),
  orderingMode: z.enum(['COUNTER', 'TABLE']),
  tableId: z.uuid().nullable(),
  timing: z.enum(['NOW', 'LATER']),
  method: z.enum(['CASH', 'BANK_TRANSFER']),
  note: z.string().max(1000),
  discount: z.number().min(0).max(1_000_000_000),
});
const storeSchema = z.object({
  version: z.literal(1),
  storedAt: z.number().int().positive(),
  activeId: z.uuid(),
  tabs: z.array(tabSchema).min(1).max(MAX_SALES_TABS),
});

export type SalesDraftTab = z.infer<typeof tabSchema> & { lines: SalesLine[] };
export type SalesDraftStore = { tabs: SalesDraftTab[]; activeId: string };

export function newSalesTab(label: string, overrides: Partial<SalesDraftTab> = {}): SalesDraftTab {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    label,
    createdAt: now,
    updatedAt: now,
    orderId: null,
    savedRevision: null,
    status: 'DRAFT',
    dirty: false,
    lines: [],
    orderType: 'TAKEAWAY',
    orderingMode: 'COUNTER',
    tableId: null,
    timing: 'NOW',
    method: 'CASH',
    note: '',
    discount: 0,
    ...overrides,
  };
}

export function salesDraftScope(userId: string, businessId: string, branchId: string) {
  return `${PREFIX}${encodeURIComponent(userId)}:${encodeURIComponent(businessId)}:${encodeURIComponent(branchId)}`;
}

export function isSalesId(value: string | null): value is string {
  return !!value && z.uuid().safeParse(value).success;
}

export function loadSalesTabs(scope: string | null): SalesDraftStore {
  const fresh = newSalesTab('Khách 01');
  const fallback = { tabs: [fresh], activeId: fresh.id };
  if (!scope) return fallback;
  try {
    const raw = sessionStorage.getItem(scope);
    if (!raw) return fallback;
    const parsed = storeSchema.safeParse(JSON.parse(raw));
    if (
      !parsed.success ||
      Date.now() - parsed.data.storedAt > MAX_AGE_MS ||
      parsed.data.storedAt > Date.now() + 60_000 ||
      !parsed.data.tabs.some((tab) => tab.id === parsed.data.activeId) ||
      new Set(parsed.data.tabs.map((tab) => tab.id)).size !== parsed.data.tabs.length ||
      new Set(parsed.data.tabs.filter((tab) => tab.orderId).map((tab) => tab.orderId)).size !==
        parsed.data.tabs.filter((tab) => tab.orderId).length
    ) {
      sessionStorage.removeItem(scope);
      return fallback;
    }
    return { tabs: parsed.data.tabs, activeId: parsed.data.activeId };
  } catch {
    sessionStorage.removeItem(scope);
    return fallback;
  }
}

export function saveSalesTabs(scope: string | null, state: SalesDraftStore) {
  if (!scope) return;
  try {
    const value = storeSchema.safeParse({ version: 1, storedAt: Date.now(), ...state });
    if (value.success) sessionStorage.setItem(scope, JSON.stringify(value.data));
  } catch {
    // The tab remains usable in memory if session storage is unavailable or full.
  }
}

export function clearSalesDraftTabs() {
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index--) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    // Logging out must continue even if storage is unavailable.
  }
}
