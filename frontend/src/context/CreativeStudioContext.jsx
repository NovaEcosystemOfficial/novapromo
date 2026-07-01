import { createContext, useContext, useState, useCallback } from 'react';

const CreativeStudioContext = createContext(null);

export function CreativeStudioProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefill, setPrefill] = useState(null);

  const openCreativeStudio = useCallback((initial = null) => {
    setPrefill(initial);
    setIsOpen(true);
  }, []);

  const closeCreativeStudio = useCallback(() => {
    setIsOpen(false);
    setPrefill(null);
  }, []);

  return (
    <CreativeStudioContext.Provider value={{ isOpen, prefill, openCreativeStudio, closeCreativeStudio }}>
      {children}
    </CreativeStudioContext.Provider>
  );
}

export function useCreativeStudio() {
  const ctx = useContext(CreativeStudioContext);
  if (!ctx) throw new Error('useCreativeStudio must be used within CreativeStudioProvider');
  return ctx;
}
