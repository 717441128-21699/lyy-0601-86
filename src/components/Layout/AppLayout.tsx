import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useHealthStore } from '../../store';
import { Navigate } from 'react-router-dom';

export function AppLayout() {
  const { isLocked, isInitialized, members } = useHealthStore();

  if (isLocked) {
    return <Navigate to="/login" replace />;
  }

  if (!isInitialized && members.length === 0) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
