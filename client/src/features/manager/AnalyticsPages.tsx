import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  ArrowDownToLine,
  CookingPot,
  Users,
  Download,
  TriangleAlert,
  ArrowUpRight,
} from 'lucide-react';
import {
  StatCard,
  SectionCard,
  StatusBadge,
  ChartCard,
  EmptyState,
} from '@/components/common/Foundation';
import { DataTable } from '@/components/common/DataTable';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { inventoryStatus, alertLabels } from './model';
import { RevenueChart, HourChart } from './Charts';
import { downloadDemoCsv } from './export';
import type { ManagerData } from './types';
function BestSellers({ data }: { data: ManagerData }) {
  return (
    <DataTable
      caption="Món bán chạy hôm nay"
      rows={data.bestSellers}
      rowKey={(row) => row.recipeId}
      columns={[
        {
          key: 'name',
          header: 'Tên món',
          render: (row) =>
            data.recipes.find((recipe) => recipe.id === row.recipeId)?.name ?? 'Chưa xác định',
        },
        {
          key: 'quantity',
          header: 'Đã bán',
          numeric: true,
          render: (row) => formatNumber(row.quantity),
        },
      ]}
    />
  );
}
export function Dashboard({ data }: { data: ManagerData }) {
  const today = data.days.find((day) => formatDate(day.date) === formatDate(data.asOf));
  if (!today) return <EmptyState title="Chưa có dữ liệu tổng quan hôm nay" />;
  const low = data.ingredients.filter((item) => item.stock < item.minimum).length;
  const nearExpiry = data.ingredients.filter(
    (item) => inventoryStatus(item, data.asOf) === 'NEAR_EXPIRY',
  ).length;
  return (
    <>
      <div className="manager-kpis">
        <StatCard
          label="Doanh thu hôm nay"
          value={formatCurrency(today.revenue)}
          detail="Đến 11:00 · Số liệu minh họa"
        />
        <StatCard
          label="Tổng đơn hàng"
          value={formatNumber(today.orders)}
          detail="Đơn đã thanh toán hôm nay"
        />
        <StatCard
          label="Nguyên liệu sắp hết"
          value={formatNumber(low)}
          detail="Bao gồm nguyên liệu hết hàng"
        />
        <StatCard
          label="Nguyên liệu sắp hết hạn"
          value={formatNumber(nearExpiry)}
          detail="Trong 3 ngày tới"
        />
      </div>
      <div className="manager-chart-grid">
        <RevenueChart title="Doanh thu & đơn hàng trong tuần" days={data.days} />
        <HourChart title="Giờ bán cao điểm hôm nay" hours={data.hours} />
      </div>
      <SectionCard title="Thao tác nhanh">
        <div className="manager-shortcuts">
          {[
            { path: '/app/pos', title: 'Bán hàng', Icon: ShoppingCart },
            { path: '/app/stock-transactions', title: 'Nhập kho', Icon: ArrowDownToLine },
            { path: '/app/recipes', title: 'Công thức', Icon: CookingPot },
            { path: '/app/staff', title: 'Nhân viên', Icon: Users },
          ].map(({ path, title, Icon }) => (
            <Link key={path} to={path}>
              <Icon size={23} aria-hidden="true" />
              <span>{title}</span>
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </SectionCard>
      <div className="manager-bottom-grid">
        <SectionCard title="Cảnh báo tồn kho" actions={<Link to="/app/alerts">Xem tất cả</Link>}>
          <div className="manager-alert-list">
            {!data.alerts.some((alert) => alert.status !== 'RESOLVED') && (
              <EmptyState title="Không có cảnh báo cần xử lý" />
            )}
            {data.alerts
              .filter((alert) => alert.status !== 'RESOLVED')
              .map((alert) => (
                <div key={alert.id}>
                  <TriangleAlert size={19} aria-hidden="true" />
                  <div>
                    <strong>{alert.title}</strong>
                    <span>{alertLabels[alert.category]}</span>
                  </div>
                  <StatusBadge status={alert.status} />
                </div>
              ))}
          </div>
        </SectionCard>
        <SectionCard title="Món bán chạy hôm nay">
          <BestSellers data={data} />
        </SectionCard>
      </div>
    </>
  );
}
export function Reports({ data }: { data: ManagerData }) {
  const [period, setPeriod] = useState('7');
  const [notice, setNotice] = useState('');
  const days = data.days.slice(-Number(period));
  if (!days.length) return <EmptyState title="Chưa có dữ liệu báo cáo" />;
  const totals = days.reduce(
    (sum, day) => ({
      revenue: sum.revenue + day.revenue,
      orders: sum.orders + day.orders,
      cost: sum.cost + day.foodCost,
    }),
    { revenue: 0, orders: 0, cost: 0 },
  );
  return (
    <>
      <div className="manager-toolbar">
        <label className="manager-field">
          Khoảng thời gian
          <select
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value);
              setNotice('');
            }}
          >
            <option value="7">7 ngày gần nhất</option>
            <option value="3">3 ngày gần nhất</option>
            <option value="1">Hôm nay</option>
          </select>
        </label>
        <span className="manager-muted">
          {formatDate(days[0].date)} – {formatDate(days.at(-1)!.date)}
        </span>
        <button
          className="button button-secondary"
          onClick={() => {
            downloadDemoCsv('nextvn-bao-cao-minh-hoa.csv', [
              ['BÁO CÁO MINH HỌA — KHÔNG PHẢI SỐ LIỆU THỰC'],
              ['Ngày', 'Doanh thu', 'Đơn hàng', 'Chi phí nguyên liệu'],
              ...days.map((day) => [formatDate(day.date), day.revenue, day.orders, day.foodCost]),
            ]);
            setNotice('Đã tạo tệp CSV từ dữ liệu minh họa đang hiển thị.');
          }}
        >
          <Download size={17} aria-hidden="true" />
          Xuất báo cáo
        </button>
      </div>
      {notice && (
        <p role="status" className="manager-notice">
          {notice}
        </p>
      )}
      <div className="manager-kpis">
        <StatCard
          label={period === '7' ? 'Doanh thu tuần' : 'Doanh thu trong khoảng chọn'}
          value={formatCurrency(totals.revenue)}
        />
        <StatCard label="Tổng đơn hàng" value={formatNumber(totals.orders)} />
        <StatCard
          label="Giá trị đơn trung bình"
          value={formatCurrency(totals.orders ? Math.round(totals.revenue / totals.orders) : 0)}
        />
        <StatCard
          label="Lợi nhuận gộp"
          value={formatCurrency(totals.revenue - totals.cost)}
          detail="Doanh thu trừ chi phí nguyên liệu; chưa trừ chi phí vận hành"
        />
      </div>
      <div className="manager-report-grid">
        <RevenueChart title="Doanh thu theo ngày" days={days} mode="revenue" />
        <RevenueChart title="Doanh thu so với chi phí nguyên liệu" days={days} mode="cost" />
        <HourChart title="Doanh số theo giờ" hours={data.hours} revenue />
        <ChartCard
          title="Món bán chạy"
          description="Số lượng bán minh họa hôm nay, ngày 20/10/2026; không phải tổng cả tuần."
        >
          <BestSellers data={data} />
        </ChartCard>
      </div>
    </>
  );
}
