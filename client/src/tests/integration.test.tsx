import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { renderApp } from './renderApp';
import { sessionFixture } from './sessionFixture';
import { api } from '@/services/api';
import { canAccess, navigation, roleHome } from '@/app/navigation';
import { useWorkspaceStore, type WorkspaceContext } from '@/stores/workspace';
import { sessionSchema } from '@/features/auth/session';
import { WorkspaceSessionContext } from '@/features/auth/workspaceContext';
import { scopeOrders } from '@/features/operations/useScopedOrders';
import { fixtures } from '@/features/operations/dev/fixtures';
import { managerFixtures } from '@/features/manager/dev/fixtures';
import { ownerFixtures } from '@/features/owner/dev/fixtures';
import { OperationsBoundary } from '@/features/operations/data';
import { ManagerDataBoundary } from '@/features/manager/data';
import { OwnerDataBoundary } from '@/features/owner/data';
import { TablesWorkspace } from '@/features/operations/TablesPage';
import { Recipes } from '@/features/manager/RecipesPage';
import { Dashboard, Reports } from '@/features/manager/AnalyticsPages';
import { Subscription } from '@/features/owner/BusinessPages';
import { Overview } from '@/features/owner/AnalyticsPages';
import { AnalyticsChart } from '@/components/common/AnalyticsChart';

beforeAll(async () => {
  await Promise.all([
    import('@/features/manager/ManagerPage'),
    import('@/features/owner/OwnerPage'),
  ]);
}, 30000);
beforeEach(() => {
  useWorkspaceStore.getState().setPreviewRole(null);
  vi.spyOn(api, 'get').mockResolvedValue({ data: sessionFixture() });
});
afterEach(() => {
  useWorkspaceStore.getState().setPreviewRole(null);
  vi.restoreAllMocks();
});
const preview: WorkspaceContext = {
  user: { id: 'preview-user', fullName: 'Minh họa' },
  business: { id: 'preview-business', name: 'Doanh nghiệp mẫu' },
  branch: { id: 'preview-branch', name: 'Chi nhánh mẫu' },
  role: 'STAFF',
};

describe('Phân quyền và phiên đăng nhập', () => {
  it.each([
    ['STAFF', 'Bán hàng'],
    ['MANAGER', 'Tổng quan cửa hàng'],
    ['OWNER', 'Tổng quan doanh nghiệp'],
  ] as const)('/app đưa %s đến trang mặc định', async (role, title) => {
    vi.mocked(api.get).mockResolvedValue({ data: sessionFixture(role) });
    renderApp('/app');
    expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeInTheDocument();
    const active = within(screen.getByRole('navigation', { name: 'Điều hướng chính' }))
      .getAllByRole('link')
      .find((link) => link.getAttribute('aria-current') === 'page');
    expect(active).toHaveAttribute('href', roleHome(role));
  });
  it('helper chỉ chấp nhận vai trò doanh nghiệp và route đã cấp quyền', () => {
    for (const item of navigation) {
      for (const role of ['STAFF', 'MANAGER', 'OWNER'] as const)
        expect(canAccess(role, item.roles)).toBe(item.roles.includes(role));
      for (const role of ['ADMIN', 'manager', '', null, undefined])
        expect(canAccess(role, item.roles)).toBe(false);
    }
  });
  it.each(['STAFF', 'MANAGER'] as const)('từ chối phiên %s không có chi nhánh', async (role) => {
    const invalid = {
      ...sessionFixture(role),
      membership: { ...sessionFixture(role).membership, branch: null },
    };
    expect(sessionSchema.safeParse(invalid).success).toBe(false);
    vi.mocked(api.get).mockResolvedValue({ data: invalid });
    renderApp('/app');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Thông tin phiên đăng nhập không hợp lệ',
    );
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
  it('ADMIN nền tảng không trở thành OWNER trong ứng dụng doanh nghiệp', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        ...sessionFixture('OWNER'),
        membership: { ...sessionFixture('OWNER').membership, role: 'ADMIN' },
      },
    });
    renderApp('/app/owner');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Thông tin phiên đăng nhập không hợp lệ',
    );
    expect(screen.queryByText('CHỦ DOANH NGHIỆP')).not.toBeInTheDocument();
  });
  it('đợi xác minh phiên rồi cho thử lại khi API xác thực chưa khả dụng', async () => {
    let rejectRequest: (reason: unknown) => void = () => {};
    vi.mocked(api.get).mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectRequest = reject;
        }),
    );
    renderApp('/app/profile');
    expect(screen.getByRole('status')).toHaveTextContent('Đang xác minh phiên đăng nhập');
    rejectRequest({ isAxiosError: true, response: { status: 501 } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Dịch vụ xác thực chưa khả dụng');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('heading', { name: 'Nguyễn An' })).toBeInTheDocument();
  });
  it('chuyển trang bằng bàn phím đưa focus về nội dung chính', async () => {
    renderApp('/app/pos');
    const link = await screen.findByRole('link', { name: 'Đơn hàng' });
    link.focus();
    await userEvent.setup().keyboard('{Enter}');
    expect(screen.getByRole('main')).toHaveFocus();
  });
});

