import { useState, useEffect, useMemo } from "react";
import {
    FaChartLine,
    FaMoneyBillWave,
    FaReceipt,
    FaPercent,
    FaBoxes,
    FaCalendarAlt,
    FaExclamationTriangle,
} from "react-icons/fa";
import costService from "@/features/cost/services/costService";
import FinancialFilters from "./FinancialFilters";

const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

const formatCurrency = (val) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(val) || 0);

const getLatestRecord = (records) =>
    records.reduce((latest, item) => {
        if (!latest) return item;
        if (item.year > latest.year) return item;
        if (item.year === latest.year && item.month > latest.month) return item;
        return latest;
    }, null);

export default function MonthlyFinancialOverview({ branchId = "" }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allData, setAllData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [filters, setFilters] = useState({
        month: "",
        year: "",
        from_date: "",
        to_date: "",
    });
    const [activeFilters, setActiveFilters] = useState({});

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const defaultPeriod = useMemo(() => {
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
        return { month: prevMonth, year: prevYear };
    }, [currentMonth, currentYear]);

    useEffect(() => {
        fetchAllData();
    }, [branchId]);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            setError(null);
            const params = branchId ? { branch: branchId } : {};
            const response = await costService.getMonthlyFinancialSummary(params);
            const data = response.data?.results || response.data || [];
            setAllData(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch financial data:", err);
            setError("Failed to load financial data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const fetchFilteredData = async (filterParams) => {
        try {
            setLoading(true);
            setError(null);
            const params = { ...filterParams };
            if (branchId) params.branch = branchId;
            
            const response = await costService.getMonthlyFinancialSummary(params);
            const data = response.data?.results || response.data || [];
            setFilteredData(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch filtered data:", err);
            setError("Failed to apply filters. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const hasActiveFilters = useMemo(() => Object.keys(activeFilters).length > 0, [activeFilters]);

    const dataSource = useMemo(() => {
        if (!hasActiveFilters) return allData;
        return filteredData.length > 0 ? filteredData : [];
    }, [hasActiveFilters, allData, filteredData]);

    const displayPeriod = useMemo(() => {
        if (hasActiveFilters) {
            const month = activeFilters.month ? Number(activeFilters.month) : null;
            const year = activeFilters.year ? Number(activeFilters.year) : null;

            if (month && year) return { month, year };

            if (year && dataSource.length > 0) {
                const yearRecords = dataSource.filter((d) => d.year === year);
                const latestInYear = getLatestRecord(yearRecords);
                if (latestInYear) return { month: latestInYear.month, year: latestInYear.year };
                return { month: defaultPeriod.month, year };
            }

            if (month && !year) {
                return { month, year: currentYear };
            }

            const latest = getLatestRecord(dataSource);
            if (latest) return { month: latest.month, year: latest.year };
        }

        return defaultPeriod;
    }, [hasActiveFilters, activeFilters, dataSource, defaultPeriod, currentYear]);

    const currentMonthData = useMemo(() => {
        const match =
            dataSource.find((d) => d.month === displayPeriod.month && d.year === displayPeriod.year) || null;
        return match || getLatestRecord(dataSource) || null;
    }, [dataSource, displayPeriod]);

    const last3MonthsData = useMemo(() => {
        const months = [];
        for (let i = 1; i <= 3; i++) {
            let m = displayPeriod.month - i;
            let y = displayPeriod.year;
            if (m <= 0) {
                m += 12;
                y -= 1;
            }
            const found = allData.find((d) => d.month === m && d.year === y);
            if (found) months.push(found);
        }
        return months;
    }, [allData, displayPeriod]);

    const handleApplyFilters = (nextFilters) => {
        const cleanFilters = {};
        if (nextFilters.month) cleanFilters.month = nextFilters.month;
        if (nextFilters.year) cleanFilters.year = nextFilters.year;
        if (nextFilters.from_date) cleanFilters.from_date = nextFilters.from_date;
        if (nextFilters.to_date) cleanFilters.to_date = nextFilters.to_date;

        setActiveFilters(cleanFilters);
        if (Object.keys(cleanFilters).length === 0) {
            setFilteredData([]);
            return;
        }
        setFilteredData([]);
        fetchFilteredData(cleanFilters);
    };

    const handleResetFilters = () => {
        setFilters({ month: "", year: "", from_date: "", to_date: "" });
        setActiveFilters({});
        setFilteredData([]);
    };

    const handleRetry = () => {
        if (hasActiveFilters) {
            fetchFilteredData(activeFilters);
            return;
        }
        fetchAllData();
    };

    const isCurrentPeriod =
        displayPeriod.month === currentMonth && displayPeriod.year === currentYear;

    const getMonthName = (monthNum) => MONTHS[(monthNum - 1) % 12] || "Unknown";

    return (
        <div className="space-y-6 animate-fade-up">
            <FinancialFilters
                filters={filters}
                onChange={setFilters}
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
                isLoading={loading}
            />

            {isCurrentPeriod && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 text-sm">
                    Current month data is provisional. Salary, product costs, and tax values are finalized at month end.
                </div>
            )}

            {loading && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-slate-600">
                        <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-medium">Loading financial data...</span>
                    </div>
                    {Object.keys(activeFilters).length > 0 && (
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                            Filters applied
                        </span>
                    )}
                </div>
            )}

            {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
                    <FaExclamationTriangle className="mx-auto text-rose-500 text-3xl mb-3" />
                    <p className="text-rose-700 font-medium">{error}</p>
                    <button
                        onClick={handleRetry}
                        className="mt-4 px-5 py-2 bg-rose-600 text-white text-sm font-semibold rounded-lg hover:bg-rose-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900">Monthly Overview</h2>
                            <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                <FaCalendarAlt size={14} />
                                {getMonthName(displayPeriod.month)} {displayPeriod.year}
                                {hasActiveFilters && (
                                    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full border border-brand-100">
                                        Filtered
                                    </span>
                                )}
                            </p>
                        </div>
                        {currentMonthData && (
                            <div className="text-right">
                                <p className="text-xs text-slate-500">Invoices</p>
                                <p className="text-2xl font-semibold text-slate-900">
                                    {currentMonthData.invoice_count || 0}
                                </p>
                            </div>
                        )}
                    </div>

                    {!currentMonthData ? (
                        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
                            {loading ? (
                                <div className="flex flex-col items-center gap-3 text-slate-500">
                                    <div className="w-8 h-8 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-sm font-medium">Loading summary...</p>
                                </div>
                            ) : (
                                <>
                                    <FaExclamationTriangle className="mx-auto text-slate-400 text-3xl mb-3" />
                                    <p className="text-slate-600 font-medium">
                                        No financial records found for {getMonthName(displayPeriod.month)} {displayPeriod.year}.
                                    </p>
                                    <p className="text-xs text-slate-400 mt-2">
                                        Start recording expenses and invoices to see data here.
                                    </p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <MetricCard
                                label="Revenue"
                                value={formatCurrency(currentMonthData.revenue)}
                                icon={<FaChartLine />}
                            />
                            <MetricCard
                                label="Product Costs"
                                value={formatCurrency(currentMonthData.products_total_cost)}
                                icon={<FaBoxes />}
                            />
                            <MetricCard
                                label="Total Costs"
                                value={formatCurrency(currentMonthData.total_cost)}
                                icon={<FaMoneyBillWave />}
                            />
                            <MetricCard
                                label="Gross Profit"
                                value={formatCurrency(currentMonthData.gross_profit)}
                                icon={<FaReceipt />}
                            />
                        </div>
                    )}
                </div>
            </section>

            {currentMonthData && (
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Net Profit (Before Tax)"
                        value={formatCurrency(currentMonthData.net_profit_before_tax)}
                        icon={<FaChartLine />}
                        accent="emerald"
                    />
                    <StatCard
                        title="Net Profit (After Tax)"
                        value={formatCurrency(currentMonthData.net_profit_after_tax)}
                        icon={<FaReceipt />}
                        accent="brand"
                    />
                    <StatCard
                        title="Taxes"
                        value={formatCurrency(currentMonthData.taxes)}
                        icon={<FaPercent />}
                        accent="amber"
                    />
                    <StatCard
                        title="Salary Expenditure"
                        value={formatCurrency(currentMonthData.salary_expenditure)}
                        icon={<FaMoneyBillWave />}
                        accent="sky"
                    />
                </section>
            )}

            {currentMonthData && (
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="px-6 py-5 border-b border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-900">GST Summary</h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InfoCard label="Input GST" value={formatCurrency(currentMonthData.input_gst)} />
                        <InfoCard label="Output GST" value={formatCurrency(currentMonthData.output_gst)} />
                        <InfoCard
                            label="GST Payable"
                            value={formatCurrency(currentMonthData.gst_payable)}
                            emphasis
                        />
                    </div>
                </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900">Previous Months</h3>
                    <p className="text-sm text-slate-500">
                        Financial summary for the 3 months before {getMonthName(displayPeriod.month)} {displayPeriod.year}
                    </p>
                </div>

                {last3MonthsData.length === 0 ? (
                    <div className="p-10 text-center">
                        <FaCalendarAlt className="mx-auto text-slate-300 text-4xl mb-4" />
                        <p className="text-slate-500">No historical data available for the previous months.</p>
                    </div>
                ) : (
                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {last3MonthsData.map((data) => (
                            <MonthCard
                                key={`${data.year}-${data.month}`}
                                data={data}
                                formatCurrency={formatCurrency}
                                getMonthName={getMonthName}
                            />
                        ))}
                    </div>
                )}
            </section>

            {currentMonthData?.cost_category_items?.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-900">Expense Breakdown</h3>
                        <p className="text-sm text-slate-500">Cost categories for this month</p>
                    </div>
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {currentMonthData.cost_category_items.map((item) => (
                            <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1">{item.cost_category?.name}</p>
                                        <p className="text-xl font-semibold text-slate-900">
                                            {formatCurrency(item.cost)}
                                        </p>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center">
                                        <FaMoneyBillWave />
                                    </div>
                                </div>
                                {item.cost_category?.description && (
                                    <p className="text-xs text-slate-400 mt-2 truncate">
                                        {item.cost_category.description}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {Object.keys(activeFilters).length > 0 && filteredData.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-900">Filtered Results</h3>
                        <p className="text-sm text-slate-500">{filteredData.length} record(s) found</p>
                    </div>
                    <div className="p-6 space-y-4">
                        {filteredData.map((data) => (
                            <div
                                key={`${data.year}-${data.month}`}
                                className="border border-slate-200 rounded-xl p-4"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-slate-900">
                                        {getMonthName(data.month)} {data.year}
                                    </h4>
                                    <span className="text-sm text-slate-500">
                                        {data.invoice_count} invoices
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div>
                                        <p className="text-slate-500">Revenue</p>
                                        <p className="font-semibold text-emerald-600">
                                            {formatCurrency(data.revenue)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Total Costs</p>
                                        <p className="font-semibold text-rose-600">
                                            {formatCurrency(data.total_cost)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Gross Profit</p>
                                        <p className="font-semibold text-slate-700">
                                            {formatCurrency(data.gross_profit)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Net Profit</p>
                                        <p className="font-semibold text-slate-700">
                                            {formatCurrency(data.net_profit_after_tax)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {Object.keys(activeFilters).length > 0 && filteredData.length === 0 && !loading && !error && (
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="p-10 text-center">
                        <FaExclamationTriangle className="mx-auto text-slate-300 text-4xl mb-4" />
                        <p className="text-slate-600 font-medium">No records match the selected filters.</p>
                        <p className="text-xs text-slate-400 mt-2">
                            Try adjusting the month or year to view available data.
                        </p>
                    </div>
                </section>
            )}
        </div>
    );
}

function MetricCard({ label, value, icon }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{label}</span>
                <span className="text-slate-500">{icon}</span>
            </div>
            <p className="text-lg font-semibold text-slate-900">{value}</p>
        </div>
    );
}

function StatCard({ title, value, icon, accent }) {
    const accents = {
        emerald: { border: "border-l-emerald-500", icon: "text-emerald-600 bg-emerald-50 border-emerald-100" },
        brand: { border: "border-l-brand-500", icon: "text-brand-600 bg-brand-50 border-brand-100" },
        amber: { border: "border-l-amber-500", icon: "text-amber-600 bg-amber-50 border-amber-100" },
        sky: { border: "border-l-sky-500", icon: "text-sky-600 bg-sky-50 border-sky-100" },
    };
    const styles = accents[accent] || accents.brand;

    return (
        <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 ${styles.border}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">{value}</p>
                </div>
                <div className={`h-9 w-9 rounded-lg border ${styles.icon} flex items-center justify-center`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

function InfoCard({ label, value, emphasis }) {
    return (
        <div
            className={`rounded-xl border border-slate-200 p-4 ${
                emphasis ? "bg-slate-900 text-white" : "bg-slate-50"
            }`}
        >
            <p className={`text-xs font-semibold uppercase tracking-wider ${emphasis ? "text-slate-200" : "text-slate-500"}`}>
                {label}
            </p>
            <p className={`text-lg font-semibold mt-2 ${emphasis ? "text-white" : "text-slate-900"}`}>
                {value}
            </p>
        </div>
    );
}

function MonthCard({ data, formatCurrency, getMonthName }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-slate-900">
                    {getMonthName(data.month)} {data.year}
                </h4>
                <span className="text-xs bg-white text-slate-600 px-2 py-1 rounded-full font-medium border border-slate-200">
                    {data.invoice_count} invoices
                </span>
            </div>
            <div className="space-y-3">
                <div className="flex justify-between">
                    <span className="text-slate-500 text-sm">Revenue</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(data.revenue)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500 text-sm">Total Costs</span>
                    <span className="font-semibold text-rose-600">{formatCurrency(data.total_cost)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3">
                    <span className="text-slate-600 text-sm font-medium">Net Profit</span>
                    <span className="font-semibold text-slate-700">
                        {formatCurrency(data.net_profit_after_tax)}
                    </span>
                </div>
            </div>
        </div>
    );
}
