import type { OwnerData, Sale } from '../types';
const branches: OwnerData['branches'] = [
  {
    id: 'owner-demo-central',
    name: 'Chi nhánh Trung tâm',
    location: 'Khu vực trung tâm · địa điểm minh họa',
    status: 'ACTIVE',
    manager: 'Quản lý mẫu A',
  },
  {
    id: 'owner-demo-garden',
    name: 'Chi nhánh Sân vườn',
    location: 'Khu dân cư · địa điểm minh họa',
    status: 'ACTIVE',
    manager: 'Quản lý mẫu B',
  },
  {
    id: 'owner-demo-river',
    name: 'Chi nhánh Ven sông',
    location: 'Khu ven sông · địa điểm minh họa',
    status: 'ACTIVE',
    manager: 'Quản lý mẫu C',
  },
];
const menu: OwnerData['menu'] = [
  { id: 'coffee', name: 'Cà phê sữa', category: 'Cà phê', price: 35000, cost: 9000 },
  { id: 'tea', name: 'Trà đào', category: 'Trà trái cây', price: 45000, cost: 14000 },
  { id: 'latte', name: 'Cà phê sữa tươi', category: 'Cà phê', price: 49000, cost: 21000 },
  { id: 'cake', name: 'Bánh phô mai', category: 'Bánh', price: 55000, cost: 34000 },
];
const sales: Sale[] = [];
// Deterministic, isolated development data: each row represents separate single-item orders.
for (let day = 0; day < 92; day++) {
  const date = new Date(Date.UTC(2026, 6, 1 + day)).toISOString().slice(0, 10);
  branches.forEach((branch, branchIndex) =>
    menu.forEach((item, itemIndex) => {
      const quantity = 4 + ((day * 3 + branchIndex * 5 + itemIndex * 7) % 18);
      sales.push({
        date,
        branchId: branch.id,
        itemId: item.id,
        quantity,
        orders: quantity,
        hour: ['08:00', '12:00', '15:00', '19:00'][itemIndex],
      });
    }),
  );
}
const stock: OwnerData['stock'] = branches.flatMap((branch, index) => [
  {
    id: `${branch.id}-bean`,
    ingredientId: 'bean',
    branchId: branch.id,
    name: 'Hạt cà phê',
    unit: 'kg',
    quantity: index === 0 ? 2 : 8,
    minimum: 3,
    unitCost: 250000,
    expiry: '2026-12-31',
    consumed: 31 + index * 4,
    status: index === 0 ? ('LOW_STOCK' as const) : ('IN_STOCK' as const),
  },
  {
    id: `${branch.id}-milk`,
    ingredientId: 'milk',
    branchId: branch.id,
    name: 'Sữa tươi',
    unit: 'lít',
    quantity: 12 + index,
    minimum: 5,
    unitCost: 35000,
    expiry: index === 1 ? '2026-10-02' : '2026-10-15',
    consumed: 65 + index * 3,
    status: index === 1 ? ('NEAR_EXPIRY' as const) : ('IN_STOCK' as const),
  },
  {
    id: `${branch.id}-peach`,
    ingredientId: 'peach',
    branchId: branch.id,
    name: 'Đào ngâm',
    unit: 'kg',
    quantity: index === 2 ? 0 : 6,
    minimum: 2,
    unitCost: 90000,
    expiry: '2026-11-15',
    consumed: 18 + index,
    status: index === 2 ? ('OUT_OF_STOCK' as const) : ('IN_STOCK' as const),
  },
]);
export const ownerFixtures: OwnerData = {
  businessId: 'preview-business',
  asOf: '2026-09-30T23:59:59+07:00',
  branches,
  menu,
  sales,
  stock,
  users: [
    {
      id: 'preview-user',
      name: 'Chủ doanh nghiệp mẫu',
      email: 'owner@example.test',
      role: 'OWNER',
      branchId: '',
      lastActive: '2026-09-30T18:00:00+07:00',
      status: 'ACTIVE',
    },
    ...branches.map((branch, index) => ({
      id: `owner-demo-manager-${index}`,
      name: branch.manager,
      email: `manager${index + 1}@example.test`,
      role: 'MANAGER' as const,
      branchId: branch.id,
      lastActive: '2026-09-30T17:30:00+07:00',
      status: 'ACTIVE' as const,
    })),
    {
      id: 'owner-demo-staff',
      name: 'Nhân viên mẫu',
      email: 'staff@example.test',
      role: 'STAFF',
      branchId: branches[0].id,
      lastActive: '2026-09-29T14:00:00+07:00',
      status: 'INACTIVE',
    },
  ],
  promotions: [
    {
      id: 'expiry',
      title: 'Ưu tiên nguyên liệu sắp hết hạn',
      priority: 'Cao',
      reason: 'Sữa tươi tại chi nhánh Sân vườn có hạn sử dụng 02/10/2026.',
      items: 'Cà phê sữa tươi',
      benefit: 'Có thể hỗ trợ luân chuyển sữa còn hạn; cần theo dõi lượng tiêu thụ thực tế.',
      action: 'Kiểm tra chất lượng và hạn sử dụng, sau đó cân nhắc ưu đãi món dùng sữa.',
    },
    {
      id: 'quiet',
      title: 'Ưu đãi giờ bán thấp',
      priority: 'Vừa',
      reason: 'Kịch bản minh họa: cần đánh giá thêm đơn hàng trong khung 14:00–16:00.',
      items: 'Trà đào, cà phê sữa',
      benefit: 'Tạo thêm lựa chọn trong giờ vắng; chưa có dự báo doanh thu.',
      action: 'Thử ưu đãi trong phạm vi nhỏ và so sánh chi phí với doanh thu.',
    },
    {
      id: 'size',
      title: 'Gợi ý nâng kích thước',
      priority: 'Vừa',
      reason: 'Kịch bản minh họa: đồ uống có thể bổ sung tùy chọn kích thước.',
      items: 'Cà phê sữa tươi, trà đào',
      benefit: 'Có thể tăng giá trị đơn nếu chi phí phần thêm phù hợp.',
      action: 'Tính chi phí định lượng thêm trước khi quyết định chênh lệch giá.',
    },
    {
      id: 'weekend',
      title: 'Combo cuối tuần',
      priority: 'Thấp',
      reason: 'Kịch bản minh họa: kết hợp đồ uống và bánh trong một lựa chọn.',
      items: 'Cà phê sữa và bánh phô mai',
      benefit: 'Giúp khách lựa chọn thuận tiện; không bảo đảm tăng doanh thu.',
      action: 'Kiểm tra biên lợi nhuận và tồn kho trước khi thử combo.',
    },
  ],
  subscription: {
    planId: 'growth',
    renewal: '2026-10-31',
    plans: [
      {
        id: 'starter',
        name: 'Khởi đầu',
        monthlyPrice: 199000,
        branches: 1,
        users: 5,
        features: ['Bán hàng và quản lý kho', 'Báo cáo cửa hàng'],
      },
      {
        id: 'growth',
        name: 'Phát triển',
        monthlyPrice: 499000,
        branches: 3,
        users: 20,
        features: ['Phân tích nhiều chi nhánh', 'Người dùng và phân quyền'],
      },
      {
        id: 'scale',
        name: 'Mở rộng',
        monthlyPrice: 899000,
        branches: 10,
        users: 60,
        features: ['Tổng quan toàn doanh nghiệp', 'Theo dõi vận hành nhiều cửa hàng'],
      },
    ],
    invoices: [
      { id: 'HD-MAU-0926', date: '2026-09-01', amount: 499000, status: 'PAID' },
      { id: 'HD-MAU-0826', date: '2026-08-01', amount: 499000, status: 'PAID' },
    ],
  },
  settings: {
    name: 'Doanh nghiệp mẫu',
    email: 'contact@example.test',
    phone: '',
    address: '',
    taxCode: '',
    tax: 0,
    fee: 0,
    invoicePrefix: 'HD',
    invoiceFooter: 'Cảm ơn quý khách. Hẹn gặp lại!',
    stockNotice: true,
    revenueNotice: true,
    billingNotice: true,
  },
};
