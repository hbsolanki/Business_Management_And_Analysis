import { useEffect, useState, useRef } from "react";
import { FaSearch, FaBox, FaSpinner, FaBarcode, FaTimes } from "react-icons/fa";
import api from "@/services/api";

export default function InvoiceProductSearch({ onSelect, branchId }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    // Click outside to close
    const wrapperRef = useRef(null);
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const timer = setTimeout(() => {
            let url = `/product/?name=${encodeURIComponent(query)}`;
            if (branchId) url += `&branch=${branchId}&branch_id=${branchId}`;
            fetchProducts(url);
        }, 300);

        return () => clearTimeout(timer);
    }, [query, branchId]);

    const fetchProducts = async (url) => {
        setLoading(true);
        try {
            const res = await api.get(url);
            setResults(res.data.results || []);
            setIsOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (product) => {
        if (product.stock_quantity <= 0) return;
        onSelect(product);
        setQuery("");
        setIsOpen(false);
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <label className="text-xs font-semibold text-slate-600 uppercase mb-2 block">Add Products</label>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {loading ? (
                        <FaSpinner className="animate-spin text-slate-500" />
                    ) : (
                        <FaSearch className="text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                    )}
                </div>
                <input
                    type="text"
                    className="block w-full input-icon-left input-icon-right py-3 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all text-sm font-medium border border-slate-200 bg-white"
                    placeholder="Search products by name or SKU..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (e.target.value.length > 0) setIsOpen(true);
                    }}
                    onFocus={() => {
                        if (results.length > 0) setIsOpen(true);
                    }}
                />
                {query && (
                    <button
                        onClick={() => setQuery("")}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <FaTimes />
                    </button>
                )}
            </div>

            {/* Dropdown Results */}
            {isOpen && (results.length > 0 || loading) && query.length > 0 && (
                <div className="bg-white border border-slate-200 absolute z-50 mt-2 w-full rounded-xl shadow-lg max-h-80 overflow-y-auto custom-scrollbar animate-fade-in-up">
                    {results.length === 0 && !loading ? (
                        <div className="p-4 text-center text-slate-500 text-sm">
                            No products found matching &quot;{query}&quot;
                        </div>
                    ) : (
                        <div className="py-2">
                            <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50">
                                Found {results.length} products
                            </div>
                            {results.map((product) => (
                                <button
                                    key={product.id}
                                    onClick={() => handleSelect(product)}
                                    disabled={product.stock_quantity <= 0}
                                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between group border-b border-slate-100 last:border-0 ${product.stock_quantity <= 0 ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-slate-700 transition-colors">
                                            <FaBox />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900 text-sm group-hover:text-slate-900">
                                                {product.name}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-200">
                                                    <FaBarcode /> {product.sku || 'No SKU'}
                                                </span>
                                                {product.stock_quantity !== undefined && (
                                                    <span className={`text-[10px] font-medium ${product.stock_quantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400 font-medium">
                                            SKU: {product.sku || "NA"}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
