import type { ReactNode } from 'react';
import { WorkspaceSessionContext } from './workspaceContext';
import { useWorkspaceQuery, WorkspaceAccessRestricted } from './workspaceQuery';
import { Navigate } from 'react-router-dom';
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const query = useWorkspaceQuery();
  if (query.error instanceof WorkspaceAccessRestricted)
    return <Navigate to="/onboarding" replace />;
  return (
    <WorkspaceSessionContext.Provider
      value={query.isSuccess ? { context: query.data, isPreview: false } : null}
    >
      {children}
    </WorkspaceSessionContext.Provider>
  );
}
