import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import { AdminGate } from '@/pages/admin/AdminGate';
import { AdminPortal } from '@/pages/admin/AdminPortal';
import { OnboardingPage } from '@/pages/admin/OnboardingPage';
import LoginPage from '@/pages/auth/LoginPage';
import { api } from '@/services/api';
const application = {
  id: 'application',
  businessId: 'business',
  name: 'Quán mới',
  ownerName: 'Chủ quán',
  ownerEmail: 'owner@example.test',
  status: 'PENDING',
  submittedAt: '2026-10-22T03:00:00Z',
  address: 'Đà Nẵng',
  contactPhone: '0900000000',
};
function show(path = '/app/admin/approvals') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/app/admin" element={<AdminGate />}>
            <Route index element={<AdminPortal view="dashboard" />} />
            <Route path="approvals" element={<AdminPortal view="approvals" />} />
            <Route path="businesses" element={<AdminPortal view="businesses" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
  localStorage.setItem('access_token', 'admin-test-token');
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url === '/admin/session')
      return { data: { user: { id: 'admin', fullName: 'Quản trị viên' }, role: 'SYSTEM_ADMIN' } };
    if (url === '/admin/dashboard')
      return {
        data: {
          businesses: 5,
          pending: 1,
          approved: 4,
          suspended: 0,
          owners: 5,
          activeSubscriptions: 2,
          expiringSubscriptions: 1,
        },
      };
    if (url.includes('/history')) return { data: { application, events: [], billing: [] } };
    return { data: { rows: [application], total: 1, page: 1, pageSize: 20 } };
  });
  vi.spyOn(api, 'post').mockResolvedValue({ data: { status: 'APPROVED' } });
});
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});
describe('Admin portal with the native shell', () => {
  it.each([
    ['ACTIVE', 'SUSPENDED', 'Tạm ngưng doanh nghiệp', 'Xác nhận tạm ngưng', 'Tạm ngưng'],
    [
      'SUSPENDED',
      'ACTIVE',
      'Kích hoạt lại doanh nghiệp',
      'Xác nhận đang hoạt động',
      'Đang hoạt động',
    ],
  ])(
    'confirms %s -> %s with a reason and updates business data',
    async (initial, target, action, confirmation, expected) => {
      let status = initial;
      const original = vi.mocked(api.get).getMockImplementation()!;
      vi.mocked(api.get).mockImplementation(async (url, config) =>
        url === '/admin/businesses'
          ? {
              data: {
                rows: [
                  {
                    id: 'business',
                    name: 'Quán đã duyệt',
                    approvalStatus: 'APPROVED',
                    operationalStatus: status,
                    branchCount: 1,
                  },
                ],
                total: 1,
                page: 1,
                pageSize: 20,
              },
            }
          : original(url, config),
      );
      vi.mocked(api.post).mockImplementation(async () => {
        status = target;
        return { data: { operationalStatus: target } };
      });
      const user = userEvent.setup();
      show('/app/admin/businesses');
      await user.click(
        await screen.findByRole('button', { name: 'Xem chi tiết' }, { timeout: 5000 }),
      );
      await user.click(screen.getByRole('button', { name: action }));
      expect(screen.getByRole('button', { name: confirmation })).toBeDisabled();
      await user.type(screen.getByLabelText('Lý do (bắt buộc)'), 'Rà soát kiểm thử');
      await user.click(screen.getByRole('button', { name: confirmation }));
      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith('/admin/businesses/business/status', {
          status: target,
          reason: 'Rà soát kiểm thử',
        }),
      );
      expect(
        await screen.findByText(expected, { selector: '.ui-badge' }, { timeout: 5000 }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    },
  );
  it('refreshes the pending queue after approval without a manual reload', async () => {
    let pending = true;
    const original = vi.mocked(api.get).getMockImplementation()!;
    vi.mocked(api.get).mockImplementation(async (url, config) =>
      url === '/admin/approvals'
        ? {
            data: {
              rows: pending ? [application] : [],
              total: pending ? 1 : 0,
              page: 1,
              pageSize: 20,
            },
          }
        : original(url, config),
    );
    vi.mocked(api.post).mockImplementation(async () => {
      pending = false;
      return { data: { status: 'APPROVED' } };
    });
    const user = userEvent.setup();
    show();
    await user.click(await screen.findByRole('button', { name: 'Xem chi tiết' }));
    await user.click(screen.getByRole('button', { name: 'Phê duyệt' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận đã phê duyệt' }));
    expect(await screen.findByText('Không có kết quả phù hợp')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('requires a backend-verified platform session; Owner gets no Admin screen', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('403'));
    show();
    expect(await screen.findByRole('alert')).toHaveTextContent('không có quyền quản trị');
    expect(screen.queryByRole('navigation', { name: 'Điều hướng chính' })).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(1);
  });
  it('rejects a tenant-role session even if the API returns HTTP 200', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { user: { id: 'owner', fullName: 'Owner' }, role: 'OWNER' },
    });
    show();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
  it('reuses shell navigation/account logout without tenant API calls', async () => {
    const user = userEvent.setup();
    show('/app/admin');
    expect(await screen.findByRole('heading', { name: 'Tổng quan nền tảng' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Phê duyệt doanh nghiệp' })).toHaveAttribute(
      'href',
      '/app/admin/approvals',
    );
    expect(screen.queryByRole('link', { name: 'POS / Bán hàng' })).not.toBeInTheDocument();
    expect(vi.mocked(api.get).mock.calls.every(([url]) => url.startsWith('/admin/'))).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Tài khoản Quản trị viên' }));
    await user.click(
      within(document.getElementById('app-profile-menu')!).getByRole('button', {
        name: 'Đăng xuất',
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
    expect(localStorage.getItem('access_token')).toBeNull();
  });
  it('requires confirmation and a rejection reason; sends only the intended mutation', async () => {
    const user = userEvent.setup();
    show();
    await user.click(await screen.findByRole('button', { name: 'Xem chi tiết' }));
    await user.click(screen.getByRole('button', { name: 'Từ chối' }));
    const confirm = screen.getByRole('button', { name: 'Xác nhận đã từ chối' });
    expect(confirm).toBeDisabled();
    expect(api.post).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('Lý do (bắt buộc)'), 'Thiếu thông tin');
    await user.click(confirm);
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/admin/approvals/application/review', {
        status: 'REJECTED',
        reason: 'Thiếu thông tin',
      }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Đã lưu thay đổi');
  });
  it('confirms approval and shows a mutation error without claiming success', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    show();
    await user.click(await screen.findByRole('button', { name: 'Xem chi tiết' }));
    await user.click(screen.getByRole('button', { name: 'Phê duyệt' }));
    expect(api.post).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Xác nhận đã phê duyệt' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể lưu thay đổi');
  });
  it('provides server-side search and loading/empty/error feedback', async () => {
    const user = userEvent.setup();
    show();
    await screen.findByRole('button', { name: 'Xem chi tiết' });
    await user.type(screen.getByLabelText('Tìm tên hoặc email'), 'Mây');
    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith(
        '/admin/approvals',
        expect.objectContaining({ params: expect.objectContaining({ q: 'Mây', page: 1 }) }),
      ),
    );
  });
});
describe('Owner onboarding status', () => {
  it.each(['PENDING', 'REJECTED'])(
    'shows %s and the review reason without enabling workspace access',
    async (status) => {
      vi.mocked(api.get).mockResolvedValue({
        data: {
          application: {
            ...application,
            status,
            operationalStatus: 'ACTIVE',
            reviewReason: status === 'REJECTED' ? 'Thiếu thông tin' : null,
          },
        },
      });
      show('/onboarding');
      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent(
          status === 'PENDING' ? 'chờ phê duyệt' : 'bị từ chối',
        ),
      );
      if (status === 'REJECTED')
        expect(screen.getByText('Lý do: Thiếu thông tin')).toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: 'Vào không gian làm việc' }),
      ).not.toBeInTheDocument();
    },
  );
  it('keeps the authenticated token when a pending Owner is redirected after login', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { accessToken: 'owner-token', user: { platformRole: 'USER' } },
    });
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/workspace')
        throw new AxiosError('restricted', undefined, undefined, undefined, {
          status: 403,
          data: { code: 'BUSINESS_ACCESS_RESTRICTED' },
        } as never);
      return { data: { application: { ...application, operationalStatus: 'ACTIVE' } } };
    });
    show('/login');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Tên đăng nhập'), 'owner.demo');
    await user.type(screen.getByLabelText('Mật khẩu'), 'TestPassword@2026');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(await screen.findByRole('heading', { name: 'Hồ sơ doanh nghiệp' })).toBeInTheDocument();
    expect(localStorage.getItem('access_token')).toBe('owner-token');
  });
});
