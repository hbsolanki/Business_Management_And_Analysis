import { useMemo } from "react";
import { FaBoxOpen, FaDollarSign, FaChartLine, FaExclamationTriangle } from "react-icons/fa";
import MonthlyFinancialOverview from "./MonthlyFinancialOverview";

const formatCurrency = (val) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(val) || 0);

export default function AnalyticsSummary({ stockData = [], detailsData = [] }) {
    const stats = useMemo(() => {
        let totalStockValue = 0;
        let totalPotentialProfit = 0;
        let lowStockCount = 0;
        const items = [];

        // Map details by ID for quick lookup
        const detailsMap = detailsData.reduce((acc, item) => {
            acc[item.id] = item;
            return acc;
        }, {});

        stockData.forEach((stockItem) => {
            const detail = detailsMap[stockItem.product_id];
            const qty = Number(stockItem.stock_quantity) || 0;

            if (qty < 10) lowStockCount++;

            if (detail) {
                const cost = Number(detail.cost_price) || 0;
                const base = Number(detail.base_price) || 0;
                const profitPerUnit = Number(detail.net_profit) || 0;

                totalStockValue += base * qty;
                totalPotentialProfit += profitPerUnit * qty;

                items.push({
                    ...stockItem,
                    base_price: base,
                    potential_profit: profitPerUnit * qty,
                    total_value: base * qty,
                });
            }
        });

        items.sort((a, b) => b.potential_profit - a.potential_profit);

        return {
            totalStockValue,
            totalPotentialProfit,
            lowStockCount,
            topItems: items.slice(0, 5),
        };
    }, [stockData, detailsData]);

    return (
        <div className="space-y-8 animate-fade-up">
            <MonthlyFinancialOverview />

            <section className="space-y-4">
                <div>
                    <h2 className="text-2xl font-semibold text-slate-900">Inventory Analytics</h2>
                    <p className="text-sm text-slate-500">
                        Snapshot of stock value, profit potential, and low inventory signals.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Products"
                        value={stockData.length}
                        icon={<FaBoxOpen />}
                        accent="brand"
                        sub="Active catalog"
                    />
                    <StatCard
                        title="Inventory Value"
                        value={formatCurrency(stats.totalStockValue)}
                        icon={<FaDollarSign />}
                        accent="emerald"
                        sub="Based on selling price"
                    />
                    <StatCard
                        title="Potential Profit"
                        value={formatCurrency(stats.totalPotentialProfit)}
                        icon={<FaChartLine />}
                        accent="sky"
                        sub="If all stock is sold"
                    />
                    <StatCard
                        title="Low Stock Alerts"
                        value={stats.lowStockCount}
                        icon={<FaExclamationTriangle />}
                        accent="rose"
                        sub="Below 10 units"
                    />
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900">High Value Assets</h3>
                    <p className="text-sm text-slate-500">Top products by potential profit generation</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Product</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Stock</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Unit Price</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Total Value</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Potential Profit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {stats.topItems.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-slate-900">{item.name}</td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-semibold ${
                                                item.stock_quantity < 10
                                                    ? "bg-rose-50 text-rose-700"
                                                    : "bg-emerald-50 text-emerald-700"
                                            }`}
                                        >
                                            {item.stock_quantity} units
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{formatCurrency(item.base_price)}</td>
                                    <td className="px-6 py-4 text-slate-800 font-semibold">
                                        {formatCurrency(item.total_value)}
                                    </td>
                                    <td className="px-6 py-4 text-emerald-600 font-semibold">
                                        {formatCurrency(item.potential_profit)}
                                    </td>
                                </tr>
                            ))}
                            {stats.topItems.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                                        No data available
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

function StatCard({ title, value, icon, accent, sub }) {
    const accentStyles = {
        brand: { border: "border-l-brand-500", icon: "text-brand-600 bg-brand-50 border-brand-100" },
        emerald: {
            border: "border-l-emerald-500",
            icon: "text-emerald-600 bg-emerald-50 border-emerald-100",
        },
        sky: { border: "border-l-sky-500", icon: "text-sky-600 bg-sky-50 border-sky-100" },
        rose: { border: "border-l-rose-500", icon: "text-rose-600 bg-rose-50 border-rose-100" },
    };

    const styles = accentStyles[accent] || accentStyles.brand;

    return (
        <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 ${styles.border}`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">{value}</p>
                    <p className="text-xs text-slate-500 mt-1">{sub}</p>
                </div>
                <div className={`h-9 w-9 rounded-lg border ${styles.icon} flex items-center justify-center`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}
