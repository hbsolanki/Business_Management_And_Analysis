import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaBrain,
  FaChevronDown,
  FaChevronUp,
  FaEdit,
  FaEllipsisV,
  FaTimes,
  FaListUl,
  FaMagic,
  FaPaperPlane,
  FaRobot,
  FaSync,
  FaPlus,
  FaCommentAlt as FaMessage,
  FaTrash,
} from "react-icons/fa";

import ProtectedHeader from "@/components/layout/ProtectedHeader";
import { API_BASE_URL } from "@/services/api";
import { tokenService } from "@/services/tokenService";
import { aiAgentService } from "@/services/aiAgentService";
import { toast } from "react-hot-toast";
import Modal from "@/components/ui/Modal";

import MessageBubble from "./components/MessageBubble";
import WorkflowPanel from "./components/WorkflowPanel";

const AI_AGENT_STYLES = `
  .agent-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .agent-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .agent-scrollbar::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 999px;
    transition: background-color 0.25s ease;
  }
  .agent-scrollbar.show-scrollbar::-webkit-scrollbar-thumb,
  .agent-scrollbar:hover::-webkit-scrollbar-thumb,
  .agent-scrollbar:focus-within::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.4);
  }
  .agent-scrollbar.show-scrollbar::-webkit-scrollbar-thumb:hover,
  .agent-scrollbar:hover::-webkit-scrollbar-thumb:hover,
  .agent-scrollbar:focus-within::-webkit-scrollbar-thumb:hover {
    background: rgba(100, 116, 139, 0.6);
  }
  .agent-fade-in {
    animation: agentFadeIn 0.35s ease-out forwards;
  }
  .agent-rise-in {
    animation: agentRiseIn 0.35s ease-out forwards;
  }
  .agent-pulse-grid {
    background-image:
      linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
    background-size: 32px 32px;
  }
  .agent-line-grid {
    background-color: rgba(248, 250, 252, 0.7);
    background-image:
      linear-gradient(rgba(226, 232, 240, 0.85) 1px, transparent 1px),
      linear-gradient(90deg, rgba(226, 232, 240, 0.85) 1px, transparent 1px);
    background-size: 28px 28px;
  }
  .agent-markdown {
    font-size: 0.95rem;
    line-height: 1.7;
    color: inherit;
    font-family: inherit;
  }
  .agent-markdown p:first-child { margin-top: 0; }
  .agent-markdown p:last-child { margin-bottom: 0; }
  .agent-markdown p, .agent-markdown ul, .agent-markdown ol, .agent-markdown blockquote, .agent-markdown pre {
    margin: 0.85rem 0;
  }
  .agent-markdown ul,
  .agent-markdown ol {
    padding-left: 1.35rem;
    list-style-position: outside;
  }
  .agent-markdown ul { list-style-type: disc; }
  .agent-markdown ol { list-style-type: decimal; }
  .agent-markdown li {
    margin: 0.45rem 0;
    padding-left: 0.1rem;
  }
  .agent-markdown li::marker {
    color: #334155;
    font-weight: 800;
  }
  .agent-markdown li > p {
    display: inline;
    margin: 0;
  }
  .agent-markdown code {
    background: rgba(15, 23, 42, 0.08);
    padding: 0.15rem 0.45rem;
    border-radius: 0.5rem;
    font-size: 0.9em;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  }
  .agent-markdown pre {
    background: #0f172a;
    color: #f8fafc;
    padding: 1.25rem;
    border-radius: 1.25rem;
    overflow-x: auto;
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
    margin: 1.5rem 0;
  }
  .agent-markdown pre code { background: transparent; padding: 0; }
  .agent-markdown blockquote {
    border-left: 4px solid #3b82f6;
    padding: 0.75rem 1.25rem;
    margin: 1.5rem 0;
    font-style: italic;
    color: inherit;
    opacity: 0.9;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 0 1rem 1rem 0;
  }
  .agent-markdown table {
    width: 100%;
    table-layout: fixed;
    margin: 1.5rem 0;
    border-collapse: separate;
    border-spacing: 0;
    border: 1px solid rgba(148, 163, 184, 0.45);
    border-radius: 0.75rem;
    overflow: hidden;
    background: transparent;
    box-shadow: none;
  }
  .agent-markdown th {
    background: rgba(241, 245, 249, 0.65);
    padding: 0.8rem 0.75rem;
    font-weight: 800;
    text-align: left;
    border-bottom: 1px solid rgba(148, 163, 184, 0.4);
    font-size: 0.68rem;
    line-height: 1.35;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #334155;
    white-space: normal;
    word-break: break-word;
    overflow-wrap: anywhere;
    vertical-align: top;
  }
  .agent-markdown td {
    padding: 0.75rem;
    border-bottom: 1px solid rgba(226, 232, 240, 0.9);
    font-size: 0.82rem;
    line-height: 1.45;
    color: #0f172a;
    font-weight: 600;
    white-space: normal;
    word-break: break-word;
    overflow-wrap: anywhere;
    vertical-align: top;
  }
  .agent-markdown tr:last-child td { border-bottom: none; }
  .agent-markdown tr:nth-child(even) td { background: rgba(248, 250, 252, 0.45); }
  @media (max-width: 768px) {
    .agent-markdown table {
      font-size: 0.74rem;
    }
    .agent-markdown th,
    .agent-markdown td {
      padding: 0.6rem 0.5rem;
    }
  }
  .agent-markdown h1, .agent-markdown h2, .agent-markdown h3 {
    font-weight: 800;
    margin-top: 2rem;
    margin-bottom: 1rem;
    color: #0f172a;
  }
  .agent-markdown h1 { font-size: 1.75rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; }
  .agent-markdown h2 { font-size: 1.5rem; }
  .agent-markdown h3 { font-size: 1.25rem; }
  .agent-markdown blockquote {
    border-left: 4px solid #3b82f6;
    padding: 0.75rem 1.25rem;
    margin: 1.5rem 0;
    font-style: italic;
    color: #475569;
    background: #f8fafc;
    border-radius: 0 1rem 1rem 0;
  }

  @keyframes agentFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes agentRiseIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
`;

