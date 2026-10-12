import { NavLink, Link } from 'react-router-dom';
import { LogOut, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { getNavigation } from '@/app/navigation';
import { copy } from '@/locales/vi';
import type { WorkspaceContext } from '@/stores/workspace';
import { Avatar, RoleBadge } from '@/components/common/Foundation';

export function Sidebar({
  context,
  collapsed = false,
  onToggle,
  onNavigate,
  mobile = false,
  onSignOut,
  signingOut = false,
  signOutError = false,
}: {
  context: WorkspaceContext | null;
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
  mobile?: boolean;
  onSignOut?: () => void;
  signingOut?: boolean;
  signOutError?: boolean;
}) {
  return (
    <div className={`sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="sidebar-brand">
        <Link to="/" onClick={onNavigate} className="wordmark" aria-label="nextvn — Trang chủ">
          {collapsed ? 'n' : 'nextvn'}
          <span>.</span>
        </Link>
        {onToggle && (
          <button
            className="icon-button sidebar-toggle"
            aria-label={
              mobile
                ? 'Đóng điều hướng'
                : collapsed
                  ? 'Mở rộng thanh điều hướng'
                  : 'Thu gọn thanh điều hướng'
            }
            aria-expanded={!collapsed}
            onClick={onToggle}
          >
            {mobile ? <X /> : collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </button>
        )}
      </div>
      {context?.role === 'STAFF' && (
        <p className={collapsed ? 'sr-only' : 'sidebar-role-heading'}>NHÂN VIÊN / THU NGÂN</p>
      )}
      {context?.role === 'MANAGER' && (
        <p className={collapsed ? 'sr-only' : 'sidebar-role-heading'}>QUẢN LÝ CỬA HÀNG</p>
      )}
      {context?.role === 'OWNER' && (
        <p className={collapsed ? 'sr-only' : 'sidebar-role-heading'}>CHỦ DOANH NGHIỆP</p>
      )}
      <nav aria-label="Điều hướng chính">
        {context ? (
          getNavigation(context.role).map(({ key, path, icon: Icon }) => (
            <NavLink
              key={key}
              to={path}
              end={key === 'owner'}
              onClick={onNavigate}
              title={collapsed ? copy.navigation[key] : undefined}
              className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
            >
              <Icon size={20} aria-hidden="true" />
              <span className={collapsed ? 'sr-only' : undefined}>{copy.navigation[key]}</span>
            </NavLink>
          ))
        ) : (
          <p className="sidebar-hint">{collapsed ? '—' : 'Chưa có ngữ cảnh làm việc'}</p>
        )}
      </nav>
      <footer className="sidebar-footer">
        <div className="user-context">
          <Avatar name={context?.user.fullName ?? '?'} />
          <div className={collapsed ? 'sr-only' : 'user-details'}>
            <strong>{context?.user.fullName ?? 'Chưa có người dùng'}</strong>
            {context && <RoleBadge role={context.role} />}
          </div>
        </div>
        <button
          className={`sign-out${signingOut ? ' is-signing-out' : ''}`}
          disabled={!onSignOut || signingOut}
          onClick={onSignOut}
          title={!onSignOut ? 'Đăng xuất chưa được kết nối' : copy.common.signOut}
          aria-busy={signingOut}
        >
          <LogOut
            className={signingOut ? 'sign-out-spinner' : undefined}
            size={18}
            aria-hidden="true"
          />
          <span className={collapsed ? 'sr-only' : undefined}>
            {signingOut ? 'Đang đăng xuất…' : copy.common.signOut}
          </span>
        </button>
        {signOutError && (
          <p className={collapsed ? 'sr-only' : 'sidebar-hint'} role="alert">
            Không thể đăng xuất. Vui lòng thử lại.
          </p>
        )}
      </footer>
    </div>
  );
}
