export const devSecret = 'nextvn-development-only-secret';
export const devBusinessId = 'dev-business';

type Role = 'OWNER' | 'MANAGER' | 'STAFF';

export const state = {
  branches: [
    {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Chi nhánh Quận 1',
      address: '12 Nguyễn Huệ, TP. Hồ Chí Minh',
      phone: '028 3822 0101',
      isActive: true,
      managerName: 'Nguyễn Minh Anh',
      orderCount: 128,
      revenueVnd: 18_450_000,
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      name: 'Chi nhánh Thảo Điền',
      address: '25 Xuân Thủy, TP. Hồ Chí Minh',
      phone: '028 3744 0202',
      isActive: true,
      managerName: 'Trần Quốc Bảo',
      orderCount: 96,
      revenueVnd: 13_780_000,
    },
  ],
  members: [
    {
      id: 'member-01',
      userId: 'dev-owner',
      fullName: 'Lê Minh Châu',
      email: 'chau@example.test',
      role: 'OWNER' as Role,
      branchId: null as string | null,
      branchName: 'Toàn doanh nghiệp',
      lastActive: 'Đang hoạt động',
      isActive: true,
    },
    {
      id: 'member-02',
      userId: 'dev-manager',
      fullName: 'Nguyễn Minh Anh',
      email: 'anh@example.test',
      role: 'MANAGER' as Role,
      branchId: null as string | null,
      branchName: 'Toàn doanh nghiệp',
      lastActive: 'Hôm nay',
      isActive: true,
    },
    {
      id: 'member-03',
      userId: 'dev-staff',
      fullName: 'Phạm Thu Hà',
      email: 'ha@example.test',
      role: 'STAFF' as Role,
      branchId: null as string | null,
      branchName: 'Toàn doanh nghiệp',
      lastActive: 'Hôm qua',
      isActive: true,
    },
  ],
  settings: {
    businessName: 'Bếp Nhà Mình',
    taxRate: 8,
    serviceFeeRate: 0,
    invoicePrefix: 'BNM',
    receiptTitle: null as string | null,
    receiptFooter: null as string | null,
    contactEmail: null as string | null,
    contactPhone: null as string | null,
    address: null as string | null,
    notifyLowStock: true,
    notifyNearExpiry: true,
  },
};

export const trends = [
  { label: 'T2', value: 3_450_000 },
  { label: 'T3', value: 4_120_000 },
  { label: 'T4', value: 3_870_000 },
  { label: 'T5', value: 5_110_000 },
  { label: 'T6', value: 6_480_000 },
  { label: 'T7', value: 5_920_000 },
  { label: 'CN', value: 3_280_000 },
];

export const categories = [
  { name: 'Món chính', value: 14_850_000 },
  { name: 'Đồ uống', value: 8_630_000 },
  { name: 'Món ăn nhẹ', value: 8_750_000 },
];

export const profitRows = [
  { name: 'Cơm gà nướng', quantity: 186, revenueVnd: 8_370_000, ingredientCostVnd: 5_130_000 },
  { name: 'Trà đào cam sả', quantity: 142, revenueVnd: 5_680_000, ingredientCostVnd: 3_500_000 },
  { name: 'Bún bò Huế', quantity: 97, revenueVnd: 5_335_000, ingredientCostVnd: 3_375_000 },
];

export const plans = [
  {
    id: 'starter',
    name: 'Cơ bản',
    priceVnd: null,
    description: 'Dành cho doanh nghiệp đang tìm hiểu NextVN',
  },
  {
    id: 'growth',
    name: 'Phát triển',
    priceVnd: null,
    description: 'Mở rộng vận hành nhiều chi nhánh',
  },
  {
    id: 'enterprise',
    name: 'Doanh nghiệp',
    priceVnd: null,
    description: 'Tùy chỉnh theo quy mô hệ thống',
  },
];

export function recommendPromotions(facts: {
  nearExpiryCount: number;
  slowWindowShare: number;
  upsellMargin: number;
}) {
  const recommendations = [];
  if (facts.nearExpiryCount > 0)
    recommendations.push({
      id: 'promo-expiry',
      title: 'Ưu đãi nguyên liệu gần hạn',
      reason: 'Có nguyên liệu tại chi nhánh Thảo Điền gần đến hạn sử dụng.',
      relatedItems: ['Rau xanh theo ngày'],
      evidence: `${facts.nearExpiryCount} nguyên liệu có hạn sử dụng trong 3 ngày tới.`,
      action: 'Tạo món đặc biệt trong ngày để sử dụng nguyên liệu phù hợp.',
      basis: 'Gợi ý quy tắc; chưa ước tính doanh thu.',
    });
  if (facts.slowWindowShare < 0.12)
    recommendations.push({
      id: 'promo-slow',
      title: 'Combo giờ thấp điểm',
      reason: 'Lượng đơn trong khung 14:00–16:00 thấp hơn giờ cao điểm.',
      relatedItems: ['Trà đào cam sả', 'Cơm gà nướng'],
      evidence: `Khung giờ chiếm ${Math.round(facts.slowWindowShare * 100)}% số đơn trong dữ liệu phát triển.`,
      action: 'Thử combo giới hạn thời gian trong khung giờ này.',
      basis: 'Gợi ý quy tắc; chưa đo lường tác động.',
    });
  if (facts.upsellMargin >= 0.35)
    recommendations.push({
      id: 'promo-upsell',
      title: 'Gợi ý món dùng kèm',
      reason: 'Món có biên lợi nhuận tốt có thể được giới thiệu cùng món chính.',
      relatedItems: ['Trà đào cam sả'],
      evidence: `Biên lợi nhuận món đạt ${Math.round(facts.upsellMargin * 100)}% trong dữ liệu phát triển.`,
      action: 'Đưa món vào gợi ý nâng cấp tại quầy.',
      basis: 'Gợi ý quy tắc; chưa đo lường tác động.',
    });
  return recommendations;
}
