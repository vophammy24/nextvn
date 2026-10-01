import { NavLink, Outlet } from 'react-router-dom';
import { ShoppingCart, LayoutGrid, ClipboardList, Clock, LogOut } from 'lucide-react';

export default function StaffLayout() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">🍜</div>
          <h1>NextVN</h1>
        </div>
        <nav className="sidebar-nav">
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

          <div className="sidebar-section-title" style={{ marginTop: 'auto' }}>
            Tài khoản
          </div>
          <button className="sidebar-link" type="button">
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
