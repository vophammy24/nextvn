import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ClipboardList, Eye } from 'lucide-react';
import { fetchOrders, fetchOrderById } from '@/services/salesApi';
import type { Order, OrderStatus, OrderType } from '@/types/sales';

const STATUS_LABELS: Record<OrderStatus, string> = {
  OPEN: 'Đang mở',
  CONFIRMED: 'Đã xác nhận',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
};

const STATUS_BADGE: Record<OrderStatus, string> = {
  OPEN: 'badge-warning',
  CONFIRMED: 'badge-info',
  PAID: 'badge-success',
  CANCELLED: 'badge-danger',
};

const TYPE_LABELS: Record<OrderType, string> = {
  DINE_IN: 'Tại chỗ',
  TAKEAWAY: 'Mang đi',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

export default function OrderHistoryPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [todayOnly, setTodayOnly] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const ordersQuery = useQuery({
    queryKey: ['orders', page, statusFilter, typeFilter, todayOnly],
    queryFn: () =>
      fetchOrders({
        page,
        limit: 20,
        status: statusFilter || undefined,
        orderType: typeFilter || undefined,
        today: todayOnly ? 'true' : undefined,
      }),
  });

  const orderDetailQuery = useQuery({
    queryKey: ['orderDetail', selectedOrderId],
    queryFn: () => fetchOrderById(selectedOrderId!),
    enabled: !!selectedOrderId,
  });

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
  };

  return (
    <>
      <header className="top-header">
        <h2>Đơn hàng</h2>
      </header>

      <div className="page-content">
        <div className="card">
          <div className="card-header">
            <div className="filters-bar">
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                id="order-status-filter"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="OPEN">Đang mở</option>
                <option value="CONFIRMED">Đã xác nhận</option>
                <option value="PAID">Đã thanh toán</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>

              <select
                className="filter-select"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                id="order-type-filter"
              >
                <option value="">Tất cả hình thức</option>
                <option value="DINE_IN">Tại chỗ</option>
                <option value="TAKEAWAY">Mang đi</option>
              </select>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={todayOnly}
                  onChange={(e) => {
                    setTodayOnly(e.target.checked);
                    setPage(1);
                  }}
                />
                Hôm nay
              </label>
            </div>
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            {ordersQuery.isLoading && (
              <div className="loading-state">
                <div className="spinner" />
                <span>Đang tải đơn hàng...</span>
              </div>
            )}

            {ordersQuery.isError && (
              <div className="error-state">
                <AlertCircle />
                <span>Không thể tải danh sách đơn hàng.</span>
              </div>
            )}

            {ordersQuery.data && ordersQuery.data.data.length === 0 && (
              <div className="empty-state">
                <ClipboardList />
                <span>Không có đơn hàng nào.</span>
              </div>
            )}

            {ordersQuery.data && ordersQuery.data.data.length > 0 && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Thời gian</th>
                    <th>Hình thức</th>
                    <th>Tổng tiền</th>
                    <th>Trạng thái</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {ordersQuery.data.data.map((order: Order) => (
                    <tr key={order.id}>
                      <td className="font-mono" style={{ fontSize: '12px' }}>
                        {order.id.slice(0, 8)}
                      </td>
                      <td>{formatTime(order.createdAt)}</td>
                      <td>
                        <span className="badge badge-default">{TYPE_LABELS[order.orderType]}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(order.total)}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[order.status]}`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleViewOrder(order.id)}
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {ordersQuery.data && ordersQuery.data.pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Trước
              </button>
              {Array.from({ length: ordersQuery.data.pagination.totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  type="button"
                  className={page === i + 1 ? 'active' : ''}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                disabled={page >= ordersQuery.data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau
              </button>
            </div>
          )}
        </div>

        {/* Order Detail Modal */}
        {selectedOrderId && (
          <div className="modal-overlay" onClick={() => setSelectedOrderId(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Chi tiết đơn hàng</h3>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedOrderId(null)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                {orderDetailQuery.isLoading && (
                  <div className="loading-state">
                    <div className="spinner" />
                    <span>Đang tải...</span>
                  </div>
                )}
                {orderDetailQuery.data && (
                  <>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                        marginBottom: '20px',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                          Mã đơn
                        </span>
                        <div className="font-mono" style={{ fontSize: '13px' }}>
                          {orderDetailQuery.data.id.slice(0, 8)}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                          Trạng thái
                        </span>
                        <div>
                          <span className={`badge ${STATUS_BADGE[orderDetailQuery.data.status]}`}>
                            {STATUS_LABELS[orderDetailQuery.data.status]}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                          Hình thức
                        </span>
                        <div>{TYPE_LABELS[orderDetailQuery.data.orderType]}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                          Thời gian
                        </span>
                        <div>{formatTime(orderDetailQuery.data.createdAt)}</div>
                      </div>
                    </div>

                    <h4 style={{ marginBottom: '8px', fontSize: '14px' }}>Món ăn</h4>
                    {orderDetailQuery.data.items.map((item) => (
                      <div key={item.id} className="cart-item">
                        <div className="cart-item-info">
                          <div className="cart-item-name">{item.name}</div>
                          <div className="cart-item-price">
                            {item.quantity} × {formatCurrency(item.unitPrice)}
                          </div>
                        </div>
                        <span style={{ fontWeight: 600 }}>{formatCurrency(item.total)}</span>
                      </div>
                    ))}

                    <div
                      style={{
                        marginTop: '16px',
                        borderTop: '1px solid var(--border-light)',
                        paddingTop: '12px',
                      }}
                    >
                      <div className="cart-summary-row">
                        <span>Tạm tính</span>
                        <span>{formatCurrency(orderDetailQuery.data.subtotal)}</span>
                      </div>
                      <div className="cart-summary-row">
                        <span>Giảm giá</span>
                        <span>-{formatCurrency(orderDetailQuery.data.discount)}</span>
                      </div>
                      <div className="cart-summary-row total">
                        <span>Tổng cộng</span>
                        <span>{formatCurrency(orderDetailQuery.data.total)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setSelectedOrderId(null)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
