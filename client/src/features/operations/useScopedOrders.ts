import { useWorkspace } from '@/features/auth/workspaceContext';
import type { OperationsData } from './types';
import type { WorkspaceContext } from '@/stores/workspace';
export function scopeOrders(data: OperationsData, context: WorkspaceContext) {
  if (
    data.businessId !== context.business.id ||
    data.branchId !== context.branch?.id ||
    context.role === 'OWNER'
  )
    return [];
  return data.orders.filter(
    (order) =>
      order.branchId === context.branch?.id &&
      (context.role === 'MANAGER' ||
        (order.cashierId === context.user.id && order.shiftId === data.shift.id)),
  );
}
export function useScopedOrders(data: OperationsData) {
  const { context } = useWorkspace();
  return scopeOrders(data, context);
}
