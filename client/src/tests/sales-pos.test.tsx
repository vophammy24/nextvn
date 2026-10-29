import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SalesPOSPage from '@/pages/staff/SalesPOSPage';
import { WorkspaceSessionContext } from '@/features/auth/workspaceContext';
import {
  clearSalesDraftTabs,
  loadSalesTabs,
  newSalesTab,
  saveSalesTabs,
  salesDraftScope,
} from '@/pages/staff/salesDraftTabs';

const ORDER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const mocks = vi.hoisted(() => ({
  checkout: vi.fn(),
  create: vi.fn(),
  pay: vi.fn(),
  fetch: vi.fn(),
  catalog: vi.fn(),
}));
vi.mock('@/services/salesApi', () => ({
  fetchActiveShift: vi
    .fn()
    .mockResolvedValue({ id: 'shift', status: 'ACTIVE', startedAt: '2026-10-28T08:00:00Z' }),
}));
vi.mock('@/services/salesWorkflowApi', () => ({
  fetchSalesCatalog: mocks.catalog,
  fetchSalesSettings: vi.fn().mockResolvedValue({
    serviceType: 'BOTH',
    counterPaymentPolicy: 'STAFF_CHOICE',
    dineInOrderingMode: 'BOTH',
  }),
  fetchSalesTables: vi.fn().mockResolvedValue([]),
  currentSalesBranchId: vi.fn().mockResolvedValue('branch'),
  fetchSalesOrder: mocks.fetch,
  fetchSalesOrderByRequestKey: vi.fn().mockRejectedValue(Error('missing')),
  checkoutSalesOrder: mocks.checkout,
  createSalesOrder: mocks.create,
  editSalesOrder: vi.fn(),
  paySalesOrder: mocks.pay,
}));

const workspace = {
  user: { id: 'user-a', fullName: 'Nhân viên' },
  business: { id: 'business-a', name: 'Quán A' },
  branch: { id: 'branch-a', name: 'Chi nhánh A' },
  role: 'STAFF' as const,
};
function renderPOS(options: { scoped?: boolean; route?: string; reopenLink?: boolean } = {}) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[options.route ?? '/app/pos']}>
        {options.reopenLink && <Link to={`/app/pos?order=${ORDER_ID}`}>Mở lại đơn</Link>}
        {options.scoped ? (
          <WorkspaceSessionContext.Provider value={{ context: workspace, isPreview: false }}>
            <SalesPOSPage />
          </WorkspaceSessionContext.Provider>
        ) : (
          <SalesPOSPage />
        )}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  const result = (status: 'OPEN' | 'PAID') => ({
    id: ORDER_ID,
    orderType: 'TAKEAWAY',
    orderingMode: 'COUNTER',
    tableId: null,
    status,
    total: 45000,
    subtotal: 45000,
    discount: 0,
    note: null,
    revision: 1,
    items: [
      {
        id: 'line',
        menuItemId: 'menu',
        quantity: 1,
        note: null,
        modifierKeys: [],
        name: 'Cà phê sữa',
        total: 45000,
      },
    ],
    payments: status === 'PAID' ? [{ id: 'payment', method: 'CASH', amount: 45000 }] : [],
  });
  mocks.checkout.mockResolvedValue(result('PAID'));
  mocks.create.mockResolvedValue(result('OPEN'));
  mocks.pay.mockResolvedValue(result('PAID'));
  mocks.fetch.mockResolvedValue(result('OPEN'));
  mocks.catalog.mockResolvedValue([
    {
      id: 'menu',
      name: 'Cà phê sữa',
      price: 45000,
      description: null,
      imageUrl: null,
      categoryId: 'coffee',
      categoryName: 'Cà phê',
      modifiers: [],
    },
  ]);
});

