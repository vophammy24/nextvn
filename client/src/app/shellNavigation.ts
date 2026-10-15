import {
  ArrowLeftRight,
  BellRing,
  BookOpen,
  Boxes,
  ChartNoAxesCombined,
  Clock3,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LayoutGrid,
  Lightbulb,
  Settings,
  ShoppingCart,
  Store,
  Users,
  Utensils,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import type { BusinessRole } from './navigation';

export interface ShellDestination {
  path: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}
interface ShellSection {
  title: string;
  items: readonly ShellDestination[];
}
const sales: ShellSection = {
  title: 'Bán hàng',
  items: [
    { path: '/app/pos', label: 'POS / Bán hàng', icon: ShoppingCart },
    { path: '/app/tables', label: 'Quản lý bàn', icon: LayoutGrid },
    { path: '/app/orders', label: 'Đơn hàng', icon: ClipboardList },
    { path: '/app/shift', label: 'Ca làm việc', icon: Clock3 },
  ],
};
const inventory: ShellSection = {
  title: 'Quản lý kho',
  items: [
    { path: '/app/inventory', label: 'Kho hàng', icon: Boxes },
    { path: '/app/stock-transactions', label: 'Nhập / Xuất kho', icon: ArrowLeftRight },
    { path: '/app/recipes', label: 'Công thức', icon: BookOpen },
    { path: '/app/alerts', label: 'Cảnh báo', icon: BellRing },
  ],
};
const owner: ShellSection[] = [
  {
    title: 'Điều hành',
    items: [
      { path: '/app/owner', label: 'Tổng quan', icon: LayoutDashboard, end: true },
      { path: '/app/owner/branches', label: 'Chi nhánh', icon: Store },
      { path: '/app/owner/revenue', label: 'Doanh thu', icon: ChartNoAxesCombined },
      { path: '/app/owner/menu-profit', label: 'Lợi nhuận món', icon: Utensils },
      { path: '/app/owner/inventory', label: 'Tổng quan kho doanh nghiệp', icon: Warehouse },
      { path: '/app/owner/promotions', label: 'Gợi ý khuyến mãi', icon: Lightbulb },
    ],
  },
  {
    title: 'Doanh nghiệp',
    items: [
      { path: '/app/owner/users', label: 'Người dùng & vai trò', icon: Users },
      { path: '/app/owner/subscription', label: 'Gói dịch vụ', icon: CreditCard },
      { path: '/app/owner/settings', label: 'Cài đặt doanh nghiệp', icon: Settings },
    ],
  },
];

// Only mounted routes appear here. Legacy metadata contains unimplemented pages.
export function getShellSections(role?: BusinessRole): readonly ShellSection[] {
  if (role === 'OWNER') return owner;
  if (role === 'MANAGER') return [sales, inventory];
  return [sales];
}
export function getShellDestination(pathname: string, role?: BusinessRole) {
  return getShellSections(role)
    .flatMap((section) => section.items)
    .find((item) => item.path === pathname);
}
export const roleLabels: Record<BusinessRole, string> = {
  STAFF: 'Nhân viên',
  MANAGER: 'Quản lý',
  OWNER: 'Chủ doanh nghiệp',
};
