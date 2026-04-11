import { FaCrown, FaMedal, FaTrophy } from "react-icons/fa";

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

export default function CustomerLeaderboard({ data, loading, onLoadMore, hasMore, loadingMore, isLocked }) {
    const rows = Array.isArray(data) ? data : [];

    if (loading) {
        return <div className="animate-pulse h-96 bg-gray-100 rounded-2xl" />;
    }

    const lockedData = [
        { customer_name: "Premium Customer A", total_revenue: 50000, order_count: 25, avg_order_value: 2000 },
        { customer_name: "Premium Customer B", total_revenue: 35000, order_count: 15, avg_order_value: 2333 },
        { customer_name: "Premium Customer C", total_revenue: 28000, order_count: 10, avg_order_value: 2800 },
        { customer_name: "Premium Customer D", total_revenue: 22000, order_count: 8, avg_order_value: 2750 },
        { customer_name: "Premium Customer E", total_revenue: 15000, order_count: 5, avg_order_value: 3000 },
    ];

    const displayRows = isLocked ? lockedData : rows;
    const totalRevenue = displayRows.reduce((sum, row) => sum + parseNumber(row.total_revenue), 0);

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-full relative group">
            {isLocked && <PremiumOverlay message="View top spending customers with the Premium plan." />}

            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                        <FaTrophy />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Top Customers</h3>
                        <p className="text-xs text-slate-500">Revenue leaders</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                        Total revenue
                    </p>
                    <p className={`text-sm font-semibold text-slate-700 ${isLocked ? "blur-[2px]" : ""}`}>
                        {formatCurrency(totalRevenue)}
                    </p>
                </div>
            </div>

            <div className={`overflow-x-auto flex-1 ${isLocked ? "blur-sm opacity-50 select-none pointer-events-none" : ""}`}>
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Rank
                            </th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Customer
                            </th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Orders
                            </th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Avg Order
                            </th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">
                                Total Revenue
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {displayRows.map((customer, index) => (
                            <tr
                                key={customer.customer_id ?? `${customer.customer_name}-${index}`}
                                className="hover:bg-slate-50 transition-colors"
                            >
                                <td className="px-6 py-4">
                                    <div className="relative w-9 h-9 flex items-center justify-center">
                                        {index === 0 && (
                                            <FaCrown className="absolute -top-3 text-amber-400 text-sm" />
                                        )}
                                        {index === 1 && (
                                            <FaMedal className="absolute -top-3 text-slate-400 text-sm" />
                                        )}
                                        {index === 2 && (
                                            <FaMedal className="absolute -top-3 text-orange-400 text-sm" />
                                        )}
                                        <div
                                            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border ${index === 0
                                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                                : index === 1
                                                    ? "bg-slate-100 text-slate-600 border-slate-200"
                                                    : index === 2
                                                        ? "bg-orange-50 text-orange-600 border-orange-200"
                                                        : "bg-white text-slate-500 border-slate-200"
                                                }`}
                                        >
                                            {index + 1}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div>
                                        <p className="font-semibold text-slate-900 text-sm">
                                            {customer.customer_name}
                                        </p>
                                        <p className="text-xs text-slate-400 font-medium tracking-wide">
                                            {customer.customer_mobile_number || (isLocked ? "98******XX" : "No mobile")}
                                        </p>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600 font-semibold text-sm">
                                    <span className="bg-slate-100 px-2.5 py-1 rounded-md text-xs">
                                        {customer.order_count}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-500 text-sm font-medium">
                                    {formatCurrency(customer.avg_order_value)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="font-semibold text-emerald-600 text-sm px-3 py-1 bg-emerald-50 rounded-lg">
                                        {formatCurrency(customer.total_revenue)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {displayRows.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <FaTrophy className="text-4xl mb-3 opacity-20" />
                                        <p className="text-sm font-medium">No leaderboard data found</p>
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
                        {loadingMore ? "Loading..." : "Load more customers"}
                    </button>
                </div>
            )}
        </div>
    );
}
