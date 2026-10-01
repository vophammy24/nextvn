import { z } from 'zod';

export const startShiftSchema = z.object({
  branchId: z.string().uuid('Mã chi nhánh không hợp lệ.'),
});

export const endShiftSchema = z.object({
  shiftId: z.string().uuid('Mã ca không hợp lệ.'),
});
