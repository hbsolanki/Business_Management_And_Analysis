import { FaCommentAlt, FaEllipsisH, FaCheck } from "react-icons/fa";

export function SessionItem({ 
  session, 
  isActive, 
  onSelect, 
  onOptionsClick, 
  isProcessing,
  isSelectionMode,
  isSelected,
  onToggleSelection,
}) {
  const handleClick = () => {
    if (isSelectionMode) {
      onToggleSelection(session.id);
    } else {
      onSelect(session.id);
    }
  };

  return (
    <div className="group relative">
      <button
        onClick={handleClick}
        disabled={isProcessing}
        className={`flex w-full min-w-0 flex-col items-start gap-2 rounded-2xl border px-4 py-3.5 text-left transition-all duration-300 ${
          isActive && !isSelectionMode
            ? "border-brand-200/80 bg-brand-50/25 shadow-sm"
            : isSelected
            ? "border-brand-200/80 bg-brand-50/20"
            : "border-transparent bg-transparent hover:border-slate-200/80 hover:bg-white/30"
        }`}
      >
        <div className="flex w-full items-start gap-3">
          {isSelectionMode ? (
            <div className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${
              isSelected 
                ? "bg-slate-900 border-slate-900 text-white" 
                : "border-slate-200 bg-white"
            }`}>
              {isSelected && <FaCheck size={10} />}
            </div>
          ) : (
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
                isActive 
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-200" 
                  : "bg-slate-100 text-slate-500 group-hover:bg-slate-900 group-hover:text-white"
              }`}
            >
              <FaCommentAlt size={11} />
            </div>
          )}
          
          <div className="min-w-0 flex-1 pr-6">
            <p
              className={`block w-full truncate text-[13px] font-bold leading-5 transition-colors ${
                isActive && !isSelectionMode ? "text-slate-950" : "text-slate-700 group-hover:text-slate-950"
              }`}
            >
              {session.title || "Untitled Insight"}
            </p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 opacity-80">
              {new Date(session.created_at).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </button>

      {!isSelectionMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            onOptionsClick(session, rect);
          }}
          className={`absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-xl transition-all active:scale-90 ${
            isActive
              ? "text-slate-900 bg-slate-100/50"
              : "text-slate-400 bg-slate-50/50 opacity-0 group-hover:opacity-100"
          }`}
          title="Session options"
        >
          <FaEllipsisH size={11} />
        </button>
      )}
    </div>
  );
}
