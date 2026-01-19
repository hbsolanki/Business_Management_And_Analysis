import { FaTrash } from "react-icons/fa";
import InvoiceProductSearch from "./InvoiceProductSearch";

const formatINR = (v) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);

export default function InvoiceItems({ items, setItems }) {
  const addProduct = (product) => {
    setItems((prev) => {
      const exists = prev.find((i) => i.productId === product.id);
      if (exists) return prev; // do NOT auto-increment

      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          base_price: Number(product.base_price),
          output_gst_rate: Number(product.output_gst_rate),
          quantity: "", // ✅ EMPTY by default
        },
      ];
    });
  };

  const updateQty = (index, value) => {
    const updated = [...items];
    updated[index].quantity = value === "" ? "" : Number(value);
    setItems(updated);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subTotal = items.reduce(
    (sum, i) => sum + i.base_price * (Number(i.quantity) || 0),
    0
  );

  const total = items.reduce((sum, i) => {
    const gst = (i.base_price * i.output_gst_rate) / 100;
    return sum + (i.base_price + gst) * (Number(i.quantity) || 0);
  }, 0);

  return (
    <div className="bg-white border rounded-xl p-6 space-y-5">
      <h3 className="text-lg font-semibold">Invoice Items</h3>

      <InvoiceProductSearch onSelect={addProduct} />

      {items.length === 0 && (
        <p className="text-sm text-gray-500">No products added</p>
      )}

      {items.map((item, i) => {
        const gst = (item.base_price * item.output_gst_rate) / 100;

        return (
          <div key={item.productId} className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-4">
              <span className="flex-1 font-medium">{item.name}</span>

              <input
                type="number"
                min="0"
                placeholder="Qty"
                className="w-24 border rounded px-2 py-1 text-sm"
                value={item.quantity}
                onChange={(e) => updateQty(i, e.target.value)}
              />

              <button
                type="button"
                onClick={() => removeItem(i)}
                className="text-red-600"
              >
                <FaTrash />
              </button>
            </div>

            <div className="text-xs text-gray-600">
              ₹{formatINR(item.base_price)} + {item.output_gst_rate}% (₹
              {formatINR(gst)}) → ₹{formatINR(item.base_price + gst)}
            </div>
          </div>
        );
      })}

      <div className="border-t pt-4 text-right">
        <div className="text-sm text-gray-600">
          Sub Total: ₹{formatINR(subTotal)}
        </div>
        <div className="text-lg font-semibold">Total: ₹{formatINR(total)}</div>
      </div>
    </div>
  );
}
