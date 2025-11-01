'use client';

import { createContext, useContext, ReactNode } from 'react';
import { NotificationModal, useNotification, NotificationConfig } from '@/components/ui/notification-modal';

interface NotificationContextType {
  success: (title: string, description?: string, autoClose?: number) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string, autoClose?: number) => void;
  loading: (title: string, description?: string) => void;
  confirm: (
    title: string,
    description?: string,
    onConfirm?: () => void | Promise<void>,
    confirmText?: string,
    cancelText?: string
  ) => void;
  showNotification: (config: NotificationConfig) => void;
  hideNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const {
    notification,
    showNotification,
    hideNotification,
    success,
    error,
    warning,
    info,
    loading,
    confirm
  } = useNotification();

  return (
    <NotificationContext.Provider
      value={{
        success,
        error,
        warning,
        info,
        loading,
        confirm,
        showNotification,
        hideNotification
      }}
    >
      {children}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={hideNotification}
        config={notification.config}
      />
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}
