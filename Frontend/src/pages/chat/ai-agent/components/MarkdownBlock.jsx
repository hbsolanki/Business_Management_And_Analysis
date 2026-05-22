import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useStreamingTypewriter } from "../hooks/useStreamingTypewriter";
import { normalizeStreamingMarkdown } from "./messageUtils";

/**
 * MarkdownBlock Component
 * Renders markdown content with streaming typewriter support and GFM.
 */
function MarkdownBlock({ content, isStreaming }) {
  const normalizedContent = typeof content === "string" ? content : (content ? JSON.stringify(content) : "");
  const displayedContent = useStreamingTypewriter(normalizedContent, 12, isStreaming);

  if (!normalizedContent) return null;

  const mdContent = isStreaming 
    ? normalizeStreamingMarkdown(displayedContent) 
    : content;

  return (
    <div className={`agent-markdown ${isStreaming ? "whitespace-pre-wrap break-words" : ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => (
            <a
              {...props}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-700 underline decoration-brand-300 underline-offset-4 transition hover:text-brand-800 hover:decoration-brand-500"
            >
              {children}
            </a>
          ),
          h3: ({ children }) => (
            <h3 className="mt-8 mb-4 text-[15px] font-bold tracking-tight text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              {children}
            </h3>
          ),
          table: ({ children }) => (
            <div className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-white/50 shadow-sm backdrop-blur-sm">
              <table className="w-full border-collapse text-left text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-50/80 border-b border-slate-200 font-semibold text-slate-700">
              {children}
            </thead>
          ),
          th: ({ children }) => <th className="px-4 py-3 font-bold">{children}</th>,
          td: ({ children }) => <td className="px-4 py-2.5 border-t border-slate-100 text-slate-600 leading-relaxed">{children}</td>,
          ul: ({ children }) => <ul className="my-4 space-y-2.5 pl-6 list-none">{children}</ul>,
          ol: ({ children }) => <ol className="my-4 space-y-2.5 pl-6 list-decimal text-[13px] text-slate-600">{children}</ol>,
          li: ({ children, ordered }) => (
            <li className={`relative text-[13px] leading-relaxed text-slate-600 ${ordered ? "pl-1" : "pl-1"}`}>
              {!ordered && (
                <span className="absolute -left-5 top-2 h-1.5 w-1.5 rounded-full border border-brand-300 bg-brand-50" />
              )}
              {children}
            </li>
          ),
          strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
          p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed text-[13.5px] text-slate-600">{children}</p>,
        }}
      >
        {mdContent}
      </ReactMarkdown>
      {isStreaming && <span className="inline-block w-1 h-4 ml-1 bg-brand-500 animate-pulse align-middle" aria-hidden="true" />}
    </div>
  );
}

export default React.memo(MarkdownBlock);
