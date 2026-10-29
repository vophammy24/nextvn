import { createHash } from 'node:crypto';
import { z } from 'zod';

export class SalesError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export const deny = (status: number, code: string, message: string): never => {
  throw new SalesError(status, code, message);
};
export const uuid = z.uuid('Mã định danh không hợp lệ.');
export const settingsInput = z
  .object({
    serviceType: z.enum(['TAKEAWAY', 'DINE_IN', 'BOTH']),
    counterPaymentPolicy: z.enum(['IMMEDIATE_ONLY', 'PAY_LATER_ALLOWED', 'STAFF_CHOICE']),
    dineInOrderingMode: z.enum(['COUNTER_ONLY', 'TABLE_ONLY', 'BOTH']),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.serviceType === 'TAKEAWAY' && value.dineInOrderingMode !== 'COUNTER_ONLY')
      context.addIssue({
        code: 'custom',
        path: ['dineInOrderingMode'],
        message: 'Chi nhánh chỉ bán mang đi không cần chế độ gọi món tại chỗ.',
      });
    if (
      value.serviceType !== 'TAKEAWAY' &&
      value.dineInOrderingMode === 'TABLE_ONLY' &&
      value.counterPaymentPolicy !== 'IMMEDIATE_ONLY'
    )
      context.addIssue({
        code: 'custom',
        path: ['counterPaymentPolicy'],
        message: 'Chi nhánh chỉ phục vụ tại bàn không dùng chính sách thu tiền tại quầy.',
      });
  });
export type SalesSettings = z.infer<typeof settingsInput>;
export const defaultSettings: SalesSettings = {
  serviceType: 'BOTH',
  counterPaymentPolicy: 'IMMEDIATE_ONLY',
  dineInOrderingMode: 'BOTH',
};
export const lineInput = z
  .object({
    menuItemId: uuid,
    quantity: z.number().int().positive().max(1000),
    note: z.string().trim().max(500).default(''),
    modifierKeys: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  })
  .strict();
export const orderInput = z
  .object({
    requestKey: uuid,
    branchId: uuid,
    orderType: z.enum(['TAKEAWAY', 'DINE_IN']),
    orderingMode: z.enum(['COUNTER', 'TABLE']),
    paymentTiming: z.enum(['NOW', 'LATER']),
    tableId: uuid.nullable().default(null),
    items: z.array(lineInput).min(1).max(200),
    note: z.string().trim().max(1000).default(''),
    discount: z.number().int().nonnegative().default(0),
  })
  .strict();
export const checkoutInput = orderInput.extend({
  method: z.enum(['CASH', 'BANK_TRANSFER']),
  confirmed: z.literal(true),
  expectedTotal: z.number().int().nonnegative(),
});
export const editInput = z
  .object({
    revision: z.number().int().positive(),
    items: z.array(lineInput).min(1).max(200),
    note: z.string().trim().max(1000).default(''),
    discount: z.number().int().nonnegative().default(0),
  })
  .strict();
export const payInput = z
  .object({
    method: z.enum(['CASH', 'BANK_TRANSFER']),
    confirmed: z.literal(true, { error: 'Cần xác nhận đã nhận đủ tiền.' }),
  })
  .strict();
export const transferInput = z.object({ tableId: uuid }).strict();
export const nameInput = z.string().trim().min(1).max(200);
export const areaInput = z.object({ name: nameInput }).strict();
export const tableInput = z
  .object({ areaId: uuid, name: nameInput, seats: z.number().int().positive().max(100).default(4) })
  .strict();
export const activeInput = z.object({ isActive: z.boolean() }).strict();
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    return deny(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ.');
  return parsed.data;
}
export const hash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function validateFlow(
  settings: SalesSettings,
  order: z.infer<typeof orderInput>,
  timing: 'NOW' | 'LATER',
) {
  if (settings.serviceType !== 'BOTH' && settings.serviceType !== order.orderType)
    deny(409, 'SERVICE_DISABLED', 'Loại phục vụ chưa được bật tại chi nhánh.');
  if (order.orderType === 'TAKEAWAY' && (order.orderingMode !== 'COUNTER' || order.tableId))
    deny(400, 'FLOW_INVALID', 'Đơn mang đi không gắn bàn.');
  if (order.orderType === 'DINE_IN') {
    if (settings.dineInOrderingMode === 'COUNTER_ONLY' && order.orderingMode !== 'COUNTER')
      deny(409, 'TABLE_DISABLED', 'Chi nhánh chưa bật phục vụ tại bàn.');
    if (settings.dineInOrderingMode === 'TABLE_ONLY' && order.orderingMode !== 'TABLE')
      deny(409, 'COUNTER_DISABLED', 'Chi nhánh yêu cầu chọn bàn.');
  }
  if (order.orderingMode === 'TABLE' && (!order.tableId || order.orderType !== 'DINE_IN'))
    deny(400, 'TABLE_REQUIRED', 'Đơn phục vụ tại bàn cần bàn hợp lệ.');
  if (order.orderingMode === 'COUNTER' && order.tableId)
    deny(400, 'FLOW_INVALID', 'Đơn tại quầy không gắn bàn.');
  if (order.orderingMode === 'TABLE' && timing === 'NOW')
    deny(409, 'PAY_LATER_REQUIRED', 'Đơn tại bàn thanh toán khi khách kết thúc.');
  if (
    order.orderingMode === 'COUNTER' &&
    settings.counterPaymentPolicy === 'IMMEDIATE_ONLY' &&
    timing !== 'NOW'
  )
    deny(409, 'PAY_NOW_REQUIRED', 'Chi nhánh yêu cầu thanh toán tại quầy ngay.');
}
