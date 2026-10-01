import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/tests/renderApp';
import { useWorkspaceStore } from '@/stores/workspace';
import { api } from '@/services/api';
import { sessionFixture } from '@/tests/sessionFixture';
import type { BusinessRole } from '@/app/navigation';
const setContext = (role: BusinessRole) =>
  vi.mocked(api.get).mockResolvedValue({ data: sessionFixture(role) });
beforeEach(() => {
  useWorkspaceStore.getState().setPreviewRole(null);
  vi.spyOn(api, 'get').mockResolvedValue({ data: sessionFixture() });
});
afterEach(() => {
  useWorkspaceStore.getState().setContext(null);
  useWorkspaceStore.getState().setPreviewRole(null);
  vi.restoreAllMocks();
});
describe('Khung ứng dụng dùng chung', () => {
  it('hiển thị thương hiệu và nội dung trang chủ bằng tiếng Việt', () => {
    renderApp('/');
    expect(screen.getByRole('link', { name: 'nextvn — Trang chủ' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login');
  });
  it('không tự tạo người dùng hoặc phiên đăng nhập', async () => {
    vi.mocked(api.get).mockRejectedValue({ isAxiosError: true, response: { status: 401 } });
    renderApp('/app');
    expect(await screen.findByRole('alert')).toHaveTextContent('Phiên đăng nhập đã hết hạn.');
    expect(screen.getByRole('link', { name: 'Đến trang đăng nhập' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(useWorkspaceStore.getState().context).toBeNull();
  });
  it.each(['STAFF', 'MANAGER', 'OWNER'] as const)(
    'dùng cùng shell với membership %s từ API',
    async (role) => {
      setContext(role);
      renderApp('/app/profile');
      await screen.findByRole('heading', { name: 'Hồ sơ cá nhân' });
      expect(
        within(screen.getByRole('complementary', { name: 'Thanh điều hướng' })).getByText(
          'Nguyễn An',
        ),
      ).toBeVisible();
      expect(screen.getAllByText('Doanh nghiệp kiểm thử').length).toBeGreaterThan(0);
    },
  );
  it('đổi trạng thái menu theo route khi điều hướng bằng bàn phím', async () => {
    renderApp('/app/pos');
    const nav = await screen.findByRole('navigation', { name: 'Điều hướng chính' });
    const pos = within(nav).getByRole('link', { name: 'Bán hàng' });
    const orders = within(nav).getByRole('link', { name: 'Đơn hàng' });
    expect(pos).toHaveAttribute('aria-current', 'page');
    orders.focus();
    await userEvent.setup().keyboard('{Enter}');
    expect(orders).toHaveAttribute('aria-current', 'page');
    expect(pos).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('heading', { name: 'Lịch sử đơn hàng' })).toBeInTheDocument();
  });
  it('không đánh dấu tổng quan chủ doanh nghiệp khi đang ở trang con', async () => {
    setContext('OWNER');
    renderApp('/app/owner/branches');
    expect(await screen.findByRole('link', { name: 'Chi nhánh' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Tổng quan doanh nghiệp' })).not.toHaveAttribute(
      'aria-current',
    );
  });
  it('thu gọn sidebar vẫn giữ tên truy cập được của liên kết', async () => {
    setContext('MANAGER');
    renderApp('/app/dashboard');
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Thu gọn thanh điều hướng' }));
    expect(screen.getByRole('button', { name: 'Mở rộng thanh điều hướng' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('link', { name: 'Kho hàng' })).toBeInTheDocument();
  });
  it.each(['/login', '/login/business'])(
    'hiển thị trạng thái Google chưa cấu hình tại %s',
    (path) => {
      renderApp(path);
      expect(
        screen.getByText('Đăng nhập Google chưa được cấu hình cho môi trường này.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tiếp tục với Google' })).toBeDisabled();
    },
  );
});
