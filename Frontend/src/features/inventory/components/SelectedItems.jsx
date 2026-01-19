import { FaTrash } from "react-icons/fa";

export default function SelectedItems({ items, setItems }) {
  const updateQty = (id, qty) => {
    if (qty < 1) return;
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Number(qty) } : i))
    );
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  if (!items.length) {
    return <p className="text-sm text-gray-500">No products added</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex justify-between items-center border rounded px-4 py-2"
        >
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-gray-500">SKU: {item.sku}</p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              className="w-20 border px-2 py-1"
              value={item.quantity}
              onChange={(e) => updateQty(item.id, e.target.value)}
            />
            <button
              onClick={() => removeItem(item.id)}
              className="text-red-600"
            >
              <FaTrash />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
