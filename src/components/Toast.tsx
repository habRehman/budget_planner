import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 size={20} className="toast-icon text-success" />,
    error: <AlertCircle size={20} className="toast-icon text-danger" />,
    info: <Info size={20} className="toast-icon text-accent" />,
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`toast-container toast-${toast.type}`}
    >
      <div className="toast-content">
        {icons[toast.type]}
        <span className="toast-text">{toast.text}</span>
      </div>
      <button
        type="button"
        className="toast-close"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};
