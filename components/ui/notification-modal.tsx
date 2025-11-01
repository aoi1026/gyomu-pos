'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, XCircle, AlertTriangle, Info, 
  AlertCircle, X, Loader2
} from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'confirm';

export interface NotificationConfig {
  type: NotificationType;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  autoClose?: number; // milliseconds
  showCancel?: boolean;
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: NotificationConfig;
}

export function NotificationModal({ isOpen, onClose, config }: NotificationModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && config.autoClose && config.type !== 'confirm') {
      setTimeLeft(Math.floor(config.autoClose / 1000));
      
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev && prev > 1) {
            return prev - 1;
          } else {
            onClose();
            return null;
          }
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isOpen, config.autoClose, config.type, onClose]);

  const handleConfirm = async () => {
    if (config.onConfirm) {
      setIsProcessing(true);
      try {
        await config.onConfirm();
        onClose();
      } catch (error) {
        console.error('Confirmation action failed:', error);
      } finally {
        setIsProcessing(false);
      }
    } else {
      onClose();
    }
  };

  const handleCancel = () => {
    if (config.onCancel) {
      config.onCancel();
    }
    onClose();
  };

  const getIcon = () => {
    switch (config.type) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-600" />;
      case 'loading':
        return <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />;
      case 'confirm':
        return <AlertCircle className="w-6 h-6 text-orange-600" />;
      default:
        return <Info className="w-6 h-6 text-blue-600" />;
    }
  };

  const getHeaderColor = () => {
    switch (config.type) {
      case 'success':
        return 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200';
      case 'error':
        return 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200';
      case 'warning':
        return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200';
      case 'info':
        return 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200';
      case 'loading':
        return 'bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200';
      case 'confirm':
        return 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200';
      default:
        return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200';
    }
  };

  const getTypeText = () => {
    switch (config.type) {
      case 'success':
        return '成功';
      case 'error':
        return 'エラー';
      case 'warning':
        return '警告';
      case 'info':
        return '情報';
      case 'loading':
        return '処理中';
      case 'confirm':
        return '確認';
      default:
        return '通知';
    }
  };

  const getTypeColor = () => {
    switch (config.type) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'loading':
        return 'bg-purple-100 text-purple-800';
      case 'confirm':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className={`${getHeaderColor()} -m-6 mb-4 p-6 border-b`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getIcon()}
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  {config.title}
                </DialogTitle>
                <Badge variant="secondary" className={`${getTypeColor()} text-xs mt-1`}>
                  {getTypeText()}
                </Badge>
              </div>
            </div>
            {timeLeft && (
              <div className="flex items-center space-x-2">
                <div className="text-xs text-gray-500">
                  {timeLeft}秒後に自動で閉じます
                </div>
                <div className="w-8 h-8 relative">
                  <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                    <circle
                      cx="16"
                      cy="16"
                      r="14"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      className="text-gray-200"
                    />
                    <circle
                      cx="16"
                      cy="16"
                      r="14"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 14}`}
                      strokeDashoffset={`${2 * Math.PI * 14 * (1 - (timeLeft / (config.autoClose! / 1000)))}`}
                      className="text-purple-600 transition-all duration-1000 ease-linear"
                    />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </DialogHeader>

        {config.description && (
          <DialogDescription className="text-gray-600 leading-relaxed mb-6">
            {config.description}
          </DialogDescription>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          {(config.type === 'confirm' || config.showCancel) && (
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing}
              className="min-w-[80px]"
            >
              {config.cancelText || 'キャンセル'}
            </Button>
          )}
          
          {config.type !== 'loading' && (
            <Button
              onClick={handleConfirm}
              disabled={isProcessing}
              className={`min-w-[80px] ${
                config.type === 'error' ? 'bg-red-600 hover:bg-red-700' :
                config.type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                config.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                config.type === 'confirm' ? 'bg-orange-600 hover:bg-orange-700' :
                'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  処理中...
                </div>
              ) : (
                config.confirmText || 'OK'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for managing notifications
export function useNotification() {
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    config: NotificationConfig;
  }>({
    isOpen: false,
    config: { type: 'info', title: '' }
  });

  const showNotification = (config: NotificationConfig) => {
    setNotification({
      isOpen: true,
      config
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  // Convenience methods
  const success = (title: string, description?: string, autoClose = 3000) => {
    showNotification({
      type: 'success',
      title,
      description,
      autoClose
    });
  };

  const error = (title: string, description?: string) => {
    showNotification({
      type: 'error',
      title,
      description
    });
  };

  const warning = (title: string, description?: string) => {
    showNotification({
      type: 'warning',
      title,
      description
    });
  };

  const info = (title: string, description?: string, autoClose = 5000) => {
    showNotification({
      type: 'info',
      title,
      description,
      autoClose
    });
  };

  const loading = (title: string, description?: string) => {
    showNotification({
      type: 'loading',
      title,
      description
    });
  };

  const confirm = (
    title: string,
    description?: string,
    onConfirm?: () => void | Promise<void>,
    confirmText = '確認',
    cancelText = 'キャンセル'
  ) => {
    showNotification({
      type: 'confirm',
      title,
      description,
      onConfirm,
      confirmText,
      cancelText,
      showCancel: true
    });
  };

  return {
    notification,
    showNotification,
    hideNotification,
    success,
    error,
    warning,
    info,
    loading,
    confirm
  };
}
