import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthMe } from '../session';
import { WorkspaceSessionContext, useWorkspace } from '../workspaceContext';
import { useWorkspaceStore } from '@/stores/workspace';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/Foundation';
import { canAccess, roleHome, type BusinessRole } from '@/app/navigation';

export function WorkspaceBoundary({ children }: { children: ReactNode }) {
  const previewRole = useWorkspaceStore((state) => state.previewRole);
  const isPreview = import.meta.env.DEV && !!previewRole;
  const me = useAuthMe(!isPreview);
  if (isPreview && previewRole) {
    const context = {
      user: { id: 'preview-user', fullName: 'Người dùng xem trước' },
      business: { id: 'preview-business', name: 'Doanh nghiệp mẫu (minh họa)' },
      branch:
        previewRole === 'OWNER' ? undefined : { id: 'preview-branch', name: 'Chi nhánh minh họa' },
      role: previewRole,
    };
    return (
      <WorkspaceSessionContext.Provider
        key={`preview-${previewRole}`}
        value={{ context, isPreview: true }}
      >
        {children}
      </WorkspaceSessionContext.Provider>
    );
  }
  if (me.isPending) return <LoadingState label="Đang xác minh phiên đăng nhập…" />;
  if (me.isError || !me.data)
    return (
      <main className="public-page">
        <ErrorState
          message={me.error?.message ?? 'Vui lòng đăng nhập để tiếp tục.'}
          onRetry={() => void me.refetch()}
        />
        <Link to="/login">Đến trang đăng nhập</Link>
      </main>
    );
  const context = {
    user: me.data.user,
    role: me.data.membership.role,
    business: me.data.membership.business,
    branch: me.data.membership.branch ?? undefined,
  };
  return (
    <WorkspaceSessionContext.Provider
      key={`${context.user.id}-${context.business.id}-${context.branch?.id}-${context.role}`}
      value={{ context, isPreview: false }}
    >
      {children}
    </WorkspaceSessionContext.Provider>
  );
}

export function RequireRole({
  roles,
  children,
}: {
  roles: readonly BusinessRole[];
  children: ReactNode;
}) {
  const { context } = useWorkspace();
  const location = useLocation();
  if (!canAccess(context.role, roles))
    return (
      <EmptyState
        title="Bạn không có quyền truy cập"
        description="Trang này không thuộc phạm vi công việc của bạn."
        action={<Link to={roleHome(context.role)}>Về trang làm việc</Link>}
      />
    );
  return <div key={location.pathname}>{children}</div>;
}
