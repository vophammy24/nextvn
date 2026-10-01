import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useWorkspace } from '@/features/auth/workspaceContext';
import { PageErrorBoundary } from '@/components/common/PageErrorBoundary';

export function AppShell({
  onSignOut,
  onNotifications,
}: {
  onSignOut?: () => void;
  onNotifications?: () => void;
}) {
  const { context } = useWorkspace();
  const [collapsed, setCollapsed] = useState(false);
  const mobileDialog = useRef<HTMLDialogElement>(null);
  const main = useRef<HTMLElement>(null);
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    if (mobileDialog.current?.open) mobileDialog.current.close();
    if (previousPath.current !== location.pathname) main.current?.focus();
    previousPath.current = location.pathname;
  }, [location.pathname]);
  useEffect(() => {
    if (!window.matchMedia) return;
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => {
      if (desktop.matches && mobileDialog.current?.open) mobileDialog.current.close();
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);
  return (
    <div className={`app-shell${collapsed ? ' sidebar-collapsed' : ''}`}>
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <aside className="desktop-sidebar" aria-label="Thanh điều hướng">
        <Sidebar
          context={context}
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          onSignOut={onSignOut}
        />
      </aside>
      <dialog ref={mobileDialog} className="mobile-navigation" aria-label="Điều hướng ứng dụng">
        <Sidebar
          context={context}
          mobile
          onToggle={() => mobileDialog.current?.close()}
          onNavigate={() => mobileDialog.current?.close()}
          onSignOut={onSignOut}
        />
      </dialog>
      <div className="workspace">
        <Topbar
          context={context}
          onOpenNavigation={() => mobileDialog.current?.showModal()}
          onNotifications={onNotifications}
        />
        <main ref={main} id="main-content" className="main-content" tabIndex={-1}>
          <PageErrorBoundary key={location.pathname}>
            <Outlet />
          </PageErrorBoundary>
        </main>
      </div>
    </div>
  );
}
