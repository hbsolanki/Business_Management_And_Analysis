import React, { useRef, useEffect } from "react";
import { FaPaperPlane, FaMagic, FaStop } from "react-icons/fa";

export function ChatInput({ input, setInput, onSend, onStop, isProcessing, disabled }) {
  const textareaRef = useRef(null);

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

  return (
    <div className="mx-auto w-full max-w-4xl px-2 pb-4 sm:px-4 sm:pb-6 md:px-8 md:pb-8">
      <div className="relative group transition-all duration-500">
        <div className="absolute -inset-0.5 rounded-[2.5rem] bg-gradient-to-r from-brand-500 via-indigo-500 to-purple-500 opacity-0 blur transition duration-500 group-focus-within:opacity-20 group-hover:opacity-15"></div>
        <div className="relative flex items-end gap-2 sm:gap-3 rounded-[2rem] sm:rounded-[2.25rem] border border-slate-200/80 bg-white/80 p-2 sm:p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all focus-within:border-brand-300 focus-within:shadow-lg focus-within:shadow-brand-100/30">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isProcessing ? "Agent is thinking..." : disabled ? "Access restricted..." : "Ask your business agent anything..."}
            disabled={isProcessing || disabled}
            className="agent-scrollbar max-h-48 flex-1 resize-none bg-transparent px-3 py-2.5 sm:px-4 sm:py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
          />
          {isProcessing ? (
            <button
              onClick={onStop}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-200 transition-all hover:bg-rose-600 active:scale-90 hover:-translate-y-0.5"
            >
              <FaStop size={14} />
            </button>
          ) : (
            <button
              onClick={() => onSend()}
              disabled={!(typeof input === "string" ? input.trim() : "") || disabled}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all active:scale-90 ${
                (typeof input === "string" ? input.trim() : "") && !disabled
                  ? "bg-brand-600 text-white shadow-lg shadow-brand-200 hover:bg-brand-700 hover:-translate-y-0.5"
                  : "bg-slate-100 text-slate-300"
              }`}
            >
              <FaPaperPlane size={14} />
            </button>
          )}
        </div>
      </div>
      <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 opacity-60">
        AI-Powered Operational Insights & Synthesis
      </p>
    </div>
  );
}
