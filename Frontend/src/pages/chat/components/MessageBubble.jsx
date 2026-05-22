import { useEffect, useRef, useState, memo } from "react";
import MarkdownBlock from "../ai-agent/components/MarkdownBlock";
import MessageForm from "../ai-agent/components/MessageForm";
import {
  FaUser,
  FaRobot,
  FaCopy,
  FaPen,
  FaLock,
  FaSync,
} from "react-icons/fa";

const normalizeChartSrcdoc = (srcdocContent) => {
  if (!srcdocContent) return srcdocContent;

  const normalized = srcdocContent
    .replace(/background:\s*#ffffff;/g, "background: transparent;")
    .replace(/background:\s*white;/g, "background: transparent;")
    .replace(/body\s*\{/, "body { color: #0f172a;")
    .replace(
      /\.stat-card\s*\{\s*background:\s*#f7f7f7;/g,
      ".stat-card { background: rgba(241, 245, 249, 0.55); border: 1px solid rgba(226, 232, 240, 0.9);",
    );

  const overrideStyle = `
<style>
  body { background: transparent !important; color: #0f172a !important; }
  .stat-card { background: rgba(241,245,249,0.55) !important; border: 1px solid rgba(226,232,240,0.9) !important; }
  .wrap, .meta, .legend { background: transparent !important; box-shadow: none !important; }
</style>`;

  if (normalized.includes("</head>")) {
    return normalized.replace("</head>", `${overrideStyle}</head>`);
  }

  return `${overrideStyle}${normalized}`;
};

const getRestrictionCard = (value) => {
  if (!value) return null;
  const text = String(value);
  const normalized = text.toLowerCase();

  if (
    normalized.includes("advanced analytics not available in your plan") ||
    normalized.includes(
      "charts and data visualizations require the advanced analytics feature",
    )
  ) {
    return {
      title: "Advanced Analytics not available in your plan",
      description:
        "Charts and data visualizations require the Advanced Analytics feature. Upgrade your subscription plan to unlock this capability.",
      actionLabel: "Upgrade Plan",
    };
  }

  return null;
};

import EChartRenderer from "@/components/charts/EChartRenderer";
import WorkflowPanel from "./WorkflowPanel";

const ChartRenderer = ({ chartId, chartsCache = {}, config = null }) => {
  const cachedData = chartsCache[chartId];

  // Use config if provided directly or look for nested 'data' in cache object
  const finalConfig = config || (cachedData?.data || (typeof cachedData === 'object' ? cachedData : null));

  if (finalConfig) {
    return <EChartRenderer config={finalConfig} />;
  }

  if (!cachedData) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-white/20 backdrop-blur-md">
        <div className="flex flex-col items-center gap-2">
          <FaSync className="animate-spin text-slate-400" size={18} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Waiting for visualization data...
          </span>
        </div>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={normalizeChartSrcdoc(typeof cachedData === 'string' ? cachedData : (cachedData?.html || ''))}
      width="100%"
      height="500"
      frameBorder="0"
      sandbox="allow-scripts allow-same-origin"
      className="rounded-2xl border border-slate-200/80 bg-transparent shadow-sm"
      title={`Chart ${chartId}`}
    />
  );
};

const MessageBubble = memo(function MessageBubble({
  msg,
  chartsCache = {},
  onCopyMessage,
  onReuseMessage,
  isLastAgentMessage,
}) {
  const [showUserActions, setShowUserActions] = useState(false);
  const isUser = msg.type === "user";
  const hideActionsTimeoutRef = useRef(null);

  const getPlainText = (content) => {
    if (!content) return "";
    let parsedContent = content;
    if (typeof content === "string" && content.trim().startsWith("[") && content.trim().endsWith("]")) {
      try {
        parsedContent = JSON.parse(content);
      } catch (e) {}
    }
    if (typeof parsedContent === "string") return parsedContent;
    if (Array.isArray(parsedContent)) {
      return parsedContent
        .filter((part) => part.type === "text")
        .map((part) => part.value)
        .join("\n");
    }
    return String(content);
  };

  useEffect(() => {
    return () => {
      if (hideActionsTimeoutRef.current) {
        clearTimeout(hideActionsTimeoutRef.current);
      }
    };
  }, []);

  const handleActionsMouseEnter = () => {
    if (hideActionsTimeoutRef.current) {
      clearTimeout(hideActionsTimeoutRef.current);
    }
    setShowUserActions(true);
  };

  const handleActionsMouseLeave = () => {
    if (hideActionsTimeoutRef.current) {
      clearTimeout(hideActionsTimeoutRef.current);
    }
    hideActionsTimeoutRef.current = setTimeout(() => {
      setShowUserActions(false);
    }, 220);
  };

  const renderMarkdownContent = (content) => {
    if (!content) return null;
    
    let parsedContent = content;
    if (typeof content === "string" && content.trim().startsWith("[") && content.trim().endsWith("]")) {
      try {
        parsedContent = JSON.parse(content);
      } catch (e) {
        console.warn("Failed to parse message content as JSON array:", e);
      }
    }

    const restrictionCard = getRestrictionCard(typeof parsedContent === "string" ? parsedContent : "");

    if (restrictionCard) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-amber-950 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-white/80 text-amber-700">
              <FaLock size={12} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black tracking-tight text-amber-950">
                {restrictionCard.title}
              </p>
              <p className="mt-1 text-xs font-medium leading-5 text-amber-900/80">
                {restrictionCard.description}
              </p>
              <a
                href="/subscriptions#current-plan"
                className="mt-3 inline-flex items-center rounded-xl border border-amber-300 bg-white/80 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-amber-800 transition hover:bg-white"
              >
                {restrictionCard.actionLabel}
              </a>
            </div>
          </div>
        </div>
      );
    }

    // Handle structured content (array) from backend serializer
    if (Array.isArray(parsedContent)) {
      return (
        <div className="flex flex-col gap-4">
          {parsedContent.map((part, i) =>
            part.type === "text" ? (
              part.value.trim() ? (
                <MarkdownBlock key={i} content={part.value} isStreaming={msg.isStreaming} />
              ) : null
            ) : part.type === "form" ? (
              <MessageForm 
                key={i} 
                schema={part.value} 
                onComplete={(res) => {
                  window.dispatchEvent(new CustomEvent('agent-action-complete', { detail: res }));
                }}
              />
            ) : part.type === "confirmation_trigger" ? (
              <div 
                key={i} 
                className="agent-rise-in my-3 overflow-hidden rounded-[24px] border border-slate-200/90 bg-white/95 p-5 sm:p-6 shadow-xl backdrop-blur-md animate-in zoom-in-95 duration-300"
              >
                <div className="mb-4 flex items-center justify-between border-b border-slate-200/60 pb-3">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800">
                      {part.value.action?.parameters?.entity_type === "task_employee" && "Task Assignment Verification"}
                      {part.value.action?.parameters?.entity_type === "product_category" && "Product Categorization Verification"}
                      {part.value.action?.parameters?.entity_type === "expense_cost_category" && "Expense Allocation Verification"}
                      {part.value.action?.parameters?.entity_type === "expense_branch" && "Expense Branch Allocation"}
                      {!["task_employee", "product_category", "expense_cost_category", "expense_branch"].includes(part.value.action?.parameters?.entity_type) && "Relational Update Verification"}
                    </h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Enterprise Secured Action
                    </p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md">
                    <FaRobot size={14} />
                  </div>
                </div>
                
                <p className="text-xs font-bold leading-relaxed text-slate-700 mb-6 bg-slate-50/50 p-4 rounded-xl border border-slate-200/80 shadow-inner">
                  {part.value.message}
                </p>

                {isLastAgentMessage ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('agent-assignment-confirm', { 
                          detail: { 
                            confirm: true,
                            entity_type: part.value.action?.parameters?.entity_type,
                            source_id: part.value.action?.parameters?.source_id,
                            target_id: part.value.action?.parameters?.target_id
                          } 
                        }));
                      }}
                      className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md"
                    >
                      Yes, Link Entities
                    </button>
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('agent-assignment-confirm', { 
                          detail: { 
                            confirm: false,
                            entity_type: part.value.action?.parameters?.entity_type,
                            source_id: part.value.action?.parameters?.source_id,
                            target_id: part.value.action?.parameters?.target_id
                          } 
                        }));
                      }}
                      className="py-3 px-6 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                    >
                      No, cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-600 border border-emerald-250/25">
                      ✓ Processed & Secured
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <ChartRenderer
                key={part.id || i}
                chartId={part.id}
                config={part.data}
                chartsCache={chartsCache}
              />
            ),
          )}
        </div>
      );
    }

    // Detect and extract ChartRef tags from string (streaming)
    if (typeof content === "string" && content.includes("<ChartRef:")) {
      const chartRefRegex = /<ChartRef:([a-f0-9-]+)>/gi;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = chartRefRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push({
            type: "text",
            value: content.slice(lastIndex, match.index),
          });
        }
        parts.push({ type: "chart", value: match[1] });
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < content.length) {
        parts.push({ type: "text", value: content.slice(lastIndex) });
      }

      return (
        <div className="flex flex-col gap-4">
          {parts.map((part, i) =>
            part.type === "text" ? (
              part.value.trim() ? (
                <MarkdownBlock key={i} content={part.value} isStreaming={msg.isStreaming} />
              ) : null
            ) : (
              <ChartRenderer key={i} chartId={part.value} chartsCache={chartsCache} />
            ),
          )}
        </div>
      );
    }

    // Detect and extract iframe HTML from the message (Legacy/Fallback)
    if (typeof content === "string" && content.includes("<iframe") && content.includes("</iframe>")) {
      const iframeStart = content.indexOf("<iframe");
      const iframeEnd = content.indexOf("</iframe>") + "</iframe>".length;

      if (iframeStart !== -1 && iframeEnd > iframeStart) {
        const iframeHtml = content.slice(iframeStart, iframeEnd);

        let srcdocContent = null;
        const srcdocMarker = "srcdoc='";
        const markerIdx = iframeHtml.indexOf(srcdocMarker);
        if (markerIdx !== -1) {
          const contentStart = markerIdx + srcdocMarker.length;
          const contentEnd = iframeHtml.indexOf("'", contentStart);
          if (contentEnd !== -1) {
            srcdocContent = iframeHtml
              .slice(contentStart, contentEnd)
              .replace(/&apos;/g, "'")
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">");
          }
        }

        const beforeIframe = content.slice(0, iframeStart).trim();
        const afterIframe = content.slice(iframeEnd).trim();
        const textContent = [beforeIframe, afterIframe]
          .filter(Boolean)
          .join("\n\n");
        const iframeRestrictionCard = getRestrictionCard(
          `${srcdocContent || ""} ${iframeHtml}`,
        );

        return (
          <div className="flex flex-col gap-4">
            {textContent ? (
              <MarkdownBlock content={textContent} isStreaming={msg.isStreaming} />
            ) : null}
            {iframeRestrictionCard ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-amber-950 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-white/80 text-amber-700">
                    <FaLock size={12} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black tracking-tight text-amber-950">
                      {iframeRestrictionCard.title}
                    </p>
                    <p className="mt-1 text-xs font-medium leading-5 text-amber-900/80">
                      {iframeRestrictionCard.description}
                    </p>
                    <a
                      href="/subscriptions#current-plan"
                      className="mt-3 inline-flex items-center rounded-xl border border-amber-300 bg-white/80 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-amber-800 transition hover:bg-white"
                    >
                      {iframeRestrictionCard.actionLabel}
                    </a>
                  </div>
                </div>
              </div>
            ) : srcdocContent ? (
              <iframe
                srcDoc={normalizeChartSrcdoc(srcdocContent)}
                width="100%"
                height="500"
                frameBorder="0"
                sandbox="allow-scripts allow-same-origin"
                className="rounded-2xl border border-slate-200/80 bg-transparent shadow-sm"
                title="Chart"
              />
            ) : (
              <div
                className="min-h-[380px] overflow-hidden rounded-2xl border border-slate-200/80 bg-transparent shadow-sm"
                dangerouslySetInnerHTML={{ __html: iframeHtml }}
              />
            )}
          </div>
        );
      }
    }

    return <MarkdownBlock content={content} isStreaming={msg.isStreaming} />;
  };

  return (
    <div
      className={`agent-rise-in flex w-full ${isUser ? "justify-end" : "justify-start"} px-2 sm:px-4`}
      onMouseEnter={isUser ? handleActionsMouseEnter : undefined}
      onMouseLeave={isUser ? handleActionsMouseLeave : undefined}
    >
      <div
        className={`flex w-full max-w-5xl flex-col gap-3 sm:gap-4 ${isUser ? "items-end sm:flex-row-reverse sm:items-start" : "items-start sm:flex-row"}`}
      >
        <div
          className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl border shadow-sm transition-all duration-300 hover:scale-105 ${isUser
              ? "border-brand-200 bg-brand-50 text-brand-600"
              : "border-slate-100 bg-white text-slate-800"
            }`}
        >
          {isUser ? <FaUser size={14} /> : <FaRobot size={15} />}
        </div>

        <div
          className={`flex min-w-0 w-full flex-1 flex-col gap-2 sm:gap-3 ${isUser ? "items-end" : "items-start"}`}
        >
          <div
            className={`w-full ${isUser ? "max-w-[95%] sm:max-w-[85%]" : "max-w-full"} rounded-[24px] px-4 py-3 sm:px-6 sm:py-4 transition-all duration-300 ${isUser
                ? "rounded-tr-md border border-brand-200/70 bg-brand-50/55 text-slate-800 shadow-sm"
                : "rounded-tl-md agent-glass text-slate-800"
              }`}
          >
            {!isUser && msg.workflow && msg.workflow.length > 0 && (
              <WorkflowPanel
                statuses={msg.workflow}
                chartsCache={chartsCache}
                title="Analysis Pipeline"
              />
            )}
            <div className={!isUser && msg.workflow?.length > 0 ? "mt-4" : ""}>
              {renderMarkdownContent(msg.message)}
            </div>
          </div>

          {isUser ? (
            <div className="w-full max-w-[95%] sm:max-w-[85%]">
              <div
                className={`flex justify-end transition-all duration-200 ${showUserActions ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
              >
                <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur">
                  <button
                    type="button"
                    onClick={() => onCopyMessage?.(getPlainText(msg.message))}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <FaCopy size={10} />
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => onReuseMessage?.(getPlainText(msg.message))}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-600 transition hover:bg-brand-50 hover:text-brand-700"
                  >
                    <FaPen size={10} />
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
});

export default MessageBubble;
