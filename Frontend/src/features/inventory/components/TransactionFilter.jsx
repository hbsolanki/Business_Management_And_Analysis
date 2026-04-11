import { useState } from "react";

export default function TransactionFilter({ onApply }) {
  const [product_name, setProductName] = useState("");
  const [product_sku, setProductSku] = useState("");
  const [action, setAction] = useState("");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3">
      <input
        placeholder="Product name"
        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
        value={product_name}
        onChange={(e) => setProductName(e.target.value)}
      />
      <input
        placeholder="SKU"
        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
        value={product_sku}
        onChange={(e) => setProductSku(e.target.value)}
      />
      <select
        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
        value={action}
        onChange={(e) => setAction(e.target.value)}
      >
        <option value="">All Actions</option>
        <option value="IN">Stock In (IN)</option>
        <option value="OUT">Stock Out (OUT)</option>
      </select>
      <button
        onClick={() => onApply({ product_name, product_sku, action })}
        className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-lg transition"
      >
        Apply
      </button>
    </div>
  );
}
