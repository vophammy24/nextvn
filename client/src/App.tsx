import { Route, Routes, Link, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, EmptyState, SectionCard } from '@/components/common/Foundation';
import { navigation, roleHome } from '@/app/navigation';
import { useWorkspace } from '@/features/auth/workspaceContext';
import { WorkspaceBoundary, RequireRole } from '@/features/auth/components/WorkspaceBoundary';
import { POSPage } from '@/features/operations/POSPage';
import { TablesPage } from '@/features/operations/TablesPage';
import { OrdersPage } from '@/features/operations/OrdersPage';
import { ShiftPage } from '@/features/operations/ShiftPage';
import { ProfilePage } from '@/features/auth/components/ProfilePage';
import { lazy, Suspense } from 'react';
import { LoadingState } from '@/components/common/Foundation';
import { isManagerView } from '@/features/manager/routes';
import { isOwnerView } from '@/features/owner/routes';
import { copy } from '@/locales/vi';
import { DevelopmentPreview } from '@/app/DevelopmentPreview';
import { useLocation } from 'react-router-dom';
import { LandingPage } from '@/pages/public/LandingPage';
import { SignInPage } from '@/features/auth/components/SignInPage';
import { BusinessSignInPage } from '@/features/auth/components/BusinessSignInPage';
import './App.css';

const ManagerPage = lazy(() => import('@/features/manager/ManagerPage'));
const OwnerPage = lazy(() => import('@/features/owner/OwnerPage'));

function WorkspaceIndex() {
  const { context } = useWorkspace();
  if (context) return <Navigate to={roleHome(context.role)} replace />;
  return (
    <EmptyState
      title="Chưa có ngữ cảnh làm việc"
      description="Thông tin người dùng, doanh nghiệp và chi nhánh sẽ được kết nối ở bước triển khai xác thực."
    />
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} description="Không gian làm việc của bạn" />
      <SectionCard title="Nội dung đang được chuẩn bị">
        <EmptyState
          title="Chưa có nội dung"
          description="Chức năng này sẽ được triển khai trong giai đoạn tiếp theo."
        />
      </SectionCard>
    </>
  );
}

export default function App() {
  const location = useLocation();
  return (
    <>
      {import.meta.env.DEV && location.pathname.startsWith('/app') && <DevelopmentPreview />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<SignInPage />} />
        <Route path="/login/business" element={<BusinessSignInPage />} />
        <Route
          path="/app"
          element={
            <WorkspaceBoundary>
              <AppShell />
            </WorkspaceBoundary>
          }
        >
          <Route index element={<WorkspaceIndex />} />
          {navigation.map((item) => (
            <Route
              key={item.key}
              path={item.path.slice('/app/'.length)}
              element={
                <RequireRole roles={item.roles}>
                  {item.key === 'pos' ? (
                    <POSPage />
                  ) : item.key === 'tables' ? (
                    <TablesPage />
                  ) : item.key === 'orders' ? (
                    <OrdersPage />
                  ) : item.key === 'shift' ? (
                    <ShiftPage />
                  ) : item.key === 'profile' ? (
                    <ProfilePage />
                  ) : isManagerView(item.key) ? (
                    <Suspense fallback={<LoadingState />}>
                      <ManagerPage view={item.key} />
                    </Suspense>
                  ) : isOwnerView(item.key) ? (
                    <Suspense fallback={<LoadingState />}>
                      <OwnerPage view={item.key} />
                    </Suspense>
                  ) : (
                    <PlaceholderPage title={copy.navigation[item.key]} />
                  )}
                </RequireRole>
              }
            />
          ))}
          <Route
            path="*"
            element={
              <EmptyState
                title="Không tìm thấy trang"
                description="Vui lòng chọn một mục trong thanh điều hướng."
              />
            }
          />
        </Route>
        <Route
          path="*"
          element={
            <main className="public-page">
              <EmptyState title="Không tìm thấy trang" action={<Link to="/">Về trang chủ</Link>} />
            </main>
          }
        />
      </Routes>
    </>
  );
}
