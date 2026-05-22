import { useState, useEffect, memo } from "react";
import { FaChevronDown, FaChevronUp, FaCheckCircle, FaSpinner, FaExclamationCircle, FaTerminal, FaMagic, FaSync, FaLock } from 'react-icons/fa';
import MessageForm from '../ai-agent/components/MessageForm';

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

import EChartRenderer from "@/components/charts/EChartRenderer";

const ChartRenderer = ({ chartId, chartsCache = {} }) => {
  const cachedData = chartsCache[chartId];
  const config = cachedData?.data || (typeof cachedData === 'object' ? cachedData : null);

  if (config) {
    return <EChartRenderer config={config} />;
  }

  if (!cachedData) {
    return (
      <div className="flex h-[200px] w-full items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/50">
        <div className="flex flex-col items-center gap-2">
          <FaSync className="animate-spin text-slate-500" size={16} />
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={normalizeChartSrcdoc(typeof cachedData === 'string' ? cachedData : (cachedData?.html || ''))}
      width="100%"
      height="450"
      frameBorder="0"
      sandbox="allow-scripts allow-same-origin"
      className="rounded-xl bg-transparent"
      title={`Chart ${chartId}`}
    />
  );
};

const WorkflowPanel = memo(function WorkflowPanel({
  statuses,
  chartsCache = {},
  title = "Agent Workflow",
}) {
  const [expandedIds, setExpandedIds] = useState([]);

  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

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
      <div 
        className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3 cursor-pointer select-none"
        onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
            <FaMagic size={9} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">
            {title}
          </span>
          <div className={`ml-2 transition-transform duration-300 ${isPanelCollapsed ? '' : 'rotate-180'}`}>
            <FaChevronDown size={8} className="text-slate-400" />
          </div>
        </div>
        <div className="flex gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full transition-colors ${isPanelCollapsed ? 'bg-slate-200' : 'bg-emerald-400 animate-pulse'}`} />
          <span className={`h-1.5 w-1.5 rounded-full transition-colors ${isPanelCollapsed ? 'bg-slate-200' : 'bg-emerald-400/60 animate-pulse'}`} />
          <span className={`h-1.5 w-1.5 rounded-full transition-colors ${isPanelCollapsed ? 'bg-slate-200' : 'bg-emerald-400/30 animate-pulse'}`} />
        </div>
      </div>

      {!isPanelCollapsed && (
        <div className="divide-y divide-slate-100/50 p-1 animate-in fade-in slide-in-from-top-2 duration-300">
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
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${isExpanded
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
                      ) : formattedOutput && formattedOutput.includes("<ChartRef:") ? (
                        <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-transparent p-2">
                          <ChartRenderer
                            chartId={formattedOutput.match(/<ChartRef:([a-f0-9-]+)>/i)?.[1]}
                            chartsCache={chartsCache}
                          />
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
                      ) : formattedOutput && formattedOutput.includes('"type": "confirmation_trigger"') ? (
                        <div className="agent-rise-in overflow-hidden rounded-[24px] border border-slate-700/50 bg-slate-900/60 p-5 shadow-2xl backdrop-blur-md">
                          <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-brand-400">
                                Verify Relational Assignment
                              </h4>
                              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Multi-Tenant Secured Transaction</p>
                            </div>
                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                              <FaMagic size={10} />
                            </div>
                          </div>
                          
                          <p className="text-xs font-semibold leading-relaxed text-slate-200 mb-6 bg-slate-950/45 p-4 rounded-xl border border-slate-800">
                            {(() => {
                              try {
                                return JSON.parse(formattedOutput).message;
                              } catch {
                                return "Are you sure you want to proceed with this relational assignment?";
                              }
                            })()}
                          </p>

                          <div className="flex gap-3">
                            <button
                              onClick={() => {
                                try {
                                  const data = JSON.parse(formattedOutput);
                                  window.dispatchEvent(new CustomEvent('agent-assignment-confirm', { 
                                    detail: { 
                                      confirm: true,
                                      entity_type: data.action.parameters.entity_type,
                                      source_id: data.action.parameters.source_id,
                                      target_id: data.action.parameters.target_id
                                    } 
                                  }));
                                } catch (err) {
                                  console.error("Failed to confirm assignment:", err);
                                }
                              }}
                              className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-brand-900/25"
                            >
                              Yes, Link Entities
                            </button>
                            <button
                              onClick={() => {
                                try {
                                  const data = JSON.parse(formattedOutput);
                                  window.dispatchEvent(new CustomEvent('agent-assignment-confirm', { 
                                    detail: { 
                                      confirm: false,
                                      entity_type: data.action.parameters.entity_type,
                                      source_id: data.action.parameters.source_id,
                                      target_id: data.action.parameters.target_id
                                    } 
                                  }));
                                } catch (err) {
                                  console.error("Failed to cancel assignment:", err);
                                }
                              }}
                              className="py-3 px-6 rounded-xl border border-slate-700 bg-slate-850 hover:bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : formattedOutput && formattedOutput.includes('"type": "action_confirm"') ? (
                        <div className="agent-rise-in overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/40 p-1 shadow-inner backdrop-blur-sm">
                          {/* Confirmation Card Content */}
                          <div className="bg-slate-900/60 p-4">
                            <div className="mb-4 flex items-center justify-between">
                              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-brand-400">
                                {JSON.parse(formattedOutput).preview?.Title || "Verify Action"}
                              </h4>
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/20 text-brand-400">
                                <FaMagic size={8} />
                              </div>
                            </div>
                            
                            <div className="space-y-2.5">
                              {Object.entries(JSON.parse(formattedOutput).preview || {}).map(([key, val]) => (
                                key !== "Title" && (
                                  <div key={key} className="flex items-center justify-between border-b border-slate-800/50 pb-2 last:border-0">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{key}</span>
                                    <span className="text-[11px] font-medium text-slate-200">{String(val)}</span>
                                  </div>
                                )
                              ))}
                            </div>

                            <div className="mt-6 flex gap-2">
                              <button
                                onClick={() => {
                                  const data = JSON.parse(formattedOutput);
                                  window.dispatchEvent(new CustomEvent('agent-action-confirm', { 
                                    detail: { action: data.action, status: 'confirmed' } 
                                  }));
                                }}
                                className="flex-1 rounded-xl bg-brand-600 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition hover:bg-brand-500 active:scale-95"
                              >
                                Confirm Execution
                              </button>
                              <button
                                onClick={() => {
                                   window.dispatchEvent(new CustomEvent('agent-action-confirm', { 
                                    detail: { status: 'cancelled' } 
                                  }));
                                }}
                                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 transition hover:bg-slate-750"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : formattedOutput && formattedOutput.includes('"type": "form"') ? (
                        <div className="p-1">
                          {(() => {
                            const formData = JSON.parse(formattedOutput);
                            const formValue = formData.value || formData;

                            // Detect type from endpoint and method
                            const endpoint = formValue.endpoint || '';
                            const method = (formValue.method || 'POST').toUpperCase();
                            
                            let sidePanelType = null;
                            let resourceId = null;
                            const endpointLower = endpoint.toLowerCase();
                            if (endpointLower.includes('/business/branch/') || endpointLower.includes('/branch/')) {
                              sidePanelType = method === 'PATCH' ? 'edit_branch' : 'add_branch';
                              if (method === 'PATCH') {
                                resourceId = endpoint.split('/').filter(Boolean).pop();
                              }
                            } else if (endpointLower.includes('/product/category/') || endpointLower.includes('/product-category/')) {
                              sidePanelType = method === 'PATCH' ? 'edit_product_category' : 'add_product_category';
                              if (method === 'PATCH') {
                                resourceId = endpoint.split('/').filter(Boolean).pop();
                              }
                            } else if (endpointLower.includes('/product/')) {
                              sidePanelType = method === 'PATCH' ? 'edit_product' : 'add_product';
                              if (method === 'PATCH') {
                                resourceId = endpoint.split('/').filter(Boolean).pop();
                              }
                            } else if (endpointLower.includes('/cost/category/')) {
                              sidePanelType = method === 'PATCH' ? 'edit_cost_category' : 'add_cost_category';
                              if (method === 'PATCH') {
                                resourceId = endpoint.split('/').filter(Boolean).pop();
                              }
                            } else if (endpointLower.includes('/cost/monthly/') || endpointLower.includes('/monthly-cost/') || (endpointLower.includes('/cost/') && !endpointLower.includes('/cost/category/'))) {
                              sidePanelType = method === 'PATCH' ? 'edit_monthly_cost' : 'add_monthly_cost';
                              if (method === 'PATCH') {
                                resourceId = endpoint.split('/').filter(Boolean).pop();
                              }
                            } else if (endpointLower.includes('/task/')) {
                              sidePanelType = method === 'PATCH' ? 'edit_task' : 'add_task';
                              if (method === 'PATCH') {
                                resourceId = endpoint.split('/').filter(Boolean).pop();
                              }
                            } else if (endpointLower.includes('/purchase-order/') || endpointLower.includes('/purchase_order/')) {
                              sidePanelType = method === 'PATCH' ? 'edit_purchase_order' : 'add_purchase_order';
                              if (method === 'PATCH') {
                                resourceId = endpoint.split('/').filter(Boolean).pop();
                              }
                            } else if (endpointLower.includes('/sales-order/') || endpointLower.includes('/sales_order/')) {
                              sidePanelType = method === 'PATCH' ? 'edit_sales_order' : 'add_sales_order';
                              if (method === 'PATCH') {
                                resourceId = endpoint.split('/').filter(Boolean).pop();
                              }
                            } else if (endpointLower.includes('/supplier/')) {
                              sidePanelType = method === 'PATCH' ? 'edit_supplier' : 'add_supplier';
                              if (method === 'PATCH') {
                                resourceId = endpoint.split('/').filter(Boolean).pop();
                              }
                            } else if (endpointLower.includes('/customer/')) {
                              sidePanelType = method === 'PATCH' ? 'edit_customer' : 'add_customer';
                              if (method === 'PATCH') {
                                resourceId = endpoint.split('/').filter(Boolean).pop();
                              }
                            } else if (endpointLower.includes('/invoice/')) {
                              sidePanelType = method === 'PATCH' ? 'edit_invoice' : 'add_invoice';
                              if (method === 'PATCH') {
                                resourceId = endpoint.split('/').filter(Boolean).pop();
                              }
                            } else if (endpointLower.includes('/plans/') || endpointLower.includes('/subscription/')) {
                              sidePanelType = 'view_plans';
                            }

                            if (sidePanelType) {
                              return (
                                <button
                                  onClick={() => {
                                    window.dispatchEvent(new CustomEvent('agent-side-panel-trigger', { 
                                      detail: { 
                                        type: sidePanelType,
                                        id: resourceId ? parseInt(resourceId) : undefined,
                                        onComplete: (res) => {
                                          window.dispatchEvent(new CustomEvent('agent-action-complete', { 
                                            detail: { 
                                              ...res,
                                              action: sidePanelType,
                                              name: res?.name
                                            } 
                                          }));
                                        }
                                      } 
                                    }));
                                  }}
                                  className="w-full group flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-brand-500/50 transition-all shadow-xl"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 group-hover:bg-brand-500 group-hover:text-white transition-all">
                                      <FaMagic size={14} />
                                    </div>
                                    <div className="text-left">
                                      <h4 className="text-xs font-black text-white uppercase tracking-widest">{formValue.title}</h4>
                                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-0.5">Launch Integrated Management View</p>
                                    </div>
                                  </div>
                                  <div className="h-8 w-8 rounded-full border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-white group-hover:border-slate-700 transition-all">
                                    <FaChevronDown size={8} className="-rotate-90" />
                                  </div>
                                </button>
                              );
                            }

                            return (
                              <MessageForm 
                                schema={formValue} 
                                onComplete={(res) => {
                                  window.dispatchEvent(new CustomEvent('agent-action-complete', { detail: res }));
                                }}
                              />
                            );
                          })()}
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
      )}
    </div>
  );
});

export default WorkflowPanel;
