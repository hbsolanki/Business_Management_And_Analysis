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
    <div className="min-h-screen bg-gray-50/50">
      <ProtectedHeader />

      <div className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-500/30">
                <FaClipboardList className="text-xl" />
              </div>
              Inventory Transaction
            </h1>
            <p className="text-gray-500 mt-2 font-medium">Record stock movements efficiently</p>
          </div>

          <div className="flex bg-white rounded-xl p-1.5 shadow-sm border border-gray-200">
            <button
              type="button"
              onClick={() => setAction("IN")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${action === "IN"
                  ? "bg-green-100 text-green-700 shadow-sm"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
            >
              <FaArrowUp className={action === "IN" ? "text-green-600" : ""} /> Stock In
            </button>
            <button
              type="button"
              onClick={() => setAction("OUT")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${action === "OUT"
                  ? "bg-red-100 text-red-700 shadow-sm"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
            >
              <FaArrowDown className={action === "OUT" ? "text-red-600" : ""} /> Stock Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT: Product Selection */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h2 className="font-bold text-gray-800 text-lg">Add Products</h2>
              </div>
              <div className="p-6">
                <ProductSearchList selected={selected} setSelected={setSelected} />
              </div>
            </div>

            {selected.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in-up">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h2 className="font-bold text-gray-800 text-lg">Selected Items <span className="text-gray-400 font-normal text-sm ml-2">({selected.length})</span></h2>
                  <button onClick={() => setSelected([])} className="text-xs font-semibold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">Clear All</button>
                </div>
                <div className="divide-y divide-gray-100">
                  {selected.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 hover:bg-gray-50 transition-colors gap-4"
                    >
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-xs font-medium border border-gray-200">SKU: {item.sku}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                          <label className="text-[10px] uppercase font-bold text-gray-400 mb-1">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            placeholder="0"
                            className="w-24 px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-semibold text-center transition-all"
                            value={item.quantity}
                            onChange={(e) => updateQty(item.id, e.target.value)}
                            autoFocus
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all self-end mb-0.5"
                          title="Remove Item"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Transaction Details */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h2 className="font-bold text-gray-800 text-lg">Transaction Details</h2>
              </div>

              <div className="p-6 space-y-6">
                {/* Error Display */}
                {error && (
                  <div className="flex items-start gap-3 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl p-4 animate-shake">
                    <FaExclamationTriangle className="text-lg shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Type
                  </label>
                  <div className={`px-4 py-3 rounded-xl border font-semibold flex items-center gap-3 ${action === "IN" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
                    }`}>
                    {action === "IN" ? <FaArrowUp /> : <FaArrowDown />}
                    <span>{action === "IN" ? "Stock In (Addition)" : "Stock Out (Reduction)"}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Reason / Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="e.g. Received new shipment from supplier..."
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSubmit}
                    disabled={loading || selected.length === 0}
                    className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${loading || selected.length === 0
                        ? "bg-gray-300 cursor-not-allowed shadow-none"
                        : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-blue-500/30"
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
                    className="w-full py-3 mt-3 rounded-xl text-gray-600 font-semibold hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
