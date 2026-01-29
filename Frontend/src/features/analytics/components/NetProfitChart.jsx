import { useState, useEffect, useMemo } from "react";
import { BarChart } from "@mui/x-charts/BarChart";
import {
    FaCalendarAlt, FaChartLine, FaSync,
    FaDollarSign, FaArrowUp, FaArrowDown, FaInfoCircle
} from "react-icons/fa";
import api from "@/services/api";

// Format date to YYYY-MM-DD
const formatDateInput = (date) => {
    const d = new Date(date);
    return d.toISOString().split("T")[0];
};

// Get default date range (last 30 days)
const getDefaultDateRange = () => {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setDate(today.getDate() - 30);
    return {
        from: formatDateInput(lastMonth),
        to: formatDateInput(today),
    };
};

export default function NetProfitChart() {
    const defaultRange = getDefaultDateRange();
    const [fromDate, setFromDate] = useState(defaultRange.from);
    const [toDate, setToDate] = useState(defaultRange.to);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState([]);

    useEffect(() => {
        fetchNetProfit();
    }, []);

    const fetchNetProfit = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get(
                `/analytics/month/netprofit/?from_date=${fromDate}&to_date=${toDate}`
            );
            // Handle both array and single value responses
            const responseData = response.data;
            if (Array.isArray(responseData)) {
                setData(responseData);
            } else if (typeof responseData === 'number') {
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
        if (fromDate && toDate) {
            fetchNetProfit();
        }
    };

    const formatCurrency = (val) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(Number(val) || 0);

    // Check if data has meaningful values (not just 0 or empty)
    const hasValidData = useMemo(() => {
        if (!data || data.length === 0) return false;
        // Check if at least one value is non-zero
        return data.some(val => Number(val) !== 0);
    }, [data]);

    // Calculate total net profit
    const totalNetProfit = useMemo(() => {
        if (!data || data.length === 0) return 0;
        return data.reduce((sum, val) => sum + (Number(val) || 0), 0);
    }, [data]);

    // Prepare chart data
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return { labels: [], values: [] };

        return {
            labels: data.map((_, index) => `Period ${index + 1}`),
            values: data.map((val) => Number(val) || 0),
        };
    }, [data]);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            {/* Header & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <FaChartLine className="text-violet-500" />
                        Net Profit Analysis
                    </h3>
                    <p className="text-sm text-gray-500">Monthly net profit overview and trends</p>
                </div>

                {/* Date Filters */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">From:</span>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">To:</span>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={handleApplyFilter}
                        className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2"
                    >
                        <FaSync size={12} />
                        Apply
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-500 font-medium">Loading net profit data...</p>
                    </div>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="p-4 bg-red-100 rounded-full mb-4">
                        <FaChartLine className="text-red-500 text-2xl" />
                    </div>
                    <p className="text-gray-700 font-medium mb-2">{error}</p>
                    <button
                        onClick={fetchNetProfit}
                        className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            ) : !hasValidData ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="p-4 bg-gray-100 rounded-full mb-4">
                        <FaInfoCircle className="text-gray-400 text-3xl" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">No Net Profit Data</h4>
                    <p className="text-gray-500 max-w-sm">
                        No net profit data found for the selected date range.
                        Try adjusting the dates to view profit analysis.
                    </p>
                </div>
            ) : (
                <>
                    {/* Summary Total */}
                    <div className="mb-8 p-6 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-4 rounded-xl bg-white shadow-sm ${totalNetProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    <FaDollarSign size={24} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 font-medium mb-1">Total Net Profit</p>
                                    <p className={`text-3xl font-bold ${totalNetProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {formatCurrency(totalNetProfit)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bar Chart */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-gray-700">Profit Trend</h4>
                            {/* Legend */}
                            <div className="flex gap-2">
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-xs font-medium text-emerald-700 border border-emerald-100">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Profit
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-xs font-medium text-red-700 border border-red-100">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div> Loss
                                </div>
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
                                    }
                                ]}
                                series={[
                                    {
                                        data: chartData.values,
                                        label: "Net Profit",
                                        // Dynamic color moved to logic but explicit colors array not supported directly per bar in simple series config usually,
                                        // Unless using color accessor or split series. 
                                        // For simplicity, sticking to a primary color or custom logic if XCharts supports it.
                                        // MUI X Charts supports color map or array if configured correctly, but simple way is uniform color.
                                        // Let's use a nice purple for consistency or stick to condition-based if possible.
                                        // Actually, if we pass strictly one color it's easier. Let's use a nice Indigo/Violet.
                                        color: "#8b5cf6",
                                        valueFormatter: (v) => formatCurrency(v),
                                    },
                                ]}
                                height={350}
                                grid={{ horizontal: true }}
                                margin={{ left: 80, right: 30, top: 20, bottom: 50 }}
                                slotProps={{
                                    legend: { hidden: true },
                                }}
                                sx={{
                                    ".MuiBarElement-root": {
                                        rx: 4,
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Data Points */}
                    {data.length > 0 && (
                        <div className="mt-6 bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                                <h4 className="text-sm font-semibold text-gray-700">Profit Details</h4>
                            </div>
                            <div className="p-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {data.map((value, index) => {
                                        const numValue = Number(value) || 0;
                                        return (
                                            <div
                                                key={index}
                                                className={`rounded-lg p-3 ${numValue >= 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}
                                            >
                                                <p className="text-xs text-gray-500 mb-1">Period {index + 1}</p>
                                                <p className={`text-lg font-bold ${numValue >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
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
