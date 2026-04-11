import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { tokenService } from '@/services/tokenService';
import { API_BASE_URL } from '@/services/api';
import api from '@/services/api';

const NotificationContext = createContext();

const resolveNotificationWsUrl = (token) => {
    const fallbackProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const fallbackHost = window.location.host;

    try {
        const parsed = new URL(API_BASE_URL, window.location.origin);
        const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
        const baseHost = ['0.0.0.0', '::', '[::]'].includes(parsed.hostname)
            ? window.location.hostname
            : parsed.hostname;
        const host = `${baseHost}${parsed.port ? `:${parsed.port}` : ''}`;
        return `${protocol}//${host}/ws/notifications/?token=${token}`;
    } catch {
        return `${fallbackProtocol}//${fallbackHost}/ws/notifications/?token=${token}`;
    }
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

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

    const connectWebSocket = useCallback(() => {
        const token = tokenService.getAccessToken();
        if (!token) return;

        if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
            return;
        }

        const wsUrl = resolveNotificationWsUrl(token);
        socketRef.current = new WebSocket(wsUrl);

        socketRef.current.onopen = () => {
            console.log('Notification WebSocket Connected (Global)');
            setIsConnected(true);
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
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

        socketRef.current.onclose = (event) => {
            console.log('Notification WebSocket Closed', event.code);
            setIsConnected(false);
            // Reconnect if not explicitly closed and user is still logged in
            if (event.code !== 1000 && tokenService.getAccessToken()) {
                reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
            }
        };

        socketRef.current.onerror = (error) => {
            console.error('Notification WebSocket Error:', error);
            socketRef.current.close();
        };
    }, []);

    const closeWebSocket = useCallback(() => {
        if (socketRef.current) {
            console.log('Explicitly closing Notification WebSocket');
            socketRef.current.close(1000, 'User logged out');
            socketRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        setIsConnected(false);
    }, []);

    const { profile: user } = useSelector((state) => state.user);

    useEffect(() => {
        const token = tokenService.getAccessToken();
        if (token && user) {
            connectWebSocket();
        } else {
            closeWebSocket();
        }

        return () => {
            // No-op here because we handle closing in the else branch and in specific logout flows
        };
    }, [connectWebSocket, closeWebSocket, user]);

    const markAsRead = async (id) => {
        if (!id) return;
        
        // Find the notification in state to check its current status
        const notification = (Array.isArray(notifications) ? notifications : []).find(n => n?.id === id);
        
        // If already read, don't send API request
        if (notification?.is_read) return;

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

        // If no unread notifications, don't send API request
        if (ids.length === 0) return;

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

    const bulkDeleteNotifications = async () => {
        const ids = (Array.isArray(notifications) ? notifications : [])
            .map((n) => n.id)
            .filter(Boolean);

        setNotifications([]);
        try {
            await api.post('/notification/bulk-delete/', { ids });
        } catch (error) {
            console.error('Failed to bulk delete notifications', error);
        }
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            isConnected,
            fetchNotifications,
            markAsRead,
            clearNotifications,
            deleteNotification,
            bulkDeleteNotifications,
            connectWebSocket,
            closeWebSocket
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotificationContext = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotificationContext must be used within a NotificationProvider');
    }
    return context;
};
