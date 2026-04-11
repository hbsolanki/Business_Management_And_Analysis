import { useState } from "react";
import { FaSearch, FaShoppingBag, FaSitemap, FaTag } from "react-icons/fa";

const parseNumber = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "string") return Number(value.replace(/,/g, ""));
    return Number(value);
};

const formatCurrency = (val) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(parseNumber(val));

import PremiumOverlay from "@/components/common/PremiumOverlay";

export default function CustomerProductPreferences({ data, loading, onLoadMore, hasMore, loadingMore, isLocked }) {
    const [searchTerm, setSearchTerm] = useState("");

    const rows = Array.isArray(data) ? data : [];

    const lockedData = [
        { customer_name: "Premium User", product_name: "Premium Product A", product_category: "Electronics", quantity: 5, total_revenue: 10000 },
        { customer_name: "Premium User", product_name: "Premium Product B", product_category: "Fashion", quantity: 3, total_revenue: 4500 },
        { customer_name: "Premium User", product_name: "Premium Product C", product_category: "Home", quantity: 2, total_revenue: 3000 },
    ];

    const displayData = isLocked ? lockedData : rows;

    const filteredData = displayData.filter(
        (item) =>
            item.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="animate-pulse h-80 bg-gray-100 rounded-2xl" />;
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-full relative group">
            {isLocked && <PremiumOverlay message="Analyze product preferences and buying habits with the Premium plan." />}

            <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                        <FaShoppingBag />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Product Preferences</h3>
                        <p className="text-xs text-slate-500">Purchase habits by customer</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {displayData.length} of {displayData.length} records
                    </span>
                    <div className="relative group">
                        <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search customers or products"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={isLocked}
                            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 w-full sm:w-64 transition-all shadow-sm disabled:opacity-50"
                        />
                    </div>
                </div>
            </div>

            <div className={`overflow-x-auto flex-1 ${isLocked ? "blur-sm opacity-50 select-none pointer-events-none" : ""}`}>
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Customer
                            </th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Product
                            </th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Category
                            </th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
                                Qty
                            </th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">
                                Revenue
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredData.map((item, index) => (
                            <tr
                                key={`${item.customer_id}-${item.product_id}-${index}`}
                                className="hover:bg-slate-50 transition-colors"
                            >
                                <td className="px-6 py-4">
                                    <span className="font-semibold text-slate-900 text-sm">
                                        {item.customer_name}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <FaTag className="text-slate-300 text-xs" />
                                        <span className="text-slate-700 font-medium text-sm">
                                            {item.product_name}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200">
                                        <FaSitemap className="text-[10px] text-slate-400" />
                                        <span className="text-xs font-semibold text-slate-600">
                                            {item.product_category}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="font-semibold text-slate-600 bg-slate-100 w-8 h-8 rounded-full inline-flex items-center justify-center text-xs">
                                        {item.quantity}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg text-sm">
                                        {formatCurrency(item.total_revenue)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {filteredData.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <FaShoppingBag className="text-4xl mb-3 opacity-20" />
                                        <p className="text-sm font-medium">
                                            {searchTerm
                                                ? "No matching records found"
                                                : "No preference data available"}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {hasMore && !isLocked && (
                <div className="p-4 border-t border-slate-200 text-center bg-slate-50">
                    <button
                        onClick={onLoadMore}
                        disabled={loadingMore}
                        className="text-sm font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50 transition-colors"
                    >
                        {loadingMore ? "Loading..." : "Load more preferences"}
                    </button>
                </div>
            )}
        </div>
    );
}
