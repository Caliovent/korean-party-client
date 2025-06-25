import { useContext } from 'react';
import { ToastContext, type ToastContextType } from './ToastContext';
// ToastContextType is now also exported from ToastContext.tsx

export const useToasts = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToasts must be used within a ToastProvider');
  }
  return context as ToastContextType;
};