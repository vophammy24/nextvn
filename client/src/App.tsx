import { OwnerRoute } from '@/pages/owner/OwnerRoute';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import { LandingPage } from '@/pages/public/LandingPage';
import { Routes, Route, Navigate } from 'react-router-dom';
import StaffLayout from '@/layouts/StaffLayout';
import SalesPOSPage from '@/pages/staff/SalesPOSPage';
import SalesTablesPage from '@/pages/staff/SalesTablesPage';
import SalesOrdersPage from '@/pages/staff/SalesOrdersPage';
import SalesShiftPage from '@/pages/staff/SalesShiftPage';
import SalesSettingsPage from '@/pages/staff/SalesSettingsPage';
import { WorkspaceProvider } from '@/features/auth/WorkspaceProvider';
import { InventoryRoute } from '@/features/inventory/InventoryRoute';
import InventoryOverviewPage from '@/pages/owner/InventoryOverviewPage';
import { AdminGate } from '@/pages/admin/AdminGate';
import { AdminPortal } from '@/pages/admin/AdminPortal';
import { OnboardingPage } from '@/pages/admin/OnboardingPage';
import { AcceptInvitationPage } from '@/features/invitations/AcceptInvitationPage';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCartStore } from '@/stores/cartStore';

function ProtectedApplication() {
  if (!localStorage.getItem('access_token')) return <Navigate to="/login" replace />;
  return (
    <WorkspaceProvider>
      <StaffLayout />
    </WorkspaceProvider>
  );
}

function App() {
  const navigate = useNavigate(),
    client = useQueryClient();
  useEffect(() => {
    const expired = () => {
      useCartStore.getState().clearCart();
      void client.cancelQueries().then(() => {
        client.clear();
        navigate('/login', { replace: true });
      });
    };
    window.addEventListener('nextvn:session-expired', expired);
    return () => window.removeEventListener('nextvn:session-expired', expired);
  }, [client, navigate]);
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/invitations/accept" element={<AcceptInvitationPage />} />
      <Route path="/app/admin" element={<AdminGate />}>
        <Route index element={<AdminPortal view="dashboard" />} />
        {(['approvals', 'businesses', 'owners', 'subscriptions', 'audit-logs'] as const).map(
          (view) => (
            <Route key={view} path={view} element={<AdminPortal key={view} view={view} />} />
          ),
        )}
      </Route>
      {/* Sales Operations — shared by Staff and Manager */}
      <Route path="/app" element={<ProtectedApplication />}>
        <Route path="pos" element={<SalesPOSPage />} />
        <Route path="tables" element={<SalesTablesPage />} />
        <Route path="orders" element={<SalesOrdersPage />} />
        <Route path="shift" element={<SalesShiftPage />} />
        <Route path="sales-settings" element={<SalesSettingsPage />} />
        <Route path="inventory" element={<InventoryRoute view="inventory" />} />
        <Route path="stock-transactions" element={<InventoryRoute view="stockTransactions" />} />
        <Route path="recipes" element={<InventoryRoute view="recipes" />} />
        <Route path="alerts" element={<InventoryRoute view="alerts" />} />
        <Route path="owner" element={<OwnerRoute />} />
        <Route path="owner/branches" element={<OwnerRoute />} />
        <Route path="owner/revenue" element={<OwnerRoute />} />
        <Route path="owner/menu-profit" element={<OwnerRoute />} />
        <Route path="owner/promotions" element={<OwnerRoute />} />
        <Route path="owner/users" element={<OwnerRoute />} />
        <Route path="owner/settings" element={<OwnerRoute />} />
        <Route path="owner/subscription" element={<OwnerRoute />} />
        <Route path="owner/team" element={<Navigate to="/app/owner/users" replace />} />
        <Route path="owner/analytics" element={<Navigate to="/app/owner/revenue" replace />} />
        <Route path="owner/inventory" element={<InventoryOverviewPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
