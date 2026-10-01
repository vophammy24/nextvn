import { useWorkspaceQuery } from '@/features/auth/workspaceQuery';
import { ErrorState, LoadingState } from '@/components/common/Foundation';
import ManagerPage from '@/features/manager/ManagerPage';
import './integration.css';
export function InventoryRoute({
  view,
}: {
  view: 'inventory' | 'stockTransactions' | 'recipes' | 'alerts';
}) {
  const workspace = useWorkspaceQuery();
  return (
    <div className="inventory-integration">
      {workspace.isPending ? (
        <LoadingState />
      ) : workspace.isError ? (
        <ErrorState message={workspace.error.message} onRetry={() => void workspace.refetch()} />
      ) : workspace.data.role !== 'MANAGER' ? (
        <ErrorState message="Bạn không có quyền quản lý kho." />
      ) : (
        <ManagerPage view={view} />
      )}
    </div>
  );
}
