import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api';
import { WorkspaceSessionContext } from '@/features/auth/workspaceContext';
import ManagerPage from '@/features/manager/ManagerPage';
import type { ManagerView } from '@/features/manager/types';
import type { InventorySnapshot } from '@/features/inventory/api';
const ingredientId = 'a9362978-70e2-4bd5-93fd-d3f6f16e436d';
const snapshot = (): InventorySnapshot => ({
  asOf: '2026-10-01T03:00:00Z',
  ingredients: [
    {
      id: ingredientId,
      name: 'Sữa tươi',
      category: 'Sữa',
      unit: 'ml',
      stock: 1000,
      minimum: 500,
      unitCost: 30,
      expiry: null,
      status: 'LOW_STOCK',
    },
  ],
  recipes: [
    {
      id: 'recipe-1',
      menuItemId: 'latte',
      name: 'Cà phê sữa',
      sellingPrice: 50000,
      foodCost: 12345,
      marginPercent: 75.31,
      ingredients: [{ ingredientId, quantityMilli: 200000 }],
      modifiers: [],
    },
  ],
  transactions: [],
  alerts: [
    {
      id: 'alert-1',
      ingredientId,
      type: 'LOW_STOCK',
      status: 'OPEN',
      updatedAt: '2026-10-01T03:00:00Z',
    },
  ],
});
function show(view: ManagerView) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <WorkspaceSessionContext.Provider
        value={{
          isPreview: false,
          context: {
            user: { id: 'user-1', fullName: 'Nguyễn An' },
            business: { id: 'business-1', name: 'Quán' },
            branch: { id: 'branch-1', name: 'Chi nhánh A' },
            role: 'MANAGER',
          },
        }}
      >
        <MemoryRouter>
          <ManagerPage view={view} />
        </MemoryRouter>
      </WorkspaceSessionContext.Provider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}
