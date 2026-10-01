import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '@/features/auth/workspaceContext';
import { ErrorState, LoadingState } from '@/components/common/Foundation';
import type { OwnerData } from './types';
import './owner.css';
export function OwnerDataBoundary({ children }: { children: (data: OwnerData) => ReactNode }) {
  const { context, isPreview } = useWorkspace();
  const query = useQuery({
    queryKey: ['development', 'owner', context.business.id],
    enabled: import.meta.env.DEV && isPreview,
    queryFn: async () => {
      if (!import.meta.env.DEV) throw new Error('Dữ liệu minh họa không khả dụng.');
      const { ownerFixtures } = await import('./dev/fixtures');
      if (ownerFixtures.businessId !== context.business.id || context.role !== 'OWNER')
        throw new Error('Không có dữ liệu minh họa cho doanh nghiệp này.');
      return ownerFixtures;
    },
    retry: false,
  });
  if (!isPreview)
    return (
      <ErrorState message="Dịch vụ quản trị doanh nghiệp chưa được kết nối. Chưa có dữ liệu thực tế để hiển thị." />
    );
  if (query.isPending) return <LoadingState />;
  if (query.isError)
    return (
      <ErrorState
        message="Không thể tải dữ liệu minh họa trong phạm vi làm việc này."
        onRetry={() => void query.refetch()}
      />
    );
  return (
    <div className="owner-workspace">
      <p className="owner-demo" role="note">
        Dữ liệu minh họa · Toàn bộ {query.data.branches.length} chi nhánh của doanh nghiệp mẫu ·
        Chốt ngày 30/09/2026. Không phải dữ liệu kinh doanh thực tế; thao tác chưa lưu lên máy chủ.
      </p>
      {children(query.data)}
    </div>
  );
}
