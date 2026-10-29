import {
  ArrowLeftRight,
  BellRing,
  BookOpen,
  Boxes,
  ChartNoAxesCombined,
  Clock3,
  ClipboardList,
  ClipboardCheck,
  ScrollText,
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
      { path: '/app/sales-settings', label: 'Cấu hình bán hàng', icon: Settings },
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
export function getShellSections(role?: BusinessRole | 'SYSTEM_ADMIN'): readonly ShellSection[] {
  if (role === 'SYSTEM_ADMIN')
    return [
      {
        title: 'Quản trị nền tảng',
        items: [
          { path: '/app/admin', label: 'Tổng quan', icon: LayoutDashboard, end: true },
          { path: '/app/admin/approvals', label: 'Phê duyệt doanh nghiệp', icon: ClipboardCheck },
          { path: '/app/admin/businesses', label: 'Doanh nghiệp', icon: Store },
          { path: '/app/admin/owners', label: 'Chủ doanh nghiệp', icon: Users },
          { path: '/app/admin/subscriptions', label: 'Gói dịch vụ', icon: CreditCard },
          { path: '/app/admin/audit-logs', label: 'Nhật ký quản trị', icon: ScrollText },
        ],
      },
    ];
  if (role === 'OWNER') return owner;
  if (role === 'MANAGER')
    return [
      {
        ...sales,
        items: [
          ...sales.items,
          { path: '/app/sales-settings', label: 'Cấu hình bán hàng', icon: Settings },
        ],
      },
      inventory,
    ];
  return [sales];
}
export function getShellDestination(pathname: string, role?: BusinessRole | 'SYSTEM_ADMIN') {
  return getShellSections(role)
    .flatMap((section) => section.items)
    .find((item) => item.path === pathname);
}
export const roleLabels: Record<BusinessRole | 'SYSTEM_ADMIN', string> = {
  SYSTEM_ADMIN: 'Quản trị viên hệ thống',
  STAFF: 'Nhân viên',
  MANAGER: 'Quản lý',
  OWNER: 'Chủ doanh nghiệp',
};
