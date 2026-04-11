import { useState, memo } from "react";
import { FaMagic, FaChevronUp, FaChevronDown, FaLock } from "react-icons/fa";

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

const extractIframePayload = (output) => {
  const candidate =
    typeof output === "string"
      ? output
      : typeof output?.result === "string"
        ? output.result
        : null;

  if (
    !candidate ||
    !candidate.includes("<iframe") ||
    !candidate.includes("</iframe>")
  ) {
    return null;
  }

  const iframeStart = candidate.indexOf("<iframe");
  const iframeEnd = candidate.indexOf("</iframe>") + "</iframe>".length;

  if (iframeStart === -1 || iframeEnd <= iframeStart) {
    return null;
  }

  const iframeHtml = candidate.slice(iframeStart, iframeEnd);
  const srcdocMarker = "srcdoc='";
  const markerIdx = iframeHtml.indexOf(srcdocMarker);

  if (markerIdx === -1) {
    return { iframeHtml, srcdocContent: null };
  }

  const contentStart = markerIdx + srcdocMarker.length;
  const contentEnd = iframeHtml.indexOf("'", contentStart);

  if (contentEnd === -1) {
    return { iframeHtml, srcdocContent: null };
  }

  const srcdocContent = iframeHtml
    .slice(contentStart, contentEnd)
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  return { iframeHtml, srcdocContent };
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

const WorkflowPanel = memo(function WorkflowPanel({
  statuses,
  title = "Agent Workflow",
}) {
  const [expandedIds, setExpandedIds] = useState([]);

  const toggleOutput = (statusId) => {
    setExpandedIds((prev) =>
      prev.includes(statusId)
        ? prev.filter((id) => id !== statusId)
        : [...prev, statusId],
    );
  };

  const formatToolOutput = (output) => {
    if (output === null || output === undefined) return "";
    if (typeof output === "string") return output;
    try {
      return JSON.stringify(output, null, 2);
    } catch {
      return String(output);
    }
  };

  return (
    <div className="mt-3 overflow-hidden rounded-[24px] border border-slate-200/60 bg-white/40 shadow-sm backdrop-blur-md animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
            <FaMagic size={9} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">
            {title}
          </span>
        </div>
        <div className="flex gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
          <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
          <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
        </div>
      </div>

      <div className="divide-y divide-slate-100/50 p-1">
        {statuses.map((status, index) => {
          const statusId = status.id || `${status.label}-${index}`;
          const isExpanded = expandedIds.includes(statusId);
          const iframePayload = status.output
            ? extractIframePayload(status.output)
            : null;
          const formattedOutput = formatToolOutput(status.output);
          const restrictionCard = getRestrictionCard(formattedOutput);
          const iframeRestrictionCard = iframePayload
            ? getRestrictionCard(
                `${iframePayload.srcdocContent || ""} ${iframePayload.iframeHtml || ""}`,
              )
            : null;
          const effectiveRestrictionCard =
            restrictionCard || iframeRestrictionCard;
          return (
            <div
              key={statusId}
              className="group px-4 py-3 transition-colors hover:bg-slate-50/50"
            >
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-[10px] font-black text-slate-500 shadow-sm group-hover:border-brand-200 group-hover:text-brand-600">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold tracking-tight text-slate-800">
                        {status.label}
                      </p>
                      <div className="h-1 w-1 rounded-full bg-emerald-400" />
                    </div>

                    {status.output ? (
                      <button
                        type="button"
                        onClick={() => toggleOutput(statusId)}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                          isExpanded
                            ? "border-slate-800 bg-slate-900 text-white shadow-md"
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:shadow-sm"
                        }`}
                      >
                        {isExpanded ? "Collapse" : "Data Link"}
                        {isExpanded ? (
                          <FaChevronUp size={7} />
                        ) : (
                          <FaChevronDown size={7} />
                        )}
                      </button>
                    ) : (
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">
                        Synchronized
                      </span>
                    )}
                  </div>

                  {status.output && isExpanded ? (
                    <div className="agent-rise-in mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-2xl">
                      <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-slate-500">
                            Tool Output {status.tool ? `:: ${status.tool}` : ""}
                          </span>
                        </div>
                        <div className="font-mono text-[8px] text-slate-700">
                          X-UNIT-42
                        </div>
                      </div>
                      {effectiveRestrictionCard ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-amber-950 shadow-sm">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-white/80 text-amber-700">
                              <FaLock size={12} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black tracking-tight text-amber-950">
                                {effectiveRestrictionCard.title}
                              </p>
                              <p className="mt-1 text-xs font-medium leading-5 text-amber-900/80">
                                {effectiveRestrictionCard.description}
                              </p>
                              <a
                                href="/subscriptions#current-plan"
                                className="mt-3 inline-flex items-center rounded-xl border border-amber-300 bg-white/80 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-amber-800 transition hover:bg-white"
                              >
                                {effectiveRestrictionCard.actionLabel}
                              </a>
                            </div>
                          </div>
                        </div>
                      ) : iframePayload ? (
                        <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-transparent p-2">
                          {iframePayload.srcdocContent ? (
                            <iframe
                              srcDoc={normalizeChartSrcdoc(
                                iframePayload.srcdocContent,
                              )}
                              width="100%"
                              height="500"
                              frameBorder="0"
                              sandbox="allow-scripts allow-same-origin"
                              className="rounded-xl bg-transparent"
                              title={`Tool Output ${status.tool || "Chart"}`}
                            />
                          ) : (
                            <div
                              className="min-h-[380px] overflow-hidden rounded-xl bg-transparent"
                              dangerouslySetInnerHTML={{
                                __html: iframePayload.iframeHtml,
                              }}
                            />
                          )}
                        </div>
                      ) : (
                        <pre className="agent-scrollbar max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-slate-300 selection:bg-brand-500/30">
                          {formattedOutput}
                        </pre>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default WorkflowPanel;
