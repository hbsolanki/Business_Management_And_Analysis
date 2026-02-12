import { useState, useEffect, useMemo } from "react";
import { PieChart } from "@mui/x-charts/PieChart";
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
    "#0d9488",
    "#0284c7",
    "#f59e0b",
    "#16a34a",
    "#e11d48",
    "#0ea5e9",
    "#84cc16",
    "#0f766e",
    "#334155",
    "#f97316",
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
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                        <FaChartPie />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Monthly Cost Breakdown</h3>
                        <p className="text-sm text-slate-500">Expense distribution by category</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <FaCalendarAlt className="text-slate-400" size={14} />
                        <select
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                            className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
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
                        className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                    >
                        {YEARS.map((y) => (
                            <option key={y} value={y}>
                                {y}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={fetchBreakdown}
                        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <FaSync size={14} />
                    </button>
                </div>
            </div>

            {isCurrentPeriod && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 text-sm">
                    Current month data is provisional. Salary, product costs, and tax values are finalized at month end.
                </div>
            )}

            <div>
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-slate-500 font-medium">Loading breakdown...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="p-4 bg-rose-100 rounded-full mb-4">
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
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="p-4 bg-slate-100 rounded-full mb-4">
                            <FaChartPie className="text-slate-400 text-3xl" />
                        </div>
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">No Data Available</h4>
                        <p className="text-slate-500 max-w-sm">
                            No expense data found for {getMonthName(month)} {year}. Try selecting a different month or year.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                        <div className="flex items-center justify-center">
                            <PieChart
                                series={[
                                    {
                                        data: sortedPieData,
                                        highlightScope: { fade: "global", highlight: "item" },
                                        faded: { innerRadius: 30, additionalRadius: -20, color: "gray" },
                                        innerRadius: 80,
                                        outerRadius: 150,
                                        paddingAngle: 2,
                                        cornerRadius: 6,
                                        cx: 170,
                                        cy: 160,
                                        valueFormatter: (v) => formatCurrency(v.value),
                                    },
                                ]}
                                width={340}
                                height={320}
                                slotProps={{ legend: { hidden: true } }}
                            />
                        </div>

                        <div className="space-y-6">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Expenses</p>
                                <p className="text-2xl font-semibold text-slate-900 mt-2">
                                    {formatCurrency(totalExpenses)}
                                </p>
                                <p className="text-sm text-slate-500 mt-1">
                                    {getMonthName(month)} {year}
                                </p>
                            </div>

                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                {sortedPieData.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-white"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: item.color }}
                                            ></div>
                                            <span className="font-medium text-slate-700">{item.label}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-semibold text-slate-900">
                                                {formatCurrency(item.value)}
                                            </span>
                                            <span className="text-xs text-slate-500 ml-2">
                                                ({((item.value / totalExpenses) * 100).toFixed(1)}%)
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {data && pieChartData.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-200">
                        <QuickStat
                            icon={<FaBoxes />}
                            label="Products Cost"
                            value={formatCurrency(data.products_total_cost)}
                        />
                        <QuickStat
                            icon={<FaUsers />}
                            label="Salary"
                            value={formatCurrency(data.salary_expenditure)}
                        />
                        <QuickStat
                            icon={<FaPercentage />}
                            label="Taxes"
                            value={formatCurrency(data.taxes)}
                        />
                        <QuickStat
                            icon={<FaMoneyBillWave />}
                            label="Net Profit"
                            value={formatCurrency(data.net_profit_after_tax)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

function QuickStat({ icon, label, value }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="inline-flex p-2 rounded-lg mb-2 bg-white border border-slate-200 text-slate-600">
                {icon}
            </div>
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className="text-lg font-semibold text-slate-900">{value}</p>
        </div>
    );
}
