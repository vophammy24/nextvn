import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';
import { api } from '@/services/api';
const businessId = '58dd232c-43e6-49af-bfd5-f42888401cd8';
vi.mock('@/services/salesApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/salesApi')>()),
  getBusinessId: () => {
    throw new Error('Workspace must not depend on Sales scope');
  },
}));
afterEach(() => vi.restoreAllMocks());
function renderRoute(role: string, path = '/app/inventory') {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      user: { id: 'user', fullName: 'Nguyễn An' },
      business: { id: businessId, name: 'Quán' },
      branch: { id: 'branch-verified', name: 'Chi nhánh' },
      role,
    },
  });
  const request = vi.spyOn(api, 'request').mockResolvedValue({
    data: {
      asOf: '2026-10-01T03:00:00Z',
      ingredients: [],
      recipes: [],
      transactions: [],
      alerts: [],
    },
  });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return request;
}
describe('Integrated routes preserve Sales and enforce Inventory role boundaries', () => {
  it.each(['/app/inventory', '/app/stock-transactions', '/app/recipes', '/app/alerts'])(
    'mounts %s for Manager using verified scope',
    async (path) => {
      const request = renderRoute('MANAGER', path);
      await screen.findByRole('link', { name: 'Kho hàng' });
      expect(api.get).toHaveBeenCalledWith(
        '/workspace',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(
        await within(screen.getByRole('main')).findByRole('heading', { level: 1 }),
      ).toBeInTheDocument();
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `/business/${businessId}/inventory/branches/branch-verified`,
          method: 'GET',
        }),
      );
      expect(screen.getByRole('link', { name: 'POS / Bán hàng' })).toHaveAttribute(
        'href',
        '/app/pos',
      );
      expect(screen.getByRole('link', { name: 'Quản lý bàn' })).toHaveAttribute(
        'href',
        '/app/tables',
      );
      expect(screen.getByRole('link', { name: 'Đơn hàng' })).toHaveAttribute('href', '/app/orders');
      expect(screen.getByRole('link', { name: 'Ca làm việc' })).toHaveAttribute(
        'href',
        '/app/shift',
      );
    },
  );
  it.each(['STAFF', 'OWNER'])('blocks direct management URL for %s', async (role) => {
    const request = renderRoute(role);
    expect(await screen.findByText('Bạn không có quyền quản lý kho.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Kho hàng' })).not.toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });
  it('rejects platform ADMIN as a business role', async () => {
    const request = renderRoute('ADMIN');
    await screen.findByText(/Không thể tải phiên làm việc/);
    expect(request).not.toHaveBeenCalled();
  });
});
