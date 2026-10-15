import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TableScroll } from '@/components/common/DataTable';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useState } from 'react';
import {
  Clock,
  PlayCircle,
  StopCircle,
  ShoppingCart,
  DollarSign,
  XCircle,
  Banknote,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import {
  fetchActiveShift,
  startShift,
  endShift,
  fetchShiftSummary,
  fetchShifts,
} from '@/services/salesApi';
import type { Shift, ShiftSummary } from '@/types/sales';

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
    year: 'numeric',
  });
}

function ShiftSummaryPanel({ summary }: { summary: ShiftSummary }) {
  return (
    <div className="summary-grid">
      <div className="summary-stat">
        <div className="stat-icon" style={{ background: 'var(--primary-bg)' }}>
          <ShoppingCart size={20} color="var(--primary)" />
        </div>
        <div className="stat-label">Tổng đơn hàng</div>
        <div className="stat-value">{summary.summary.totalOrders}</div>
      </div>
      <div className="summary-stat">
        <div className="stat-icon" style={{ background: 'var(--success-bg)' }}>
          <DollarSign size={20} color="var(--success)" />
        </div>
        <div className="stat-label">Doanh thu</div>
        <div className="stat-value">{formatCurrency(summary.summary.totalRevenue)}</div>
      </div>
      <div className="summary-stat">
        <div className="stat-icon" style={{ background: 'var(--danger-bg)' }}>
          <XCircle size={20} color="var(--danger)" />
        </div>
        <div className="stat-label">Đơn đã hủy</div>
        <div className="stat-value">{summary.summary.cancelledOrders}</div>
      </div>
      <div className="summary-stat">
        <div className="stat-icon" style={{ background: 'var(--warning-bg)' }}>
          <Banknote size={20} color="var(--warning)" />
        </div>
        <div className="stat-label">Tiền mặt</div>
        <div className="stat-value">{formatCurrency(summary.summary.cashReceived)}</div>
      </div>
      <div className="summary-stat">
        <div className="stat-icon" style={{ background: 'var(--info-bg)' }}>
          <CreditCard size={20} color="var(--info)" />
        </div>
        <div className="stat-label">Chuyển khoản</div>
        <div className="stat-value">{formatCurrency(summary.summary.bankTransferReceived)}</div>
      </div>
    </div>
  );
}

