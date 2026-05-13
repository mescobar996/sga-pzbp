import React, { createContext, useContext, useState, useEffect } from 'react';

interface FieldReadyContextType {
  isFieldReady: boolean;
  toggleFieldReady: () => void;
}

const FieldReadyContext = createContext<FieldReadyContextType | undefined>(undefined);

export function FieldReadyProvider({ children }: { children: React.ReactNode }) {
  const [isFieldReady, setIsFieldReady] = useState(() => {
    return localStorage.getItem('fieldReadyMode') === 'true';
  });

  const toggleFieldReady = () => {
    setIsFieldReady(prev => {
      const newValue = !prev;
      localStorage.setItem('fieldReadyMode', String(newValue));
      return newValue;
    });
  };

  useEffect(() => {
    if (isFieldReady) {
      document.documentElement.classList.add('field-ready');
    } else {
      document.documentElement.classList.remove('field-ready');
    }
  }, [isFieldReady]);

  return (
    <FieldReadyContext.Provider value={{ isFieldReady, toggleFieldReady }}>
      {children}
    </FieldReadyContext.Provider>
  );
}

export function useFieldReady() {
  const context = useContext(FieldReadyContext);
  if (context === undefined) {
    throw new Error('useFieldReady must be used within a FieldReadyProvider');
  }
  return context;
}
