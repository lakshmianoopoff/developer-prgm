import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { ShieldAlert, User, Shield, UserCog } from 'lucide-react';

export default function Login() {
  const [step, setStep] = useState('login'); // 'login' or 'role_selection'
  const [tempUser, setTempUser] = useState(null);
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
        redirectBasedOnRole(userRole);
      } else {
        setTempUser(user);
        setStep('role_selection');
      }
    } catch (error) {
      console.error("Error signing in", error);
      setErrorMsg(error.message || "Failed to sign in. Check console.");
    }
  };

  const handleRoleSelect = async (selectedRole) => {
    if (!tempUser) return;
    
    try {
      await setDoc(doc(db, 'users', tempUser.uid), {
        uid: tempUser.uid,
        name: tempUser.displayName || 'Unknown User',
        role: selectedRole,
        department: selectedRole === 'responder' ? 'security' : '', // default
        createdAt: serverTimestamp()
      });

      if (selectedRole === 'responder') {
        // Also create a responder doc
        await setDoc(doc(db, 'responders', tempUser.uid), {
          uid: tempUser.uid,
          name: tempUser.displayName || 'Unknown User',
          department: 'security', // Can be updated later
          available: true,
          currentIncident: null
        });
      }

      setRole(selectedRole);
      redirectBasedOnRole(selectedRole);
    } catch (error) {
      console.error("Error setting role", error);
    }
  };

  const redirectBasedOnRole = (role) => {
    if (role === 'reporter') navigate('/report');
    if (role === 'responder') navigate('/responder');
    if (role === 'admin') navigate('/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
          <ShieldAlert color="var(--critical-color)" size={32} style={{ marginRight: '8px' }} />
          <h1 style={{ color: 'var(--critical-color)', fontSize: '2rem', letterSpacing: '2px' }}>ResQ</h1>
          <div className="pulse-dot" style={{ marginLeft: '8px', marginBottom: '16px' }}></div>
        </div>
        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Campus Crisis Command Center</p>
        
        {errorMsg && (
          <div style={{ backgroundColor: 'rgba(255, 59, 59, 0.1)', color: 'var(--critical-color)', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', border: '1px solid var(--critical-color)', fontSize: '0.85rem' }}>
            {errorMsg}
          </div>
        )}

        <hr className="border-standard" style={{ margin: '1.5rem 0' }} />

        {step === 'login' && (
          <button 
            className="btn" 
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
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
        )}

        {step === 'role_selection' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Select Your Role</h3>
            
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', padding: '1rem', gap: '1rem' }} onClick={() => handleRoleSelect('reporter')}>
              <User size={24} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 'bold' }}>Reporter</div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>Student or Staff</div>
              </div>
            </button>

            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', padding: '1rem', gap: '1rem' }} onClick={() => handleRoleSelect('responder')}>
              <Shield size={24} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 'bold' }}>Responder</div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>Security, Medical, Maintenance</div>
              </div>
            </button>

            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', padding: '1rem', gap: '1rem' }} onClick={() => handleRoleSelect('admin')}>
              <UserCog size={24} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 'bold' }}>Admin</div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>Command Center Control</div>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
