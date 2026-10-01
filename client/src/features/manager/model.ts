import { z } from 'zod';
import type { Ingredient, InventoryStatus, Recipe, ManagerData, StaffMember } from './types';
import type { BusinessRole } from '@/app/navigation';
export const categories = [
  'Cà phê',
  'Sữa',
  'Bột',
  'Siro',
  'Topping',
  'Trái cây',
  'Nguyên liệu làm bánh',
];
export const transactionLabels = {
  IN: 'Nhập kho',
  OUT: 'Xuất kho',
  ADJUST: 'Điều chỉnh',
  WASTE: 'Hủy / Hao hụt',
} as const;
export const alertLabels = {
  NEAR_EXPIRY: 'Sắp hết hạn',
  OUT_OF_STOCK: 'Hết hàng',
  LOW_STOCK: 'Dưới mức tồn tối thiểu',
  DISCREPANCY: 'Chênh lệch tồn kho',
} as const;
export function inventoryStatus(item: Ingredient, asOf: string): InventoryStatus {
  if (item.stock <= 0) return 'OUT_OF_STOCK';
  if (item.expiry && Date.parse(`${item.expiry}T23:59:59+07:00`) - Date.parse(asOf) <= 3 * 86400000)
    return 'NEAR_EXPIRY';
  return item.stock < item.minimum ? 'LOW_STOCK' : 'IN_STOCK';
}
export function recipeCost(recipe: Recipe, data: ManagerData) {
  return Math.round(
    recipe.ingredients.reduce(
      (sum, part) =>
        sum +
        part.quantity *
          (data.ingredients.find((item) => item.id === part.ingredientId)?.costPerUnit ?? 0),
      0,
    ),
  );
}
export function canManageStaff(actorRole: BusinessRole, actorId: string, target: StaffMember) {
  return actorRole === 'MANAGER' && target.role !== 'OWNER' && target.id !== actorId;
}
export const staffDraftSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập họ tên.'),
  email: z.email('Email không đúng định dạng.'),
  role: z.enum(['STAFF', 'MANAGER'], { error: 'Quản lý không được cấp vai trò Chủ doanh nghiệp.' }),
});
export const transactionSchema = z
  .object({
    type: z.enum(['IN', 'OUT', 'ADJUST', 'WASTE']),
    ingredientId: z.string().min(1, 'Vui lòng chọn nguyên liệu.'),
    quantity: z.coerce
      .number()
      .finite('Số lượng không hợp lệ.')
      .nonnegative('Số lượng không được âm.'),
    supplier: z.string(),
    expiry: z.string(),
    note: z.string().trim().min(1, 'Vui lòng nhập lý do / ghi chú.'),
  })
  .superRefine((value, ctx) => {
    if (value.type !== 'ADJUST' && value.quantity <= 0)
      ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Số lượng phải lớn hơn 0.' });
    if (value.type === 'IN' && !value.supplier.trim())
      ctx.addIssue({ code: 'custom', path: ['supplier'], message: 'Vui lòng nhập nhà cung cấp.' });
  });
