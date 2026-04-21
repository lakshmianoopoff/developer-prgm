import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { useAuth } from './hooks/useAuth';
import { RoleProvider } from './contexts/RoleContext';

function AppRoutes() {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="mono-text p-8 text-[var(--color-slate-border)]">Loading session...</div>;
  if (!user) return <Login />;
  
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <RoleProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </RoleProvider>
  );
}

export default App;
