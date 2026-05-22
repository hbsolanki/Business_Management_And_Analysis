import EChartRenderer from "@/components/charts/EChartRenderer";
import { FaCalendarAlt, FaChartBar, FaChevronDown } from "react-icons/fa";
import PremiumOverlay from "@/components/common/PremiumOverlay";

const parseNumber = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "string") return Number(value.replace(/,/g, ""));
    return Number(value);
};

const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(parseNumber(value));

export default function CustomerSpendTrend({ data, loading, month, year, onDateChange, isLocked }) {
    const months = [
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
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    if (loading) {
        return <div className="animate-pulse h-96 bg-gray-100 rounded-2xl" />;
    }

    const normalizedData = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
            ? data.results
            : Array.isArray(data?.data)
                ? data.data
                : [];

    const chartData = normalizedData
        .map((item) => ({
            customer_name:
                item.customer_name ||
                item.customer?.name ||
                item.name ||
                item.customer ||
                "Unknown",
            total_revenue: parseNumber(item.total_revenue ?? item.revenue ?? item.total_spend ?? item.amount ?? 0),
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 10);

    const customerNames = chartData.map((item) => item.customer_name);
    const revenueValues = chartData.map((item) => item.total_revenue);
    const totalRevenue = revenueValues.reduce((sum, value) => sum + value, 0);
    const avgRevenue = chartData.length ? totalRevenue / chartData.length : 0;
    const hasMeaningfulData = revenueValues.some((value) => value > 0);

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm relative overflow-hidden group">
            {isLocked && <PremiumOverlay message="Advanced analytics like custom spend trends are available on the Premium plan." />}

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                        <FaChartBar />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Spend Trends</h3>
                        <p className="text-xs text-slate-500">Monthly top spenders</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <select
                            value={month}
                            onChange={(e) => onDateChange(Number(e.target.value), year)}
                            disabled={isLocked}
                            className="appearance-none pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer shadow-sm hover:border-slate-300 transition-colors disabled:opacity-50"
                        >
                            {months.map((m) => (
                                <option key={m.value} value={m.value}>
                                    {m.label}
                                </option>
                            ))}
                        </select>
                        <FaChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
                    </div>

                    <div className="relative">
                        <select
                            value={year}
                            onChange={(e) => onDateChange(month, Number(e.target.value))}
                            disabled={isLocked}
                            className="appearance-none pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer shadow-sm hover:border-slate-300 transition-colors disabled:opacity-50"
                        >
                            {years.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                        <FaChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
                    </div>
                </div>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 ${isLocked ? "blur-sm opacity-50 select-none pointer-events-none" : ""}`}>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">{isLocked ? "₹1,24,000" : formatCurrency(totalRevenue)}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Revenue</p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">{isLocked ? "₹12,400" : formatCurrency(avgRevenue)}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Customer</p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">
                        {isLocked ? "Premium User" : (chartData[0]?.customer_name || "—")}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        {isLocked ? "₹45,000" : (chartData[0] ? formatCurrency(chartData[0].total_revenue) : "No data")}
                    </p>
                </div>
            </div>

            {chartData.length > 0 || isLocked ? (
                <div className={isLocked ? "blur-sm opacity-50 select-none pointer-events-none" : ""}>
                    {!hasMeaningfulData && !isLocked && (
                        <p className="text-xs text-slate-500 mb-2">
                            No revenue recorded for this period yet.
                        </p>
                    )}
                    <div className="w-full">
                        <EChartRenderer 
                            config={{
                                chart_type: 'vertical_bar',
                                labels: isLocked ? ["Cust A", "Cust B", "Cust C", "Cust D", "Cust E"] : customerNames,
                                datasets: [
                                    {
                                        label: "Revenue (INR)",
                                        data: isLocked ? [50000, 40000, 30000, 20000, 10000] : revenueValues,
                                    }
                                ],
                                option: {
                                    color: ["#0d9488"],
                                    yAxis: { name: "Revenue (₹)" },
                                    toolbox: { show: true }
                                }
                            }} 
                            height="350px" 
                        />
                    </div>
                </div>
            ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-300 gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                    <FaCalendarAlt className="text-3xl opacity-50" />
                    <p className="text-sm font-medium text-slate-500">No revenue data for this period</p>
                    <p className="text-xs text-slate-400">Try a different month or widen the date filters.</p>
                </div>
            )}
        </div>
    );
}
