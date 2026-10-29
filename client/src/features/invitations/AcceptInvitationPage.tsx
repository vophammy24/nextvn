import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { AuthCard } from '@/features/auth/AuthCard';
import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/Foundation';
import { api } from '@/services/api';
export const invitationResumeKey = 'nextvn_pending_invitation';
export function AcceptInvitationPage() {
  const [token] = useState(() => {
    const fromLink = new URLSearchParams(window.location.hash.slice(1)).get('token');
    if (fromLink && /^[a-f0-9]{64}$/.test(fromLink))
      sessionStorage.setItem(invitationResumeKey, fromLink);
    // Strip the secret from browser history/referrers; it is never sent in a GET request.
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
    return fromLink ?? sessionStorage.getItem(invitationResumeKey) ?? '';
  });
  const client = useQueryClient(),
    navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: () => api.post<{ role: string }>('/invitations/accept', { token }),
    onSuccess: async (response) => {
      sessionStorage.removeItem(invitationResumeKey);
      await client.cancelQueries();
      client.clear();
      navigate(response.data.role === 'MANAGER' ? '/app/inventory' : '/app/pos', { replace: true });
    },
  });
  const authenticated = !!localStorage.getItem('access_token');
  return (
    <AuthCard title="Chấp nhận lời mời">
      {!/^[a-f0-9]{64}$/.test(token) ? (
        <ErrorState message="Liên kết lời mời không hợp lệ. Hãy mở lại liên kết trong email." />
      ) : (
        <>
          <p>
            Đăng nhập bằng đúng email nhận lời mời. Chỉ khi bạn xác nhận, hệ thống mới cấp quyền
            thành viên.
          </p>
          {!authenticated ? (
            <p>
              <Link to="/login">Đăng nhập</Link> · <Link to="/register">Đăng ký tài khoản mới</Link>
            </p>
          ) : (
            <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
              Xác nhận tham gia doanh nghiệp
            </Button>
          )}
          {mutation.isError && (
            <>
              <ErrorState
                message={
                  isAxiosError(mutation.error)
                    ? (mutation.error.response?.data?.message ?? 'Không thể chấp nhận lời mời.')
                    : 'Không thể chấp nhận lời mời.'
                }
              />
              <Link
                to="/login"
                onClick={() => {
                  localStorage.removeItem('access_token');
                  client.clear();
                }}
              >
                Đăng nhập bằng tài khoản khác
              </Link>
            </>
          )}
        </>
      )}
    </AuthCard>
  );
}
