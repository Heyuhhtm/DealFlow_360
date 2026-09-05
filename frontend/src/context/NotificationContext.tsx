import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getSocket, connectAndAuthenticate, joinQuotationRoom } from '../lib/socket';
import { quotationsApi } from '../services/api';
import { QuotationListItem } from '../types';

export interface AlertNotification {
  id: string;
  title: string;
  description: string;
  targetTab: string;
  colorClass: string;
  read: boolean;
  quotationId?: string;
  createdAt: Date;
}

export interface ToastAlert {
  id: string;
  quotationId: string;
  author: string;
  message: string;
  timestamp: Date;
}

interface NotificationContextType {
  notifications: AlertNotification[];
  unreadCount: number;
  activeQuotationId: string | null;
  setActiveQuotationId: (id: string | null) => void;
  clearQuotationNotifications: (quotationId: string) => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
  markAllAsRead: () => void;
  toast: ToastAlert | null;
  dismissToast: () => void;
  targetQuotationToOpen: string | null;
  setTargetQuotationToOpen: (id: string | null) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{
  children: React.ReactNode;
  onNavigateTab?: (tab: string) => void;
}> = ({ children, onNavigateTab }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<AlertNotification[]>([
    {
      id: 'seed-notif-1',
      title: 'Approval Required (High Risk)',
      description: 'Apex Enterprises discount overage exceeds threshold (>5%).',
      targetTab: 'approvals',
      colorClass: 'text-blue-700',
      read: true,
      createdAt: new Date(),
    },
    {
      id: 'seed-notif-2',
      title: 'Stalled Deal Alert',
      description: 'Stark Logistics quotation inactive for 7+ days. Automated nudge ready.',
      targetTab: 'dealhealth',
      colorClass: 'text-amber-600',
      read: true,
      createdAt: new Date(),
    },
  ]);

  const [activeQuotationId, setActiveQuotationId] = useState<string | null>(null);
  const activeQuotationIdRef = useRef<string | null>(null);
  activeQuotationIdRef.current = activeQuotationId;

  const [toast, setToast] = useState<ToastAlert | null>(null);
  const toastTimeoutRef = useRef<any>(null);
  const [targetQuotationToOpen, setTargetQuotationToOpen] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Global socket subscription for internal staff
  useEffect(() => {
    if (!token || !user) {
      return;
    }

    const socket = connectAndAuthenticate(token);

    // Fetch rep's active quotations (excluding confirmed & rejected) and join their rooms
    let isCancelled = false;
    const joinActiveQuotations = async () => {
      try {
        const quotes: QuotationListItem[] = await quotationsApi.list();
        if (isCancelled) return;

        const activeQuotes = quotes.filter(
          (q) => q.status !== 'CONFIRMED' && q.status !== 'REJECTED'
        );

        activeQuotes.forEach((q) => {
          joinQuotationRoom(q.id);
        });

        console.log(`[Global Socket] Joined ${activeQuotes.length} active quotation rooms`);
      } catch (err) {
        console.warn('[Global Socket] Failed to fetch active quotations for room subscription:', err);
      }
    };

    joinActiveQuotations();

    // Global listener for "new-message"
    const handleGlobalNewMessage = (data: any) => {
      if (!data || !data.quotationId) return;

      // If rep is currently viewing this exact quotation's negotiation thread, do not alert
      if (activeQuotationIdRef.current === data.quotationId) {
        return;
      }

      // If message is sent by the currently logged-in user, ignore
      const author = data.author || '';
      if (user.email && author.toLowerCase().includes(user.email.toLowerCase())) {
        return;
      }

      const quoteShort = data.quotationId.slice(0, 8);
      const notifId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      const newAlert: AlertNotification = {
        id: notifId,
        title: `New Message (${author || 'Customer'})`,
        description: `Quote #${quoteShort}: "${(data.message || '').slice(0, 50)}${
          (data.message || '').length > 50 ? '...' : ''
        }"`,
        targetTab: 'quotations',
        colorClass: 'text-blue-600',
        read: false,
        quotationId: data.quotationId,
        createdAt: new Date(),
      };

      setNotifications((prev) => [newAlert, ...prev]);

      // Pop floating toast
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }

      setToast({
        id: notifId,
        quotationId: data.quotationId,
        author: author || 'Customer',
        message: data.message || '',
        timestamp: new Date(),
      });

      toastTimeoutRef.current = setTimeout(() => {
        setToast(null);
      }, 7000);
    };

    // Global listener for "counter-discount-proposed"
    const handleGlobalCounterDiscount = (data: any) => {
      if (!data) return;

      const qId = data.quotationId;
      if (activeQuotationIdRef.current === qId) {
        return;
      }

      const quoteShort = qId ? qId.slice(0, 8) : 'Deal';
      const notifId = `counter-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      const newAlert: AlertNotification = {
        id: notifId,
        title: `⚡ Counter-Discount Proposed (${data.proposedDiscountPercent}%)`,
        description: `Quote #${quoteShort}: ${data.justification || 'Discount adjustment requested'}`,
        targetTab: 'quotations',
        colorClass: 'text-amber-600',
        read: false,
        quotationId: qId,
        createdAt: new Date(),
      };

      setNotifications((prev) => [newAlert, ...prev]);

      // Pop floating toast
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }

      setToast({
        id: notifId,
        quotationId: qId,
        author: 'Customer Proposal',
        message: `Proposed ${data.proposedDiscountPercent}% discount: "${data.justification || 'Counter-offer'}"`,
        timestamp: new Date(),
      });

      toastTimeoutRef.current = setTimeout(() => {
        setToast(null);
      }, 8000);
    };

    socket.on('new-message', handleGlobalNewMessage);
    socket.on('counter-discount-proposed', handleGlobalCounterDiscount);

    return () => {
      isCancelled = true;
      socket.off('new-message', handleGlobalNewMessage);
      socket.off('counter-discount-proposed', handleGlobalCounterDiscount);
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [token, user]);

  const clearQuotationNotifications = (quotationId: string) => {
    if (!quotationId) return;
    setNotifications((prev) =>
      prev.map((n) => (n.quotationId === quotationId ? { ...n, read: true } : n))
    );
    if (toast?.quotationId === quotationId) {
      setToast(null);
    }
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const dismissToast = () => {
    setToast(null);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        activeQuotationId,
        setActiveQuotationId,
        clearQuotationNotifications,
        dismissNotification,
        clearAllNotifications,
        markAllAsRead,
        toast,
        dismissToast,
        targetQuotationToOpen,
        setTargetQuotationToOpen,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
