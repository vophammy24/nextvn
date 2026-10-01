import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { PageHeader, FilterTabs, SearchInput, StatusBadge } from '@/components/common/Foundation';
import { DataTable } from '@/components/common/DataTable';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { useScopedOrders } from './useScopedOrders';
import { OperationsBoundary } from './data';
import type { Order, OperationsData } from './types';
import { useWorkspace } from '@/features/auth/workspaceContext';

export function OrdersTable({
  orders,
  caption = 'Danh sách đơn hàng',
}: {
  orders: Order[];
  caption?: string;
}) {
  return (
    <DataTable
      caption={caption}
      rows={orders}
      rowKey={(row) => row.id}
      columns={[
        { key: 'id', header: 'Mã đơn', render: (row) => <strong>{row.id}</strong> },
        { key: 'at', header: 'Thời gian', render: (row) => formatDateTime(row.at) },
        { key: 'cashier', header: 'Thu ngân', render: (row) => row.cashier },
        { key: 'type', header: 'Hình thức', render: (row) => row.type },
        { key: 'table', header: 'Bàn', render: (row) => row.table },
        {
          key: 'total',
          header: 'Tổng tiền',
          numeric: true,
          render: (row) => formatCurrency(row.total),
        },
        {
          key: 'status',
          header: 'Trạng thái',
          render: (row) => <StatusBadge status={row.status} />,
        },
      ]}
      emptyMessage="Không có đơn hàng phù hợp"
    />
  );
}
export function OrdersPage() {
  return (
    <>
      <PageHeader
        title="Lịch sử đơn hàng"
        description="Tra cứu đơn hàng trong phạm vi công việc của bạn"
      />
      <OperationsBoundary>{(data) => <OrdersWorkspace data={data} />}</OperationsBoundary>
    </>
  );
}
function OrdersWorkspace({ data }: { data: OperationsData }) {
  const { context } = useWorkspace();
  const [period, setPeriod] = useState('today');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(false);
  const orders = useScopedOrders(data).filter(
    (order) =>
      (period === 'today'
        ? formatDate(order.at) === formatDate(data.shift.asOf)
        : order.shiftId === data.shift.id) &&
      (status === 'all' || order.status === status) &&
      order.id.toLocaleLowerCase('vi-VN').includes(search.trim().toLocaleLowerCase('vi-VN')),
  );
  return (
    <div className="orders-workspace">
      <div className="ops-toolbar">
        <SearchInput
          label="Tìm mã đơn"
          placeholder="Tìm mã đơn..."
          value={search}
          onChange={setSearch}
        />
        <FilterTabs
          label="Thời gian đơn hàng"
          value={period}
          onChange={setPeriod}
          items={[
            { value: 'today', label: 'Hôm nay' },
            { value: 'shift', label: 'Ca hiện tại' },
          ]}
        />
        <button
          className="button button-secondary"
          aria-expanded={filters}
          aria-controls="order-filters"
          onClick={() => setFilters(!filters)}
        >
          <SlidersHorizontal size={17} aria-hidden="true" />
          Bộ lọc
        </button>
      </div>
      {filters && (
        <div id="order-filters" className="ops-filter-row">
          <label>
            Trạng thái đơn
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">Tất cả</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </label>
          <button
            className="auth-text-button"
            onClick={() => {
              setStatus('all');
              setSearch('');
            }}
          >
            Xóa bộ lọc
          </button>
        </div>
      )}
      <p className="ops-muted">
        {orders.length} đơn ·{' '}
        {context.role === 'STAFF'
          ? 'Đơn thuộc ca của bạn tại chi nhánh hiện tại.'
          : 'Đơn của toàn chi nhánh hiện tại trong khoảng thời gian đã chọn.'}
      </p>
      <OrdersTable orders={orders} />
    </div>
  );
}
