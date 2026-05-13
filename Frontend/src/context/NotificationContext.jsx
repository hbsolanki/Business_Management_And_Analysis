import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { tokenService } from '@/services/tokenService';
import { API_BASE_URL } from '@/services/api';
import api from '@/services/api';

const NotificationContext = createContext();

const resolveNotificationSSEUrl = () => {
    return `${API_BASE_URL}/notification/stream/`;
};

export const NotificationProvider = ({ children }) => {
    const { profile: user } = useSelector((state) => state.user);
    const [notifications, setNotifications] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const abortControllerRef = useRef(null);
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

    const connectSSE = useCallback(() => {
        const token = tokenService.getAccessToken();
        if (!token) return;

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const connect = async () => {
            try {
                const response = await fetch(resolveNotificationSSEUrl(), {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    signal: abortController.signal,
                });

                if (!response.ok) {
                    throw new Error('Notification stream connection failed');
                }

                setIsConnected(true);
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop();

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                if (data.type === 'connection') {
                                    console.log('Notification SSE Connected');
                                    continue;
                                }

                                const payload = data;
                                const newNotification = typeof payload === 'string'
                                    ? {
                                        id: Date.now(),
                                        title: 'New Notification',
                                        content: payload,
                                        created_at: new Date().toISOString(),
                                        is_read: false,
                                    }
                                    : payload;

                                if (!newNotification) continue;
                                setNotifications((prev) => [newNotification, ...(Array.isArray(prev) ? prev : [])].filter(Boolean));
                            } catch (e) {
                                console.error('Error parsing notification SSE data:', e);
                            }
                        }
                    }
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.log('Notification stream aborted');
                    return;
                }
                console.error('Notification SSE Error:', error);
                setIsConnected(false);
                reconnectTimeoutRef.current = setTimeout(connect, 5000);
            }
        };

        connect();
    }, []);

    const closeSSE = useCallback(() => {
        if (abortControllerRef.current) {
            console.log('Closing Notification SSE Stream');
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        setIsConnected(false);
    }, []);


    useEffect(() => {
        const token = tokenService.getAccessToken();
        if (token && user) {
            connectSSE();
        } else {
            closeSSE();
        }

        return () => {
            // Cleanup on unmount
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [connectSSE, closeSSE, user]);

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
            connectSSE,
            closeSSE
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
