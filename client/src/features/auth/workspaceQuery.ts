import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '@/services/api';
import { isAxiosError } from 'axios';
const schema = z.object({
  user: z.object({ id: z.string(), fullName: z.string() }),
  business: z.object({ id: z.string(), name: z.string() }),
  branch: z.object({ id: z.string(), name: z.string() }).optional(),
  role: z.enum(['STAFF', 'MANAGER', 'OWNER']),
});
export function useWorkspaceQuery() {
  return useQuery({
    queryKey: ['workspace'],
    retry: false,
    queryFn: async ({ signal }) => {
      try {
        const response = await api.get<unknown>('/workspace', { signal });
        const value = schema.parse(response.data);
        return value;
      } catch (error) {
        if (
          isAxiosError(error) &&
          error.response?.status === 409 &&
          error.response.data?.code === 'WORKSPACE_SELECTION_REQUIRED'
        )
          throw new Error(
            'Tài khoản thuộc nhiều doanh nghiệp. Vui lòng chọn doanh nghiệp làm việc.',
          );
        throw new Error(
          'Không thể tải phiên làm việc. Vui lòng kiểm tra đăng nhập và quyền doanh nghiệp.',
        );
      }
    },
  });
}
