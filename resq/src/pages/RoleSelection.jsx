import { motion } from 'framer-motion';
import { ShieldAlert, User, Shield, Eye } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function RoleSelection() {
  const { user, setRole } = useAuth();

  const handleSelectRole = async (selectedRole) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: selectedRole });
      setRole(selectedRole);
    } catch (error) {
      console.error("Error setting role", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-navy p-4">
      <div className="flex items-center justify-center mb-8">
        <ShieldAlert className="text-accent-red mr-2" size={40} />
        <h1 className="text-accent-red text-4xl tracking-widest font-bold">ResQ</h1>
      </div>
      <h2 className="text-2xl text-white mb-8 font-bold text-center">Select Your Role</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        <motion.button
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleSelectRole('reporter')}
          className="bg-slate border-2 border-slate-border hover:border-accent-blue rounded-xl p-8 flex flex-col items-center gap-4 text-center group transition"
        >
          <div className="w-16 h-16 rounded-full bg-accent-blue/10 flex items-center justify-center group-hover:bg-accent-blue/20 transition">
            <User className="text-accent-blue" size={32} />
          </div>
          <h3 className="text-xl font-bold text-white uppercase tracking-wider">Reporter</h3>
          <p className="text-slate-400 text-sm">Report campus incidents</p>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleSelectRole('responder')}
          className="bg-slate border-2 border-slate-border hover:border-accent-green rounded-xl p-8 flex flex-col items-center gap-4 text-center group transition"
        >
          <div className="w-16 h-16 rounded-full bg-accent-green/10 flex items-center justify-center group-hover:bg-accent-green/20 transition">
            <Shield className="text-accent-green" size={32} />
          </div>
          <h3 className="text-xl font-bold text-white uppercase tracking-wider">Responder</h3>
          <p className="text-slate-400 text-sm">Respond to assigned incidents</p>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleSelectRole('admin')}
          className="bg-slate border-2 border-slate-border hover:border-accent-red rounded-xl p-8 flex flex-col items-center gap-4 text-center group transition"
        >
          <div className="w-16 h-16 rounded-full bg-accent-red/10 flex items-center justify-center group-hover:bg-accent-red/20 transition">
            <Eye className="text-accent-red" size={32} />
          </div>
          <h3 className="text-xl font-bold text-white uppercase tracking-wider">Admin</h3>
          <p className="text-slate-400 text-sm">Command & monitor all incidents</p>
        </motion.button>
      </div>
    </div>
  );
}
