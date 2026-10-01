import { Routes, Route, Navigate } from 'react-router-dom';
import StaffLayout from '@/layouts/StaffLayout';
import POSPage from '@/pages/staff/POSPage';
import TablesPage from '@/pages/staff/TablesPage';
import OrderHistoryPage from '@/pages/staff/OrderHistoryPage';
import ShiftSummaryPage from '@/pages/staff/ShiftSummaryPage';

function App() {
  return (
    <Routes>
      {/* Sales Operations — shared by Staff and Manager */}
      <Route path="/app" element={<StaffLayout />}>
        <Route path="pos" element={<POSPage />} />
        <Route path="tables" element={<TablesPage />} />
        <Route path="orders" element={<OrderHistoryPage />} />
        <Route path="shift" element={<ShiftSummaryPage />} />
      </Route>

      {/* Default redirect to POS */}
      <Route path="/" element={<Navigate to="/app/pos" replace />} />
      <Route path="*" element={<Navigate to="/app/pos" replace />} />
    </Routes>
  );
}

export default App;
