import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthCard } from '@/features/auth/AuthCard';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/Foundation';
import { api } from '@/services/api';
import { isAxiosError } from 'axios';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Vui lòng nhập email hợp lệ.');
      return;
    }
    setPending(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setDone(true);
    } catch (caught) {
      setError(
        isAxiosError(caught) && caught.response?.status === 400
          ? 'Vui lòng nhập email hợp lệ.'
          : 'Không thể kết nối máy chủ. Vui lòng thử lại sau.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <AuthCard title="Quên mật khẩu?">
      {done ? (
        <div className="auth-success" role="status">
          Nếu email được liên kết với một tài khoản NextVN, chúng tôi sẽ gửi hướng dẫn đặt lại mật
          khẩu.
        </div>
      ) : (
        <form className="auth-form" onSubmit={(event) => void submit(event)} aria-busy={pending}>
          <p>
            Nhập email bạn đã dùng để đăng ký tài khoản NextVN để nhận liên kết đặt lại mật khẩu.
          </p>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            disabled={pending}
            onChange={(event) => setEmail(event.target.value)}
          />
          {error && <ErrorState message={error} />}
          <Button type="submit" loading={pending}>
            {pending ? 'Đang gửi yêu cầu…' : 'Gửi liên kết đặt lại mật khẩu'}
          </Button>
        </form>
      )}
      <p className="auth-notice">
        Kiểm tra cả thư mục thư rác. Nếu chưa nhận được email, bạn có thể gửi lại yêu cầu sau một
        phút.
      </p>
      <p className="auth-switch">
        <Link to="/login">Quay lại đăng nhập</Link>
      </p>
    </AuthCard>
  );
}
