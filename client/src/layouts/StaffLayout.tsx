import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, LayoutGrid, ClipboardList, Clock, LogOut, Menu, Coffee } from 'lucide-react';
import { useContext, useState } from 'react';
import { WorkspaceSessionContext } from '@/features/auth/workspaceContext';
import { navigation } from '@/app/navigation';
import { useCartStore } from '@/stores/cartStore';

export default function StaffLayout() {
  const workspace = useContext(WorkspaceSessionContext);
  const client = useQueryClient();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  if (!localStorage.getItem('access_token')) return <Navigate to="/login" replace />;
  return (
    <div className="app-layout">
      <header className="mobile-navigation">
        <strong>NextVN</strong>
        <button
          className="btn btn-secondary"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="app-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Menu aria-hidden="true" size={18} />
          {menuOpen ? 'Đóng menu' : 'Mở menu'}
        </button>
      </header>
      <aside id="app-navigation" className={`sidebar${menuOpen ? ' is-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Coffee aria-hidden="true" size={22} />
          </div>
          <h1>NextVN</h1>
        </div>
        <nav
          className="sidebar-nav"
          aria-label="Điều hướng chính"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('a')) setMenuOpen(false);
          }}
        >
          {workspace?.context.role !== 'OWNER' && (
            <>
              <div className="sidebar-section-title">Bán hàng</div>
              <NavLink
                to="/app/pos"
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                <ShoppingCart />
                <span>POS / Bán hàng</span>
              </NavLink>
              <NavLink
                to="/app/tables"
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                <LayoutGrid />
                <span>Quản lý bàn</span>
              </NavLink>
              <NavLink
                to="/app/orders"
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                <ClipboardList />
                <span>Đơn hàng</span>
              </NavLink>
              <NavLink
                to="/app/shift"
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                <Clock />
                <span>Ca làm việc</span>
              </NavLink>
            </>
          )}
          {workspace?.context.role === 'MANAGER' && (
            <>
              <div className="sidebar-section-title">Quản lý kho</div>
              {navigation
                .filter((item) =>
                  ['inventory', 'stockTransactions', 'recipes', 'alerts'].includes(item.key),
                )
                .map((item) => (
                  <NavLink
                    key={item.key}
                    to={item.path}
                    className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                  >
                    <item.icon />
                    <span>
                      {
                        (
                          {
                            inventory: 'Kho hàng',
                            stockTransactions: 'Nhập / Xuất kho',
                            recipes: 'Công thức',
                            alerts: 'Cảnh báo',
                          } as Record<string, string>
                        )[item.key]
                      }
                    </span>
                  </NavLink>
                ))}
            </>
          )}
          {workspace?.context.role === 'OWNER' && (
            <>
              <div className="sidebar-section-title">CHỦ DOANH NGHIỆP</div>
              {[
                ['/app/owner', 'Tổng quan'],
                ['/app/owner/branches', 'Chi nhánh'],
                ['/app/owner/revenue', 'Doanh thu'],
                ['/app/owner/menu-profit', 'Lợi nhuận món'],
                ['/app/owner/promotions', 'Gợi ý khuyến mãi'],
                ['/app/owner/users', 'Người dùng & vai trò'],
                ['/app/owner/subscription', 'Gói dịch vụ'],
                ['/app/owner/settings', 'Cài đặt doanh nghiệp'],
              ].map(([path, label]) => (
                <NavLink
                  key={path}
                  to={path}
                  end
                  className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
                >
                  <LayoutGrid />
                  <span>{label}</span>
                </NavLink>
              ))}
            </>
          )}
          {workspace?.context.role === 'OWNER' && (
            <NavLink
              to="/app/owner/inventory"
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <LayoutGrid />
              <span>Tổng quan kho doanh nghiệp</span>
            </NavLink>
          )}
          <div className="sidebar-section-title" style={{ marginTop: 'auto' }}>
            Tài khoản
          </div>
          <button
            className="sidebar-link"
            type="button"
            onClick={() => {
              localStorage.removeItem('access_token');
              useCartStore.getState().clearCart();
              void client.cancelQueries().then(() => {
                client.clear();
                navigate('/login', { replace: true });
              });
            }}
          >
            <LogOut />
            <span>Đăng xuất</span>
          </button>
        </nav>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
