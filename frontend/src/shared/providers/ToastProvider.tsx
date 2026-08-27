import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import ToastComponent from '../components/Toast';
import type { Toast } from '../components/Toast';
import {
  RATE_LIMIT_EVENT,
  type RateLimitEventDetail,
} from '../../utils/common/interceptor';

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    setToasts((prev) => {
      // Deduplicate: skip if an identical toast (same type, title, message) is already visible
      const isDuplicate = prev.some(
        (t) =>
          t.type === toast.type &&
          t.title === toast.title &&
          t.message === toast.message,
      );
      if (isDuplicate) return prev;
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newToast: Toast = { ...toast, id };
      return [...prev, newToast];
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showSuccess = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'success', title, message });
    },
    [addToast],
  );

  const showError = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'error', title, message });
    },
    [addToast],
  );

  const showWarning = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'warning', title, message });
    },
    [addToast],
  );

  const showInfo = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'info', title, message });
    },
    [addToast],
  );

  // Bridges the plain-fetch interceptor (utils/common/interceptor.ts) — which runs outside React
  // and has no access to this context — to the toast UI, so a 429 from any API call surfaces a
  // friendly, Retry-After-aware message instead of only whatever generic error the calling
  // component's own catch block shows.
  useEffect(() => {
    const handleRateLimited = (event: Event): void => {
      const { detail } = event as CustomEvent<RateLimitEventDetail>;
      addToast({
        type: 'warning',
        title: 'Too many requests',
        message: detail.message,
        duration: 6000,
      });
    };

    window.addEventListener(RATE_LIMIT_EVENT, handleRateLimited);
    return () => {
      window.removeEventListener(RATE_LIMIT_EVENT, handleRateLimited);
    };
  }, [addToast]);

  const value: ToastContextType = {
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast Container - Centered at top */}
      <div className="fixed top-0 left-1/2 transform -translate-x-1/2 z-[100] pt-6 space-y-4 pointer-events-none w-full max-w-md">
        {toasts.map((toast) => (
          <ToastComponent key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
