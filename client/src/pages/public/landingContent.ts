import {
  ShoppingBag,
  Warehouse,
  CookingPot,
  ArrowDownToLine,
  ChartPie,
  ClipboardList,
  BellRing,
  ChartNoAxesCombined,
  Coffee,
  UtensilsCrossed,
  Soup,
  CupSoda,
  Store,
  Link2,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
export const landingNavigation = [
  { label: 'Sản phẩm', href: '#san-pham' },
  { label: 'Tính năng', href: '#tinh-nang' },
  { label: 'Cách hoạt động', href: '#cach-hoat-dong' },
  { label: 'Dành cho doanh nghiệp', href: '#doanh-nghiep' },
];
export const pillars = [
  {
    icon: Link2,
    number: '01',
    title: 'Kết nối bán hàng và tồn kho',
    description: 'Một đơn hàng, một luồng dữ liệu xuyên suốt.',
    points: [
      'Bán hàng tại quầy kết nối trực tiếp với kho.',
      'Tự động trừ nguyên liệu dựa trên công thức món.',
    ],
  },
  {
    icon: ShieldCheck,
    number: '02',
    title: 'Kiểm soát chi phí và hạn chế thất thoát',
    description: 'Hiểu rõ nguyên liệu đi đâu, chi phí đến từ đâu.',
    points: [
      'Theo dõi cảnh báo tồn kho và nguyên liệu sắp hết hạn.',
      'Nắm chi phí nguyên liệu và lợi nhuận của từng món.',
    ],
  },
  {
    icon: TrendingUp,
    number: '03',
    title: 'Ra quyết định dựa trên dữ liệu',
    description: 'Biến dữ liệu vận hành thành góc nhìn hữu ích.',
    points: [
      'Nhận diện món bán chạy, giờ cao điểm và hiệu quả doanh thu.',
      'Tham khảo gợi ý bán kèm, kết hợp món và khuyến mãi.',
    ],
  },
];
export const workflow = [
  { title: 'Khách gọi món', detail: 'Ghi nhận nhu cầu', icon: ShoppingBag },
  { title: 'Bán hàng POS', detail: 'Tạo đơn tại quầy', icon: ClipboardList },
  { title: 'Công thức', detail: 'Định lượng từng món', icon: CookingPot },
  { title: 'Trừ nguyên liệu', detail: 'Theo món đã bán', icon: ArrowDownToLine },
  { title: 'Tồn kho', detail: 'Cập nhật số lượng', icon: Warehouse },
  { title: 'Chi phí & lợi nhuận', detail: 'Hiểu hiệu quả món', icon: ChartPie },
  { title: 'Phân tích', detail: 'Hỗ trợ quyết định', icon: ChartNoAxesCombined },
];
export const features = [
  {
    icon: ShoppingBag,
    title: 'Bán hàng POS',
    description: 'Tập trung thao tác gọi món, quản lý bàn và theo dõi đơn hàng tại quầy.',
  },
  {
    icon: Warehouse,
    title: 'Quản lý kho',
    description: 'Theo dõi nguyên liệu, số lượng tồn và hoạt động nhập, xuất kho.',
  },
  {
    icon: CookingPot,
    title: 'Công thức',
    description: 'Chuẩn hóa thành phần và định lượng nguyên liệu cho từng món.',
  },
  {
    icon: ArrowDownToLine,
    title: 'Tự động trừ nguyên liệu',
    description: 'Kết nối món đã bán với lượng nguyên liệu sử dụng theo công thức.',
  },
  {
    icon: ChartPie,
    title: 'Chi phí nguyên liệu & lợi nhuận món',
    description: 'Nhìn rõ chi phí nguyên liệu và hiệu quả đóng góp của từng món trong thực đơn.',
  },
  {
    icon: ClipboardList,
    title: 'Báo cáo vận hành',
    description: 'Tổng hợp tình hình bán hàng và hoạt động cửa hàng trong một góc nhìn.',
  },
  {
    icon: BellRing,
    title: 'Cảnh báo',
    description: 'Nhận biết nguyên liệu sắp hết, hết hàng hoặc gần đến hạn sử dụng.',
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Phân tích kinh doanh',
    description: 'Khám phá xu hướng bán hàng để cân nhắc thực đơn, bán kèm và khuyến mãi.',
  },
];
export const audiences = [
  { icon: Coffee, title: 'Quán cà phê' },
  { icon: Soup, title: 'Quán ăn' },
  { icon: UtensilsCrossed, title: 'Nhà hàng nhỏ' },
  { icon: CupSoda, title: 'Tiệm đồ uống' },
  { icon: Store, title: 'Chuỗi F&B quy mô nhỏ và vừa' },
];
