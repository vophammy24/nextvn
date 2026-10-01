import { Navigate, Route, Routes } from 'react-router-dom';
import OwnerWorkspace from '@/pages/owner/OwnerWorkspace';

function App() {
  return (
    <Routes>
      <Route path="/app/owner/*" element={<OwnerWorkspace />} />
      <Route
        path="/app/profile"
        element={
          <main className="profile-placeholder">
            <h1>Hồ sơ cá nhân</h1>
            <p>Thông tin hồ sơ sẽ được cung cấp bởi dịch vụ tài khoản dùng chung.</p>
          </main>
        }
      />
      <Route path="*" element={<Navigate to="/app/owner" replace />} />
    </Routes>
  );
}

export default App;
