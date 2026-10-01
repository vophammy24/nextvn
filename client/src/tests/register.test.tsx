import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import RegisterPage from '@/pages/auth/RegisterPage';
import { api } from '@/services/api';
afterEach(() => vi.restoreAllMocks());
it('submits the existing registration contract and explains membership setup', async () => {
  const post = vi
    .spyOn(api, 'post')
    .mockResolvedValue({ data: { accessToken: 'unused-registration-token' } });
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Tên đăng nhập'), 'new.demo');
  await user.type(screen.getByLabelText('Họ và tên'), 'Nguyễn An');
  await user.type(screen.getByLabelText('Email'), 'an@example.test');
  await user.type(screen.getByLabelText('Mật khẩu'), 'Example@2026');
  await user.click(screen.getByRole('button', { name: /^Đăng ký$/,}));
  expect(post).toHaveBeenCalledWith('/auth/register', {
    username: 'new.demo',
    fullName: 'Nguyễn An',
    email: 'an@example.test',
    password: 'Example@2026',
  });
  expect(await screen.findByRole('status')).toHaveTextContent('Quản trị viên cần thêm bạn');
  expect(screen.getByRole('link', { name: /^Đăng nhập$/, })).toHaveAttribute(
    'href',
    '/login',
  );
});
