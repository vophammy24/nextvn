import { describe, expect, it } from 'vitest';
import { getNavigation, navigation, type BusinessRole } from '@/app/navigation';
import { copy } from '@/locales/vi';
describe('Điều hướng theo vai trò', () => {
  const expected: Record<BusinessRole, string[]> = {
    STAFF: ['Bán hàng', 'Khu vực / Bàn', 'Đơn hàng', 'Tổng kết ca', 'Hồ sơ cá nhân'],
    MANAGER: [
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
    ],
    OWNER: [
      'Tổng quan doanh nghiệp',
      'Chi nhánh',
      'Phân tích doanh thu',
      'Phân tích lợi nhuận món',
      'Tổng quan tồn kho',
      'Gợi ý khuyến mãi',
      'Người dùng & phân quyền',
      'Gói dịch vụ & thanh toán',
      'Cài đặt doanh nghiệp',
      'Hồ sơ cá nhân',
    ],
  };
  it.each(['STAFF', 'MANAGER', 'OWNER'] as const)(
    'có đúng nhãn và thứ tự tiếng Việt cho %s',
    (role) => {
      expect(getNavigation(role).map((item) => copy.navigation[item.key])).toEqual(expected[role]);
    },
  );
  it('nhân viên và quản lý sử dụng chung cấu hình route vận hành', () => {
    for (const key of ['pos', 'tables', 'orders', 'profile']) {
      expect(getNavigation('STAFF').find((item) => item.key === key)).toBe(
        getNavigation('MANAGER').find((item) => item.key === key),
      );
    }
    expect(new Set(navigation.map((item) => item.path)).size).toBe(navigation.length);
  });
});
