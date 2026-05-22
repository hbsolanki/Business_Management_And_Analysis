import { useEffect, useRef, useState } from "react";
import { FaPaperPlane, FaStop, FaChevronDown, FaChartPie, FaTasks } from "react-icons/fa";

const AGENT_OPTIONS = [
  { id: "analytics", name: "Analytics Agent", icon: FaChartPie, color: "text-blue-500" },
  { id: "manage", name: "Manage Agent", icon: FaTasks, color: "text-emerald-500" },
];

export function ChatInput({
  input,
  setInput,
  onSend,
  onStop,
  isProcessing,
  disabled,
  selectedAgent,
  setSelectedAgent,
}) {
  const textareaRef = useRef(null);
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const hasInput = Boolean(typeof input === "string" ? input.trim() : "");
  const isInputDisabled = isProcessing || disabled;

  const activeAgent = AGENT_OPTIONS.find(a => a.id === selectedAgent) || AGENT_OPTIONS[0];

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-4 sm:px-4 sm:pb-5">
      {/* Main Container - REMOVED overflow-hidden so dropdown can show */}
      <div className="relative rounded-2xl border border-slate-200/80 bg-white/46 backdrop-blur-xl transition-all duration-200 focus-within:border-slate-300/80 focus-within:bg-white/58">
        
        {/* Background Grid - Moved overflow-hidden here */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.05] overflow-hidden rounded-2xl"
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(rgba(148,163,184,0.18)_1px,transparent_1px)] bg-[size:14px_14px]" />
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/70 rounded-t-2xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-2.5 px-3 py-2.5 sm:px-4">
          {/* Agent Selector */}
          <div className="relative shrink-0 self-start sm:self-end sm:pb-0.5 w-full sm:w-auto border-b border-slate-100 sm:border-0 pb-2 sm:pb-0">
            <button
              type="button"
              onClick={() => setIsAgentMenuOpen(!isAgentMenuOpen)}
              disabled={disabled}
              className="flex w-fit sm:w-auto items-center gap-2 rounded-xl border border-slate-200/60 bg-white/50 px-3 py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-700 transition-all hover:bg-white hover:border-slate-300 active:scale-95 disabled:opacity-50"
            >
              <activeAgent.icon className={activeAgent.color} size={12} />
              <span className="truncate">{activeAgent.name}</span>
              <FaChevronDown size={8} className={`transition-transform duration-200 ${isAgentMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isAgentMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-[60]" 
                  onClick={() => setIsAgentMenuOpen(false)}
                />
                <div className="absolute bottom-full left-0 mb-3 z-[70] w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="px-3 py-2 mb-1 border-b border-slate-100">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Intelligence Persona</span>
                  </div>
                  {AGENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setSelectedAgent(opt.id);
                        setIsAgentMenuOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                        selectedAgent === opt.id 
                          ? "bg-slate-900 text-white shadow-lg shadow-slate-200" 
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <opt.icon size={14} className={selectedAgent === opt.id ? "text-white" : opt.color} />
                      <span className="text-[11px] font-black uppercase tracking-widest">{opt.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-1 items-end gap-2 w-full pt-1 sm:pt-0">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isProcessing ? "Working on your request..." : `Message ${activeAgent.name}`}
              disabled={isInputDisabled}
              aria-label="Chat message input"
              className="agent-scrollbar max-h-48 min-h-[24px] w-full flex-1 resize-none bg-transparent py-1 text-sm leading-6 text-slate-900 placeholder:text-[12.5px] placeholder:font-medium placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
            />

            <div className="flex shrink-0 items-center pb-0.5">
              {isProcessing ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white/70 text-slate-700 transition-all duration-200 hover:bg-white hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 active:scale-95"
                  title="Stop"
                  aria-label="Stop generating"
                >
                  <FaStop size={10} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSend()}
                  disabled={!hasInput || disabled}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-200 active:scale-95 ${
                    hasInput && !disabled
                      ? "border-slate-900/90 bg-slate-900 text-white hover:bg-slate-800"
                      : "border-slate-200/70 bg-white/60 text-slate-400"
                  }`}
                  title="Send"
                  aria-label="Send message"
                >
                  <FaPaperPlane size={10} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
