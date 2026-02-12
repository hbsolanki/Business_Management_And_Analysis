import { useState, useEffect, useMemo } from "react";
import { BarChart } from "@mui/x-charts/BarChart";
import {
    FaChartLine,
    FaSync,
    FaRupeeSign,
    FaInfoCircle,
    FaCalendarAlt,
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

export default function NetProfitChart() {
    const currentDate = new Date();
    const defaultDate = new Date(currentDate);
    defaultDate.setMonth(defaultDate.getMonth() - 1);
    const [month, setMonth] = useState(defaultDate.getMonth() + 1);
    const [year, setYear] = useState(defaultDate.getFullYear());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState([]);
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

    useEffect(() => {
        fetchNetProfit();
    }, []);

    const fetchNetProfit = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get(
                `/analytics/month/netprofit/?month=${month}&year=${year}`
            );
            const responseData = response.data;
            if (Array.isArray(responseData)) {
                setData(responseData);
            } else if (responseData && typeof responseData === "object") {
                setData([responseData]);
            } else {
                setData([]);
            }
        } catch (err) {
            console.error("Failed to fetch net profit:", err);
            setError("Failed to load data. Please try again.");
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyFilter = () => {
        fetchNetProfit();
    };

    const formatCurrency = (val) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(Number(val) || 0);

    const getMonthName = (monthNum) => {
        const found = MONTHS.find((m) => m.value === monthNum);
        return found ? found.label : "Unknown";
    };

    const resolveLabel = (item, index) => {
        if (item && typeof item === "object") {
            if (item.month && item.year && item.month >= 1 && item.month <= 12) {
                return `${getMonthName(Number(item.month))} ${item.year}`;
            }
            if (item.month_name && item.year) {
                return `${item.month_name} ${item.year}`;
            }
            if (item.date) {
                const parsed = new Date(item.date);
                if (!Number.isNaN(parsed.getTime())) {
                    return `${getMonthName(parsed.getMonth() + 1)} ${parsed.getFullYear()}`;
                }
            }
        }
        return `Period ${index + 1}`;
    };

    const resolveValue = (item) => {
        if (!item || typeof item !== "object") return 0;
        const raw =
            item.net_profit ??
            item.value ??
            item.amount ??
            item.total ??
            item.profit ??
            item.net_profit_after_tax ??
            0;
        return Number(raw) || 0;
    };

    const hasValidData = useMemo(() => {
        return Array.isArray(data) && data.length > 0;
    }, [data]);

    const totalNetProfit = useMemo(() => {
        if (!data || data.length === 0) return 0;
        return data.reduce((sum, val) => sum + resolveValue(val), 0);
    }, [data]);

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return { labels: [], values: [] };
        const labels = data.map((item, index) => resolveLabel(item, index));
        const values = data.map((item) => resolveValue(item));
        return { labels, values };
    }, [data]);

    useEffect(() => {
        if (year === currentYear && month > currentMonth) {
            setMonth(currentMonth);
        }
    }, [year, month, currentYear, currentMonth]);

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <FaChartLine className="text-slate-500" />
                        Net Profit Analysis
                    </h3>
                    <p className="text-sm text-slate-500">Monthly net profit overview and trends</p>
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
                                <option
                                    key={m.value}
                                    value={m.value}
                                    disabled={year === currentYear && m.value > currentMonth}
                                >
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
                        {yearOptions.map((y) => (
                            <option key={y} value={y}>
                                {y}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={handleApplyFilter}
                        className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
                    >
                        <FaSync size={12} />
                        Apply
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-medium">Loading net profit data...</p>
                    </div>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="p-4 bg-rose-100 rounded-full mb-4">
                        <FaChartLine className="text-rose-500 text-2xl" />
                    </div>
                    <p className="text-slate-700 font-medium mb-2">{error}</p>
                    <button
                        onClick={fetchNetProfit}
                        className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
                ) : !hasValidData ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="p-4 bg-slate-100 rounded-full mb-4">
                            <FaInfoCircle className="text-slate-400 text-3xl" />
                        </div>
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">No Net Profit Data</h4>
                        <p className="text-slate-500 max-w-sm">
                        No net profit records found for the selected month and year.
                        </p>
                    </div>
                ) : (
                <>
                    <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-lg border border-slate-200 bg-white flex items-center justify-center ${totalNetProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                <FaRupeeSign size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Net Profit</p>
                                <p className={`text-2xl font-semibold ${totalNetProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                    {formatCurrency(totalNetProfit)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-slate-700">Profit Trend</h4>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 rounded-full bg-emerald-50 text-xs font-medium text-emerald-700 border border-emerald-100">
                                    Profit
                                </span>
                                <span className="px-3 py-1 rounded-full bg-rose-50 text-xs font-medium text-rose-700 border border-rose-100">
                                    Loss
                                </span>
                            </div>
                        </div>
                        <div className="w-full h-[350px]">
                            <BarChart
                                xAxis={[
                                    {
                                        scaleType: "band",
                                        data: chartData.labels,
                                        tickLabelStyle: {
                                            fontSize: 12,
                                            fontWeight: 500,
                                        },
                                    },
                                ]}
                                yAxis={[
                                    {
                                        label: "Amount (₹)",
                                        tickLabelStyle: { fontSize: 12 },
                                    },
                                ]}
                                series={[
                                    {
                                        data: chartData.values,
                                        label: "Net Profit",
                                        color: "#0d9488",
                                        valueFormatter: (v) => formatCurrency(v),
                                    },
                                ]}
                                height={350}
                                grid={{ horizontal: true }}
                                margin={{ left: 80, right: 30, top: 20, bottom: 50 }}
                                slotProps={{ legend: { hidden: true } }}
                                sx={{
                                    ".MuiBarElement-root": {
                                        rx: 4,
                                    },
                                }}
                            />
                        </div>
                    </div>

                    {chartData.values.length > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white">
                            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                                <h4 className="text-sm font-semibold text-slate-700">Profit Details</h4>
                            </div>
                            <div className="p-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {chartData.values.map((value, index) => {
                                        const numValue = Number(value) || 0;
                                        return (
                                            <div
                                                key={index}
                                                className={`rounded-lg p-3 border ${numValue >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}
                                            >
                                                <p className="text-xs text-slate-500 mb-1">{chartData.labels[index]}</p>
                                                <p className={`text-lg font-semibold ${numValue >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                                    {formatCurrency(numValue)}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
