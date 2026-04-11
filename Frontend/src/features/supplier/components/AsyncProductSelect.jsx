import { useState, useEffect, useRef, useCallback } from "react";
import { FaBoxOpen, FaSearch, FaSpinner } from "react-icons/fa";
import { productService } from "@/features/product/services/productService";

export default function AsyncProductSelect({ value, onChange, className, required }) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);

    // We store the selected product full object locally to show its name
    const [selectedProduct, setSelectedProduct] = useState(null);

    const wrapperRef = useRef(null);

    useEffect(() => {
        // Initial fetch to get some default options if empty, or load the selected one
        fetchProducts("");
    }, []);

    useEffect(() => {
        if (!value) {
            setSelectedProduct(null);
            return;
        }
        // If value changes from outside (like edit mode), and we don't have it, fetch it
        if (!selectedProduct || selectedProduct.id !== Number(value)) {
            const fetchInitial = async () => {
                try {
                    const res = await productService.getById(value);
                    setSelectedProduct(res.data);
                } catch (err) {
                    console.error("Failed to fetch initial product", err);
                }
            };
            fetchInitial();
        }
    }, [value]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchProducts = async (searchQuery) => {
        setLoading(true);
        try {
            const url = searchQuery
                ? `/product/?name=${encodeURIComponent(searchQuery)}&sku=${encodeURIComponent(searchQuery)}`
                : `/product/?limit=20`; // default list
            const res = await productService.getAll(url);

            // Handle pagination or flat array
            let rawResults = res.data;
            if (rawResults && Array.isArray(rawResults.results)) {
                rawResults = rawResults.results;
            }
            if (!Array.isArray(rawResults)) {
                rawResults = [];
            }
            setOptions(rawResults);
        } catch (err) {
            console.error("Failed to fetch products for select", err);
        } finally {
            setLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            fetchProducts(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query, isOpen]);

    const handleSelect = (product) => {
        setSelectedProduct(product);
        onChange(String(product.id));
        setIsOpen(false);
        setQuery("");
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div
                className={`relative group cursor-pointer ${className}`}
                onClick={() => setIsOpen(true)}
            >
                <FaBoxOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                <div
                    className={`w-full rounded-xl pl-11 pr-4 py-3 text-sm border focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-50 outline-none transition-all flex items-center justify-between
                        ${!selectedProduct ? "text-slate-400 border-slate-200 bg-white" : "text-slate-900 border-slate-200 bg-white"}`}
                >
                    <span className="truncate">{selectedProduct ? selectedProduct.name : "Select product"}</span>
                </div>
                {/* Hidden input to handle required validation in the original form */}
                <input
                    type="text"
                    value={value || ""}
                    onChange={() => { }}
                    className="absolute opacity-0 w-0 h-0 pointer-events-none"
                    required={required}
                />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                        <FaSearch className="text-slate-400 ml-2" size={12} />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search by name or SKU..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full text-sm outline-none bg-transparent py-1.5"
                        />
                        {loading && <FaSpinner className="animate-spin text-slate-400 mr-2" size={12} />}
                    </div>
                    <ul className="overflow-y-auto custom-scrollbar flex-1 pb-1">
                        {options.length === 0 && !loading ? (
                            <li className="px-4 py-3 text-sm text-slate-500 text-center">No products found</li>
                        ) : (
                            options.map(product => (
                                <li
                                    key={product.id}
                                    onClick={() => handleSelect(product)}
                                    className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-slate-50 flex flex-col
                                        ${value === String(product.id) ? "bg-brand-50 text-brand-700 font-medium" : "text-slate-700"}`}
                                >
                                    <span>{product.name}</span>
                                    {product.sku && <span className="text-xs text-slate-400 mt-0.5">SKU: {product.sku}</span>}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
