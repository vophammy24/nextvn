import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import LoginPage from '@/pages/auth/LoginPage';
import { api } from '@/services/api';

const token = 'a'.repeat(64);
function Location() {
  const location = useLocation();
  return (
    <p data-testid="location">
      {location.pathname}
      {location.search}
    </p>
  );
}
function show(path = '/forgot-password') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Location />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});
async function fill(password = 'NewPassword2026!', confirmation = password) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Mật khẩu mới'), password);
  await user.type(screen.getByLabelText('Xác nhận mật khẩu mới'), confirmation);
  return user;
}
describe('password recovery pages', () => {
  it('links from login near the password field and renders a branded email recovery form', async () => {
    show('/login');
    await userEvent.click(screen.getByRole('link', { name: 'Quên mật khẩu?' }));
    expect(screen.getByRole('heading', { name: 'Quên mật khẩu?' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(
      screen.getByText(/Nhập email bạn đã dùng để đăng ký tài khoản NextVN/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'NextVN — Trang chủ' })).toBeInTheDocument();
  });
  it('rejects invalid emails before calling the API', async () => {
    const post = vi.spyOn(api, 'post');
    show();
    await userEvent.type(screen.getByLabelText('Email'), 'invalid');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi liên kết đặt lại mật khẩu' }));
    expect(post).not.toHaveBeenCalled();
  });
  it('normalizes email, disables submission while pending and shows generic success', async () => {
    let resolve!: (value: unknown) => void;
    const post = vi.spyOn(api, 'post').mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    show();
    await userEvent.type(screen.getByLabelText('Email'), 'Demo@Example.test');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi liên kết đặt lại mật khẩu' }));
    expect(screen.getByRole('button', { name: 'Đang gửi yêu cầu…' })).toBeDisabled();
    expect(post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'demo@example.test' });
    resolve({ data: {} });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Nếu email được liên kết với một tài khoản NextVN',
    );
  });
  it('preserves the email and enables retry after a network failure', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(new Error('network'));
    show();
    await userEvent.type(screen.getByLabelText('Email'), 'demo@example.test');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi liên kết đặt lại mật khẩu' }));
    expect(
      await screen.findByText('Không thể kết nối máy chủ. Vui lòng thử lại sau.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('demo@example.test');
    expect(screen.getByRole('button', { name: 'Gửi liên kết đặt lại mật khẩu' })).toBeEnabled();
  });
  it.each(['/reset-password', '/reset-password?token=invalid'])(
    'rejects missing or malformed token at %s',
    (path) => {
      show(path);
      expect(
        screen.getByText(/Liên kết đặt lại mật khẩu không hợp lệ hoặc thiếu/),
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Đặt lại mật khẩu' })).not.toBeInTheDocument();
    },
  );
  it('removes the query token, never persists it and validates confirmation', async () => {
    const post = vi.spyOn(api, 'post');
    show(`/reset-password?token=${token}`);
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/reset-password$/);
    const user = await fill('NewPassword2026!', 'DifferentPassword2026!');
    await user.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));
    expect(screen.getByText('Mật khẩu xác nhận không khớp.')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
  it('enforces bcrypt byte limit without truncation and preserves show/hide values', async () => {
    const post = vi.spyOn(api, 'post');
    show(`/reset-password?token=${token}`);
    const user = await fill('ấ'.repeat(25));
    await user.click(screen.getAllByRole('button', { name: 'Hiện mật khẩu' })[0]!);
    expect(screen.getByLabelText('Mật khẩu mới')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Mật khẩu mới')).toHaveValue('ấ'.repeat(25));
    await user.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));
    expect(
      screen.getByText('Mật khẩu cần ít nhất 8 ký tự và tối đa 72 byte UTF-8.'),
    ).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });
  it('shows safe server error for consumed/expired tokens and offers a new link', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(
      new AxiosError('bad', '400', undefined, undefined, {
        status: 400,
        data: { message: 'Liên kết đã hết hạn.' },
        statusText: 'Bad Request',
        headers: {},
        config: {} as never,
      }),
    );
    show(`/reset-password?token=${token}`);
    const user = await fill();
    await user.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));
    expect(await screen.findByText('Liên kết đã hết hạn.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Yêu cầu liên kết mới' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });
  it('sends the token only by POST, clears old session/cache and returns to login without automatic login', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} });
    localStorage.setItem('access_token', 'old-token');
    const client = show(`/reset-password?token=${token}`);
    client.setQueryData(['private'], { secret: 'old cache' });
    const user = await fill();
    await user.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Đã đặt lại mật khẩu');
    expect(post).toHaveBeenCalledExactlyOnceWith('/auth/reset-password', {
      token,
      newPassword: 'NewPassword2026!',
    });
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(client.getQueryData(['private'])).toBeUndefined();
    await user.click(screen.getByRole('link', { name: 'Quay lại đăng nhập' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument(),
    );
  });
});
