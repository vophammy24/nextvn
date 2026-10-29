import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { AuthCard } from '@/features/auth/AuthCard';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { ErrorState, LoadingState } from '@/components/common/Foundation';
import { api } from '@/services/api';
type Application = {
  name: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  operationalStatus: string;
  reviewReason: string | null;
};
export function OnboardingPage() {
  const [name, setName] = useState(''),
    [phone, setPhone] = useState(''),
    [address, setAddress] = useState('');
  const query = useQuery({
    queryKey: ['onboarding'],
    retry: false,
    queryFn: async () => (await api.get<{ application: Application | null }>('/onboarding')).data,
  });
  const mutation = useMutation({
    mutationFn: () => api.post('/onboarding', { name, contactPhone: phone, address }),
    onSuccess: () => query.refetch(),
  });
  if (!localStorage.getItem('access_token')) return <Navigate to="/login" replace />;
  const application = query.data?.application;
  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }
  return (
    <AuthCard title="Hồ sơ doanh nghiệp">
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : application ? (
        <div className="auth-form">
          <h2>{application.name}</h2>
          <p role="status">
            {application.operationalStatus === 'SUSPENDED'
              ? 'Doanh nghiệp đang tạm ngưng. Vui lòng liên hệ NextVN.'
              : application.status === 'PENDING'
                ? 'Hồ sơ đang chờ phê duyệt. Bạn sẽ có thể vào không gian làm việc sau khi được duyệt.'
                : application.status === 'REJECTED'
                  ? 'Hồ sơ đã bị từ chối.'
                  : 'Doanh nghiệp đã được phê duyệt.'}
          </p>
          {application.reviewReason && <p>Lý do: {application.reviewReason}</p>}
          {application.status === 'APPROVED' && application.operationalStatus === 'ACTIVE' && (
            <Link to="/app/owner">Vào không gian làm việc</Link>
          )}
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Cập nhật trạng thái
          </Button>
        </div>
      ) : (
        <form className="auth-form" onSubmit={submit}>
          <p>Gửi thông tin để NextVN xét duyệt doanh nghiệp của bạn.</p>
          <Input
            label="Tên doanh nghiệp"
            required
            minLength={2}
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Số điện thoại"
            required
            minLength={5}
            maxLength={30}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="Địa chỉ"
            required
            minLength={5}
            maxLength={240}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          {mutation.isError && (
            <ErrorState
              message={
                isAxiosError(mutation.error) ? mutation.error.response?.data?.message : undefined
              }
            />
          )}
          <Button type="submit" loading={mutation.isPending}>
            Gửi hồ sơ xét duyệt
          </Button>
        </form>
      )}
      <Link to="/login" onClick={() => localStorage.removeItem('access_token')}>
        Đăng xuất
      </Link>
    </AuthCard>
  );
}
