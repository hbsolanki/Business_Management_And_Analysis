import { useEffect, useState, useRef } from "react";
import { FaSearch, FaPlus, FaCheck, FaTimes, FaBoxOpen } from "react-icons/fa";
import api from "@/services/api";

export default function ProductSearchList({ selected, setSelected }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [next, setNext] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const searchTimeout = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setNext(null);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    setLoading(true);
    searchTimeout.current = setTimeout(() => {
      fetchProducts(`/product/?name=${encodeURIComponent(query)}`, true);
    }, 400);

    return () => clearTimeout(searchTimeout.current);
  }, [query]);

  const fetchProducts = async (url, isNewQuery = false) => {
    try {
      if (!isNewQuery) setLoadingMore(true);
      const res = await api.get(url);
      setResults((prev) => (isNewQuery ? res.data.results : [...prev, ...res.data.results]));
      setNext(res.data.next);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const addProduct = (product) => {
    setSelected((prev) => {
      if (prev.find((p) => p.id === product.id)) return prev;
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          sku: product.sku,
          quantity: "",
        },
      ];
    });
  };

  const isSelected = (id) => selected.some((p) => p.id === id);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FaSearch className={`text-gray-400 group-focus-within:text-blue-500 transition-colors ${loading ? "animate-pulse" : ""}`} />
        </div>
        <input
          className="w-full rounded-xl border border-gray-200 pl-10 pr-10 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
          placeholder="Search product by name or SKU..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <FaTimes />
          </button>
        )}
      </div>

      {/* Results List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden max-h-[320px] overflow-y-auto custom-scrollbar">
        {loading && results.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            Searching...
          </div>
        ) : results.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {results.map((p) => {
              const selected = isSelected(p.id);
              return (
                <div
                  key={p.id}
                  className={`flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors group ${selected ? "bg-blue-50/50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100/50 rounded-lg text-gray-400">
                      <FaBoxOpen />
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${selected ? "text-blue-700" : "text-gray-900"}`}>{p.name}</p>
                      <p className="text-xs text-gray-500 font-mono">SKU: {p.sku}</p>
                      <div className="mt-1.5 flex items-center">
                        {p.stock_quantity === undefined || p.stock_quantity === null ? (
                          <span className="bg-gray-100 text-gray-600 text-[10px] font-medium px-2 py-0.5 rounded-full border border-gray-200">
                            Stock: N/A
                          </span>
                        ) : p.stock_quantity <= 0 ? (
                          <span className="bg-red-50 text-red-600 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-red-100 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            Out of Stock
                          </span>
                        ) : p.stock_quantity < 10 ? (
                          <span className="bg-amber-50 text-amber-600 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-100">
                            Low Stock: {p.stock_quantity}
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-600 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-100">
                            Stock: {p.stock_quantity}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => !selected && addProduct(p)}
                    disabled={selected}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${selected
                      ? "bg-green-100 text-green-700 cursor-default"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md active:scale-95"
                      }`}
                  >
                    {selected ? (
                      <>
                        <FaCheck /> Added
                      </>
                    ) : (
                      <>
                        <FaPlus /> Add
                      </>
                    )}
                  </button>
                </div>
              );
            })}

            {next && (
              <button
                type="button"
                onClick={() => fetchProducts(next)}
                disabled={loadingMore}
                className="w-full py-3 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors flex justify-center"
              >
                {loadingMore ? "Loading..." : "Load more products"}
              </button>
            )}
          </div>
        ) : query ? (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center">
            <FaBoxOpen className="text-3xl mb-2 text-gray-300" />
            <p className="text-sm">No products found for "{query}"</p>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400 flex flex-col items-center bg-gray-50/50">
            <FaSearch className="text-2xl mb-2 opacity-20" />
            <p className="text-xs">Type to search for products to add</p>
          </div>
        )}
      </div>
    </div>
  );
}
