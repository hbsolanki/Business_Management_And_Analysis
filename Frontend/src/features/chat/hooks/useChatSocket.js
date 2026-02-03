import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE_URL } from '@/services/api';

export const useChatSocket = (conversationId, token, currentUserId, otherUserId) => {
    const [isConnected, setIsConnected] = useState(false);
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

        const wsProtocol = API_BASE_URL.startsWith("https") ? "wss" : "ws";
        const wsHost = API_BASE_URL.replace(/^https?:\/\//, "");
        const wsUrl = `${wsProtocol}://${wsHost}/ws/chat/${conversationId}/?token=${token}`;

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log("WebSocket Connected");
            setIsConnected(true);

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
                    console.log("other id user ", otherUserId);
                    if (otherUserId && String(data.user_id) === String(otherUserId)) {
                        console.log("data user ", data);
                        console.log("currentUserId Status Updated", currentUserId);
                        setUserStatus(data.status);
                    }
                    return;
                }

                if (data.type === "chat_message" || data.message || data.text) {
                    setSocketMessages(prev => [...prev, data]);
                }
            } catch (err) {
                console.error("WebSocket message parse error", err);
            }
        };

        ws.onclose = () => {
            console.log("WebSocket Disconnected");
            setIsConnected(false);
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };

        ws.onerror = (error) => {
            console.error("WebSocket Error", error);
            setIsConnected(false);
        };

        socketRef.current = ws;
    }, [conversationId, token, currentUserId]);

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
        isConnected,
        typingUser,
        userStatus,
        socketMessages,
        sendMessage,
        sendTyping,
        setSocketMessages
    };
};
