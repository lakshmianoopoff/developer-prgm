import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Report from './pages/Report';
import Responder from './pages/Responder';
import Dashboard from './pages/Dashboard';
import { useAuth } from './hooks/useAuth';
import { RoleProvider } from './contexts/RoleContext';

function AppRoutes() {
  const { user, role, loading } = useAuth();
  
  if (loading) return <div className="mono-text p-8 text-[var(--color-slate-border)]">Loading session...</div>;
  if (!user) return <Login />;
  
  // Universal permissions - any user can access any route, navigation is handled by Navbar
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/report" element={<Report />} />
      <Route path="/responder" element={<Responder />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/" element={<Navigate to={role === 'reporter' ? '/report' : role === 'responder' ? '/responder' : '/dashboard'} />} />
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
