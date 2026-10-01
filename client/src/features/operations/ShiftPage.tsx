import { useState } from 'react';
import { Clock3, Banknote, Landmark, Send, LogOut } from 'lucide-react';
import { PageHeader, StatCard, SectionCard } from '@/components/common/Foundation';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format';
import { OperationsBoundary } from './data';
import { OrdersTable } from './OrdersPage';
import { useScopedOrders } from './useScopedOrders';
import type { OperationsData } from './types';
export function ShiftPage() {
  return (
    <>
      <PageHeader
        title="Tổng kết ca"
        description="Theo dõi kết quả và khoản thu trong ca làm việc"
      />
      <OperationsBoundary>{(data) => <ShiftWorkspace data={data} />}</OperationsBoundary>
    </>
  );
}
function ShiftWorkspace({ data }: { data: OperationsData }) {
  const [notice, setNotice] = useState('');
  const orders = useScopedOrders(data).filter((order) => order.shiftId === data.shift.id);
  const paid = orders.filter((order) => order.status === 'PAID');
  const revenue = paid.reduce((sum, order) => sum + order.total, 0);
  const minutes = Math.floor((Date.parse(data.shift.asOf) - Date.parse(data.shift.start)) / 60000);
  return (
    <div className="shift-workspace">
      <div className="shift-banner">
        <span className="shift-icon">
          <Clock3 size={28} aria-hidden="true" />
        </span>
        <div>
          <h2>Ca làm việc minh họa</h2>
          <p>Bắt đầu: {formatDateTime(data.shift.start)}</p>
        </div>
        <div>
          <span>Thời lượng</span>
          <strong>
            {Math.floor(minutes / 60)} giờ {minutes % 60} phút
          </strong>
        </div>
        <span className="badge badge-success">{data.shift.status}</span>
      </div>
      <div className="shift-stats">
        <StatCard
          label="Tổng số đơn"
          value={formatNumber(orders.length)}
          detail="Bao gồm đơn đã hủy"
        />
        <StatCard
          label="Doanh thu"
          value={formatCurrency(revenue)}
          detail="Chỉ tính đơn đã thanh toán"
        />
        <StatCard
          label="Đơn đã hủy"
          value={formatNumber(orders.length - paid.length)}
          detail="Không tính vào doanh thu"
        />
      </div>
      <SectionCard title="Khoản thu theo phương thức">
        <div className="shift-payments">
          {[
            { key: 'CASH', label: 'Tiền mặt', Icon: Banknote },
            { key: 'BANK', label: 'Chuyển khoản ngân hàng', Icon: Landmark },
          ].map(({ key, label, Icon }) => (
            <div key={key}>
              <Icon size={24} aria-hidden="true" />
              <span>{label}</span>
              <strong>
                {formatCurrency(
                  paid
                    .filter((order) => order.payment === key)
                    .reduce((sum, order) => sum + order.total, 0),
                )}
              </strong>
            </div>
          ))}
        </div>
      </SectionCard>
      <section aria-labelledby="shift-orders-title">
        <h2 id="shift-orders-title">Đơn hàng trong ca</h2>
        <OrdersTable orders={orders} caption="Đơn hàng trong ca" />
      </section>
      <div className="shift-actions">
        <button
          className="button button-secondary"
          onClick={() => setNotice('Kết thúc ca chưa khả dụng. Ca làm việc chưa được đóng.')}
        >
          <LogOut size={17} aria-hidden="true" />
          Kết thúc ca
        </button>
        <button
          className="button"
          onClick={() => setNotice('Gửi báo cáo ca chưa khả dụng. Chưa có báo cáo nào được gửi.')}
        >
          <Send size={17} aria-hidden="true" />
          Gửi báo cáo ca
        </button>
      </div>
      {notice && (
        <p className="ops-inline-note" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
