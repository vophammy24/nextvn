import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartCard, EmptyState } from './Foundation';
import { DataTable } from './DataTable';
import { formatCurrency, formatNumber } from '@/lib/format';
export interface ChartRow {
  label: string;
  [key: string]: string | number;
}
export interface ChartSeries {
  key: string;
  name: string;
  color: string;
  line?: boolean;
  money?: boolean;
  secondary?: boolean;
}
export function AnalyticsChart({
  title,
  description,
  rows,
  measure = 'Doanh thu',
  money = true,
  line = false,
  series,
}: {
  title: string;
  description: string;
  rows: ChartRow[];
  measure?: string;
  money?: boolean;
  line?: boolean;
  series?: ChartSeries[];
}) {
  const metrics = series ?? [
    { key: 'value', name: measure, color: line ? '#3268d0' : '#208778', line, money },
  ];
  const format = (value: number, metric: ChartSeries) =>
    metric.money ? formatCurrency(value) : formatNumber(value);
  return (
    <ChartCard title={title} description={description}>
      {rows.length ? (
        <>
          <ResponsiveContainer
            width="100%"
            height={250}
            minWidth={0}
            initialDimension={{ width: 500, height: 250 }}
          >
            <ComposedChart
              data={rows}
              accessibilityLayer
              margin={{ left: 0, right: 15, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis
                yAxisId="primary"
                width={65}
                tick={{ fontSize: 11 }}
                tickFormatter={(value: number) =>
                  metrics[0].money ? `${formatNumber(value / 1000000)} tr` : formatNumber(value)
                }
              />
              {metrics.some((metric) => metric.secondary) && (
                <YAxis
                  yAxisId="secondary"
                  orientation="right"
                  width={35}
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                />
              )}
              <Tooltip
                formatter={(value, name) => {
                  const metric = metrics.find((item) => item.name === name);
                  return typeof value === 'number' && metric ? format(value, metric) : '—';
                }}
              />
              {metrics.length > 1 && (
                <Legend
                  formatter={(value) => <span className="chart-legend-label">{value}</span>}
                />
              )}
              {metrics.map((metric) =>
                metric.line ? (
                  <Line
                    key={metric.key}
                    yAxisId={metric.secondary ? 'secondary' : 'primary'}
                    dataKey={metric.key}
                    name={metric.name}
                    stroke={metric.color}
                    strokeWidth={2}
                    dot={rows.length < 10}
                    isAnimationActive={false}
                  />
                ) : (
                  <Bar
                    key={metric.key}
                    yAxisId={metric.secondary ? 'secondary' : 'primary'}
                    dataKey={metric.key}
                    name={metric.name}
                    fill={metric.color}
                    radius={[5, 5, 0, 0]}
                    isAnimationActive={false}
                  />
                ),
              )}
            </ComposedChart>
          </ResponsiveContainer>
          <details className="analytics-chart-data">
            <summary>Xem dữ liệu biểu đồ</summary>
            <DataTable
              caption={title}
              rows={rows}
              rowKey={(row) => row.label}
              columns={[
                { key: 'label', header: 'Nhóm', render: (row) => row.label },
                ...metrics.map((metric) => ({
                  key: metric.key,
                  header: metric.name,
                  numeric: true,
                  render: (row: ChartRow) => format(Number(row[metric.key]), metric),
                })),
              ]}
            />
          </details>
        </>
      ) : (
        <EmptyState title="Chưa có dữ liệu biểu đồ" />
      )}
    </ChartCard>
  );
}
