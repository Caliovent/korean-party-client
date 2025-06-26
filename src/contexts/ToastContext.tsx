// src/contexts/ToastContext.tsx
import React, { useState, useCallback, type ReactNode, useEffect, createContext } from 'react';
import type { ToastMessage } from '../components/ToastNotification'; // Assuming path is correct

// Define ToastContextType here
export interface ToastContextType {
  addToast: (message: string, type: ToastMessage['type'], duration?: number) => void;
  dismissToast: (id: string) => void;
  toasts: ToastMessage[];
}

// Create the context here
export const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [timeoutIds, setTimeoutIds] = useState<NodeJS.Timeout[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastMessage['type'], duration: number = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);

    if (duration > 0) {
      const timerId = setTimeout(() => {
        dismissToast(id);
        setTimeoutIds(prevIds => prevIds.filter(tid => tid !== timerId));
      }, duration);
      setTimeoutIds(prevIds => [...prevIds, timerId]);
    }
  }, [dismissToast]);

  useEffect(() => {
    return () => {
      timeoutIds.forEach(clearTimeout);
    };
  }, [timeoutIds]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
};

// Custom hook to use the ToastContext
export const useToasts = (): ToastContextType => {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToasts must be used within a ToastProvider');
  }
  return context;
};
