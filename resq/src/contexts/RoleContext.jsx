import { createContext, useState, useEffect, useContext } from 'react';

const RoleContext = createContext();

export function RoleProvider({ children }) {
  const [role, setRole] = useState(() => localStorage.getItem('resq_role') || null);

  useEffect(() => {
    if (role) {
      localStorage.setItem('resq_role', role);
    } else {
      localStorage.removeItem('resq_role');
    }
  }, [role]);

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useGlobalRole() {
  return useContext(RoleContext);
}
