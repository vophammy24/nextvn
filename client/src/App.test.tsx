import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '@/App';
import { api } from '@/services/api';

function renderApp(initialRoute = '/app/pos') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('App', () => {
  beforeEach(() => localStorage.setItem('access_token', 'test-session'));
  afterEach(() => vi.restoreAllMocks());

  it('redirects unauthenticated users to local login', () => {
    localStorage.removeItem('access_token');
    renderApp('/app/owner');
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
  });

  it('renders the public landing page without requesting a workspace', () => {
    localStorage.removeItem('access_token');
    const get = vi.spyOn(api, 'get');
    renderApp('/');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Quản lý bán hàng và tồn kho F&B',
    );
    expect(get).not.toHaveBeenCalled();
  });

  it('routes the business login CTA to the current login page', async () => {
    localStorage.removeItem('access_token');
    renderApp('/');
    await userEvent
      .setup()
      .click(screen.getByRole('link', { name: 'Đăng nhập cho chủ doanh nghiệp' }));

    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
  });

  it('routes the start CTA to registration', async () => {
    localStorage.removeItem('access_token');
    renderApp('/');
    await userEvent.setup().click(screen.getByRole('link', { name: 'Bắt đầu' }));

    expect(screen.getByRole('heading', { name: 'Đăng ký' })).toBeInTheDocument();
  });

  it('keeps the current local login UI at /login', () => {
    renderApp('/login');

    expect(screen.getByLabelText('Tên đăng nhập')).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tiếp tục với Google' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'NextVN — Trang chủ' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Đăng ký' })).toHaveAttribute('href', '/register');
  });
  it('renders POS page with Vietnamese header', () => {
    renderApp('/app/pos');

    expect(screen.getByRole('heading', { name: 'POS / Bán hàng' })).toBeInTheDocument();
  });

  it('renders sidebar navigation with Vietnamese labels', () => {
    renderApp('/app/pos');

    expect(screen.getAllByText('POS / Bán hàng')[0]).toBeInTheDocument();
    expect(screen.getByText('Quản lý bàn')).toBeInTheDocument();
    expect(screen.getByText('Đơn hàng')).toBeInTheDocument();
    expect(screen.getByText('Ca làm việc')).toBeInTheDocument();
  });

  it('navigates to tables page', () => {
    renderApp('/app/tables');

    expect(screen.getByRole('heading', { name: 'Quản lý bàn' })).toBeInTheDocument();
  });

  it('navigates to orders page', () => {
    renderApp('/app/orders');

    expect(screen.getByRole('heading', { name: 'Đơn hàng' })).toBeInTheDocument();
  });

  it('navigates to shift page', () => {
    renderApp('/app/shift');

    expect(screen.getByRole('heading', { name: 'Ca làm việc' })).toBeInTheDocument();
  });
});
