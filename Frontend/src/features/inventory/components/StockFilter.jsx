import { useState } from "react";

export default function StockFilter({ onApply }) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
      <input
        placeholder="Product name"
        className="border px-3 py-2 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        placeholder="SKU"
        className="border px-3 py-2 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
        value={sku}
        onChange={(e) => setSku(e.target.value)}
      />
      <button
        onClick={() => onApply({ name, sku })}
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors shadow-sm"
      >
        Filter
      </button>
    </div>
  );
}
