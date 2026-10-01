import { useState, type FormEvent } from 'react';
import { Building2, MapPin, Plus, ArrowUpRight, Tag, CreditCard } from 'lucide-react';
import { SectionCard, StatusBadge, StatCard, EmptyState } from '@/components/common/Foundation';
import { DataTable } from '@/components/common/DataTable';
import { AnalyticsChart } from '@/components/common/AnalyticsChart';
import { formatCurrency, formatNumber, formatDate } from '@/lib/format';
import { branchSchema, groupedRevenue, periodSales, totals } from './model';
import type { OwnerData } from './types';

export function Branches({ data }: { data: OwnerData }) {
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [notice, setNotice] = useState('');
  const sales = periodSales(data, 'month');
  const branch = data.branches.find((item) => item.id === selected);
  const branchSales = sales.filter((sale) => sale.branchId === selected);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = branchSchema.safeParse({ name, location });
    setNotice(
      result.success
        ? 'Thêm chi nhánh chưa khả dụng. Chưa tạo chi nhánh hoặc thay đổi gói dịch vụ.'
        : result.error.issues[0].message,
    );
  };
  return (
    <>
      <div className="owner-scope">
        <span>{data.branches.length} chi nhánh · Tháng 09/2026</span>
        <button
          className="button"
          onClick={() => {
            setAdding(!adding);
            setNotice('');
          }}
        >
          <Plus size={17} aria-hidden="true" />
          Thêm chi nhánh
        </button>
      </div>
      {adding && (
        <SectionCard title="Thông tin chi nhánh mới">
          <form className="owner-form" onSubmit={submit} noValidate>
            <label>
              Tên chi nhánh
              <input value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <label>
              Địa điểm
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                required
              />
            </label>
            <div className="owner-form-actions">
              <button className="button" type="submit">
                Lưu chi nhánh
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setAdding(false)}
              >
                Hủy
              </button>
            </div>
            {notice && (
              <p className="owner-notice owner-full" role="alert">
                {notice}
              </p>
            )}
          </form>
        </SectionCard>
      )}
      <div className="owner-cards">
        {data.branches.map((item) => {
          const metrics = totals(
            data,
            sales.filter((sale) => sale.branchId === item.id),
          );
          const alerts = data.stock.filter(
            (stock) => stock.branchId === item.id && stock.status !== 'IN_STOCK',
          ).length;
          return (
            <article className="owner-branch" key={item.id}>
              <div className="owner-card-top">
                <Building2 aria-hidden="true" />
                <StatusBadge status={item.status} />
              </div>
              <h2>{item.name}</h2>
              <p className="owner-location">
                <MapPin size={15} aria-hidden="true" />
                {item.location}
              </p>
              <dl>
                <div>
                  <dt>Doanh thu</dt>
                  <dd>{formatCurrency(metrics.revenue)}</dd>
                </div>
                <div>
                  <dt>Đơn hàng</dt>
                  <dd>{formatNumber(metrics.orders)}</dd>
                </div>
                <div>
                  <dt>Quản lý</dt>
                  <dd>{item.manager}</dd>
                </div>
                <div>
                  <dt>Cảnh báo</dt>
                  <dd>{alerts} mục cần chú ý</dd>
                </div>
              </dl>
              <button
                className="button button-secondary"
                aria-label={`Xem tổng quan chi nhánh: ${item.name}`}
                aria-expanded={selected === item.id}
                aria-controls="owner-branch-detail"
                onClick={() => setSelected(selected === item.id ? '' : item.id)}
              >
                Xem tổng quan chi nhánh
                <ArrowUpRight size={16} aria-hidden="true" />
              </button>
            </article>
          );
        })}
      </div>
      {branch && (
        <div id="owner-branch-detail">
          <SectionCard
            title={`Tổng quan: ${branch.name}`}
            actions={
              <button className="owner-link" onClick={() => setSelected('')}>
                Đóng chi tiết
              </button>
            }
          >
            <div className="owner-kpis owner-kpis-three">
              <StatCard
                label="Doanh thu chi nhánh"
                value={formatCurrency(totals(data, branchSales).revenue)}
              />
              <StatCard
                label="Đơn hàng chi nhánh"
                value={formatNumber(totals(data, branchSales).orders)}
              />
              <StatCard
                label="Lợi nhuận gộp chi nhánh"
                value={formatCurrency(
                  totals(data, branchSales).revenue - totals(data, branchSales).cost,
                )}
              />
            </div>
            <p className="owner-muted">Tháng 09/2026 · Chỉ xem phân tích chi nhánh đã chọn.</p>
            <DataTable
              caption={`Cảnh báo của ${branch.name}`}
              rows={data.stock.filter(
                (stock) => stock.branchId === branch.id && stock.status !== 'IN_STOCK',
              )}
              rowKey={(row) => row.id}
              columns={[
                { key: 'ingredient', header: 'Nguyên liệu', render: (row) => row.name },
                {
                  key: 'status',
                  header: 'Trạng thái',
                  render: (row) => <StatusBadge status={row.status} />,
                },
              ]}
            />
          </SectionCard>
        </div>
      )}
      <AnalyticsChart
        title="So sánh doanh thu chi nhánh"
        description="Cùng kỳ tháng 09/2026 · dữ liệu minh họa."
        rows={groupedRevenue(data, sales, 'branch')}
      />
    </>
  );
}
export function Promotions({ data }: { data: OwnerData }) {
  const [notice, setNotice] = useState('');
  return (
    <>
      <div className="owner-notice">
        <strong>Gợi ý kinh doanh theo quy tắc và kịch bản minh họa</strong>
        <p>
          Chưa có mô hình dự báo hoặc dịch vụ tạo khuyến mãi. Lợi ích mô tả là khả năng cần kiểm
          chứng, không phải cam kết kết quả.
        </p>
      </div>
      {notice && (
        <p className="owner-notice" role="status">
          {notice}
        </p>
      )}
      <div className="owner-promotion-grid">
        {data.promotions.map((item) => (
          <article className="owner-promotion" key={item.id}>
            <div className="owner-card-top">
              <Tag aria-hidden="true" />
              <span className={`badge badge-${item.priority === 'Cao' ? 'warning' : 'info'}`}>
                Ưu tiên {item.priority.toLocaleLowerCase('vi-VN')}
              </span>
            </div>
            <h2>{item.title}</h2>
            <dl>
              <div>
                <dt>Nguyên nhân</dt>
                <dd>{item.reason}</dd>
              </div>
              <div>
                <dt>Món liên quan</dt>
                <dd>{item.items}</dd>
              </div>
              <div>
                <dt>Lợi ích dự kiến</dt>
                <dd>{item.benefit}</dd>
              </div>
              <div>
                <dt>Gợi ý hành động</dt>
                <dd>{item.action}</dd>
              </div>
            </dl>
            <button
              className="button button-secondary"
              aria-label={`Áp dụng khuyến mãi: ${item.title}`}
              onClick={() =>
                setNotice(`Áp dụng khuyến mãi chưa khả dụng. Chưa tạo khuyến mãi “${item.title}”.`)
              }
            >
              Áp dụng khuyến mãi
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
export function Subscription({ data }: { data: OwnerData }) {
  const [notice, setNotice] = useState('');
  const subscription = data.subscription;
  const plan = subscription.plans.find((item) => item.id === subscription.planId);
  if (!plan) return <EmptyState title="Chưa có thông tin gói dịch vụ" />;
  const activeUsers = data.users.filter((user) => user.status === 'ACTIVE').length;
  return (
    <>
      <p className="owner-notice">
        Gói dịch vụ, giá và lịch sử thanh toán dưới đây chỉ là minh họa, không phải bảng giá hoặc
        hóa đơn chính thức. Chưa kết nối cổng thanh toán.
      </p>
      {notice && (
        <p role="status" className="owner-notice">
          {notice}
        </p>
      )}
      <div className="owner-chart-grid">
        <SectionCard title="Gói hiện tại">
          <div className="owner-current-plan">
            <CreditCard size={30} aria-hidden="true" />
            <div>
              <h3>{plan.name}</h3>
              <strong>{formatCurrency(plan.monthlyPrice)} / tháng</strong>
              <p>Kỳ tiếp theo (minh họa): {formatDate(subscription.renewal)}</p>
              <span className="badge badge-info">Gói minh họa</span>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Mức sử dụng">
          <div className="owner-usage">
            <label>
              Chi nhánh{' '}
              <strong>
                {data.branches.length} / {plan.branches}
              </strong>
              <progress value={data.branches.length} max={plan.branches} />
            </label>
            <label>
              Người dùng đang hoạt động{' '}
              <strong>
                {activeUsers} / {plan.users}
              </strong>
              <progress value={activeUsers} max={plan.users} />
            </label>
          </div>
        </SectionCard>
      </div>
      <SectionCard title="Các gói dịch vụ">
        <div className="owner-plans">
          {subscription.plans.map((item) => (
            <article key={item.id} className={item.id === plan.id ? 'is-current' : ''}>
              <h3>{item.name}</h3>
              <p className="owner-price">
                {formatCurrency(item.monthlyPrice)}
                <small> / tháng · giá minh họa</small>
              </p>
              <p>
                {item.branches} chi nhánh · {item.users} người dùng
              </p>
              <ul>
                {item.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <button
                className={`button ${item.id === plan.id ? 'button-secondary' : ''}`}
                disabled={item.id === plan.id}
                onClick={() =>
                  setNotice(
                    `Thay đổi sang gói ${item.name} chưa khả dụng. Chưa tạo yêu cầu thanh toán hoặc thay đổi gói.`,
                  )
                }
              >
                {item.id === plan.id ? 'Gói hiện tại' : `Chọn gói ${item.name}`}
              </button>
            </article>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Lịch sử thanh toán">
        <DataTable
          caption="Lịch sử thanh toán minh họa"
          rows={subscription.invoices}
          rowKey={(row) => row.id}
          columns={[
            { key: 'id', header: 'Mã hóa đơn', render: (row) => row.id },
            { key: 'date', header: 'Ngày', render: (row) => formatDate(row.date) },
            {
              key: 'amount',
              header: 'Số tiền',
              numeric: true,
              render: (row) => formatCurrency(row.amount),
            },
            {
              key: 'status',
              header: 'Trạng thái minh họa',
              render: (row) => <StatusBadge status={row.status} />,
            },
          ]}
        />
      </SectionCard>
    </>
  );
}
