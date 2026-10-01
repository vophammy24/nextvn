import { PageHeader } from '@/components/common/Foundation';
import { ManagerDataBoundary } from './data';
import { Dashboard, Reports } from './AnalyticsPages';
import { Inventory } from './InventoryPage';
import { Transactions } from './TransactionsPage';
import { Recipes } from './RecipesPage';
import { Alerts } from './AlertsPage';
import { Staff } from './StaffPage';
import type { ManagerView } from './types';
const pages = {
  dashboard: {
    title: 'Tổng quan cửa hàng',
    description: 'Theo dõi hoạt động tại chi nhánh của bạn',
    Component: Dashboard,
  },
  inventory: {
    title: 'Quản lý kho',
    description: 'Theo dõi nguyên liệu, mức tồn và hạn sử dụng',
    Component: Inventory,
  },
  stockTransactions: {
    title: 'Nhập / Xuất kho',
    description: 'Theo dõi luân chuyển và điều chỉnh nguyên liệu',
    Component: Transactions,
  },
  recipes: {
    title: 'Quản lý công thức',
    description: 'Định lượng nguyên liệu và ước tính hiệu quả từng món',
    Component: Recipes,
  },
  reports: {
    title: 'Báo cáo vận hành',
    description: 'Phân tích kết quả kinh doanh tại chi nhánh',
    Component: Reports,
  },
  alerts: {
    title: 'Cảnh báo',
    description: 'Theo dõi các vấn đề cần chú ý trong kho',
    Component: Alerts,
  },
  staff: {
    title: 'Nhân viên',
    description: 'Quản lý nhân sự và vai trò trong chi nhánh',
    Component: Staff,
  },
};
export default function ManagerPage({ view }: { view: ManagerView }) {
  const { title, description, Component } = pages[view];
  return (
    <>
      <PageHeader title={title} description={description} />
      <ManagerDataBoundary>{(data) => <Component data={data} />}</ManagerDataBoundary>
    </>
  );
}
