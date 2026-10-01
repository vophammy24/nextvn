import { Bell, Building2, Menu } from 'lucide-react';
import type { WorkspaceContext } from '@/stores/workspace';
export function Topbar({
  context,
  onOpenNavigation,
  onNotifications,
}: {
  context: WorkspaceContext | null;
  onOpenNavigation: () => void;
  onNotifications?: () => void;
}) {
  return (
    <header className="topbar">
      <button
        className="icon-button mobile-menu"
        aria-label="Mở điều hướng"
        aria-haspopup="dialog"
        onClick={onOpenNavigation}
      >
        <Menu />
      </button>
      <div className="topbar-context">
        <span className="eyebrow">Không gian làm việc</span>
        <strong>{context?.business.name ?? 'Chưa chọn doanh nghiệp'}</strong>
      </div>
      <div className="topbar-actions">
        <span className="branch-context">
          <Building2 size={18} aria-hidden="true" />
          {context?.branch?.name ??
            (context?.role === 'OWNER' ? 'Toàn doanh nghiệp' : 'Chưa chọn chi nhánh')}
        </span>
        <button
          className="icon-button"
          aria-label="Thông báo"
          title={onNotifications ? 'Thông báo' : 'Thông báo chưa được kết nối'}
          disabled={!onNotifications}
          onClick={onNotifications}
        >
          <Bell size={20} />
        </button>
      </div>
    </header>
  );
}
