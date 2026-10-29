import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Modal } from '@/components/common/Modal';
import {
  cancelSalesOrder,
  fetchSalesOrder,
  fetchSalesOrders,
  fetchSalesTables,
  paySalesOrder,
  transferSalesOrder,
} from '@/services/salesWorkflowApi';

const money = (amount: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
const errorText = (value: unknown) =>
  axios.isAxiosError(value)
    ? (value.response?.data?.message ?? 'Không thể xử lý đơn.')
    : 'Không thể xử lý đơn.';
export default function SalesOrdersPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const client = useQueryClient();
  const [status, setStatus] = useState<'OPEN' | 'PAID' | 'CANCELLED'>('OPEN');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<string | null>(params.get('order'));
  const [method, setMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [targetTable, setTargetTable] = useState('');
  const [confirm, setConfirm] = useState<'pay' | 'cancel' | 'transfer' | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const invalidDates = !!dateFrom && !!dateTo && dateFrom > dateTo;
  const orders = useQuery({
    queryKey: ['sales-orders', status, page, search, dateFrom, dateTo],
    queryFn: () => fetchSalesOrders(status, page, search, dateFrom, dateTo),
    enabled: !invalidDates,
  });
  const detail = useQuery({
    queryKey: ['sales-order', selected],
    queryFn: () => fetchSalesOrder(selected!),
    enabled: !!selected,
  });
  const tables = useQuery({
    queryKey: ['sales-tables'],
    queryFn: () => fetchSalesTables(),
    enabled: !!selected,
  });
  const mutate = useMutation({
    mutationFn: async () => {
      if (!selected || !confirm) throw Error('Chưa chọn đơn.');
      if (confirm === 'pay') return paySalesOrder(selected, method);
      if (confirm === 'cancel') return cancelSalesOrder(selected);
      return transferSalesOrder(selected, targetTable);
    },
    onSuccess: () => {
      setNotice(
        confirm === 'pay'
          ? 'Đã xác nhận thu tiền.'
          : confirm === 'cancel'
            ? 'Đã hủy đơn.'
            : 'Đã chuyển bàn.',
      );
      setError('');
      setConfirm(null);
      void client.invalidateQueries({ queryKey: ['sales-orders'] });
      void client.invalidateQueries({ queryKey: ['sales-order', selected] });
      void client.invalidateQueries({ queryKey: ['sales-tables'] });
      void client.invalidateQueries({ queryKey: ['sales-shift-summary'] });
    },
    onError: (failure) => {
      setError(errorText(failure));
      setConfirm(null);
    },
  });
  const rows = orders.data?.data ?? [];
  const current = detail.data;
  return (
    <div className="page-content sales-orders">
      <div className="page-header">
        <div>
          <h1>Đơn hàng</h1>
          <p>Theo dõi đơn chờ thanh toán và lịch sử bán hàng</p>
        </div>
        <Button onClick={() => navigate('/app/pos')}>Tạo đơn</Button>
      </div>
      {notice && (
        <p className="badge badge-success" role="status">
          {notice}
        </p>
      )}
      {error && (
        <div className="error-state" role="alert">
          <AlertCircle />
          {error}
        </div>
      )}
      {invalidDates && (
        <div className="error-state" role="alert">
          Ngày bắt đầu không được sau ngày kết thúc.
        </div>
      )}
      <div className="card">
        <div className="card-header filters-bar">
          <div className="sales-choice" role="group" aria-label="Trạng thái đơn">
            {(
              [
                ['OPEN', 'Chưa thanh toán'],
                ['PAID', 'Đã thanh toán'],
                ['CANCELLED', 'Đã hủy'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={status === value}
                onClick={() => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <Input
            aria-label="Tìm mã đơn"
            placeholder="Tìm mã đơn (8 ký tự đầu)"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                setSearch(searchDraft.trim());
                setPage(1);
              }
            }}
          />
          <Button
            variant="secondary"
            onClick={() => {
              setSearch(searchDraft.trim());
              setPage(1);
            }}
          >
            Tìm
          </Button>
          <Button variant="secondary" onClick={() => void orders.refetch()}>
            Làm mới
          </Button>
        </div>
        <details className="sales-advanced-filters">
          <summary>Lọc theo ngày</summary>
          <div className="filters-bar">
            <label>
              Từ ngày{' '}
              <Input
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              Đến ngày{' '}
              <Input
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            {(dateFrom || dateTo) && (
              <Button
                variant="secondary"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  setPage(1);
                }}
              >
                Xóa ngày lọc
              </Button>
            )}
          </div>
        </details>
        <div className="card-body">
          {orders.isLoading && (
            <div className="loading-state" role="status">
              <div className="spinner" />
              Đang tải đơn...
            </div>
          )}
          {orders.isError && (
            <div className="error-state" role="alert">
              Không thể tải danh sách đơn.
            </div>
          )}
          {orders.data && rows.length === 0 && (
            <div className="empty-state">Chưa có đơn trong trạng thái này.</div>
          )}
          <div className="sales-orders-table" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Thời gian</th>
                  <th>Hình thức</th>
                  <th>Tổng tiền</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id.slice(0, 8)}</td>
                    <td>{new Date(order.createdAt).toLocaleString('vi-VN')}</td>
                    <td>
                      {order.tableId
                        ? 'Tại bàn'
                        : order.orderType === 'TAKEAWAY'
                          ? 'Mang đi'
                          : 'Tại quầy'}
                    </td>
                    <td>{money(order.total)}</td>
                    <td>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSelected(order.id);
                          setNotice('');
                        }}
                      >
                        Chi tiết
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sales-orders-mobile">
            {rows.map((order) => (
              <div className="card" key={order.id}>
                <div className="card-body">
                  <strong>Đơn {order.id.slice(0, 8)}</strong>
                  <span>{new Date(order.createdAt).toLocaleString('vi-VN')}</span>
                  <span>
                    {order.tableId
                      ? 'Tại bàn'
                      : order.orderType === 'TAKEAWAY'
                        ? 'Mang đi'
                        : 'Tại quầy'}{' '}
                    · {money(order.total)}
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelected(order.id);
                      setNotice('');
                    }}
                  >
                    Chi tiết
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="filters-bar">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Trang trước
            </Button>
            <span>
              Trang {page} / {Math.max(1, orders.data?.pagination.totalPages ?? 1)}
            </span>
            <Button
              variant="secondary"
              disabled={page >= (orders.data?.pagination.totalPages ?? 1)}
              onClick={() => setPage(page + 1)}
            >
              Trang sau
            </Button>
          </div>
        </div>
      </div>
      {selected && (
        <Modal
          open={!confirm}
          onClose={() => setSelected(null)}
          title={`Đơn ${selected.slice(0, 8)}`}
          footer={
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Đóng
            </Button>
          }
        >
          {detail.isLoading && <div role="status">Đang tải...</div>}
          {detail.isError && <div role="alert">Không thể tải chi tiết đơn.</div>}
          {current && (
            <>
              <p>
                Trạng thái:{' '}
                <span
                  className={`badge ${current.status === 'PAID' ? 'badge-success' : 'badge-warning'}`}
                >
                  {current.status === 'PAID'
                    ? 'Đã thanh toán'
                    : current.status === 'CANCELLED'
                      ? 'Đã hủy'
                      : 'Chờ thanh toán'}
                </span>
              </p>
              <p>Thời gian: {new Date(current.createdAt).toLocaleString('vi-VN')}</p>
              <ul>
                {current.items.map((item) => (
                  <li key={item.id}>
                    {item.name} × {item.quantity} — {money(item.total)}
                  </li>
                ))}
              </ul>
              <p>
                <strong>Tổng: {money(current.total)}</strong>
              </p>
              {current.payments.map((payment) => (
                <p key={payment.id}>
                  Đã thu: {money(payment.amount)} (
                  {payment.method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'})
                </p>
              ))}
              {['OPEN', 'CONFIRMED'].includes(current.status) && (
                <div className="filters-bar">
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/app/pos?order=${current.id}`)}
                  >
                    Sửa món
                  </Button>
                  <Button onClick={() => setConfirm('pay')}>Thanh toán</Button>
                  <Button variant="secondary" onClick={() => setConfirm('cancel')}>
                    Hủy đơn
                  </Button>
                  {current.tableId && (
                    <Button variant="secondary" onClick={() => setConfirm('transfer')}>
                      Chuyển bàn
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </Modal>
      )}
      {confirm && current && (
        <Modal
          open
          onClose={() => setConfirm(null)}
          title={
            confirm === 'pay'
              ? 'Xác nhận đã nhận tiền'
              : confirm === 'cancel'
                ? 'Xác nhận hủy đơn'
                : 'Chuyển bàn'
          }
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirm(null)}>
                Quay lại
              </Button>
              <Button
                disabled={mutate.isPending || (confirm === 'transfer' && !targetTable)}
                onClick={() => mutate.mutate()}
              >
                {mutate.isPending ? 'Đang xử lý...' : 'Xác nhận'}
              </Button>
            </>
          }
        >
          <p>
            Đơn {current.id.slice(0, 8)} · {money(current.total)}
          </p>
          {confirm === 'pay' && (
            <label>
              Phương thức
              <Select
                value={method}
                onChange={(event) => setMethod(event.target.value as 'CASH' | 'BANK_TRANSFER')}
              >
                <option value="CASH">Tiền mặt</option>
                <option value="BANK_TRANSFER">Chuyển khoản</option>
              </Select>
            </label>
          )}
          {confirm === 'transfer' && (
            <div>
              <p>
                Từ bàn{' '}
                {tables.data?.find((table) => table.id === current.tableId)?.name ?? 'hiện tại'} đến
                bàn trống:
              </p>
              <div className="sales-table-choices" role="group" aria-label="Bàn đích">
                {tables.data
                  ?.filter(
                    (table) =>
                      table.effectiveStatus === 'AVAILABLE' && table.id !== current.tableId,
                  )
                  .map((table) => (
                    <button
                      type="button"
                      aria-pressed={targetTable === table.id}
                      onClick={() => setTargetTable(table.id)}
                      key={table.id}
                    >
                      {table.name}
                    </button>
                  ))}
              </div>
              {!tables.data?.some(
                (table) => table.effectiveStatus === 'AVAILABLE' && table.id !== current.tableId,
              ) && <p>Không còn bàn trống để chuyển.</p>}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
