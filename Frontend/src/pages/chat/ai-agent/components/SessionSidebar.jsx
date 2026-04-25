import React from "react";
import { FaPlus, FaSync } from "react-icons/fa";
import { SessionItem } from "./SessionItem";
import { groupSessionsByDate } from "../utils/agentHelpers";

export function SessionSidebar({
  sessions,
  currentSessionId,
  loadingSessions,
  loadingMoreSessions,
  sessionsNextCursor,
  onSelectSession,
  onNewChat,
  onOptionsClick,
  isProcessing,
  handleSessionListScroll,
  showSessionScrollbar,
}) {
  const groupedSessions = groupSessionsByDate(sessions);

  return (
    <div className="flex h-full flex-col bg-[#F9FAFB] border-r border-slate-200/60 overflow-hidden">
      {/* Sidebar Header */}
      <div className="shrink-0 border-b border-slate-200/60 bg-white/50 p-4 backdrop-blur-sm">
        <button
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-brand-600 px-4 py-3.5 text-[11px] font-black uppercase tracking-[0.15em] text-white transition-all hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-100 active:scale-[0.98]"
        >
          <FaPlus size={12} />
          New Intelligence Chat
        </button>
      </div>

      {/* Session List */}
      <div
        onScroll={handleSessionListScroll}
        className={`agent-scrollbar flex-1 overflow-y-auto p-3 ${showSessionScrollbar ? "show-scrollbar" : ""}`}
      >
        <div className="space-y-1">
          {loadingSessions ? (
            <div className="flex flex-col gap-2 p-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100/80" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/40 p-6 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                No past sessions
              </p>
            </div>
          ) : (
            Object.entries(groupedSessions).map(([groupName, groupSessions]) => (
              <div key={groupName} className="mb-6 space-y-1">
                <h3 className="px-4 text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2">
                  {groupName}
                </h3>
                {groupSessions.map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    isActive={currentSessionId === session.id}
                    onSelect={onSelectSession}
                    onOptionsClick={onOptionsClick}
                    isProcessing={isProcessing}
                  />
                ))}
              </div>
            ))
          )}

          {!loadingSessions && sessions.length > 0 && (
            <div className="flex min-h-10 items-center justify-center py-2">
              {loadingMoreSessions ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  <FaSync size={10} className="animate-spin" />
                  Loading More
                </div>
              ) : sessionsNextCursor ? (
                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-300">
                  Scroll for more
                </span>
              ) : sessions.length > 5 ? (
                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-300">
                  End of history
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
