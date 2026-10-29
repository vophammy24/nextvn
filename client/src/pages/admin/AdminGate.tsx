import { useQuery } from '@tanstack/react-query';
import { Navigate, Link } from 'react-router-dom';
import { z } from 'zod';
import StaffLayout from '@/layouts/StaffLayout';
import { api } from '@/services/api';
import { ErrorState, LoadingState } from '@/components/common/Foundation';
const session = z.object({
  user: z.object({ id: z.string(), fullName: z.string() }),
  role: z.literal('SYSTEM_ADMIN'),
});
export function AdminGate() {
  const query = useQuery({
    queryKey: ['admin-session'],
    retry: false,
    staleTime: 0,
    enabled: !!localStorage.getItem('access_token'),
    queryFn: async ({ signal }) =>
      session.parse((await api.get('/admin/session', { signal })).data),
  });
  if (!localStorage.getItem('access_token')) return <Navigate to="/login" replace />;
  if (query.isPending) return <LoadingState />;
  if (query.isError)
    return (
      <>
        <ErrorState
          message="Bạn không có quyền quản trị hệ thống hoặc phiên đã hết hạn."
          onRetry={() => void query.refetch()}
        />
        <Link to="/login">Quay lại đăng nhập</Link>
      </>
    );
  return <StaffLayout platformSession={query.data} />;
}
