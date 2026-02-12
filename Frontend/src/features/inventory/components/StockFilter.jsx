import { useState } from "react";

export default function StockFilter({ onApply }) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
      <input
        placeholder="Product name"
        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        placeholder="SKU"
        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
        value={sku}
        onChange={(e) => setSku(e.target.value)}
      />
      <button
        onClick={() => onApply({ name, sku })}
        className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-lg transition"
      >
        Apply
      </button>
    </div>
  );
}
