import { useEffect, useState } from "react";
import { FaSearch, FaPlus } from "react-icons/fa";
import api from "@/services/api";

export default function InvoiceProductSearch({ onSelect }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [next, setNext] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setNext(null);
            return;
        }

        const timer = setTimeout(() => {
            fetchProducts(`/product/?name=${query}&sku=${query}`);
        }, 400);

        return () => clearTimeout(timer);
    }, [query]);

    const fetchProducts = async (url) => {
        setLoading(true);
        try {
            const res = await api.get(url);
            setResults(res.data.results || []);
            setNext(res.data.next);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
                Search Products
            </label>

            <div className="flex items-center gap-2 border rounded-md px-3 py-2">
                <FaSearch className="text-gray-400" />
                <input
                    className="w-full outline-none text-sm"
                    placeholder="Search by product name or SKU"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            {loading && <p className="text-xs text-gray-500">Searching products…</p>}

            {results.map((p) => (
                <div
                    key={p.id}
                    className="flex justify-between items-center border rounded-md px-4 py-2"
                >
                    <div>
                        <p className="font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-500">SKU: {p.sku}</p>
                    </div>

                    <button
                        type="button"
                        onClick={() => onSelect(p)}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                        <FaPlus />
                        Add
                    </button>
                </div>
            ))}

            {next && (
                <button
                    type="button"
                    onClick={() => fetchProducts(next)}
                    className="text-sm text-blue-600 hover:underline"
                >
                    Load more
                </button>
            )}
        </div>
    );
}
