import { useState, useEffect, useRef } from "react";
import {
  CurrencyRupeeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilSquareIcon,
  ArrowTrendingUpIcon,
  ReceiptPercentIcon,
  DocumentChartBarIcon,
  BanknotesIcon,
  PowerIcon,
  ArrowDownIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import InfoTooltip from "../InfoTooltip.jsx";
import PRODUCT_TERMS from "../constants/productTerms.js";
import { FaEllipsisV } from "react-icons/fa";

export default function ProductCard({
  product,
  expandedId,
  onToggle,
  onDelete,
  onToggleStatus,
  showFinancials,
}) {
  const expanded = expandedId === product.id;
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef(null);

  useEffect(() => {
    if (!actionsMenuOpen) return;
    const handleClickOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setActionsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [actionsMenuOpen]);

  const costPrice = Number(product.cost_price) || 0;
  const basePrice = Number(product.base_price) || 0;

  const inputGstAmount =
    Number((product.cost_price * product.input_gst_rate) / 100) || 0;

  const outputGstAmount =
    Number((product.base_price * product.output_gst_rate) / 100) || 0;

  const netProfit = Number(product.net_profit) || 0;
  const finalSellingPrice = basePrice + outputGstAmount;

  const description = product.description || "No description provided.";
  const showToggle = product.description && product.description.length > 120;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col transition-all duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 pr-2">
          <h3 className="text-base font-black text-slate-900 leading-tight break-words">
            {product.name}
          </h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
            <span className="break-all">SKU: {product.sku}</span>
            <span className="opacity-30">•</span>
            <span className="shrink-0">ID: {product.id}</span>
          </div>
          {product.product_category && (
            <div className="mt-2.5">
              <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.1em] bg-slate-100 text-slate-600 border border-slate-200 break-words max-w-full">
                {product.product_category.name}
              </span>
            </div>
          )}
        </div>
        <div className="shrink-0 flex items-center justify-end gap-2 relative">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${product.is_active !== false ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}>
            {product.is_active !== false ? 'Active' : 'Inactive'}
          </span>
          <div ref={actionsMenuRef} className="relative z-10">
            <button
              onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
              className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-brand-600 hover:border-brand-200 transition-all flex items-center justify-center p-0"
            >
              <FaEllipsisV size={12} />
            </button>
            {actionsMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 py-1.5 z-50 animate-fade-in"
              >
                <Link
                  to={`/product/${product.id}/edit`}
                  className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-600 font-medium transition-colors"
                >
                  <PencilSquareIcon className="h-4 w-4 mr-3 text-slate-400 group-hover:text-brand-500" />
                  Edit Product
                </Link>
                {onToggleStatus && (
                  <button
                    onClick={() => {
                      onToggleStatus(product);
                      setActionsMenuOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-600 font-medium transition-colors"
                  >
                    <PowerIcon className="h-4 w-4 mr-3 text-slate-400 group-hover:text-brand-500" />
                    {product.is_active !== false ? 'Mark Inactive' : 'Mark Active'}
                  </button>
                )}
                <div className="h-px bg-slate-100 my-1.5 mx-3" />
                <button
                  onClick={() => {
                    onDelete(product.id);
                    setActionsMenuOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 font-medium transition-colors"
                >
                  <TrashIcon className="h-4 w-4 mr-3 text-rose-500" />
                  Delete Product
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-600 mt-3 leading-relaxed">
        {expanded ? description : description.slice(0, 100)}
        {!expanded && description.length > 100 ? "..." : ""}
      </p>

      {
        showToggle && (
          <button
            onClick={() => onToggle(product.id)}
            className="text-slate-900 text-[11px] flex items-center gap-1 mt-2 font-bold uppercase tracking-tighter hover:opacity-70 transition-opacity"
          >
            {expanded ? (
              <>
                <ChevronUpIcon className="h-3.5 w-3.5" />
                Read less
              </>
            ) : (
              <>
                <ChevronDownIcon className="h-3.5 w-3.5" />
                Read more
              </>
            )}
          </button>
        )
      }

      {
        showFinancials && (
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5 text-[13px] animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-500">
                <CurrencyRupeeIcon className="h-4 w-4" />
                <InfoTooltip label="Cost Price" description={PRODUCT_TERMS.costPrice} />
              </span>
              <span className="font-bold text-slate-900">₹{costPrice.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-500">
                <ArrowDownIcon className="h-4 w-4" />
                <InfoTooltip label="Base Price" description={PRODUCT_TERMS.basePrice} />
              </span>
              <span className="font-bold text-slate-900">₹{basePrice.toLocaleString()}</span>
            </div>

            {product.output_gst_rate > 0 && (
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <DocumentChartBarIcon className="h-3.5 w-3.5" />
                  <InfoTooltip
                    label={`Output GST (${product.output_gst_rate}%)`}
                    description={PRODUCT_TERMS.outputGST}
                  />
                </span>
                <span>₹{outputGstAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2.5 border-t border-dashed border-slate-100">
              <span className="flex items-center gap-1.5 text-slate-900 font-bold uppercase tracking-wider text-[11px]">
                <BanknotesIcon className="h-4 w-4 text-emerald-600" />
                <InfoTooltip label="Final Selling Price" description={PRODUCT_TERMS.finalPrice} />
              </span>
              <span className="font-black text-emerald-600 text-sm">
                ₹{finalSellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-900 font-bold uppercase tracking-wider text-[11px]">
                <ArrowTrendingUpIcon className="h-4 w-4 text-blue-600" />
                <InfoTooltip label="Net Profit" description={PRODUCT_TERMS.netProfit} />
              </span>
              <span
                className={`font-black text-sm ${netProfit >= 0 ? "text-blue-600" : "text-rose-600"}`}
              >
                ₹{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            {product.input_gst_rate > 0 && (
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <ReceiptPercentIcon className="h-3.5 w-3.5" />
                  <InfoTooltip
                    label={`Input GST (${product.input_gst_rate}%)`}
                    description={PRODUCT_TERMS.inputGST}
                  />
                </span>
                <span>₹{inputGstAmount.toFixed(2)}</span>
              </div>
            )}
          </div>
        )
      }

    </div >
  );
}
