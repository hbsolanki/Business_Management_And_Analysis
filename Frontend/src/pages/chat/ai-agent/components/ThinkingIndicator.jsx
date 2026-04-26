import React from "react";
import { FaMicrochip, FaSync } from "react-icons/fa";

export const ThinkingIndicator = ({
  showLiveProcess,
  setShowLiveProcess,
  isProcessing,
}) => {
  if (!isProcessing) return null;

  return (
    <div className="flex flex-col gap-3 py-2 px-4 md:px-0 max-w-3xl mx-auto w-full">
      {/* Active Thinking State */}
      <div className="flex items-center gap-4 bg-white/70 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
             <FaSync className="text-sm animate-spin" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
        </div>
        
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
              AI Processing
            </span>
            <div className="flex gap-1">
              <span className="w-1 h-1 rounded-full bg-brand-500 animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1 h-1 rounded-full bg-brand-500 animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1 h-1 rounded-full bg-brand-500 animate-bounce"></span>
            </div>
          </div>
          
          <div className="text-sm font-bold text-slate-700 min-h-[1.25rem]">
            Analyzing business data...
          </div>
        </div>
      </div>
    </div>
  );
};
