import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import App from '@/App';
import { api } from '@/services/api';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(async (path: string) => {
      if (path === '/dev/session') return { data: { token: 'development-token' } };
      if (path === '/owner/branches')
        return {
          data: {
            data: [
              {
                id: 'branch-test',
                name: 'Chi nhánh thử nghiệm',
                isActive: true,
                managerName: null,
                orderCount: null,
                revenueVnd: null,
              },
            ],
          },
        };
      if (path === '/owner/members')
        return {
          data: {
            data: [
              {
                id: 'member-staff',
                fullName: 'Phạm Thu Hà',
                email: 'ha@example.test',
                role: 'STAFF',
                branchId: null,
                branchName: 'Toàn doanh nghiệp',
                lastActive: 'Hôm nay',
                isActive: true,
              },
            ],
          },
        };
      if (path === '/owner/revenue')
        return {
          data: {
            data: {
              revenueVnd: 1000,
              orderCount: 10,
              averageOrderVnd: 100,
              bestWindow: '11:00–13:00',
              trend: [],
              categories: [],
              topItems: [],
            },
          },
        };
      if (path === '/owner/menu-profit') return { data: { data: [] } };
      if (path === '/owner/inventory')
        return {
          data: {
            data: {
              ingredientCount: 0,
              lowStockCount: 0,
              nearExpiryCount: 0,
              stockValueVnd: 0,
              consumption: [],
              statusDistribution: [],
              byBranch: [],
            },
          },
        };
      if (path === '/owner/promotions') return { data: { data: [] } };
      if (path === '/owner/subscription')
        return {
          data: {
            data: {
              plan: 'Gói dùng thử',
              usage: '1/1 chi nhánh',
              renewalDate: null,
              status: 'Chưa kết nối thanh toán',
              billingHistory: [],
              plans: [],
              payOSAvailable: false,
            },
          },
        };
      if (path === '/owner/settings')
        return {
          data: {
            data: {
              businessName: 'Bếp Nhà Mình',
              taxRate: 8,
              serviceFeeRate: 0,
              invoicePrefix: 'BNM',
              notifyLowStock: true,
              notifyNearExpiry: true,
            },
          },
        };
      return {
        data: {
          data: {
            revenueVnd: 0,
            grossProfitVnd: 0,
            averageOrderVnd: 0,
            orderCount: 0,
            revenueTrend: [],
            categoryRevenue: [],
            peakHours: [],
            highlights: [],
            profitableItems: [],
          },
        },
      };
    }),
    post: vi.fn(async () => ({ data: { data: {} } })),
    patch: vi.fn(async () => ({ data: { data: {} } })),
  },
}));

describe('Owner routes', () => {
  it('renders Vietnamese navigation for all owner sections', () => {
    render(
      <MemoryRouter initialEntries={['/app/owner']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Tổng quan doanh nghiệp' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Chi nhánh' })).toHaveAttribute(
      'href',
      '/app/owner/branches',
    );
    expect(screen.getByRole('link', { name: 'Doanh thu' })).toHaveAttribute(
      'href',
      '/app/owner/revenue',
    );
    expect(screen.getByRole('link', { name: 'Lợi nhuận món' })).toHaveAttribute(
      'href',
      '/app/owner/menu-profit',
    );
    expect(screen.getByRole('link', { name: /Tồn kho/ })).toHaveAttribute(
      'href',
      '/app/owner/inventory',
    );
    expect(screen.getByRole('link', { name: 'Gợi ý khuyến mãi' })).toHaveAttribute(
      'href',
      '/app/owner/promotions',
    );
    expect(screen.getByRole('link', { name: 'Người dùng & vai trò' })).toHaveAttribute(
      'href',
      '/app/owner/users',
    );
    expect(screen.getByRole('link', { name: 'Gói dịch vụ' })).toHaveAttribute(
      'href',
      '/app/owner/subscription',
    );
    expect(screen.getByRole('link', { name: 'Cài đặt doanh nghiệp' })).toHaveAttribute(
      'href',
      '/app/owner/settings',
    );
  });

  it('keeps the shared profile route outside the owner path', () => {
    render(
      <MemoryRouter initialEntries={['/app/profile']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Hồ sơ cá nhân' })).toBeInTheDocument();
  });

  it('opens the branch creation form', async () => {
    render(
      <MemoryRouter initialEntries={['/app/owner/branches']}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'Danh sách chi nhánh' });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm chi nhánh' }));
    fireEvent.change(screen.getByPlaceholderText('Tên chi nhánh'), {
      target: { value: 'Chi nhánh mới' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu chi nhánh' }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/owner/branches',
        { name: 'Chi nhánh mới', address: '', phone: '' },
        expect.objectContaining({ headers: expect.any(Object) }),
      ),
    );
  });

  it('shows member role controls and branch assignment in Vietnamese', async () => {
    render(
      <MemoryRouter initialEntries={['/app/owner/users']}>
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Thành viên doanh nghiệp' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Vai trò của Phạm Thu Hà')).toBeInTheDocument();
    expect(screen.getByLabelText('Chi nhánh của Phạm Thu Hà')).toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: 'Chi nhánh thử nghiệm' })).toHaveLength(2);
  });

  it('renders business revenue metrics and chart headings', async () => {
    render(
      <MemoryRouter initialEntries={['/app/owner/revenue']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Phân tích doanh thu' })).toBeInTheDocument();
    expect(screen.getByText('Tổng doanh thu')).toBeInTheDocument();
    expect(screen.getByText('Hiệu quả danh mục')).toBeInTheDocument();
    expect(screen.getByText('Món bán chạy')).toBeInTheDocument();
  });

  it('loads the business settings form', async () => {
    render(
      <MemoryRouter initialEntries={['/app/owner/settings']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Thuế & phí dịch vụ')).toBeInTheDocument();
    expect(screen.getByText('Cài đặt hóa đơn')).toBeInTheDocument();
    expect(screen.getByText('Cài đặt thông báo')).toBeInTheDocument();
  });

  it('shows a loading state while subscription data is pending', () => {
    sessionStorage.setItem('nextvnAccessToken', 'test-token');
    vi.mocked(api.get).mockReturnValueOnce(new Promise<never>(() => undefined));

    render(
      <MemoryRouter initialEntries={['/app/owner/subscription']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText('Đang tải dữ liệu doanh nghiệp…')).toBeInTheDocument();
  });

  it('keeps subscription checkout unavailable without a provider integration', async () => {
    sessionStorage.setItem('nextvnAccessToken', 'test-token');
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        data: {
          plan: 'Gói dùng thử',
          usage: '1/1 chi nhánh',
          renewalDate: null,
          status: 'Chưa kết nối thanh toán',
          billingHistory: [],
          plans: [],
          payOSAvailable: false,
        },
      },
    } as never);

    render(
      <MemoryRouter initialEntries={['/app/owner/subscription']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Thanh toán chưa khả dụng')).toBeInTheDocument();
    expect(screen.getByText('Chưa có lịch sử thanh toán')).toBeInTheDocument();
  });

  it('shows the subscription API error state', async () => {
    sessionStorage.setItem('nextvnAccessToken', 'test-token');
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Dịch vụ chưa sẵn sàng'));

    render(
      <MemoryRouter initialEntries={['/app/owner/subscription']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Chưa thể hiển thị dữ liệu')).toBeInTheDocument();
    expect(screen.getByText('Dịch vụ chưa sẵn sàng')).toBeInTheDocument();
  });
});
