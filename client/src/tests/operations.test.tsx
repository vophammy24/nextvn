import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api';
import { useWorkspaceStore } from '@/stores/workspace';
import { renderApp } from './renderApp';
import { sessionFixture } from './sessionFixture';

beforeEach(() => {
  useWorkspaceStore.getState().setPreviewRole('STAFF');
  vi.spyOn(api, 'get').mockResolvedValue({ data: sessionFixture() });
});
afterEach(() => {
  useWorkspaceStore.getState().setPreviewRole(null);
  useWorkspaceStore.getState().setContext(null);
  vi.restoreAllMocks();
});
describe('Không gian làm việc nhân viên', () => {
  it('sidebar hiển thị đúng tiêu đề và năm mục tiếng Việt', async () => {
    renderApp('/app/pos');
    await screen.findByRole('searchbox', { name: 'Tìm món' });
    const sidebar = within(screen.getByRole('complementary', { name: 'Thanh điều hướng' }));
    expect(sidebar.getByText('NHÂN VIÊN / THU NGÂN')).toBeInTheDocument();
    const links = within(sidebar.getByRole('navigation')).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Bán hàng',
      'Khu vực / Bàn',
      'Đơn hàng',
      'Tổng kết ca',
      'Hồ sơ cá nhân',
    ]);
  });
  it.each([
    '/app/dashboard',
    '/app/inventory',
    '/app/stock-transactions',
    '/app/recipes',
    '/app/reports',
    '/app/alerts',
    '/app/staff',
    '/app/owner',
    '/app/owner/revenue',
    '/app/owner/menu-profit',
    '/app/owner/users',
    '/app/owner/settings',
    '/app/owner/subscription',
  ])('chặn nhân viên vào URL %s bằng vai trò từ API', async (path) => {
    useWorkspaceStore.getState().setPreviewRole(null);
    // A client-side role must not override the membership returned by the API.
    useWorkspaceStore.getState().setContext({
      user: { id: 'spoof', fullName: 'Không tin cậy' },
      business: { id: 'spoof', name: 'Không tin cậy' },
      role: 'OWNER',
    });
    renderApp(path);
    expect(
      await screen.findByRole('heading', { name: 'Bạn không có quyền truy cập' }),
    ).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(
      '/auth/me',
      expect.objectContaining({ withCredentials: true }),
    );
    expect(screen.queryByText('Nội dung đang được chuẩn bị')).not.toBeInTheDocument();
  });
  it('không dùng fixture trong phiên thật khi API nghiệp vụ chưa sẵn sàng', async () => {
    useWorkspaceStore.getState().setPreviewRole(null);
    renderApp('/app/pos');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Dịch vụ bán hàng và vận hành chưa được kết nối.',
    );
    expect(screen.queryByRole('button', { name: 'Thêm Cà phê sữa' })).not.toBeInTheDocument();
  });
  it('POS cập nhật giá theo kích cỡ, số lượng và giới hạn giảm giá; không thanh toán giả', async () => {
    const post = vi.spyOn(api, 'post');
    renderApp('/app/pos');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Thêm Cà phê sữa' }));
    await user.selectOptions(screen.getByLabelText('Kích cỡ Cà phê sữa'), 'Lớn');
    await user.click(screen.getByRole('button', { name: 'Tăng số lượng Cà phê sữa' }));
    const panel = within(screen.getByRole('complementary', { name: 'Đơn hàng hiện tại' }));
    expect(panel.getByText('Tạm tính').nextElementSibling?.textContent).toMatch(/90.000/);
    await user.type(screen.getByLabelText('Giảm giá (₫)'), '999999');
    expect(panel.getByText('Tổng cộng').nextElementSibling?.textContent).toMatch(/^0\s*₫$/);
    expect(screen.getByRole('radio', { name: 'Tiền mặt' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Chuyển khoản ngân hàng' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận thanh toán' }));
    expect(
      screen.getByText('Thanh toán chưa được kết nối. Chưa có giao dịch nào được ghi nhận.'),
    ).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'In phiếu tạm' }));
    expect(screen.getByRole('heading', { name: 'PHIẾU TẠM — MINH HỌA' })).toBeInTheDocument();
  });
  it('tìm món và lọc danh mục', async () => {
    renderApp('/app/pos');
    const user = userEvent.setup();
    await user.type(await screen.findByRole('searchbox', { name: 'Tìm món' }), 'không có món này');
    expect(screen.getByRole('heading', { name: 'Không tìm thấy món' })).toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox', { name: 'Tìm món' }));
    await user.click(screen.getByRole('button', { name: 'Trà sữa' }));
    expect(screen.getByRole('button', { name: 'Thêm Trà sữa trân châu' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thêm Cà phê sữa' })).not.toBeInTheDocument();
  });
  it('hiển thị trạng thái bàn, lọc khu vực và chọn chi tiết', async () => {
    renderApp('/app/tables');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Bàn 03, Tầng 1' }));
    const detail = within(screen.getByRole('complementary', { name: 'Chi tiết bàn' }));
    expect(detail.getByText('Chờ thanh toán')).toBeInTheDocument();
    expect(detail.getByText('MH-003')).toBeInTheDocument();
    for (const status of ['Trống', 'Đang sử dụng', 'Đã đặt', 'Đang dọn', 'Chờ thanh toán'])
      expect(screen.getAllByText(status).length).toBeGreaterThan(0);
    expect(detail.getByRole('link', { name: 'Thêm món' })).toHaveAttribute(
      'href',
      '/app/pos?table=t3',
    );
    await user.click(screen.getByRole('button', { name: 'Ngoài trời' }));
    expect(screen.queryByRole('button', { name: 'Bàn 03, Tầng 1' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bàn 07, Ngoài trời' })).toBeInTheDocument();
  });
  it('lịch sử đơn có đủ cột, phạm vi nhân viên và bộ lọc trạng thái', async () => {
    renderApp('/app/orders');
    await screen.findByRole('table', { name: 'Danh sách đơn hàng' });
    for (const name of [
      'Mã đơn',
      'Thời gian',
      'Thu ngân',
      'Hình thức',
      'Bàn',
      'Tổng tiền',
      'Trạng thái',
    ])
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument();
    expect(screen.getByText('MH-101')).toBeInTheDocument();
    expect(screen.queryByText('MH-104')).not.toBeInTheDocument();
    expect(screen.queryByText('MH-105')).not.toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Bộ lọc' }));
    await user.selectOptions(screen.getByLabelText('Trạng thái đơn'), 'CANCELLED');
    expect(screen.getByText('MH-103')).toBeInTheDocument();
    expect(screen.queryByText('MH-101')).not.toBeInTheDocument();
  });
  it('quản lý dùng cùng màn hình đơn nhưng có phạm vi chi nhánh', async () => {
    useWorkspaceStore.getState().setPreviewRole('MANAGER');
    renderApp('/app/orders');
    expect(await screen.findByText('MH-104')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lịch sử đơn hàng' })).toBeInTheDocument();
  });
  it('tổng kết ca chỉ cộng đơn đã thanh toán và không giả gửi báo cáo', async () => {
    const post = vi.spyOn(api, 'post');
    renderApp('/app/shift');
    await screen.findByRole('table', { name: 'Đơn hàng trong ca' });
    expect(screen.getByText('Doanh thu').parentElement?.parentElement?.textContent).toMatch(
      /160.000/,
    );
    expect(screen.getByText('3 giờ 30 phút')).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Kết thúc ca' }));
    expect(screen.getByRole('status')).toHaveTextContent('Ca làm việc chưa được đóng.');
    await user.click(screen.getByRole('button', { name: 'Gửi báo cáo ca' }));
    expect(screen.getByRole('status')).toHaveTextContent('Chưa có báo cáo nào được gửi.');
    expect(post).not.toHaveBeenCalled();
  });
  it.each(['STAFF', 'MANAGER', 'OWNER'] as const)(
    'hồ sơ %s sử dụng dữ liệu /auth/me và membership',
    async (role) => {
      useWorkspaceStore.getState().setPreviewRole(null);
      vi.mocked(api.get).mockResolvedValue({ data: sessionFixture(role) });
      renderApp('/app/profile');
      expect(await screen.findByText('an@example.test')).toBeInTheDocument();
      expect(screen.getByText('0900000000')).toBeInTheDocument();
      expect(screen.queryByText('Người dùng xem trước')).not.toBeInTheDocument();
      const profile = within(screen.getByRole('region', { name: 'Thông tin tài khoản' }));
      expect(profile.getByText('Doanh nghiệp kiểm thử')).toBeInTheDocument();
      expect(
        profile.getByText(role === 'OWNER' ? 'Toàn doanh nghiệp' : 'Chi nhánh kiểm thử'),
      ).toBeInTheDocument();
    },
  );
  it('hồ sơ không dùng tên mẫu khi API thất bại, kể cả trong chế độ xem trước', async () => {
    vi.mocked(api.get).mockRejectedValue({ isAxiosError: true, response: { status: 404 } });
    renderApp('/app/profile');
    expect(await screen.findByRole('alert')).toHaveTextContent('Dịch vụ xác thực chưa khả dụng');
    expect(screen.queryByRole('region', { name: 'Thông tin tài khoản' })).not.toBeInTheDocument();
  });
  it('chặn phiên không hợp lệ và không lấy role toàn cục làm quyền doanh nghiệp', async () => {
    useWorkspaceStore.getState().setPreviewRole(null);
    vi.mocked(api.get).mockResolvedValue({
      data: { user: { ...sessionFixture().user, role: 'OWNER' } },
    });
    renderApp('/app/owner');
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Thông tin phiên đăng nhập không hợp lệ.',
      ),
    );
    expect(screen.queryByRole('navigation', { name: 'Điều hướng chính' })).not.toBeInTheDocument();
  });
});
