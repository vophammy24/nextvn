import { beforeEach } from 'vitest';
beforeEach(() => localStorage.setItem('access_token', 'test-session'));
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { api } from '@/services/api';
vi.mock('@/services/salesApi', async (original) => ({
  ...(await original<typeof import('@/services/salesApi')>()),
  getBusinessId: () => {
    throw new Error('Do not use Sales env scope');
  },
}));
const businessId = 'verified-business';
const workspace = (role = 'OWNER') => ({
  user: { id: 'user', fullName: 'Nguyễn An' },
  business: { id: businessId, name: 'Doanh nghiệp' },
  role,
});
const summary = {
  branches: [
    {
      branch: { id: 'branch-a', name: 'Chi nhánh A' },
      asOf: '2026-10-01T03:00:00Z',
      lowStockCount: 2,
      nearExpiryCount: 1,
      inventoryValue: 100000,
      ingredients: [{ id: 'milk', name: 'Sữa', unit: 'ml', stock: 1000, minimum: 200 }],
      consumptionLast30Days: [
        { ingredientId: 'milk', name: 'Sữa', unit: 'ml', quantity: 500, estimatedCost: 15000 },
      ],
    },
  ],
};
function show() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/app/owner/inventory']}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
afterEach(() => vi.restoreAllMocks());
describe('Owner inventory and JWT workspace discovery', () => {
  it('reads business-wide summary from the verified workspace without mutation controls', async () => {
    const get = vi
      .spyOn(api, 'get')
      .mockImplementation(async (url) => ({ data: url === '/workspace' ? workspace() : summary }));
    show();
    await screen.findByRole('heading', { name: 'Chi nhánh A' });
    expect(get).toHaveBeenCalledWith('/workspace', expect.any(Object));
    expect(get).toHaveBeenCalledWith(
      `/business/${businessId}/inventory/summary`,
      expect.any(Object),
    );
    expect(screen.getByRole('region', { name: 'Tồn kho Chi nhánh A' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thêm nguyên liệu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Nhập / Xuất kho' })).not.toBeInTheDocument();
  });
  it.each(['STAFF', 'MANAGER'])(
    'rejects %s from the Owner summary without issuing its API request',
    async (role) => {
      const get = vi.spyOn(api, 'get').mockResolvedValue({ data: workspace(role) });
      show();
      await screen.findByText('Bạn không có quyền xem tổng hợp kho doanh nghiệp.');
      expect(get.mock.calls.every(([url]) => url === '/workspace')).toBe(true);
    },
  );
  it('shows selection required and never chooses the first workspace', async () => {
    const get = vi.spyOn(api, 'get').mockRejectedValue(
      new AxiosError('Conflict', undefined, undefined, undefined, {
        status: 409,
        statusText: 'Conflict',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
        data: { code: 'WORKSPACE_SELECTION_REQUIRED', workspaces: [workspace(), workspace()] },
      }),
    );
    show();
    await screen.findByText(
      'Tài khoản thuộc nhiều doanh nghiệp. Vui lòng chọn doanh nghiệp làm việc.',
    );
    expect(get.mock.calls.every(([url]) => url === '/workspace')).toBe(true);
  });
  it('shows API failure and retries into the empty state', async () => {
    let fail = true;
    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/workspace') return { data: workspace() };
      if (fail) throw new Error('network');
      return { data: { branches: [] } };
    });
    show();
    await screen.findByText('Không thể tải tổng hợp kho. Vui lòng thử lại.');
    fail = false;
    await userEvent.setup().click(screen.getByRole('button', { name: 'Thử lại' }));
    await screen.findByText('Chưa có dữ liệu kho chi nhánh');
  });
  it('shows loading while the summary is pending', async () => {
    vi.spyOn(api, 'get').mockImplementation((url) =>
      url === '/workspace' ? Promise.resolve({ data: workspace() }) : new Promise(() => {}),
    );
    show();
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith(
        `/business/${businessId}/inventory/summary`,
        expect.any(Object),
      ),
    );
    expect(screen.getByText(/Đang tải dữ liệu/)).toBeInTheDocument();
  });
});
