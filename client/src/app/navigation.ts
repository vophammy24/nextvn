import {
  LayoutDashboard,
  ShoppingCart,
  Armchair,
  ReceiptText,
  Clock3,
  UserRound,
  Package,
  ArrowLeftRight,
  CookingPot,
  ChartNoAxesCombined,
  Bell,
  Users,
  Building2,
  TrendingUp,
  Utensils,
  Warehouse,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { copy } from '@/locales/vi';
export type BusinessRole = 'STAFF' | 'MANAGER' | 'OWNER';
export interface NavigationItem {
  key: keyof typeof copy.navigation;
  path: string;
  roles: readonly BusinessRole[];
  icon: LucideIcon;
}
const operational: readonly BusinessRole[] = ['STAFF', 'MANAGER'];
export const navigation: readonly NavigationItem[] = [
  { key: 'dashboard', path: '/app/dashboard', roles: ['MANAGER'], icon: LayoutDashboard },
  { key: 'pos', path: '/app/pos', roles: operational, icon: ShoppingCart },
  { key: 'tables', path: '/app/tables', roles: operational, icon: Armchair },
  { key: 'orders', path: '/app/orders', roles: operational, icon: ReceiptText },
  { key: 'shift', path: '/app/shift', roles: ['STAFF'], icon: Clock3 },
  { key: 'inventory', path: '/app/inventory', roles: ['MANAGER'], icon: Package },
  {
    key: 'stockTransactions',
    path: '/app/stock-transactions',
    roles: ['MANAGER'],
    icon: ArrowLeftRight,
  },
  { key: 'recipes', path: '/app/recipes', roles: ['MANAGER'], icon: CookingPot },
  { key: 'reports', path: '/app/reports', roles: ['MANAGER'], icon: ChartNoAxesCombined },
  { key: 'alerts', path: '/app/alerts', roles: ['MANAGER'], icon: Bell },
  { key: 'staff', path: '/app/staff', roles: ['MANAGER'], icon: Users },
  { key: 'owner', path: '/app/owner', roles: ['OWNER'], icon: LayoutDashboard },
  { key: 'branches', path: '/app/owner/branches', roles: ['OWNER'], icon: Building2 },
  { key: 'revenue', path: '/app/owner/revenue', roles: ['OWNER'], icon: TrendingUp },
  { key: 'menuProfit', path: '/app/owner/menu-profit', roles: ['OWNER'], icon: Utensils },
  { key: 'inventoryOverview', path: '/app/owner/inventory', roles: ['OWNER'], icon: Warehouse },
  { key: 'promotions', path: '/app/owner/promotions', roles: ['OWNER'], icon: Sparkles },
  { key: 'users', path: '/app/owner/users', roles: ['OWNER'], icon: ShieldCheck },
  { key: 'subscription', path: '/app/owner/subscription', roles: ['OWNER'], icon: CreditCard },
  { key: 'settings', path: '/app/owner/settings', roles: ['OWNER'], icon: Settings },
  { key: 'profile', path: '/app/profile', roles: ['STAFF', 'MANAGER', 'OWNER'], icon: UserRound },
];
export const getNavigation = (role: BusinessRole) =>
  navigation.filter((item) => item.roles.includes(role));
export const canAccess = (role: unknown, allowed: readonly BusinessRole[]) =>
  (role === 'STAFF' || role === 'MANAGER' || role === 'OWNER') && allowed.includes(role);
export const roleHome = (role: BusinessRole) => getNavigation(role)[0].path;
