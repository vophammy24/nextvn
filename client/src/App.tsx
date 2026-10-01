import { OwnerRoute } from '@/pages/owner/OwnerRoute';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import { Routes, Route, Navigate } from 'react-router-dom';
import StaffLayout from '@/layouts/StaffLayout';
import POSPage from '@/pages/staff/POSPage';
import TablesPage from '@/pages/staff/TablesPage';
import OrderHistoryPage from '@/pages/staff/OrderHistoryPage';
import ShiftSummaryPage from '@/pages/staff/ShiftSummaryPage';
import { WorkspaceProvider } from '@/features/auth/WorkspaceProvider';
import { InventoryRoute } from '@/features/inventory/InventoryRoute';
import InventoryOverviewPage from '@/pages/owner/InventoryOverviewPage';

function App() {
  return (
    <WorkspaceProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Sales Operations — shared by Staff and Manager */}
        <Route path="/app" element={<StaffLayout />}>
          <Route path="pos" element={<POSPage />} />
          <Route path="tables" element={<TablesPage />} />
          <Route path="orders" element={<OrderHistoryPage />} />
          <Route path="shift" element={<ShiftSummaryPage />} />
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

        {/* Default redirect to POS */}
        <Route path="/" element={<Navigate to="/app/pos" replace />} />
        <Route path="*" element={<Navigate to="/app/pos" replace />} />
      </Routes>
    </WorkspaceProvider>
  );
}

export default App;
