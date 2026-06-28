import { createContext, useContext, useState, useCallback } from 'react';

const ContentModalContext = createContext(null);

export function ContentModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefill, setPrefill] = useState(null);

  const openModal = useCallback((initial = null) => {
    setPrefill(initial);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setPrefill(null);
  }, []);

  return (
    <ContentModalContext.Provider value={{ isOpen, prefill, openModal, closeModal }}>
      {children}
    </ContentModalContext.Provider>
  );
}

export function useContentModal() {
  const ctx = useContext(ContentModalContext);
  if (!ctx) throw new Error('useContentModal must be used within ContentModalProvider');
  return ctx;
}
