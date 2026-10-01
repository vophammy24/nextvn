import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '@/features/auth/workspaceContext';
import { LoadingState, ErrorState } from '@/components/common/Foundation';
import type { ReactNode } from 'react';
import type { OperationsData } from './types';
import './operations.css';

export function OperationsBoundary({
  children,
}: {
  children: (data: OperationsData) => ReactNode;
}) {
  const { context, isPreview } = useWorkspace();
  const query = useQuery({
    queryKey: [
      'development',
      'operations',
      context.business.id,
      context.branch?.id,
      context.role,
      context.user.id,
    ],
    enabled: import.meta.env.DEV && isPreview,
    queryFn: async () => {
      if (!import.meta.env.DEV) throw new Error('Dữ liệu minh họa không khả dụng.');
      const { fixtures } = await import('./dev/fixtures');
      if (
        fixtures.businessId !== context.business.id ||
        fixtures.branchId !== context.branch?.id ||
        context.role === 'OWNER'
      )
        throw new Error('Không có dữ liệu minh họa trong phạm vi làm việc này.');
      return fixtures;
    },
    retry: false,
  });
  if (!isPreview)
    return (
      <ErrorState message="Dịch vụ bán hàng và vận hành chưa được kết nối. Chưa có dữ liệu thực tế để hiển thị." />
    );
  if (query.isPending) return <LoadingState />;
  if (query.isError)
    return (
      <ErrorState message="Không thể tải dữ liệu minh họa." onRetry={() => void query.refetch()} />
    );
  return (
    <div className="operations">
      <p className="ops-demo-notice" role="note">
        Chế độ minh họa · Dữ liệu giả lập ngày 20/10/2026. Thao tác không tạo đơn hàng, thanh toán
        hoặc báo cáo thực tế.
      </p>
      {children(query.data)}
    </div>
  );
}
