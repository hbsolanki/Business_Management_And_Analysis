import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/services/api";
import { tokenService } from "@/services/tokenService";

const resolveActivityWsUrl = (token) => {
    const fallbackProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const fallbackHost = window.location.host;

    try {
        const wsProtocol = API_BASE_URL.startsWith("https") ? "wss" : "ws";
        const wsHost = API_BASE_URL.replace(/^https?:\/\//, "");
        const wsUrl = `${wsProtocol}://${wsHost}/ws/activity_log/?token=${token}`;
        return wsUrl;
    } catch {
        const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : "";
        return `${fallbackProtocol}//${fallbackHost}/ws/activity_log/${tokenQuery}`;
    }
};

const normalizePayload = (raw) => {
    if (!raw) return null;
    if (raw.type === "activity_log") return raw.data || raw.message || null;
    if (raw.message && raw.message.type === "activity_log") return raw.message.data || null;
    if (raw.data && typeof raw.data === "object") return raw.data;
    return raw;
};

const useActivityLogs = (onNewLog) => {
    const [isConnected, setIsConnected] = useState(false);
    const [liveLogs, setLiveLogs] = useState([]);
    const socketRef = useRef(null);
    const onNewLogRef = useRef(onNewLog);

    useEffect(() => {
        onNewLogRef.current = onNewLog;
    }, [onNewLog]);

    const clearLiveLogs = () => setLiveLogs([]);

    useEffect(() => {
        const token = tokenService.getAccessToken();
        const wsUrl = resolveActivityWsUrl(token);
        socketRef.current = new WebSocket(wsUrl);

        socketRef.current.onopen = () => {
            setIsConnected(true);
            console.log("Activity Log WebSocket Connected");
        };

        socketRef.current.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                const normalizedLog = normalizePayload(parsed);
                if (!normalizedLog || typeof normalizedLog !== "object") return;
                
                // Update local state
                setLiveLogs(prev => [normalizedLog, ...prev]);

                if (typeof onNewLogRef.current === "function") onNewLogRef.current(normalizedLog);
            } catch (error) {
                console.error("Activity Log WebSocket Parse Error:", error);
            }
        };

        socketRef.current.onerror = (error) => {
            console.error("Activity Log WebSocket Error:", error);
        };

        socketRef.current.onclose = () => {
            setIsConnected(false);
            console.log("Activity Log WebSocket Disconnected");
        };

        return () => {
            if (socketRef.current) socketRef.current.close();
        };
    }, []);

    return { isConnected, liveLogs, clearLiveLogs };
};

export default useActivityLogs;
