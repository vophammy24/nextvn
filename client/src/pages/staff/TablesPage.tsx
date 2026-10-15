import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useRef, useState } from 'react';
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
  const [billState, setBillState] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle');
  const [showBillPanel, setShowBillPanel] = useState(false);
  const [statusError, setStatusError] = useState('');
  const billRequest = useRef(0);

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
      setStatusError('');
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      billRequest.current += 1;
      setShowBillPanel(false);
      setSelectedTable(null);
    },
    onError: () => {
      setStatusError('Không thể cập nhật bàn. Vui lòng thử lại.');
    },
  });

  const handleSelectTable = async (table: RestaurantTable) => {
    const request = ++billRequest.current;
    setStatusError('');
    setSelectedTable(table);
    setTableBill(null);
    setBillState('loading');
    setShowBillPanel(true);
    try {
      const bill = await fetchTableBill(table.id);
      if (request !== billRequest.current) return;
      setTableBill(bill);
      setBillState('ready');
    } catch {
      if (request === billRequest.current) setBillState('error');
    }
  };

  const closeBillPanel = () => {
    billRequest.current += 1;
    setShowBillPanel(false);
  };

  const handleStatusChange = (status: string) => {
    if (!selectedTable) return;
    setStatusError('');
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
      <div className="page-content">
        <h1 className="sr-only">Quản lý bàn</h1>
        <div className="tables-layout">
          {/* Area Tabs */}
          <div className="area-tabs">
            <button
              type="button"
              className={`pos-category-tab${selectedAreaId === null ? ' active' : ''}`}
              aria-pressed={selectedAreaId === null}
              onClick={() => setSelectedAreaId(null)}
            >
              Tất cả
            </button>
            {areasQuery.data?.map((area) => (
              <button
                type="button"
                key={area.id}
                className={`pos-category-tab${selectedAreaId === area.id ? ' active' : ''}`}
                aria-pressed={selectedAreaId === area.id}
                onClick={() => setSelectedAreaId(area.id)}
              >
                {area.name}
              </button>
            ))}
          </div>

          {/* Loading/Error/Empty States */}
          {tablesQuery.isLoading && (
            <div className="loading-state" role="status">
              <div className="spinner" aria-hidden="true" />
              <span>Đang tải danh sách bàn...</span>
            </div>
          )}

          {tablesQuery.isError && (
            <div className="error-state" role="alert">
              <AlertCircle aria-hidden="true" />
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
              <button
                type="button"
                key={table.id}
                className={`table-card status-${table.status}`}
                aria-haspopup="dialog"
                aria-expanded={showBillPanel && selectedTable?.id === table.id}
                onClick={() => handleSelectTable(table)}
              >
                <span className="table-card-header">
                  <span className="table-card-name">{table.name}</span>
                  <span className="table-card-seats">{table.seats} chỗ</span>
                </span>
                {table.area?.name && <span className="table-card-area">{table.area.name}</span>}
                <span className={`badge ${getStatusBadgeClass(table.status)}`}>
                  {TABLE_STATUS_LABELS[table.status]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Table Detail / Bill Panel */}
        {showBillPanel && selectedTable && (
          <Modal
            open
            onClose={closeBillPanel}
            title={selectedTable.name}
            headerAside={
              <span className={`badge ${getStatusBadgeClass(selectedTable.status)}`}>
                {TABLE_STATUS_LABELS[selectedTable.status]}
              </span>
            }
          >
            {statusError && (
              <div className="error-state" role="alert">
                <AlertCircle aria-hidden="true" />
                <span>{statusError}</span>
              </div>
            )}
            {billState === 'loading' && (
              <div className="loading-state" role="status">
                <div className="spinner" aria-hidden="true" />
                Đang tải hóa đơn...
              </div>
            )}
            {billState === 'error' && (
              <div className="error-state" role="alert">
                <AlertCircle aria-hidden="true" />
                <span>Không thể tải hóa đơn của bàn.</span>
                <Button variant="secondary" onClick={() => void handleSelectTable(selectedTable)}>
                  Thử lại
                </Button>
              </div>
            )}
            {billState === 'ready' &&
              (tableBill ? (
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
              ))}

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
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={closeBillPanel}>
                Đóng
              </button>
            </div>
          </Modal>
        )}
      </div>
    </>
  );
}
