import { useCallback, useEffect, useMemo, useState } from "react";
import EChartRenderer from "@/components/charts/EChartRenderer";
import {
    FaChartLine,
    FaSync,
    FaRupeeSign,
    FaInfoCircle,
    FaCalendarAlt,
    FaArrowUp,
    FaArrowDown,
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

export default function NetProfitChart({ branchId = "" }) {
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

    const fetchNetProfit = async () => {
        try {
            setLoading(true);
            setError(null);
            const query = `month=${month}&year=${year}${branchId ? `&branch=${branchId}` : ""}`;
            const response = await api.get(
                `/analytics/month/netprofit/?${query}`
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

    useEffect(() => {
        fetchNetProfit();
    }, [branchId]);

    const handleApplyFilter = () => {
        fetchNetProfit();
    };

    const formatCurrency = (val) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(Number(val) || 0);

    const getMonthName = useCallback((monthNum) => {
        const found = MONTHS.find((m) => m.value === monthNum);
        return found ? found.label : "Unknown";
    }, []);

    const resolveLabel = useCallback((item, index) => {
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
    }, [getMonthName]);

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
    }, [data, resolveLabel]);

    useEffect(() => {
        if (year === currentYear && month > currentMonth) {
            setMonth(currentMonth);
        }
    }, [year, month, currentYear, currentMonth]);

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <FaChartLine />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            Net Profit Analysis
                        </h3>
                        <p className="text-sm text-slate-500">Monthly net profit overview and trends</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-200">
                        <FaCalendarAlt className="ml-2 text-slate-400" size={14} />
                        <select
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                            className="bg-transparent text-sm font-medium text-slate-700 outline-none px-2 py-1 cursor-pointer"
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
                        <span className="text-slate-300">|</span>
                        <select
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="bg-transparent text-sm font-medium text-slate-700 outline-none px-2 py-1 cursor-pointer"
                        >
                            {yearOptions.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleApplyFilter}
                        className="p-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
                        title="Apply"
                    >
                        <FaSync size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-medium">Loading net profit data...</p>
                    </div>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="p-4 bg-rose-50 rounded-full mb-4 border border-rose-100">
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
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="p-4 bg-slate-50 rounded-full mb-4 border border-slate-100">
                        <FaInfoCircle className="text-slate-400 text-3xl" />
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">No Net Profit Data</h4>
                    <p className="text-slate-500 max-w-sm">
                        No net profit records found for the selected month and year.
                    </p>
                </div>
            ) : (
                <>
                    <div className="mb-6 rounded-xl border border-slate-100 bg-slate-50/50 p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-sm ${totalNetProfit >= 0 ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                                <FaRupeeSign size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Total Net Profit</p>
                                <p className={`text-3xl font-bold ${totalNetProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                    {formatCurrency(totalNetProfit)}
                                </p>
                            </div>
                        </div>
                        {totalNetProfit !== 0 && (
                            <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${totalNetProfit > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {totalNetProfit > 0 ? <FaArrowUp /> : <FaArrowDown />}
                                {totalNetProfit > 0 ? 'Profit' : 'Loss'}
                            </div>
                        )}
                    </div>

                    <div className="mb-8">
                        <div className="w-full">
                            <EChartRenderer 
                                config={{
                                    chart_type: 'vertical_bar',
                                    labels: chartData.labels,
                                    datasets: [
                                        {
                                            label: "Net Profit",
                                            data: chartData.values,
                                        }
                                    ],
                                    option: {
                                        color: ["#10b981"],
                                        yAxis: { name: "Amount (₹)" },
                                        toolbox: { show: true }
                                    }
                                }} 
                                height="380px" 
                            />
                        </div>
                    </div>

                    {chartData.values.length > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <h4 className="text-sm font-bold text-slate-700 uppercase">Profit Details</h4>
                            </div>
                            <div className="p-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {chartData.values.map((value, index) => {
                                        const numValue = Number(value) || 0;
                                        return (
                                            <div
                                                key={index}
                                                className={`rounded-xl p-4 border transition-all hover:shadow-md ${numValue >= 0 ? "bg-emerald-50/50 border-emerald-100 hover:border-emerald-200" : "bg-rose-50/50 border-rose-100 hover:border-rose-200"}`}
                                            >
                                                <p className="text-xs text-slate-500 mb-1 font-medium uppercase">{chartData.labels[index]}</p>
                                                <p className={`text-lg font-bold ${numValue >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
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
