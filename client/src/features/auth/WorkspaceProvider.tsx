import type { ReactNode } from 'react';
import { WorkspaceSessionContext } from './workspaceContext';
import { useWorkspaceQuery } from './workspaceQuery';
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const query = useWorkspaceQuery();
  return (
    <WorkspaceSessionContext.Provider
      value={query.isSuccess ? { context: query.data, isPreview: false } : null}
    >
      {children}
    </WorkspaceSessionContext.Provider>
  );
}