describe('Cách ly dữ liệu', () => {
  it('Staff chỉ thấy đơn của mình trong ca, Manager thấy đơn chi nhánh, Owner không dùng dữ liệu vận hành', () => {
    const order = {
      ...fixtures.orders[0],
      branchId: preview.branch!.id,
      shiftId: fixtures.shift.id,
      cashierId: preview.user.id,
    };
    const data = {
      ...fixtures,
      orders: [
        { ...order, id: 'mine' },
        { ...order, id: 'peer', cashierId: 'other-user' },
        { ...order, id: 'old-shift', shiftId: 'old' },
        { ...order, id: 'other-branch', branchId: 'other' },
      ],
    };
    expect(scopeOrders(data, preview).map((item) => item.id)).toEqual(['mine']);
    expect(scopeOrders(data, { ...preview, role: 'MANAGER' }).map((item) => item.id)).toEqual([
      'mine',
      'peer',
      'old-shift',
    ]);
    expect(scopeOrders(data, { ...preview, role: 'OWNER' })).toEqual([]);
    expect(
      scopeOrders(data, { ...preview, business: { id: 'other-business', name: 'Khác' } }),
    ).toEqual([]);
  });
  it.each(['operations', 'manager', 'owner'] as const)(
    '%s từ chối dữ liệu doanh nghiệp khác ngay ở lớp nạp',
    async (kind) => {
      const context = {
        ...preview,
        role:
          kind === 'owner'
            ? ('OWNER' as const)
            : kind === 'manager'
              ? ('MANAGER' as const)
              : ('STAFF' as const),
        business: { id: 'wrong-business', name: 'Khác' },
      };
      const query = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const content =
        kind === 'operations' ? (
          <OperationsBoundary>{() => <p>Dữ liệu bị lộ</p>}</OperationsBoundary>
        ) : kind === 'manager' ? (
          <ManagerDataBoundary>{() => <p>Dữ liệu bị lộ</p>}</ManagerDataBoundary>
        ) : (
          <OwnerDataBoundary>{() => <p>Dữ liệu bị lộ</p>}</OwnerDataBoundary>
        );
      render(
        <QueryClientProvider client={query}>
          <WorkspaceSessionContext.Provider value={{ context, isPreview: true }}>
            {content}
          </WorkspaceSessionContext.Provider>
        </QueryClientProvider>,
      );
      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(screen.queryByText('Dữ liệu bị lộ')).not.toBeInTheDocument();
    },
  );
});

describe('Dữ liệu rỗng không làm sập màn hình', () => {
  it.each([
    [
      'bàn',
      <TablesWorkspace key="tables" data={{ ...fixtures, tables: [] }} />,
      'Chưa có bàn trong khu vực này',
    ],
    [
      'công thức',
      <Recipes key="recipes" data={{ ...managerFixtures, recipes: [] }} />,
      'Chưa có công thức',
    ],
    [
      'tổng quan quản lý',
      <Dashboard key="dashboard" data={{ ...managerFixtures, days: [] }} />,
      'Chưa có dữ liệu tổng quan hôm nay',
    ],
    [
      'báo cáo',
      <Reports key="reports" data={{ ...managerFixtures, days: [] }} />,
      'Chưa có dữ liệu báo cáo',
    ],
    [
      'tổng quan doanh nghiệp',
      <Overview key="overview" data={{ ...ownerFixtures, sales: [] }} />,
      'Chưa có dữ liệu tổng quan doanh nghiệp',
    ],
    [
      'gói dịch vụ',
      <Subscription
        key="subscription"
        data={{ ...ownerFixtures, subscription: { ...ownerFixtures.subscription, plans: [] } }}
      />,
      'Chưa có thông tin gói dịch vụ',
    ],
    [
      'biểu đồ',
      <AnalyticsChart key="chart" title="Doanh thu" description="Kiểm thử" rows={[]} />,
      'Chưa có dữ liệu biểu đồ',
    ],
  ])('%s có thông báo tiếng Việt', (_name, component, message) => {
    render(<MemoryRouter>{component}</MemoryRouter>);
    expect(screen.getByRole('heading', { name: message as string })).toBeInTheDocument();
  });
  it('khu vực không có bàn không giữ chi tiết bàn của khu vực trước', async () => {
    render(
      <MemoryRouter>
        <TablesWorkspace data={{ ...fixtures, tables: [fixtures.tables[0]] }} />
      </MemoryRouter>,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ngoài trời' }));
    expect(screen.getByText('Chưa có bàn trong khu vực này')).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Chi tiết bàn' })).not.toBeInTheDocument();
  });
});
