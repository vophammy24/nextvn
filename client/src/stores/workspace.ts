import { create } from 'zustand';
import type { BusinessRole } from '@/app/navigation';
// Presentation context only. Membership and authorization must come from the API.
export interface WorkspaceContext {
  user: { id: string; fullName: string };
  business: { id: string; name: string };
  branch?: { id: string; name: string };
  role: BusinessRole;
}
interface WorkspaceState {
  previewRole: BusinessRole | null;
  setPreviewRole: (role: BusinessRole | null) => void;
  context: WorkspaceContext | null;
  setContext: (context: WorkspaceContext | null) => void;
}
export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  previewRole: null,
  setPreviewRole: (previewRole) => set({ previewRole }),
  context: null,
  setContext: (context) => set({ context }),
}));
