import { z } from 'zod';

export const createOrderSchema = z.object({
  branchId: z.string().uuid('Mã chi nhánh không hợp lệ.'),
  tableId: z.string().uuid().nullable().optional(),
  orderType: z.enum(['DINE_IN', 'TAKEAWAY']),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid('Mã món không hợp lệ.'),
        quantity: z.number().int().positive('Số lượng phải lớn hơn 0.'),
        note: z.string().optional(),
      }),
    )
    .min(1, 'Đơn hàng phải có ít nhất 1 món.'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER']),
  discount: z.number().int().min(0).optional(),
});

export const updateOrderStatusSchema = z
  .object({
    status: z.enum(['CONFIRMED', 'PAID', 'CANCELLED']),
    paymentMethod: z.enum(['CASH', 'BANK_TRANSFER']).optional(),
  })
  .refine(
    (data) => {
      if (data.status === 'PAID' && !data.paymentMethod) {
        return false;
      }
      return true;
    },
    { message: 'paymentMethod is required when status is PAID.' },
  );

export const orderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['OPEN', 'CONFIRMED', 'PAID', 'CANCELLED']).optional(),
  orderType: z.enum(['DINE_IN', 'TAKEAWAY']).optional(),
  today: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  shiftId: z.string().uuid().optional(),
});
