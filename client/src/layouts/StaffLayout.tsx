import { BrandLogo } from '@/components/common/BrandLogo';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, LogOut, Menu, UserRound, X } from 'lucide-react';
import { useContext, useEffect, useRef, useState } from 'react';
import { WorkspaceSessionContext } from '@/features/auth/workspaceContext';
import { getShellDestination, getShellSections, roleLabels } from '@/app/shellNavigation';
import { useCartStore } from '@/stores/cartStore';

export default function StaffLayout() {
  const workspace = useContext(WorkspaceSessionContext);
  const client = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpenPath, setMenuOpenPath] = useState<string | null>(null);
  const [profileOpenPath, setProfileOpenPath] = useState<string | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const profileButton = useRef<HTMLButtonElement>(null);
  const profileContainer = useRef<HTMLDivElement>(null);
  const firstMenuLink = useRef<HTMLAnchorElement>(null);
  const mainArea = useRef<HTMLDivElement>(null);
  const role = workspace?.context.role;
  const currentPage = getShellDestination(location.pathname, role);
  const menuOpen = menuOpenPath === location.pathname;
  const profileOpen = profileOpenPath === location.pathname;

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const area = mainArea.current;
    document.body.style.overflow = 'hidden';
    if (area) area.inert = true;
    firstMenuLink.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpenPath(null);
        menuButton.current?.focus();
      }
      if (event.key === 'Tab') {
        const controls = Array.from(
          document.querySelectorAll<HTMLElement>(
            '#app-navigation a, #app-navigation button:not([disabled])',
          ),
        );
        if (!controls.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      if (area) area.inert = false;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!profileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileOpenPath(null);
        profileButton.current?.focus();
      }
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!profileContainer.current?.contains(event.target as Node)) setProfileOpenPath(null);
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOnOutsideClick);
    };
  }, [profileOpen]);

  const logout = () => {
    setMenuOpenPath(null);
    setProfileOpenPath(null);
    localStorage.removeItem('access_token');
    useCartStore.getState().clearCart();
    void client.cancelQueries().then(() => {
      client.clear();
      navigate('/login', { replace: true });
    });
  };

  if (!localStorage.getItem('access_token')) return <Navigate to="/login" replace />;
  return (
    <div className="app-layout">
      <header className="mobile-navigation">
        <BrandLogo tone="light" />
        <button
          ref={menuButton}
          className="app-menu-toggle"
          type="button"
          aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={menuOpen}
          aria-controls="app-navigation"
          onClick={() => setMenuOpenPath(menuOpen ? null : location.pathname)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </header>
      {menuOpen && (
        <button
          className="app-drawer-overlay"
          type="button"
          aria-label="Đóng menu"
          onClick={() => {
            setMenuOpenPath(null);
            menuButton.current?.focus();
          }}
        />
      )}
      <aside id="app-navigation" className={'sidebar' + (menuOpen ? ' is-open' : '')}>
        <div className="sidebar-brand">
          <BrandLogo tone="light" />
        </div>
        <nav className="sidebar-nav" aria-label="Điều hướng chính">
          {getShellSections(role).map((section, sectionIndex) => (
            <div className="sidebar-section" key={section.title}>
              <div className="sidebar-section-title">{section.title}</div>
              {section.items.map((item, itemIndex) => (
                <NavLink
                  key={item.path}
                  ref={sectionIndex === 0 && itemIndex === 0 ? firstMenuLink : undefined}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
                  onClick={() => {
                    setMenuOpenPath(null);
                    if (menuOpen)
                      requestAnimationFrame(() => document.getElementById('main-content')?.focus());
                  }}
                >
                  <item.icon aria-hidden="true" size={20} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-account">
          <span className="sidebar-section-title">Tài khoản</span>
          <button className="sidebar-link" type="button" onClick={logout}>
            <LogOut aria-hidden="true" size={20} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
      <div ref={mainArea} className="app-main-area">
        <header className="app-header">
          <div className="app-header-page">
            <span className="app-header-eyebrow">
              {workspace?.context.business
                ? workspace.context.business.name +
                  (workspace.context.branch ? ' · ' + workspace.context.branch.name : '')
                : 'Không gian làm việc'}
            </span>
            <span className="app-header-title">{currentPage?.label ?? 'NextVN'}</span>
          </div>
          <div className="app-header-context">
            {workspace?.context.business && (
              <div className="app-context-details">
                <span className="app-context-business">{workspace.context.business.name}</span>
                {workspace.context.branch && <span>{workspace.context.branch.name}</span>}
              </div>
            )}
            {workspace?.context.user && (
              <div ref={profileContainer} className="app-profile">
                <button
                  ref={profileButton}
                  className="app-profile-toggle"
                  type="button"
                  aria-expanded={profileOpen}
                  aria-controls="app-profile-menu"
                  aria-label={'Tài khoản ' + workspace.context.user.fullName}
                  onClick={() => setProfileOpenPath(profileOpen ? null : location.pathname)}
                >
                  <UserRound aria-hidden="true" size={18} />
                  <span>{workspace.context.user.fullName}</span>
                  <ChevronDown aria-hidden="true" size={16} />
                </button>
                {profileOpen && (
                  <div id="app-profile-menu" className="app-profile-menu">
                    <strong>{workspace.context.user.fullName}</strong>
                    <span>{role ? roleLabels[role] : ''}</span>
                    <button type="button" onClick={logout}>
                      <LogOut aria-hidden="true" size={18} />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        <main className="main-content" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
