import { useEffect, useState, useRef } from "react";
import { FaSearch, FaPlus, FaBox, FaSpinner, FaBarcode, FaTimes, FaCheck } from "react-icons/fa";
import api from "@/services/api";

export default function InvoiceProductSearch({ onSelect }) {
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
            fetchProducts(`/product/?name=${encodeURIComponent(query)}`);
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

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
        onSelect(product);
        setQuery("");
        setIsOpen(false);
    };

    const formatPrice = (p) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(p);

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <label className="text-xs font-bold text-gray-700 uppercase mb-2 block">Add Products</label>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {loading ? (
                        <FaSpinner className="animate-spin text-blue-500" />
                    ) : (
                        <FaSearch className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    )}
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm font-medium shadow-sm"
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
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <FaTimes />
                    </button>
                )}
            </div>

            {/* Dropdown Results */}
            {isOpen && (results.length > 0 || loading) && query.length > 0 && (
                <div className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-100 max-h-80 overflow-y-auto custom-scrollbar animate-fade-in-up">
                    {results.length === 0 && !loading ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                            No products found matching "{query}"
                        </div>
                    ) : (
                        <div className="py-2">
                            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                                Found {results.length} products
                            </div>
                            {results.map((product) => (
                                <button
                                    key={product.id}
                                    onClick={() => handleSelect(product)}
                                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center justify-between group border-b border-gray-50 last:border-0"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-blue-200 group-hover:text-blue-600 transition-colors">
                                            <FaBox />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm group-hover:text-blue-700">
                                                {product.name}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono border border-gray-200">
                                                    <FaBarcode /> {product.sku || 'No SKU'}
                                                </span>
                                                {product.stock_quantity !== undefined && (
                                                    <span className={`text-[10px] font-medium ${product.stock_quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                        {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="font-bold text-gray-900 text-sm">
                                            {formatPrice(product.base_price)}
                                        </p>
                                        <p className="text-[10px] text-gray-400 font-medium">
                                            + {product.output_gst_rate}% GST
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
