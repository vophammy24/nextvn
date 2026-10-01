import { PageHeader } from '@/components/common/Foundation';
import { copy } from '@/locales/vi';
import { OwnerDataBoundary } from './data';
import { Overview, Revenue, MenuProfit, InventoryOverview } from './AnalyticsPages';
import { Branches, Promotions, Subscription } from './BusinessPages';
import { Users } from './UsersPage';
import { Settings } from './SettingsPage';
import type { OwnerView } from './routes';
const pages = {
  owner: { Component: Overview, description: 'Theo dõi hiệu quả kinh doanh trên tất cả chi nhánh' },
  branches: {
    Component: Branches,
    description: 'So sánh và theo dõi từng chi nhánh trong doanh nghiệp',
  },
  revenue: {
    Component: Revenue,
    description: 'Nhìn rõ doanh thu, đơn hàng và nhu cầu theo thời gian',
  },
  menuProfit: {
    Component: MenuProfit,
    description: 'Đánh giá chi phí nguyên liệu và hiệu quả từng món',
  },
  inventoryOverview: {
    Component: InventoryOverview,
    description: 'Góc nhìn hợp nhất về nguyên liệu tại tất cả chi nhánh',
  },
  promotions: {
    Component: Promotions,
    description: 'Cân nhắc cơ hội bán hàng từ dữ liệu vận hành',
  },
  users: { Component: Users, description: 'Quản lý quyền truy cập trong phạm vi doanh nghiệp' },
  subscription: {
    Component: Subscription,
    description: 'Theo dõi gói dịch vụ, mức sử dụng và lịch sử thanh toán',
  },
  settings: {
    Component: Settings,
    description: 'Thiết lập thông tin và tùy chọn vận hành doanh nghiệp',
  },
};
export default function OwnerPage({ view }: { view: OwnerView }) {
  const { Component, description } = pages[view];
  return (
    <>
      <PageHeader title={copy.navigation[view]} description={description} />
      <OwnerDataBoundary>{(data) => <Component data={data} />}</OwnerDataBoundary>
    </>
  );
}
