import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { api } from '@/services/api';
import { useWorkspaceStore } from '@/stores/workspace';
import { navigation } from '@/app/navigation';
import { copy } from '@/locales/vi';
import { renderApp } from './renderApp';
import { sessionFixture } from './sessionFixture';
import { ownerFixtures } from '@/features/owner/dev/fixtures';
import {
  canEditUser,
  groupedRevenue,
  menuMetrics,
  periodSales,
  totals,
  userSchema,
  settingsSchema,
} from '@/features/owner/model';
import { formatCurrency } from '@/lib/format';

beforeAll(async () => {
  await import('@/features/owner/OwnerPage');
}, 30000);
beforeEach(() => {
  useWorkspaceStore.getState().setPreviewRole('OWNER');
  vi.spyOn(api, 'get').mockResolvedValue({ data: sessionFixture('OWNER') });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  useWorkspaceStore.getState().setPreviewRole(null);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const routes = navigation.filter((item) => item.roles.length === 1 && item.roles[0] === 'OWNER');
describe('Giao diện chủ doanh nghiệp', () => {
  it('hiển thị đúng menu OWNER bằng tiếng Việt', async () => {
    renderApp('/app/owner');
    await screen.findByText('Tổng doanh thu');
    const sidebar = within(screen.getByRole('complementary', { name: 'Thanh điều hướng' }));
    expect(sidebar.getByText('CHỦ DOANH NGHIỆP')).toBeInTheDocument();
    expect(
      within(sidebar.getByRole('navigation'))
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual([...routes.map((route) => copy.navigation[route.key]), 'Hồ sơ cá nhân']);
    expect(screen.getByRole('note')).toHaveTextContent('Toàn bộ 3 chi nhánh');
    expect(screen.queryByText(/AI thông minh/)).not.toBeInTheDocument();
  });
  it.each(routes)('truy cập được $path', async ({ path, key }) => {
    renderApp(path);
    expect(
      await screen.findByRole('heading', { name: copy.navigation[key], level: 1 }),
    ).toBeInTheDocument();
    expect((await screen.findAllByRole('note'))[0]).toHaveTextContent('Dữ liệu minh họa');
  });
  it('bộ lọc doanh thu tính lại dữ liệu tuần và quý', async () => {
    renderApp('/app/owner/revenue');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Tuần' }));
    expect(screen.getByText('24–30/09/2026 · Tất cả chi nhánh')).toBeInTheDocument();
    const week = totals(ownerFixtures, periodSales(ownerFixtures, 'week')).revenue;
    expect(screen.getByText('Tổng doanh thu').closest('article')).toHaveTextContent(
      formatCurrency(week).replace(/\s/g, ' '),
    );
    await user.click(screen.getByRole('button', { name: 'Quý' }));
    const quarter = totals(ownerFixtures, periodSales(ownerFixtures, 'quarter')).revenue;
    expect(screen.getByText('Tổng doanh thu').closest('article')).toHaveTextContent(
      formatCurrency(quarter).replace(/\s/g, ' '),
    );
    expect(quarter).toBeGreaterThan(week);
  });
  it('xem tổng quan một chi nhánh và thêm chi nhánh không tạo thành công giả', async () => {
    renderApp('/app/owner/branches');
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: 'Xem tổng quan chi nhánh: Chi nhánh Sân vườn' }),
    );
    const panel = screen.getByRole('region', { name: 'Tổng quan: Chi nhánh Sân vườn' });
    expect(within(panel).getByText('Sữa tươi')).toBeInTheDocument();
    expect(within(panel).queryByText('Hạt cà phê')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Thêm chi nhánh' }));
    await user.click(screen.getByRole('button', { name: 'Lưu chi nhánh' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập tên chi nhánh.');
    await user.type(screen.getByLabelText('Tên chi nhánh'), 'Chi nhánh mới');
    await user.type(screen.getByLabelText('Địa điểm'), 'Địa điểm thử');
    await user.click(screen.getByRole('button', { name: 'Lưu chi nhánh' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Chưa tạo chi nhánh');
  });
  it('tồn kho OWNER chỉ phân tích và không có hành động nhập kho', async () => {
    renderApp('/app/owner/inventory');
    expect(
      await screen.findByRole('heading', { name: 'Tồn kho nguyên liệu toàn doanh nghiệp' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Hết hàng').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Thêm nguyên liệu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ghi nhận giao dịch' })).not.toBeInTheDocument();
  });
  it('gợi ý khuyến mãi không gọi API hoặc tạo khuyến mãi giả', async () => {
    const post = vi.spyOn(api, 'post');
    renderApp('/app/owner/promotions');
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: 'Áp dụng khuyến mãi: Combo cuối tuần' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Chưa tạo khuyến mãi');
    expect(post).not.toHaveBeenCalled();
  });
  it('quản lý người dùng chỉ có ba vai trò doanh nghiệp, bảo vệ tài khoản hiện tại', async () => {
    renderApp('/app/owner/users');
    const user = userEvent.setup();
    expect(
      await screen.findByRole('button', { name: 'Chỉnh sửa: Chủ doanh nghiệp mẫu' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Vô hiệu hóa: Chủ doanh nghiệp mẫu' }),
    ).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Thêm người dùng' }));
    const role = screen.getByRole('combobox', { name: 'Vai trò' });
    expect(
      within(role)
        .getAllByRole('option')
        .map((option) => option.getAttribute('value')),
    ).toEqual(['STAFF', 'MANAGER', 'OWNER']);
    await user.type(screen.getByLabelText('Họ tên'), 'Người dùng thử');
    await user.type(screen.getByLabelText('Email'), 'new@example.test');
    await user.click(screen.getByRole('button', { name: 'Lưu người dùng' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng chọn chi nhánh');
    await user.selectOptions(role, 'OWNER');
    expect(screen.getByRole('combobox', { name: 'Chi nhánh' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Lưu người dùng' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Chưa tạo tài khoản hoặc thay đổi phân quyền',
    );
  });
  it('vô hiệu hóa người dùng không thay đổi trạng thái hoặc gửi API', async () => {
    const post = vi.spyOn(api, 'post');
    renderApp('/app/owner/users');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Vô hiệu hóa: Quản lý mẫu A' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận vô hiệu hóa' }));
    expect(screen.getByRole('status')).toHaveTextContent('Trạng thái người dùng chưa thay đổi');
    expect(post).not.toHaveBeenCalled();
  });
  it('gói minh họa có mức sử dụng và không tạo thanh toán', async () => {
    const post = vi.spyOn(api, 'post');
    renderApp('/app/owner/subscription');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Chọn gói Mở rộng' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Chưa tạo yêu cầu thanh toán hoặc thay đổi gói',
    );
    expect(screen.getByRole('heading', { name: 'Lịch sử thanh toán' })).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar')).toHaveLength(2);
    expect(post).not.toHaveBeenCalled();
  });
  it('cài đặt tiếng Việt xác thực tỷ lệ và không giả lập lưu', async () => {
    renderApp('/app/owner/settings');
    const user = userEvent.setup();
    const tax = await screen.findByLabelText('Thuế (%)');
    await user.clear(tax);
    await user.type(tax, '101');
    await user.click(screen.getByRole('button', { name: 'Lưu cài đặt' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Thuế không được vượt quá 100%');
    await user.clear(tax);
    await user.type(tax, '8');
    await user.click(screen.getByRole('button', { name: 'Lưu cài đặt' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Chưa thay đổi thông tin doanh nghiệp');
  });
  it('hồ sơ dùng chủ doanh nghiệp được xác thực từ API', async () => {
    useWorkspaceStore.getState().setPreviewRole(null);
    const session = sessionFixture('OWNER');
    session.user.fullName = 'Trần Chủ';
    vi.mocked(api.get).mockResolvedValue({ data: session });
    renderApp('/app/profile');
    expect(await screen.findByRole('heading', { name: 'Trần Chủ' })).toBeInTheDocument();
    expect(screen.getByText('an@example.test')).toBeInTheDocument();
    expect(screen.getAllByText('Chủ doanh nghiệp').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Kim Chen|Maya Tan|Sarah Chen/)).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(
      '/auth/me',
      expect.objectContaining({ withCredentials: true }),
    );
  });
  it('phiên OWNER thật không nhận dữ liệu hoặc giá minh họa', async () => {
    useWorkspaceStore.getState().setPreviewRole(null);
    renderApp('/app/owner/subscription');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Dịch vụ quản trị doanh nghiệp chưa được kết nối',
    );
    expect(screen.queryByText('499.000 ₫')).not.toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
  it.each(['STAFF', 'MANAGER'] as const)(
    '%s không vào được mọi route OWNER bằng URL trực tiếp',
    async (role) => {
      useWorkspaceStore.getState().setPreviewRole(null);
      vi.mocked(api.get).mockResolvedValue({ data: sessionFixture(role) });
      for (const route of routes) {
        const view = renderApp(route.path);
        expect(
          await screen.findByRole('heading', { name: 'Bạn không có quyền truy cập' }),
        ).toBeInTheDocument();
        expect(screen.queryByRole('note')).not.toBeInTheDocument();
        view.unmount();
      }
    },
  );
});
describe('Phạm vi và quy tắc dữ liệu OWNER', () => {
  it('tổng chi nhánh, danh mục và món khớp doanh thu hợp nhất', () => {
    const sales = periodSales(ownerFixtures, 'month');
    const aggregate = totals(ownerFixtures, sales);
    for (const by of ['branch', 'category', 'month', 'hour'] as const)
      expect(
        groupedRevenue(ownerFixtures, sales, by).reduce((sum, row) => sum + row.value, 0),
      ).toBe(aggregate.revenue);
    const items = menuMetrics(ownerFixtures, sales);
    expect(items.reduce((sum, item) => sum + item.profit, 0)).toBe(
      aggregate.revenue - aggregate.cost,
    );
    expect(new Set(sales.map((sale) => sale.branchId)).size).toBe(3);
  });
  it('kỳ phân tích loại trừ giao dịch ngoài kỳ và chi nhánh khác', () => {
    const data = {
      ...ownerFixtures,
      sales: [...ownerFixtures.sales, { ...ownerFixtures.sales[0], date: '2026-10-01' }],
    };
    const rows = periodSales(data, 'week', data.branches[0].id);
    expect(
      rows.every(
        (row) =>
          row.date >= '2026-09-24' &&
          row.date <= '2026-09-30' &&
          row.branchId === data.branches[0].id,
      ),
    ).toBe(true);
    expect(rows).toHaveLength(7 * data.menu.length);
  });
  it('từ chối quản trị nền tảng, bảo vệ chủ cuối cùng và chính mình', () => {
    expect(
      userSchema.safeParse({ name: 'Thử', email: 'test@example.test', role: 'ADMIN', branchId: '' })
        .success,
    ).toBe(false);
    const owner = ownerFixtures.users[0];
    expect(canEditUser('OWNER', 'different-owner', owner, ownerFixtures.users)).toBe(false);
    expect(canEditUser('OWNER', owner.id, owner, ownerFixtures.users)).toBe(false);
    expect(canEditUser('MANAGER', 'other', ownerFixtures.users[1], ownerFixtures.users)).toBe(
      false,
    );
    expect(canEditUser('OWNER', owner.id, ownerFixtures.users[1], ownerFixtures.users)).toBe(true);
  });
  it('thuế và phí trống hoặc âm trả thông báo tiếng Việt', () => {
    for (const value of [-1, Number.NaN]) {
      const result = settingsSchema.safeParse({ ...ownerFixtures.settings, tax: value });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues[0].message).toMatch(/Thuế|thuế/);
    }
  });
});
