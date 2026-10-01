import { z } from 'zod';

export const tableStatusValues = [
  'AVAILABLE',
  'OCCUPIED',
  'RESERVED',
  'CLEANING',
  'NEED_PAYMENT',
] as const;

export const createAreaSchema = z.object({
  name: z.string().min(1, 'Tên khu vực không được để trống.'),
  displayOrder: z.number().int().min(0).optional(),
});

export const createTableSchema = z.object({
  areaId: z.string().uuid('Mã khu vực không hợp lệ.'),
  name: z.string().min(1, 'Tên bàn không được để trống.'),
  seats: z.number().int().positive().optional(),
});

export const updateTableStatusSchema = z.object({
  status: z.enum(tableStatusValues),
});
