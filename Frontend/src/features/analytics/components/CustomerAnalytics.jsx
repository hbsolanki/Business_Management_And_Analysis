import { useEffect, useMemo, useState } from "react";
import {
    FaChartLine,
    FaCrown,
    FaExclamationTriangle,
    FaUserCheck,
    FaUsers,
    FaFilter,
} from "react-icons/fa";
import customerAnalyticsService from "../services/customerAnalyticsService";
import CustomerRetention from "./customer/CustomerRetention";
import CustomerLeaderboard from "./customer/CustomerLeaderboard";
import CustomerSpendTrend from "./customer/CustomerSpendTrend";
import CustomerProductPreferences from "./customer/CustomerProductPreferences";
import AnalyticsFilters from "./customer/AnalyticsFilters";
import CustomerProducts from "./customer/CustomerProducts";

const parseNumber = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "string") return Number(value.replace(/,/g, ""));
    return Number(value);
};

const formatCurrency = (val) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(parseNumber(val));

export default function CustomerAnalytics() {
    const [loading, setLoading] = useState(true);
    const [trendLoading, setTrendLoading] = useState(false);
    const [error, setError] = useState(null);

    // Data States with Pagination
    const [retentionData, setRetentionData] = useState(null);
    const [isRetentionLocked, setIsRetentionLocked] = useState(false);

    const [leaderboardData, setLeaderboardData] = useState([]);
    const [leaderboardNext, setLeaderboardNext] = useState(null);
    const [loadingLeaderboardMore, setLoadingLeaderboardMore] = useState(false);
    const [isLeaderboardLocked, setIsLeaderboardLocked] = useState(false);

    const [spendTrendData, setSpendTrendData] = useState([]);
    const [isSpendTrendLocked, setIsSpendTrendLocked] = useState(false);

    const [preferencesData, setPreferencesData] = useState([]);
    const [preferencesNext, setPreferencesNext] = useState(null);
    const [loadingPreferencesMore, setLoadingPreferencesMore] = useState(false);
    const [isPreferencesLocked, setIsPreferencesLocked] = useState(false);

    const [productsData, setProductsData] = useState([]);
    const [productsNext, setProductsNext] = useState(null);
    const [productsPage, setProductsPage] = useState(1);
    const [loadingProductsMore, setLoadingProductsMore] = useState(false);

    // Trend Chart Filters
    const currentDate = new Date();
    const [trendMonth, setTrendMonth] = useState(currentDate.getMonth() + 1);
    const [trendYear, setTrendYear] = useState(currentDate.getFullYear());

    // Global Filters - Default to Previous Month
    const [filters, setFilters] = useState(() => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);

        // Helper to format YYYY-MM-DD
        const fmt = (date) => {
            const offsetMs = date.getTimezoneOffset() * 60 * 1000;
            return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
        };

        return {
            startDate: fmt(start),
            endDate: fmt(end),
            searchQuery: "",
            productId: "",
        };
    });

    // Toggle Filters
    const [showFilters, setShowFilters] = useState(false);

    // Effect to fetch main data when filters change
    useEffect(() => {
        fetchAllData();
    }, [filters.startDate, filters.endDate, filters.searchQuery, filters.productId]);

    // Effect to fetch spend trend when trend filters change
    useEffect(() => {
        fetchSpendTrend();
    }, [trendMonth, trendYear]);

    const getCommonParams = () => {
        const query = filters.searchQuery || "";
        const isNumeric = /^\d+$/.test(query);
        const isCustomerId = isNumeric && query.length < 6;
        const isMobile = isNumeric && query.length >= 6;

        const commonParams = {};
        if (filters.startDate) commonParams.start_date = filters.startDate;
        if (filters.endDate) commonParams.end_date = filters.endDate;
        if (isCustomerId) commonParams.customer_id = query;
        if (isMobile) commonParams.mobile_number = query;
        return commonParams;
    };

    const fetchAllData = async () => {
        setLoading(true);
        setError(null);
        setProductsPage(1); // Reset product page

        const commonParams = getCommonParams();

        // Retention takes specific params
        const retentionParams = {};
        if (filters.startDate) retentionParams.from_date = filters.startDate;
        if (filters.endDate) retentionParams.to_date = filters.endDate;

        // Product params includes product_id
        const productParams = { ...commonParams };
        if (filters.productId) productParams.product_id = filters.productId;
        productParams.page = 1;

        try {
            const results = await Promise.allSettled([
                customerAnalyticsService.getRetentionMetrics(retentionParams),
                customerAnalyticsService.getLeaderboard(commonParams),
                customerAnalyticsService.getProductPreferences(commonParams),
                customerAnalyticsService.getCustomerProducts(productParams),
            ]);

            const [retentionRes, leaderboardRes, preferencesRes, productsRes] = results;

            // Helper to handle response
            const handleResponse = (result, setData, setNext, setLocked) => {
                if (result.status === "fulfilled") {
                    setLocked && setLocked(false);
                    const data = result.value;
                    if (data.results) {
                        setData(data.results);
                        setNext && setNext(data.next);
                    } else if (Array.isArray(data)) {
                        setData(data);
                        setNext && setNext(null);
                    } else {
                        setData(data); // For retention which is an object
                        setNext && setNext(null);
                    }
                } else {
                    console.error("Analytics fetch failed:", result.reason);
                    if (result.reason?.response?.data?.detail === "has_advanced_analytics not allow in your plan") {
                        setLocked && setLocked(true);
                    }
                }
            };

            handleResponse(retentionRes, setRetentionData, null, setIsRetentionLocked);
            handleResponse(leaderboardRes, setLeaderboardData, setLeaderboardNext, setIsLeaderboardLocked);
            handleResponse(preferencesRes, setPreferencesData, setPreferencesNext, setIsPreferencesLocked);

            // Products usually don't have premium lock, but treating same for consistency
            if (productsRes.status === "fulfilled") {
                const products = productsRes.value;
                if (products.results) {
                    setProductsData(products.results);
                    setProductsNext(products.next);
                } else if (Array.isArray(products)) {
                    setProductsData(products);
                    setProductsNext(null);
                } else {
                    setProductsData([]);
                    setProductsNext(null);
                }
            } else {
                console.error("Products fetch failed", productsRes.reason);
            }

        } catch (error) {
            console.error("Failed to fetch customer analytics:", error);
            setError("We couldn’t load customer analytics. Check your filters and try again.");
        } finally {
            setLoading(false);
        }
    };

    const fetchSpendTrend = async (signal) => {
        setTrendLoading(true);
        try {
            const data = await customerAnalyticsService.getSpendTrend({
                month: trendMonth,
                year: trendYear,
                signal
            });
            if (signal?.aborted) return;
            setSpendTrendData(data);
            setIsSpendTrendLocked(false);
        } catch (error) {
            if (error.name === "CanceledError" || error.code === "ERR_CANCELED") return;
            console.error("Failed to fetch spend trend:", error);
            if (error.response?.data?.detail === "has_advanced_analytics not allow in your plan") {
                setIsSpendTrendLocked(true);
                // Don't set generic error for this case, as we handle it with overlay
            } else {
                setError((prev) => prev ?? "Spend trend data is temporarily unavailable.");
            }
        } finally {
            if (!signal?.aborted) {
                setTrendLoading(false);
            }
        }
    };

    // --- Load More Handlers ---

    const handleLoadMoreLeaderboard = async () => {
        if (!leaderboardNext || loadingLeaderboardMore) return;
        setLoadingLeaderboardMore(true);
        try {
            const response = await customerAnalyticsService.getLeaderboard({ cursor: leaderboardNext });
            if (response.results) {
                setLeaderboardData((prev) => [...prev, ...response.results]);
                setLeaderboardNext(response.next);
            } else {
                setLeaderboardNext(null);
            }
        } catch (err) {
            console.error("Failed to load more leaderboard info", err);
        } finally {
            setLoadingLeaderboardMore(false);
        }
    };

    const handleLoadMorePreferences = async () => {
        if (!preferencesNext || loadingPreferencesMore) return;
        setLoadingPreferencesMore(true);
        try {
            const response = await customerAnalyticsService.getProductPreferences({ cursor: preferencesNext });
            if (response.results) {
                setPreferencesData((prev) => [...prev, ...response.results]);
                setPreferencesNext(response.next);
            } else {
                setPreferencesNext(null);
            }
        } catch (err) {
            console.error("Failed to load more preferences", err);
        } finally {
            setLoadingPreferencesMore(false);
        }
    };

    const handleLoadMoreProducts = async () => {
        if (loadingProductsMore) return;
        // If we have a next URL (cursor) it might be safer to use that, but existing implementation might rely on page
        // If the backend returns 'next' as a full URL with ?page=X, we can try to parse it or just use page counter if supported.
        // The implementation plan suggested page-based for products.
        const nextPage = productsPage + 1;

        setLoadingProductsMore(true);
        const productParams = getCommonParams();
        if (filters.productId) productParams.product_id = filters.productId;
        productParams.page = nextPage;

        try {
            const response = await customerAnalyticsService.getCustomerProducts(productParams);
            if (response.results) {
                setProductsData((prev) => [...prev, ...response.results]);
                setProductsNext(response.next);
                setProductsPage(nextPage);
            } else if (Array.isArray(response) && response.length > 0) {
                // Fallback if backend doesn't return paginated structure but just array
                setProductsData((prev) => [...prev, ...response]);
                // If it's an array, we don't know if there's next, maybe assume empty if length < limit
            } else {
                setProductsNext(null);
            }
        } catch (err) {
            console.error("Failed to load more products", err);
        } finally {
            setLoadingProductsMore(false);
        }
    };


    const handleTrendDateChange = (m, y) => {
        setTrendMonth(m);
        setTrendYear(y);
    };

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
    };

    const insights = useMemo(() => {
        const leaderboardRows = Array.isArray(leaderboardData) ? leaderboardData : [];
        const totalCustomers = parseNumber(retentionData?.total_customers);
        const returningCustomers = parseNumber(retentionData?.returning_customers);
        const returningShare = totalCustomers > 0 ? returningCustomers / totalCustomers : null;

        let totalRevenue = 0;
        let avgOrderValueSum = 0;
        let avgOrderValueCount = 0;
        let topCustomer = null;

        leaderboardRows.forEach((row) => {
            const revenue = parseNumber(row.total_revenue);
            totalRevenue += revenue;

            const avgValue = parseNumber(row.avg_order_value);
            if (avgValue > 0) {
                avgOrderValueSum += avgValue;
                avgOrderValueCount += 1;
            } else {
                const orders = parseNumber(row.order_count);
                if (orders > 0 && revenue > 0) {
                    avgOrderValueSum += revenue / orders;
                    avgOrderValueCount += 1;
                }
            }

            if (!topCustomer || revenue > topCustomer.revenue) {
                topCustomer = {
                    name: row.customer_name,
                    revenue,
                };
            }
        });

        const avgOrderValue = avgOrderValueCount > 0 ? avgOrderValueSum / avgOrderValueCount : 0;

        return {
            leaderboardCount: leaderboardRows.length,
            totalRevenue,
            avgOrderValue,
            topCustomer,
            returningShare,
            returningCustomers,
            totalCustomers,
        };
    }, [leaderboardData, retentionData]);

    const filterSummary = useMemo(() => {
        const parts = [];
        if (filters.startDate || filters.endDate) {
            const fromLabel = filters.startDate ? filters.startDate : "Start";
            const toLabel = filters.endDate ? filters.endDate : "Today";
            parts.push(`Range: ${fromLabel} → ${toLabel}`);
        }
        if (filters.searchQuery) parts.push(`Customer: ${filters.searchQuery}`);
        if (filters.productId) parts.push(`Product ID: ${filters.productId}`);
        return parts.length > 0 ? parts.join(" · ") : "All-time view";
    }, [filters]);

    const retryAll = () => {
        fetchAllData();
        fetchSpendTrend();
    };

    return (
        <div className="space-y-6 animate-fade-up">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="p-6 sm:p-7 space-y-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Customer Analytics
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 mt-2">
                                Revenue, retention, and loyalty signals
                            </h2>
                            <p className="text-sm text-slate-600 mt-2 max-w-2xl">
                                Monitor repeat behavior, top spenders, and product affinity in a single view.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 items-end">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
                                Active scope: {filterSummary}
                            </div>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-2 ${showFilters
                                    ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
                                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                    }`}
                            >
                                <FaFilter className={showFilters ? "text-slate-300" : "text-slate-500"} />
                                {showFilters ? "Hide Filters" : "Filters"}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <InsightCard
                            title="Top spender"
                            value={insights.topCustomer?.name || "—"}
                            subValue={
                                insights.topCustomer
                                    ? formatCurrency(insights.topCustomer.revenue)
                                    : "No revenue data"
                            }
                            icon={<FaCrown />}
                            accent="amber"
                        />
                        <InsightCard
                            title="Avg order value"
                            value={insights.avgOrderValue ? formatCurrency(insights.avgOrderValue) : "—"}
                            subValue={
                                insights.leaderboardCount
                                    ? `Across ${insights.leaderboardCount} customers`
                                    : "No order activity"
                            }
                            icon={<FaChartLine />}
                            accent="brand"
                        />
                        <InsightCard
                            title="Returning share"
                            value={
                                insights.returningShare !== null
                                    ? `${(insights.returningShare * 100).toFixed(1)}%`
                                    : "—"
                            }
                            subValue={
                                insights.totalCustomers
                                    ? `${insights.returningCustomers} of ${insights.totalCustomers} customers`
                                    : "No retention totals"
                            }
                            icon={<FaUserCheck />}
                            accent="emerald"
                        />
                        <InsightCard
                            title="Revenue tracked"
                            value={formatCurrency(insights.totalRevenue)}
                            subValue={insights.totalRevenue ? "Top customer segments" : "No revenue yet"}
                            icon={<FaChartLine />}
                            accent="sky"
                        />
                    </div>
                </div>
            </section>

            {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3 text-rose-700">
                        <span className="p-2 rounded-lg bg-rose-100">
                            <FaExclamationTriangle />
                        </span>
                        <div>
                            <p className="text-sm font-semibold">Analytics data could not load</p>
                            <p className="text-xs text-rose-600/80 mt-1">{error}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={retryAll}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-100 transition"
                    >
                        Retry
                    </button>
                </div>
            )}

            {showFilters && <AnalyticsFilters currentFilters={filters} onFilterChange={handleFilterChange} />}

            <section className="space-y-4">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">Customer Retention</h2>
                    <p className="text-sm text-slate-500">Snapshot of loyalty, churn, and growth.</p>
                </div>
                <CustomerRetention data={retentionData} loading={loading} />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CustomerSpendTrend
                    data={spendTrendData}
                    loading={loading || trendLoading}
                    month={trendMonth}
                    year={trendYear}
                    onDateChange={handleTrendDateChange}
                    isLocked={isSpendTrendLocked}
                />
                <CustomerLeaderboard
                    data={leaderboardData}
                    loading={loading}
                    onLoadMore={handleLoadMoreLeaderboard}
                    hasMore={!!leaderboardNext}
                    loadingMore={loadingLeaderboardMore}
                />
            </div>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-900">Purchase History</h2>
                <CustomerProducts
                    data={productsData}
                    loading={loading}
                    onLoadMore={handleLoadMoreProducts}
                    hasMore={!!productsNext || (productsData.length > 0 && productsData.length % 10 === 0 && !productsNext)} // Fallback logic if needed, but !!productsNext is safer if API is consistent
                    loadingMore={loadingProductsMore}
                />
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-900">Product Preferences</h2>
                <CustomerProductPreferences
                    data={preferencesData}
                    loading={loading}
                    onLoadMore={handleLoadMorePreferences}
                    hasMore={!!preferencesNext}
                    loadingMore={loadingPreferencesMore}
                />
            </section>
        </div>
    );
}

function InsightCard({ title, value, subValue, icon, accent = "brand" }) {
    const accentStyles = {
        brand: {
            border: "border-l-brand-500",
            icon: "text-brand-600 bg-brand-50 border-brand-100",
        },
        amber: {
            border: "border-l-amber-500",
            icon: "text-amber-600 bg-amber-50 border-amber-100",
        },
        emerald: {
            border: "border-l-emerald-500",
            icon: "text-emerald-600 bg-emerald-50 border-emerald-100",
        },
        sky: {
            border: "border-l-sky-500",
            icon: "text-sky-600 bg-sky-50 border-sky-100",
        },
    };

    const styles = accentStyles[accent] || accentStyles.brand;

    return (
        <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 ${styles.border}`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {title}
                    </p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">{value}</p>
                    <p className="text-xs text-slate-500 mt-1">{subValue}</p>
                </div>
                <div className={`h-9 w-9 rounded-lg border ${styles.icon} flex items-center justify-center`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}
