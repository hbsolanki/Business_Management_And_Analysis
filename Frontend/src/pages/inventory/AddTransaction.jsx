import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { inventoryService } from "@/features/inventory/services/inventoryService";
import ProductSearchList from "@/features/inventory/components/ProductSearchList";
import ProtectedHeader from "@/components/layout/ProtectedHeader";

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
      await inventoryService.createTransaction({
        action,
        description,
        items: selected.map((p) => ({
          productId: p.id,
          quantity: Number(p.quantity),
        })),
      });

      navigate(-1);
    } catch {
      setError("Failed to create inventory transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ProtectedHeader />

      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

          <div className="flex justify-between items-center p-8 bg-white border-b border-gray-100">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <FaClipboardList className="text-blue-600" /> Inventory Transaction
              </h2>
              <p className="text-gray-500 mt-1 text-sm">Record stock movements efficiently</p>
            </div>

            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setAction("IN")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${action === "IN" ? "bg-green-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-200"
                  }`}
              >
                <FaArrowUp /> Stock In
              </button>
              <button
                type="button"
                onClick={() => setAction("OUT")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${action === "OUT" ? "bg-red-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-200"
                  }`}
              >
                <FaArrowDown /> Stock Out
              </button>
            </div>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 flex items-center gap-2 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                <FaExclamationTriangle />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Product Search */}
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">Add Products</label>
                <ProductSearchList selected={selected} setSelected={setSelected} />
              </div>

              {/* Selected Products */}
              {selected.length > 0 && (
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Selected Items</label>
                  <div className="space-y-3">
                    {selected.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white border border-gray-200 rounded-lg p-3 gap-3 shadow-sm"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center border border-gray-300 rounded-lg bg-gray-50 overflow-hidden">
                            <span className="px-3 text-xs font-semibold text-gray-500 bg-gray-100 border-r py-2">Qty</span>
                            <input
                              type="number"
                              min="1"
                              placeholder="0"
                              className="w-20 px-3 py-1 bg-white outline-none text-center font-medium"
                              value={item.quantity}
                              onChange={(e) => updateQty(item.id, e.target.value)}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason / Description
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Why is this stock movement happening?"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-6 py-2.5 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-8 py-2.5 rounded-xl text-white font-bold shadow-lg shadow-blue-500/30 transition-all transform active:scale-95 flex items-center gap-2 ${loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                    }`}
                >
                  <FaSave />
                  {loading ? "Processing..." : "Submit Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
