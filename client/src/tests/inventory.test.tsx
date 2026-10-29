import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api';
import { AxiosError } from 'axios';
import * as exports from '@/features/manager/export';
import { WorkspaceSessionContext } from '@/features/auth/workspaceContext';
import ManagerPage from '@/features/manager/ManagerPage';
import type { ManagerView } from '@/features/manager/types';
import type { InventorySnapshot } from '@/features/inventory/api';
const ingredientId = 'a9362978-70e2-4bd5-93fd-d3f6f16e436d';
const menuId = 'b9362978-70e2-4bd5-93fd-d3f6f16e436d';
const catalog = (hasRecipe = true) => ({
  branchName: 'Chi nhánh A',
  categories: [{ id: 'c9362978-70e2-4bd5-93fd-d3f6f16e436d', name: 'Cà phê', isActive: true }],
  menuItems: [
    {
      id: menuId,
      name: 'Cà phê sữa',
      price: 50000,
      categoryId: 'c9362978-70e2-4bd5-93fd-d3f6f16e436d',
      categoryName: 'Cà phê',
      description: null,
      isActive: true,
      recipeId: hasRecipe ? 'recipe-1' : null,
    },
  ],
});
const recipeApi = (value: InventorySnapshot, hasRecipe = true) =>
  vi.spyOn(api, 'request').mockImplementation(async (config) => ({
    data: config.url?.endsWith('/recipe-catalog')
      ? catalog(hasRecipe)
      : config.method === 'GET'
        ? value
        : { id: 'recipe-1', posEligible: true },
  }));
