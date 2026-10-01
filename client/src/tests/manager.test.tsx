import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api';
import { useWorkspaceStore } from '@/stores/workspace';
import { renderApp } from './renderApp';
import { sessionFixture } from './sessionFixture';
import { managerFixtures } from '@/features/manager/dev/fixtures';
import {
  inventoryStatus,
  recipeCost,
  staffDraftSchema,
  canManageStaff,
  transactionSchema,
} from '@/features/manager/model';
import { csvCell } from '@/features/manager/export';

beforeAll(async () => {
  await import('@/features/manager/ManagerPage');
}, 30000);

beforeEach(() => {
  useWorkspaceStore.getState().setPreviewRole('MANAGER');
  vi.spyOn(api, 'get').mockResolvedValue({ data: sessionFixture('MANAGER') });
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

describe('Giao diện quản lý cửa hàng', () => {
  it('có tiêu đề quản lý và đúng 11 mục điều hướng tiếng Việt', async () => {
    renderApp('/app/inventory');
    await screen.findByRole('heading', { name: 'Quản lý kho' });
    const sidebar = within(screen.getByRole('complementary', { name: 'Thanh điều hướng' }));
    expect(sidebar.getByText('QUẢN LÝ CỬA HÀNG')).toBeInTheDocument();
    expect(
      within(sidebar.getByRole('navigation'))
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual([
      'Tổng quan',
      'Bán hàng',
      'Khu vực / Bàn',
      'Đơn hàng',
      'Kho hàng',
      'Nhập / Xuất kho',
      'Công thức',
      'Báo cáo',
      'Cảnh báo',
      'Nhân viên',
      'Hồ sơ cá nhân',
    ]);
  });
  it('dùng màn hình POS chung và thêm món vào đơn', async () => {
    renderApp('/app/pos');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Thêm Cà phê sữa' }));
    expect(screen.getByRole('complementary', { name: 'Đơn hàng hiện tại' })).toBeInTheDocument();
    expect(screen.getByLabelText('Kích cỡ Cà phê sữa')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });
  it('tổng quan có KPI, biểu đồ, thao tác nhanh và nhãn minh họa', async () => {
    renderApp('/app/dashboard');
    expect(await screen.findByText('Doanh thu hôm nay')).toBeInTheDocument();
    expect(screen.getByText('Nguyên liệu sắp hết')).toBeInTheDocument();
    expect(screen.getByText('Nguyên liệu sắp hết hạn')).toBeInTheDocument();
    for (const title of [
      'Doanh thu & đơn hàng trong tuần',
      'Giờ bán cao điểm hôm nay',
      'Thao tác nhanh',
      'Cảnh báo tồn kho',
      'Món bán chạy hôm nay',
    ])
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Không phải số liệu kinh doanh thực tế');
  });
  it('kho có 12 nguyên liệu, 3 mục cần chú ý và lọc danh mục', async () => {
    renderApp('/app/inventory');
    expect(await screen.findByText('12 nguyên liệu · 3 mục cần chú ý')).toBeInTheDocument();
    for (const name of [
      'Nguyên liệu',
      'Danh mục',
      'Đơn vị',
      'Tồn hiện tại',
      'Tồn tối thiểu',
      'Hạn sử dụng',
      'Trạng thái',
    ])
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Sữa' }));
    expect(screen.getByText('Sữa tươi')).toBeInTheDocument();
    expect(screen.queryByText('Cà phê hạt')).not.toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Tìm nguyên liệu' }), 'không tồn tại');
    expect(screen.getByRole('heading', { name: 'Không tìm thấy nguyên liệu' })).toBeInTheDocument();
  });
  it('Nhập thêm chuyển đúng nguyên liệu sang biểu mẫu giao dịch', async () => {
    renderApp('/app/inventory');
    const row = await screen.findByRole('row', { name: /Cà phê hạt/ });
    await userEvent.setup().click(within(row).getByRole('link', { name: 'Nhập thêm' }));
    expect(await screen.findByRole('combobox', { name: 'Nguyên liệu' })).toHaveValue('bean');
  });
  it('giao dịch kiểm tra số lượng và không giả ghi nhận thay đổi', async () => {
    const post = vi.spyOn(api, 'post');
    renderApp('/app/stock-transactions');
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Nguyên liệu' }), 'bean');
    await user.click(screen.getByRole('button', { name: 'Ghi nhận giao dịch' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập số lượng.');
    await user.type(screen.getByRole('spinbutton', { name: /Số lượng/ }), '100');
    await user.type(screen.getByLabelText('Nhà cung cấp'), 'Nhà cung cấp mẫu');
    await user.type(screen.getByLabelText('Lý do / Ghi chú'), 'Bổ sung cho ca chiều');
    await user.click(screen.getByRole('button', { name: 'Ghi nhận giao dịch' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Tồn kho và lịch sử giao dịch chưa thay đổi.',
    );
    expect(post).not.toHaveBeenCalled();
  });
  it('công thức có chi phí, định lượng, tùy chọn và tìm món', async () => {
    renderApp('/app/recipes');
    expect(await screen.findByRole('table', { name: 'Công thức Cà phê sữa' })).toBeInTheDocument();
    expect(screen.getByText('Chi phí nguyên liệu')).toBeInTheDocument();
    expect(screen.getByText('Biên lợi nhuận')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Điều chỉnh theo tùy chọn' })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.type(screen.getByRole('searchbox', { name: 'Tìm món trong công thức' }), 'Nước cam');
    await user.click(screen.getByRole('button', { name: /Nước cam/ }));
    expect(screen.getByRole('table', { name: 'Công thức Nước cam' })).toBeInTheDocument();
    expect(screen.getByText('Cam tươi')).toBeInTheDocument();
  });
  it('báo cáo thay đổi tổng hợp theo khoảng thời gian', async () => {
    renderApp('/app/reports');
    await screen.findByText('Doanh thu tuần');
    await userEvent.setup().selectOptions(screen.getByLabelText('Khoảng thời gian'), '1');
    const card = screen.getByText('Doanh thu trong khoảng chọn').closest('article');
    expect(card).toHaveTextContent('1.660.000');
    expect(
      screen.getByRole('heading', { name: 'Doanh thu so với chi phí nguyên liệu' }),
    ).toBeInTheDocument();
  });
  it('cảnh báo lọc trạng thái, mở chi tiết và không giả xử lý xong', async () => {
    renderApp('/app/alerts');
    await screen.findByRole('heading', { name: 'Sữa tươi sắp hết hạn' });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Xem chi tiết: Sữa tươi sắp hết hạn' }));
    expect(screen.getByText(/Lô sữa minh họa có hạn sử dụng/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xử lý xong: Sữa tươi sắp hết hạn' }));
    expect(screen.getByRole('status')).toHaveTextContent('Trạng thái cảnh báo chưa thay đổi.');
    await user.click(screen.getByRole('button', { name: 'Đã xử lý' }));
    expect(screen.queryByRole('heading', { name: 'Sữa tươi sắp hết hạn' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Đã đối chiếu tồn kho bột mì' }),
    ).toBeInTheDocument();
  });
  it('nhân viên không có lựa chọn OWNER và không thể sửa hoặc vô hiệu hóa OWNER', async () => {
    renderApp('/app/staff');
    expect(
      await screen.findByRole('button', { name: 'Chỉnh sửa Chủ doanh nghiệp mẫu' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Vô hiệu hóa Chủ doanh nghiệp mẫu' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Vô hiệu hóa Quản lý mẫu' })).toBeDisabled();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Thêm nhân viên' }));
    const role = screen.getByRole('combobox', { name: /Vai trò/ });
    expect(
      within(role)
        .getAllByRole('option')
        .map((option) => option.getAttribute('value')),
    ).toEqual(['STAFF', 'MANAGER']);
    await user.type(screen.getByLabelText('Họ tên'), 'Nhân viên thử');
    await user.type(screen.getByLabelText('Email'), 'thu@example.test');
    await user.click(screen.getByRole('button', { name: 'Lưu nhân viên' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Chưa tạo tài khoản hoặc thay đổi phân quyền.',
    );
  });
  it('vô hiệu hóa cần xác nhận và không thay đổi trạng thái giả', async () => {
    const post = vi.spyOn(api, 'post');
    renderApp('/app/staff');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Vô hiệu hóa Nhân viên mẫu 01' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận vô hiệu hóa' }));
    expect(screen.getByRole('status')).toHaveTextContent('Trạng thái tài khoản chưa thay đổi.');
    expect(post).not.toHaveBeenCalled();
  });
  it.each([
    '/app/owner',
    '/app/owner/branches',
    '/app/owner/revenue',
    '/app/owner/menu-profit',
    '/app/owner/inventory',
    '/app/owner/promotions',
    '/app/owner/users',
    '/app/owner/subscription',
    '/app/owner/settings',
  ])('chặn quản lý truy cập trực tiếp %s', async (path) => {
    useWorkspaceStore.getState().setPreviewRole(null);
    renderApp(path);
    expect(
      await screen.findByRole('heading', { name: 'Bạn không có quyền truy cập' }),
    ).toBeInTheDocument();
  });
  it('phiên thật không nhận số liệu minh họa', async () => {
    useWorkspaceStore.getState().setPreviewRole(null);
    renderApp('/app/dashboard');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Dịch vụ quản lý cửa hàng chưa được kết nối.',
    );
    expect(screen.queryByText('Doanh thu hôm nay')).not.toBeInTheDocument();
  });
});

describe('Quy tắc quản lý và dữ liệu minh họa', () => {
  it('từ chối OWNER trong schema và chính sách quản lý nhân viên', () => {
    expect(
      staffDraftSchema.safeParse({ name: 'Thử', email: 'thu@example.test', role: 'OWNER' }).success,
    ).toBe(false);
    const owner = managerFixtures.staff.find((member) => member.role === 'OWNER')!;
    expect(canManageStaff('MANAGER', 'preview-user', owner)).toBe(false);
    expect(canManageStaff('STAFF', 'other', managerFixtures.staff[0])).toBe(false);
    expect(canManageStaff('MANAGER', managerFixtures.staff[0].id, managerFixtures.staff[0])).toBe(
      false,
    );
  });
  it('xác định trạng thái tồn kho và chi phí theo đơn vị nguyên liệu', () => {
    const statuses = managerFixtures.ingredients.map((item) =>
      inventoryStatus(item, managerFixtures.asOf),
    );
    expect(statuses.filter((status) => status !== 'IN_STOCK')).toHaveLength(3);
    expect(recipeCost(managerFixtures.recipes[0], managerFixtures)).toBe(6650);
  });
  it('không chấp nhận số lượng âm, cho phép kiểm kê về 0', () => {
    const base = {
      type: 'ADJUST',
      ingredientId: 'bean',
      quantity: 0,
      supplier: '',
      expiry: '',
      note: 'Kiểm kê',
    };
    expect(transactionSchema.safeParse(base).success).toBe(true);
    expect(transactionSchema.safeParse({ ...base, quantity: -1 }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...base, type: 'OUT' }).success).toBe(false);
  });
  it('giữ an toàn ô CSV có dấu công thức và dấu ngoặc kép', () => {
    expect(csvCell('=1+1')).toBe('"\'=1+1"');
    expect(csvCell('Cà phê "mẫu"')).toBe('"Cà phê ""mẫu"""');
  });
});
