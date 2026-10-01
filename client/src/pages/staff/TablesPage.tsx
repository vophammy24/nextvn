import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, LayoutGrid } from 'lucide-react';
import { fetchAreas, fetchTables, updateTableStatus, fetchTableBill } from '@/services/salesApi';
import type { RestaurantTable, Order, TableStatus } from '@/types/sales';

const TABLE_STATUS_LABELS: Record<TableStatus, string> = {
  AVAILABLE: 'Trống',
  OCCUPIED: 'Đang sử dụng',
  RESERVED: 'Đã đặt',
  CLEANING: 'Đang dọn',
  NEED_PAYMENT: 'Chờ thanh toán',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusBadgeClass(status: TableStatus): string {
  const map: Record<TableStatus, string> = {
    AVAILABLE: 'badge-success',
    OCCUPIED: 'badge-danger',
    RESERVED: 'badge-warning',
    CLEANING: 'badge-default',
    NEED_PAYMENT: 'badge-info',
  };
  return map[status];
}

export default function TablesPage() {
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [tableBill, setTableBill] = useState<Order | null>(null);
  const [showBillPanel, setShowBillPanel] = useState(false);

  const queryClient = useQueryClient();

  const areasQuery = useQuery({
    queryKey: ['areas'],
    queryFn: fetchAreas,
  });

  const tablesQuery = useQuery({
    queryKey: ['tables', selectedAreaId],
    queryFn: () => fetchTables(selectedAreaId ?? undefined),
  });

  const statusMutation = useMutation({
    mutationFn: ({ tableId, status }: { tableId: string; status: string }) =>
      updateTableStatus(tableId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      setShowBillPanel(false);
      setSelectedTable(null);
    },
    onError: () => {
      alert('Không thể cập nhật bàn. Vui lòng thử lại.');
    },
  });

  const handleSelectTable = async (table: RestaurantTable) => {
    setSelectedTable(table);
    setShowBillPanel(true);
    try {
      const bill = await fetchTableBill(table.id);
      setTableBill(bill);
    } catch {
      setTableBill(null);
    }
  };

  const handleStatusChange = (status: string) => {
    if (!selectedTable) return;
    statusMutation.mutate({ tableId: selectedTable.id, status });
  };

  const getAvailableTransitions = (
    status: TableStatus,
  ): Array<{ value: string; label: string }> => {
    const transitions: Record<string, Array<{ value: string; label: string }>> = {
      AVAILABLE: [
        { value: 'OCCUPIED', label: 'Mở bàn' },
        { value: 'RESERVED', label: 'Đặt trước' },
      ],
      OCCUPIED: [
        { value: 'NEED_PAYMENT', label: 'Yêu cầu thanh toán' },
        { value: 'CLEANING', label: 'Dọn bàn' },
      ],
      RESERVED: [
        { value: 'OCCUPIED', label: 'Khách đến' },
        { value: 'AVAILABLE', label: 'Hủy đặt' },
      ],
      CLEANING: [{ value: 'AVAILABLE', label: 'Hoàn tất dọn' }],
      NEED_PAYMENT: [
        { value: 'CLEANING', label: 'Thanh toán xong' },
        { value: 'AVAILABLE', label: 'Trả bàn' },
      ],
    };
    return transitions[status] || [];
  };

  return (
    <>
      <header className="top-header">
        <h2>Quản lý bàn</h2>
      </header>

      <div className="page-content">
        <div className="tables-layout">
          {/* Area Tabs */}
          <div className="area-tabs">
            <button
              type="button"
              className={`pos-category-tab${selectedAreaId === null ? ' active' : ''}`}
              onClick={() => setSelectedAreaId(null)}
            >
              Tất cả
            </button>
            {areasQuery.data?.map((area) => (
              <button
                type="button"
                key={area.id}
                className={`pos-category-tab${selectedAreaId === area.id ? ' active' : ''}`}
                onClick={() => setSelectedAreaId(area.id)}
              >
                {area.name}
              </button>
            ))}
          </div>

          {/* Loading/Error/Empty States */}
          {tablesQuery.isLoading && (
            <div className="loading-state">
              <div className="spinner" />
              <span>Đang tải danh sách bàn...</span>
            </div>
          )}

          {tablesQuery.isError && (
            <div className="error-state">
              <AlertCircle />
              <span>Không thể tải danh sách bàn.</span>
            </div>
          )}

          {tablesQuery.data && tablesQuery.data.length === 0 && (
            <div className="empty-state">
              <LayoutGrid />
              <span>Chưa có bàn nào.</span>
            </div>
          )}

          {/* Tables Grid */}
          <div className="tables-grid">
            {tablesQuery.data?.map((table) => (
              <div
                key={table.id}
                className={`table-card status-${table.status}`}
                onClick={() => handleSelectTable(table)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSelectTable(table);
                }}
              >
                <div className="table-card-header">
                  <span className="table-card-name">{table.name}</span>
                  <span className="table-card-seats">{table.seats} chỗ</span>
                </div>
                <span className={`badge ${getStatusBadgeClass(table.status)}`}>
                  {TABLE_STATUS_LABELS[table.status]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Table Detail / Bill Panel */}
        {showBillPanel && selectedTable && (
          <div className="modal-overlay" onClick={() => setShowBillPanel(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{selectedTable.name}</h3>
                <span className={`badge ${getStatusBadgeClass(selectedTable.status)}`}>
                  {TABLE_STATUS_LABELS[selectedTable.status]}
                </span>
              </div>

              <div className="modal-body">
                {tableBill ? (
                  <div>
                    <h4
                      style={{
                        marginBottom: '12px',
                        fontSize: '14px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Hóa đơn hiện tại
                    </h4>
                    {tableBill.items.map((item) => (
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
                    <div className="cart-summary-row total" style={{ marginTop: '16px' }}>
                      <span>Tổng cộng</span>
                      <span>{formatCurrency(tableBill.total)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: '20px 0' }}>
                    <span>Không có hóa đơn.</span>
                  </div>
                )}

                {/* State Transition Actions */}
                <div style={{ marginTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {getAvailableTransitions(selectedTable.status).map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleStatusChange(t.value)}
                      disabled={statusMutation.isPending}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowBillPanel(false)}
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
