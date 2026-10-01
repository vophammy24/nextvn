import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnalyticsChart } from '@/components/common/AnalyticsChart';
import { StatCard, StatusBadge, EmptyState } from '@/components/common/Foundation';
import { useLocation } from 'react-router-dom';
import {
  Activity,
  Building2,
  CreditCard,
  FileBarChart,
  LayoutDashboard,
  Plus,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  Utensils,
} from 'lucide-react';
import axios from 'axios';

import { useWorkspace } from '@/features/auth/workspaceContext';
import { formatCurrency, formatNumber, formatDate } from '@/lib/format';
import { api } from '@/services/api';
import './OwnerWorkspace.css';

type PageKey =
  | 'overview'
  | 'branches'
  | 'revenue'
  | 'menu-profit'
  | 'promotions'
  | 'users'
  | 'subscription'
  | 'settings';
type Envelope<T> = { data: T; source?: string };
type Trend = { label: string; value: number };
type Category = { name?: string; label?: string; value: number };
type Overview = {
  revenueVnd: number;
  grossProfitVnd: number | null;
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
    subtitle: 'Ước tính theo doanh thu và chi phí công thức hiện tại trong bảy ngày gần nhất.',
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
const money = (value: number | null) =>
  value === null ? 'Chưa đủ dữ liệu' : formatCurrency(value);
const integer = formatNumber;

function getPage(path: string): PageKey {
  if (path === '/app/owner') return 'overview';
  return links.find((item) => item.path === path)?.key ?? 'overview';
}

export default function OwnerWorkspace() {
  const { context } = useWorkspace();
  const base = `/business/${encodeURIComponent(context.business.id)}/owner`;
  const location = useLocation();
  const page = getPage(location.pathname.replace(/\/$/, ''));
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState('');
  const [period, setPeriod] = useState('week');
  const [branchForm, setBranchForm] = useState({ name: '', address: '', phone: '' });
  const [memberForm, setMemberForm] = useState({
    fullName: '',
    email: '',
    role: 'STAFF',
    branchId: '',
  });
  const [settingsForm, setSettingsForm] = useState<SettingsData | null>(null);
  const query = useQuery({
    queryKey: ['owner', context.business.id, page, period],
    retry: false,
    queryFn: async ({ signal }): Promise<unknown> => {
      const requestConfig = { signal, params: page === 'revenue' ? { period } : undefined };
      if (page === 'users') {
        const [members, branches] = await Promise.all([
          api.get<Envelope<Member[]>>(base + '/members', requestConfig),
          api.get<Envelope<Branch[]>>(base + '/branches', requestConfig),
        ]);
        return { members: members.data.data, branches: branches.data.data };
      }
      return (await api.get<Envelope<unknown>>(base + '/' + page, requestConfig)).data.data;
    },
  });
  const mutation = useMutation({
    mutationFn: ({
      path,
      method,
      body,
    }: {
      path: string;
      method: 'post' | 'patch';
      body: unknown;
    }) => api[method](base + '/' + path, body),
    onSuccess: async () => {
      setNotice('Đã cập nhật dữ liệu.');
      await query.refetch();
      if (page === 'settings') await queryClient.invalidateQueries({ queryKey: ['workspace'] });
    },
  });
  async function submit(path: string, method: 'post' | 'patch', body: unknown) {
    setNotice('');
    try {
      await mutation.mutateAsync({ path, method, body });
    } catch {
      /* Error displayed below. */
    }
  }
  const caught = mutation.error ?? query.error;
  const error = caught
    ? axios.isAxiosError(caught)
      ? (caught.response?.data?.message ?? 'Không thể tải hoặc lưu dữ liệu doanh nghiệp.')
      : caught.message
    : '';
  const loading = query.isPending || mutation.isPending;
  const data = query.data;
  const loadPage = async () => {
    mutation.reset();
    await query.refetch();
  };

  const heading = titles[page];

  return (
    <div className="owner-app">
      <div className="owner-main">
        <section className="page-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {context.business.name} <span>·</span> TOÀN HỆ THỐNG
              </p>
              <h1>{heading.title}</h1>
              <p>{heading.subtitle}</p>
            </div>
          </div>

          {notice && (
            <div className="inline-notice" role="status">
              {notice}
            </div>
          )}
          {error && (
            <div className="error-panel" role="alert">
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
                settingsForm={settingsForm ?? (page === 'settings' ? (data as SettingsData) : null)}
                setSettingsForm={setSettingsForm}
                submit={submit}
              />
            )
          )}
        </section>
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
            ['Tổng doanh thu', money(item.revenueVnd), 'Bảy ngày gần nhất', TrendingUp],
            [
              'Lợi nhuận gộp ước tính',
              money(item.grossProfitVnd),
              'Theo công thức hiện tại',
              Activity,
            ],
            [
              'Giá trị đơn trung bình',
              money(item.averageOrderVnd),
              'Bảy ngày gần nhất',
              CreditCard,
            ],
            ['Tổng đơn hàng', integer(item.orderCount), 'Trong kỳ', Utensils],
          ]}
        />
        <div className="dashboard-grid">
          <section className="panel chart-panel wide">
            <AnalyticsChart
              title="Xu hướng doanh thu"
              description="7 ngày gần nhất"
              rows={item.revenueTrend}
              line
            />
          </section>
          <section className="panel chart-panel">
            <AnalyticsChart
              title="Doanh thu theo danh mục"
              description="Doanh thu thực tế theo nhóm món"
              rows={item.categoryRevenue.map((row) => ({
                label: row.label ?? row.name ?? 'Khác',
                value: row.value,
              }))}
            />
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
            <PanelTitle
              title="Món có lợi nhuận cao ước tính"
              detail="Ước tính theo công thức hiện tại"
            />
            <div className="rank-list">
              {!item.profitableItems.length && <p>Chưa có dữ liệu lợi nhuận món.</p>}
              {item.profitableItems.map((dish, index) => (
                <div className="rank-row" key={`${dish.name}-${index}`}>
                  <span className="rank-number">{String(index + 1).padStart(2, '0')}</span>
                  <strong>{dish.name}</strong>
                  <b>{money(dish.grossProfitVnd)}</b>
                </div>
              ))}
            </div>
          </section>
          <section className="panel chart-panel wide">
            <AnalyticsChart
              title="Khung giờ bán cao điểm"
              description="Số đơn đã thanh toán trong bảy ngày gần nhất"
              rows={item.peakHours}
              money={false}
              measure="Số đơn"
            />
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
            aria-label="Tên chi nhánh"
            placeholder="Tên chi nhánh"
            value={branchForm.name}
            onChange={(event) => setBranchForm({ ...branchForm, name: event.target.value })}
          />
          <input
            aria-label="Địa chỉ"
            placeholder="Địa chỉ"
            value={branchForm.address}
            onChange={(event) => setBranchForm({ ...branchForm, address: event.target.value })}
          />
          <input
            aria-label="Số điện thoại"
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
                    <StatusBadge status={branch.isActive ? 'ACTIVE' : 'INACTIVE'} />
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
              role="tab"
              aria-selected={period === key}
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
            <AnalyticsChart
              title="Xu hướng doanh thu"
              description="Giá trị theo ngày"
              rows={item.trend}
              line
            />
          </section>
          <section className="panel chart-panel">
            <AnalyticsChart
              title="Hiệu quả danh mục"
              description="Doanh thu thực tế theo nhóm món"
              rows={item.categories.map((row) => ({
                label: row.label ?? row.name ?? 'Khác',
                value: row.value,
              }))}
            />
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
        <PanelTitle title="Lợi nhuận theo món" detail="Ước tính theo công thức cơ bản hiện tại" />
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
                    <td>{dish.margin.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%</td>
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
          Chi phí ước tính theo công thức cơ bản hiện tại nhân số lượng đã bán, chưa bao gồm tùy
          chọn món và biến động giá vốn lịch sử. Gợi ý được tạo theo quy tắc biên lợi nhuận.
        </p>
      </section>
    );
  }
  if (page === 'promotions') {
    return (
      <div className="promotion-list">
        {!(data as Promotion[]).length && (
          <EmptyState title="Chưa đủ dữ liệu để gợi ý khuyến mãi" />
        )}
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
            aria-label="Họ tên"
            placeholder="Họ tên"
            value={memberForm.fullName}
            onChange={(event) => setMemberForm({ ...memberForm, fullName: event.target.value })}
          />
          <input
            required
            type="email"
            aria-label="Email"
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
            <option value="" disabled>
              Chọn chi nhánh
            </option>
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
                    <StatusBadge status={member.isActive ? 'ACTIVE' : 'INACTIVE'} />
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
            <p>
              {(
                {
                  ACTIVE: 'Đang hoạt động',
                  TRIALING: 'Dùng thử',
                  PAST_DUE: 'Quá hạn',
                  CANCELED: 'Đã hủy',
                  EXPIRED: 'Hết hạn',
                } as Record<string, string>
              )[item.status] ?? item.status}
            </p>
          </div>
          <div className="subscription-usage">
            <span>Mức sử dụng</span>
            <strong>{item.usage}</strong>
            <small>
              Ngày gia hạn: {item.renewalDate ? formatDate(item.renewalDate) : 'Chưa xác định'}
            </small>
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
                      <td>{formatDate(record.date)}</td>
                      <td>{record.description}</td>
                      <td>{money(record.amountVnd)}</td>
                      <td>
                        {(
                          {
                            PENDING: 'Chờ thanh toán',
                            PAID: 'Đã thanh toán',
                            FAILED: 'Thất bại',
                            REFUNDED: 'Đã hoàn tiền',
                          } as Record<string, string>
                        )[record.status] ?? record.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <CreditCard size={22} />
              <strong>Chưa có lịch sử thanh toán</strong>
              <span>Thanh toán gói nextvn chưa được kết nối.</span>
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
    </div>
  );
}

function MetricGrid({ items }: { items: [string, string, string, typeof LayoutDashboard][] }) {
  return (
    <div className="metric-grid">
      {items.map(([label, value, detail, Icon]) => (
        <StatCard
          key={label}
          label={label}
          value={value}
          detail={detail}
          icon={<Icon size={17} />}
        />
      ))}
    </div>
  );
}
