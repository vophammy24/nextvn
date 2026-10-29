import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import StaffLayout from '@/layouts/StaffLayout';
import { WorkspaceSessionContext, type WorkspaceContext } from '@/features/auth/workspaceContext';
import { getShellSections } from '@/app/shellNavigation';

function NavigationHistoryControls() {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate(-1)}>
        Trước
      </button>
      <button type="button" onClick={() => navigate(1)}>
        Sau
      </button>
    </>
  );
}

function renderShell(role: WorkspaceContext['role'], route = '/app/pos') {
  const context: WorkspaceContext = {
    user: { id: 'user', fullName: 'Nguyễn An' },
    business: { id: 'business', name: 'Quán Việt' },
    branch: { id: 'branch', name: 'Chi nhánh 1' },
    role,
  };
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <WorkspaceSessionContext.Provider value={{ context, isPreview: false }}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/app" element={<StaffLayout />}>
              <Route
                path="*"
                element={
                  <>
                    <p>Nội dung trang</p>
                    <NavigationHistoryControls />
                  </>
                }
              />
            </Route>
            <Route path="/login" element={<p>Trang đăng nhập</p>} />
          </Routes>
        </MemoryRouter>
      </WorkspaceSessionContext.Provider>
    </QueryClientProvider>,
  );
}

describe('authenticated application shell', () => {
  beforeEach(() => localStorage.setItem('access_token', 'test-session'));

  it('shows only implemented destinations for each role', () => {
    expect(getShellSections('STAFF').flatMap((section) => section.items)).toHaveLength(4);
    expect(getShellSections('MANAGER').flatMap((section) => section.items)).toHaveLength(9);
    expect(getShellSections('OWNER').flatMap((section) => section.items)).toHaveLength(10);
    expect(
      getShellSections('STAFF')
        .flatMap((section) => section.items)
        .map((item) => item.path),
    ).not.toContain('/app/sales-settings');
    for (const role of ['STAFF', 'MANAGER', 'OWNER'] as const) {
      expect(
        getShellSections(role)
          .flatMap((section) => section.items)
          .map((item) => item.path),
      ).not.toContain('/app/dashboard');
    }
  });

  it('shows verified context, active destination and a keyboard-accessible profile', async () => {
    const user = userEvent.setup();
    renderShell('OWNER', '/app/owner/inventory');
    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' });
    expect(within(nav).getByRole('link', { name: 'Tổng quan kho doanh nghiệp' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Tổng quan' })).not.toHaveAttribute(
      'aria-current',
    );
    expect(screen.getByText('Quán Việt')).toBeInTheDocument();
    expect(screen.getByText('Chi nhánh 1')).toBeInTheDocument();
    const profile = screen.getByRole('button', { name: 'Tài khoản Nguyễn An' });
    await user.click(profile);
    expect(profile).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Chủ doanh nghiệp')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(profile).toHaveAttribute('aria-expanded', 'false');
    expect(profile).toHaveFocus();
  });

  it('opens and closes the drawer, locks scrolling, and preserves logout', async () => {
    const user = userEvent.setup();
    renderShell('STAFF');
    const open = screen.getByRole('button', { name: 'Mở menu' });
    await user.click(open);
    expect(document.body.style.overflow).toBe('hidden');
    expect(open).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('');
    expect(open).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    await waitFor(() => expect(screen.getByText('Trang đăng nhập')).toBeInTheDocument());
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('keeps the active destination in sync with back and forward navigation', async () => {
    const user = userEvent.setup();
    renderShell('OWNER', '/app/owner');
    const overview = screen.getByRole('link', { name: 'Tổng quan' });
    const branches = screen.getByRole('link', { name: 'Chi nhánh' });
    expect(overview).toHaveAttribute('aria-current', 'page');
    await user.click(branches);
    expect(branches).toHaveAttribute('aria-current', 'page');
    await user.click(screen.getByRole('button', { name: 'Trước' }));
    expect(overview).toHaveAttribute('aria-current', 'page');
    await user.click(screen.getByRole('button', { name: 'Sau' }));
    expect(branches).toHaveAttribute('aria-current', 'page');
  });
});
