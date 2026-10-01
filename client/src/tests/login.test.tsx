import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '@/pages/auth/LoginPage';
import { api } from '@/services/api';
afterEach(() => {
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
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}
describe('local login UI', () => {
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
