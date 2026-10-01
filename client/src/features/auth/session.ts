import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { z } from 'zod';
import { api } from '@/services/api';

const entity = z.object({ id: z.string().min(1), name: z.string().min(1) });
export const sessionSchema = z
  .object({
    user: z.object({
      id: z.string().min(1),
      fullName: z.string().min(1),
      email: z.email(),
      phone: z.string().nullable().optional(),
    }),
    // The server resolves this from BusinessMember, never from a global User role.
    membership: z.object({
      role: z.enum(['STAFF', 'MANAGER', 'OWNER']),
      business: entity,
      branch: entity.nullable().optional(),
    }),
  })
  .refine((session) => session.membership.role === 'OWNER' || !!session.membership.branch, {
    message: 'Phiên vận hành phải có chi nhánh được phân công.',
    path: ['membership', 'branch'],
  });
export type AuthSession = z.infer<typeof sessionSchema>;
export function useAuthMe(enabled = true) {
  return useQuery({
    queryKey: ['auth', 'me'],
    enabled,
    retry: false,
    staleTime: 30000,
    gcTime: 0,
    queryFn: async ({ signal }) => {
      try {
        const response = await api.get<unknown>('/auth/me', { signal, withCredentials: true });
        const result = sessionSchema.safeParse(response.data);
        if (!result.success)
          throw new Error('Thông tin phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
        return result.data;
      } catch (error) {
        if (isAxiosError(error)) {
          if (error.response?.status === 401)
            throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          if (error.response?.status === 404 || error.response?.status === 501)
            throw new Error('Dịch vụ xác thực chưa khả dụng trong môi trường này.');
          throw new Error('Không thể tải thông tin đăng nhập. Vui lòng thử lại.');
        }
        throw new Error('Thông tin phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
      }
    },
  });
}
