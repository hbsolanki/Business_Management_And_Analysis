import {
  CurrencyRupeeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowDownIcon,
  ArrowTrendingUpIcon,
  ReceiptPercentIcon,
  DocumentChartBarIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import InfoTooltip from "../InfoTooltip.jsx";
import PRODUCT_TERMS from "../constants/productTerms.js";

export default function ProductCard({
  product,
  expandedId,
  onToggle,
  onDelete,
}) {
  const expanded = expandedId === product.id;

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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-900">{product.name}</p>
          <p className="text-xs text-slate-500 mt-1">
            SKU: {product.sku} <span className="mx-1">•</span> ID: {product.id}
          </p>
          {product.product_category && (
            <span className="inline-flex mt-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
              {product.product_category.name}
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-600 mt-3">
        {expanded ? description : description.slice(0, 120)}
        {!expanded && description.length > 120 ? "..." : ""}
      </p>

      {showToggle && (
        <button
          onClick={() => onToggle(product.id)}
          className="text-slate-600 text-xs flex items-center gap-1 mt-2 font-semibold"
        >
          {expanded ? (
            <>
              <ChevronUpIcon className="h-4 w-4" />
              Read less
            </>
          ) : (
            <>
              <ChevronDownIcon className="h-4 w-4" />
              Read more
            </>
          )}
        </button>
      )}

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-slate-500">
            <CurrencyRupeeIcon className="h-4 w-4" />
            <InfoTooltip label="Cost Price" description={PRODUCT_TERMS.costPrice} />
          </span>
          <span className="font-semibold text-slate-900">₹{costPrice}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-slate-500">
            <ArrowDownIcon className="h-4 w-4" />
            <InfoTooltip label="Base Price" description={PRODUCT_TERMS.basePrice} />
          </span>
          <span className="font-semibold text-slate-900">₹{basePrice}</span>
        </div>

        {product.output_gst_rate && (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <DocumentChartBarIcon className="h-4 w-4" />
              <InfoTooltip
                label={`Output GST (${product.output_gst_rate}%)`}
                description={PRODUCT_TERMS.outputGST}
              />
            </span>
            <span>₹{outputGstAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <span className="flex items-center gap-1 text-slate-700 font-medium">
            <BanknotesIcon className="h-4 w-4" />
            <InfoTooltip label="Final Selling Price" description={PRODUCT_TERMS.finalPrice} />
          </span>
          <span className="font-semibold text-emerald-600">
            ₹{finalSellingPrice.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-slate-700 font-medium">
            <ArrowTrendingUpIcon className="h-4 w-4" />
            <InfoTooltip label="Net Profit" description={PRODUCT_TERMS.netProfit} />
          </span>
          <span
            className={`font-semibold ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
          >
            ₹{netProfit.toFixed(2)}
          </span>
        </div>

        {product.input_gst_rate && (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <ReceiptPercentIcon className="h-4 w-4" />
              <InfoTooltip
                label={`Input GST (${product.input_gst_rate}%)`}
                description={PRODUCT_TERMS.inputGST}
              />
            </span>
            <span>₹{inputGstAmount.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-200">
        <Link
          to={`/product/${product.id}/edit`}
          className="inline-flex items-center gap-1 text-slate-600 text-sm font-semibold hover:text-slate-900"
        >
          <PencilSquareIcon className="h-4 w-4" />
          Edit
        </Link>

        <button
          onClick={() => onDelete(product.id)}
          className="inline-flex items-center gap-1 text-rose-600 text-sm font-semibold hover:text-rose-700"
        >
          <TrashIcon className="h-4 w-4" />
          Delete
        </button>
      </div>
    </div>
  );
}
