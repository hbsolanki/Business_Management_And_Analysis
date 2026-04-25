import { FaCommentAlt, FaEllipsisV } from "react-icons/fa";

export function SessionItem({ session, isActive, onSelect, onOptionsClick, isProcessing }) {
  return (
    <div className="group relative">
      <button
        onClick={() => onSelect(session.id)}
        disabled={isProcessing}
        className={`flex w-full min-w-0 flex-col items-start gap-2 rounded-2xl border px-4 py-3.5 text-left transition-all duration-300 ${
          isActive
            ? "border-brand-200/80 bg-brand-50/25 shadow-sm"
            : "border-transparent bg-transparent hover:border-slate-200/80 hover:bg-white/30"
        }`}
      >
        <div className="flex w-full items-start gap-3">
          <div
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
              isActive 
                ? "bg-brand-600 text-white shadow-lg shadow-brand-200" 
                : "bg-slate-100 text-slate-500 group-hover:bg-brand-100 group-hover:text-brand-600"
            }`}
          >
            <FaCommentAlt size={11} />
          </div>
          <div className="min-w-0 flex-1 pr-6">
            <p
              className={`block w-full truncate text-[13px] font-bold leading-5 transition-colors ${
                isActive ? "text-slate-950" : "text-slate-700 group-hover:text-brand-700"
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

      <button
        onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          onOptionsClick(session, rect);
        }}
        className={`absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-xl transition-all active:scale-90 ${
          isActive
            ? "text-brand-700 bg-brand-100/50"
            : "text-slate-400 bg-slate-50/50 opacity-0 group-hover:opacity-100"
        }`}
        title="Session options"
      >
        <FaEllipsisV size={11} />
      </button>
    </div>
  );
}