describe('Sales POS', () => {
  it('requires an explicit collected-money confirmation for atomic immediate checkout', async () => {
    const user = userEvent.setup();
    renderPOS();
    await user.click(await screen.findByRole('button', { name: 'Thêm món' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận thu tiền' }));
    expect(mocks.checkout).not.toHaveBeenCalled();
    await user.click(
      within(screen.getByRole('dialog', { name: 'Xác nhận thu tiền ngay' })).getByRole('button', {
        name: 'Đã nhận tiền',
      }),
    );
    await waitFor(() => expect(mocks.checkout).toHaveBeenCalledTimes(1));
    expect(mocks.checkout.mock.calls[0][1]).toBe('CASH');
    expect(mocks.checkout.mock.calls[0][2]).toBe(45000);
    expect(mocks.checkout.mock.calls[0][0]).toMatchObject({
      paymentTiming: 'NOW',
      tableId: null,
      items: [{ menuItemId: 'menu', quantity: 1 }],
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('saves a counter order as unpaid when pay later is selected', async () => {
    const user = userEvent.setup();
    renderPOS();
    await user.click(await screen.findByRole('button', { name: 'Thêm món' }));
    await user.click(screen.getByRole('button', { name: 'Thanh toán sau' }));
    await user.click(screen.getByRole('button', { name: 'Lưu đơn' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create.mock.calls[0][0]).toMatchObject({
      paymentTiming: 'LATER',
      orderingMode: 'COUNTER',
    });
    expect(mocks.checkout).not.toHaveBeenCalled();
  });
  it('keeps five independent tabs and blocks a sixth', async () => {
    const user = userEvent.setup();
    renderPOS({ scoped: true });
    await user.click(await screen.findByRole('button', { name: 'Thêm món' }));
    for (let index = 1; index < 5; index++)
      await user.click(screen.getByRole('button', { name: '+ Đơn mới' }));
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.getByRole('button', { name: '+ Đơn mới' })).toBeDisabled();
    expect(screen.getByText(/Đã mở tối đa 5 tab/)).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Khách 01/ }));
    expect(screen.getByRole('tab', { name: /Khách 01/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Cà phê sữa');
    await user.click(screen.getByRole('tab', { name: /Khách 05/ }));
    expect(screen.getByRole('tabpanel')).not.toHaveTextContent('Ước tính: 45.000');
  });
  it('restores a draft after remount and isolates users and branches', async () => {
    const user = userEvent.setup();
    const mounted = renderPOS({ scoped: true });
    await user.click(await screen.findByRole('button', { name: 'Thêm món' }));
    await user.type(screen.getByRole('textbox', { name: 'Ghi chú đơn' }), 'Ít đá');
    mounted.unmount();
    renderPOS({ scoped: true });
    expect(await screen.findByRole('textbox', { name: 'Ghi chú đơn' })).toHaveValue('Ít đá');
    expect(screen.getByRole('tab', { name: /Khách 01/ })).toHaveTextContent('1 món');
    const scope = salesDraftScope('user-a', 'business-a', 'branch-a');
    expect(loadSalesTabs(scope).tabs[0].lines).toHaveLength(1);
    expect(
      loadSalesTabs(salesDraftScope('user-b', 'business-a', 'branch-a')).tabs[0].lines,
    ).toHaveLength(0);
    expect(
      loadSalesTabs(salesDraftScope('user-a', 'business-a', 'branch-b')).tabs[0].lines,
    ).toHaveLength(0);
    clearSalesDraftTabs();
    expect(sessionStorage.getItem(scope)).toBeNull();
  });
  it('keeps quantity, item notes and modifiers when switching tabs and refreshing', async () => {
    mocks.catalog.mockResolvedValue([
      {
        id: 'menu',
        name: 'Cà phê sữa',
        price: 45000,
        description: null,
        imageUrl: null,
        categoryId: 'coffee',
        modifiers: [{ key: 'large', name: 'Cỡ lớn', priceExtra: 5000 }],
      },
    ]);
    const user = userEvent.setup();
    const mounted = renderPOS({ scoped: true });
    await user.click(await screen.findByRole('button', { name: 'Thêm món' }));
    await user.click(screen.getByRole('button', { name: 'Tăng số lượng Cà phê sữa' }));
    await user.click(screen.getByRole('checkbox', { name: /Cỡ lớn/ }));
    await user.type(screen.getByRole('textbox', { name: 'Ghi chú Cà phê sữa' }), 'Ít đá');
    await user.click(screen.getByRole('button', { name: '+ Đơn mới' }));
    await user.click(screen.getByRole('tab', { name: /Khách 01/ }));
    expect(screen.getByRole('checkbox', { name: /Cỡ lớn/ })).toBeChecked();
    expect(screen.getByRole('textbox', { name: 'Ghi chú Cà phê sữa' })).toHaveValue('Ít đá');
    mounted.unmount();
    renderPOS({ scoped: true });
    await user.click(screen.getByRole('tab', { name: /Khách 01/ }));
    expect(screen.getByRole('checkbox', { name: /Cỡ lớn/ })).toBeChecked();
    expect(screen.getByRole('textbox', { name: 'Ghi chú Cà phê sữa' })).toHaveValue('Ít đá');
    expect(screen.getByRole('tab', { name: /Khách 01/ })).toHaveTextContent('2 món');
  });
  it('closes empty tabs immediately and asks before discarding a filled draft', async () => {
    const user = userEvent.setup();
    renderPOS();
    await user.click(screen.getByRole('button', { name: '+ Đơn mới' }));
    await user.click(screen.getByRole('button', { name: 'Đóng tab Khách 02' }));
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    await user.click(await screen.findByRole('button', { name: 'Thêm món' }));
    await user.click(screen.getByRole('button', { name: 'Đóng tab Khách 01' }));
    expect(screen.getByRole('dialog', { name: 'Bạn muốn bỏ đơn nháp này?' })).toBeInTheDocument();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Giữ lại' }));
    expect(screen.getByRole('tab')).toHaveTextContent('1 món');
  });
  it('discards stale or invalid stored drafts', () => {
    const scope = salesDraftScope('user-a', 'business-a', 'branch-a');
    const tab = newSalesTab('Khách 01');
    saveSalesTabs(scope, { tabs: [tab], activeId: tab.id });
    const data = JSON.parse(sessionStorage.getItem(scope)!);
    data.storedAt = Date.now() - 25 * 60 * 60 * 1000;
    sessionStorage.setItem(scope, JSON.stringify(data));
    expect(loadSalesTabs(scope).tabs[0].id).not.toBe(tab.id);
    sessionStorage.setItem(scope, '{broken');
    expect(loadSalesTabs(scope).tabs).toHaveLength(1);
  });
  it('ignores a malformed order link without corrupting valid saved drafts', async () => {
    const scope = salesDraftScope('user-a', 'business-a', 'branch-a');
    const tab = newSalesTab('Khách đang bán', {
      lines: [{ menuItemId: 'menu', quantity: 1, note: '', modifierKeys: [] }],
    });
    saveSalesTabs(scope, { tabs: [tab], activeId: tab.id });
    renderPOS({ scoped: true, route: '/app/pos?order=invalid-id' });
    expect(await screen.findByRole('tab', { name: /Khách đang bán/ })).toHaveTextContent('1 món');
    expect(loadSalesTabs(scope).tabs[0].id).toBe(tab.id);
  });
  it('keeps Tab B while Tab A saves and pays; closing saved tab leaves the server order intact', async () => {
    const user = userEvent.setup();
    renderPOS({ scoped: true, reopenLink: true });
    await user.click(screen.getByRole('button', { name: '+ Đơn mới' }));
    await user.click(await screen.findByRole('button', { name: 'Thêm món' }));
    await user.type(screen.getByRole('textbox', { name: 'Ghi chú đơn' }), 'Khách B');
    await user.click(screen.getByRole('tab', { name: /Khách 01/ }));
    await user.click(screen.getByRole('button', { name: 'Thêm món' }));
    await user.click(screen.getByRole('button', { name: 'Thanh toán sau' }));
    await user.click(screen.getByRole('button', { name: 'Lưu đơn' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('tab', { name: /Khách 02/ }));
    expect(screen.getByRole('textbox', { name: 'Ghi chú đơn' })).toHaveValue('Khách B');
    await user.click(screen.getByRole('link', { name: 'Mở lại đơn' }));
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: /Khách 01/ })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('button', { name: 'Xác nhận thanh toán' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Xác nhận đã nhận tiền' })).getByRole('button', {
        name: 'Đã nhận tiền',
      }),
    );
    await waitFor(() => expect(mocks.pay).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('button', { name: 'Hoàn tất và đóng tab' }));
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: 'Ghi chú đơn' })).toHaveValue('Khách B');
  });
  it('rechecks menu prices before confirming an old draft', async () => {
    const user = userEvent.setup();
    renderPOS();
    await user.click(await screen.findByRole('button', { name: 'Thêm món' }));
    mocks.catalog.mockResolvedValue([
      {
        id: 'menu',
        name: 'Cà phê sữa',
        price: 50000,
        description: null,
        imageUrl: null,
        categoryId: 'coffee',
        modifiers: [],
      },
    ]);
    await user.click(screen.getByRole('button', { name: 'Xác nhận thu tiền' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Xác nhận thu tiền ngay' })).getByRole('button', {
        name: 'Đã nhận tiền',
      }),
    );
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Giá món đã thay đổi'));
    expect(mocks.checkout).not.toHaveBeenCalled();
  });
  it('closes a saved unpaid order tab without canceling the persisted order', async () => {
    const user = userEvent.setup();
    renderPOS({ scoped: true, route: `/app/pos?order=${ORDER_ID}` });
    await screen.findByText(/Mã đơn:/);
    await user.click(screen.getByRole('button', { name: 'Đóng tab Khách 02' }));
    const dialog = screen.getByRole('dialog', { name: 'Đóng tab đơn hàng?' });
    expect(dialog).toHaveTextContent('Đơn đã lưu vẫn còn');
    await user.click(within(dialog).getByRole('button', { name: 'Đóng tab' }));
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    expect(mocks.pay).not.toHaveBeenCalled();
  });
  it('blocks stale saved drafts until canonical server state is loaded', async () => {
    const scope = salesDraftScope('user-a', 'business-a', 'branch-a');
    const tab = newSalesTab('Đơn đang sửa', {
      orderId: ORDER_ID,
      savedRevision: 1,
      status: 'OPEN',
      lines: [{ menuItemId: 'menu', quantity: 1, note: 'Bản cũ', modifierKeys: [] }],
    });
    saveSalesTabs(scope, { tabs: [tab], activeId: tab.id });
    mocks.fetch.mockResolvedValue({
      id: ORDER_ID,
      orderType: 'TAKEAWAY',
      orderingMode: 'COUNTER',
      tableId: null,
      status: 'OPEN',
      total: 45000,
      subtotal: 45000,
      discount: 0,
      note: null,
      revision: 2,
      items: [
        {
          id: 'line',
          menuItemId: 'menu',
          quantity: 1,
          note: null,
          modifierKeys: [],
          name: 'Cà phê sữa',
          total: 45000,
        },
      ],
      payments: [],
    });
    const user = userEvent.setup();
    renderPOS({ scoped: true });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Đơn đã thay đổi trên thiết bị khác',
    );
    expect(screen.queryByRole('button', { name: 'Xác nhận thanh toán' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tải lại đơn từ máy chủ' }));
    expect(await screen.findByRole('button', { name: 'Xác nhận thanh toán' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Ghi chú Cà phê sữa' })).toHaveValue('');
  });
});
