import { FaTrash, FaBoxOpen } from "react-icons/fa";
import InvoiceProductSearch from "./InvoiceProductSearch";

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

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
            <FaBoxOpen className="text-slate-900" />
            Invoice Items
          </h3>
          <p className="text-xs text-slate-500 mt-1">Add products and quantities</p>
        </div>
        <div className="w-full sm:w-[320px]">
          <InvoiceProductSearch onSelect={addProduct} />
        </div>
      </div>

      <div className="p-6">
        {items.length === 0 ? (
          <div className="text-center py-10 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400 border border-slate-200">
              <FaBoxOpen className="text-xl" />
            </div>
            <p className="text-slate-600 font-medium text-sm">No products added yet</p>
            <p className="text-xs text-slate-400 mt-1">Search above to add items to this invoice</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                  <tr>
                    <th className="text-left py-3 px-4 pl-6">Product</th>
                    <th className="text-center py-3 px-4 w-[100px]">Qty</th>
                    <th className="text-right py-3 px-4">Price</th>
                    <th className="text-right py-3 px-4">Total</th>
                    <th className="py-3 px-4 w-[40px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item, i) => {
                    const qty = Number(item.quantity) || 0;
                    const lineTotal = item.base_price * qty;
                    return (
                      <tr key={item.productId} className="group hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 pl-6 font-medium text-slate-800">
                          {item.name}
                          <div className="text-[10px] text-slate-400 font-normal">GST: {item.output_gst_rate}%</div>
                        </td>
                        <td className="text-center py-3 px-4">
                          <input
                            type="number"
                            min="1"
                            placeholder="0"
                            className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-sm font-semibold focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-none transition-all"
                            value={item.quantity}
                            onChange={(e) => updateQty(i, e.target.value)}
                          />
                        </td>
                        <td className="text-right py-3 px-4 text-slate-600">
                          ₹{item.base_price}
                        </td>
                        <td className="text-right py-3 px-4 font-semibold text-slate-700">
                          ₹{lineTotal.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(i)}
                            className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all"
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

            {/* Totals Summary */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <div className="flex flex-col gap-3 sm:w-1/2 ml-auto">
                <div className="flex justify-between text-slate-600 text-sm">
                  <span>Subtotal</span>
                  <span className="font-medium">
                    ₹{items.reduce((sum, item) => sum + (item.base_price * (Number(item.quantity) || 0)), 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 text-sm">
                  <span>GST (Tax)</span>
                  <span className="font-medium">
                    ₹{items.reduce((sum, item) => {
                      const qty = Number(item.quantity) || 0;
                      const taxable = item.base_price * qty;
                      const tax = (taxable * item.output_gst_rate) / 100;
                      return sum + tax;
                    }, 0).toFixed(2)}
                  </span>
                </div>
                <div className="h-px bg-slate-200 my-1"></div>
                <div className="flex justify-between text-slate-900 font-bold text-lg">
                  <span>Total Amount</span>
                  <span>
                    ₹{items.reduce((sum, item) => {
                      const qty = Number(item.quantity) || 0;
                      const taxable = item.base_price * qty;
                      const tax = (taxable * item.output_gst_rate) / 100;
                      return sum + taxable + tax;
                    }, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
