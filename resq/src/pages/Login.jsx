import { useState, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { ShieldAlert, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const ADMIN_EMAILS = [
  "YOUR_EMAIL@gmail.com",       
  "DEMO_EMAIL@gmail.com",        
];

const ADMIN_SECRET_CODE = "RESQ2025";

export default function Login() {
  const [errorMsg, setErrorMsg] = useState('');
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [adminError, setAdminError] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [toastMsg, setToastMsg] = useState('');
  
  const navigate = useNavigate();
  const { setRole } = useAuth();

  useEffect(() => {
    let timer;
    if (lockoutTimer > 0) {
      timer = setInterval(() => setLockoutTimer(prev => prev - 1), 1000);
    } else if (lockoutTimer === 0 && attempts >= 3) {
      setAttempts(0);
    }
    return () => clearInterval(timer);
  }, [lockoutTimer, attempts]);

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userRole = userDoc.data().role;
        setRole(userRole);
        if (userRole === 'admin') navigate('/dashboard');
        else if (userRole === 'reporter') navigate('/reporter');
        else if (userRole === 'responder') navigate('/responder');
        else navigate('/dashboard');
      } else {
        const shouldGrantAdmin = sessionStorage.getItem('grantAdmin') === 'true';
        if (shouldGrantAdmin || ADMIN_EMAILS.includes(user.email)) {
          sessionStorage.removeItem('grantAdmin');
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            name: user.displayName || 'Unknown User',
            email: user.email,
            role: 'admin',
            createdAt: serverTimestamp()
          });
          setRole('admin');
          navigate('/dashboard');
        } else {
          setPendingUser(user);
          setShowRoleSelection(true);
        }
      }
    } catch (error) {
      console.error("Error signing in", error);
      setErrorMsg(error.message || "Failed to sign in. Check console.");
    }
  };

  const handleRoleSelect = async (selectedRole) => {
    try {
      if (pendingUser.uid !== 'test_uid_123') {
        await setDoc(doc(db, 'users', pendingUser.uid), {
          uid: pendingUser.uid,
          name: pendingUser.displayName || 'Unknown User',
          email: pendingUser.email,
          role: selectedRole,
          createdAt: serverTimestamp()
        });
      }
      setRole(selectedRole);
      navigate(`/${selectedRole}`);
    } catch (error) {
      console.error("Error setting role", error);
      setErrorMsg(error.message || "Failed to set role.");
    }
  };

  const handleAdminAuth = async () => {
    if (lockoutTimer > 0) return;
    
    if (adminCode === ADMIN_SECRET_CODE) {
      setShowAdminModal(false);
      setToastMsg("Access code accepted. Verifying identity...");
      sessionStorage.setItem('grantAdmin', 'true');
      setTimeout(() => {
        handleGoogleSignIn();
      }, 1500);
    } else {
      setAdminError(true);
      setAdminCode('');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 3) {
        setLockoutTimer(30);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy p-4">
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-[#111318] border border-[#22D3A0] text-[#22D3A0] px-6 py-3 rounded-lg shadow-2xl z-50 font-bold tracking-wide flex items-center gap-2">
          <ShieldAlert size={18} /> {toastMsg}
        </div>
      )}
      
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

        {!showRoleSelection ? (
          <>
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

            <div className="mt-6 pt-4 border-t border-slate-border flex justify-center">
               <button 
                 onClick={() => setShowAdminModal(true)}
                 className="text-[#5A6478] text-[10px] uppercase tracking-widest flex items-center gap-1 hover:text-slate-400 transition"
               >
                 <span className="text-[14px]">⚙</span> System Access
               </button>
            </div>
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="flex flex-col gap-4 mt-6"
          >
            <h3 className="text-white font-bold mb-2">Select Your Role</h3>
            <button 
              className="w-full py-3 bg-slate-light hover:bg-slate-border border border-slate-border rounded text-white font-bold transition flex items-center justify-center gap-2"
              onClick={() => handleRoleSelect('reporter')}
            >
              🚨 Reporter
            </button>
            <button 
              className="w-full py-3 bg-slate-light hover:bg-slate-border border border-slate-border rounded text-white font-bold transition flex items-center justify-center gap-2"
              onClick={() => handleRoleSelect('responder')}
            >
              🛡️ Responder
            </button>
          </motion.div>
        )}
      </motion.div>

      {showAdminModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
           <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="w-[360px] bg-[#111318] border border-[#FF3B3B] rounded-lg p-8 relative shadow-[0_0_30px_rgba(255,59,59,0.15)]"
           >
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#FF3B3B] rounded-t-lg" />
              <button 
                onClick={() => setShowAdminModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white"
              >
                ✕
              </button>
              
              <div className="flex flex-col items-center mb-6">
                 {lockoutTimer > 0 && <Lock className="text-[#FF3B3B] mb-2" size={24} />}
                 <h2 className="text-[#FF3B3B] font-mono font-bold text-xl tracking-widest m-0" style={{ fontFamily: '"JetBrains Mono", monospace' }}>SYSTEM ACCESS</h2>
                 <p className="text-slate-500 text-xs mt-1 uppercase tracking-wider">Authorised personnel only</p>
              </div>

              <div className="relative">
                <motion.input
                  animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  type="password"
                  placeholder="Enter access code"
                  value={adminCode}
                  onChange={(e) => {
                    setAdminCode(e.target.value);
                    setAdminError(false);
                  }}
                  disabled={lockoutTimer > 0}
                  className="w-full bg-[#1A1D24] border border-[#1E2230] text-[#E8EDF5] p-3 rounded mb-2 focus:outline-none focus:border-[#FF3B3B] transition text-center tracking-widest"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAdminAuth();
                  }}
                />
                
                <div className="h-6 flex items-center justify-center mb-4">
                  {lockoutTimer > 0 ? (
                    <span className="text-[#F59E0B] text-xs font-mono font-bold" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      Locked. Try again in [{lockoutTimer}]s
                    </span>
                  ) : adminError ? (
                    <span className="text-[#FF3B3B] text-xs font-bold">Invalid access code</span>
                  ) : null}
                </div>

                <button
                  onClick={handleAdminAuth}
                  disabled={lockoutTimer > 0 || !adminCode}
                  className={`w-full py-3 rounded font-bold tracking-widest transition ${
                    lockoutTimer > 0 || !adminCode
                      ? 'bg-red-900/50 text-red-400/50 cursor-not-allowed'
                      : 'bg-[#FF3B3B] text-white hover:bg-red-600 shadow-[0_0_15px_rgba(255,59,59,0.4)]'
                  }`}
                >
                  AUTHENTICATE
                </button>
              </div>
           </motion.div>
        </div>
      )}
    </div>
  );
}
