import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { AuthCard } from '@/features/auth/AuthCard';
import { PasswordField } from '@/features/auth/PasswordField';
import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/Foundation';
import { api } from '@/services/api';
import { useCartStore } from '@/stores/cartStore';

export default function ResetPasswordPage() {
  const [params, setParams] = useSearchParams();
  const [token, setToken] = useState(() => params.get('token') ?? '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const client = useQueryClient();
  useEffect(() => {
    if (params.has('token')) setParams({}, { replace: true });
  }, [params, setParams]);
  const validToken = /^[a-f0-9]{64}$/.test(token);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending || !validToken) return;
    setError('');
    if (password.length < 8 || new TextEncoder().encode(password).length > 72) {
      setError('Mật khẩu cần ít nhất 8 ký tự và tối đa 72 byte UTF-8.');
      return;
    }
    if (password !== confirmation) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setPending(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setToken('');
      setPassword('');
      setConfirmation('');
      localStorage.removeItem('access_token');
      sessionStorage.removeItem('nextvn_pending_invitation');
      await client.cancelQueries();
      client.clear();
      useCartStore.getState().clearCart();
      setDone(true);
    } catch (caught) {
      setError(
        isAxiosError(caught)
          ? (caught.response?.data?.message ?? 'Chưa thể đặt lại mật khẩu. Vui lòng thử lại.')
          : 'Chưa thể đặt lại mật khẩu. Vui lòng thử lại.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <AuthCard title="Đặt lại mật khẩu">
      {done ? (
        <div className="auth-success" role="status">
          Đã đặt lại mật khẩu. Các phiên đăng nhập trước đã hết hiệu lực. Vui lòng đăng nhập lại.
        </div>
      ) : !validToken ? (
        <ErrorState message="Liên kết đặt lại mật khẩu không hợp lệ hoặc thiếu mã xác nhận. Vui lòng yêu cầu liên kết mới." />
      ) : (
        <form className="auth-form" onSubmit={(event) => void submit(event)} aria-busy={pending}>
          <PasswordField
            label="Mật khẩu mới"
            hint="Ít nhất 8 ký tự, tối đa 72 byte UTF-8."
            required
            minLength={8}
            autoComplete="new-password"
            disabled={pending}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <PasswordField
            label="Xác nhận mật khẩu mới"
            required
            minLength={8}
            autoComplete="new-password"
            disabled={pending}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          {error && <ErrorState message={error} />}
          <Button type="submit" loading={pending}>
            {pending ? 'Đang đặt lại…' : 'Đặt lại mật khẩu'}
          </Button>
        </form>
      )}
      {!done && (
        <p className="auth-switch">
          <Link to="/forgot-password">Yêu cầu liên kết mới</Link>
        </p>
      )}
      <p className="auth-switch">
        <Link to="/login">Quay lại đăng nhập</Link>
      </p>
    </AuthCard>
  );
}
