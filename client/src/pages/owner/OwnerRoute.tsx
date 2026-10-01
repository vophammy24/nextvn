import { useLocation } from 'react-router-dom';
import { useWorkspaceQuery } from '@/features/auth/workspaceQuery';
import { ErrorState, LoadingState } from '@/components/common/Foundation';
import OwnerWorkspace from './OwnerWorkspace';
export function OwnerRoute() {
  const location = useLocation();
  const workspace = useWorkspaceQuery();
  if (workspace.isPending) return <LoadingState />;
  if (workspace.isError)
    return (
      <ErrorState message={workspace.error.message} onRetry={() => void workspace.refetch()} />
    );
  if (workspace.data.role !== 'OWNER')
    return <ErrorState message="Bạn không có quyền quản trị doanh nghiệp." />;
  return <OwnerWorkspace key={workspace.data.business.id + location.pathname} />;
}
