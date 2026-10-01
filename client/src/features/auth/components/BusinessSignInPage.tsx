import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, LoaderCircle, CircleAlert, ArrowRight, ArrowLeft } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { GoogleSignIn } from './GoogleSignIn';
import { useBusinessLogin } from '../hooks/useBusinessLogin';
import { businessLoginSchema } from '../schemas';
import { authCopy } from '../copy';
import type { LoginFieldErrors } from '../types';

export function BusinessSignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginFieldErrors>({});
  const [recoveryVisible, setRecoveryVisible] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const login = useBusinessLogin();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (login.isPending) return;
    login.reset();
    const result = businessLoginSchema.safeParse({ email, password });
    if (!result.success) {
      const nextErrors: LoginFieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof LoginFieldErrors;
        nextErrors[field] ??= issue.message;
      }
      setErrors(nextErrors);
      (nextErrors.email ? emailRef : passwordRef).current?.focus();
      return;
    }
    setErrors({});
    login.submit(result.data);
    setPassword('');
    setShowPassword(false);
  };

  return (
    <AuthLayout>
      <Link className="auth-back-link" to="/login">
        <ArrowLeft size={15} aria-hidden="true" />
        Các cách đăng nhập
      </Link>
      <span className="auth-kicker">TÀI KHOẢN DOANH NGHIỆP</span>
      <h1>
        Chào mừng
        <br />
        bạn trở lại.
      </h1>
      <p className="auth-intro">Sử dụng tài khoản doanh nghiệp để tiếp tục với nextvn.</p>
      <form
        className="auth-form"
        noValidate
        onSubmit={submit}
        aria-label="Đăng nhập doanh nghiệp"
        aria-busy={login.isPending}
      >
        <div className="auth-field">
          <label htmlFor="business-email">Email</label>
          <input
            ref={emailRef}
            id="business-email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            disabled={login.isPending}
            value={email}
            placeholder="ten@doanhnghiep.vn"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors((current) => ({ ...current, email: undefined }));
              login.reset();
            }}
          />
          {errors.email && (
            <p className="auth-field-error" id="email-error" role="alert">
              {errors.email}
            </p>
          )}
        </div>
        <div className="auth-field">
          <label htmlFor="business-password">Mật khẩu</label>
          <div className="auth-password-field">
            <input
              ref={passwordRef}
              id="business-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              disabled={login.isPending}
              value={password}
              placeholder="Nhập mật khẩu của bạn"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrors((current) => ({ ...current, password: undefined }));
                login.reset();
              }}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              aria-controls="business-password"
              aria-pressed={showPassword}
              disabled={login.isPending}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff size={19} aria-hidden="true" />
              ) : (
                <Eye size={19} aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="auth-field-error" id="password-error" role="alert">
              {errors.password}
            </p>
          )}
        </div>
        <div className="auth-recovery">
          <button
            type="button"
            className="auth-text-button"
            aria-expanded={recoveryVisible}
            aria-controls="recovery-notice"
            onClick={() => setRecoveryVisible(!recoveryVisible)}
          >
            Quên mật khẩu?
          </button>
        </div>
        {recoveryVisible && (
          <p id="recovery-notice" className="auth-inline-notice" role="status">
            {authCopy.recoveryUnavailable}
          </p>
        )}
        {login.isError && (
          <div className="auth-api-error" role="alert">
            <CircleAlert size={18} aria-hidden="true" />
            <span>{login.error.message}</span>
          </div>
        )}
        <button
          type="submit"
          className="auth-button auth-button-primary"
          disabled={login.isPending}
        >
          {login.isPending ? (
            <>
              <LoaderCircle className="spinner" size={18} aria-hidden="true" />
              Đang đăng nhập…
            </>
          ) : (
            <>
              Đăng nhập
              <ArrowRight size={18} aria-hidden="true" />
            </>
          )}
        </button>
        <span className="sr-only" role="status">
          {login.isPending ? 'Đang kiểm tra thông tin đăng nhập. Vui lòng chờ.' : ''}
        </span>
      </form>
      <div className="auth-divider">
        <span>hoặc</span>
      </div>
      <GoogleSignIn />
    </AuthLayout>
  );
}
