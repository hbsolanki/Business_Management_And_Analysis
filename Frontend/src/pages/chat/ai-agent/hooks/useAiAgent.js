import { useState, useCallback, useEffect, useRef } from "react";
import { aiAgentService } from "@/services/aiAgentService";
import { tokenService } from "@/services/tokenService";
import { API_BASE_URL } from "@/services/api";
import { toast } from "react-hot-toast";

export function useAiAgent(currentSessionId, navigate, setChartsCache) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLiveProcess, setShowLiveProcess] = useState(false);
  const [messagesNextCursor, setMessagesNextCursor] = useState(null);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [agentAccessMessage, setAgentAccessMessage] = useState("");
  const [selectedAgent, setSelectedAgent] = useState(() => {
    return localStorage.getItem("bma_selected_agent") || "analytics";
  });

  useEffect(() => {
    localStorage.setItem("bma_selected_agent", selectedAgent);
  }, [selectedAgent]);

  const currentSessionIdRef = useRef(currentSessionId);
  const finalMessageRef = useRef(null);
  const streamSessionIdRef = useRef(null);
  const wsRef = useRef(null);
  const wsSessionIdRef = useRef(null);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  const extractAiAgentAccessMessage = useCallback((error) => {
    const detail = error?.response?.data?.detail || error?.detail;
    const message = error?.response?.data?.message || error?.message;
    const resolved = detail || message || "";
    return String(resolved);
  }, []);

  const fetchMessages = useCallback(async (sessionId, isLoadMore = false) => {
    if (!sessionId) return;
    
    if (isLoadMore) {
      if (!messagesNextCursor || isLoadingMoreMessages) return;
      setIsLoadingMoreMessages(true);
    }

    try {
      const res = await aiAgentService.getSessionMessages(
        sessionId,
        isLoadMore ? messagesNextCursor : null
      );
      const data = res.data;
      
      const formatted = (data.results || []).map((m) => ({
        type: m.sender === "assistant" ? "agent" : "user",
        message: m.content,
        id: m.id,
        created_at: m.created_at,
      })).reverse();

      if (isLoadMore) {
        setMessages((prev) => [...formatted, ...prev]);
      } else {
        setMessages(formatted);
      }
      setMessagesNextCursor(data.next);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      const msg = extractAiAgentAccessMessage(error);
      const lowerMsg = msg.toLowerCase();
      if (
        lowerMsg.includes("access") || 
        lowerMsg.includes("permission") || 
        lowerMsg.includes("subscription") ||
        error?.response?.status === 403
      ) {
        setAgentAccessMessage(msg || "Neural Intelligence requires an active enterprise subscription.");
      }
    } finally {
      setIsLoadingMoreMessages(false);
    }
  }, [messagesNextCursor, isLoadingMoreMessages, extractAiAgentAccessMessage]);

  // Clean WebSocket url resolution helper
  const getWsUrl = useCallback((sessionId) => {
    let base = API_BASE_URL;
    if (base.startsWith("/")) {
      base = `${window.location.protocol}//${window.location.host}${base}`;
    }
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsBase = base.replace(/^https?:/i, wsProtocol).replace(/\/api\/?$/i, "");
    return `${wsBase}/ws/ai-agent/sessions/${sessionId}/`;
  }, []);

  // Establish stable WebSocket connection
  const connectWebSocket = useCallback((sessionId) => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const wsUrl = getWsUrl(sessionId);
    const token = tokenService.getAccessToken();
    const fullUrl = token ? `${wsUrl}?token=${token}` : wsUrl;

    console.log("[useAiAgent] Connecting WebSocket:", wsUrl);
    const ws = new WebSocket(fullUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "session_info") {
          if (data.session_id) {
            streamSessionIdRef.current = data.session_id;
          }
        }

        if (data.type === "tool_start") {
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.type === "agent") {
              const newMsgs = [...prev];
              const workflow = lastMsg.workflow || [];
              newMsgs[newMsgs.length - 1] = {
                ...lastMsg,
                workflow: [...workflow, { label: data.tool, status: "running", id: Date.now() }]
              };
              return newMsgs;
            }
            return prev;
          });
        }

        if (data.type === "structured_part") {
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.type === "agent") {
              const newMsgs = [...prev];
              const currentContent = Array.isArray(lastMsg.message) ? lastMsg.message : [{ type: "text", value: lastMsg.message || "" }];
              newMsgs[newMsgs.length - 1] = { 
                ...lastMsg, 
                message: [...currentContent, data.part] 
              };
              return newMsgs;
            }
            return prev;
          });
        }

        if (data.type === "tool_output") {
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.type === "agent") {
              const newMsgs = [...prev];
              const workflow = (lastMsg.workflow || []).map(w => 
                w.label === data.tool && w.status === "running" 
                  ? { ...w, status: "completed", output: data.output } 
                  : w
              );
              newMsgs[newMsgs.length - 1] = { ...lastMsg, workflow };
              return newMsgs;
            }
            return prev;
          });
          
          if (data.chart_data && setChartsCache) {
            const cData = data.chart_data;
            const cId = cData.id || (typeof cData.result === 'string' ? cData.result.match(/<ChartRef:([a-f0-9-]+)>/i)?.[1] : null);
            if (cId) {
              setChartsCache(prev => ({ ...prev, [cId]: cData }));
            }
          }
        }

        if (data.type === "panel_trigger" && data.panel) {
          window.dispatchEvent(new CustomEvent('agent-side-panel-trigger', {
            detail: {
              type: data.panel,
              id: data.id ?? undefined,
              initial_data: data.initial_data ?? undefined,
              onComplete: (res) => {
                window.dispatchEvent(new CustomEvent('agent-action-complete', {
                  detail: { ...res, action: data.panel, name: res?.name }
                }));
              }
            }
          }));
        }

        if (data.type === "chunk") {
          setMessages((prev) => {
            if (prev.length === 0) return prev;
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.type === "agent" && !lastMsg.isDone) {
              const newMsgs = [...prev];
              let currentMessage = lastMsg.message;

              if (typeof currentMessage === "string") {
                currentMessage = currentMessage + data.content;
              } else if (Array.isArray(currentMessage)) {
                const lastPart = currentMessage[currentMessage.length - 1];
                if (lastPart && lastPart.type === "text") {
                  const newParts = [...currentMessage];
                  newParts[newParts.length - 1] = { ...lastPart, value: lastPart.value + data.content };
                  currentMessage = newParts;
                } else {
                  currentMessage = [...currentMessage, { type: "text", value: data.content }];
                }
              }

              newMsgs[newMsgs.length - 1] = {
                ...lastMsg,
                message: currentMessage,
                isStreaming: true
              };
              return newMsgs;
            }
            return prev;
          });
        }

        if (data.type === "response") {
          finalMessageRef.current = data.message;
          if (data.session_id) {
            streamSessionIdRef.current = data.session_id;
          }
        }

        if (data.type === "done") {
          setIsProcessing(false);
          setMessages((prev) => {
            if (prev.length === 0) return prev;
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.type === "agent") {
              const newMsgs = [...prev];
              newMsgs[newMsgs.length - 1] = {
                ...lastMsg,
                message: finalMessageRef.current || lastMsg.message,
                isDone: true,
                isStreaming: false,
              };
              return newMsgs;
            }
            return prev;
          });

          const newSessionId = streamSessionIdRef.current;
          if (newSessionId && (!currentSessionIdRef.current || currentSessionIdRef.current === "new")) {
             navigate(`/ai-agent/session/${newSessionId}`, { replace: true });
          }
        }

        // Handle direct confirmation result
        if (data.type === "assignment_result") {
          setIsProcessing(false);
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.type === "agent") {
              const newMsgs = [...prev];
              newMsgs[newMsgs.length - 1] = {
                ...lastMsg,
                message: data.message,
                isDone: true,
                isStreaming: false
              };
              return newMsgs;
            }
            return prev;
          });
        }

        if (data.type === "error") {
          toast.error(data.message || "Agent error");
          setIsProcessing(false);
          setShowLiveProcess(false);
        }
      } catch (err) {
        console.error("[useAiAgent] Message parse error:", err);
      }
    };

    ws.onclose = (event) => {
      console.log("[useAiAgent] WebSocket closed:", event);
    };

    ws.onerror = (error) => {
      console.error("[useAiAgent] WebSocket error:", error);
    };
  }, [navigate, getWsUrl, setChartsCache]);

  const fetchMessagesRef = useRef(fetchMessages);
  const connectWebSocketRef = useRef(connectWebSocket);

  useEffect(() => {
    fetchMessagesRef.current = fetchMessages;
    connectWebSocketRef.current = connectWebSocket;
  }, [fetchMessages, connectWebSocket]);

  // Handle active session loading / ws setup
  useEffect(() => {
    let activeSessionId = currentSessionId;
    if (!currentSessionId || currentSessionId === "new") {
      activeSessionId = crypto.randomUUID();
      wsSessionIdRef.current = activeSessionId;
      
      setMessages([{
        type: "agent",
        message: "Welcome to your AI business agent. I can help synthesize operations, draft responses, and turn live data into clear insights.",
      }]);
      setMessagesNextCursor(null);
      setAgentAccessMessage("");
    } else {
      wsSessionIdRef.current = currentSessionId;
      fetchMessagesRef.current(currentSessionId);
    }

    // Connect WebSocket
    connectWebSocketRef.current(activeSessionId);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [currentSessionId]);

  // Listen for Relational Assignment Confirm custom event
  useEffect(() => {
    const handleAssignmentConfirm = (e) => {
      const { confirm, entity_type, source_id, target_id } = e.detail;
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        toast.error("WebSocket connection closed. Reconnecting...");
        return;
      }

      setIsProcessing(true);
      setShowLiveProcess(true);

      wsRef.current.send(JSON.stringify({
        type: "confirm_assignment",
        confirm,
        entity_type,
        source_id,
        target_id
      }));
    };

    window.addEventListener('agent-assignment-confirm', handleAssignmentConfirm);
    return () => window.removeEventListener('agent-assignment-confirm', handleAssignmentConfirm);
  }, []);

  const handleStopAgent = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsProcessing(false);
    toast.success("Intelligence analysis stopped");
  }, []);

  const handleSendMessage = async (textOverride = null) => {
    const messageText = typeof textOverride === "string" ? textOverride : input;
    if (!messageText || typeof messageText !== "string" || !messageText.trim() || isProcessing) return;

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log("[useAiAgent] WebSocket not open. Reconnecting...");
      connectWebSocket(wsSessionIdRef.current);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Short buffer
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error("WebSocket connection offline. Please reload page.");
      return;
    }

    const userMsg = { type: "user", message: messageText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsProcessing(true);
    setShowLiveProcess(true);

    finalMessageRef.current = null;
    streamSessionIdRef.current = null;

    setMessages(prev => [...prev, { 
      type: "agent", 
      message: "", 
      isDone: false,
      isStreaming: true,
      workflow: []
    }]);

    wsRef.current.send(JSON.stringify({
      type: "query",
      query: messageText,
      agent: selectedAgent
    }));
  };

  const handleNewChat = useCallback(() => {
    setInput("");
    setIsProcessing(false);
    setShowLiveProcess(false);
    navigate("/ai-agent/session/new");
  }, [navigate]);

  return {
    messages,
    setMessages,
    input,
    setInput,
    isProcessing,
    showLiveProcess,
    setShowLiveProcess,
    isLoadingMoreMessages,
    messagesNextCursor,
    fetchMessages,
    handleSendMessage,
    handleStopAgent,
    handleNewChat,
    agentAccessMessage,
    selectedAgent,
    setSelectedAgent,
  };
}
