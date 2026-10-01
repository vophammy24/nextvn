import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '@/features/auth/workspaceContext';
import { ErrorState, LoadingState } from '@/components/common/Foundation';
import type { ManagerData } from './types';
import './manager.css';
export function ManagerDataBoundary({ children }: { children: (data: ManagerData) => ReactNode }) {
  const { context, isPreview } = useWorkspace();
  const query = useQuery({
    queryKey: ['development', 'manager', context.business.id, context.branch?.id],
    enabled: import.meta.env.DEV && isPreview,
    queryFn: async () => {
      if (!import.meta.env.DEV) throw new Error('Dữ liệu minh họa không khả dụng.');
      const { managerFixtures } = await import('./dev/fixtures');
      if (
        managerFixtures.businessId !== context.business.id ||
        managerFixtures.branchId !== context.branch?.id ||
        context.role !== 'MANAGER'
      )
        throw new Error('Không có dữ liệu minh họa cho chi nhánh này.');
      return managerFixtures;
    },
    retry: false,
  });
  if (!isPreview)
    return (
      <ErrorState message="Dịch vụ quản lý cửa hàng chưa được kết nối. Chưa có dữ liệu thực tế để hiển thị." />
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
    <div className="manager-workspace">
      <p className="manager-demo" role="note">
        Dữ liệu minh họa · Chi nhánh mẫu · Cập nhật giả lập lúc 11:00 ngày 20/10/2026. Không phải số
        liệu kinh doanh thực tế; thao tác không lưu thay đổi lên máy chủ.
      </p>
      {children(query.data)}
    </div>
  );
}
