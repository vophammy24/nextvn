import { useRef, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '@/features/auth/workspaceContext';
import { ErrorState, LoadingState } from '@/components/common/Foundation';
import { Context } from './actions';
import { adaptInventory } from './adapter';
import type { ManagerData } from '@/features/manager/types';
import { inventoryRequest, type InventorySnapshot } from './api';
export function InventoryDataBoundary({
  children,
}: {
  children: (data: ManagerData) => ReactNode;
}) {
  const { context } = useWorkspace();
  const businessId = context.business.id;
  const branchId = context.branch?.id ?? '';
  const client = useQueryClient();
  const key = ['inventory', businessId, branchId];
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) =>
      inventoryRequest<InventorySnapshot>(businessId, branchId, '', 'GET', undefined, signal),
    enabled: !!businessId && !!branchId && context.role === 'MANAGER',
    retry: false,
  });
  // Retain a request key across ambiguous network failures, but never across changed payloads.
  const requests = useRef(new Map<string, string>());
  const mutation = useMutation({
    mutationFn: async (v: { path: string; method: string; data: unknown }) => {
      const fingerprint = JSON.stringify([businessId, branchId, v.path, v.data]);
      let body = v.data;
      if (v.path === '/transactions') {
        if (!requests.current.has(fingerprint))
          requests.current.set(fingerprint, crypto.randomUUID());
        body = { ...(v.data as object), requestKey: requests.current.get(fingerprint) };
      }
      await inventoryRequest(businessId, branchId, v.path, v.method, body);
      requests.current.delete(fingerprint);
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key });
    },
  });
  if (!businessId || !branchId || context.role !== 'MANAGER')
    return <ErrorState message="Vui lòng chọn chi nhánh được phép quản lý." />;
  if (query.isPending) return <LoadingState />;
  if (query.isError)
    return <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />;
  return (
    <Context.Provider
      value={{
        pending: mutation.isPending,
        snapshot: query.data,
        save: async (path, method, data) => {
          await mutation.mutateAsync({ path, method, data });
        },
      }}
    >
      <div className="manager-workspace">
        {children(adaptInventory(query.data, businessId, branchId))}
      </div>
    </Context.Provider>
  );
}
