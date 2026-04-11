import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { inventoryService } from "../services/inventoryService";
import { FiAlertTriangle, FiArrowRight, FiBox } from "react-icons/fi";

export default function LowStockAlert() {
    const [lowStockItems, setLowStockItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLowStock() {
            try {
                const res = await inventoryService.getStock();
                const items = res.data?.results || [];

                // Filter items where stock_quantity <= low_stock_limit (and limit > 0)
                const low = items.filter(s =>
                    s.product.low_stock_limit > 0 &&
                    s.stock_quantity <= s.product.low_stock_limit
                );

                setLowStockItems(low);
            } catch (err) {
                console.error("Failed to fetch low stock items:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchLowStock();
    }, []);

    if (loading || lowStockItems.length === 0) return null;

    return (
        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-200 shrink-0">
                        <FiAlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-rose-900">Low Stock Alert</h3>
                        <p className="text-sm text-rose-600 font-medium">
                            {lowStockItems.length} product{lowStockItems.length > 1 ? 's' : ''} {lowStockItems.length > 1 ? 'are' : 'is'} below terminal levels.
                        </p>
                    </div>
                </div>
                <Link
                    to="/inventory"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-rose-600 rounded-xl text-sm font-bold shadow-sm hover:shadow-md transition-all border border-rose-100 group"
                >
                    Manage Inventory
                    <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {lowStockItems.slice(0, 3).map((s) => (
                    <div key={s.id} className="bg-white/60 rounded-xl p-3 border border-rose-100/50 flex items-center justify-between">
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-rose-900 truncate">{s.product.name}</p>
                            <p className="text-[10px] text-rose-500 font-medium uppercase tracking-wider mt-0.5">
                                Stock: {s.stock_quantity} / Limit: {s.product.low_stock_limit}
                            </p>
                        </div>
                        <FiBox className="text-rose-300 shrink-0" />
                    </div>
                ))}
            </div>
            {lowStockItems.length > 3 && (
                <p className="text-[11px] text-rose-500 font-bold mt-4 text-center uppercase tracking-widest opacity-70">
                    + {lowStockItems.length - 3} more items in critical state
                </p>
            )}
        </div>
    );
}
