import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Report from './pages/Report';
import Responder from './pages/Responder';
import Dashboard from './pages/Dashboard';
import { useAuth } from './hooks/useAuth';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();
  
  if (loading) return <div className="mono-text" style={{padding: '2rem'}}>Loading session...</div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Basic redirect logic if role doesn't match
    if (role === 'reporter') return <Navigate to="/report" />;
    if (role === 'responder') return <Navigate to="/responder" />;
    if (role === 'admin') return <Navigate to="/dashboard" />;
    return <Navigate to="/login" />;
  }
  
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/report" 
          element={
            <ProtectedRoute allowedRoles={['reporter', 'admin']}>
              <Report />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/responder" 
          element={
            <ProtectedRoute allowedRoles={['responder', 'admin']}>
              <Responder />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