function createStatusEntry(message, extra = {}) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: message || "Processing step",
    output: null,
    tool: null,
    ...extra,
  };
}

function normalizeWorkflowStep(step, index = 0) {
  const data =
    step && typeof step.data === "object" && !Array.isArray(step.data)
      ? step.data
      : {};
  const stepType = String(step?.type || data?.type || "").toLowerCase();
  const stepId =
    step?.id ||
    data?.id ||
    `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
  const message =
    data?.message ||
    step?.message ||
    step?.label ||
    `Workflow step ${index + 1}`;
  const tool = data?.tool || step?.tool || null;
  const output = data?.output ?? step?.output ?? null;

  if (stepType === "tool_output") {
    return createStatusEntry(
      message || `Tool output received: ${tool || "tool"}`,
      {
        id: stepId,
        tool,
        output,
      },
    );
  }

  return createStatusEntry(message, {
    id: stepId,
    tool,
    output,
  });
}

export default function AiAgent() {
  const navigate = useNavigate();
  const { sessionId: routeSessionId } = useParams();

  const [messages, setMessages] = useState([
    {
      type: "agent",
      message:
        "Welcome to your AI business agent. I can help synthesize operations, draft responses, and turn live data into clear insights.",
      statusHistory: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStatuses, setCurrentStatuses] = useState([]);
  const [showLiveProcess, setShowLiveProcess] = useState(false);
  const [connectionVersion, setConnectionVersion] = useState(0);
  const [isSessionPanelOpen, setIsSessionPanelOpen] = useState(true);
  const [isMobileSessionSheetOpen, setIsMobileSessionSheetOpen] =
    useState(false);

  // Session Management Actions State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState(null);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  // Session State
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsNextCursor, setSessionsNextCursor] = useState(null);
  const [loadingMoreSessions, setLoadingMoreSessions] = useState(false);
  const [messagesNextCursor, setMessagesNextCursor] = useState(null);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [showSessionScrollbar, setShowSessionScrollbar] = useState(false);
  const [showMessageScrollbar, setShowMessageScrollbar] = useState(false);
  const [agentAccessMessage, setAgentAccessMessage] = useState("");

  const [sessionActionsMenu, setSessionActionsMenu] = useState(null);
  const [sessionActionsPosition, setSessionActionsPosition] = useState({
    top: 0,
    left: 0,
    opacity: 0,
  });

  const extractAiAgentAccessMessage = useCallback((error) => {
    const detail = error?.response?.data?.detail;
    const message = error?.response?.data?.message;
    const fallbackMessage = error?.message;
    const resolved = detail || message || fallbackMessage || "";

    if (!resolved) return "";
    return String(resolved);
  }, []);

  const handleOpenEdit = (session) => {
    setSessionToEdit(session);
    setEditTitle(session.title || "");
    setIsEditModalOpen(true);
    setSessionActionsMenu(null);
  };

  const handleOpenDelete = (session) => {
    setSessionToDelete(session);
    setIsDeleteModalOpen(true);
    setSessionActionsMenu(null);
  };

  const handleUpdateSession = async () => {
    if (!sessionToEdit || !editTitle.trim() || isActionProcessing) return;
    setIsActionProcessing(true);
    try {
      await aiAgentService.updateSession(sessionToEdit.id, {
        title: editTitle.trim(),
      });
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionToEdit.id ? { ...s, title: editTitle.trim() } : s,
        ),
      );
      toast.success("Session updated");
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Failed to update session:", error);
      toast.error("Failed to update session");
    } finally {
      setIsActionProcessing(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete || isActionProcessing) return;
    setIsActionProcessing(true);
    try {
      await aiAgentService.deleteSession(sessionToDelete.id);
      const deletedSessionId = sessionToDelete.id;

      setSessions((prev) => prev.filter((s) => s.id !== deletedSessionId));
      if (currentSessionId === deletedSessionId) {
        handleNewChat();
      }

      // Refresh first page so paginated session count/list stays in sync.
      await fetchSessions();

      toast.success("Session deleted");
      setIsDeleteModalOpen(false);
      setSessionToDelete(null);
    } catch (error) {
      console.error("Failed to delete session:", error);
      toast.error("Failed to delete session");
    } finally {
      setIsActionProcessing(false);
    }
  };

  const socketRef = useRef(null);
  const scrollRef = useRef(null);
  const statusesRef = useRef([]);
  const currentSessionIdRef = useRef(null);
  const sessionActionsRef = useRef(null);
  const sessionListRef = useRef(null);
  const sessionListEndRef = useRef(null);
  const skipAutoScrollRef = useRef(false);
  const forceBottomSnapRef = useRef(false);
  const hasSessionListInteractedRef = useRef(false);
  const inputRef = useRef(null);
  const sessionScrollbarTimeoutRef = useRef(null);
  const messageScrollbarTimeoutRef = useRef(null);

  useEffect(() => {
    statusesRef.current = currentStatuses;
  }, [currentStatuses]);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    const closeMenuOnOutsideClick = (event) => {
      const target = event?.target;
      if (
        target instanceof Element &&
        target.closest("[data-session-actions-trigger]")
      )
        return;
      if (
        target instanceof Element &&
        target.closest("[data-session-actions-floating]")
      )
        return;
      setSessionActionsMenu(null);
    };

    document.addEventListener("mousedown", closeMenuOnOutsideClick);
    return () => {
      document.removeEventListener("mousedown", closeMenuOnOutsideClick);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (sessionScrollbarTimeoutRef.current) {
        clearTimeout(sessionScrollbarTimeoutRef.current);
      }
      if (messageScrollbarTimeoutRef.current) {
        clearTimeout(messageScrollbarTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!sessionActionsMenu) return;
    const closeMenu = () => setSessionActionsMenu(null);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [sessionActionsMenu]);

  useLayoutEffect(() => {
    if (!sessionActionsMenu || !sessionActionsRef.current) return;

    const menuEl = sessionActionsRef.current;
    const menuRect = menuEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 8;
    const anchor = sessionActionsMenu.anchorRect;

    let top = anchor.bottom + padding;
    if (top + menuRect.height > viewportHeight - padding) {
      top = Math.max(padding, anchor.top - menuRect.height - padding);
    }

    let left = anchor.right - menuRect.width;
    if (left < padding) left = padding;
    if (left + menuRect.width > viewportWidth - padding) {
      left = viewportWidth - menuRect.width - padding;
    }

    setSessionActionsPosition({ top, left, opacity: 1 });
  }, [sessionActionsMenu]);

  // Auto-scroll logic
  useLayoutEffect(() => {
    if (skipAutoScrollRef.current) return;
    if (scrollRef.current) {
      const behavior = forceBottomSnapRef.current
        ? "auto"
        : messages.length <= 1
          ? "auto"
          : "smooth";
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior,
      });
      if (forceBottomSnapRef.current) {
        forceBottomSnapRef.current = false;
      }
    }
  }, [messages, currentStatuses]);

  const mergeSessions = useCallback((existingSessions, incomingSessions) => {
    const seen = new Set(existingSessions.map((session) => String(session.id)));
    const merged = [...existingSessions];

    incomingSessions.forEach((session) => {
      const key = String(session.id);
      if (!seen.has(key)) {
        merged.push(session);
        seen.add(key);
      }
    });

    return merged;
  }, []);

  // Initial session fetch
  const fetchSessions = useCallback(
    async (cursorUrl = null, options = {}) => {
      const { append = false } = options;

      if (append) {
        setLoadingMoreSessions(true);
      } else {
        setLoadingSessions(true);
      }

      try {
        const res = await aiAgentService.getSessions(cursorUrl);
        const payload = res.data || {};
        const nextResults =
          payload.results || (Array.isArray(payload) ? payload : []);

        setAgentAccessMessage("");
        setSessions((prev) =>
          append ? mergeSessions(prev, nextResults) : nextResults,
        );
        setSessionsNextCursor(payload.next || null);
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
        const accessMessage = extractAiAgentAccessMessage(error);

        if (accessMessage) {
          setAgentAccessMessage(accessMessage);
          if (!append) {
            setSessions([]);
            setSessionsNextCursor(null);
          }
          toast.error(accessMessage);
        } else {
          toast.error(
            append
              ? "Failed to load more sessions"
              : "Failed to load chat history",
          );
        }
      } finally {
        if (append) {
          setLoadingMoreSessions(false);
        } else {
          setLoadingSessions(false);
        }
      }
    },
    [extractAiAgentAccessMessage, mergeSessions],
  );

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const loadMoreSessions = useCallback(() => {
    if (!sessionsNextCursor || loadingSessions || loadingMoreSessions) return;
    fetchSessions(sessionsNextCursor, { append: true });
  }, [fetchSessions, loadingMoreSessions, loadingSessions, sessionsNextCursor]);

  const handleSessionListScroll = useCallback(
    (event) => {
      hasSessionListInteractedRef.current = true;
      setShowSessionScrollbar(true);
      if (sessionScrollbarTimeoutRef.current) {
        clearTimeout(sessionScrollbarTimeoutRef.current);
      }
      sessionScrollbarTimeoutRef.current = setTimeout(() => {
        setShowSessionScrollbar(false);
      }, 5000);

      if (!sessionsNextCursor || loadingSessions || loadingMoreSessions) return;

      const target = event.currentTarget;
      const distanceFromBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight;

      if (distanceFromBottom <= 96) {
        loadMoreSessions();
      }
    },
    [
      loadMoreSessions,
      loadingMoreSessions,
      loadingSessions,
      sessionsNextCursor,
    ],
  );

  useEffect(() => {
    if (
      !isSessionPanelOpen ||
      !sessionListRef.current ||
      !sessionListEndRef.current
    )
      return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting || !hasSessionListInteractedRef.current)
          return;
        loadMoreSessions();
      },
      {
        root: sessionListRef.current,
        rootMargin: "0px 0px 140px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(sessionListEndRef.current);

    return () => {
      observer.disconnect();
    };
  }, [isSessionPanelOpen, loadMoreSessions, sessions.length]);

  const loadSessionMessages = useCallback(
    async (sessionId, cursorUrl = null, options = {}) => {
      const { append = false } = options;

      if (
        !append &&
        String(currentSessionIdRef.current || "") === String(sessionId || "")
      ) {
        return;
      }

      if (isProcessing || (append && !messagesNextCursor)) return;

      try {
        if (!append) {
          forceBottomSnapRef.current = true;
          setIsMobileSessionSheetOpen(false);
          setCurrentSessionId(sessionId);
          setIsProcessing(true);
          setMessages([]); // Clear for fresh load
        } else {
          setIsLoadingMoreMessages(true);
        }

        const res = await aiAgentService.getSessionMessages(
          sessionId,
          cursorUrl,
        );
        const payload = res.data || {};
        const rawMessages =
          payload.results || (Array.isArray(payload) ? payload : []);

        const formattedMessages = rawMessages.map((m) => ({
          id: m.id,
          type: m.sender === "assistant" ? "agent" : "user",
          message: m.content,
          workflow_steps: Array.isArray(m.workflow_steps)
            ? m.workflow_steps
            : [],
          statusHistory: Array.isArray(m.workflow_steps)
            ? m.workflow_steps.map((step, index) =>
                normalizeWorkflowStep(step, index),
              )
            : [],
        }));

        // If it's a pagination load, we prepend messages (reverse the order if API is latest first)
        // But if API is [newest...oldest], reversing it gives [oldest...newest].
        // Prepended list should be [very_old...old, CURRENT_MESSAGES]
        const sortedNewMessages = [...formattedMessages].reverse();

        if (append) {
          const scrollContainer = scrollRef.current;
          const oldScrollHeight = scrollContainer
            ? scrollContainer.scrollHeight
            : 0;
          const oldScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

          skipAutoScrollRef.current = true;
          setMessages((prev) => [...sortedNewMessages, ...prev]);
          setMessagesNextCursor(payload.next || null);

          // Use requestAnimationFrame to adjust scroll after DOM updates
          requestAnimationFrame(() => {
            if (scrollContainer) {
              const newScrollHeight = scrollContainer.scrollHeight;
              scrollContainer.scrollTop =
                oldScrollTop + (newScrollHeight - oldScrollHeight);
            }
            skipAutoScrollRef.current = false;
          });
        } else {
          setAgentAccessMessage("");
          skipAutoScrollRef.current = false;
          setMessages(
            sortedNewMessages.length > 0
              ? sortedNewMessages
              : [
                  {
                    type: "agent",
                    message: "Session loaded. How can I continue helping you?",
                    workflow_steps: [],
                    statusHistory: [],
                  },
                ],
          );
          setMessagesNextCursor(payload.next || null);
          requestAnimationFrame(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          });
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
        const accessMessage = extractAiAgentAccessMessage(error);

        if (accessMessage) {
          setAgentAccessMessage(accessMessage);
          if (!append) {
            setMessages((prev) =>
              prev.length > 0
                ? prev
                : [
                    {
                      type: "agent",
                      message: accessMessage,
                      workflow_steps: [],
                      statusHistory: [],
                    },
                  ],
            );
          }
          toast.error(accessMessage);
        } else {
          toast.error(
            append
              ? "Failed to load older messages"
              : "Failed to load session messages",
          );
        }
      } finally {
        setIsProcessing(false);
        setIsLoadingMoreMessages(false);
      }
    },
    [extractAiAgentAccessMessage, isProcessing, messagesNextCursor],
  );

  useEffect(() => {
    if (!routeSessionId) return;
    loadSessionMessages(routeSessionId);
  }, [routeSessionId, loadSessionMessages]);

  const handleSelectSession = useCallback(
    (sessionId) => {
      if (!sessionId) return;

      const nextSessionId = String(sessionId);
      if (String(routeSessionId || "") !== nextSessionId) {
        navigate(`/chat/agent/${nextSessionId}`);
      }

      loadSessionMessages(nextSessionId);
    },
    [loadSessionMessages, navigate, routeSessionId],
  );

  const loadMoreMessages = useCallback(() => {
    if (
      !messagesNextCursor ||
      isLoadingMoreMessages ||
      isProcessing ||
      !currentSessionId
    )
      return;
    loadSessionMessages(currentSessionId, messagesNextCursor, { append: true });
  }, [
    messagesNextCursor,
    isLoadingMoreMessages,
    isProcessing,
    currentSessionId,
    loadSessionMessages,
  ]);

  const handleMessageScroll = useCallback(
    (event) => {
      setShowMessageScrollbar(true);
      if (messageScrollbarTimeoutRef.current) {
        clearTimeout(messageScrollbarTimeoutRef.current);
      }
      messageScrollbarTimeoutRef.current = setTimeout(() => {
        setShowMessageScrollbar(false);
      }, 5000);

      if (!messagesNextCursor || isLoadingMoreMessages || isProcessing) return;

      const target = event.currentTarget;
      if (target.scrollTop <= 100) {
        loadMoreMessages();
      }
    },
    [loadMoreMessages, messagesNextCursor, isLoadingMoreMessages, isProcessing],
  );

  const handleNewChat = () => {
    if (isProcessing) return;
    forceBottomSnapRef.current = true;
    setIsMobileSessionSheetOpen(false);
    setCurrentSessionId(null);
    setMessages([
      {
        type: "agent",
        message:
          "Welcome to your AI business agent. I can help synthesize operations, draft responses, and turn live data into clear insights.",
        workflow_steps: [],
        statusHistory: [],
      },
    ]);
    setCurrentStatuses([]);
    setShowLiveProcess(false);
    if (routeSessionId) {
      navigate("/chat/agent");
    }
  };

  useEffect(() => {
    const token = tokenService.getAccessToken();
    if (!token) {
      console.error("No access token found for AI Agent connection");
      return undefined;
    }

    const resolveWsUrl = (authToken) => {
      try {
        const parsed = new URL(API_BASE_URL);
        const protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
        const baseHost = ["0.0.0.0", "::", "[::]"].includes(parsed.hostname)
          ? window.location.hostname
          : parsed.hostname;
        const host = `${baseHost}${parsed.port ? `:${parsed.port}` : ""}`;
        return `${protocol}//${host}/ws/agent/?token=${authToken}`;
      } catch {
        const fallbackProtocol =
          window.location.protocol === "https:" ? "wss:" : "ws:";
        return `${fallbackProtocol}//${window.location.host}/ws/agent/?token=${authToken}`;
      }
    };

    const socket = new WebSocket(resolveWsUrl(token));
    socketRef.current = socket;

    socket.onopen = () => setIsConnected(true);
    socket.onclose = () => setIsConnected(false);
    socket.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        if (response.type === "status") {
          const toolMatch =
            typeof response.message === "string"
              ? response.message.match(/Agent calling tool:\s*([a-zA-Z0-9_-]+)/)
              : null;

          setCurrentStatuses((prev) => [
            ...prev,
            createStatusEntry(response.message, {
              tool: toolMatch?.[1] || null,
            }),
          ]);
          return;
        }

        if (response.type === "tool_output") {
          setCurrentStatuses((prev) => {
            const next = [...prev];
            const targetIndex = [...next]
              .reverse()
              .findIndex(
                (entry) => entry.tool === response.tool && !entry.output,
              );

            if (targetIndex === -1) {
              return [
                ...next,
                createStatusEntry(`Tool output received: ${response.tool}`, {
                  tool: response.tool || null,
                  output: response.output || null,
                }),
              ];
            }

            const actualIndex = next.length - 1 - targetIndex;
            next[actualIndex] = {
              ...next[actualIndex],
              output: response.output || null,
            };
            return next;
          });
          return;
        }

        if (response.type === "error") {
          const errorMessage = String(
            response.message || "AI Agent is not available right now.",
          );
          setAgentAccessMessage(errorMessage);
          setIsProcessing(false);
          setCurrentStatuses([]);
          setShowLiveProcess(false);
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (
              lastMessage?.type === "agent" &&
              lastMessage?.message === errorMessage
            ) {
              return prev;
            }

            return [
              ...prev,
              {
                type: "agent",
                message: errorMessage,
                statusHistory: [],
              },
            ];
          });
          return;
        }

        if (
          response.type === "agent_response" ||
          response.type === "response"
        ) {
          const finalResponse = response.message;

          // Update session ID if returned (e.g. for a new chat)
          if (response.session_id && !currentSessionIdRef.current) {
            setCurrentSessionId(response.session_id);
            navigate(`/chat/agent/${response.session_id}`);
            // Refresh session list to show newest session
            fetchSessions();
          }

          setAgentAccessMessage("");
          setMessages((prev) => [
            ...prev,
            {
              type: "agent",
              message: finalResponse,
              workflow_steps: statusesRef.current,
              statusHistory: statusesRef.current,
            },
          ]);
          setIsProcessing(false);
          setCurrentStatuses([]);
        }
      } catch (err) {
        console.error("Failed to parse socket message", err);
      }
    };

    return () => {
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }
    };
  }, [connectionVersion, fetchSessions, navigate]);

  const reconnectToAgent = () => {
    setConnectionVersion((prev) => prev + 1);
  };

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (
      isProcessing ||
      !trimmed ||
      agentAccessMessage ||
      !socketRef.current ||
      socketRef.current.readyState !== WebSocket.OPEN
    )
      return;

    const payload = { query: trimmed };
    if (currentSessionIdRef.current) {
      payload.session_id = currentSessionIdRef.current;
    }

    socketRef.current.send(JSON.stringify(payload));
    setMessages((prev) => [...prev, { type: "user", message: trimmed }]);
    setInput("");
    setIsProcessing(true);
    setCurrentStatuses([]);
    setShowLiveProcess(false);
  }, [agentAccessMessage, input, isProcessing]);

  const handleStop = () => {
    if (!isProcessing) return;
    setIsProcessing(false);
    setCurrentStatuses([]);
    setShowLiveProcess(false);
    setMessages((prev) => [
      ...prev,
      {
        type: "agent",
        message: "Reqeust terminated. I'm ready for your next prompt.",
        workflow_steps: [],
        statusHistory: [],
      },
    ]);
    if (socketRef.current) socketRef.current.close();
    setConnectionVersion((prev) => prev + 1);
  };

  const handleCopyMessage = useCallback(async (message) => {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Message copied");
    } catch (error) {
      console.error("Failed to copy message", error);
      toast.error("Failed to copy message");
    }
  }, []);

  const handleReuseMessage = useCallback(
    (message) => {
      if (!message || isProcessing) return;
      setInput(message);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        const length = String(message).length;
        inputRef.current?.setSelectionRange?.(length, length);
      });
    },
    [isProcessing],
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_22%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.08),_transparent_24%),linear-gradient(180deg,#f8fbff_0%,#f4f7fb_100%)] selection:bg-brand-100 selection:text-brand-900">
      <style>{AI_AGENT_STYLES}</style>
      <ProtectedHeader />

      <main className="mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
        {/* Dashboard Stats - Compact Version */}
        <div className="mb-4 rounded-[28px] border border-white/70 bg-white/55 p-4 shadow-[0_24px_70px_-18px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all sm:mb-6 sm:rounded-[34px] sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl animate-fade-in">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-200/50 bg-brand-50/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-brand-700 shadow-sm">
                <FaBrain size={10} className="animate-pulse" />
                Operational Intel
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl leading-tight">
                Business <span className="text-brand-600">Intelligence</span>{" "}
                Terminal
              </h1>
              <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-slate-600/80">
                Synthesize operations, draft responses, and transform metrics
                into strategy through natural conversation.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3 lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileSessionSheetOpen(true)}
            className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-brand-200 hover:bg-brand-50/40"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Session Navigator
            </p>
            <p className="mt-1 block w-full truncate text-sm font-black text-slate-900">
              {currentSessionId
                ? sessions.find(
                    (session) =>
                      String(session.id) === String(currentSessionId),
                  )?.title || "Current Session"
                : "Open Conversations"}
            </p>
          </button>
          <button
            type="button"
            onClick={handleNewChat}
            disabled={isProcessing || !currentSessionId}
            className="inline-flex h-[58px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-4 text-slate-600 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="Start new chat"
          >
            <FaPlus size={14} />
          </button>
        </div>

        {agentAccessMessage ? (
          <div className="mb-4 rounded-[24px] border border-amber-200 bg-amber-50/90 px-4 py-4 text-amber-950 shadow-sm sm:mb-5 sm:px-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-white/80 text-amber-700">
                <FaBrain size={14} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700">
                  AI Agent Access
                </p>
                <p className="mt-1 text-sm font-bold leading-6 text-amber-950">
                  {agentAccessMessage}
                </p>
                <p className="mt-1 text-xs font-medium leading-5 text-amber-800/80">
                  Check your current plan features to confirm AI Agent access
                  for this workspace.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div
          className={`grid items-start gap-6 transition-all duration-300 ${isSessionPanelOpen ? "lg:grid-cols-[300px_minmax(0,1fr)]" : "lg:grid-cols-[84px_minmax(0,1fr)]"}`}
        >
          {/* Sidebar - Sessions */}
          <aside className="sticky top-24 hidden self-start lg:block">
            <div
              className={`group flex flex-col overflow-hidden rounded-[30px] border border-white/70 bg-white/70 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.15)] backdrop-blur-xl transition-all duration-300 lg:h-[calc(100vh-7rem)] ${isSessionPanelOpen ? "p-4 sm:p-5" : "p-3"}`}
            >
              <div
                className={`sticky top-0 z-10 -mx-4 -mt-4 bg-white/90 px-4 pt-4 backdrop-blur-xl sm:-mx-5 sm:-mt-5 sm:px-5 sm:pt-5 ${isSessionPanelOpen ? "pb-4" : "pb-0"}`}
              >
                <div
                  className={`flex items-center ${isSessionPanelOpen ? "justify-between gap-3" : "justify-center"}`}
                >
                  {isSessionPanelOpen ? (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Session Navigator
                      </p>
                      <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">
                        Conversations
                      </h2>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2">
                    {isSessionPanelOpen ? (
                      <button
                        type="button"
                        onClick={() => fetchSessions()}
                        className={`hidden h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm transition hover:border-brand-200 hover:text-brand-700 group-hover:inline-flex ${loadingSessions ? "pointer-events-none opacity-70" : ""}`}
                        title="Synchronize sessions"
                      >
                        <FaSync
                          size={10}
                          className={loadingSessions ? "animate-spin" : ""}
                        />
                        Sync
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setIsSessionPanelOpen((prev) => !prev)}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-brand-200 hover:text-brand-700"
                      title={
                        isSessionPanelOpen
                          ? "Collapse sessions"
                          : "Expand sessions"
                      }
                    >
                      {isSessionPanelOpen ? (
                        <FaChevronDown size={12} />
                      ) : (
                        <FaChevronUp size={12} />
                      )}
                    </button>
                  </div>
                </div>

                <div
                  className={`transition-all duration-300 ${isSessionPanelOpen ? "mt-5 opacity-100" : "mt-4 opacity-100"}`}
                >
                  <button
                    onClick={handleNewChat}
                    disabled={isProcessing || !currentSessionId}
                    className={`group flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 text-slate-600 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50 ${isSessionPanelOpen ? "px-4 py-4 text-sm font-bold" : "h-12 w-full"}`}
                    title="Start new chat"
                  >
                    <FaPlus
                      size={14}
                      className="transition-transform group-hover:rotate-90"
                    />
                    {isSessionPanelOpen ? "New Intelligence Chat" : null}
                  </button>
                </div>
              </div>

              {isSessionPanelOpen ? (
                <>
                  <div className="mt-6 flex min-h-0 flex-1 flex-col gap-2">
                    <h3 className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      Past Conversations
                    </h3>
                    <div
                      ref={sessionListRef}
                      onScroll={handleSessionListScroll}
                      className={`agent-scrollbar agent-line-grid flex-1 min-h-0 space-y-2 overflow-y-auto rounded-[24px] border border-slate-200/80 p-2 pr-1 ${showSessionScrollbar ? "show-scrollbar" : ""}`}
                    >
                      {loadingSessions ? (
                        <div className="flex flex-col gap-2 p-1">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className="h-16 animate-pulse rounded-2xl bg-slate-100"
                            />
                          ))}
                        </div>
                      ) : sessions.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center text-xs font-bold text-slate-400">
                          No past sessions found.
                        </div>
                      ) : (
                        sessions.map((session) => (
                          <div key={session.id} className="group relative">
                            <button
                              onClick={() => handleSelectSession(session.id)}
                              disabled={isProcessing}
                              className={`flex w-full min-w-0 flex-col items-start gap-2 rounded-2xl border px-4 py-3 text-left transition-all ${
                                currentSessionId === session.id
                                  ? "border-brand-200/80 bg-brand-50/25 shadow-sm"
                                  : "border-transparent bg-transparent hover:border-slate-200/80 hover:bg-white/30 hover:shadow-sm"
                              }`}
                            >
                              <div className="flex w-full items-start gap-3">
                                <div
                                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${currentSessionId === session.id ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"}`}
                                >
                                  <FaMessage size={12} />
                                </div>
                                <div className="min-w-0 flex-1 pr-6">
                                  <p
                                    className={`block w-full truncate text-sm font-black leading-5 ${currentSessionId === session.id ? "text-slate-950" : "text-slate-700"}`}
                                  >
                                    {session.title || "Untitled Insight"}
                                  </p>
                                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                    {new Date(
                                      session.created_at,
                                    ).toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                              </div>
                            </button>

                            {/* Session Actions Menu Trigger */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                setSessionActionsMenu({
                                  session,
                                  anchorRect: rect,
                                });
                              }}
                              className={`absolute right-3 top-3 hidden h-8 w-8 items-center justify-center rounded-xl transition-all hover:bg-slate-100 ${
                                currentSessionId === session.id
                                  ? "text-slate-600 bg-white/50"
                                  : "text-slate-400"
                              } group-hover:flex`}
                              title="Session options"
                            >
                              <FaEllipsisV size={12} />
                            </button>
                          </div>
                        ))
                      )}
                      {!loadingSessions && sessions.length > 0 ? (
                        <div
                          ref={sessionListEndRef}
                          className="flex min-h-10 items-center justify-center py-2"
                        >
                          {loadingMoreSessions ? (
                            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                              <FaSync size={10} className="animate-spin" />
                              Loading More
                            </div>
                          ) : sessionsNextCursor ? (
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                              Scroll for more
                            </span>
                          ) : sessions.length > 5 ? (
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                              End of sessions
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-4 flex flex-col items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    <FaMessage size={12} />
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 [writing-mode:vertical-rl] rotate-180">
                    Sessions
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Chat Area */}
          <div className="min-w-0 self-start lg:sticky lg:top-24">
            {/* Chat Container */}
            <div className="relative group">
              <div className="absolute -inset-0.5 rounded-[28px] bg-gradient-to-r from-slate-200/20 via-slate-100/10 to-slate-200/20 blur opacity-40 transition duration-500" />
              <section className="relative flex min-h-[72vh] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm sm:rounded-[26px] lg:h-[calc(100vh-7rem)] lg:min-h-0">
                {/* Chat Header - More Compact */}
                <div className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-900 text-white shadow-sm">
                        <FaRobot size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-black tracking-tight text-slate-950">
                            AI Assistant
                          </h2>
                          <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/50 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-700">
                            PRO
                          </div>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500/70 uppercase tracking-wider">
                          Enterprise Intelligence System
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setIsMobileSessionSheetOpen(true)}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 shadow-sm transition hover:border-brand-200 hover:text-brand-700 lg:hidden"
                      >
                        <FaMessage size={11} />
                        Sessions
                      </button>
                      <button
                        onClick={reconnectToAgent}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white transition-all hover:bg-slate-50 active:scale-95 ${!isConnected ? "animate-pulse text-rose-500 border-rose-200 shadow-sm" : "text-slate-500"}`}
                        title="Reconnect to Agent"
                      >
                        <FaSync
                          size={12}
                          className={!isConnected ? "animate-spin-slow" : ""}
                        />
                      </button>
                      <div
                        className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-all duration-500 ${
                          isConnected
                            ? "border-emerald-100 bg-emerald-50/30"
                            : "border-rose-100 bg-rose-50/30"
                        }`}
                      >
                        <div
                          className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-rose-500"}`}
                        />
                        <span
                          className={`text-[9px] font-black uppercase tracking-[0.2em] ${isConnected ? "text-emerald-700" : "text-rose-700"}`}
                        >
                          {isConnected ? "Live" : "Offline"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chat History */}
                <div
                  ref={scrollRef}
                  onScroll={handleMessageScroll}
                  className={`agent-scrollbar agent-line-grid flex-1 min-h-0 space-y-8 overflow-y-auto bg-white px-4 py-6 sm:px-6 sm:py-7 lg:px-8 ${showMessageScrollbar ? "show-scrollbar" : ""}`}
                >
                  {isLoadingMoreMessages && (
                    <div className="sticky top-0 z-10 flex justify-center pb-4">
                      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 shadow-sm">
                        <FaSync className="animate-spin" size={10} />
                        Retrieving Context...
                      </div>
                    </div>
                  )}
                  {messages.map((msg, index) => (
                    <MessageBubble
                      key={msg.id || `${msg.type}-${index}`}
                      msg={msg}
                      onCopyMessage={handleCopyMessage}
                      onReuseMessage={handleReuseMessage}
                    />
                  ))}

                  {isProcessing && (
                    <div className="agent-rise-in flex justify-start px-2 sm:px-4">
                      <div className="flex max-w-4xl items-start gap-3 sm:gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm">
                          <FaRobot size={14} />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="rounded-[20px] rounded-tl-md border border-slate-200/70 bg-transparent px-5 py-4 shadow-sm">
                            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-600">
                              <FaMagic
                                size={10}
                                className="animate-spin-slow"
                              />
                              Neural Synthesis
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex gap-1 rounded-md bg-slate-100/70 p-1.5">
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.3s]" />
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.15s]" />
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500" />
                              </div>
                            </div>

                            {currentStatuses.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowLiveProcess((prev) => !prev)
                                  }
                                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 transition-all hover:border-brand-300 hover:bg-white hover:text-brand-700"
                                >
                                  <FaListUl size={10} />
                                  {showLiveProcess
                                    ? "Hide Stream"
                                    : "Monitor Process"}
                                  {showLiveProcess ? (
                                    <FaChevronUp size={8} />
                                  ) : (
                                    <FaChevronDown size={8} />
                                  )}
                                </button>
                                {showLiveProcess && (
                                  <WorkflowPanel
                                    statuses={currentStatuses}
                                    title="Live Data Stream"
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area - Minimalist & Sleek */}
                <div className="border-t border-slate-200/80 bg-transparent p-4 sm:p-6">
                  <div className="mx-auto max-w-4xl">
                    <div className="relative flex items-end gap-2 rounded-2xl border border-slate-200/70 bg-transparent p-2 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.06)] transition-all duration-300 hover:border-slate-300/80 hover:shadow-[0_8px_30px_-4px_rgba(15,23,42,0.1)]">
                      <div className="flex-1 px-4 py-1">
                        <textarea
                          ref={inputRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSend();
                            }
                          }}
                          disabled={isProcessing || Boolean(agentAccessMessage)}
                          rows={1}
                          placeholder={
                            agentAccessMessage
                              ? "AI Agent is unavailable for this plan."
                              : isProcessing
                                ? "Synthesizing..."
                                : "Ask your business assistant..."
                          }
                          className="w-full resize-none bg-transparent px-2 py-3 text-sm font-semibold leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 agent-scrollbar"
                          style={{ minHeight: "24px", maxHeight: "150px" }}
                        />
                      </div>

                      <div className="flex items-center gap-1.5 pr-1">
                        {!isConnected && (
                          <div className="flex items-center gap-1.5 px-3 text-[9px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 rounded-full py-1.5 animate-pulse">
                            Offline
                          </div>
                        )}

                        {isProcessing ? (
                          <button
                            onClick={handleStop}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition-all hover:bg-rose-100 active:scale-90"
                          >
                            <FaTimes size={16} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSend}
                            disabled={
                              !input.trim() ||
                              !isConnected ||
                              Boolean(agentAccessMessage)
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm transition-all hover:bg-black active:scale-95 disabled:opacity-20"
                          >
                            <FaPaperPlane size={14} className="ml-0.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Session Actions Menu */}
      {sessionActionsMenu &&
        createPortal(
          <div
            data-session-actions-floating
            ref={sessionActionsRef}
            style={{
              position: "fixed",
              top: sessionActionsPosition.top,
              left: sessionActionsPosition.left,
              opacity: sessionActionsPosition.opacity,
            }}
            className="z-[100] w-48 animate-in fade-in zoom-in duration-200"
          >
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-md">
              <button
                onClick={() => handleOpenEdit(sessionActionsMenu.session)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 hover:text-brand-600"
              >
                <FaEdit size={14} className="text-slate-400" />
                Edit Title
              </button>
              <button
                onClick={() => handleOpenDelete(sessionActionsMenu.session)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold text-rose-600 transition-all hover:bg-rose-50 hover:text-rose-700"
              >
                <FaTrash size={14} className="text-rose-300" />
                Delete Session
              </button>
            </div>
          </div>,
          document.body,
        )}

      {isMobileSessionSheetOpen &&
        createPortal(
          <div className="fixed inset-0 z-[95] bg-slate-950/45 backdrop-blur-[2px] lg:hidden">
            <button
              type="button"
              aria-label="Close sessions"
              onClick={() => setIsMobileSessionSheetOpen(false)}
              className="absolute inset-0 h-full w-full cursor-default"
            />
            <div className="absolute inset-x-0 bottom-0 top-16 flex flex-col overflow-hidden rounded-t-[28px] border-t border-slate-200 bg-white shadow-2xl">
              <div className="border-b border-slate-200 bg-white px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                      Session Navigator
                    </p>
                    <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">
                      Conversations
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fetchSessions()}
                      className={`inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm transition hover:border-brand-200 hover:text-brand-700 ${loadingSessions ? "pointer-events-none opacity-70" : ""}`}
                      title="Synchronize sessions"
                    >
                      <FaSync
                        size={10}
                        className={loadingSessions ? "animate-spin" : ""}
                      />
                      Sync
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMobileSessionSheetOpen(false)}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-brand-200 hover:text-brand-700"
                      title="Close sessions"
                    >
                      <FaTimes size={14} />
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleNewChat}
                  disabled={isProcessing || !currentSessionId}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-4 text-sm font-bold text-slate-600 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Start new chat"
                >
                  <FaPlus size={14} />
                  New Intelligence Chat
                </button>
              </div>
              <div
                onScroll={handleSessionListScroll}
                className={`agent-scrollbar agent-line-grid flex-1 overflow-y-auto p-3 ${showSessionScrollbar ? "show-scrollbar" : ""}`}
              >
                <div className="space-y-2 rounded-[24px] border border-slate-200/80 bg-white/55 p-2">
                  {loadingSessions ? (
                    <div className="flex flex-col gap-2 p-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-16 animate-pulse rounded-2xl bg-slate-100"
                        />
                      ))}
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center text-xs font-bold text-slate-400">
                      No past sessions found.
                    </div>
                  ) : (
                    sessions.map((session) => (
                      <div key={session.id} className="group relative">
                        <button
                          onClick={() => handleSelectSession(session.id)}
                          disabled={isProcessing}
                          className={`flex w-full min-w-0 flex-col items-start gap-2 rounded-2xl border px-4 py-3 text-left transition-all ${
                            currentSessionId === session.id
                              ? "border-brand-200/80 bg-brand-50/25 shadow-sm"
                              : "border-transparent bg-transparent hover:border-slate-200/80 hover:bg-white/30 hover:shadow-sm"
                          }`}
                        >
                          <div className="flex w-full items-start gap-3">
                            <div
                              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${currentSessionId === session.id ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"}`}
                            >
                              <FaMessage size={12} />
                            </div>
                            <div className="min-w-0 flex-1 pr-2">
                              <p
                                className={`block w-full truncate text-sm font-black leading-5 ${currentSessionId === session.id ? "text-slate-950" : "text-slate-700"}`}
                              >
                                {session.title || "Untitled Insight"}
                              </p>
                              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                {new Date(
                                  session.created_at,
                                ).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        </button>
                      </div>
                    ))
                  )}
                  {!loadingSessions && sessions.length > 0 ? (
                    <div className="flex min-h-10 items-center justify-center py-2">
                      {loadingMoreSessions ? (
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                          <FaSync size={10} className="animate-spin" />
                          Loading More
                        </div>
                      ) : sessionsNextCursor ? (
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                          Scroll for more
                        </span>
                      ) : sessions.length > 5 ? (
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                          End of sessions
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Edit Session Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Session Title"
        type="form"
        confirmText={isActionProcessing ? "Saving..." : "Save Changes"}
        onConfirm={handleUpdateSession}
      >
        <div className="mt-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Session Topic
          </label>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Enter session title..."
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-brand-400 focus:bg-white transition-all shadow-inner"
            autoFocus
          />
        </div>
      </Modal>

      {/* Delete Session Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Conversation?"
        message="This will permanently remove this chat session and its history. This action cannot be undone."
        type="danger"
        confirmText={isActionProcessing ? "Deleting..." : "Delete Permanently"}
        onConfirm={handleDeleteSession}
      />
    </div>
  );
}
