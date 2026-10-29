import { useContext, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { WorkspaceSessionContext } from '@/features/auth/workspaceContext';
import { fetchActiveShift, startShift, endShift } from '@/services/salesApi';
import { fetchLiveShiftSummary } from '@/services/salesWorkflowApi';

const money = (amount: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
export default function SalesShiftPage() {
  const client = useQueryClient();
  const context = useContext(WorkspaceSessionContext)?.context;
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const shift = useQuery({
    queryKey: ['activeShift'],
    queryFn: fetchActiveShift,
    refetchInterval: 15000,
  });
  const summary = useQuery({
    queryKey: ['sales-shift-summary', shift.data?.id],
    queryFn: () => fetchLiveShiftSummary(shift.data!.id),
    enabled: !!shift.data,
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  });
  const start = useMutation({
    mutationFn: startShift,
    onSuccess: () => {
      setError('');
      setNotice('Đã mở ca.');
      void client.invalidateQueries({ queryKey: ['activeShift'] });
    },
    onError: (failure) =>
      setError(
        axios.isAxiosError(failure)
          ? (failure.response?.data?.message ?? 'Không thể bắt đầu ca.')
          : 'Không thể bắt đầu ca.',
      ),
  });
  const close = useMutation({
    mutationFn: () => endShift(shift.data!.id),
    onSuccess: () => {
      setConfirmClose(false);
      setError('');
      setNotice('Đã kết thúc ca.');
      void client.invalidateQueries({ queryKey: ['activeShift'] });
      void client.invalidateQueries({ queryKey: ['sales-shift-summary'] });
    },
    onError: (failure) => {
      setConfirmClose(false);
      setError(
        axios.isAxiosError(failure)
          ? (failure.response?.data?.message ?? 'Không thể kết thúc ca.')
          : 'Không thể kết thúc ca.',
      );
    },
  });
  const data = summary.data?.summary;
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Ca làm việc</h1>
          <p>Số liệu được cập nhật từ đơn và giao dịch đã xác nhận</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            void shift.refetch();
            void summary.refetch();
          }}
        >
          Làm mới
        </Button>
      </div>
      {error && (
        <div className="error-state" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <p className="badge badge-success" role="status">
          {notice}
        </p>
      )}
      {shift.isLoading && (
        <div className="loading-state" role="status">
          <div className="spinner" />
          Đang tải ca...
        </div>
      )}
      {shift.isError && (
        <div className="error-state" role="alert">
          Không thể tải ca hiện tại.
        </div>
      )}
      {!shift.isLoading && !shift.data && (
        <div className="card">
          <div className="card-body">
            <h2>Chưa mở ca</h2>
            <p>Mở ca để tạo và thanh toán đơn hàng.</p>
            <Button disabled={start.isPending} onClick={() => start.mutate()}>
              {start.isPending ? 'Đang mở ca...' : 'Mở ca'}
            </Button>
          </div>
        </div>
      )}
      {shift.data && (
        <>
          <div className="card">
            <div className="card-body">
              <h2>Ca đang hoạt động</h2>
              <p>Bắt đầu lúc {new Date(shift.data.startedAt).toLocaleString('vi-VN')}</p>
              <p>
                Người trực:{' '}
                {shift.data.staffId === context?.user.id
                  ? context.user.fullName
                  : shift.data.staffId.slice(0, 8)}
              </p>
              {summary.dataUpdatedAt > 0 && (
                <p role="status">
                  Số liệu cập nhật lúc {new Date(summary.dataUpdatedAt).toLocaleTimeString('vi-VN')}
                </p>
              )}
              <Button
                variant="secondary"
                disabled={close.isPending || !data || data.unpaidOrders > 0}
                onClick={() => setConfirmClose(true)}
              >
                Đóng ca
              </Button>
              {data && data.unpaidOrders > 0 && (
                <p role="status">
                  Còn {data.unpaidOrders} đơn chưa thanh toán. Hãy hoàn tất hoặc hủy trước khi kết
                  thúc ca.
                </p>
              )}
            </div>
          </div>
          {summary.isLoading && (
            <div className="loading-state" role="status">
              <div className="spinner" />
              Đang tải số liệu...
            </div>
          )}
          {summary.isError && (
            <div className="error-state" role="alert">
              Không thể tải số liệu ca.
            </div>
          )}
          {data && (
            <div className="summary-grid">
              {[
                ['Tổng đơn', data.totalOrders],
                ['Đơn chờ thanh toán', data.unpaidOrders],
                ['Đơn đã thanh toán', data.paidOrders],
                ['Đơn đã hủy', data.cancelledOrders],
                ['Tiền đã thu', money(data.collectedRevenue)],
                ['Tiền mặt', money(data.cashReceived)],
                ['Chuyển khoản', money(data.bankTransferReceived)],
                ['Bàn đang phục vụ', data.occupiedTables],
              ].map(([label, value]) => (
                <div className="summary-stat" key={label}>
                  <div className="stat-label">{label}</div>
                  <div className="stat-value">{value}</div>
                </div>
              ))}
            </div>
          )}
          {summary.data && (
            <div className="card">
              <div className="card-header">
                <h2>Giao dịch gần đây</h2>
              </div>
              <div className="card-body">
                {summary.data.recentTransactions.length === 0 ? (
                  <div className="empty-state">Chưa có giao dịch đã thu tiền trong ca.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Thời gian</th>
                          <th>Đơn</th>
                          <th>Phương thức</th>
                          <th>Số tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.data.recentTransactions.map((transaction, index) => (
                          <tr key={`${transaction.orderId}-${index}`}>
                            <td>{new Date(transaction.createdAt).toLocaleString('vi-VN')}</td>
                            <td>{transaction.orderId.slice(0, 8)}</td>
                            <td>{transaction.method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}</td>
                            <td>{money(transaction.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
      <Modal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="Kết thúc ca?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmClose(false)}>
              Quay lại
            </Button>
            <Button disabled={close.isPending} onClick={() => close.mutate()}>
              Xác nhận kết thúc
            </Button>
          </>
        }
      >
        Chỉ kết thúc khi mọi đơn trong ca đã thanh toán hoặc hủy.
      </Modal>
    </div>
  );
}
