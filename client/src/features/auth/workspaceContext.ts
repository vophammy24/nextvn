import { createContext, useContext } from 'react';
import type { WorkspaceContext } from '@/stores/workspace';
export const WorkspaceSessionContext = createContext<{
  context: WorkspaceContext;
  isPreview: boolean;
} | null>(null);
export function useWorkspace() {
  const value = useContext(WorkspaceSessionContext);
  if (!value) throw new Error('WorkspaceSessionContext is required');
  return value;
}
