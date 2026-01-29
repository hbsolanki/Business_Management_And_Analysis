import { FaTrash, FaBoxOpen, FaInfoCircle, FaCalculator } from "react-icons/fa";
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
      if (exists) return prev;

      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          base_price: Number(product.base_price),
          output_gst_rate: Number(product.output_gst_rate),
          quantity: "", // Default empty to force user input
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

  const calculateItemTotal = (item) => {
    const gstAmount = (item.base_price * item.output_gst_rate) / 100;
    const unitPriceWithGst = item.base_price + gstAmount;
    return unitPriceWithGst * (Number(item.quantity) || 0);
  };

  const subTotal = items.reduce(
    (sum, i) => sum + i.base_price * (Number(i.quantity) || 0),
    0
  );

  const total = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const totalGst = total - subTotal;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
            <FaBoxOpen className="text-blue-600" />
            Invoice Items
          </h3>
          <p className="text-xs text-gray-500 mt-1">Add products and quantities</p>
        </div>
        <div className="w-full sm:w-[320px]">
          <InvoiceProductSearch onSelect={addProduct} />
        </div>
      </div>

      <div className="p-6">
        {items.length === 0 ? (
          <div className="text-center py-10 rounded-xl border-2 border-dashed border-gray-100 bg-gray-50/30">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
              <FaBoxOpen className="text-xl" />
            </div>
            <p className="text-gray-500 font-medium text-sm">No products added yet</p>
            <p className="text-xs text-gray-400 mt-1">Search above to add items to this invoice</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="text-left py-3 px-4 pl-6">Product</th>
                  <th className="text-right py-3 px-4">Rate</th>
                  <th className="text-right py-3 px-4">GST</th>
                  <th className="text-center py-3 px-4 w-[100px]">Qty</th>
                  <th className="text-right py-3 px-4 text-gray-700">Total</th>
                  <th className="py-3 px-4 w-[40px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, i) => {
                  const gstAmount = (item.base_price * item.output_gst_rate) / 100;
                  const itemTotal = calculateItemTotal(item);

                  return (
                    <tr key={item.productId} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 pl-6 font-semibold text-gray-800">
                        {item.name}
                      </td>
                      <td className="text-right py-3 px-4 text-gray-600 font-medium">
                        ₹{formatINR(item.base_price)}
                      </td>
                      <td className="text-right py-3 px-4 text-gray-500">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] bg-blue-50 px-1.5 py-0.5 rounded text-blue-600 font-bold">{item.output_gst_rate}%</span>
                          <span className="text-[10px] mt-0.5 text-gray-400 font-medium">+₹{formatINR(gstAmount)}</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <input
                          type="number"
                          min="1"
                          placeholder="0"
                          className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-center text-sm font-bold focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                          value={item.quantity}
                          onChange={(e) => updateQty(i, e.target.value)}
                        />
                      </td>
                      <td className="text-right py-3 px-4 font-bold text-gray-900 bg-gray-50/30">
                        ₹{formatINR(itemTotal)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          className="text-gray-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all"
                        >
                          <FaTrash size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary Section */}
        {items.length > 0 && (
          <div className="flex flex-col gap-4 mt-6 pt-6 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row justify-end items-end sm:items-center gap-6">
              <div className="text-right space-y-1">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Subtotal</p>
                <p className="font-bold text-gray-700">₹{formatINR(subTotal)}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total GST</p>
                <p className="font-bold text-gray-700">₹{formatINR(totalGst)}</p>
              </div>
              <div className="pl-6 border-l border-gray-100 text-right space-y-1">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">Grand Total</p>
                <p className="text-2xl font-extrabold text-gray-900">₹{formatINR(total)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
