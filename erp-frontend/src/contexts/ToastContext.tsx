import './ToastContext.css';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Global reference to addToast callback to intercept window.alert
let globalAddToast: ((message: string, type: Toast['type']) => void) | null = null;

// Override window.alert
if (typeof window !== 'undefined') {
  window.alert = (message: any) => {
    const msgString = String(message);
    const lower = msgString.toLowerCase();
    
    let type: Toast['type'] = 'info';
    if (lower.includes('error') || lower.includes('failed') || lower.includes('invalid') || lower.includes('must be') || lower.includes('cannot') || lower.includes('denied')) {
      type = 'error';
    } else if (lower.includes('success') || lower.includes('saved') || lower.includes('completed') || lower.includes('updated') || lower.includes('added') || lower.includes('created')) {
      type = 'success';
    } else if (lower.includes('warning') || lower.includes('attention') || lower.includes('confirm') || lower.includes('sure')) {
      type = 'warning';
    }

    if (globalAddToast) {
      globalAddToast(msgString, type);
    } else {
      // Fallback if provider not mounted
      console.log(`[ALERT Interceptor]: ${msgString}`);
    }
  };
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: Toast['type'], duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  // Set global reference for window.alert interceptor
  useEffect(() => {
    globalAddToast = (message: string, type: Toast['type']) => {
      addToast(message, type);
    };
    return () => {
      globalAddToast = null;
    };
  }, [addToast]);

  const success = useCallback((message: string, duration?: number) => {
    addToast(message, 'success', duration);
  }, [addToast]);

  const error = useCallback((message: string, duration?: number) => {
    addToast(message, 'error', duration);
  }, [addToast]);

  const warning = useCallback((message: string, duration?: number) => {
    addToast(message, 'warning', duration);
  }, [addToast]);

  const info = useCallback((message: string, duration?: number) => {
    addToast(message, 'info', duration);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, success, error, warning, info }}>
      {children}
      {/* Toast container */}
      <div className="toast-context-col-1">
        {toasts.map((toast) => {
          const config = {
            success: { bg: '#e6fffa', border: '#319795', color: '#234e52', icon: CheckCircle },
            error: { bg: '#fff5f5', border: '#e53e3e', color: '#742a2a', icon: AlertCircle },
            warning: { bg: '#fffaf0', border: '#dd6b20', color: '#7b341e', icon: AlertTriangle },
            info: { bg: '#ebf8ff', border: '#3182ce', color: '#2b6cb0', icon: Info }
          }[toast.type];

          const IconComponent = config.icon;

          return (
            <div
              key={toast.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: '8px',
                borderLeft: `5px solid ${config.border}`,
                backgroundColor: config.bg,
                color: config.color,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                animation: 'toast-slide-in 0.3s ease-out forwards',
                fontSize: '0.85rem',
                fontWeight: 600,
                position: 'relative'
              }}
            >
              <IconComponent size={18} className="toast-context-IconComponent-2"  />
              <div className="toast-context-div-3">{toast.message}</div>
              <button onClick={() => removeToast(toast.id)} className="toast-context-row-4">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
