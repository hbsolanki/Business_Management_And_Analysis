import {
  useState,
  useRef,
  useLayoutEffect,
  useCallback,
  useEffect,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  FaEdit,
  FaEllipsisV,
  FaTimes,
  FaPlus,
  FaTrash,
  FaRobot,
  FaSync,
  FaChevronDown,
  FaChevronUp,
  FaCommentAlt,
  FaIndent,
  FaOutdent,
} from "react-icons/fa";

import ProtectedHeader from "@/components/layout/ProtectedHeader";
import { toast } from "react-hot-toast";

// Modular Components
import MessageBubble from "../components/MessageBubble";
import { SessionSidebar } from "./components/SessionSidebar";
import { ThinkingIndicator } from "./components/ThinkingIndicator";
import { ChatInput } from "./components/ChatInput";
import { EditSessionModal, DeleteSessionModal, BulkDeleteModal } from "./components/Modals";

// Hooks & Utilities
import { useAiAgent } from "./hooks/useAiAgent";
import { useAiAgentSessions } from "./hooks/useAiAgentSessions";
import { AgentStyles } from "./styles/AgentStyles";

// Workspace Registry Helper
import { getWorkspaceDetails, renderWorkspaceContent } from "./components/workspaceRegistry";

export default function AiAgent() {
  const navigate = useNavigate();
  const { sessionId: routeSessionId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isSessionPanelOpen, setIsSessionPanelOpen] = useState(() => {
    const saved = localStorage.getItem("bma_sidebar_open");
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem("bma_sidebar_open", JSON.stringify(isSessionPanelOpen));
  }, [isSessionPanelOpen]);
  const [isMobileSessionSheetOpen, setIsMobileSessionSheetOpen] = useState(false);
  const [chartsCache, setChartsCache] = useState({});
  const [showSessionScrollbar, setShowSessionScrollbar] = useState(false);
  const [showMessageScrollbar, setShowMessageScrollbar] = useState(false);

  // Side Panel state
  const [sidePanelConfig, setSidePanelConfig] = useState(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const sidePanelConfigRef = useRef(null);

  useEffect(() => {
    sidePanelConfigRef.current = sidePanelConfig;
  }, [sidePanelConfig]);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState(null);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const scrollRef = useRef(null);
  const sessionActionsRef = useRef(null);
  const sessionScrollbarTimeoutRef = useRef(null);
  const messageScrollbarTimeoutRef = useRef(null);
  const skipAutoScrollRef = useRef(false);
  const isPaginatingRef = useRef(false);
  const hasJustChangedSessionRef = useRef(false);
  const oldScrollHeightRef = useRef(0);
  const oldScrollTopRef = useRef(0);

  const [sessionActionsPosition, setSessionActionsPosition] = useState({
    top: 0,
    left: 0,
    opacity: 0,
  });

  const {
    messages,
    input,
    setInput,
    isProcessing,
    showLiveProcess,
    setShowLiveProcess,
    isLoadingMoreMessages,
    messagesNextCursor,
    handleSendMessage,
    handleStopAgent,
    handleNewChat,
    agentAccessMessage,
    selectedAgent,
    setSelectedAgent,
    fetchMessages,
  } = useAiAgent(routeSessionId, navigate, setChartsCache);

  useEffect(() => {
    const q = searchParams.get("query");
    if (q && q.trim()) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("query");
      setSearchParams(newParams, { replace: true });
      handleSendMessage(q);
    }
  }, [searchParams, setSearchParams, handleSendMessage]);

  const mapActionToLabel = useCallback((action) => {
    let actionLabel = "item";
    if (!action) return actionLabel;
    
    if (action.includes("branch")) actionLabel = "branch";
    else if (action.includes("category")) actionLabel = "category";
    else if (action.includes("product")) actionLabel = "product";
    else if (action.includes("cost")) actionLabel = "cost";
    else if (action.includes("task")) actionLabel = "task";
    else if (action.includes("supplier")) actionLabel = "vendor";
    else if (action.includes("purchase_order") || action.includes("purchase-order")) actionLabel = "purchase order";
    else if (action.includes("sales_order") || action.includes("sales-order")) actionLabel = "sales order";
    else if (action.includes("customer")) actionLabel = "customer";
    else if (action.includes("invoice")) actionLabel = "invoice";
    return actionLabel;
  }, []);

  const handleSidePanelClose = useCallback(() => {
    setIsSidePanelOpen(false);
    
    const config = sidePanelConfigRef.current;
    if (config?.type) {
      const action = config.type;
      const actionLabel = mapActionToLabel(action);
      const verb = action?.includes("create") || action?.includes("add") ? "creation" : "modification";
      handleSendMessage(`Form cancelled: ${actionLabel} ${verb} cancelled by user.`);
    }
  }, [handleSendMessage, mapActionToLabel]);

  useEffect(() => {
    const handleActionConfirm = (e) => {
      const { status } = e.detail;
      if (status === 'confirmed') {
        handleSendMessage("Yes, proceed with creation.");
      } else if (status === 'cancelled') {
        handleSendMessage("Cancel this action.");
      }
    };
    const handleActionComplete = (e) => {
      const { name, action } = e.detail;
      // Close the side panel — the agent's own response provides the confirmation
      setIsSidePanelOpen(false);
      // Notify the agent with a short internal signal
      const actionLabel = mapActionToLabel(action);
      const verb = action?.includes("create") || action?.includes("add") ? "created" : "updated";
      handleSendMessage(`Form submitted: ${name || actionLabel} ${verb} successfully.`);
    };

    const handleSidePanelTrigger = (e) => {
      setSidePanelConfig(e.detail);
      setIsSidePanelOpen(true);
    };

    window.addEventListener('agent-action-confirm', handleActionConfirm);
    window.addEventListener('agent-action-complete', handleActionComplete);
    window.addEventListener('agent-side-panel-trigger', handleSidePanelTrigger);
    window.addEventListener('agent-side-panel-close', handleSidePanelClose);

    return () => {
      window.removeEventListener('agent-action-confirm', handleActionConfirm);
      window.removeEventListener('agent-action-complete', handleActionComplete);
      window.removeEventListener('agent-side-panel-trigger', handleSidePanelTrigger);
      window.removeEventListener('agent-side-panel-close', handleSidePanelClose);
    };
  }, [handleSendMessage, handleSidePanelClose]);

  const {
    sessions,
    currentSessionId,
    loadingSessions,
    loadingMoreSessions,
    sessionsNextCursor,
    fetchSessions,
    handleSelectSession,
    handleUpdateSession,
    handleDeleteSession,
    isActionProcessing,
    sessionActionsMenu,
    setSessionActionsMenu,
    selectedSessionIds,
    isSelectionMode,
    setIsSelectionMode,
    toggleSessionSelection,
    handleBulkDeleteSelected: executeBulkDelete,
  } = useAiAgentSessions(routeSessionId, navigate, handleNewChat);



  // Reset scroll and flags when switching chat sessions
  useEffect(() => {
    if (scrollRef.current) {
      // Force scroll container immediately to the bottom
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    // Set flag indicating session just changed, so the next layout renders at the bottom!
    hasJustChangedSessionRef.current = true;
    skipAutoScrollRef.current = false;
    isPaginatingRef.current = false;
  }, [currentSessionId]);

  useEffect(() => {
    if (isSidePanelOpen) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth"
          });
        }
      }, 100);
    }
  }, [isSidePanelOpen]);

  // Auto-scroll & Synchronous WhatsApp-grade Scroll Anchoring logic
  useLayoutEffect(() => {
    if (!scrollRef.current) return;

    // 1. Snapshot Session Change Load: force snap viewport to the absolute bottom!
    if (hasJustChangedSessionRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      hasJustChangedSessionRef.current = false;
      skipAutoScrollRef.current = false;
      return;
    }

    // 2. Snapshot Pagination: recalibrate scroll top synchronously in the exact same render frame!
    if (isPaginatingRef.current) {
      const { scrollHeight } = scrollRef.current;
      const newScrollHeight = scrollHeight;
      const oldHeight = oldScrollHeightRef.current;
      const oldTop = oldScrollTopRef.current;

      // Anchoring offset calculation + 60px padding
      scrollRef.current.scrollTop = (newScrollHeight - oldHeight) + oldTop + 60;

      // Reset paginating refs
      isPaginatingRef.current = false;
      setTimeout(() => {
        skipAutoScrollRef.current = false;
      }, 150);
      return;
    }

    if (skipAutoScrollRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 150;
    
    // Always scroll if it's the very first message or if user is already at bottom
    if (isAtBottom || messages.length <= 1) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: messages.length <= 1 ? "auto" : "smooth",
      });
    }
  }, [messages]);

  // Session Actions Positioning
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

  // Handle outside clicks for session menu
  useEffect(() => {
    const handleClick = (e) => {
      if (sessionActionsMenu && !e.target.closest("[data-session-actions-floating]")) {
        setSessionActionsMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [sessionActionsMenu, setSessionActionsMenu]);

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

  const onConfirmEdit = async () => {
    const success = await handleUpdateSession(sessionToEdit.id, editTitle);
    if (success) setIsEditModalOpen(false);
  };

  const onConfirmDelete = async () => {
    const success = await handleDeleteSession(sessionToDelete.id);
    if (success) setIsDeleteModalOpen(false);
  };

  const onConfirmBulkDelete = async () => {
    const success = await executeBulkDelete();
    if (success) setIsBulkModalOpen(false);
  };

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleReuseMessage = (text) => {
    setInput(typeof text === "string" ? text : "");
  };

  const handleSessionListScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      fetchSessions(true);
    }

    setShowSessionScrollbar(true);
    if (sessionScrollbarTimeoutRef.current) clearTimeout(sessionScrollbarTimeoutRef.current);
    sessionScrollbarTimeoutRef.current = setTimeout(() => setShowSessionScrollbar(false), 2000);
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight } = e.currentTarget;
    if (scrollTop < 100 && messagesNextCursor && !isLoadingMoreMessages && currentSessionId) {
      skipAutoScrollRef.current = true; // Block auto-scroll to bottom during pagination
      isPaginatingRef.current = true;
      oldScrollHeightRef.current = scrollHeight;
      oldScrollTopRef.current = scrollTop;

      fetchMessages(currentSessionId, true);
    }

    setShowMessageScrollbar(true);
    if (messageScrollbarTimeoutRef.current) clearTimeout(messageScrollbarTimeoutRef.current);
    messageScrollbarTimeoutRef.current = setTimeout(() => setShowMessageScrollbar(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <AgentStyles />
      <ProtectedHeader />

      <main className="max-w-[1700px] mx-auto px-0 sm:px-6 lg:px-8 pt-0 sm:pt-6 pb-0 flex flex-col h-[calc(100dvh-80px)] sm:h-[calc(100vh-80px)]">
        <div className="flex flex-1 gap-0 lg:gap-6 items-stretch min-h-0">

          {/* Desktop Sidebar */}
          <aside 
            className={`hidden lg:flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out border border-slate-200 bg-white shadow-sm rounded-3xl ${
              isSessionPanelOpen ? "w-[280px] opacity-100" : "w-0 opacity-0 border-none -ml-6"
            }`}
          >
            <div className="w-[280px] h-full flex flex-col"> {/* Fixed width inner to prevent content squishing during transition */}
              <SessionSidebar
              sessions={sessions}
              currentSessionId={currentSessionId}
              loadingSessions={loadingSessions}
              loadingMoreSessions={loadingMoreSessions}
              sessionsNextCursor={sessionsNextCursor}
              onSelectSession={handleSelectSession}
              onNewChat={handleNewChat}
              onOptionsClick={(session, rect) => setSessionActionsMenu({ session, anchorRect: rect })}
              isProcessing={isProcessing}
              handleSessionListScroll={handleSessionListScroll}
              showSessionScrollbar={showSessionScrollbar}
              isSelectionMode={isSelectionMode}
              setIsSelectionMode={setIsSelectionMode}
              selectedSessionIds={selectedSessionIds}
              onToggleSelection={toggleSessionSelection}
              handleBulkDeleteSelected={() => setIsBulkModalOpen(true)}
            />
            </div>
          </aside>

          {/* Main Chat Interface */}
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden relative">

            {/* Chat Header */}
            <header className="shrink-0 border-b border-slate-200/60 bg-white/40 px-6 py-4 backdrop-blur-xl z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsSessionPanelOpen(!isSessionPanelOpen)}
                      className="hidden lg:flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-95"
                      title={isSessionPanelOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                    >
                      {isSessionPanelOpen ? <FaOutdent size={14} /> : <FaIndent size={14} />}
                    </button>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-200">
                      <FaRobot size={18} />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-950 uppercase tracking-tight">Intelligence Dashboard</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enterprise Neural Synthesis</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsMobileSessionSheetOpen(true)}
                    className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 border border-slate-200"
                  >
                    <FaCommentAlt size={14} />
                  </button>
                </div>
              </div>
            </header>

            {/* Message Area */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className={`flex-1 overflow-y-auto p-4 md:p-8 space-y-8 agent-scrollbar agent-line-grid ${showMessageScrollbar ? "show-scrollbar" : ""}`}
            >
              {isLoadingMoreMessages && (
                <div className="flex justify-center py-6 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center gap-3 rounded-full bg-white/90 px-5 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 backdrop-blur-md">
                    <FaSync size={10} className="animate-spin text-slate-300" />
                    Synchronizing Neural Archives
                  </div>
                </div>
              )}
               {messages.map((msg, idx) => {
                 const isLastAgent = messages.findLastIndex(m => m.type === "agent") === idx;
                 return (
                   <MessageBubble
                     key={msg.id || idx}
                     msg={msg}
                     chartsCache={chartsCache}
                     onCopyMessage={handleCopyMessage}
                     onReuseMessage={handleReuseMessage}
                     isLastAgentMessage={isLastAgent}
                   />
                 );
               })}

              {/* Interactive Workspace Form Inline Card */}
              {isSidePanelOpen && sidePanelConfig && (
                <div className="agent-rise-in flex w-full justify-start px-2 sm:px-4">
                  <div className="flex w-full max-w-5xl gap-3 sm:gap-4 items-start sm:flex-row">
                    <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl border shadow-sm border-slate-200 bg-white text-slate-700">
                      <FaRobot size={15} />
                    </div>
                    <div className="flex-1 w-full min-w-0 flex flex-col gap-2">
                      <div className="w-full rounded-[24px] rounded-tl-md border border-brand-200 bg-slate-50/50 p-4 sm:p-6 shadow-xl animate-in zoom-in-95 duration-300">
                        {/* Workspace Header */}
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 mb-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-md">
                              {getWorkspaceDetails(sidePanelConfig.type)?.icon}
                            </div>
                            <div>
                              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                {getWorkspaceDetails(sidePanelConfig.type)?.title}
                              </h3>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                Interactive Workspace Feed
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={handleSidePanelClose}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all shrink-0"
                            title="Cancel form workflow"
                          >
                            <FaTimes size={14} />
                          </button>
                        </div>

                        {/* Inline Form Component Content */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-5 shadow-inner overflow-hidden">
                          {renderWorkspaceContent(sidePanelConfig)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <ThinkingIndicator
                showLiveProcess={showLiveProcess}
                setShowLiveProcess={setShowLiveProcess}
                isProcessing={isProcessing}
              />
            </div>

            <footer className="shrink-0 bg-transparent">
              <ChatInput
                input={input}
                setInput={setInput}
                onSend={handleSendMessage}
                onStop={handleStopAgent}
                isProcessing={isProcessing}
                selectedAgent={selectedAgent}
                setSelectedAgent={setSelectedAgent}
                disabled={Boolean(agentAccessMessage)}
              />
            </footer>

            {/* Access Restriction Overlay */}
            {agentAccessMessage && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-md p-6 text-center">
                <div className="max-w-md rounded-[2.5rem] bg-white p-10 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-500">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-rose-50 text-rose-500 mb-8 relative">
                    <div className="absolute inset-0 rounded-[2rem] bg-rose-500/10 animate-ping" />
                    <FaRobot size={32} className="relative z-10" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-3">Service Restriction</h3>
                  <p className="text-base font-medium text-slate-500 leading-relaxed mb-8">
                    {agentAccessMessage}
                  </p>

                  {agentAccessMessage.toLowerCase().includes("subscription") && (
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => navigate("/subscriptions")}
                        className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                      >
                        Explore Enterprise Plans
                      </button>
                      <button
                        onClick={() => navigate("/")}
                        className="w-full py-4 rounded-2xl bg-white text-slate-500 font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all border border-slate-100"
                      >
                        Return to Dashboard
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>



        </div>
      </main>

      {/* Floating Action Menu Portal */}
      {sessionActionsMenu && createPortal(
        <div
          ref={sessionActionsRef}
          data-session-actions-floating
          style={{
            position: "fixed",
            top: sessionActionsPosition.top,
            left: sessionActionsPosition.left,
            opacity: sessionActionsPosition.opacity,
          }}
          className="z-[100] w-52 animate-in fade-in zoom-in duration-200"
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-md">
            {sessionActionsMenu.session.isBulk ? (
              <div className="flex flex-col gap-1">
                {isSelectionMode ? (
                  <>
                    <button
                      onClick={() => {
                        handleBulkDeleteSelected();
                        setSessionActionsMenu(null);
                      }}
                      disabled={selectedSessionIds.length === 0}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-widest transition-all ${
                        selectedSessionIds.length > 0 
                          ? "text-rose-600 hover:bg-rose-50" 
                          : "text-slate-300 cursor-not-allowed"
                      }`}
                    >
                      <FaTrash size={12} className={selectedSessionIds.length > 0 ? "text-rose-300" : "text-slate-200"} />
                      Delete Selected ({selectedSessionIds.length})
                    </button>
                    <button
                      onClick={() => {
                        setIsSelectionMode(false);
                        setSessionActionsMenu(null);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-slate-50"
                    >
                      <FaTimes size={12} className="text-slate-300" />
                      Cancel Selection
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setIsSelectionMode(true);
                      setSessionActionsMenu(null);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-50"
                  >
                    <FaEdit size={12} className="text-slate-400" />
                    Select Sessions
                  </button>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={() => handleOpenEdit(sessionActionsMenu.session)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 hover:text-brand-600"
                >
                  <FaEdit size={14} className="text-slate-400" />
                  Rename Chat
                </button>
                <button
                  onClick={() => handleOpenDelete(sessionActionsMenu.session)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold text-rose-600 transition-all hover:bg-rose-50 hover:text-rose-700"
                >
                  <FaTrash size={14} className="text-rose-300" />
                  Delete History
                </button>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Mobile Sidebar Portal */}
      {isMobileSessionSheetOpen && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm lg:hidden">
          <div className="agent-slide-in-left absolute top-0 left-0 bottom-0 w-[85%] max-w-[320px] bg-white shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Conversations</h2>
                <button onClick={() => setIsMobileSessionSheetOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <FaTimes size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <SessionSidebar
                  sessions={sessions}
                  currentSessionId={currentSessionId}
                  loadingSessions={loadingSessions}
                  loadingMoreSessions={loadingMoreSessions}
                  sessionsNextCursor={sessionsNextCursor}
                  onSelectSession={(id) => { handleSelectSession(id); setIsMobileSessionSheetOpen(false); }}
                  onNewChat={() => { handleNewChat(); setIsMobileSessionSheetOpen(false); }}
                  onOptionsClick={(session, rect) => setSessionActionsMenu({ session, anchorRect: rect })}
                  isProcessing={isProcessing}
                  handleSessionListScroll={handleSessionListScroll}
                  isSelectionMode={isSelectionMode}
                  setIsSelectionMode={setIsSelectionMode}
                  selectedSessionIds={selectedSessionIds}
                  onToggleSelection={toggleSessionSelection}
                  handleBulkDeleteSelected={() => setIsBulkModalOpen(true)}
                />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modals */}
      <EditSessionModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onConfirm={onConfirmEdit}
        editTitle={editTitle}
        setEditTitle={setEditTitle}
        isProcessing={isActionProcessing}
      />
      <DeleteSessionModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={onConfirmDelete}
        isProcessing={isActionProcessing}
      />
      <BulkDeleteModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onConfirm={onConfirmBulkDelete}
        isProcessing={isActionProcessing}
        count={selectedSessionIds.length}
      />
    </div>
  );
}
