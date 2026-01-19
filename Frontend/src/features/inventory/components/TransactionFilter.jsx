import { useState } from "react";

export default function TransactionFilter({ onApply }) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [action, setAction] = useState("");

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
      <select
        className="border px-3 py-2"
        value={action}
        onChange={(e) => setAction(e.target.value)}
      >
        <option value="">All</option>
        <option value="IN">IN</option>
        <option value="OUT">OUT</option>
      </select>
      <button
        onClick={() => onApply({ name, sku, action })}
        className="bg-blue-600 text-white px-4 rounded"
      >
        Go
      </button>
    </div>
  );
}
