import { FaTrash, FaBoxOpen, FaPercent } from "react-icons/fa";
import InvoiceProductSearch from "./InvoiceProductSearch";

export default function InvoiceItems({ items, setItems, branchId, isEmbed = false }) {
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
          quantity: "", 
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

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.base_price * (Number(item.quantity) || 0)), 0);
  };

  const calculateTax = () => {
    return items.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const taxable = item.base_price * qty;
      const tax = (taxable * item.output_gst_rate) / 100;
      return sum + tax;
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const taxTotal = calculateTax();
  const grandTotal = subtotal + taxTotal;

  return (
    <div className={`bg-white border border-slate-200 ${isEmbed ? "rounded-[20px] shadow-sm" : "rounded-[32px] shadow-xl shadow-slate-200/50"} overflow-hidden`}>
      <div className={`border-b border-slate-100 bg-slate-50/50 flex flex-col ${isEmbed ? "p-4 gap-4" : "p-8 xl:flex-row justify-between items-start xl:items-center gap-6"}`}>
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="p-2 bg-slate-900 rounded-lg text-white">
                <FaBoxOpen size={16} />
             </div>
             <h3 className={`font-black text-slate-900 tracking-tight ${isEmbed ? "text-base" : "text-xl"}`}>Invoice Items</h3>
          </div>
          {!isEmbed && <p className="text-xs font-medium text-slate-500 ml-11">Manage product selection and quantities</p>}
        </div>
        <div className={`w-full ${isEmbed ? "" : "xl:w-[400px]"}`}>
          <InvoiceProductSearch onSelect={addProduct} branchId={branchId} />
        </div>
      </div>

      <div className={isEmbed ? "p-4" : "p-8"}>
        {items.length === 0 ? (
          <div className={`text-center rounded-[24px] border-2 border-dashed border-slate-200 bg-slate-50/50 ${isEmbed ? "py-8" : "py-16"}`}>
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-300 border border-slate-100 shadow-sm">
              <FaBoxOpen size={18} />
            </div>
            <p className="text-slate-900 font-black text-sm">Cart is empty</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Search and select products to begin invoicing</p>
          </div>
        ) : (
          <>
            {isEmbed ? (
              <div className="space-y-3 mb-6">
                {items.map((item, i) => {
                  const qty = Number(item.quantity) || 0;
                  const lineSubtotal = item.base_price * qty;
                  const lineTax = (lineSubtotal * item.output_gst_rate) / 100;
                  const lineTotal = lineSubtotal + lineTax;

                  return (
                    <div key={item.productId} className="flex flex-col p-4 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50/70 transition-all gap-3 relative">
                      <div className="flex justify-between items-start pr-8">
                        <div>
                          <div className="font-bold text-slate-900 text-sm leading-tight mb-1">{item.name}</div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-slate-400 uppercase">GST:</span>
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">{item.output_gst_rate}%</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          className="absolute right-3 top-3 text-slate-300 hover:text-rose-600 p-1.5 rounded-xl hover:bg-rose-50 transition-all"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100/70 pt-2.5 mt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Qty:</span>
                          <input
                            type="number"
                            min="1"
                            placeholder="0"
                            className="w-16 bg-white border border-slate-200 rounded-lg py-1.5 text-center text-xs font-black text-slate-900 focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all tabular-nums"
                            value={item.quantity}
                            onChange={(e) => updateQty(i, e.target.value)}
                          />
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] text-slate-400 font-bold">₹{item.base_price} / unit</div>
                          <div className="font-black text-slate-900 text-sm tabular-nums mt-0.5">Total: ₹{lineTotal.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-hidden rounded-[24px] border border-slate-100 mb-8 shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900 text-white uppercase tracking-[0.15em] text-[10px] font-black">
                    <tr>
                      <th className="text-left py-5 px-6">Product Description</th>
                      <th className="text-center py-5 px-4 w-[120px]">Qty</th>
                      <th className="text-right py-5 px-4">Base Price</th>
                      <th className="text-right py-5 px-4">Tax (GST)</th>
                      <th className="text-right py-5 px-4">Total</th>
                      <th className="py-5 px-6 w-[60px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((item, i) => {
                      const qty = Number(item.quantity) || 0;
                      const lineSubtotal = item.base_price * qty;
                      const lineTax = (lineSubtotal * item.output_gst_rate) / 100;
                      const lineTotal = lineSubtotal + lineTax;

                      return (
                        <tr key={item.productId} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-5 px-6">
                            <div className="font-bold text-slate-900 text-sm mb-0.5">{item.name}</div>
                            <div className="flex items-center gap-1.5">
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">GST Configured:</span>
                               <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{item.output_gst_rate}%</span>
                            </div>
                          </td>
                          <td className="text-center py-5 px-4">
                            <input
                              type="number"
                              min="1"
                              placeholder="0"
                              className="w-20 bg-white border border-slate-200 rounded-xl px-3 py-2 text-center text-sm font-black text-slate-900 focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all tabular-nums shadow-sm"
                              value={item.quantity}
                              onChange={(e) => updateQty(i, e.target.value)}
                            />
                          </td>
                          <td className="text-right py-5 px-4 text-slate-600 font-bold tabular-nums">
                            ₹{item.base_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="text-right py-5 px-4">
                            <div className="font-black text-slate-900 text-sm tabular-nums">₹{lineTax.toFixed(2)}</div>
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Included Tax</div>
                          </td>
                          <td className="text-right py-5 px-4">
                             <div className="font-black text-slate-900 text-base tabular-nums">₹{lineTotal.toFixed(2)}</div>
                          </td>
                          <td className="py-5 px-6 text-right">
                            <button
                              type="button"
                              onClick={() => removeItem(i)}
                              className="text-slate-300 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-all active:scale-90"
                            >
                              <FaTrash size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Premium Totals Architecture */}
            <div className={`grid grid-cols-1 ${isEmbed ? "gap-4" : "md:grid-cols-2 gap-8"} pt-4`}>
               {!isEmbed && (
                  <div className="flex flex-col justify-center p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
                     <div className="flex items-center gap-3 text-slate-400 mb-2">
                        <FaPercent size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Taxation Policy</span>
                     </div>
                     <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                       GST is calculated per-line item based on configured product rates. The final grand total includes all statutory taxes (CGST/SGST or IGST) as per legal requirements.
                     </p>
                  </div>
               )}

               <div className={`bg-slate-900 rounded-[24px] ${isEmbed ? "p-5" : "p-8"} shadow-2xl shadow-slate-900/20 relative overflow-hidden`}>
                  {/* Decorative background element */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                  
                  <div className="space-y-3.5 relative">
                    <div className="flex justify-between items-center text-white/50">
                      <span className="text-[9px] font-black uppercase tracking-widest">Subtotal (Net)</span>
                      <span className="font-bold text-xs tabular-nums">₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-white/50">
                      <span className="text-[9px] font-black uppercase tracking-widest">Total Tax (GST)</span>
                      <span className="font-bold text-xs tabular-nums">₹{taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="h-px bg-white/10 my-3"></div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-0.5">Grand Total</p>
                        <p className="text-[10px] text-white/60 font-medium">Inclusive of all taxes</p>
                      </div>
                      <div className="text-right">
                        <span className={`font-black text-white tracking-tighter tabular-nums ${isEmbed ? "text-xl" : "text-3xl"}`}>
                          ₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
