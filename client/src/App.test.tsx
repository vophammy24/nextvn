import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it } from 'vitest';

import App from '@/App';

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
  it('redirects unauthenticated users to local login', () => {
    localStorage.removeItem('access_token');
    renderApp();
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
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

  it('redirects root to POS', () => {
    renderApp('/');

    expect(screen.getByRole('heading', { name: 'POS / Bán hàng' })).toBeInTheDocument();
  });
});
