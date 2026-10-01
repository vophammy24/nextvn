import { AnalyticsChart, type ChartSeries } from '@/components/common/AnalyticsChart';
import { formatDate } from '@/lib/format';
import type { RevenueDay, HourSales } from './types';
export function RevenueChart({
  title,
  days,
  mode = 'orders',
}: {
  title: string;
  days: RevenueDay[];
  mode?: 'orders' | 'cost' | 'revenue';
}) {
  const series: ChartSeries[] = [
    { key: 'revenue', name: 'Doanh thu', color: '#208778', money: true },
  ];
  if (mode === 'orders')
    series.push({ key: 'orders', name: 'Đơn hàng', color: '#3268d0', line: true, secondary: true });
  if (mode === 'cost')
    series.push({ key: 'foodCost', name: 'Chi phí nguyên liệu', color: '#b88319', money: true });
  return (
    <AnalyticsChart
      title={title}
      description="Số liệu minh họa; doanh thu và chi phí tính bằng đồng Việt Nam."
      rows={days.map((day) => ({ ...day, label: formatDate(day.date).slice(0, 5) }))}
      series={series}
    />
  );
}
export function HourChart({
  title,
  hours,
  revenue = false,
}: {
  title: string;
  hours: HourSales[];
  revenue?: boolean;
}) {
  return (
    <AnalyticsChart
      title={title}
      description="Minh họa ngày 20/10/2026, dữ liệu đến 11:00; không suy rộng cho cả tuần."
      rows={hours.map((hour) => ({
        ...hour,
        label: hour.hour,
        value: revenue ? hour.revenue : hour.orders,
      }))}
      money={revenue}
      measure={revenue ? 'Doanh số' : 'Đơn hàng'}
    />
  );
}
