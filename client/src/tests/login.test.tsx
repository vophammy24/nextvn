import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '@/pages/auth/LoginPage';
import { api } from '@/services/api';
afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  localStorage.clear();
});
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/app/owner" element={<p>Owner destination</p>} />
          <Route path="/app/inventory" element={<p>Manager destination</p>} />
          <Route path="/app/pos" element={<p>Staff destination</p>} />
          <Route path="/app/admin" element={<p>Admin destination</p>} />
          <Route path="/onboarding" element={<p>Onboarding destination</p>} />
          <Route path="/invitations/accept" element={<p>Invitation destination</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}
describe('local login UI', () => {
  it('resumes an invitation before workspace discovery for an account with no membership', async () => {
    sessionStorage.setItem('nextvn_pending_invitation', 'a'.repeat(64));
    vi.spyOn(api, 'post').mockResolvedValue({
      data: { accessToken: 'user-token', user: { platformRole: 'USER' } },
    });
    const get = vi.spyOn(api, 'get');
    show();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Tên đăng nhập'), 'new.user');
    await user.type(screen.getByLabelText('Mật khẩu'), 'TestPassword@2026');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(await screen.findByText('Invitation destination')).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });
  it('routes an authenticated platform admin to Admin without inventing a tenant workspace', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({
      data: { accessToken: 'admin-token', user: { platformRole: 'ADMIN' } },
    });
    const get = vi.spyOn(api, 'get');
    show();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Tên đăng nhập'), 'platform.ops');
    await user.type(screen.getByLabelText('Mật khẩu'), 'TestPassword@2026');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(await screen.findByText('Admin destination')).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });
  it.each([
    ['OWNER', 'Owner'],
    ['MANAGER', 'Manager'],
    ['STAFF', 'Staff'],
  ])('bootstraps %s and reuses the token mechanism', async (role, destination) => {
    vi.spyOn(api, 'post').mockResolvedValue({ data: { accessToken: 'verified-test-token' } });
    const workspace = {
      role,
      user: { id: 'user', fullName: 'Demo' },
      business: { id: 'business', name: 'Mây' },
      branch: { id: 'branch', name: 'Hải Châu' },
    };
    vi.spyOn(api, 'get').mockResolvedValue({ data: workspace });
    const client = show();
    const user = userEvent.setup();
    expect(screen.getByRole('button', { name: 'Tiếp tục với Google' })).toBeDisabled();
    await user.type(screen.getByLabelText('Tên đăng nhập'), 'owner.demo');
    await user.type(screen.getByLabelText('Mật khẩu'), 'TestPassword@2026');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(await screen.findByText(`${destination} destination`)).toBeInTheDocument();
    expect(localStorage.getItem('access_token')).toBe('verified-test-token');
    expect(api.get).toHaveBeenCalledWith('/workspace');
    expect(client.getQueryData(['workspace'])).toEqual(workspace);
  });
  it('clears the session and shows a non-blocking error when login fails', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(new Error('offline'));
    localStorage.setItem('access_token', 'old-session');
    show();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Tên đăng nhập'), 'owner.demo');
    await user.type(screen.getByLabelText('Mật khẩu'), 'TestPassword@2026');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể đăng nhập.');
    expect(localStorage.getItem('access_token')).toBeNull();
  });
});
