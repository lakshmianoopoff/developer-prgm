import { ShieldAlert, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { auth, db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Navbar({ title, children }) {
  const { user, role, setRole } = useAuth();
  const navigate = useNavigate();
  
  const handleRoleToggle = async () => {
    if (!user) return;
    const newRole = role === 'reporter' ? 'responder' : 'reporter';
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: newRole });
      setRole(newRole);
      navigate(newRole === 'reporter' ? '/report' : '/responder');
    } catch (e) {
      console.error("Failed to switch role", e);
    }
  };

  return (
    <nav className="flex justify-between items-center px-6 py-4 bg-slate border-b border-slate-border shadow-md">
      <div className="flex items-center gap-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          className="flex items-center"
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
            {role !== 'admin' && (
               <button onClick={() => navigate('/dashboard')} className="text-sm text-slate-400 hover:text-white transition">Global Map</button>
            )}
            
            {role !== 'admin' && (
              <button 
                onClick={handleRoleToggle}
                className="flex items-center gap-2 px-3 py-1.5 text-xs md:text-sm text-white bg-slate-light border border-slate-border rounded hover:bg-slate-border transition"
              >
                <ArrowLeftRight size={14} />
                <span className="hidden md:inline">Switch to {role === 'reporter' ? 'Responder' : 'Reporter'}</span>
              </button>
            )}

            <span className="text-slate-400 text-sm hidden md:inline">{user.displayName || user.email}</span>
            <button className="px-3 py-1.5 text-sm border border-slate-border text-slate-300 rounded hover:bg-slate-light transition" onClick={() => auth.signOut()}>Logout</button>
          </div>
        )}
      </div>
    </nav>
  );
}
