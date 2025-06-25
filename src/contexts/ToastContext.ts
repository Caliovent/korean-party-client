import React from 'react';
import type { ToastContextType } from './ToastContext.types';

export const ToastContext = React.createContext<ToastContextType | undefined>(undefined);
import type { ToastMessage } from '../components/ToastNotification';

export interface ToastContextType {
  addToast: (message: string, type: ToastMessage['type'], duration?: number) => void;
  dismissToast: (id: string) => void;
  toasts: ToastMessage[];
}