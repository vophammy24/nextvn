import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { ClipboardCheck, Store, Users, CreditCard } from 'lucide-react';
import { api } from '@/services/api';
import {
  PageHeader,
  SectionCard,
  StatCard,
  LoadingState,
  ErrorState,
  SearchInput,
} from '@/components/common/Foundation';
import { DataTable, type TableColumn } from '@/components/common/DataTable';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { formatCurrency } from '@/lib/format';
import { roleLabels } from '@/app/shellNavigation';
import type { BusinessRole } from '@/app/navigation';
import './admin.css';

type View = 'dashboard' | 'approvals' | 'businesses' | 'owners' | 'subscriptions' | 'audit-logs';
type LinkedBusiness = {
  businessId: string;
  name: string;
  approvalStatus: string;
  operationalStatus: string;
  isActive: boolean;
  role?: BusinessRole;
  branchName?: string | null;
};
type Subscription = {
  plan: string;
  status: string;
  startedAt: string;
  periodEndsAt: string | null;
};
export type AdminRow = {
  id: string;
  name?: string;
  businessId?: string;
  fullName?: string;
  username?: string;
  email?: string;
  status?: string;
  approvalStatus?: string;
  operationalStatus?: string;
  branchCount?: number;
  owners?: { id: string; fullName: string; email: string; isActive: boolean }[] | null;
  businesses?: LinkedBusiness[];
  subscription?: Subscription | null;
  profile?: {
    address: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  } | null;
  ownerName?: string;
  ownerEmail?: string;
  ownerId?: string;
  contactPhone?: string;
  address?: string;
  submittedAt?: string;
  reviewedAt?: string | null;
  reviewerId?: string | null;
  reviewReason?: string | null;
  plan?: string;
  planCode?: string;
  startedAt?: string;
  periodEndsAt?: string | null;
  createdAt?: string;
  actorName?: string;
  actorId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  previousStatus?: string | null;
  newStatus?: string;
  reason?: string | null;
  correlationId?: string;
};
type Collection = { rows: AdminRow[]; total: number; page: number; pageSize: number };
type History = {
  application: AdminRow | null;
  events: AdminRow[];
  billing: {
    id: string;
    amountVnd: number;
    status: string;
    createdAt: string;
    paidAt: string | null;
  }[];
};
const labels: Record<string, string> = {
  PENDING: 'Chờ xét duyệt',
  APPROVED: 'Đã phê duyệt',
  REJECTED: 'Đã từ chối',
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Không hoạt động',
  SUSPENDED: 'Tạm ngưng',
  TRIALING: 'Dùng thử',
  PAST_DUE: 'Quá hạn',
  CANCELED: 'Đã hủy',
  EXPIRED: 'Hết hạn',
  PAID: 'Đã thanh toán',
  FAILED: 'Thất bại',
  REFUNDED: 'Đã hoàn tiền',
  APPLICATION_APPROVED: 'Phê duyệt hồ sơ',
  APPLICATION_REJECTED: 'Từ chối hồ sơ',
  BUSINESS_ACTIVE: 'Kích hoạt lại doanh nghiệp',
  BUSINESS_SUSPENDED: 'Tạm ngưng doanh nghiệp',
  ADMIN_BOOTSTRAPPED: 'Cấp quyền quản trị ban đầu',
};
const titles: Record<View, string> = {
  dashboard: 'Tổng quan nền tảng',
  approvals: 'Phê duyệt doanh nghiệp',
  businesses: 'Doanh nghiệp',
  owners: 'Chủ doanh nghiệp',
  subscriptions: 'Gói dịch vụ',
  'audit-logs': 'Nhật ký quản trị',
};
const date = (value?: string | null) =>
  value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa có';
