import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthCard } from '@/features/auth/AuthCard';
import { ErrorState } from '@/components/common/Foundation';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { api } from '@/services/api';
import type { WorkspaceContext } from '@/features/auth/workspaceContext';
import { useCartStore } from '@/stores/cartStore';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const client = useQueryClient();
  const navigate = useNavigate();
  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const { data } = await api.post<{ accessToken: string }>('/auth/login', {
        username,
        password,
      });
      await client.cancelQueries();
      client.clear();
      useCartStore.getState().clearCart();
      localStorage.setItem('access_token', data.accessToken);
      const workspace = await api.get<WorkspaceContext>('/workspace');
      client.setQueryData(['workspace'], workspace.data);
      navigate(
        workspace.data.role === 'OWNER'
          ? '/app/owner'
          : workspace.data.role === 'MANAGER'
            ? '/app/inventory'
            : '/app/pos',
        { replace: true },
      );
    } catch (e) {
      localStorage.removeItem('access_token');
      client.clear();
      setError(
        isAxiosError(e)
          ? (e.response?.data?.message ?? 'Không thể kết nối máy chủ.')
          : 'Không thể đăng nhập.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <AuthCard title="Đăng nhập">
      <form onSubmit={(event) => void submit(event)} className="auth-form" aria-busy={pending}>
        <label className="input-group">
          Tên đăng nhập
          <input
            className="input"
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="owner.demo"
          />
        </label>
        <label className="input-group">
          Mật khẩu
          <input
            className="input"
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <ErrorState message={error} />}
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
      <p className="auth-switch">
        Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
      </p>
      <div className="auth-divider">hoặc</div>
      <button className="btn auth-google" type="button" disabled aria-describedby="google-notice">
        Tiếp tục với Google
      </button>
      <p className="auth-notice" id="google-notice">
        Google hiện chưa được cấu hình. Bạn vẫn có thể đăng nhập bằng tài khoản NextVN.
      </p>
    </AuthCard>
  );
}
