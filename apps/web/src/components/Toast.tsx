import React, { useEffect, useState, createContext, useContext, useCallback } from 'react';

// ============================================================
// Toast Types
// ============================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
}

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

// ============================================================
// Toast Context
// ============================================================

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ============================================================
// Toast Provider
// ============================================================

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastMessage = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
      dismissible: toast.dismissible ?? true,
    };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => removeToast(id), newToast.duration);
    }
    
    return id;
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  }, [addToast]);

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message, duration: 8000 }); // Longer for errors
  }, [addToast]);

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message });
  }, [addToast]);

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// ============================================================
// Toast Container
// ============================================================

function ToastContainer({ toasts, onRemove }: { toasts: ToastMessage[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
      <style>{`
        .toast-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 420px;
          pointer-events: none;
        }
        
        @media (max-width: 480px) {
          .toast-container {
            left: 12px;
            right: 12px;
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// Toast Item
// ============================================================

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const icons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  const gradients: Record<ToastType, string> = {
    success: 'var(--success-gradient)',
    error: 'var(--danger-gradient)',
    warning: 'var(--warning-gradient)',
    info: 'var(--accent-gradient)',
  };

  const glows: Record<ToastType, string> = {
    success: 'var(--success-glow)',
    error: 'var(--danger-glow)',
    warning: 'rgba(251, 191, 36, 0.3)',
    info: 'var(--accent-glow)',
  };

  return (
    <div className={`toast-item toast-${toast.type} ${isExiting ? 'toast-exit' : 'toast-enter'}`}>
      <div className="toast-icon">{icons[toast.type]}</div>
      <div className="toast-content">
        <div className="toast-title">{toast.title}</div>
        {toast.message && <div className="toast-message">{toast.message}</div>}
      </div>
      {toast.dismissible && (
        <button className="toast-close" onClick={handleClose}>
          ×
        </button>
      )}
      <div className="toast-progress" />
      <style>{`
        .toast-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border: 1px solid var(--border-glass-light);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          pointer-events: auto;
          position: relative;
          overflow: hidden;
        }
        
        .toast-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: ${gradients[toast.type]};
        }
        
        .toast-enter {
          animation: toastSlideIn 0.3s ease-out forwards;
        }
        
        .toast-exit {
          animation: toastSlideOut 0.3s ease-in forwards;
        }
        
        @keyframes toastSlideIn {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes toastSlideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(120%);
            opacity: 0;
          }
        }
        
        .toast-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: ${gradients[toast.type]};
          color: white;
          font-size: 14px;
          font-weight: 700;
          flex-shrink: 0;
          box-shadow: 0 0 20px ${glows[toast.type]};
        }
        
        .toast-content {
          flex: 1;
          min-width: 0;
        }
        
        .toast-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.4;
        }
        
        .toast-message {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 4px;
          line-height: 1.4;
        }
        
        .toast-close {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 20px;
          line-height: 1;
          padding: 0;
          cursor: pointer;
          transition: color 0.2s;
          flex-shrink: 0;
        }
        
        .toast-close:hover {
          color: var(--text-primary);
        }
        
        .toast-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 2px;
          background: ${gradients[toast.type]};
          animation: toastProgress ${toast.duration || 5000}ms linear forwards;
        }
        
        @keyframes toastProgress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

export default ToastProvider;
