import { z } from 'zod';

export const menuCategorySchema = z.object({
  name: z.string().min(1, 'Tên danh mục không được để trống.'),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const menuItemSchema = z.object({
  categoryId: z.string().uuid('Mã danh mục không hợp lệ.'),
  name: z.string().min(1, 'Tên món không được để trống.'),
  description: z.string().optional(),
  price: z.number().int().positive('Giá phải lớn hơn 0.'),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

export const menuQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
  activeOnly: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
});
