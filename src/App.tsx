import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/Layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ImportPage from './pages/ImportPage';
import DataManagementPage from './pages/DataManagementPage';
import AbnormalListPage from './pages/AbnormalListPage';
import TrendAnalysisPage from './pages/TrendAnalysisPage';
import RemindersPage from './pages/RemindersPage';
import FamilyPage from './pages/FamilyPage';
import ExportPage from './pages/ExportPage';
import SettingsPage from './pages/SettingsPage';
import { useHealthStore } from './store';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLocked } = useHealthStore();
  if (isLocked) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/data" element={<DataManagementPage />} />
          <Route path="/abnormal" element={<AbnormalListPage />} />
          <Route path="/trend" element={<TrendAnalysisPage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/family" element={<FamilyPage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