export default function ShiftSummaryPage() {
  const queryClient = useQueryClient();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [mutationError, setMutationError] = useState('');

  const activeShiftQuery = useQuery({
    queryKey: ['activeShift'],
    queryFn: fetchActiveShift,
  });

  const shiftsQuery = useQuery({
    queryKey: ['shifts'],
    queryFn: fetchShifts,
  });

  const shiftSummaryQuery = useQuery({
    queryKey: ['shiftSummary', activeShiftQuery.data?.id],
    queryFn: () => fetchShiftSummary(activeShiftQuery.data!.id),
    enabled: !!activeShiftQuery.data,
  });

  const startMutation = useMutation({
    mutationFn: startShift,
    onSuccess: () => {
      setMutationError('');
      queryClient.invalidateQueries({ queryKey: ['activeShift'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
    onError: () => {
      setMutationError('Không thể bắt đầu ca. Vui lòng thử lại.');
    },
  });

  const endMutation = useMutation({
    mutationFn: () => endShift(activeShiftQuery.data!.id),
    onSuccess: () => {
      setMutationError('');
      queryClient.invalidateQueries({ queryKey: ['activeShift'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shiftSummary'] });
    },
    onError: () => {
      setMutationError('Không thể kết thúc ca. Vui lòng thử lại.');
    },
  });

  return (
    <>
      <div className="page-content">
        <h1 className="sr-only">Ca làm việc</h1>
        <div className="shift-panel">
          {mutationError && (
            <div className="error-state" role="alert">
              <AlertCircle aria-hidden="true" />
              <span>{mutationError}</span>
            </div>
          )}
          {/* Active Shift Status */}
          {activeShiftQuery.isLoading && (
            <div className="loading-state" role="status">
              <div className="spinner" aria-hidden="true" />
              <span>Đang tải...</span>
            </div>
          )}

          {activeShiftQuery.isError && (
            <div className="error-state" role="alert">
              <AlertCircle aria-hidden="true" />
              <span>Không thể tải ca hiện tại.</span>
              <Button variant="secondary" onClick={() => void activeShiftQuery.refetch()}>
                Thử lại
              </Button>
            </div>
          )}

          {!activeShiftQuery.isLoading && !activeShiftQuery.isError && !activeShiftQuery.data && (
            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', padding: '40px' }}>
                <Clock size={48} style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }} />
                <h3 style={{ marginBottom: '8px' }}>Chưa bắt đầu ca</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Bắt đầu ca làm việc để bắt đầu bán hàng
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => {
                    setMutationError('');
                    startMutation.mutate();
                  }}
                  disabled={startMutation.isPending}
                  id="shift-start-btn"
                >
                  <PlayCircle size={20} />
                  {startMutation.isPending ? 'Đang xử lý...' : 'Bắt đầu ca'}
                </button>
              </div>
            </div>
          )}

          {activeShiftQuery.data && (
            <>
              <div className="shift-status-card">
                <h3>Ca hiện tại</h3>
                <div className="shift-time">{formatTime(activeShiftQuery.data.startedAt)}</div>
                <div style={{ marginTop: '16px' }}>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => setConfirmEnd(true)}
                    disabled={endMutation.isPending}
                    id="shift-end-btn"
                  >
                    <StopCircle size={18} />
                    {endMutation.isPending ? 'Đang xử lý...' : 'Kết thúc ca'}
                  </button>
                </div>
              </div>

              {/* Shift Summary */}
              {shiftSummaryQuery.data && <ShiftSummaryPanel summary={shiftSummaryQuery.data} />}
              {shiftSummaryQuery.isError && (
                <div className="error-state" role="alert">
                  <AlertCircle aria-hidden="true" />
                  <span>Không thể tải tổng kết ca.</span>
                  <Button variant="secondary" onClick={() => void shiftSummaryQuery.refetch()}>
                    Thử lại
                  </Button>
                </div>
              )}
              <Modal
                open={confirmEnd}
                onClose={() => setConfirmEnd(false)}
                title="Xác nhận kết thúc ca"
              >
                <p>Ca hiện tại sẽ kết thúc. Bạn có chắc muốn tiếp tục?</p>
                <div className="shift-confirm-actions">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => setConfirmEnd(false)}
                  >
                    Quay lại
                  </button>
                  <button
                    className="btn btn-danger"
                    type="button"
                    disabled={endMutation.isPending}
                    onClick={() => {
                      setConfirmEnd(false);
                      setMutationError('');
                      endMutation.mutate();
                    }}
                  >
                    Kết thúc ca
                  </button>
                </div>
              </Modal>
            </>
          )}

          {/* Shift History */}
          <div className="card" style={{ marginTop: '8px' }}>
            <div className="card-header">
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Lịch sử ca</h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {shiftsQuery.isLoading && (
                <div className="loading-state" role="status">
                  <div className="spinner" aria-hidden="true" />
                  <span>Đang tải...</span>
                </div>
              )}
              {shiftsQuery.isError && (
                <div className="error-state" role="alert">
                  <AlertCircle aria-hidden="true" />
                  <span>Không thể tải lịch sử ca.</span>
                  <Button variant="secondary" onClick={() => void shiftsQuery.refetch()}>
                    Thử lại
                  </Button>
                </div>
              )}

              {shiftsQuery.data && shiftsQuery.data.length === 0 && (
                <div className="empty-state">
                  <Clock />
                  <span>Chưa có ca nào.</span>
                </div>
              )}

              {shiftsQuery.data && shiftsQuery.data.length > 0 && (
                <TableScroll caption="Lịch sử ca">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Bắt đầu</th>
                        <th>Kết thúc</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shiftsQuery.data.map((shift: Shift) => (
                        <tr key={shift.id}>
                          <td>{formatTime(shift.startedAt)}</td>
                          <td>{shift.endedAt ? formatTime(shift.endedAt) : '—'}</td>
                          <td>
                            <span
                              className={`badge ${shift.status === 'ACTIVE' ? 'badge-success' : 'badge-default'}`}
                            >
                              {shift.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã kết thúc'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
