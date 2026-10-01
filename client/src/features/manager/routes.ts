import type { ManagerView } from './types';
export const managerViews = [
  'dashboard',
  'inventory',
  'stockTransactions',
  'recipes',
  'reports',
  'alerts',
  'staff',
] as const;
export function isManagerView(key: string): key is ManagerView {
  return (managerViews as readonly string[]).includes(key);
}
