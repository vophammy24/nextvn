import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  Bell,
  Building2,
  ChevronDown,
  CircleHelp,
  CreditCard,
  FileBarChart,
  LayoutDashboard,
  Menu,
  PackageSearch,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import axios from 'axios';

import { api } from '@/services/api';
import './OwnerWorkspace.css';

type PageKey =
  | 'overview'
  | 'branches'
  | 'revenue'
  | 'menu-profit'
  | 'inventory'
  | 'promotions'
  | 'users'
  | 'subscription'
  | 'settings';
type Envelope<T> = { data: T; source?: string };
type Trend = { label: string; value: number };
type Category = { name: string; value: number };
type Overview = {
  revenueVnd: number;
  grossProfitVnd: number;
  averageOrderVnd: number;
  orderCount: number;
  revenueTrend: Trend[];
  categoryRevenue: Category[];
  peakHours: Trend[];
  highlights: string[];
  profitableItems: { name: string; grossProfitVnd: number }[];
};
type Branch = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  managerName: string | null;
  orderCount: number | null;
  revenueVnd: number | null;
};
type Member = {
  id: string;
  fullName: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  branchId: string | null;
  branchName: string;
  lastActive: string;
  isActive: boolean;
  canManageAccess?: boolean;
};
type MemberCollection = { members: Member[]; branches: Branch[] };
type Revenue = {
  revenueVnd: number;
  orderCount: number;
  averageOrderVnd: number;
  bestWindow: string;
  trend: Trend[];
  categories: Category[];
  topItems: { name: string; quantity: number; revenueVnd: number }[];
};
type ProfitRow = {
  name: string;
  quantity: number;
  revenueVnd: number;
  ingredientCostVnd: number;
  grossProfitVnd: number;
  margin: number;
};
type Inventory = {
  ingredientCount: number;
  lowStockCount: number;
  nearExpiryCount: number;
  stockValueVnd: number;
  consumption: Trend[];
  statusDistribution: Category[];
  byBranch: {
    branchName: string;
    ingredientCount: number;
    lowStockCount: number;
    nearExpiryCount: number;
    stockValueVnd: number;
  }[];
};
type Promotion = {
  id: string;
  title: string;
  reason: string;
  relatedItems: string[];
  evidence: string;
  action: string;
  basis: string;
};
type Subscription = {
  plan: string;
  usage: string;
  renewalDate: string | null;
  status: string;
  billingHistory: { date: string; description: string; amountVnd: number; status: string }[];
  plans: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    monthlyPriceVnd: number | null;
    annualPriceVnd: number | null;
  }[];
  payOSAvailable: boolean;
};
type SettingsData = {
  businessName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  taxRate: number;
  serviceFeeRate: number;
  invoicePrefix: string;
  receiptTitle: string | null;
  receiptFooter: string | null;
  notifyLowStock: boolean;
  notifyNearExpiry: boolean;
};

const links: { key: PageKey; label: string; path: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: 'Tổng quan', path: '/app/owner', icon: LayoutDashboard },
  { key: 'branches', label: 'Chi nhánh', path: '/app/owner/branches', icon: Building2 },
  { key: 'revenue', label: 'Doanh thu', path: '/app/owner/revenue', icon: FileBarChart },
  { key: 'menu-profit', label: 'Lợi nhuận món', path: '/app/owner/menu-profit', icon: Utensils },
  { key: 'inventory', label: 'Tồn kho', path: '/app/owner/inventory', icon: PackageSearch },
  { key: 'promotions', label: 'Gợi ý khuyến mãi', path: '/app/owner/promotions', icon: Sparkles },
  { key: 'users', label: 'Người dùng & vai trò', path: '/app/owner/users', icon: Users },
  { key: 'subscription', label: 'Gói dịch vụ', path: '/app/owner/subscription', icon: CreditCard },
  { key: 'settings', label: 'Cài đặt doanh nghiệp', path: '/app/owner/settings', icon: Settings },
];
const titles: Record<PageKey, { title: string; subtitle: string }> = {
  overview: {
    title: 'Tổng quan doanh nghiệp',
    subtitle: 'Theo dõi sức khỏe vận hành trên toàn hệ thống.',
  },
  branches: {
    title: 'Quản lý chi nhánh',
    subtitle: 'Thông tin và trạng thái hoạt động của các cơ sở.',
  },
  revenue: {
    title: 'Phân tích doanh thu',
    subtitle: 'So sánh doanh thu và hiệu quả bán hàng theo thời gian.',
  },
  'menu-profit': {
    title: 'Hiệu quả thực đơn',
    subtitle: 'Đối chiếu doanh thu với chi phí nguyên liệu từ dữ liệu công thức.',
  },
  inventory: {
    title: 'Tồn kho toàn hệ thống',
    subtitle: 'Nhận biết chi nhánh cần được bổ sung hoặc kiểm tra.',
  },
  promotions: {
    title: 'Gợi ý chương trình bán hàng',
    subtitle: 'Đề xuất theo quy tắc và dữ liệu vận hành hiện có.',
  },
  users: { title: 'Người dùng & vai trò', subtitle: 'Quản lý quyền truy cập trong doanh nghiệp.' },
  subscription: {
    title: 'Gói dịch vụ',
    subtitle: 'Theo dõi gói hiện tại, mức sử dụng và thanh toán.',
  },
  settings: { title: 'Cài đặt doanh nghiệp', subtitle: 'Thông tin, thuế, hóa đơn và thông báo.' },
};
const palette = ['#176b5b', '#e6a33a', '#b84e39', '#537a92'];
const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
const integer = (value: number) => new Intl.NumberFormat('vi-VN').format(value);

