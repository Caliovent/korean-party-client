// src/contexts/ToastContext.tsx
import React, {  useState, useCallback, type ReactNode, useEffect } from 'react';
import { type ToastMessage } from '../components/ToastNotification'; // Assuming path is correct

export interface ToastContextType {
  addToast: (message: string, type: ToastMessage['type'], duration?: number) => void;
  dismissToast: (id: string) => void;
  toasts: ToastMessage[];
}

interface ToastProviderProps {
  children: ReactNode;
}

import { ToastContext } from './ToastContext'; // Import from new file

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [timeoutIds, setTimeoutIds] = useState<NodeJS.Timeout[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    // Optional: Clear the specific timeout if a toast is dismissed early by the user
    // This requires storing timeout IDs mapped to toast IDs. For simplicity, current auto-dismissal
    // will still run its course but won't find the toast.
  }, []);

  const addToast = useCallback((message: string, type: ToastMessage['type'], duration: number = 5000) => {
    const id = Math.random().toString(36).substring(2, 9); // .substr is deprecated
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);

    if (duration > 0) { // Allow duration 0 or negative to mean no auto-dismiss
      const timerId = setTimeout(() => {
        dismissToast(id);
        setTimeoutIds(prevIds => prevIds.filter(tid => tid !== timerId));
      }, duration);
      setTimeoutIds(prevIds => [...prevIds, timerId]);
    }
  }, [dismissToast]); // Added dismissToast to dependency array

  // Clear all timeouts on unmount
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
