import { createContext, useContext } from 'react';
import type { BusinessRole } from '@/app/navigation';
// A projection of the existing authenticated session, never a second global store.
export interface WorkspaceContext {
  user: { id: string; fullName: string };
  business: { id: string; name: string };
  branch?: { id: string; name: string };
  role: BusinessRole;
}
export const WorkspaceSessionContext = createContext<{
  context: WorkspaceContext;
  isPreview: boolean;
} | null>(null);
export function useWorkspace() {
  const value = useContext(WorkspaceSessionContext);
  if (!value) throw new Error('WorkspaceSessionContext is required');
  return value;
}