function StateBadge({ value }: { value?: string }) {
  return (
    <Badge
      tone={
        ['APPROVED', 'ACTIVE', 'PAID'].includes(value ?? '')
          ? 'success'
          : ['REJECTED', 'SUSPENDED', 'FAILED'].includes(value ?? '')
            ? 'danger'
            : ['PENDING', 'PAST_DUE', 'TRIALING'].includes(value ?? '')
              ? 'warning'
              : 'neutral'
      }
    >
      {labels[value ?? ''] ?? value ?? 'Chưa có'}
    </Badge>
  );
}
const eventColumns: TableColumn<AdminRow>[] = [
  { key: 'time', header: 'Thời gian', render: (r) => date(r.createdAt) },
  { key: 'actor', header: 'Người thực hiện', render: (r) => r.actorName ?? r.actorId },
  { key: 'action', header: 'Thao tác', render: (r) => labels[r.action ?? ''] ?? r.action },
  {
    key: 'state',
    header: 'Thay đổi',
    render: (r) => (
      <>
        {r.previousStatus ? (labels[r.previousStatus] ?? r.previousStatus) + ' → ' : ''}
        {labels[r.newStatus ?? ''] ?? r.newStatus}
      </>
    ),
  },
  { key: 'reason', header: 'Lý do', render: (r) => r.reason ?? 'Không có' },
];
function Pager({
  page,
  hasNext,
  onChange,
}: {
  page: number;
  hasNext: boolean;
  onChange: (page: number) => void;
}) {
  return (
    <nav className="pagination" aria-label="Phân trang">
      <Button variant="secondary" disabled={page === 1} onClick={() => onChange(page - 1)}>
        Trước
      </Button>
      <span>Trang {page}</span>
      <Button variant="secondary" disabled={!hasNext} onClick={() => onChange(page + 1)}>
        Sau
      </Button>
    </nav>
  );
}
function Dashboard() {
  const query = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async ({ signal }) =>
      (await api.get<Record<string, number>>('/admin/dashboard', { signal })).data,
  });
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;
  const metrics = [
    ['businesses', 'Tổng doanh nghiệp', Store],
    ['pending', 'Hồ sơ chờ duyệt', ClipboardCheck],
    ['approved', 'Doanh nghiệp đã duyệt', Store],
    ['suspended', 'Doanh nghiệp tạm ngưng', Store],
    ['owners', 'Chủ doanh nghiệp', Users],
    ['activeSubscriptions', 'Gói đang hoạt động', CreditCard],
    ['expiringSubscriptions', 'Gói hết hạn trong 30 ngày', CreditCard],
  ] as const;
  return (
    <>
      <div className="admin-metrics">
        {metrics.map(([key, label, Icon]) => (
          <StatCard
            key={key}
            label={label}
            value={query.data[key]?.toLocaleString('vi-VN') ?? 'Chưa có dữ liệu'}
            icon={<Icon size={20} />}
          />
        ))}
      </div>
      <SectionCard title="Hồ sơ cần xử lý">
        <p>Xem hồ sơ doanh nghiệp và thông tin chủ doanh nghiệp trước khi quyết định.</p>
        <Link className="ui-button ui-button-primary" to="/app/admin/approvals">
          Mở hàng chờ phê duyệt
        </Link>
      </SectionCard>
    </>
  );
}
export function AdminPortal({ view }: { view: View }) {
  return (
    <div className="admin-content admin-page">
      <PageHeader title={titles[view]} description="Quản trị nền tảng NextVN" />
      {view === 'dashboard' ? <Dashboard /> : <AdminCollection view={view} />}
    </div>
  );
}
function AdminCollection({ view }: { view: Exclude<View, 'dashboard'> }) {
  const client = useQueryClient();
  const [q, setQ] = useState(''),
    [status, setStatus] = useState(view === 'approvals' ? 'PENDING' : ''),
    [operation, setOperation] = useState('');
  const [page, setPage] = useState(1),
    [sort, setSort] = useState('newest'),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [actionFilter, setActionFilter] = useState('');
  const [selected, setSelected] = useState<AdminRow | null>(null),
    [decision, setDecision] = useState<string | null>(null),
    [reason, setReason] = useState(''),
    [notice, setNotice] = useState(''),
    [historyPage, setHistoryPage] = useState(1);
  const params = {
    q,
    status,
    operationalStatus: operation,
    page,
    sort,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(actionFilter ? { action: actionFilter } : {}),
  };
  const query = useQuery({
    queryKey: ['admin', view, params],
    queryFn: async ({ signal }) =>
      (await api.get<Collection>(`/admin/${view}`, { params, signal })).data,
  });
  const businessId = selected?.businessId ?? (view === 'businesses' ? selected?.id : undefined);
  const history = useQuery({
    queryKey: ['admin', 'history', businessId, historyPage],
    enabled: !!businessId,
    queryFn: async ({ signal }) =>
      (
        await api.get<History>(`/admin/businesses/${businessId}/history`, {
          params: { page: historyPage },
          signal,
        })
      ).data,
  });
  const mutation = useMutation({
    mutationFn: async () => {
      if (!selected || !decision) throw new Error('Thiếu thông tin.');
      return api.post(
        view === 'approvals'
          ? `/admin/approvals/${selected.id}/review`
          : `/admin/businesses/${selected.id}/status`,
        { status: decision, ...(reason.trim() ? { reason: reason.trim() } : {}) },
      );
    },
    onSuccess: async () => {
      setSelected(null);
      setDecision(null);
      setReason('');
      setNotice('Đã lưu thay đổi và ghi nhật ký quản trị.');
      await client.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (error) => {
      if (isAxiosError(error) && [404, 409].includes(error.response?.status ?? 0))
        void client.invalidateQueries({ queryKey: ['admin'] });
    },
  });
  function open(row: AdminRow) {
    setSelected(row);
    setDecision(null);
    setReason('');
    setHistoryPage(1);
    mutation.reset();
  }
  function filter(set: (v: string) => void, value: string) {
    set(value);
    setPage(1);
  }
  const columns: TableColumn<AdminRow>[] =
    view === 'audit-logs'
      ? [...eventColumns]
      : [
          {
            key: 'name',
            header: view === 'owners' ? 'Chủ doanh nghiệp' : 'Doanh nghiệp',
            render: (r) => (
              <>
                <strong>{r.name ?? r.fullName}</strong>
                {(r.ownerEmail ?? r.email) && <p>{r.ownerEmail ?? r.email}</p>}
              </>
            ),
          },
          ...(view === 'approvals'
            ? [
                { key: 'owner', header: 'Chủ doanh nghiệp', render: (r: AdminRow) => r.ownerName },
                { key: 'date', header: 'Ngày gửi', render: (r: AdminRow) => date(r.submittedAt) },
              ]
            : []),
          ...(view === 'businesses'
            ? [
                {
                  key: 'branches',
                  header: 'Chi nhánh',
                  numeric: true,
                  render: (r: AdminRow) => r.branchCount,
                },
                {
                  key: 'operation',
                  header: 'Hoạt động',
                  render: (r: AdminRow) => <StateBadge value={r.operationalStatus} />,
                },
              ]
            : []),
          ...(view === 'subscriptions'
            ? [
                { key: 'plan', header: 'Gói', render: (r: AdminRow) => r.plan },
                {
                  key: 'end',
                  header: 'Ngày hết hạn',
                  render: (r: AdminRow) => date(r.periodEndsAt),
                },
              ]
            : []),
          {
            key: 'status',
            header: 'Trạng thái',
            render: (r) => <StateBadge value={r.approvalStatus ?? r.status} />,
          },
        ];
  columns.push({
    key: 'details',
    header: 'Chi tiết',
    render: (r) => (
      <Button variant="secondary" size="small" onClick={() => open(r)}>
        Xem chi tiết
      </Button>
    ),
  });
  const statuses =
    view === 'approvals' || view === 'businesses'
      ? ['PENDING', 'APPROVED', 'REJECTED']
      : view === 'owners'
        ? ['ACTIVE', 'INACTIVE']
        : ['ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'EXPIRED'];
  const reasonRequired = decision === 'REJECTED' || view === 'businesses';
  return (
    <>
      {notice && <p role="status">{notice}</p>}
      {view === 'subscriptions' && (
        <p>
          Thanh toán trực tuyến chưa được kết nối. Dữ liệu phản ánh gói và lịch sử được lưu; không
          xác nhận giao dịch mới.
        </p>
      )}
      <SectionCard title="Tra cứu">
        <div className="admin-filters">
          <SearchInput
            value={q}
            onChange={(v) => filter(setQ, v)}
            label={
              view === 'audit-logs'
                ? 'Tìm người thực hiện, mã đối tượng, lý do'
                : view === 'businesses'
                  ? 'Tìm tên doanh nghiệp'
                  : view === 'subscriptions'
                    ? 'Tìm doanh nghiệp hoặc gói dịch vụ'
                    : 'Tìm tên hoặc email'
            }
          />
          {view !== 'audit-logs' && (
            <Select
              label="Trạng thái"
              value={status}
              onChange={(e) => filter(setStatus, e.target.value)}
            >
              <option value="">Tất cả</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {labels[s]}
                </option>
              ))}
            </Select>
          )}
          {view === 'businesses' && (
            <Select
              label="Hoạt động"
              value={operation}
              onChange={(e) => filter(setOperation, e.target.value)}
            >
              <option value="">Tất cả</option>
              {['ACTIVE', 'SUSPENDED'].map((s) => (
                <option key={s} value={s}>
                  {labels[s]}
                </option>
              ))}
            </Select>
          )}
          {view === 'audit-logs' && (
            <Select
              label="Thao tác"
              value={actionFilter}
              onChange={(e) => filter(setActionFilter, e.target.value)}
            >
              <option value="">Tất cả</option>
              {[
                'APPLICATION_APPROVED',
                'APPLICATION_REJECTED',
                'BUSINESS_ACTIVE',
                'BUSINESS_SUSPENDED',
                'ADMIN_BOOTSTRAPPED',
              ].map((s) => (
                <option key={s} value={s}>
                  {labels[s]}
                </option>
              ))}
            </Select>
          )}
          {(view === 'audit-logs' || view === 'subscriptions') && (
            <>
              <Input
                type="date"
                label={view === 'subscriptions' ? 'Hết hạn từ ngày' : 'Từ ngày'}
                value={from}
                onChange={(e) => filter(setFrom, e.target.value)}
              />
              <Input
                type="date"
                label={view === 'subscriptions' ? 'Hết hạn đến ngày' : 'Đến ngày'}
                value={to}
                onChange={(e) => filter(setTo, e.target.value)}
              />
            </>
          )}
          <Select label="Sắp xếp" value={sort} onChange={(e) => filter(setSort, e.target.value)}>
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
          </Select>
        </div>
      </SectionCard>
      <SectionCard title={titles[view]}>
        {query.isPending ? (
          <div className="admin-loading">
            <LoadingState />
            <div className="admin-skeleton" aria-hidden="true" />
          </div>
        ) : query.isError ? (
          <ErrorState
            message="Không thể tải dữ liệu. Kiểm tra bộ lọc hoặc thử lại."
            onRetry={() => void query.refetch()}
          />
        ) : (
          <>
            <p>{query.data.total.toLocaleString('vi-VN')} kết quả</p>
            <DataTable
              caption={titles[view]}
              columns={columns}
              rows={query.data.rows}
              rowKey={(r) => r.id}
              emptyMessage="Không có kết quả phù hợp"
            />
            <Pager
              page={page}
              hasNext={page * query.data.pageSize < query.data.total}
              onChange={setPage}
            />
          </>
        )}
      </SectionCard>
      <Modal
        open={!!selected}
        onClose={() => {
          if (!mutation.isPending) setSelected(null);
        }}
        title={decision ? 'Xác nhận thay đổi' : 'Chi tiết'}
        footer={
          decision ? (
            <>
              <Button
                variant="secondary"
                disabled={mutation.isPending}
                onClick={() => setDecision(null)}
              >
                Quay lại
              </Button>
              <Button
                variant={['REJECTED', 'SUSPENDED'].includes(decision) ? 'danger' : 'primary'}
                loading={mutation.isPending}
                disabled={reasonRequired && !reason.trim()}
                onClick={() => mutation.mutate()}
              >
                Xác nhận {labels[decision]?.toLocaleLowerCase('vi-VN')}
              </Button>
            </>
          ) : undefined
        }
      >
        {selected &&
          (decision ? (
            <div className="admin-content">
              <p>
                {labels[decision]}: <strong>{selected.name}</strong>
              </p>
              <p>Thao tác sẽ được ghi vào nhật ký quản trị.</p>
              <Input
                label={reasonRequired ? 'Lý do (bắt buộc)' : 'Ghi chú (tùy chọn)'}
                value={reason}
                maxLength={1000}
                required={reasonRequired}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          ) : (
            <div className="admin-content">
              <h3>{selected.name ?? selected.fullName ?? labels[selected.action ?? '']}</h3>
              <dl className="admin-details">
                {Object.entries({
                  Mã: selected.id,
                  'Tên đăng nhập': selected.username,
                  Email: selected.email ?? selected.ownerEmail,
                  'Chủ doanh nghiệp': selected.ownerName,
                  'Điện thoại': selected.contactPhone ?? selected.profile?.contactPhone,
                  'Địa chỉ': selected.address ?? selected.profile?.address,
                  'Email liên hệ': selected.profile?.contactEmail,
                  'Ngày tạo': selected.createdAt ? date(selected.createdAt) : null,
                  'Ngày gửi': selected.submittedAt ? date(selected.submittedAt) : null,
                  'Ngày xét duyệt': selected.reviewedAt ? date(selected.reviewedAt) : null,
                  'Người xét duyệt': selected.reviewerId,
                  'Lý do xét duyệt': selected.reviewReason,
                  'Gói dịch vụ': selected.plan ?? selected.subscription?.plan,
                  'Bắt đầu':
                    selected.startedAt || selected.subscription?.startedAt
                      ? date(selected.startedAt ?? selected.subscription?.startedAt)
                      : null,
                  'Hết hạn':
                    selected.periodEndsAt || selected.subscription?.periodEndsAt
                      ? date(selected.periodEndsAt ?? selected.subscription?.periodEndsAt)
                      : null,
                  'Người thực hiện': selected.actorName ?? selected.actorId,
                  'Đối tượng': selected.entityId,
                  'Mã tương quan': selected.correlationId,
                  'Lý do': selected.reason,
                })
                  .filter(([, value]) => value != null)
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
              </dl>
              {(selected.status || selected.approvalStatus) && (
                <StateBadge value={selected.approvalStatus ?? selected.status} />
              )}
              {selected.subscription && (
                <p>
                  Gói dịch vụ: <StateBadge value={selected.subscription.status} />
                </p>
              )}
              {selected.owners?.map((owner) => (
                <p key={owner.id}>
                  {owner.fullName} · {owner.email} ·{' '}
                  {owner.isActive ? 'Thành viên đang hoạt động' : 'Thành viên không hoạt động'}
                </p>
              ))}
              {selected.businesses?.map((b) => (
                <SectionCard key={b.businessId} title={b.name}>
                  {b.role && (
                    <p>
                      {roleLabels[b.role]}
                      {b.branchName ? ` · ${b.branchName}` : ''}
                    </p>
                  )}
                  <p>{b.isActive ? 'Thành viên đang hoạt động' : 'Thành viên không hoạt động'}</p>
                  <StateBadge value={b.approvalStatus} /> <StateBadge value={b.operationalStatus} />
                </SectionCard>
              ))}
              {businessId &&
                (history.isPending ? (
                  <LoadingState />
                ) : history.isError ? (
                  <ErrorState onRetry={() => void history.refetch()} />
                ) : (
                  history.data && (
                    <>
                      {history.data.application && (
                        <SectionCard title="Hồ sơ xét duyệt">
                          <StateBadge value={history.data.application.status} />
                          <p>
                            {history.data.application.address} ·{' '}
                            {history.data.application.contactPhone}
                          </p>
                          <p>
                            Gửi: {date(history.data.application.submittedAt)} · Xét duyệt:{' '}
                            {date(history.data.application.reviewedAt)}
                          </p>
                          <p>{history.data.application.reviewReason}</p>
                        </SectionCard>
                      )}
                      <DataTable
                        caption="Lịch sử quản trị"
                        columns={eventColumns}
                        rows={history.data.events.slice(0, 20)}
                        rowKey={(r) => r.id}
                        emptyMessage="Chưa có lịch sử quản trị"
                      />
                      {view === 'subscriptions' && (
                        <DataTable
                          caption="Lịch sử thanh toán"
                          columns={[
                            { key: 'date', header: 'Ngày', render: (r) => date(r.createdAt) },
                            {
                              key: 'amount',
                              header: 'Số tiền',
                              render: (r) => formatCurrency(r.amountVnd),
                            },
                            {
                              key: 'status',
                              header: 'Trạng thái',
                              render: (r) => <StateBadge value={r.status} />,
                            },
                          ]}
                          rows={history.data.billing.slice(0, 20)}
                          rowKey={(r) => r.id}
                          emptyMessage="Chưa có lịch sử thanh toán"
                        />
                      )}
                      <Pager
                        page={historyPage}
                        hasNext={
                          history.data.events.length > 20 ||
                          (view === 'subscriptions' && history.data.billing.length > 20)
                        }
                        onChange={setHistoryPage}
                      />
                    </>
                  )
                ))}
              {view === 'approvals' && selected.status === 'PENDING' && (
                <div className="page-actions">
                  <Button onClick={() => setDecision('APPROVED')}>Phê duyệt</Button>
                  <Button variant="danger" onClick={() => setDecision('REJECTED')}>
                    Từ chối
                  </Button>
                </div>
              )}
              {view === 'businesses' && selected.approvalStatus === 'APPROVED' && (
                <Button
                  variant={selected.operationalStatus === 'SUSPENDED' ? 'primary' : 'danger'}
                  onClick={() =>
                    setDecision(selected.operationalStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED')
                  }
                >
                  {selected.operationalStatus === 'SUSPENDED'
                    ? 'Kích hoạt lại doanh nghiệp'
                    : 'Tạm ngưng doanh nghiệp'}
                </Button>
              )}
            </div>
          ))}
        {mutation.isError && (
          <ErrorState
            message={
              isAxiosError(mutation.error)
                ? mutation.error.response?.data?.message
                : 'Không thể lưu thay đổi.'
            }
          />
        )}
      </Modal>
    </>
  );
}