function getPage(path: string): PageKey {
  if (path === '/app/owner') return 'overview';
  return links.find((item) => item.path === path)?.key ?? 'overview';
}

export default function OwnerWorkspace() {
  const location = useLocation();
  const page = getPage(location.pathname.replace(/\/$/, ''));
  const [data, setData] = useState<unknown>(null);
  const [loadedPageKey, setLoadedPageKey] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [period, setPeriod] = useState('week');
  const [mobileNav, setMobileNav] = useState(false);
  const [branchForm, setBranchForm] = useState({ name: '', address: '', phone: '' });
  const [memberForm, setMemberForm] = useState({
    fullName: '',
    email: '',
    role: 'STAFF',
    branchId: '',
  });
  const [settingsForm, setSettingsForm] = useState<SettingsData | null>(null);
  const pageKey = `${page}:${page === 'revenue' ? period : ''}`;
  const loading = loadedPageKey !== pageKey;

  async function getAccessToken() {
    const saved = sessionStorage.getItem('nextvnAccessToken');
    if (saved) return saved;
    if (!import.meta.env.DEV) return null;
    const response = await api.get<{ token: string }>('/dev/session');
    sessionStorage.setItem('nextvnAccessToken', response.data.token);
    return response.data.token;
  }

  async function loadPage(selectedPage = page, selectedPeriod = period) {
    const requestedPageKey = `${selectedPage}:${selectedPage === 'revenue' ? selectedPeriod : ''}`;
    try {
      const accessToken = await getAccessToken();
      setError('');
      if (!accessToken)
        throw new Error(
          'Phiên đăng nhập chưa sẵn sàng. Vui lòng đăng nhập bằng tài khoản Chủ doanh nghiệp.',
        );
      const route =
        selectedPage === 'overview'
          ? 'overview'
          : selectedPage === 'users'
            ? 'members'
            : selectedPage;
      const requestConfig = {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: selectedPage === 'revenue' ? { period: selectedPeriod } : undefined,
      };
      if (selectedPage === 'users') {
        const [membersResponse, branchesResponse] = await Promise.all([
          api.get<Envelope<Member[]>>('/owner/members', requestConfig),
          api.get<Envelope<Branch[]>>('/owner/branches', requestConfig),
        ]);
        setData({ members: membersResponse.data.data, branches: branchesResponse.data.data });
      } else {
        const response = await api.get<Envelope<unknown>>(`/owner/${route}`, requestConfig);
        setData(response.data.data);
        if (selectedPage === 'settings') setSettingsForm(response.data.data as SettingsData);
      }
    } catch (caught) {
      setData(null);
      setError(
        axios.isAxiosError(caught)
          ? (caught.response?.data?.message ?? 'Không thể tải dữ liệu doanh nghiệp.')
          : caught instanceof Error
            ? caught.message
            : 'Đã xảy ra lỗi.',
      );
    } finally {
      setLoadedPageKey(requestedPageKey);
    }
  }

  useEffect(() => {
    void loadPage();
  }, [page, period]);

  async function submit(path: string, method: 'post' | 'patch', body: unknown) {
    setLoadedPageKey('');
    setNotice('');
    setError('');
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error('Phiên đăng nhập chưa sẵn sàng.');
      await api[method](`/owner/${path}`, body, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setNotice('Đã cập nhật dữ liệu trong môi trường phát triển.');
      await loadPage();
    } catch (caught) {
      setError(
        axios.isAxiosError(caught)
          ? (caught.response?.data?.message ?? 'Không thể lưu thay đổi.')
          : caught instanceof Error
            ? caught.message
            : 'Đã xảy ra lỗi.',
      );
    }
  }

  const heading = titles[page];
  const isDevelopmentData = import.meta.env.DEV && data !== null;

  return (
    <div className="owner-app">
      <aside className={`owner-sidebar${mobileNav ? ' is-open' : ''}`}>
        <div className="brand-lockup">
          <span className="brand-mark">N</span>
          <span>
            <strong>nextvn</strong>
            <small>QUẢN TRỊ DOANH NGHIỆP</small>
          </span>
          <button
            className="icon-button close-nav"
            onClick={() => setMobileNav(false)}
            aria-label="Đóng menu"
          >
            <X size={18} />
          </button>
        </div>
        <div className="business-switcher">
          <span className="business-avatar">BN</span>
          <span>
            <strong>Bếp Nhà Mình</strong>
            <small>Doanh nghiệp của tôi</small>
          </span>
          <ChevronDown size={15} />
        </div>
        <nav className="owner-nav" aria-label="Điều hướng doanh nghiệp">
          <p className="nav-caption">DOANH NGHIỆP</p>
          {links.map(({ key, label, path, icon: Icon }) => (
            <NavLink
              key={key}
              to={path}
              end={key === 'overview'}
              onClick={() => setMobileNav(false)}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {key === 'inventory' && <span className="nav-count">5</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink to="/app/profile" className="nav-link">
            <Users size={18} />
            <span>Hồ sơ cá nhân</span>
          </NavLink>
          <button className="nav-link">
            <CircleHelp size={18} />
            <span>Trợ giúp</span>
          </button>
        </div>
      </aside>

      <div className="owner-main">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setMobileNav(true)}
            aria-label="Mở menu"
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            Doanh nghiệp <span>/</span> <strong>{heading.title}</strong>
          </div>
          <div className="topbar-actions">
            <button className="icon-button notification-button" aria-label="Thông báo">
              <Bell size={18} />
              <i />
            </button>
            <div className="profile-chip">
              <span className="profile-avatar">LC</span>
              <span>
                <strong>Lê Minh Châu</strong>
                <small>Chủ doanh nghiệp</small>
              </span>
              <ChevronDown size={15} />
            </div>
          </div>
        </header>

        <main className="page-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                BẾP NHÀ MÌNH <span>·</span> TOÀN HỆ THỐNG
              </p>
              <h1>{heading.title}</h1>
              <p>{heading.subtitle}</p>
            </div>
            <button className="button button-light">
              <Activity size={16} /> Hôm nay <ChevronDown size={15} />
            </button>
          </div>
          {isDevelopmentData && (
            <div className="dev-banner">
              <ShieldCheck size={16} />
              <span>
                <strong>Dữ liệu phát triển</strong> · Số liệu minh họa, không phải dữ liệu kinh
                doanh thực tế.
              </span>
            </div>
          )}
          {notice && <div className="inline-notice">{notice}</div>}
          {error && (
            <div className="error-panel">
              <strong>Chưa thể hiển thị dữ liệu</strong>
              <span>{error}</span>
              <button className="button button-light" onClick={() => void loadPage()}>
                Thử lại
              </button>
            </div>
          )}
          {loading ? (
            <div className="loading-panel">
              <span className="spinner" />
              Đang tải dữ liệu doanh nghiệp…
            </div>
          ) : (
            data !== null &&
            data !== undefined &&
            !error && (
              <PageView
                page={page}
                data={data}
                period={period}
                setPeriod={setPeriod}
                branchForm={branchForm}
                setBranchForm={setBranchForm}
                memberForm={memberForm}
                setMemberForm={setMemberForm}
                settingsForm={settingsForm}
                setSettingsForm={setSettingsForm}
                submit={submit}
              />
            )
          )}
        </main>
      </div>
    </div>
  );
}

function PageView(props: {
  page: PageKey;
  data: unknown;
  period: string;
  setPeriod: (period: string) => void;
  branchForm: { name: string; address: string; phone: string };
  setBranchForm: (form: { name: string; address: string; phone: string }) => void;
  memberForm: { fullName: string; email: string; role: string; branchId: string };
  setMemberForm: (form: {
    fullName: string;
    email: string;
    role: string;
    branchId: string;
  }) => void;
  settingsForm: SettingsData | null;
  setSettingsForm: (form: SettingsData) => void;
  submit: (path: string, method: 'post' | 'patch', body: unknown) => Promise<void>;
}) {
  const {
    page,
    data,
    period,
    setPeriod,
    branchForm,
    setBranchForm,
    memberForm,
    setMemberForm,
    settingsForm,
    setSettingsForm,
    submit,
  } = props;
  const updateBranch = (branch: Branch) => {
    const name = window.prompt('Tên chi nhánh', branch.name);
    if (name?.trim()) void submit(`branches/${branch.id}`, 'patch', { name: name.trim() });
  };
  if (page === 'overview') {
    const item = data as Overview;
    return (
      <>
        <MetricGrid
          items={[
            ['Tổng doanh thu', money(item.revenueVnd), '+8,2%', TrendingUp],
            ['Lợi nhuận gộp', money(item.grossProfitVnd), 'Trong kỳ', Activity],
            ['Giá trị đơn trung bình', money(item.averageOrderVnd), '+3,1%', CreditCard],
            ['Tổng đơn hàng', integer(item.orderCount), 'Trong kỳ', Utensils],
          ]}
        />
        <div className="dashboard-grid">
          <section className="panel chart-panel wide">
            <PanelTitle title="Xu hướng doanh thu" detail="7 ngày gần nhất" />
            <RevenueLine data={item.revenueTrend} />
          </section>
          <section className="panel chart-panel">
            <PanelTitle title="Doanh thu theo danh mục" detail="Tỷ trọng doanh thu" />
            <CategoryChart data={item.categoryRevenue} />
          </section>
          <section className="panel">
            <PanelTitle title="Thông tin đáng chú ý" detail="Theo dữ liệu hiện có" />
            <ul className="insight-list">
              {item.highlights.map((message) => (
                <li key={message}>
                  <span className="insight-dot" />
                  {message}
                </li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <PanelTitle title="Món có lợi nhuận cao" detail="Lợi nhuận gộp" />
            <div className="rank-list">
              {item.profitableItems.map((dish, index) => (
                <div className="rank-row" key={dish.name}>
                  <span className="rank-number">0{index + 1}</span>
                  <strong>{dish.name}</strong>
                  <b>{money(dish.grossProfitVnd)}</b>
                </div>
              ))}
            </div>
          </section>
          <section className="panel chart-panel wide">
            <PanelTitle title="Khung giờ bán cao điểm" detail="Tỷ trọng đơn hàng" />
            <Bars data={item.peakHours} color="#e3a33c" />
          </section>
        </div>
      </>
    );
  }
  if (page === 'branches') {
    const branches = data as Branch[];
    return (
      <section className="panel">
        <div className="section-heading">
          <PanelTitle title="Danh sách chi nhánh" detail={`${branches.length} cơ sở`} />
          <button
            className="button button-primary"
            onClick={() => {
              const form = document.getElementById('branch-form');
              form?.classList.toggle('hidden');
            }}
          >
            <Plus size={16} /> Thêm chi nhánh
          </button>
        </div>
        <form
          id="branch-form"
          className="inline-form hidden"
          onSubmit={(event) => {
            event.preventDefault();
            void submit('branches', 'post', branchForm);
            setBranchForm({ name: '', address: '', phone: '' });
          }}
        >
          <input
            required
            minLength={2}
            placeholder="Tên chi nhánh"
            value={branchForm.name}
            onChange={(event) => setBranchForm({ ...branchForm, name: event.target.value })}
          />
          <input
            placeholder="Địa chỉ"
            value={branchForm.address}
            onChange={(event) => setBranchForm({ ...branchForm, address: event.target.value })}
          />
          <input
            placeholder="Số điện thoại"
            value={branchForm.phone}
            onChange={(event) => setBranchForm({ ...branchForm, phone: event.target.value })}
          />
          <button className="button button-primary" type="submit">
            Lưu chi nhánh
          </button>
        </form>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Chi nhánh</th>
                <th>Quản lý</th>
                <th>Đơn hàng</th>
                <th>Doanh thu</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.id}>
                  <td>
                    <strong>{branch.name}</strong>
                    <small className="cell-subtitle">
                      {branch.address || 'Chưa cập nhật địa chỉ'}
                    </small>
                  </td>
                  <td>{branch.managerName || 'Chưa có dữ liệu'}</td>
                  <td>
                    {branch.orderCount === null ? 'Chưa có dữ liệu' : integer(branch.orderCount)}
                  </td>
                  <td>
                    {branch.revenueVnd === null ? 'Chưa có dữ liệu' : money(branch.revenueVnd)}
                  </td>
                  <td>
                    <span
                      className={`status-pill ${branch.isActive ? 'status-good' : 'status-muted'}`}
                    >
                      {branch.isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
                    </span>
                  </td>
                  <td>
                    <button className="text-button" onClick={() => updateBranch(branch)}>
                      Sửa
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        void submit(`branches/${branch.id}`, 'patch', {
                          isActive: !branch.isActive,
                        })
                      }
                    >
                      {branch.isActive ? 'Tạm ngưng' : 'Kích hoạt'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }
  if (page === 'revenue') {
    const item = data as Revenue;
    return (
      <>
        <div className="period-tabs" role="tablist" aria-label="Khoảng thời gian">
          {[
            ['week', 'Tuần'],
            ['month', 'Tháng'],
            ['quarter', 'Quý'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={period === key ? 'selected' : ''}
              onClick={() => setPeriod(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <MetricGrid
          items={[
            ['Tổng doanh thu', money(item.revenueVnd), 'Theo kỳ đã chọn', TrendingUp],
            ['Tổng đơn hàng', integer(item.orderCount), 'Theo kỳ đã chọn', Utensils],
            ['Giá trị đơn trung bình', money(item.averageOrderVnd), 'Trung bình', CreditCard],
            ['Khung giờ hiệu quả nhất', item.bestWindow, 'Theo số đơn', Activity],
          ]}
        />
        <div className="dashboard-grid">
          <section className="panel chart-panel wide">
            <PanelTitle title="Xu hướng doanh thu" detail="Giá trị theo ngày" />
            <RevenueLine data={item.trend} />
          </section>
          <section className="panel chart-panel">
            <PanelTitle title="Hiệu quả danh mục" detail="Doanh thu" />
            <CategoryChart data={item.categories} />
          </section>
          <section className="panel wide">
            <PanelTitle title="Món bán chạy" detail="Toàn doanh nghiệp" />
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Món</th>
                    <th>Số lượng bán</th>
                    <th>Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {item.topItems.map((dish) => (
                    <tr key={dish.name}>
                      <td>
                        <strong>{dish.name}</strong>
                      </td>
                      <td>{integer(dish.quantity)}</td>
                      <td>{money(dish.revenueVnd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </>
    );
  }
  if (page === 'menu-profit') {
    const rows = data as ProfitRow[];
    return (
      <section className="panel">
        <PanelTitle
          title="Lợi nhuận theo món"
          detail="Chi phí nguyên liệu cần được cung cấp bởi dịch vụ công thức"
        />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Món</th>
                <th>Số lượng bán</th>
                <th>Doanh thu</th>
                <th>Chi phí nguyên liệu</th>
                <th>Lợi nhuận gộp</th>
                <th>Biên lợi nhuận</th>
                <th>Gợi ý</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((dish) => {
                const action =
                  dish.margin > 40
                    ? 'Đẩy bán'
                    : dish.margin > 30
                      ? 'Tối ưu công thức'
                      : 'Cân nhắc điều chỉnh giá';
                return (
                  <tr key={dish.name}>
                    <td>
                      <strong>{dish.name}</strong>
                    </td>
                    <td>{integer(dish.quantity)}</td>
                    <td>{money(dish.revenueVnd)}</td>
                    <td>{money(dish.ingredientCostVnd)}</td>
                    <td>
                      <strong>{money(dish.grossProfitVnd)}</strong>
                    </td>
                    <td>{dish.margin.toFixed(1)}%</td>
                    <td>
                      <span className="recommendation-tag">{action}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="footnote">
          Chi phí nguyên liệu là tổng giá vốn theo món trong kỳ, không phải giá vốn trên từng đơn
          vị. Dữ liệu phát triển chỉ dùng để minh họa.
        </p>
      </section>
    );
  }
  if (page === 'inventory') {
    const item = data as Inventory;
    return (
      <>
        <MetricGrid
          items={[
            ['Tổng nguyên liệu', integer(item.ingredientCount), 'Toàn hệ thống', PackageSearch],
            ['Sắp hết', integer(item.lowStockCount), 'Cần theo dõi', Activity],
            ['Sắp hết hạn', integer(item.nearExpiryCount), 'Cần xử lý', Bell],
            ['Giá trị tồn kho', money(item.stockValueVnd), 'Theo dữ liệu hiện có', CreditCard],
          ]}
        />
        <div className="dashboard-grid">
          <section className="panel chart-panel">
            <PanelTitle title="Nguyên liệu tiêu thụ nhiều" detail="Chỉ số tương đối" />
            <Bars data={item.consumption} color="#176b5b" />
          </section>
          <section className="panel chart-panel">
            <PanelTitle title="Phân bố tình trạng tồn kho" detail="Số nguyên liệu" />
            <CategoryChart data={item.statusDistribution} />
          </section>
          <section className="panel wide">
            <PanelTitle title="Tồn kho theo chi nhánh" detail="Tổng quan cần chú ý" />
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Chi nhánh</th>
                    <th>Nguyên liệu</th>
                    <th>Sắp hết</th>
                    <th>Sắp hết hạn</th>
                    <th>Giá trị tồn kho</th>
                  </tr>
                </thead>
                <tbody>
                  {item.byBranch.map((branch) => (
                    <tr key={branch.branchName}>
                      <td>
                        <strong>{branch.branchName}</strong>
                      </td>
                      <td>{integer(branch.ingredientCount)}</td>
                      <td>
                        <span className={branch.lowStockCount ? 'attention-value' : ''}>
                          {branch.lowStockCount}
                        </span>
                      </td>
                      <td>
                        <span className={branch.nearExpiryCount ? 'attention-value' : ''}>
                          {branch.nearExpiryCount}
                        </span>
                      </td>
                      <td>{money(branch.stockValueVnd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </>
    );
  }
  if (page === 'promotions') {
    return (
      <div className="promotion-list">
        {(data as Promotion[]).map((item) => (
          <article className="panel promotion-row" key={item.id}>
            <div className="promotion-icon">
              <Sparkles size={19} />
            </div>
            <div className="promotion-content">
              <div className="promotion-title">
                <h2>{item.title}</h2>
                <span className="rule-label">Gợi ý theo quy tắc</span>
              </div>
              <p>{item.reason}</p>
              <dl>
                <div>
                  <dt>Bằng chứng</dt>
                  <dd>{item.evidence}</dd>
                </div>
                <div>
                  <dt>Món liên quan</dt>
                  <dd>{item.relatedItems.join(' · ')}</dd>
                </div>
                <div>
                  <dt>Đề xuất</dt>
                  <dd>{item.action}</dd>
                </div>
              </dl>
              <small>{item.basis}</small>
            </div>
          </article>
        ))}
      </div>
    );
  }
  if (page === 'users') {
    const { members, branches } = data as MemberCollection;
    return (
      <section className="panel">
        <div className="section-heading">
          <PanelTitle title="Thành viên doanh nghiệp" detail={`${members.length} tài khoản`} />
          <button
            className="button button-primary"
            onClick={() => document.getElementById('member-form')?.classList.toggle('hidden')}
          >
            <Plus size={16} /> Mời thành viên
          </button>
        </div>
        <form
          id="member-form"
          className="inline-form hidden"
          onSubmit={(event) => {
            event.preventDefault();
            void submit('members', 'post', {
              ...memberForm,
              branchId: memberForm.branchId || null,
            });
            setMemberForm({ fullName: '', email: '', role: 'STAFF', branchId: '' });
          }}
        >
          <input
            required
            placeholder="Họ tên"
            value={memberForm.fullName}
            onChange={(event) => setMemberForm({ ...memberForm, fullName: event.target.value })}
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={memberForm.email}
            onChange={(event) => setMemberForm({ ...memberForm, email: event.target.value })}
          />
          <select
            value={memberForm.role}
            onChange={(event) => setMemberForm({ ...memberForm, role: event.target.value })}
          >
            <option value="STAFF">Nhân viên</option>
            <option value="MANAGER">Quản lý</option>
          </select>
          <select
            aria-label="Chi nhánh của thành viên mới"
            value={memberForm.branchId}
            onChange={(event) => setMemberForm({ ...memberForm, branchId: event.target.value })}
          >
            <option value="">Toàn doanh nghiệp</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <button className="button button-primary" type="submit">
            Gửi lời mời
          </button>
        </form>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Chi nhánh</th>
                <th>Hoạt động gần nhất</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>
                    <strong>{member.fullName}</strong>
                  </td>
                  <td>{member.email}</td>
                  <td>
                    {member.role === 'OWNER' ? (
                      <span className="role-label">Chủ doanh nghiệp</span>
                    ) : (
                      <select
                        aria-label={`Vai trò của ${member.fullName}`}
                        value={member.role}
                        onChange={(event) =>
                          void submit(`members/${member.id}`, 'patch', { role: event.target.value })
                        }
                      >
                        <option value="MANAGER">Quản lý</option>
                        <option value="STAFF">Nhân viên</option>
                      </select>
                    )}
                  </td>
                  <td>
                    {member.role === 'OWNER' ? (
                      'Toàn doanh nghiệp'
                    ) : (
                      <select
                        aria-label={`Chi nhánh của ${member.fullName}`}
                        value={member.branchId ?? ''}
                        onChange={(event) =>
                          void submit(`members/${member.id}`, 'patch', {
                            branchId: event.target.value || null,
                          })
                        }
                      >
                        <option value="">Toàn doanh nghiệp</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>{member.lastActive}</td>
                  <td>
                    <span
                      className={`status-pill ${member.isActive ? 'status-good' : 'status-muted'}`}
                    >
                      {member.isActive ? 'Đang hoạt động' : 'Đã ngừng'}
                    </span>
                  </td>
                  <td>
                    {member.role !== 'OWNER' && member.canManageAccess !== false && (
                      <button
                        className="text-button"
                        onClick={() =>
                          void submit(`members/${member.id}`, 'patch', {
                            isActive: !member.isActive,
                          })
                        }
                      >
                        {member.isActive ? 'Ngừng truy cập' : 'Mở lại'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="footnote">Quyền Chủ doanh nghiệp không thể được cấp từ màn hình này.</p>
      </section>
    );
  }
  if (page === 'subscription') {
    const item = data as Subscription;
    return (
      <>
        <section className="subscription-current">
          <div>
            <span className="eyebrow">GÓI HIỆN TẠI</span>
            <h2>{item.plan}</h2>
            <p>{item.status}</p>
          </div>
          <div className="subscription-usage">
            <span>Mức sử dụng</span>
            <strong>{item.usage}</strong>
            <small>Ngày gia hạn: {item.renewalDate ?? 'Chưa xác định'}</small>
          </div>
          <button className="button button-light" disabled={!item.payOSAvailable}>
            <CreditCard size={16} />
            {item.payOSAvailable ? 'Thanh toán gói' : 'Thanh toán chưa khả dụng'}
          </button>
        </section>
        <div className="plan-grid">
          {item.plans.map((plan) => (
            <article className="panel plan-card" key={plan.id}>
              <span className="eyebrow">NEXTVN</span>
              <h2>{plan.name}</h2>
              <p>{plan.description}</p>
              <strong className="plan-price">
                {plan.monthlyPriceVnd === null
                  ? 'Liên hệ'
                  : `${money(plan.monthlyPriceVnd)} / tháng`}
              </strong>
              <button className="button button-light" disabled>
                Chưa thể đăng ký
              </button>
            </article>
          ))}
        </div>
        <section className="panel">
          <PanelTitle title="Lịch sử thanh toán" detail="Hóa đơn của doanh nghiệp" />
          {item.billingHistory.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Nội dung</th>
                    <th>Số tiền</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {item.billingHistory.map((record) => (
                    <tr key={`${record.date}-${record.description}`}>
                      <td>{record.date}</td>
                      <td>{record.description}</td>
                      <td>{money(record.amountVnd)}</td>
                      <td>{record.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <CreditCard size={22} />
              <strong>Chưa có lịch sử thanh toán</strong>
              <span>Thanh toán gói NextVN chưa được kết nối.</span>
            </div>
          )}
        </section>
      </>
    );
  }
  const form = settingsForm;
  if (!form) return <div className="loading-panel">Đang chuẩn bị cài đặt…</div>;
  return (
    <form
      className="settings-form"
      onSubmit={(event) => {
        event.preventDefault();
        void submit('settings', 'patch', form);
      }}
    >
      <section className="panel settings-section">
        <PanelTitle title="Thông tin doanh nghiệp" detail="Thông tin hiển thị trong hệ thống" />
        <label>
          Tên doanh nghiệp
          <input
            required
            value={form.businessName}
            onChange={(event) => setSettingsForm({ ...form, businessName: event.target.value })}
          />
        </label>
        <div className="settings-grid">
          <label>
            Email liên hệ
            <input
              type="email"
              value={form.contactEmail ?? ''}
              onChange={(event) =>
                setSettingsForm({ ...form, contactEmail: event.target.value || null })
              }
            />
          </label>
          <label>
            Điện thoại liên hệ
            <input
              value={form.contactPhone ?? ''}
              onChange={(event) =>
                setSettingsForm({ ...form, contactPhone: event.target.value || null })
              }
            />
          </label>
        </div>
        <label>
          Địa chỉ doanh nghiệp
          <input
            value={form.address ?? ''}
            onChange={(event) => setSettingsForm({ ...form, address: event.target.value || null })}
          />
        </label>
        <div className="settings-grid">
          <label>
            Mã tiền tệ
            <select value="VND" onChange={() => undefined}>
              <option value="VND">VND · Đồng Việt Nam</option>
            </select>
          </label>
          <label>
            Khu vực
            <select value="vi-VN" onChange={() => undefined}>
              <option value="vi-VN">Việt Nam · vi-VN</option>
            </select>
          </label>
        </div>
      </section>
      <section className="panel settings-section">
        <PanelTitle title="Thuế & phí dịch vụ" detail="Tỷ lệ áp dụng khi lập hóa đơn" />
        <div className="settings-grid">
          <label>
            Thuế (%)
            <input
              type="number"
              min="0"
              max="100"
              value={form.taxRate}
              onChange={(event) =>
                setSettingsForm({ ...form, taxRate: Number(event.target.value) })
              }
            />
          </label>
          <label>
            Phí dịch vụ (%)
            <input
              type="number"
              min="0"
              max="100"
              value={form.serviceFeeRate}
              onChange={(event) =>
                setSettingsForm({ ...form, serviceFeeRate: Number(event.target.value) })
              }
            />
          </label>
        </div>
      </section>
      <section className="panel settings-section">
        <PanelTitle title="Cài đặt hóa đơn" detail="Thông tin hiển thị trên biên nhận" />
        <label>
          Tiêu đề biên nhận
          <input
            maxLength={120}
            value={form.receiptTitle ?? ''}
            onChange={(event) =>
              setSettingsForm({ ...form, receiptTitle: event.target.value || null })
            }
          />
        </label>
        <label>
          Lời nhắn cuối biên nhận
          <input
            maxLength={500}
            value={form.receiptFooter ?? ''}
            onChange={(event) =>
              setSettingsForm({ ...form, receiptFooter: event.target.value || null })
            }
          />
        </label>
        <label>
          Tiền tố hóa đơn
          <input
            maxLength={12}
            value={form.invoicePrefix}
            onChange={(event) => setSettingsForm({ ...form, invoicePrefix: event.target.value })}
          />
        </label>
      </section>
      <section className="panel settings-section">
        <PanelTitle title="Cài đặt thông báo" detail="Chọn loại cảnh báo cần nhận" />
        <label className="toggle-row">
          <span>
            <strong>Cảnh báo tồn kho thấp</strong>
            <small>Thông báo khi nguyên liệu cần bổ sung</small>
          </span>
          <input
            type="checkbox"
            checked={form.notifyLowStock}
            onChange={(event) => setSettingsForm({ ...form, notifyLowStock: event.target.checked })}
          />
        </label>
        <label className="toggle-row">
          <span>
            <strong>Cảnh báo gần hết hạn</strong>
            <small>Nhắc khi nguyên liệu sắp đến hạn sử dụng</small>
          </span>
          <input
            type="checkbox"
            checked={form.notifyNearExpiry}
            onChange={(event) =>
              setSettingsForm({ ...form, notifyNearExpiry: event.target.checked })
            }
          />
        </label>
      </section>
      <button className="button button-primary" type="submit">
        Lưu cài đặt
      </button>
    </form>
  );
}

function PanelTitle({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="panel-title">
      <div>
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>
      <button className="icon-button" title="Tùy chọn">
        <ChevronDown size={17} />
      </button>
    </div>
  );
}

function MetricGrid({ items }: { items: [string, string, string, typeof LayoutDashboard][] }) {
  return (
    <div className="metric-grid">
      {items.map(([label, value, detail, Icon]) => (
        <article className="metric-tile" key={label}>
          <div className="metric-top">
            <span>{label}</span>
            <span className="metric-icon">
              <Icon size={17} />
            </span>
          </div>
          <strong>{value}</strong>
          <small>{detail}</small>
        </article>
      ))}
    </div>
  );
}

function RevenueLine({ data }: { data: Trend[] }) {
  return (
    <div className="chart-area">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e9eeeb" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#77827d', fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#77827d', fontSize: 10 }}
            tickFormatter={(value) => `${Math.round(Number(value) / 1_000_000)}tr`}
            width={38}
          />
          <Tooltip formatter={(value) => money(Number(value))} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#176b5b"
            strokeWidth={2.5}
            dot={{ fill: '#176b5b', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function CategoryChart({ data }: { data: Category[] }) {
  return (
    <div className="category-wrap">
      <div className="donut-chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="64%"
              outerRadius="88%"
              paddingAngle={3}
            >
              {data.map((item, index) => (
                <Cell key={item.name} fill={palette[index % palette.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => money(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
        <span className="donut-center">
          <strong>{data.length}</strong>
          <small>nhóm món</small>
        </span>
      </div>
      <div className="legend-list">
        {data.map((item, index) => (
          <div key={item.name}>
            <i style={{ backgroundColor: palette[index % palette.length] }} />
            <span>{item.name}</span>
            <strong>{money(item.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bars({ data, color }: { data: Trend[]; color: string }) {
  return (
    <div className="chart-area">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 2, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e9eeeb" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#53625b', fontSize: 11 }}
            width={85}
          />
          <Tooltip />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={17} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
