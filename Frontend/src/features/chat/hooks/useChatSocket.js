import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE_URL } from '@/services/api';

export const useChatSocket = (conversationId, token, otherUserId) => {
    const [typingUser, setTypingUser] = useState(null);
    const [userStatus, setUserStatus] = useState("offline");
    const [socketMessages, setSocketMessages] = useState([]);

    const socketRef = useRef(null);
    const heartbeatRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const connect = useCallback(() => {
        if (!conversationId || !token) return;

        if (socketRef.current) {
            socketRef.current.close();
        }
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }

        const wsProtocol = API_BASE_URL.startsWith("https") ? "wss" : "ws";
        const wsHost = API_BASE_URL.replace(/^https?:\/\//, "");
        const wsUrl = `${wsProtocol}://${wsHost}/ws/chat/${conversationId}/?token=${token}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            heartbeatRef.current = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: "ping" }));
                }
            }, 30000);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === "typing") {
                    if (otherUserId && String(data.user_id) === String(otherUserId)) {
                        setTypingUser(data.user_id);
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
                    }
                    return;
                }

                if (data.type === "user_status") {
                    if (otherUserId && String(data.user_id) === String(otherUserId)) {
                        setUserStatus(data.status);
                    }
                    return;
                }

                const hasMessagePayload =
                    Boolean(data?.text) ||
                    Boolean(data?.media_url) ||
                    Boolean(data?.file) ||
                    (data?.message && typeof data.message === "object") ||
                    (data?.data && typeof data.data === "object") ||
                    data?.type === "chat_message";

                if (hasMessagePayload) {
                    setSocketMessages(prev => [...prev, data]);
                }
            } catch (err) {
                console.error("WebSocket message parse error", err);
            }
        };

        ws.onclose = () => {
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            heartbeatRef.current = null;
            typingTimeoutRef.current = null;
        };

        ws.onerror = (error) => {
            console.error("WebSocket Error", error);
        };

        socketRef.current = ws;
    }, [conversationId, token, otherUserId]);

    useEffect(() => {
        connect();
        return () => {
            if (socketRef.current) socketRef.current.close();
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [connect]);

    const sendMessage = useCallback((message) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ message }));
            return true;
        }
        return false;
    }, []);

    const sendTyping = useCallback(() => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: "typing" }));
        }
    }, []);

    return {
        typingUser,
        userStatus,
        socketMessages,
        sendMessage,
        sendTyping,
        setSocketMessages
    };
};
