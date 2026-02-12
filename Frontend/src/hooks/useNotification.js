import { useState, useEffect, useRef, useCallback } from 'react';
import { tokenService } from '@/services/tokenService';
import { API_BASE_URL } from '@/services/api';
import api from '@/services/api';

const useNotification = () => {
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notification/');
      if (response.data && Array.isArray(response.data.results)) {
        setNotifications(response.data.results.filter(Boolean));
      } else if (Array.isArray(response.data)) {
        setNotifications(response.data.filter(Boolean));
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  }, []);

  // Initial fetch removed to support lazy loading
  // useEffect(() => {
  //   fetchNotifications();
  // }, [fetchNotifications]);

  useEffect(() => {
    const connectWebSocket = () => {
      const token = tokenService.getAccessToken();
      if (!token) return;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let wsUrl = '';

      try {
        const url = new URL(API_BASE_URL);
        const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        // wsUrl = `${protocol}//${url.host}/ws/notifications/?token=${token}`;
      } catch (e) {
        // wsUrl = `${wsProtocol}//${window.location.host}/ws/notifications/?token=${token}`;
      }

      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        console.log('Notification WebSocket Connected');
        setIsConnected(true);
      };

      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const payload =
            data && typeof data === 'object' && data.type === 'notification' && !data.message
              ? data
              : data?.type === 'notification'
                ? data.message
                : data;

          const newNotification = typeof payload === 'string'
            ? {
              id: Date.now(),
              title: 'New Notification',
              content: payload,
              created_at: new Date().toISOString(),
              is_read: false,
            }
            : payload;

          if (!newNotification) return;
          setNotifications((prev) => [newNotification, ...(Array.isArray(prev) ? prev : [])].filter(Boolean));
        } catch (error) {
          console.error('Error parsing notification message:', error);
        }
      };

      socketRef.current.onclose = () => {
        setIsConnected(false);
      };

      socketRef.current.onerror = (error) => {
        console.error('Notification WebSocket Error:', error);
        socketRef.current.close();
      };
    };

    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const markAsRead = async (id) => {
    if (!id) return;
    setNotifications((prev) =>
      (Array.isArray(prev) ? prev : []).map((n) => (n?.id === id ? { ...n, is_read: true } : n))
    );
    try {
      await api.post(`/notification/${id}/mark-read/`);
    } catch (error) {
      console.error('Failed to mark read', error);
    }
  };

  const clearNotifications = async () => {
    const ids = (Array.isArray(notifications) ? notifications : [])
      .filter((n) => n && !n.is_read)
      .map((n) => n.id)
      .filter(Boolean);

    setNotifications((prev) => (Array.isArray(prev) ? prev : []).map((n) => ({ ...n, is_read: true })));
    try {
      await api.post('/notification/bulk-mark-read/', { ids });
    } catch (error) {
      console.error('Failed to mark all read', error);
    }
  };

  const deleteNotification = async (id) => {
    if (!id) return;
    setNotifications((prev) => (Array.isArray(prev) ? prev : []).filter((n) => n?.id !== id));
    try {
      await api.delete(`/notification/${id}/`);
    } catch (error) {
      console.error('Failed to delete notification', error);
    }
  };

  return { notifications, isConnected, fetchNotifications, markAsRead, clearNotifications, deleteNotification };
};

export default useNotification;
