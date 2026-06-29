import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [userEmail, setUserEmail] = useState(
    localStorage.getItem('agenticUserEmail') || ''
  );
  const [loading, setLoading] = useState(false);

  const saveUserEmail = (email) => {
    setUserEmail(email);
    localStorage.setItem('agenticUserEmail', email);
  };

  return (
    <AppContext.Provider value={{ userEmail, setUserEmail: saveUserEmail, loading, setLoading }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
