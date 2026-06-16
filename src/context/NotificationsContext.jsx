import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '../api';

const NotificationsContext = createContext({
  unreadCount: 0,
  refreshUnreadNotifications: async () => {},
  syncUnreadFromList: () => {},
  markNotificationReadLocal: () => {},
  markAllNotificationsReadLocal: () => {},
});

export function NotificationsProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const syncUnreadFromList = useCallback((notifications) => {
    const unread = Array.isArray(notifications)
      ? notifications.filter((item) => !item.read_at).length
      : 0;
    setUnreadCount(unread);
  }, []);

  const refreshUnreadNotifications = useCallback(async () => {
    try {
      const data = await api.fetchNotifications();
      syncUnreadFromList(data);
    } catch (error) {
      setUnreadCount(0);
    }
  }, [syncUnreadFromList]);

  const markNotificationReadLocal = useCallback((notification) => {
    if (!notification?.read_at) {
      setUnreadCount((current) => Math.max(0, current - 1));
    }
  }, []);

  const markAllNotificationsReadLocal = useCallback(() => {
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    refreshUnreadNotifications();
    const interval = setInterval(refreshUnreadNotifications, 30000);
    return () => clearInterval(interval);
  }, [refreshUnreadNotifications]);

  const value = useMemo(() => ({
    unreadCount,
    refreshUnreadNotifications,
    syncUnreadFromList,
    markNotificationReadLocal,
    markAllNotificationsReadLocal,
  }), [
    markAllNotificationsReadLocal,
    markNotificationReadLocal,
    refreshUnreadNotifications,
    syncUnreadFromList,
    unreadCount,
  ]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
