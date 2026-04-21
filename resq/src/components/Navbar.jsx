import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Navbar({ title, children }) {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="flex justify-between items-center px-6 py-4 bg-slate border-b border-slate-border shadow-md">
      <div className="flex items-center gap-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          className="flex items-center cursor-pointer"
          onClick={() => navigate('/dashboard')}
        >
          <ShieldAlert className="text-accent-red mr-2" size={24} />
          <span className="text-accent-red font-bold text-xl uppercase tracking-widest" style={{ fontFamily: "'Syne', sans-serif" }}>ResQ</span>
        </motion.div>
        {title && <span className="text-slate-400 border-l border-slate-border pl-4 font-semibold hidden md:block" style={{ fontFamily: "'Syne', sans-serif" }}>{title}</span>}
      </div>
      
      <div className="flex items-center gap-4">
        {children}
        {user && (
          <div className="flex items-center gap-4">
            {role === 'admin' && (
              <span className="bg-accent-red/20 text-accent-red text-xs px-2 py-1 rounded border border-accent-red/50 uppercase tracking-widest font-bold">Admin</span>
            )}
            <span className="text-slate-400 text-sm hidden md:inline">{user.displayName || user.email}</span>
            <button className="px-3 py-1.5 text-sm border border-slate-border text-slate-300 rounded hover:bg-slate-light transition" onClick={() => auth.signOut()}>Logout</button>
          </div>
        )}
      </div>
    </nav>
  );
}
