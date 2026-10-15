import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PasswordField } from '@/features/auth/PasswordField';
import { LandingPage } from '@/pages/public/LandingPage';

describe('public presentation', () => {
  it('keeps the password named and submitted when visibility changes', async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Mật khẩu" name="password" required />);
    const input = screen.getByLabelText('Mật khẩu');
    expect(input).toHaveAttribute('type', 'password');
    await user.type(input, 'Example@2026');
    await user.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('name', 'password');
    expect(input).toHaveValue('Example@2026');
    await user.click(screen.getByRole('button', { name: 'Ẩn mật khẩu' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('routes public actions to the existing login and registration pages', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /Đăng nhập cho chủ doanh nghiệp/ })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(screen.getByRole('link', { name: /Đăng ký NextVN/ })).toHaveAttribute(
      'href',
      '/register',
    );
  });
});
