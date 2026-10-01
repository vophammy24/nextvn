import { z } from 'zod';
export class InventoryError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export const fail = (code: string, message: string, status = 400): never => {
  throw new InventoryError(status, code, message);
};
export const units = ['g', 'kg', 'ml', 'L', 'cái'] as const;
export type Unit = (typeof units)[number];
export type BaseUnit = 'G' | 'ML' | 'PIECE';
export interface Scope {
  businessId: string;
  branchId: string;
}
export interface Principal {
  userId: string;
  businessId: string;
  role: 'STAFF' | 'MANAGER' | 'OWNER';
  branchIds: string[];
}
export interface Ingredient {
  id: string;
  name: string;
  category: string;
  unit: BaseUnit;
  quantityMilli: number;
  minimumMilli: number;
  unitCost: number;
}
export interface Lot {
  id: string;
  ingredientId: string;
  quantityMilli: number;
  expiry: string | null;
  createdAt: string;
}
export interface Part {
  ingredientId: string;
  quantityMilli: number;
}
export interface Modifier {
  key: string;
  name: string;
  priceExtra: number;
  ingredients: Part[];
}
export interface Recipe {
  id: string;
  menuItemId: string;
  name: string;
  sellingPrice: number;
  version: number;
  ingredients: Part[];
  modifiers: Modifier[];
}
export type TransactionType = 'IMPORT' | 'EXPORT' | 'WASTE' | 'ADJUSTMENT' | 'SALE_CONSUMPTION';
export interface StockItem {
  ingredientId: string;
  quantityMilli: number;
  beforeMilli: number;
  afterMilli: number;
  unitCost: number;
  unitCostBefore?: number;
  purchaseUnitCost?: number;
  lotChanges: { lotId: string; quantityMilli: number }[];
  recipeVersions?: { recipeId: string; version: number }[];
}
export interface StockTransaction {
  id: string;
  actorId: string;
  type: TransactionType;
  requestKey: string;
  requestHash: string;
  orderId: string | null;
  note: string;
  supplier: string;
  items: StockItem[];
  createdAt: string;
}
export type AlertType = 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NEAR_EXPIRY';
export interface Alert {
  id: string;
  ingredientId: string;
  type: AlertType;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  conditionActive: boolean;
  updatedAt: string;
}
export interface InventoryState {
  ingredients: Ingredient[];
  lots: Lot[];
  recipes: Recipe[];
  transactions: StockTransaction[];
  alerts: Alert[];
}
export interface InventoryStore {
  transaction<T>(scope: Scope, run: (state: InventoryState) => Promise<T> | T): Promise<T>;
  branches(businessId: string): Promise<{ id: string; name: string }[]>;
}
export function authorize(
  principal: Principal | null | undefined,
  scope: Scope,
  access: 'manage' | 'owner' | 'sale' = 'manage',
) {
  if (!principal) fail('UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.', 401);
  if (
    principal!.businessId !== scope.businessId ||
    (access === 'owner'
      ? principal!.role !== 'OWNER'
      : !principal!.branchIds.includes(scope.branchId) ||
        (access === 'manage'
          ? principal!.role !== 'MANAGER'
          : !['STAFF', 'MANAGER'].includes(principal!.role)))
  )
    fail('FORBIDDEN', 'Bạn không có quyền truy cập kho trong phạm vi này.', 403);
}
export const baseUnit = (unit: Unit): BaseUnit =>
  unit === 'kg' || unit === 'g' ? 'G' : unit === 'L' || unit === 'ml' ? 'ML' : 'PIECE';
export const unitLabel = (unit: BaseUnit) => ({ G: 'g', ML: 'ml', PIECE: 'cái' })[unit];
export function toMilli(quantity: number, unit: Unit, expected?: BaseUnit) {
  if (expected && baseUnit(unit) !== expected)
    fail('UNIT_MISMATCH', 'Đơn vị không tương thích với nguyên liệu.');
  const scaled = quantity * (unit === 'kg' || unit === 'L' ? 1_000_000 : 1000);
  const rounded = Math.round(scaled);
  if (
    !Number.isFinite(scaled) ||
    quantity < 0 ||
    (quantity > 0 && rounded === 0) ||
    rounded > 2_000_000_000 ||
    Math.abs(scaled - rounded) > 0.00001
  )
    fail('QUANTITY_INVALID', 'Số lượng vượt giới hạn hoặc có quá nhiều chữ số thập phân.');
  return rounded;
}
const amount = z
  .number({ error: 'Vui lòng nhập số hợp lệ.' })
  .finite()
  .nonnegative('Giá trị không được âm.')
  .max(1_000_000_000, 'Giá trị vượt giới hạn.');
const unit = z.enum(units, { error: 'Đơn vị không được hỗ trợ.' });
const text = z
  .string()
  .trim()
  .min(1, 'Vui lòng điền thông tin bắt buộc.')
  .max(200, 'Thông tin quá dài.');
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ.')
  .refine(
    (v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    'Ngày không hợp lệ.',
  );
export const ingredientInput = z.object({
  name: text,
  category: text,
  unit,
  minimum: amount,
  unitCost: amount,
});
export const stockInput = z
  .object({
    type: z.enum(['IMPORT', 'EXPORT', 'WASTE', 'ADJUSTMENT']),
    ingredientId: z.uuid('Mã định danh không hợp lệ.'),
    quantity: amount,
    unit,
    unitCost: amount.optional(),
    supplier: z.string().trim().max(200).default(''),
    expiry: date.nullable().default(null),
    reason: text,
    note: z.string().trim().max(1000).default(''),
    requestKey: text,
  })
  .superRefine((v, ctx) => {
    if (v.type !== 'ADJUSTMENT' && v.quantity === 0)
      ctx.addIssue({ code: 'custom', message: 'Số lượng phải lớn hơn 0.' });
    if (v.type === 'IMPORT' && (v.unitCost === undefined || !v.supplier))
      ctx.addIssue({ code: 'custom', message: 'Nhập kho cần đơn giá và nhà cung cấp.' });
  });
const partInput = z.object({
  ingredientId: z.uuid('Mã định danh không hợp lệ.'),
  quantity: amount.positive('Định lượng phải lớn hơn 0.'),
  unit,
});
export const recipeInput = z.object({
  menuItemId: text,
  name: text,
  sellingPrice: amount,
  ingredients: z.array(partInput).min(1, 'Công thức cần ít nhất một nguyên liệu.').max(100),
  modifiers: z
    .array(
      z.object({
        key: text,
        name: text,
        priceExtra: amount,
        ingredients: z.array(partInput).min(1).max(100),
      }),
    )
    .max(20)
    .default([]),
});
export const saleInput = z.object({
  orderId: text,
  state: z.enum(['PAID', 'CONFIRMED']),
  items: z
    .array(
      z.object({
        menuItemId: text,
        quantity: z.number().int().positive().max(10000),
        modifiers: z.array(text).max(20).default([]),
      }),
    )
    .min(1)
    .max(200),
});
export type StockInput = z.infer<typeof stockInput>;
export type RecipeInput = z.infer<typeof recipeInput>;
export type SaleInput = z.infer<typeof saleInput>;
export const emptyState = (): InventoryState => ({
  ingredients: [],
  lots: [],
  recipes: [],
  transactions: [],
  alerts: [],
});
export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const message = result.error.issues[0]?.message;
    fail('VALIDATION', message && /[À-ỹ]/.test(message) ? message : 'Dữ liệu không hợp lệ.');
  }
  return result.data!;
}
