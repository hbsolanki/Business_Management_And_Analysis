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
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import  InfoTooltip from "../InfoTooltip.jsx"
import  PRODUCT_TERMS from "../constants/productTerms.js"
/* ---------------- Product Card ---------------- */
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

  return (
    <div className="bg-white shadow rounded-lg p-5 flex flex-col">
      {/* ---------------- Header ---------------- */}
      <div className="mb-2">
        <p className="font-semibold text-gray-900">{product.name}</p>
        <p className="text-xs text-gray-500">SKU: {product.sku}</p>

        {product.product_category && (
          <p className="text-xs text-blue-600 mt-1">
            {product.product_category.name}
          </p>
        )}
      </div>

      {/* ---------------- Description ---------------- */}
      <p className="text-sm text-gray-600">
        {expanded
          ? product.description
          : product.description?.slice(0, 100)}
      </p>

      {product.description?.length > 100 && (
        <button
          onClick={() => onToggle(product.id)}
          className="text-blue-600 text-xs flex items-center gap-1 mt-1"
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

      {/* ---------------- Financial Summary ---------------- */}
      <div className="mt-4 space-y-2 text-sm">
        {/* Cost Price */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-gray-600">
            <CurrencyRupeeIcon className="h-4 w-4" />
            <InfoTooltip
              label="Cost Price"
              description={PRODUCT_TERMS.costPrice}
            />
          </span>
          <span className="font-medium">₹{costPrice}</span>
        </div>

        {/* Base Price */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-gray-600">
            <ArrowDownIcon className="h-4 w-4" />
            <InfoTooltip
              label="Base Price"
              description={PRODUCT_TERMS.basePrice}
            />
          </span>
          <span className="font-medium">₹{basePrice}</span>
        </div>

        {/* Output GST */}
        {product.output_gst_rate && (
          <div className="flex items-center justify-between text-xs text-gray-500">
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

        {/* Final Selling Price */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="flex items-center gap-1 text-gray-700 font-medium">
            <BanknotesIcon className="h-4 w-4" />
            <InfoTooltip
              label="Final Selling Price"
              description={PRODUCT_TERMS.finalPrice}
            />
          </span>
          <span className="font-semibold text-blue-600">
            ₹{finalSellingPrice.toFixed(2)}
          </span>
        </div>

        {/* Net Profit */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-gray-700 font-medium">
            <ArrowTrendingUpIcon className="h-4 w-4" />
            <InfoTooltip
              label="Net Profit"
              description={PRODUCT_TERMS.netProfit}
            />
          </span>
          <span
            className={`font-semibold ${
              netProfit >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            ₹{netProfit.toFixed(2)}
          </span>
        </div>

        {/* Input GST */}
        {product.input_gst_rate && (
          <div className="flex items-center justify-between text-xs text-gray-500">
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

      {/* ---------------- Actions ---------------- */}
      <div className="flex justify-between items-center mt-auto pt-4">
        <Link
          to={`/product/${product.id}/edit`}
          className="flex items-center gap-1 text-blue-600 text-sm"
        >
          <PencilSquareIcon className="h-4 w-4" />
          Edit
        </Link>

        <button
          onClick={() => onDelete(product.id)}
          className="flex items-center gap-1 text-red-600 text-sm"
        >
          <TrashIcon className="h-4 w-4" />
          Delete
        </button>
      </div>
    </div>
  );
}
