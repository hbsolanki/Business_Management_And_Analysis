import { useNotificationContext } from '@/context/NotificationContext';

const useNotification = () => {
  const context = useNotificationContext();

  return {
    notifications: context.notifications,
    isConnected: context.isConnected,
    fetchNotifications: context.fetchNotifications,
    markAsRead: context.markAsRead,
    clearNotifications: context.clearNotifications,
    deleteNotification: context.deleteNotification,
    bulkDeleteNotifications: context.bulkDeleteNotifications,
    connectWebSocket: context.connectWebSocket
  };
};

export default useNotification;
