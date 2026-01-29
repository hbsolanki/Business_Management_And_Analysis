import { useMemo } from "react";
import { FaBoxOpen, FaDollarSign, FaChartLine, FaExclamationTriangle } from "react-icons/fa";
import MonthlyFinancialOverview from "./MonthlyFinancialOverview";

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

        // Sort by highest potential profit
        items.sort((a, b) => b.potential_profit - a.potential_profit);

        return {
            totalStockValue,
            totalPotentialProfit,
            lowStockCount,
            topItems: items.slice(0, 5),
        };
    }, [stockData, detailsData]);

    const formatCurrency = (val) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(val);

    return (
        <div className="space-y-10 animate-fade-in-up">
            {/* Monthly Financial Overview Section */}
            <MonthlyFinancialOverview />

            {/* Divider */}
            <div className="border-t border-gray-200 pt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Inventory Analytics</h2>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Products"
                    value={stockData.length}
                    icon={<FaBoxOpen />}
                    color="bg-blue-50 text-blue-600"
                />
                <StatCard
                    title="Inventory Value"
                    value={formatCurrency(stats.totalStockValue)}
                    icon={<FaDollarSign />}
                    color="bg-green-50 text-green-600"
                    desc="Based on selling price"
                />
                <StatCard
                    title="Potential Profit"
                    value={formatCurrency(stats.totalPotentialProfit)}
                    icon={<FaChartLine />}
                    color="bg-purple-50 text-purple-600"
                    desc="If all stock is sold"
                />
                <StatCard
                    title="Low Stock Alerts"
                    value={stats.lowStockCount}
                    icon={<FaExclamationTriangle />}
                    color="bg-amber-50 text-amber-600"
                    desc="Less than 10 units"
                />
            </div>

            {/* Top Products Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800">High Value Assets</h3>
                    <p className="text-sm text-gray-500">Top products by potential profit generation</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Stock</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Unit Price</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total Value</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Potential Profit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {stats.topItems.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${item.stock_quantity < 10
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-green-100 text-green-700'
                                            }`}>
                                            {item.stock_quantity} units
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{formatCurrency(item.base_price)}</td>
                                    <td className="px-6 py-4 text-gray-800 font-medium">{formatCurrency(item.total_value)}</td>
                                    <td className="px-6 py-4 text-green-600 font-bold">{formatCurrency(item.potential_profit)}</td>
                                </tr>
                            ))}
                            {stats.topItems.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                                        No data available
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color, desc }) {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <h4 className="text-2xl font-bold text-gray-900">{value}</h4>
                {desc && <p className="text-xs text-gray-400 mt-2">{desc}</p>}
            </div>
            <div className={`p-3 rounded-xl ${color} text-xl`}>
                {icon}
            </div>
        </div>
    );
}
