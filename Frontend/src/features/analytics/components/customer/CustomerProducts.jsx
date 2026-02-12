import { FaBoxOpen, FaHistory, FaUser } from "react-icons/fa";

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

export default function CustomerProducts({ data, loading, onLoadMore, hasMore, loadingMore }) {
    const rows = Array.isArray(data) ? data : [];

    if (loading) {
        return <div className="animate-pulse h-80 bg-gray-100 rounded-2xl" />;
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <FaHistory />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">Purchase History</h3>
                    <p className="text-xs text-slate-500">Detailed transaction log</p>
                </div>
            </div>

            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Customer
                            </th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Mobile
                            </th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Products
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rows.map((item, index) => (
                            <tr
                                key={`${item.customer_id}-${index}`}
                                className="hover:bg-slate-50 transition-colors"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 rounded-full text-slate-400">
                                            <FaUser className="text-xs" />
                                        </div>
                                        <span className="font-semibold text-slate-900 text-sm">
                                            {item.customer_name}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-500 text-sm font-medium">
                                    {item.mobile_number || "—"}
                                </td>
                                <td className="px-6 py-4">
                                    {item.products && item.products.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {item.products.map((prod, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                                                    title={`Qty: ${prod.quantity} | Rev: ${formatCurrency(prod.total_revenue)}`}
                                                >
                                                    <FaBoxOpen className="text-[10px] text-slate-500" />
                                                    {prod.product_name}
                                                    <span className="ml-1 bg-white px-1.5 rounded-md text-slate-700 font-bold">
                                                        x{prod.quantity}
                                                    </span>
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 italic text-sm flex items-center gap-2">
                                            <FaBoxOpen className="text-slate-300" /> No products
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan="3" className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <FaHistory className="text-4xl mb-3 opacity-20" />
                                        <p className="text-sm font-medium">
                                            No purchase history found for current filters
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {hasMore && (
                <div className="p-4 border-t border-slate-200 text-center bg-slate-50">
                    <button
                        onClick={onLoadMore}
                        disabled={loadingMore}
                        className="text-sm font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50 transition-colors"
                    >
                        {loadingMore ? "Loading..." : "Load more history"}
                    </button>
                </div>
            )}
        </div>
    );
}
