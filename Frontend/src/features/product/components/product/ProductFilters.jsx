import { useState } from "react";
import { FiSearch, FiHash } from "react-icons/fi";

export default function ProductFilters({ categories = [], onApply }) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Product Name */}
      <div className="flex items-center gap-2 border rounded-md px-3 py-2 w-full">
        <FiSearch className="text-gray-500" />
        <input
          placeholder="Product name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full outline-none text-sm"
        />
      </div>

      {/* SKU */}
      <div className="flex items-center gap-2 border rounded-md px-3 py-2 w-full">
        <FiHash className="text-gray-500" />
        <input
          placeholder="SKU"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          className="w-full outline-none text-sm"
        />
      </div>

      {/* Category */}
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="border rounded-md px-3 py-2 text-sm w-full lg:w-1/4"
      >
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Apply */}
      <button
        onClick={() =>
          onApply({
            name,
            sku,
            product_category: category,
          })
        }
        className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm hover:bg-blue-700"
      >
        Go
      </button>
    </div>
  );
}
