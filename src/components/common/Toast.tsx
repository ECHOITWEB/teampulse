import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CheckCircle, AlertCircle, AlertTriangle, 
  Info, Loader2, Wifi, WifiOff, Construction 
} from 'lucide-react';
import errorLogger from '../../utils/errorLogger';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'network' | 'not-implemented';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  metadata?: Record<string, any>;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (toast.type === 'loading' || !toast.duration) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          onClose(toast.id);
          return 0;
        }
        return prev - (100 / (toast.duration! / 100));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [toast, onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'network':
        return navigator.onLine 
          ? <Wifi className="w-5 h-5 text-green-500" />
          : <WifiOff className="w-5 h-5 text-red-500" />;
      case 'not-implemented':
        return <Construction className="w-5 h-5 text-orange-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'loading':
        return 'bg-blue-50 border-blue-200';
      case 'network':
        return navigator.onLine 
          ? 'bg-green-50 border-green-200'
          : 'bg-red-50 border-red-200';
      case 'not-implemented':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      className={`relative max-w-sm w-full bg-white rounded-lg shadow-lg border ${getStyles()} overflow-hidden`}
    >
      {/* Progress Bar */}
      {toast.duration && toast.type !== 'loading' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          
          <div className="ml-3 flex-1">
            <p className="text-sm font-semibold text-gray-900">
              {toast.title}
            </p>
            {toast.message && (
              <p className="mt-1 text-sm text-gray-600">
                {toast.message}
              </p>
            )}
            
            {/* Action Button */}
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.onClick();
                  onClose(toast.id);
                }}
                className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none"
              >
                {toast.action.label}
              </button>
            )}

            {/* Metadata (Dev Mode) */}
            {process.env.NODE_ENV === 'development' && toast.metadata && (
              <details className="mt-2">
                <summary className="text-xs text-gray-500 cursor-pointer">
                  Debug Info
                </summary>
                <pre className="mt-1 text-xs text-gray-400 overflow-x-auto">
                  {JSON.stringify(toast.metadata, null, 2)}
                </pre>
              </details>
            )}
          </div>
          
          {/* Close Button */}
          {toast.type !== 'loading' && (
            <button
              onClick={() => onClose(toast.id)}
              className="ml-4 flex-shrink-0 inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Toast Container Component
interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      <AnimatePresence>
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Toast Manager Class
class ToastManager {
  private listeners: Set<(toasts: ToastMessage[]) => void> = new Set();
  private toasts: ToastMessage[] = [];

  subscribe(listener: (toasts: ToastMessage[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  private add(toast: ToastMessage) {
    this.toasts = [...this.toasts, toast];
    this.notify();

    // Log to error logger
    if (toast.type === 'error') {
      errorLogger.error(`Toast: ${toast.title}`, undefined, {
        component: 'Toast',
        action: 'show',
        metadata: {
          type: toast.type,
          message: toast.message,
          ...toast.metadata
        }
      });
    } else if (toast.type === 'warning') {
      errorLogger.warning(`Toast: ${toast.title}`, {
        component: 'Toast',
        action: 'show',
        metadata: {
          type: toast.type,
          message: toast.message,
          ...toast.metadata
        }
      });
    } else {
      errorLogger.info(`Toast: ${toast.title}`, {
        component: 'Toast',
        action: 'show',
        metadata: {
          type: toast.type,
          message: toast.message,
          ...toast.metadata
        }
      });
    }

    return toast.id;
  }

  remove(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notify();
  }

  success(title: string, message?: string, duration = 3000) {
    return this.add({
      id: Date.now().toString(),
      type: 'success',
      title,
      message,
      duration
    });
  }

  error(title: string, message?: string, duration = 5000, metadata?: Record<string, any>) {
    return this.add({
      id: Date.now().toString(),
      type: 'error',
      title,
      message,
      duration,
      metadata
    });
  }

  warning(title: string, message?: string, duration = 4000) {
    return this.add({
      id: Date.now().toString(),
      type: 'warning',
      title,
      message,
      duration
    });
  }

  info(title: string, message?: string, duration = 3000) {
    return this.add({
      id: Date.now().toString(),
      type: 'info',
      title,
      message,
      duration
    });
  }

  loading(title: string, message?: string) {
    return this.add({
      id: Date.now().toString(),
      type: 'loading',
      title,
      message
    });
  }

  networkStatus(isOnline: boolean) {
    return this.add({
      id: 'network-status',
      type: 'network',
      title: isOnline ? '인터넷 연결됨' : '인터넷 연결 끊김',
      message: isOnline 
        ? '인터넷 연결이 복구되었습니다.' 
        : '인터넷 연결을 확인해주세요.',
      duration: 3000
    });
  }

  notImplemented(feature: string, description?: string) {
    return this.add({
      id: Date.now().toString(),
      type: 'not-implemented',
      title: '준비 중인 기능입니다',
      message: description || `"${feature}" 기능은 현재 개발 중입니다.`,
      duration: 4000,
      action: {
        label: '알림 받기',
        onClick: () => {
          errorLogger.info('User requested notification for feature', {
            component: 'Toast',
            metadata: { feature }
          });
        }
      }
    });
  }

  clear() {
    this.toasts = [];
    this.notify();
  }
}

// Singleton instance
export const toastManager = new ToastManager();

// React Hook
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return toastManager.subscribe(setToasts);
  }, []);

  return {
    toasts,
    remove: toastManager.remove.bind(toastManager),
    success: toastManager.success.bind(toastManager),
    error: toastManager.error.bind(toastManager),
    warning: toastManager.warning.bind(toastManager),
    info: toastManager.info.bind(toastManager),
    loading: toastManager.loading.bind(toastManager),
    networkStatus: toastManager.networkStatus.bind(toastManager),
    notImplemented: toastManager.notImplemented.bind(toastManager),
    clear: toastManager.clear.bind(toastManager)
  };
};

export default Toast;