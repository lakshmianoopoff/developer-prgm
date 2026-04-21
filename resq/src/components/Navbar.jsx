import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../services/firebase';

export default function Navbar({ title, children }) {
  const { user } = useAuth();
  
  return (
    <nav style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '1rem 2rem', 
      backgroundColor: 'var(--surface-color)', 
      borderBottom: '1px solid var(--border-color)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ShieldAlert color="var(--critical-color)" size={24} style={{ marginRight: '8px' }} />
          <span style={{ color: 'var(--critical-color)', fontFamily: 'var(--font-heading)', fontWeight: 'bold', fontSize: '1.25rem' }}>ResQ</span>
        </div>
        {title && <span className="text-muted" style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem', fontFamily: 'var(--font-heading)' }}>{title}</span>}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {children}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="text-muted">{user.displayName || user.email}</span>
            <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }} onClick={() => auth.signOut()}>Logout</button>
          </div>
        )}
      </div>
    </nav>
  );
}