const snapshot = (): InventorySnapshot => ({
  asOf: '2026-10-01T03:00:00Z',
  menuItems: [{ id: menuId, name: 'Cà phê sữa', price: 50000, isActive: true }],
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
      menuItemId: menuId,
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
  it('filters the recipe list and submits removal of an existing modifier', async () => {
    const value = snapshot();
    value.recipes[0].modifiers = [
      {
        key: 'extra',
        name: 'Thêm sữa',
        priceExtra: 1000,
        ingredients: [{ ingredientId, quantityMilli: 1000 }],
      },
    ];
    const mock = recipeApi(value);
    const user = show('recipes');
    await screen.findByRole('heading', { name: 'Cà phê sữa' });
    await user.type(
      screen.getByRole('searchbox', { name: 'Tìm món trong công thức' }),
      'không tìm thấy',
    );
    expect(screen.getByText('Không tìm thấy món')).toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox', { name: 'Tìm món trong công thức' }));
    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa công thức' }));
    await user.click(await screen.findByRole('button', { name: 'Tiếp tục' }));
    await user.click(screen.getByRole('button', { name: 'Xóa tùy chọn' }));
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await user.click(screen.getByRole('button', { name: 'Lưu công thức' }));
    await waitFor(() =>
      expect(mock).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          data: expect.objectContaining({ modifiers: [] }),
        }),
      ),
    );
  });
  it('preserves and filters categories returned by the backend even when outside the original static list', async () => {
    const value = snapshot();
    value.ingredients[0].category = 'Nguyên liệu pha chế';
    vi.spyOn(api, 'request').mockResolvedValue({ data: value });
    const user = show('inventory');
    await screen.findByText('Sữa tươi');
    await user.click(screen.getByRole('button', { name: 'Nguyên liệu pha chế' }));
    expect(screen.getByText('Sữa tươi')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa Sữa tươi' }));
    expect(screen.getByRole('combobox', { name: /^Danh mục/ })).toHaveValue('Nguyên liệu pha chế');
  });
  it('searches and filters server rows and exports only the currently visible inventory', async () => {
    vi.spyOn(api, 'request').mockResolvedValue({ data: snapshot() });
    const csv = vi.spyOn(exports, 'downloadDemoCsv').mockImplementation(() => {});
    const user = show('inventory');
    await screen.findByText('Sữa tươi');
    await user.type(screen.getByRole('searchbox', { name: 'Tìm nguyên liệu' }), 'không tồn tại');
    expect(screen.getByText('Không tìm thấy nguyên liệu')).toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox', { name: 'Tìm nguyên liệu' }));
    await user.click(screen.getByRole('button', { name: 'Cà phê' }));
    expect(screen.getByText('Không tìm thấy nguyên liệu')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sữa' }));
    await user.click(screen.getByRole('button', { name: 'Xuất dữ liệu' }));
    expect(csv).toHaveBeenCalledWith(
      'nextvn-kho.csv',
      expect.arrayContaining([['Sữa tươi', 'Sữa', 'ml', 1000, 500, 'Chưa có']]),
    );
  });
  it('preserves the ingredient list and entered form after a mutation failure', async () => {
    vi.spyOn(api, 'request').mockImplementation(async (config) => {
      if (config.method === 'POST') throw new Error('network');
      return { data: snapshot() };
    });
    const user = show('inventory');
    await screen.findByText('Sữa tươi');
    await user.click(screen.getByRole('button', { name: 'Thêm nguyên liệu' }));
    await user.type(screen.getByLabelText('Tên nguyên liệu'), 'Bột mới');
    await user.click(screen.getByRole('button', { name: 'Lưu nguyên liệu' }));
    await screen.findByText('Không thể xử lý dữ liệu kho. Vui lòng thử lại.');
    expect(screen.getByText('Sữa tươi')).toBeInTheDocument();
    expect(screen.getByLabelText('Tên nguyên liệu')).toHaveValue('Bột mới');
  });
  it.each([503, 403])(
    'retains stale rows on refresh failure %s but hides them when permission is lost',
    async (status) => {
      let reads = 0;
      vi.spyOn(api, 'request').mockImplementation(async (config) => {
        if (config.method === 'GET' && ++reads > 1)
          throw new AxiosError('failed', undefined, undefined, undefined, {
            status,
            statusText: 'failed',
            headers: {},
            config: {} as never,
            data: { message: 'private detail' },
          });
        return { data: snapshot() };
      });
      const user = show('inventory');
      await screen.findByText('Sữa tươi');
      await user.click(screen.getByRole('button', { name: 'Thêm nguyên liệu' }));
      await user.type(screen.getByLabelText('Tên nguyên liệu'), 'Bột mới');
      await user.click(screen.getByRole('button', { name: 'Lưu nguyên liệu' }));
      if (status === 503) {
        await screen.findByText(/Chưa thể làm mới dữ liệu/);
        expect(screen.getByText('Sữa tươi')).toBeInTheDocument();
        expect(screen.getByText('Đã lưu thay đổi.')).toBeInTheDocument();
      } else {
        await screen.findByText('Bạn không có quyền quản lý kho tại chi nhánh này.');
        expect(screen.queryByText('Sữa tươi')).not.toBeInTheDocument();
      }
    },
  );
  it('creates a recipe by choosing an existing scoped menu instead of typing an arbitrary ID', async () => {
    const mock = recipeApi({ ...snapshot(), recipes: [] }, false);
    const user = show('recipes');
    await screen.findByText('Chưa có công thức');
    await user.click(screen.getByRole('button', { name: 'Thêm công thức' }));
    await user.selectOptions(await screen.findByLabelText(/^Món trong chi nhánh/), menuId);
    expect(screen.getByText('Danh mục: Cà phê · Giá bán: 50.000 ₫ · Đang bán')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await user.click(screen.getByRole('button', { name: 'Thêm định lượng' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Nguyên liệu' }), ingredientId);
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await user.click(screen.getByRole('button', { name: 'Lưu công thức' }));
    await waitFor(() =>
      expect(mock).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          data: expect.objectContaining({
            menuItemId: menuId,
            ingredients: [{ ingredientId, quantity: 1, unit: 'ml' }],
          }),
        }),
      ),
    );
  });
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
    expect(screen.getByLabelText('Nguyên liệu')).toBeDisabled();
    expect(screen.getByLabelText(/^Số lượng/)).toBeDisabled();
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
    const mock = recipeApi(snapshot());
    const user = show('recipes');
    await screen.findByRole('heading', { name: 'Cà phê sữa' });
    expect(screen.getByText(/12\.345/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa công thức' }));
    expect(await screen.findByLabelText(/^Món trong chi nhánh/)).toHaveValue(menuId);
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await user.click(screen.getByRole('button', { name: 'Thêm tùy chọn' }));
    await user.type(screen.getByLabelText('Mã tùy chọn'), 'extra');
    await user.type(screen.getByLabelText('Tên tùy chọn'), 'Thêm sữa');
    await user.selectOptions(
      screen.getAllByRole('combobox', { name: 'Nguyên liệu' })[1],
      ingredientId,
    );
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));
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
    recipeApi({ ...snapshot(), recipes: [] }, false);
    const user = show('recipes');
    await screen.findByText('Chưa có công thức');
    await user.click(screen.getByRole('button', { name: 'Thêm công thức' }));
    await user.click(await screen.findByRole('button', { name: 'Tiếp tục' }));
    expect(await screen.findByText('Vui lòng chọn món trong chi nhánh.')).toBeInTheDocument();
  });
  it('shows catalog failures separately from an empty branch and retries successfully', async () => {
    let catalogReads = 0;
    vi.spyOn(api, 'request').mockImplementation(async (config) => {
      if (config.url?.endsWith('/recipe-catalog')) {
        catalogReads++;
        if (catalogReads === 1) throw new Error('network');
        return { data: { branchName: 'Chi nhánh A', categories: [], menuItems: [] } };
      }
      return { data: { ...snapshot(), recipes: [], menuItems: [] } };
    });
    const user = show('recipes');
    await screen.findByText('Chưa có công thức');
    await user.click(screen.getByRole('button', { name: 'Thêm công thức' }));
    expect(await screen.findByText(/Không thể tải danh mục món/)).toBeInTheDocument();
    expect(screen.queryByText('Chưa có món nào trong thực đơn')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Chưa có món nào trong thực đơn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo món mới' })).toBeInTheDocument();
  });
  it('creates a first menu and recipe through one scoped request, preserving the operation key on retry', async () => {
    let writes = 0;
    const mock = vi.spyOn(api, 'request').mockImplementation(async (config) => {
      if (config.url?.endsWith('/recipe-catalog'))
        return { data: { branchName: 'Chi nhánh A', categories: [], menuItems: [] } };
      if (config.method === 'POST') {
        writes++;
        if (writes === 1) throw new Error('network');
        return { data: { id: 'new-recipe', posEligible: true } };
      }
      return { data: { ...snapshot(), recipes: [], menuItems: [] } };
    });
    const user = show('recipes');
    await screen.findByText('Chưa có công thức');
    await user.click(screen.getByRole('button', { name: 'Thêm công thức' }));
    expect(await screen.findByText('Chưa có món nào trong thực đơn')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Tạo món mới kèm công thức' }));
    await user.type(screen.getByLabelText('Tên món'), 'Cà phê mới');
    await user.type(screen.getByLabelText('Giá bán'), '42000');
    await user.type(screen.getByLabelText('Hoặc tạo danh mục mới'), 'Đồ uống');
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await user.click(screen.getByRole('button', { name: 'Thêm định lượng' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Nguyên liệu' }), ingredientId);
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    expect(screen.getByText('Xác nhận công thức')).toBeInTheDocument();
    expect(mock.mock.calls.filter(([config]) => config.method === 'POST')).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Tạo món và lưu công thức' }));
    expect(
      await screen.findByText('Không thể xử lý dữ liệu kho. Vui lòng thử lại.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tạo món và lưu công thức' }));
    expect(await screen.findByRole('button', { name: 'Xem công thức' })).toBeInTheDocument();
    const posts = mock.mock.calls
      .map(([config]) => config)
      .filter((config) => config.method === 'POST');
    expect(posts).toHaveLength(2);
    expect(posts[0].url).toMatch(/\/recipes\/create-with-menu$/);
    expect(posts[0].data).toMatchObject({
      menu: { name: 'Cà phê mới', price: 42000, categoryName: 'Đồ uống' },
      ingredients: [{ ingredientId, quantity: 1, unit: 'ml' }],
    });
    expect((posts[0].data as { requestKey: string }).requestKey).toBe(
      (posts[1].data as { requestKey: string }).requestKey,
    );
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
