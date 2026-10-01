import { z } from 'zod';
import type { OwnerData, Period, Sale, BusinessUser } from './types';
import type { BusinessRole } from '@/app/navigation';
export const periodLabels = { week: 'Tuần', month: 'Tháng', quarter: 'Quý' } as const;
export function periodSales(data: OwnerData, period: Period, branchId?: string) {
  const end = data.asOf.slice(0, 10);
  const start = new Date(`${end}T00:00:00Z`);
  if (period === 'week') start.setUTCDate(start.getUTCDate() - 6);
  if (period === 'month') start.setUTCDate(1);
  if (period === 'quarter') {
    start.setUTCMonth(Math.floor(start.getUTCMonth() / 3) * 3, 1);
  }
  const from = start.toISOString().slice(0, 10);
  return data.sales.filter(
    (sale) => sale.date >= from && sale.date <= end && (!branchId || sale.branchId === branchId),
  );
}
export function totals(data: OwnerData, sales: Sale[]) {
  return sales.reduce(
    (sum, sale) => {
      const item = data.menu.find((entry) => entry.id === sale.itemId)!;
      return {
        revenue: sum.revenue + item.price * sale.quantity,
        cost: sum.cost + item.cost * sale.quantity,
        orders: sum.orders + sale.orders,
      };
    },
    { revenue: 0, cost: 0, orders: 0 },
  );
}
export function menuMetrics(data: OwnerData, sales: Sale[]) {
  return data.menu
    .map((item) => {
      const quantity = sales
        .filter((sale) => sale.itemId === item.id)
        .reduce((sum, sale) => sum + sale.quantity, 0);
      const revenue = quantity * item.price;
      const cost = quantity * item.cost;
      const margin = revenue ? ((revenue - cost) / revenue) * 100 : 0;
      return {
        ...item,
        quantity,
        revenue,
        foodCost: cost,
        profit: revenue - cost,
        margin,
        recommendation:
          quantity === 0
            ? 'Chưa đủ dữ liệu'
            : margin >= 65
              ? 'Đẩy bán'
              : margin < 45
                ? 'Tối ưu công thức'
                : 'Điều chỉnh giá',
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}
export function groupedRevenue(
  data: OwnerData,
  sales: Sale[],
  by: 'month' | 'date' | 'category' | 'hour' | 'branch',
) {
  const grouped = new Map<string, number>();
  sales.forEach((sale) => {
    const item = data.menu.find((entry) => entry.id === sale.itemId)!;
    const label =
      by === 'month'
        ? sale.date.slice(0, 7)
        : by === 'date'
          ? sale.date
          : by === 'category'
            ? item.category
            : by === 'hour'
              ? sale.hour
              : data.branches.find((branch) => branch.id === sale.branchId)!.name;
    grouped.set(label, (grouped.get(label) ?? 0) + item.price * sale.quantity);
  });
  return Array.from(grouped, ([label, value]) => ({ label, value })).sort((a, b) =>
    a.label.localeCompare(b.label, 'vi'),
  );
}
export function canEditUser(
  actor: BusinessRole,
  actorId: string,
  target: BusinessUser,
  users: BusinessUser[],
) {
  return (
    actor === 'OWNER' &&
    actorId !== target.id &&
    !(
      target.role === 'OWNER' &&
      target.status === 'ACTIVE' &&
      users.filter((user) => user.role === 'OWNER' && user.status === 'ACTIVE').length <= 1
    )
  );
}
export const userSchema = z
  .object({
    name: z.string().trim().min(1, 'Vui lòng nhập họ tên.'),
    email: z.email('Email không đúng định dạng.'),
    role: z.enum(['STAFF', 'MANAGER', 'OWNER'], { error: 'Vai trò không hợp lệ.' }),
    branchId: z.string(),
  })
  .refine((value) => value.role === 'OWNER' || !!value.branchId, {
    message: 'Vui lòng chọn chi nhánh cho nhân viên hoặc quản lý.',
    path: ['branchId'],
  });
export const branchSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên chi nhánh.'),
  location: z.string().trim().min(1, 'Vui lòng nhập địa điểm.'),
});
export const settingsSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên doanh nghiệp.'),
  email: z.email('Email không đúng định dạng.'),
  phone: z
    .string()
    .refine((value) => !value || /^\+?[\d ()-]{8,20}$/.test(value), 'Số điện thoại không hợp lệ.'),
  taxCode: z
    .string()
    .refine(
      (value) => !value || /^\d{10}(?:-?\d{3})?$/.test(value),
      'Mã số thuế gồm 10 hoặc 13 chữ số.',
    ),
  tax: z
    .number({ error: 'Vui lòng nhập tỷ lệ thuế hợp lệ.' })
    .min(0, 'Thuế không được âm.')
    .max(100, 'Thuế không được vượt quá 100%.'),
  fee: z
    .number({ error: 'Vui lòng nhập tỷ lệ phí hợp lệ.' })
    .min(0, 'Phí không được âm.')
    .max(100, 'Phí không được vượt quá 100%.'),
  invoicePrefix: z.string().trim().min(1, 'Vui lòng nhập tiền tố hóa đơn.'),
});
