import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const { setRole } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userRole = userDoc.data().role;
        setRole(userRole);
      } else {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: user.displayName || 'Unknown User',
          role: 'user',
          createdAt: serverTimestamp()
        });
        // Responders no longer exist as a separate collection, everyone is a universal user
        setRole('user');
      }
      navigate('/dashboard');
    } catch (error) {
      console.error("Error signing in", error);
      setErrorMsg(error.message || "Failed to sign in. Check console.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate border border-slate-border rounded-lg p-8 text-center shadow-xl"
      >
        <div className="flex items-center justify-center mb-2">
          <ShieldAlert className="text-accent-red mr-2" size={32} />
          <h1 className="text-accent-red text-3xl tracking-widest font-bold">ResQ</h1>
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-3 h-3 bg-accent-red rounded-full ml-2 mb-4" 
          />
        </div>
        <p className="text-slate-400 mb-6">Campus Crisis Command Center</p>
        
        {errorMsg && (
          <div className="bg-red-900/20 text-accent-red p-3 rounded border border-accent-red/50 mb-4 text-sm">
            {errorMsg}
          </div>
        )}

        <hr className="border-slate-border my-6" />

        <button 
          className="w-full flex items-center justify-center gap-3 bg-slate-light hover:bg-slate-border text-white border border-slate-border rounded py-3 transition font-semibold"
          onClick={handleGoogleSignIn}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25C22.56 11.47 22.49 10.71 22.36 9.97H12V14.29H17.92C17.67 15.68 16.89 16.87 15.71 17.66V20.45H19.28C21.36 18.53 22.56 15.65 22.56 12.25Z" fill="#4285F4"/>
            <path d="M12 23C14.97 23 17.46 22.02 19.28 20.45L15.71 17.66C14.73 18.32 13.47 18.72 12 18.72C9.17 18.72 6.77 16.81 5.88 14.25H2.21V17.09C4.01 20.67 7.7 23 12 23Z" fill="#34A853"/>
            <path d="M5.88 14.25C5.65 13.56 5.52 12.8 5.52 12C5.52 11.2 5.65 10.44 5.88 9.75V6.91H2.21C1.47 8.39 1.04 10.13 1.04 12C1.04 13.87 1.47 15.61 2.21 17.09L5.88 14.25Z" fill="#FBBC05"/>
            <path d="M12 5.28C13.62 5.28 15.07 5.84 16.21 6.92L19.35 3.78C17.46 2.02 14.97 1 12 1C7.7 1 4.01 3.33 2.21 6.91L5.88 9.75C6.77 7.19 9.17 5.28 12 5.28Z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>
      </motion.div>
    </div>
  );
}