afterEach(() => vi.restoreAllMocks());
describe('Connected inventory screens', () => {
  it('renders Vietnamese inventory and uses server status instead of reclassifying stock', async () => {
    vi.spyOn(api, 'request').mockResolvedValue({ data: snapshot() });
    await show('inventory');
    expect(await screen.findByText('Sữa tươi')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Tìm nguyên liệu' })).toBeInTheDocument();
    expect(screen.getByText('Sắp hết')).toBeInTheDocument();
    expect(screen.queryByText(/Dữ liệu minh họa/)).not.toBeInTheDocument();
  });
  it('shows loading, API failure and retry without fixture fallback', async () => {
    let reject!: (reason: Error) => void;
    const mock = vi.spyOn(api, 'request').mockImplementationOnce(
      () =>
        new Promise((_, r) => {
          reject = r;
        }),
    );
    const user = show('inventory');
    expect(screen.getByText(/Đang tải dữ liệu/)).toBeInTheDocument();
    await act(async () => reject(new Error('network')));
    expect(
      await screen.findByText('Không thể xử lý dữ liệu kho. Vui lòng thử lại.'),
    ).toBeInTheDocument();
    mock.mockResolvedValue({ data: { ...snapshot(), ingredients: [], recipes: [], alerts: [] } });
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Không tìm thấy nguyên liệu')).toBeInTheDocument();
  });
  it('validates ingredient creation and submits scoped API data', async () => {
    const mock = vi.spyOn(api, 'request').mockResolvedValue({ data: snapshot() });
    const user = show('inventory');
    await screen.findByText('Sữa tươi');
    await user.click(screen.getByRole('button', { name: 'Thêm nguyên liệu' }));
    await user.click(screen.getByRole('button', { name: 'Lưu nguyên liệu' }));
    expect(await screen.findByText('Vui lòng nhập tên nguyên liệu.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Tên nguyên liệu'), 'Cà phê');
    await user.click(screen.getByRole('button', { name: 'Lưu nguyên liệu' }));
    await waitFor(() =>
      expect(mock).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/business/business-1/inventory/branches/branch-1/ingredients',
          data: expect.objectContaining({ name: 'Cà phê', unit: 'g' }),
        }),
      ),
    );
  });
  it('validates stock quantity, disables pending submission and preserves retry idempotency key', async () => {
    const mock = vi.spyOn(api, 'request').mockResolvedValue({ data: snapshot() });
    const user = show('stockTransactions');
    await screen.findByRole('option', { name: 'Sữa tươi (ml)' });
    await user.click(screen.getByRole('button', { name: 'Ghi nhận giao dịch' }));
    expect(screen.getByText('Vui lòng nhập số lượng.')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Nguyên liệu'), ingredientId);
    await user.type(screen.getByLabelText(/^Số lượng/), '100');
    await user.type(screen.getByLabelText('Nhà cung cấp'), 'Nhà cung cấp');
    await user.type(screen.getByLabelText('Đơn giá mỗi đơn vị (₫)'), '30');
    await user.type(screen.getByLabelText('Lý do / Ghi chú'), 'Bổ sung');
    let reject!: (reason: Error) => void;
    mock.mockImplementationOnce(
      () =>
        new Promise((_, r) => {
          reject = r;
        }),
    );
    await user.click(screen.getByRole('button', { name: 'Ghi nhận giao dịch' }));
    expect(await screen.findByRole('button', { name: 'Đang ghi nhận...' })).toBeDisabled();
    const first = mock.mock.calls.at(-1)![0];
    await act(async () => reject(new Error('network')));
    await screen.findByText('Không thể xử lý dữ liệu kho. Vui lòng thử lại.');
    await user.click(screen.getByRole('button', { name: 'Ghi nhận giao dịch' }));
    await screen.findByText('Đã ghi nhận giao dịch.');
    const writes = mock.mock.calls.map(([c]) => c).filter((c) => c.method === 'POST');
    expect(writes).toHaveLength(2);
    expect((writes[1].data as { requestKey: string }).requestKey).toBe(
      (first.data as { requestKey: string }).requestKey,
    );
    expect((writes[1].data as { type: string }).type).toBe('IMPORT');
  });
  it('displays authoritative recipe cost and supports editing modifiers and ingredients', async () => {
    const mock = vi.spyOn(api, 'request').mockResolvedValue({ data: snapshot() });
    const user = show('recipes');
    await screen.findByRole('heading', { name: 'Cà phê sữa' });
    expect(screen.getByText(/12\.345/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa công thức' }));
    expect(screen.getByLabelText(/^Mã món/)).toHaveValue('latte');
    await user.click(screen.getByRole('button', { name: 'Thêm tùy chọn' }));
    await user.type(screen.getByLabelText('Mã tùy chọn'), 'extra');
    await user.type(screen.getByLabelText('Tên tùy chọn'), 'Thêm sữa');
    await user.click(screen.getByRole('button', { name: 'Lưu công thức' }));
    await waitFor(() =>
      expect(mock).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: '/business/business-1/inventory/branches/branch-1/recipes/recipe-1',
          data: expect.objectContaining({ modifiers: [expect.objectContaining({ key: 'extra' })] }),
        }),
      ),
    );
  });
  it('offers recipe creation in the empty state', async () => {
    vi.spyOn(api, 'request').mockResolvedValue({ data: { ...snapshot(), recipes: [] } });
    const user = show('recipes');
    await screen.findByText('Chưa có công thức');
    await user.click(screen.getByRole('button', { name: 'Thêm công thức' }));
    await user.click(screen.getByRole('button', { name: 'Lưu công thức' }));
    expect(await screen.findByText('Vui lòng nhập mã món.')).toBeInTheDocument();
  });
  it('marks alerts in progress, exposes detail, and does not fabricate discrepancy controls', async () => {
    const mock = vi.spyOn(api, 'request').mockResolvedValue({ data: snapshot() });
    const user = show('alerts');
    await screen.findByRole('heading', { name: 'Dưới mức tồn tối thiểu · Sữa tươi' });
    expect(screen.queryByRole('option', { name: 'Chênh lệch tồn kho' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Xem chi tiết:/ }));
    expect(screen.getByRole('link', { name: 'Kiểm tra kho hàng' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Đánh dấu đang xử lý' }));
    await waitFor(() =>
      expect(mock).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          url: '/business/business-1/inventory/branches/branch-1/alerts/alert-1',
          data: { status: 'IN_PROGRESS' },
        }),
      ),
    );
    expect(within(screen.getByLabelText('Loại cảnh báo')).getAllByRole('option')).toHaveLength(4);
  });
});
