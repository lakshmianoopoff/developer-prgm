import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Report from './pages/Report';
import Responder from './pages/Responder';
import { useAuth } from './hooks/useAuth';
import { RoleProvider } from './contexts/RoleContext';

function AppRoutes() {
  const { user, role, loading } = useAuth();
  
  if (loading) return <div className="mono-text p-8 text-[var(--color-slate-border)]">Loading session...</div>;
  
  const getRoleRoute = () => {
    if (!role) return '/login';
    if (role === 'admin') return '/dashboard';
    if (role === 'reporter') return '/reporter';
    if (role === 'responder') return '/responder';
    return '/login';
  };

  return (
    <Routes>
      <Route path="/login" element={user && role ? <Navigate to={getRoleRoute()} /> : <Login />} />
      
      <Route path="/dashboard" element={user && role === 'admin' ? <Dashboard /> : <Navigate to={getRoleRoute()} />} />
      <Route path="/reporter" element={user && role === 'reporter' ? <Report /> : <Navigate to={getRoleRoute()} />} />
      <Route path="/responder" element={user && role === 'responder' ? <Responder /> : <Navigate to={getRoleRoute()} />} />
      
      <Route path="/" element={<Navigate to={getRoleRoute()} />} />
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
