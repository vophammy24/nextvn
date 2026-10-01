import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Lightbulb } from 'lucide-react';
import {
  StatCard,
  SectionCard,
  FilterTabs,
  StatusBadge,
  EmptyState,
} from '@/components/common/Foundation';
import { DataTable } from '@/components/common/DataTable';
import { AnalyticsChart } from '@/components/common/AnalyticsChart';
import { formatCurrency, formatNumber, formatDate } from '@/lib/format';
import { copy } from '@/locales/vi';
import { groupedRevenue, menuMetrics, periodLabels, periodSales, totals } from './model';
import type { OwnerData, Period } from './types';

function SalesStats({
  data,
  period,
  bestHour = false,
}: {
  data: OwnerData;
  period: Period;
  bestHour?: boolean;
}) {
  const sales = periodSales(data, period);
  const result = totals(data, sales);
  const peak = groupedRevenue(data, sales, 'hour').sort((a, b) => b.value - a.value)[0];
  return (
    <div className="owner-kpis">
      <StatCard
        label="Tổng doanh thu"
        value={formatCurrency(result.revenue)}
        detail="Toàn doanh nghiệp · dữ liệu minh họa"
      />
      <StatCard
        label={bestHour ? 'Khung giờ tốt nhất' : 'Lợi nhuận gộp'}
        value={
          bestHour
            ? (peak?.label ?? 'Chưa có dữ liệu')
            : formatCurrency(result.revenue - result.cost)
        }
        detail={bestHour ? 'Theo doanh thu trong kỳ' : 'Doanh thu trừ chi phí nguyên liệu'}
      />
      <StatCard
        label="Giá trị đơn trung bình"
        value={formatCurrency(result.orders ? result.revenue / result.orders : 0)}
      />
      <StatCard
        label="Tổng đơn hàng"
        value={formatNumber(result.orders)}
        detail="Đơn đã thanh toán trong kỳ"
      />
    </div>
  );
}
export function Overview({ data }: { data: OwnerData }) {
  const sales = periodSales(data, 'quarter');
  if (!sales.length) return <EmptyState title="Chưa có dữ liệu tổng quan doanh nghiệp" />;
  const leaders = menuMetrics(data, sales).sort((a, b) => b.margin - a.margin);
  const topBranch = groupedRevenue(data, sales, 'branch').sort((a, b) => b.value - a.value)[0];
  return (
    <>
      <div className="owner-scope">
        <span>Quý III / 2026 · Tất cả chi nhánh</span>
        <Link to="/app/owner/revenue">
          Xem phân tích doanh thu <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <SalesStats data={data} period="quarter" />
      <div className="owner-chart-grid">
        <AnalyticsChart
          title="Xu hướng doanh thu theo tháng"
          description="Tổng doanh thu từng tháng trong quý III/2026 · minh họa."
          rows={groupedRevenue(data, sales, 'month').map((row) => ({
            ...row,
            label: `Tháng ${Number(row.label.slice(5))}`,
          }))}
          line
        />
        <AnalyticsChart
          title="Doanh thu theo danh mục"
          description="Tổng hợp các chi nhánh trong cùng quý."
          rows={groupedRevenue(data, sales, 'category')}
        />
      </div>
      <div className="owner-chart-grid">
        <AnalyticsChart
          title="Giờ bán cao điểm"
          description="Doanh thu theo giờ, tổng hợp toàn quý III/2026; không phải lượng khách hiện tại."
          rows={groupedRevenue(data, sales, 'hour')}
        />
        <SectionCard title="Thông tin kinh doanh đáng chú ý">
          <div className="owner-insights">
            <article>
              <Lightbulb aria-hidden="true" />
              <div>
                <h3>{topBranch?.label}</h3>
                <p>
                  Dẫn đầu doanh thu trong dữ liệu mẫu quý này:{' '}
                  {formatCurrency(topBranch?.value ?? 0)}.
                </p>
              </div>
            </article>
            <article>
              <Lightbulb aria-hidden="true" />
              <div>
                <h3>{leaders[0]?.name}</h3>
                <p>
                  Biên lợi nhuận nguyên liệu cao nhất: {formatNumber(leaders[0]?.margin ?? 0)}%. Cần
                  tính thêm chi phí vận hành trước khi quyết định.
                </p>
              </div>
            </article>
            <p className="owner-muted">
              Thông tin tính từ số liệu minh họa theo quy tắc; không phải dự báo.
            </p>
            <Link to="/app/owner/promotions">Xem gợi ý kinh doanh</Link>
          </div>
        </SectionCard>
      </div>
      <SectionCard title="Món có lợi nhuận cao">
        <DataTable
          caption="Món có biên lợi nhuận cao trong quý"
          rows={leaders.filter((item) => item.margin >= 65)}
          rowKey={(row) => row.id}
          columns={[
            { key: 'name', header: 'Món', render: (row) => row.name },
            {
              key: 'sold',
              header: 'Số lượng bán',
              numeric: true,
              render: (row) => formatNumber(row.quantity),
            },
            {
              key: 'profit',
              header: 'Lợi nhuận gộp',
              numeric: true,
              render: (row) => formatCurrency(row.profit),
            },
            {
              key: 'margin',
              header: 'Biên lợi nhuận',
              numeric: true,
              render: (row) => `${formatNumber(row.margin)}%`,
            },
          ]}
        />
      </SectionCard>
    </>
  );
}
export function Revenue({ data }: { data: OwnerData }) {
  const [period, setPeriod] = useState<Period>('month');
  const sales = periodSales(data, period);
  const items = menuMetrics(data, sales);
  return (
    <>
      <div className="owner-scope">
        <FilterTabs
          label="Khoảng thời gian doanh thu"
          items={Object.entries(periodLabels).map(([value, label]) => ({ value, label }))}
          value={period}
          onChange={(value) => setPeriod(value as Period)}
        />
        <span>
          {period === 'week'
            ? '24–30/09/2026'
            : period === 'month'
              ? 'Tháng 09/2026'
              : 'Quý III/2026'}{' '}
          · Tất cả chi nhánh
        </span>
      </div>
      <SalesStats data={data} period={period} bestHour />
      <div className="owner-chart-grid">
        <AnalyticsChart
          title="Xu hướng doanh thu"
          description="Số liệu minh họa theo khoảng thời gian đã chọn."
          rows={groupedRevenue(data, sales, period === 'quarter' ? 'month' : 'date').map((row) => ({
            ...row,
            label:
              period === 'quarter'
                ? `Tháng ${Number(row.label.slice(5))}`
                : formatDate(row.label).slice(0, 5),
          }))}
          line
        />
        <AnalyticsChart
          title="Hiệu quả theo danh mục"
          description="Doanh thu từng danh mục trong kỳ đã chọn."
          rows={groupedRevenue(data, sales, 'category')}
        />
      </div>
      <SectionCard title="Món bán chạy">
        <DataTable
          caption="Doanh số món trong kỳ đã chọn"
          rows={[...items].sort((a, b) => b.quantity - a.quantity)}
          rowKey={(row) => row.id}
          columns={[
            { key: 'name', header: 'Món', render: (row) => row.name },
            { key: 'category', header: 'Danh mục', render: (row) => row.category },
            {
              key: 'sold',
              header: 'Số lượng bán',
              numeric: true,
              render: (row) => formatNumber(row.quantity),
            },
            {
              key: 'revenue',
              header: 'Doanh thu',
              numeric: true,
              render: (row) => formatCurrency(row.revenue),
            },
          ]}
        />
      </SectionCard>
    </>
  );
}
export function MenuProfit({ data }: { data: OwnerData }) {
  const rows = menuMetrics(data, periodSales(data, 'month'));
  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const profit = rows.reduce((sum, row) => sum + row.profit, 0);
  return (
    <>
      <p className="owner-muted">
        Tháng 09/2026 · Toàn doanh nghiệp · Lợi nhuận gộp chưa trừ chi phí vận hành.
      </p>
      <div className="owner-kpis">
        <StatCard
          label="Biên lợi nhuận trung bình"
          value={`${formatNumber(revenue ? (profit / revenue) * 100 : 0)}%`}
          detail="Bình quân theo doanh thu"
        />
        <StatCard label="Tổng lợi nhuận gộp" value={formatCurrency(profit)} />
        <StatCard
          label="Món nên đẩy bán"
          value={rows.filter((row) => row.recommendation === 'Đẩy bán').length}
          detail="Biên lợi nhuận từ 65%"
        />
        <StatCard
          label="Món cần tối ưu"
          value={rows.filter((row) => row.quantity > 0 && row.margin < 65).length}
          detail="Xem lại công thức hoặc giá bán"
        />
      </div>
      <SectionCard title="Hiệu quả lợi nhuận từng món">
        <DataTable
          caption="Phân tích lợi nhuận món toàn doanh nghiệp"
          rows={rows}
          rowKey={(row) => row.id}
          columns={[
            { key: 'name', header: 'Món', render: (row) => row.name },
            {
              key: 'quantity',
              header: 'Số lượng bán',
              numeric: true,
              render: (row) => formatNumber(row.quantity),
            },
            {
              key: 'revenue',
              header: 'Doanh thu',
              numeric: true,
              render: (row) => formatCurrency(row.revenue),
            },
            {
              key: 'cost',
              header: 'Chi phí nguyên liệu',
              numeric: true,
              render: (row) => formatCurrency(row.foodCost),
            },
            {
              key: 'profit',
              header: 'Lợi nhuận gộp',
              numeric: true,
              render: (row) => formatCurrency(row.profit),
            },
            {
              key: 'margin',
              header: 'Biên lợi nhuận',
              numeric: true,
              render: (row) => `${formatNumber(row.margin)}%`,
            },
            {
              key: 'recommendation',
              header: 'Gợi ý',
              render: (row) => (
                <span className={`badge badge-${row.margin >= 65 ? 'success' : 'warning'}`}>
                  {row.recommendation}
                </span>
              ),
            },
          ]}
        />
        <p className="owner-muted">
          Quy tắc minh họa: từ 65% → đẩy bán; dưới 45% → tối ưu công thức; còn lại → xem xét điều
          chỉnh giá. Cần đánh giá nhu cầu thực tế trước khi áp dụng.
        </p>
      </SectionCard>
    </>
  );
}
export function InventoryOverview({ data }: { data: OwnerData }) {
  const low = data.stock.filter(
    (stock) => stock.status === 'LOW_STOCK' || stock.status === 'OUT_OF_STOCK',
  );
  const expiry = data.stock.filter((stock) => stock.status === 'NEAR_EXPIRY');
  const value = data.stock.reduce((sum, stock) => sum + stock.quantity * stock.unitCost, 0);
  const ingredients = [...new Set(data.stock.map((stock) => stock.ingredientId))];
  const consumption = ingredients.map((id) => {
    const rows = data.stock.filter((stock) => stock.ingredientId === id);
    return {
      label: rows[0].name,
      value: rows.reduce((sum, row) => sum + row.consumed * row.unitCost, 0),
    };
  });
  const statuses = (['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'NEAR_EXPIRY'] as const).map(
    (status) => ({
      label: copy.statuses[status],
      value: data.stock.filter((row) => row.status === status).length,
    }),
  );
  return (
    <>
      <div className="owner-kpis">
        <StatCard
          label="Tổng nguyên liệu"
          value={ingredients.length}
          detail="Không đếm trùng giữa các chi nhánh"
        />
        <StatCard
          label="Sắp hết"
          value={low.length}
          detail="Số mục nguyên liệu–chi nhánh, gồm hết hàng"
        />
        <StatCard
          label="Sắp hết hạn"
          value={expiry.length}
          detail="Số mục hết hạn trong 3 ngày tới"
        />
        <StatCard
          label="Giá trị tồn kho"
          value={formatCurrency(value)}
          detail="Theo đơn giá nguyên liệu minh họa"
        />
      </div>
      <div className="owner-critical" role="note">
        <strong>Cảnh báo cần chú ý · {low.length + expiry.length} mục</strong>
        <p>
          Kiểm tra hàng sắp hết hạn và điều phối nguồn cung tại các chi nhánh. Trang này chỉ tổng
          hợp số liệu, không điều chỉnh tồn kho.
        </p>
      </div>
      <div className="owner-chart-grid">
        <AnalyticsChart
          title="Nguyên liệu tiêu thụ nhiều"
          description="So sánh theo giá trị nguyên liệu tiêu thụ tháng 09/2026 bằng đồng Việt Nam, tính từ lượng dùng và đơn giá minh họa."
          rows={consumption}
          measure="Giá trị tiêu thụ"
        />
        <AnalyticsChart
          title="Phân bố trạng thái tồn kho"
          description="Mỗi mục tương ứng một nguyên liệu tại một chi nhánh; chốt 30/09/2026."
          rows={statuses}
          money={false}
          measure="Số mục"
        />
      </div>
      <SectionCard title="Tồn kho nguyên liệu toàn doanh nghiệp">
        <DataTable
          caption="Tồn kho hợp nhất theo nguyên liệu và chi nhánh"
          rows={data.stock}
          rowKey={(row) => row.id}
          columns={[
            { key: 'ingredient', header: 'Nguyên liệu', render: (row) => row.name },
            {
              key: 'branch',
              header: 'Chi nhánh',
              render: (row) => data.branches.find((branch) => branch.id === row.branchId)?.name,
            },
            {
              key: 'quantity',
              header: 'Tồn hiện tại',
              numeric: true,
              render: (row) => `${formatNumber(row.quantity)} ${row.unit}`,
            },
            {
              key: 'value',
              header: 'Giá trị tồn kho',
              numeric: true,
              render: (row) => formatCurrency(row.quantity * row.unitCost),
            },
            { key: 'expiry', header: 'Hạn sử dụng', render: (row) => formatDate(row.expiry) },
            {
              key: 'status',
              header: 'Trạng thái',
              render: (row) => <StatusBadge status={row.status} />,
            },
          ]}
        />
      </SectionCard>
    </>
  );
}
