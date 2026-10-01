import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { AuthCard } from '@/features/auth/AuthCard';
import { ErrorState } from '@/components/common/Foundation';
import { api } from '@/services/api';

export default function RegisterPage() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    try {
      await api.post('/auth/register', Object.fromEntries(fields));
      setDone(true);
    } catch (e) {
      setError(
        isAxiosError(e)
          ? (e.response?.data?.message ?? 'Không thể kết nối máy chủ. Vui lòng thử lại.')
          : 'Không thể đăng ký. Vui lòng thử lại.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <AuthCard title="Đăng ký">
      {done ? (
        <div className="auth-success" role="status">
          Tạo tài khoản thành công. Quản trị viên cần thêm bạn vào doanh nghiệp trước khi bạn có thể
          vào không gian làm việc.
        </div>
      ) : (
        <form className="auth-form" onSubmit={(e) => void submit(e)} aria-busy={pending}>
          <label className="input-group">
            Tên đăng nhập
            <input
              className="input"
              name="username"
              autoComplete="username"
              required
              minLength={3}
              maxLength={30}
              pattern="[a-zA-Z0-9._]+"
              aria-describedby="username-hint"
            />
          </label>
          <small id="username-hint" className="auth-notice">
            3–30 ký tự: chữ cái không dấu, số, dấu chấm hoặc gạch dưới.
          </small>
          <label className="input-group">
            Họ và tên
            <input className="input" name="fullName" autoComplete="name" required maxLength={120} />
          </label>
          <label className="input-group">
            Email
            <input className="input" name="email" type="email" autoComplete="email" required />
          </label>
          <label className="input-group">
            Mật khẩu
            <input
              className="input"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              aria-describedby="password-hint"
            />
          </label>
          <small id="password-hint" className="auth-notice">
            Ít nhất 8 ký tự, tối đa 72 byte.
          </small>
          {error && <ErrorState message={error} />}
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? 'Đang tạo tài khoản…' : 'Đăng ký'}
          </button>
        </form>
      )}
      <p className="auth-switch">
        {done ? '' : 'Đã có tài khoản? '}
        <Link to="/login">Đăng nhập</Link>
      </p>
    </AuthCard>
  );
}
