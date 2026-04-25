import {
  useState,
  useRef,
  useLayoutEffect,
  useCallback,
  useEffect,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
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
} from "react-icons/fa";

import ProtectedHeader from "@/components/layout/ProtectedHeader";
import { toast } from "react-hot-toast";

// Modular Components
import MessageBubble from "../components/MessageBubble";
import { SessionSidebar } from "./components/SessionSidebar";
import { ThinkingIndicator } from "./components/ThinkingIndicator";
import { ChatInput } from "./components/ChatInput";
import { EditSessionModal, DeleteSessionModal } from "./components/Modals";

// Hooks & Utilities
import { useAiAgent } from "./hooks/useAiAgent";
import { useAiAgentSessions } from "./hooks/useAiAgentSessions";
import { AgentStyles } from "./styles/AgentStyles";

export default function AiAgent() {
  const navigate = useNavigate();
  const { sessionId: routeSessionId } = useParams();

  const [isSessionPanelOpen, setIsSessionPanelOpen] = useState(true);
  const [isMobileSessionSheetOpen, setIsMobileSessionSheetOpen] = useState(false);
  const [chartsCache, setChartsCache] = useState({});
  const [showSessionScrollbar, setShowSessionScrollbar] = useState(false);
  const [showMessageScrollbar, setShowMessageScrollbar] = useState(false);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState(null);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const scrollRef = useRef(null);
  const sessionActionsRef = useRef(null);
  const sessionScrollbarTimeoutRef = useRef(null);
  const messageScrollbarTimeoutRef = useRef(null);
  const skipAutoScrollRef = useRef(false);

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
    fetchMessages,
  } = useAiAgent(routeSessionId, navigate);

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
  } = useAiAgentSessions(routeSessionId, navigate, handleNewChat);

  // Auto-scroll logic
  useLayoutEffect(() => {
    if (skipAutoScrollRef.current) return;
    if (scrollRef.current) {
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
    if (scrollTop === 0 && messagesNextCursor && !isLoadingMoreMessages && currentSessionId) {
      const oldScrollHeight = scrollHeight;
      fetchMessages(currentSessionId, true).then(() => {
        if (scrollRef.current) {
          const newScrollHeight = scrollRef.current.scrollHeight;
          scrollRef.current.scrollTop = newScrollHeight - oldScrollHeight;
        }
      });
    }

    setShowMessageScrollbar(true);
    if (messageScrollbarTimeoutRef.current) clearTimeout(messageScrollbarTimeoutRef.current);
    messageScrollbarTimeoutRef.current = setTimeout(() => setShowMessageScrollbar(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <AgentStyles />
      <ProtectedHeader />

      <main className="max-w-[1700px] mx-auto px-0 sm:px-6 lg:px-8 py-0 sm:py-6 flex flex-col h-[calc(100dvh-80px)] sm:h-[calc(100vh-80px)]">
        <div className="flex flex-1 gap-0 lg:gap-6 items-stretch min-h-0">

          {/* Desktop Sidebar */}
          <aside className="hidden lg:flex flex-col w-[280px] h-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
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
            />
          </aside>

          {/* Main Chat Interface */}
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden sm:rounded-[2rem] border-x sm:border border-slate-200 bg-white shadow-sm relative">

            {/* Chat Header */}
            <header className="shrink-0 border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-md z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-200">
                    <FaRobot size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-950 uppercase tracking-tight">AI Business Intelligence</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enterprise Neural Agent</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsMobileSessionSheetOpen(true)}
                    className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 border border-slate-200"
                  >
                    <FaCommentAlt size={14} />
                  </button>
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Neural Link Active</span>
                  </div>
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
                <div className="flex justify-center py-4">
                  <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 shadow-sm border border-slate-200">
                    <FaSync size={10} className="animate-spin" />
                    Retrieving Neural Logs
                  </div>
                </div>
              )}
              {messages.map((msg, idx) => (
                <MessageBubble
                  key={msg.id || idx}
                  msg={msg}
                  chartsCache={chartsCache}
                  onCopyMessage={handleCopyMessage}
                  onReuseMessage={handleReuseMessage}
                />
              ))}

              <ThinkingIndicator
                showLiveProcess={showLiveProcess}
                setShowLiveProcess={setShowLiveProcess}
                isProcessing={isProcessing}
              />
            </div>

            {/* Input Footer */}
            <footer className="shrink-0">
              <ChatInput
                input={input}
                setInput={setInput}
                onSend={handleSendMessage}
                onStop={handleStopAgent}
                isProcessing={isProcessing}
                disabled={Boolean(agentAccessMessage)}
              />
            </footer>

            {/* Access Restriction Overlay */}
            {agentAccessMessage && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-sm p-6 text-center">
                <div className="max-w-sm rounded-[2rem] bg-white p-8 shadow-2xl border border-slate-100">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-6">
                    <FaRobot size={28} />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Access Restricted</h3>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">{agentAccessMessage}</p>
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
          className="z-[100] w-48 animate-in fade-in zoom-in duration-200"
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-md">
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
    </div>
  );
}
