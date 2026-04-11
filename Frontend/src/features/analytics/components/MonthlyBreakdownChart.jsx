import { useCallback, useEffect, useMemo, useState } from "react";
import {
    FaCalendarAlt,
    FaFilter,
    FaMoneyBillWave,
    FaPercentage,
    FaUsers,
    FaBoxes,
    FaChartPie,
    FaSync,
} from "react-icons/fa";
import api from "@/services/api";
import AppPieChart from "@/components/charts/AppPieChart";

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

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

const COLORS = [
    "#0ea5e9", // Sky 500
    "#10b981", // Emerald 500
    "#f59e0b", // Amber 500
    "#f43f5e", // Rose 500
    "#8b5cf6", // Violet 500
    "#6366f1", // Indigo 500
    "#ec4899", // Pink 500
    "#14b8a6", // Teal 500
    "#f97316", // Orange 500
    "#64748b", // Slate 500
];

export default function MonthlyBreakdownChart() {
    const currentDate = new Date();
    const defaultDate = new Date(currentDate);
    defaultDate.setMonth(defaultDate.getMonth() - 1);
    const [month, setMonth] = useState(defaultDate.getMonth() + 1);
    const [year, setYear] = useState(defaultDate.getFullYear());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    const fetchBreakdown = useCallback(async () => {
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
    }, [month, year]);

    useEffect(() => {
        fetchBreakdown();
    }, [fetchBreakdown]);

    const formatCurrency = (val) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(Number(val) || 0);

    const pieChartData = useMemo(() => {
        if (!data) return [];

        const chartData = [];
        let colorIndex = 0;

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

    const sortedPieData = useMemo(() => {
        return [...pieChartData].sort((a, b) => b.value - a.value);
    }, [pieChartData]);

    const getMonthName = (monthNum) => {
        const found = MONTHS.find((m) => m.value === monthNum);
        return found ? found.label : "Unknown";
    };

    const isCurrentPeriod =
        month === currentDate.getMonth() + 1 && year === currentDate.getFullYear();

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                        <FaChartPie />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Monthly Cost Breakdown</h3>
                        <p className="text-sm text-slate-500">Expense distribution by category</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-200">
                        <select
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                            className="bg-transparent text-sm font-medium text-slate-700 outline-none px-2 py-1 cursor-pointer"
                        >
                            {MONTHS.map((m) => (
                                <option key={m.value} value={m.value}>
                                    {m.label}
                                </option>
                            ))}
                        </select>
                        <span className="text-slate-300">|</span>
                        <select
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="bg-transparent text-sm font-medium text-slate-700 outline-none px-2 py-1 cursor-pointer"
                        >
                            {YEARS.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={fetchBreakdown}
                        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                        title="Refresh"
                    >
                        <FaSync size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {isCurrentPeriod && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm flex items-start gap-2">
                    <FaCalendarAlt className="mt-0.5 text-amber-600 flex-shrink-0" />
                    <div>
                        <p className="font-semibold mb-1">⚠️ Provisional Data Disclaimer</p>
                        <p>The data shown for the current month is provisional and subject to change. Final calculations for salary, taxes, and product costs will be consolidated at the end of the month.</p>
                    </div>
                </div>
            )}

            <div>
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-slate-500 font-medium">Loading breakdown...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="p-4 bg-rose-50 rounded-full mb-4 border border-rose-100">
                            <FaFilter className="text-rose-500 text-2xl" />
                        </div>
                        <p className="text-slate-700 font-medium mb-2">{error}</p>
                        <button
                            onClick={fetchBreakdown}
                            className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : !data || pieChartData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="p-4 bg-slate-50 rounded-full mb-4 border border-slate-100">
                            <FaChartPie className="text-slate-400 text-3xl" />
                        </div>
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">No Data Available</h4>
                        <p className="text-slate-500 max-w-sm">
                            No expense data found for {getMonthName(month)} {year}.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                        <div className="flex items-center justify-center relative">
                            <AppPieChart
                                data={sortedPieData}
                                colors={COLORS}
                                height={320}
                                showLegend={false}
                                seriesProps={{
                                    highlightScope: { fade: "global", highlight: "item" },
                                    faded: { innerRadius: 30, additionalRadius: -20, color: "gray" },
                                    innerRadius: 80,
                                    outerRadius: 150,
                                    paddingAngle: 2,
                                    cornerRadius: 6,
                                    cx: 170,
                                    cy: 160,
                                    valueFormatter: (v) => formatCurrency(v.value),
                                }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center mt-2">
                                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total</p>
                                    <p className="text-xl font-bold text-slate-900">{formatCurrency(totalExpenses)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Expenses</p>
                                    <span className="text-xs font-medium px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600">
                                        {getMonthName(month)} {year}
                                    </span>
                                </div>

                                <p className="text-3xl font-bold text-slate-900">
                                    {formatCurrency(totalExpenses)}
                                </p>
                            </div>

                            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                                {sortedPieData.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-white hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: item.color }}
                                            ></div>
                                            <span className="font-medium text-slate-700 text-sm">{item.label}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-slate-900 text-sm block">
                                                {formatCurrency(item.value)}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                {((item.value / totalExpenses) * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {data && pieChartData.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100">
                        <QuickStat
                            icon={<FaBoxes className="text-rose-500" />}
                            label="Products Cost"
                            value={formatCurrency(data.products_total_cost)}
                            colorClass="bg-rose-50 border-rose-100"
                        />
                        <QuickStat
                            icon={<FaUsers className="text-amber-500" />}
                            label="Salary"
                            value={formatCurrency(data.salary_expenditure)}
                            colorClass="bg-amber-50 border-amber-100"
                        />
                        <QuickStat
                            icon={<FaPercentage className="text-indigo-500" />}
                            label="Taxes"
                            value={formatCurrency(data.taxes)}
                            colorClass="bg-indigo-50 border-indigo-100"
                        />
                        <QuickStat
                            icon={<FaMoneyBillWave className="text-emerald-500" />}
                            label="Net Profit"
                            value={formatCurrency(data.net_profit_after_tax)}
                            colorClass="bg-emerald-50 border-emerald-100"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

function QuickStat({ icon, label, value, colorClass }) {
    return (
        <div className={`rounded-xl border p-4 ${colorClass}`}>
            <div className="flex items-center gap-3 mb-2">
                <div className="text-lg">
                    {icon}
                </div>
                <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
            </div>
            <p className="text-lg font-bold text-slate-900">{value}</p>
        </div>
    );
}
