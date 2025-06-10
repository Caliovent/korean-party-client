// src/components/ToastNotification.tsx
import React from 'react';
import './ToastNotification.css';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  return (
    <div className={`toast toast-${toast.type}`}>
      <span className="toast-message">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="toast-close-btn"
        aria-label="Close notification" // For accessibility
      >
        &times;
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  dismissToast: (id: string) => void; // Function to remove a toast
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, dismissToast }) => {
  if (!toasts || toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
};

export default ToastContainer;
