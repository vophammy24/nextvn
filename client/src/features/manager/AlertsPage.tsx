import { useInventoryActions } from '@/features/inventory/actions';
import { useState } from 'react';
import { TriangleAlert, CircleCheck, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FilterTabs, StatusBadge, EmptyState } from '@/components/common/Foundation';
import { formatDateTime } from '@/lib/format';
import { alertLabels } from './model';
import type { ManagerData } from './types';
export function Alerts({ data }: { data: ManagerData }) {
  const actions = useInventoryActions();
  const changeStatus = async (id: string, status: 'IN_PROGRESS' | 'RESOLVED') => {
    if (!actions) {
      setNotice('Cập nhật cảnh báo chưa khả dụng. Trạng thái cảnh báo chưa thay đổi.');
      return;
    }
    try {
      await actions.save(`/alerts/${id}`, 'PATCH', { status });
      setNotice('Đã cập nhật cảnh báo.');
    } catch (error) {
      setNotice((error as Error).message);
    }
  };
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [detail, setDetail] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const rows = data.alerts.filter(
    (alert) =>
      (status === 'all' || alert.status === status) &&
      (category === 'all' || alert.category === category),
  );
  return (
    <>
      <div className="manager-toolbar">
        <FilterTabs
          label="Trạng thái cảnh báo"
          items={[
            { value: 'all', label: 'Tất cả' },
            { value: 'OPEN', label: 'Mới' },
            { value: 'IN_PROGRESS', label: 'Đang xử lý' },
            { value: 'RESOLVED', label: 'Đã xử lý' },
          ]}
          value={status}
          onChange={setStatus}
        />
        <label className="manager-field">
          Loại cảnh báo
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">Tất cả loại cảnh báo</option>
            {Object.entries(alertLabels)
              .filter(([value]) => !actions || value !== 'DISCREPANCY')
              .map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
          </select>
        </label>
      </div>
      {notice && (
        <p className="manager-notice" role="status">
          {notice}
        </p>
      )}
      <div className="manager-alert-cards">
        {rows.map((alert) => (
          <article key={alert.id}>
            <div className={`manager-alert-icon alert-${alert.status.toLowerCase()}`}>
              {alert.status === 'RESOLVED' ? (
                <CircleCheck aria-hidden="true" />
              ) : alert.status === 'IN_PROGRESS' ? (
                <Clock3 aria-hidden="true" />
              ) : (
                <TriangleAlert aria-hidden="true" />
              )}
            </div>
            <div className="manager-alert-content">
              <div>
                <span className="manager-muted">{alertLabels[alert.category]}</span>
                <StatusBadge status={alert.status} />
              </div>
              <h2>{alert.title}</h2>
              <p>{formatDateTime(alert.at)}</p>
              <div className="manager-row-actions">
                <button
                  className="manager-text-button"
                  aria-expanded={detail === alert.id}
                  aria-controls={`detail-${alert.id}`}
                  aria-label={`Xem chi tiết: ${alert.title}`}
                  onClick={() => setDetail(detail === alert.id ? null : alert.id)}
                >
                  Xem chi tiết
                </button>
                <button
                  className="button button-secondary"
                  disabled={alert.status === 'RESOLVED' || actions?.pending}
                  aria-label={`Xử lý xong: ${alert.title}`}
                  onClick={() => void changeStatus(alert.id, 'RESOLVED')}
                >
                  Xử lý xong
                </button>
                {alert.status === 'OPEN' && (
                  <button
                    className="manager-text-button"
                    disabled={actions?.pending}
                    onClick={() => void changeStatus(alert.id, 'IN_PROGRESS')}
                  >
                    Đánh dấu đang xử lý
                  </button>
                )}
              </div>
              {detail === alert.id && (
                <div id={`detail-${alert.id}`} className="manager-alert-detail">
                  <p>{alert.detail}</p>
                  <Link to="/app/inventory">Kiểm tra kho hàng</Link>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      {!rows.length && <EmptyState title="Không có cảnh báo phù hợp" />}
    </>
  );
}
