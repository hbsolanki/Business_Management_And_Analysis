import { useState, useEffect, useMemo } from "react";
import { PieChart } from "@mui/x-charts/PieChart";
import {
    FaCalendarAlt, FaFilter, FaMoneyBillWave, FaPercentage,
    FaUsers, FaBoxes, FaChartPie, FaSync
} from "react-icons/fa";
import api from "@/services/api";

const MONTHS = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
];

// Generate year options (current year and 5 years back)
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

// Vibrant color palette for pie chart
const COLORS = [
    "#6366f1", // Indigo
    "#ec4899", // Pink
    "#14b8a6", // Teal
    "#f59e0b", // Amber
    "#8b5cf6", // Violet
    "#ef4444", // Red
    "#22c55e", // Green
    "#3b82f6", // Blue
    "#f97316", // Orange
    "#06b6d4", // Cyan
];

export default function MonthlyBreakdownChart() {
    const currentDate = new Date();
    const [month, setMonth] = useState(currentDate.getMonth() + 1);
    const [year, setYear] = useState(currentDate.getFullYear());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    useEffect(() => {
        fetchBreakdown();
    }, [month, year]);

    const fetchBreakdown = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get(`/analytics/month/breakdown/?month=${month}&year=${year}`);
            setData(response.data);
        } catch (err) {
            console.error("Failed to fetch monthly breakdown:", err);
            setError("Failed to load data. Please try again.");
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(Number(val) || 0);

    // Transform data for pie chart
    const pieChartData = useMemo(() => {
        if (!data) return [];

        const chartData = [];
        let colorIndex = 0;

        // Add cost categories
        if (data.cost_category_items && data.cost_category_items.length > 0) {
            data.cost_category_items.forEach((item) => {
                const cost = parseFloat(item.cost) || 0;
                if (cost > 0) {
                    chartData.push({
                        id: item.category_name || `Category ${colorIndex}`,
                        value: cost,
                        label: item.category_name || "Uncategorized",
                        color: COLORS[colorIndex % COLORS.length],
                    });
                    colorIndex++;
                }
            });
        }

        // Add salary expenditure
        const salary = parseFloat(data.salary_expenditure) || 0;
        if (salary > 0) {
            chartData.push({
                id: "salary",
                value: salary,
                label: "Salary",
                color: COLORS[colorIndex % COLORS.length],
            });
            colorIndex++;
        }

        // Add taxes
        const taxes = parseFloat(data.taxes) || 0;
        if (taxes > 0) {
            chartData.push({
                id: "taxes",
                value: taxes,
                label: "Taxes",
                color: COLORS[colorIndex % COLORS.length],
            });
            colorIndex++;
        }

        // Add products total cost
        const productsCost = parseFloat(data.products_total_cost) || 0;
        if (productsCost > 0) {
            chartData.push({
                id: "products_cost",
                value: productsCost,
                label: "Products Cost",
                color: COLORS[colorIndex % COLORS.length],
            });
        }

        return chartData;
    }, [data]);

    const totalExpenses = useMemo(() => {
        return pieChartData.reduce((sum, item) => sum + item.value, 0);
    }, [pieChartData]);

    const getMonthName = (monthNum) => {
        const found = MONTHS.find(m => m.value === monthNum);
        return found ? found.label : "Unknown";
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white">
                        <FaChartPie size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Monthly Cost Breakdown</h3>
                        <p className="text-sm text-gray-500">Expense distribution by category</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <FaCalendarAlt className="text-gray-400" size={14} />
                        <select
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        >
                            {MONTHS.map((m) => (
                                <option key={m.value} value={m.value}>
                                    {m.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    >
                        {YEARS.map((y) => (
                            <option key={y} value={y}>
                                {y}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={fetchBreakdown}
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <FaSync size={14} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div>
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 font-medium">Loading breakdown...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="p-4 bg-red-100 rounded-full mb-4">
                            <FaFilter className="text-red-500 text-2xl" />
                        </div>
                        <p className="text-gray-700 font-medium mb-2">{error}</p>
                        <button
                            onClick={fetchBreakdown}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : !data || pieChartData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="p-4 bg-gray-100 rounded-full mb-4">
                            <FaChartPie className="text-gray-400 text-3xl" />
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 mb-2">No Data Available</h4>
                        <p className="text-gray-500 max-w-sm">
                            No expense data found for {getMonthName(month)} {year}.
                            Try selecting a different month or year.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                        {/* Pie Chart */}
                        <div className="flex items-center justify-center">
                            <PieChart
                                series={[
                                    {
                                        data: pieChartData,
                                        highlightScope: { fade: "global", highlight: "item" },
                                        faded: { innerRadius: 30, additionalRadius: -20, color: "gray" },
                                        innerRadius: 80, // Increased for a more modern look
                                        outerRadius: 150,
                                        paddingAngle: 2,
                                        cornerRadius: 6,
                                        cx: 170, // Adjust centering if needed
                                        cy: 160,
                                        valueFormatter: (v) => formatCurrency(v.value),
                                    },
                                ]}
                                width={340}
                                height={320}
                                slotProps={{
                                    legend: { hidden: true },
                                }}
                            />
                        </div>

                        {/* Legend & Stats */}
                        <div className="space-y-6">
                            {/* Total Badge */}
                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5">
                                <p className="text-sm text-indigo-600 font-medium mb-1">Total Expenses</p>
                                <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
                                <p className="text-sm text-gray-500 mt-1">{getMonthName(month)} {year}</p>
                            </div>

                            {/* Category Breakdown */}
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                {pieChartData.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-4 h-4 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: item.color }}
                                            ></div>
                                            <span className="font-medium text-gray-700">{item.label}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-gray-900">{formatCurrency(item.value)}</span>
                                            <span className="text-xs text-gray-500 ml-2">
                                                ({((item.value / totalExpenses) * 100).toFixed(1)}%)
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Stats */}
                {data && pieChartData.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-gray-100">
                        <QuickStat
                            icon={<FaBoxes />}
                            label="Products Cost"
                            value={formatCurrency(data.products_total_cost)}
                            color="bg-blue-50 text-blue-600"
                        />
                        <QuickStat
                            icon={<FaUsers />}
                            label="Salary"
                            value={formatCurrency(data.salary_expenditure)}
                            color="bg-green-50 text-green-600"
                        />
                        <QuickStat
                            icon={<FaPercentage />}
                            label="Taxes"
                            value={formatCurrency(data.taxes)}
                            color="bg-orange-50 text-orange-600"
                        />
                        <QuickStat
                            icon={<FaMoneyBillWave />}
                            label="Net Profit"
                            value={formatCurrency(data.net_profit_after_tax)}
                            color="bg-purple-50 text-purple-600"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

function QuickStat({ icon, label, value, color }) {
    return (
        <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
            <div className={`inline-flex p-2 rounded-lg mb-2 ${color}`}>
                {icon}
            </div>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
    );
}
