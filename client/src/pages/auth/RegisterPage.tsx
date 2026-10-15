import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { AuthCard } from '@/features/auth/AuthCard';
import { ErrorState } from '@/components/common/Foundation';
import { api } from '@/services/api';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { PasswordField } from '@/features/auth/PasswordField';

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
          <Input
            label="Tên đăng nhập"
            name="username"
            autoComplete="username"
            required
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9._]+"
            hint="3–30 ký tự: chữ cái không dấu, số, dấu chấm hoặc gạch dưới."
          />
          <Input label="Họ và tên" name="fullName" autoComplete="name" required maxLength={120} />
          <Input label="Email" name="email" type="email" autoComplete="email" required />
          <PasswordField
            label="Mật khẩu"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
            hint="Ít nhất 8 ký tự."
          />
          {error && <ErrorState message={error} />}
          <Button type="submit" loading={pending}>
            {pending ? 'Đang tạo tài khoản…' : 'Đăng ký'}
          </Button>
        </form>
      )}
      <p className="auth-switch">
        {done ? '' : 'Đã có tài khoản? '}
        <Link to="/login">Đăng nhập</Link>
      </p>
    </AuthCard>
  );
}
