import { useState, useEffect, useMemo } from "react";
import {
    FaChartLine, FaMoneyBillWave, FaReceipt, FaPercent,
    FaBoxes, FaCalendarAlt, FaExclamationTriangle, FaArrowUp, FaArrowDown
} from "react-icons/fa";
import costService from "@/features/cost/services/costService";
import FinancialFilters from "./FinancialFilters";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export default function MonthlyFinancialOverview() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allData, setAllData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [activeFilters, setActiveFilters] = useState({});

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const currentYear = currentDate.getFullYear();

    // Fetch all data on mount
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async (filters = {}) => {
        try {
            setLoading(true);
            setError(null);
            const response = await costService.getMonthlyFinancialSummary(filters);
            const data = response.data?.results || response.data || [];
            setAllData(Array.isArray(data) ? data : []);
            setFilteredData(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch financial data:", err);
            setError("Failed to load financial data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Get current month data
    const currentMonthData = useMemo(() => {
        return allData.find(d => d.month === currentMonth && d.year === currentYear) || null;
    }, [allData, currentMonth, currentYear]);

    // Get last 3 months data (excluding current month)
    const last3MonthsData = useMemo(() => {
        const months = [];
        for (let i = 1; i <= 3; i++) {
            let m = currentMonth - i;
            let y = currentYear;
            if (m <= 0) {
                m += 12;
                y -= 1;
            }
            const found = allData.find(d => d.month === m && d.year === y);
            if (found) months.push(found);
        }
        return months;
    }, [allData, currentMonth, currentYear]);

    const handleApplyFilters = (filters) => {
        setActiveFilters(filters);
        fetchData(filters);
    };

    const handleResetFilters = () => {
        setActiveFilters({});
        fetchData();
    };

    const formatCurrency = (val) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(Number(val) || 0);

    const getMonthName = (monthNum) => MONTHS[(monthNum - 1) % 12] || "Unknown";

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Loading financial data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
                <FaExclamationTriangle className="mx-auto text-red-500 text-4xl mb-4" />
                <p className="text-red-700 font-medium">{error}</p>
                <button
                    onClick={() => fetchData()}
                    className="mt-4 px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Filter Section */}
            <FinancialFilters
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
                isLoading={loading}
            />

            {/* Current Month Section */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-8 text-white shadow-xl">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold">Current Month</h2>
                        <p className="text-blue-200 flex items-center gap-2 mt-1">
                            <FaCalendarAlt size={14} />
                            {getMonthName(currentMonth)} {currentYear}
                        </p>
                    </div>
                    {currentMonthData && (
                        <div className="text-right">
                            <p className="text-blue-200 text-sm">Invoices</p>
                            <p className="text-3xl font-bold">{currentMonthData.invoice_count || 0}</p>
                        </div>
                    )}
                </div>

                {!currentMonthData ? (
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center">
                        <FaExclamationTriangle className="mx-auto text-yellow-300 text-4xl mb-4" />
                        <h3 className="text-xl font-bold mb-2">No Data Available</h3>
                        <p className="text-blue-200">
                            No financial records found for {getMonthName(currentMonth)} {currentYear}.
                        </p>
                        <p className="text-blue-300 text-sm mt-2">
                            Start recording expenses and invoices to see data here.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard
                            label="Revenue"
                            value={formatCurrency(currentMonthData.revenue)}
                            icon={<FaChartLine />}
                            trend="up"
                        />
                        <MetricCard
                            label="Product Costs"
                            value={formatCurrency(currentMonthData.products_total_cost)}
                            icon={<FaBoxes />}
                            trend="down"
                        />
                        <MetricCard
                            label="Total Costs"
                            value={formatCurrency(currentMonthData.total_cost)}
                            icon={<FaMoneyBillWave />}
                            trend="down"
                        />
                        <MetricCard
                            label="Gross Profit"
                            value={formatCurrency(currentMonthData.gross_profit)}
                            icon={<FaReceipt />}
                            trend="up"
                        />
                    </div>
                )}
            </div>

            {/* Detailed Metrics for Current Month */}
            {currentMonthData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Net Profit (Before Tax)"
                        value={formatCurrency(currentMonthData.net_profit_before_tax)}
                        icon={<FaChartLine />}
                        color="bg-green-50 text-green-600"
                    />
                    <StatCard
                        title="Net Profit (After Tax)"
                        value={formatCurrency(currentMonthData.net_profit_after_tax)}
                        icon={<FaReceipt />}
                        color="bg-emerald-50 text-emerald-600"
                    />
                    <StatCard
                        title="Taxes"
                        value={formatCurrency(currentMonthData.taxes)}
                        icon={<FaPercent />}
                        color="bg-orange-50 text-orange-600"
                    />
                    <StatCard
                        title="Salary Expenditure"
                        value={formatCurrency(currentMonthData.salary_expenditure)}
                        icon={<FaMoneyBillWave />}
                        color="bg-purple-50 text-purple-600"
                    />
                </div>
            )}

            {/* GST Section */}
            {currentMonthData && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FaPercent className="text-blue-600" /> GST Summary
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-sm text-gray-500">Input GST</p>
                            <p className="text-xl font-bold text-gray-900">{formatCurrency(currentMonthData.input_gst)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-sm text-gray-500">Output GST</p>
                            <p className="text-xl font-bold text-gray-900">{formatCurrency(currentMonthData.output_gst)}</p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-4">
                            <p className="text-sm text-blue-600 font-medium">GST Payable</p>
                            <p className="text-xl font-bold text-blue-700">{formatCurrency(currentMonthData.gst_payable)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Last 3 Months Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Previous Months</h3>
                    <p className="text-sm text-gray-500">Financial summary for the last 3 months</p>
                </div>

                {last3MonthsData.length === 0 ? (
                    <div className="p-10 text-center">
                        <FaCalendarAlt className="mx-auto text-gray-300 text-4xl mb-4" />
                        <p className="text-gray-500">No historical data available for the previous months.</p>
                    </div>
                ) : (
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {last3MonthsData.map((data) => (
                                <MonthCard key={`${data.year}-${data.month}`} data={data} formatCurrency={formatCurrency} getMonthName={getMonthName} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Product Performance */}
            {currentMonthData?.product_performance?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900">Product Performance</h3>
                        <p className="text-sm text-gray-500">Top performing products this month</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">SKU</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Quantity</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cost</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {currentMonthData.product_performance.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{p.product_name}</td>
                                        <td className="px-6 py-4 text-gray-600">{p.product_sku}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                                                {p.product_category_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{p.quantity}</td>
                                        <td className="px-6 py-4 text-red-600 font-medium">{formatCurrency(p.cost)}</td>
                                        <td className="px-6 py-4 text-green-600 font-bold">{formatCurrency(p.revenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Cost Category Breakdown */}
            {currentMonthData?.cost_category_items?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900">Expense Breakdown</h3>
                        <p className="text-sm text-gray-500">Cost categories for this month</p>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {currentMonthData.cost_category_items.map((item) => (
                                <div key={item.id} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">{item.cost_category?.name}</p>
                                            <p className="text-xl font-bold text-gray-900">{formatCurrency(item.cost)}</p>
                                        </div>
                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                            <FaMoneyBillWave className="text-red-500" />
                                        </div>
                                    </div>
                                    {item.cost_category?.description && (
                                        <p className="text-xs text-gray-400 mt-2 truncate">{item.cost_category.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Filtered Results Section */}
            {Object.keys(activeFilters).length > 0 && filteredData.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900">Filtered Results</h3>
                        <p className="text-sm text-gray-500">{filteredData.length} record(s) found</p>
                    </div>
                    <div className="p-6 space-y-4">
                        {filteredData.map((data) => (
                            <div key={`${data.year}-${data.month}`} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-bold text-gray-900">{getMonthName(data.month)} {data.year}</h4>
                                    <span className="text-sm text-gray-500">{data.invoice_count} invoices</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div>
                                        <p className="text-gray-500">Revenue</p>
                                        <p className="font-bold text-green-600">{formatCurrency(data.revenue)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Total Costs</p>
                                        <p className="font-bold text-red-600">{formatCurrency(data.total_cost)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Gross Profit</p>
                                        <p className="font-bold text-blue-600">{formatCurrency(data.gross_profit)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Net Profit</p>
                                        <p className="font-bold text-purple-600">{formatCurrency(data.net_profit_after_tax)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ========== Sub-Components ========== */

function MetricCard({ label, value, icon, trend }) {
    return (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-blue-200 text-sm">{label}</span>
                <span className="text-xl">{icon}</span>
            </div>
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${trend === 'up' ? 'text-green-300' : 'text-red-300'}`}>
                    {trend === 'up' ? <FaArrowUp size={10} /> : <FaArrowDown size={10} />}
                    <span>{trend === 'up' ? 'Income' : 'Expense'}</span>
                </div>
            )}
        </div>
    );
}

function StatCard({ title, value, icon, color }) {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                    <h4 className="text-2xl font-bold text-gray-900">{value}</h4>
                </div>
                <div className={`p-3 rounded-xl ${color} text-xl`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

function MonthCard({ data, formatCurrency, getMonthName }) {
    return (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-gray-900">{getMonthName(data.month)} {data.year}</h4>
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-medium">
                    {data.invoice_count} invoices
                </span>
            </div>
            <div className="space-y-3">
                <div className="flex justify-between">
                    <span className="text-gray-500 text-sm">Revenue</span>
                    <span className="font-bold text-green-600">{formatCurrency(data.revenue)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500 text-sm">Total Costs</span>
                    <span className="font-bold text-red-600">{formatCurrency(data.total_cost)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-3">
                    <span className="text-gray-600 text-sm font-medium">Net Profit</span>
                    <span className="font-bold text-blue-600">{formatCurrency(data.net_profit_after_tax)}</span>
                </div>
            </div>
        </div>
    );
}
