import { Link } from 'react-router-dom';
import { ArrowRight, Building2 } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { GoogleSignIn } from './GoogleSignIn';

export function SignInPage() {
  return (
    <AuthLayout>
      <span className="auth-kicker">CHÀO MỪNG ĐẾN VỚI NEXTVN</span>
      <h1>
        Bắt đầu từ
        <br />
        một kết nối.
      </h1>
      <p className="auth-intro">
        Đăng nhập để tiếp tục hành trình quản lý bán hàng và tồn kho trên cùng một hệ thống.
      </p>
      <GoogleSignIn />
      <div className="auth-divider">
        <span>hoặc</span>
      </div>
      <Link className="auth-business-link" to="/login/business">
        <Building2 size={23} aria-hidden="true" />
        <span>
          <strong>Đăng nhập bằng tài khoản doanh nghiệp</strong>
          <small>Sử dụng email và mật khẩu của bạn</small>
        </span>
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </AuthLayout>
  );
}
