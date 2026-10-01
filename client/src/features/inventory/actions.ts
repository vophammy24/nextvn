import { createContext, useContext } from 'react';
import type { InventorySnapshot } from './api';
interface Actions {
  pending: boolean;
  snapshot: InventorySnapshot;
  save: (path: string, method: string, data: unknown) => Promise<void>;
}
export const Context = createContext<Actions | null>(null);
export const useInventoryActions = () => useContext(Context);
