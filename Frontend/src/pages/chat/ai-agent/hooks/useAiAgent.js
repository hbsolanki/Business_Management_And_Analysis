import { useState, useCallback, useEffect, useRef } from "react";
import { aiAgentService } from "@/services/aiAgentService";
import { tokenService } from "@/services/tokenService";
import { API_BASE_URL } from "@/services/api";
import { toast } from "react-hot-toast";

export function useAiAgent(currentSessionId, navigate) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLiveProcess, setShowLiveProcess] = useState(false);
  const [messagesNextCursor, setMessagesNextCursor] = useState(null);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [agentAccessMessage, setAgentAccessMessage] = useState("");
  
  const abortControllerRef = useRef(null);
  const currentSessionIdRef = useRef(currentSessionId);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  const extractAiAgentAccessMessage = useCallback((error) => {
    const detail = error?.response?.data?.detail;
    const message = error?.response?.data?.message;
    const fallbackMessage = error?.message;
    const resolved = detail || message || fallbackMessage || "";
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
      if (msg.toLowerCase().includes("access") || msg.toLowerCase().includes("permission")) {
        setAgentAccessMessage(msg);
      }
    } finally {
      setIsLoadingMoreMessages(false);
    }
  }, [messagesNextCursor, isLoadingMoreMessages, extractAiAgentAccessMessage]);

  const handleStopAgent = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsProcessing(false);
      toast.success("Intelligence analysis stopped");
    }
  }, []);

  const typingQueueRef = useRef("");
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

  // Process the typing queue for a smooth "ChatGPT" feel
  const processTypingQueue = useCallback(() => {
    if (typingQueueRef.current.length === 0) {
      isTypingRef.current = false;
      return;
    }

    isTypingRef.current = true;
    
    const queueLen = typingQueueRef.current.length;
    const charsToTake = queueLen > 150 ? 5 : (queueLen > 80 ? 2 : 1);
    const chunk = typingQueueRef.current.slice(0, charsToTake);
    typingQueueRef.current = typingQueueRef.current.slice(charsToTake);

    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.type === "agent" && !lastMsg.isDone) {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1] = {
          ...lastMsg,
          message: lastMsg.message + chunk,
          isStreaming: true
        };
        return newMsgs;
      }
      return prev;
    });

    const delay = queueLen > 100 ? 5 : 20;
    typingTimerRef.current = setTimeout(processTypingQueue, delay);
  }, []);

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsProcessing(false);
    }

    if (currentSessionId) {
      fetchMessages(currentSessionId);
    } else {
      setMessages([{
        type: "agent",
        message: "Welcome to your AI business agent. I can help synthesize operations, draft responses, and turn live data into clear insights.",
      }]);
      setMessagesNextCursor(null);
      setAgentAccessMessage("");
    }
  }, [currentSessionId, fetchMessages]);

  const handleSendMessage = async (textOverride = null) => {
    const messageText = typeof textOverride === "string" ? textOverride : input;
    if (!messageText || typeof messageText !== "string" || !messageText.trim() || isProcessing) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    const userMsg = { type: "user", message: messageText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsProcessing(true);
    setShowLiveProcess(true);

    typingQueueRef.current = "";
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    isTypingRef.current = false;

    try {
      const token = tokenService.getAccessToken();
      const response = await fetch(`${API_BASE_URL}/ai-agent/sessions/stream/`, {
        method: "POST",
        signal: abortControllerRef.current.signal,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: messageText,
          session_id: currentSessionIdRef.current || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Stream error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamingBuffer = "";

      setMessages(prev => [...prev, { 
        type: "agent", 
        message: "", 
        isDone: false,
        isStreaming: true 
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        streamingBuffer += decoder.decode(value, { stream: true });
        
        let lineEndIndex;
        while ((lineEndIndex = streamingBuffer.indexOf("\n")) >= 0) {
          const line = streamingBuffer.slice(0, lineEndIndex).trim();
          streamingBuffer = streamingBuffer.slice(lineEndIndex + 1);

          if (!line.startsWith("data: ")) continue;
          
          try {
            const data = JSON.parse(line.replace("data: ", ""));

            if (data.type === "session_info" && !currentSessionIdRef.current) {
              // Ignore session_info if already in a session or handle it here
            }

            if (data.type === "chunk") {
              typingQueueRef.current += data.content;
              if (!isTypingRef.current) {
                processTypingQueue();
              }
            }

            if (data.type === "done") {
              const finalizeDone = () => {
                if (typingQueueRef.current.length > 0 || isTypingRef.current) {
                  setTimeout(finalizeDone, 50);
                  return;
                }
                
                setIsProcessing(false);
                setMessages((prev) => {
                  if (prev.length === 0) return prev;
                  const lastMsg = prev[prev.length - 1];
                  if (lastMsg && lastMsg.type === "agent") {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1] = {
                      ...lastMsg,
                      isDone: true,
                      isStreaming: false,
                    };
                    return newMsgs;
                  }
                  return prev;
                });
                if (data.session_id && !currentSessionId) {
                   navigate(`/ai-agent/session/${data.session_id}`);
                }
              };
              finalizeDone();
              return;
            }

            if (data.type === "error") {
              throw new Error(data.message || "Agent error");
            }
          } catch (err) {
            console.error("Stream line parse error:", err);
          }
        }
      }
    } catch (error) {
      console.error("Send Message Error:", error);
      setIsProcessing(false);
      toast.error("Failed to reach agent");
    }
  };

  const handleNewChat = useCallback(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setMessages([{
      type: "agent",
      message: "Welcome to your AI business agent. I can help synthesize operations, draft responses, and turn live data into clear insights.",
    }]);
    setMessagesNextCursor(null);
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
  };
}
