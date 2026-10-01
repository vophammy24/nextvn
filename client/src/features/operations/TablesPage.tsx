import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Armchair, Users, Plus, Printer } from 'lucide-react';
import { PageHeader, FilterTabs, StatusBadge, EmptyState } from '@/components/common/Foundation';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { OperationsBoundary } from './data';
import { ReceiptPreview } from './ReceiptPreview';
import type { OperationsData } from './types';
export function TablesPage() {
  return (
    <>
      <PageHeader title="Khu vực / Bàn" description="Theo dõi bàn và đơn đang phục vụ" />
      <OperationsBoundary>{(data) => <TablesWorkspace data={data} />}</OperationsBoundary>
    </>
  );
}
export function TablesWorkspace({ data }: { data: OperationsData }) {
  const [area, setArea] = useState('Tất cả');
  const [selected, setSelected] = useState(data.tables[0]?.id);
  const [notice, setNotice] = useState('');
  const [receipt, setReceipt] = useState(false);
  const visibleTables = data.tables.filter((item) => area === 'Tất cả' || item.area === area);
  const table = visibleTables.find((item) => item.id === selected) ?? visibleTables[0];
  const total = table?.lines.reduce((sum, line) => sum + line.price * line.quantity, 0) ?? 0;
  const statuses = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'NEED_PAYMENT'] as const;
  const areas = ['Tất cả', 'Tầng 1', 'Tầng 2', 'Phòng VIP', 'Ngoài trời'];
  return (
    <>
      <FilterTabs
        label="Khu vực"
        items={areas.map((value) => ({ value, label: value }))}
        value={area}
        onChange={(value) => {
          setArea(value);
          const first = data.tables.find((item) => value === 'Tất cả' || item.area === value);
          if (first) setSelected(first.id);
          setReceipt(false);
          setNotice('');
        }}
      />
      <div className="table-legend" aria-label="Trạng thái bàn">
        {statuses.map((status) => (
          <StatusBadge key={status} status={status} />
        ))}
      </div>
      <div className="tables-workspace">
        <div className="dining-grid">
          {!visibleTables.length && <EmptyState title="Chưa có bàn trong khu vực này" />}
          {visibleTables.map((item) => (
            <button
              type="button"
              className={`dining-card table-${item.status.toLowerCase()}`}
              key={item.id}
              aria-pressed={selected === item.id}
              aria-label={`${item.name}, ${item.area}`}
              onClick={() => {
                setSelected(item.id);
                setReceipt(false);
                setNotice('');
              }}
            >
              <div>
                <strong>{item.name}</strong>
                <span>{item.area}</span>
              </div>
              <Armchair size={44} strokeWidth={1.4} aria-hidden="true" />
              <StatusBadge status={item.status} />
              <span className="table-seats">
                <Users size={14} aria-hidden="true" />
                {item.seats} chỗ ngồi
              </span>
            </button>
          ))}
        </div>
        {table && (
          <aside className="table-detail" aria-label="Chi tiết bàn">
            <div className="table-detail-heading">
              <h2>{table.name}</h2>
              <StatusBadge status={table.status} />
            </div>
            <dl className="ops-details">
              <div>
                <dt>Số khách</dt>
                <dd>{table.guests ?? '—'}</dd>
              </div>
              <div>
                <dt>Mở lúc</dt>
                <dd>{table.openedAt ? formatDateTime(table.openedAt) : '—'}</dd>
              </div>
              <div>
                <dt>Mã hóa đơn</dt>
                <dd>{table.billId ?? 'Chưa có'}</dd>
              </div>
            </dl>
            <h3>Các món tại bàn</h3>
            {table.lines.length ? (
              <ul className="table-bill-lines">
                {table.lines.map((line) => (
                  <li key={line.name}>
                    <span>
                      {line.quantity} × {line.name}
                    </span>
                    <strong>{formatCurrency(line.quantity * line.price)}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ops-muted">Bàn chưa có món.</p>
            )}
            <div className="order-grand-total">
              <span>Tổng cộng</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
            {table.status !== 'CLEANING' && (
              <Link className="button button-secondary" to={`/app/pos?table=${table.id}`}>
                <Plus size={16} aria-hidden="true" /> Thêm món
              </Link>
            )}
            <button
              className="button button-secondary"
              disabled={!table.lines.length}
              onClick={() => setReceipt(true)}
            >
              <Printer size={16} aria-hidden="true" /> In hóa đơn
            </button>
            <button
              className="button"
              disabled={!table.lines.length}
              onClick={() =>
                setNotice('Thanh toán chưa được kết nối. Trạng thái bàn và hóa đơn chưa thay đổi.')
              }
            >
              Thanh toán
            </button>
            {notice && (
              <p className="ops-inline-note" role="status">
                {notice}
              </p>
            )}
            {receipt && (
              <ReceiptPreview lines={table.lines} total={total} onClose={() => setReceipt(false)} />
            )}
          </aside>
        )}
      </div>
    </>
  );
}
