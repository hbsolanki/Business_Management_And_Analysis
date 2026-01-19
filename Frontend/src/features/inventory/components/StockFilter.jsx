import { useState } from "react";

export default function StockFilter({ onApply }) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");

  return (
    <div className="flex gap-3">
      <input
        placeholder="Product name"
        className="border px-3 py-2"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        placeholder="SKU"
        className="border px-3 py-2"
        value={sku}
        onChange={(e) => setSku(e.target.value)}
      />
      <button
        onClick={() => onApply({ name, sku })}
        className="bg-blue-600 text-white px-4 rounded"
      >
        Go
      </button>
    </div>
  );
}
