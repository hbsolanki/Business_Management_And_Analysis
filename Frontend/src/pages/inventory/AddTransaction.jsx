import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { inventoryService } from "@/features/inventory/services/inventoryService";
import ProductSearchList from "@/features/inventory/components/ProductSearchList";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import BackButton from "@/components/shared/BackButton";

import {
  FaArrowUp,
  FaArrowDown,
  FaSave,
  FaTrash,
  FaClipboardList,
  FaExclamationTriangle,
} from "react-icons/fa";

export default function AddTransaction() {
  const navigate = useNavigate();

  const [action, setAction] = useState("IN");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateQty = (id, value) => {
    setSelected((prev) =>
      prev.map((p) => (p.id === id ? { ...p, quantity: value } : p))
    );
  };

  const removeItem = (id) => {
    setSelected((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (selected.length === 0) {
      setError("Add at least one product");
      return;
    }

    if (selected.some((p) => !p.quantity || Number(p.quantity) <= 0)) {
      setError("Enter quantity for all products");
      return;
    }

    if (!description.trim()) {
      setError("Description is required");
      return;
    }

    setLoading(true);
    try {
      const items = selected.map((p) => ({
        product_id: p.product_id ?? p.id,
        quantity: Number(p.quantity),
      }));

      await inventoryService.createTransaction({
        action,
        description,
        items,
      });

      navigate(-1);
    } catch {
      setError("Failed to create inventory transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <ProtectedHeader />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <BackButton />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 flex items-center gap-3">
              <span className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                <FaClipboardList className="text-xl" />
              </span>
              Inventory Transaction
            </h1>
            <p className="text-slate-500 mt-2 text-sm">Record stock movements efficiently.</p>
          </div>

          <div className="flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setAction("IN")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition ${
                action === "IN"
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <FaArrowUp className={action === "IN" ? "text-emerald-600" : ""} />
              Stock In
            </button>
            <button
              type="button"
              onClick={() => setAction("OUT")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition ${
                action === "OUT"
                  ? "bg-rose-50 text-rose-700"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <FaArrowDown className={action === "OUT" ? "text-rose-600" : ""} />
              Stock Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="px-6 py-5 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Add Products</h2>
              </div>
              <div className="p-6">
                <ProductSearchList selected={selected} setSelected={setSelected} />
              </div>
            </section>

            {selected.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Selected Items <span className="text-slate-400 text-sm font-normal">({selected.length})</span>
                  </h2>
                  <button
                    onClick={() => setSelected([])}
                    className="text-xs font-semibold text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition"
                  >
                    Clear All
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {selected.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 gap-4"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <span className="mt-1 inline-flex text-xs text-slate-500 border border-slate-200 rounded-full px-2 py-0.5">
                          SKU: {item.sku}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                          <label className="text-[10px] uppercase font-semibold text-slate-400 mb-1">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            placeholder="0"
                            className="w-24 px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 font-semibold text-center transition-all"
                            value={item.quantity}
                            onChange={(e) => updateQty(item.id, e.target.value)}
                            autoFocus
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Remove Item"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm sticky top-24">
              <div className="px-6 py-5 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Transaction Details</h2>
              </div>

              <div className="p-6 space-y-6">
                {error && (
                  <div className="flex items-start gap-3 text-sm font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-4">
                    <FaExclamationTriangle className="text-lg shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Type
                  </label>
                  <div
                    className={`px-4 py-3 rounded-lg border font-semibold flex items-center gap-3 ${
                      action === "IN"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-rose-50 border-rose-200 text-rose-700"
                    }`}
                  >
                    {action === "IN" ? <FaArrowUp /> : <FaArrowDown />}
                    <span>{action === "IN" ? "Stock In (Addition)" : "Stock Out (Reduction)"}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Reason / Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="e.g. Received new shipment from supplier..."
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSubmit}
                    disabled={loading || selected.length === 0}
                    className={`w-full py-3 rounded-lg font-semibold text-white transition flex items-center justify-center gap-2 ${
                      loading || selected.length === 0
                        ? "bg-slate-300 cursor-not-allowed"
                        : "bg-slate-900 hover:bg-slate-800"
                    }`}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <FaSave /> Submit Transaction
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => navigate(-1)}
                    className="w-full py-3 mt-3 rounded-lg text-slate-600 font-semibold bg-slate-100 hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
