import { useState, useEffect, useMemo } from "react";
import { BarChart } from "@mui/x-charts/BarChart";
import {
    FaCalendarAlt,
    FaBoxOpen,
    FaChartBar,
    FaSync,
    FaRupeeSign,
    FaShoppingCart,
    FaTrophy,
    FaArrowUp,
    FaArrowDown,
    FaTimes,
    FaSearch,
} from "react-icons/fa";
import api from "@/services/api";

const formatDateTimeInput = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getDefaultDateRange = () => {
    const today = new Date();
    const last30Days = new Date();
    // Inclusive 30-day range ending today
    last30Days.setDate(today.getDate() - 29);
    last30Days.setHours(0, 0, 0, 0);

    return {
        from: formatDateTimeInput(last30Days),
        to: formatDateTimeInput(today),
    };
};

const formatCurrency = (val) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(val) || 0);

const EMPTY_SUMMARY = {
    total_quantity_sold: 0,
    total_revenue: 0,
    total_profit: 0,
    total_cost: 0,
};

export default function ProductPerformanceChart() {
    const defaultRange = getDefaultDateRange();
    const [fromDate, setFromDate] = useState(defaultRange.from);
    const [toDate, setToDate] = useState(defaultRange.to);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [categoryId, setCategoryId] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [report, setReport] = useState({ summary: EMPTY_SUMMARY, products: [] });

    useEffect(() => {
        fetchPerformance();
        // Intentionally refetch only when selected product changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProduct]);

    const fetchPerformance = async () => {
        try {
            setLoading(true);
            setError(null);

            let url = `/analytics/product/performance/report/`;
            const params = [];

            if (selectedProduct) {
                params.push(`product_id=${selectedProduct.id}`);
            }
            if (categoryId.trim()) {
                params.push(`category_id=${encodeURIComponent(categoryId.trim())}`);
            }

            const fromDateTime = fromDate.length === 16 ? `${fromDate}:00` : fromDate;
            const toDateTime = toDate.length === 16 ? `${toDate}:00` : toDate;

            params.push(`from_date_and_time=${fromDateTime}`);
            params.push(`to_date_and_time=${toDateTime}`);

            if (params.length > 0) {
                url += `?${params.join("&")}`;
            }

            const response = await api.get(url);
            const payload = response.data && typeof response.data === "object" ? response.data : {};
            const rawProducts = Array.isArray(payload.products) ? payload.products : [];
            const normalizedProducts = rawProducts.map((item) => ({
                product_id: item.product_id,
                product_name: item.product_name || "Unknown Product",
                category_name: item.category_name || "Uncategorized",
                total_quantity_sold: Number(item.total_quantity_sold) || 0,
                total_revenue: Number(item.total_revenue) || 0,
                total_profit: Number(item.total_profit) || 0,
                total_cost: Number(item.total_cost) || 0,
            }));

            const fallbackSummary = normalizedProducts.reduce(
                (acc, item) => {
                    acc.total_quantity_sold += item.total_quantity_sold;
                    acc.total_revenue += item.total_revenue;
                    acc.total_profit += item.total_profit;
                    acc.total_cost += item.total_cost;
                    return acc;
                },
                { ...EMPTY_SUMMARY }
            );

            const summaryPayload = payload.summary && typeof payload.summary === "object" ? payload.summary : {};
            const normalizedSummary = {
                total_quantity_sold: Number(summaryPayload.total_quantity_sold ?? fallbackSummary.total_quantity_sold) || 0,
                total_revenue: Number(summaryPayload.total_revenue ?? fallbackSummary.total_revenue) || 0,
                total_profit: Number(summaryPayload.total_profit ?? fallbackSummary.total_profit) || 0,
                total_cost: Number(summaryPayload.total_cost ?? fallbackSummary.total_cost) || 0,
            };

            setReport({
                summary: normalizedSummary,
                products: normalizedProducts,
            });
        } catch (err) {
            console.error("Failed to fetch product performance:", err);
            setError("Failed to load data. Please try again.");
            setReport({ summary: EMPTY_SUMMARY, products: [] });
        } finally {
            setLoading(false);
        }
    };

    const handleApplyFilter = () => {
        if (fromDate && toDate) {
            if (new Date(fromDate) > new Date(toDate)) {
                setError("Start date cannot be after end date");
                return;
            }
            fetchPerformance();
        }
    };

    const clearProductFilter = () => {
        setSelectedProduct(null);
    };

    const summary = useMemo(() => {
        const products = report.products || [];
        if (!products.length) {
            return {
                totalRevenue: 0,
                totalCost: 0,
                totalProfit: 0,
                totalQuantity: 0,
                bestProduct: null,
                productCount: 0,
            };
        }

        const totalRevenue = Number(report.summary?.total_revenue) || 0;
        const totalCost = Number(report.summary?.total_cost) || 0;
        const totalProfit = Number(report.summary?.total_profit) || 0;
        const totalQuantity = Number(report.summary?.total_quantity_sold) || 0;
        let bestProduct = null;
        let maxProfit = -Infinity;

        products.forEach((p) => {
            const profit = Number(p.total_profit) || 0;
            if (profit > maxProfit) {
                maxProfit = profit;
                bestProduct = p;
            }
        });

        if (selectedProduct && products.length === 1) {
            bestProduct = products[0];
        }

        return {
            totalRevenue,
            totalCost,
            totalProfit,
            totalQuantity,
            bestProduct,
            productCount: products.length,
        };
    }, [report, selectedProduct]);

    const chartData = useMemo(() => {
        const products = report.products || [];
        if (!products.length) return { labels: [], costs: [], revenues: [], profits: [], quantities: [] };

        return {
            labels: products.map((p) => p.product_name || `Product ${p.product_id || "Unknown"}`),
            costs: products.map((p) => Number(p.total_cost) || 0),
            revenues: products.map((p) => Number(p.total_revenue) || 0),
            profits: products.map((p) => Number(p.total_profit) || 0),
            quantities: products.map((p) => Number(p.total_quantity_sold) || 0),
        };
    }, [report.products]);

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                                <FaChartBar size={18} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Product Performance</h3>
                                <p className="text-sm text-slate-500">Cost vs revenue vs profit analysis</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <FaCalendarAlt className="text-slate-400" size={14} />
                                <span className="text-sm text-slate-500">From:</span>
                                <input
                                    type="datetime-local"
                                    value={fromDate}
                                    max={toDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500">To:</span>
                                <input
                                    type="datetime-local"
                                    value={toDate}
                                    min={fromDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                                />
                            </div>
                            <button
                                onClick={handleApplyFilter}
                                className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
                            >
                                <FaSync size={12} />
                                Apply
                            </button>
                        </div>
                    </div>

                    <div className="w-full max-w-md">
                        <div className="space-y-3">
                            {selectedProduct ? (
                                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50">
                                    <div>
                                        <p className="font-semibold text-slate-900">{selectedProduct.name}</p>
                                        <p className="text-xs text-slate-500">SKU: {selectedProduct.sku}</p>
                                    </div>
                                    <button
                                        onClick={clearProductFilter}
                                        className="p-2 text-slate-500 hover:bg-slate-200 rounded-full transition-colors"
                                        title="Clear filter"
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            ) : (
                                <ProductSearchInput onSelect={setSelectedProduct} />
                            )}

                            <input
                                type="number"
                                min="1"
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                placeholder="Category ID (optional)"
                                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-slate-500 font-medium">Loading performance data...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="p-4 bg-rose-100 rounded-full mb-4">
                            <FaChartBar className="text-rose-500 text-2xl" />
                        </div>
                        <p className="text-slate-700 font-medium mb-2">{error}</p>
                        <button
                            onClick={fetchPerformance}
                            className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : report.products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="p-4 bg-slate-100 rounded-full mb-4">
                            <FaBoxOpen className="text-slate-400 text-3xl" />
                        </div>
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">No Data Available</h4>
                        <p className="text-slate-500 max-w-sm">
                            No product sales found for the selected {selectedProduct ? "product and " : ""}date range.
                            Try adjusting the dates.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <SummaryCard
                                icon={<FaShoppingCart />}
                                label="Total Quantity"
                                value={summary.totalQuantity}
                                tone="brand"
                            />
                            <SummaryCard
                                icon={<FaRupeeSign />}
                                label="Total Revenue"
                                value={formatCurrency(summary.totalRevenue)}
                                tone="emerald"
                                trend="up"
                            />
                            <SummaryCard
                                icon={<FaBoxOpen />}
                                label="Total Cost"
                                value={formatCurrency(summary.totalCost)}
                                tone="rose"
                                trend="down"
                            />
                            <SummaryCard
                                icon={<FaTrophy />}
                                label="Net Profit"
                                value={formatCurrency(summary.totalProfit)}
                                tone={summary.totalProfit >= 0 ? "emerald" : "rose"}
                                trend={summary.totalProfit >= 0 ? "up" : "down"}
                            />
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 mb-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h4 className="text-lg font-semibold text-slate-900">Performance Analytics</h4>
                                    <p className="text-sm text-slate-500">Cost, revenue, and profit overview</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 rounded-full bg-rose-50 text-xs font-medium text-rose-700 border border-rose-100">
                                        Cost
                                    </span>
                                    <span className="px-3 py-1 rounded-full bg-sky-50 text-xs font-medium text-sky-700 border border-sky-100">
                                        Revenue
                                    </span>
                                    <span className="px-3 py-1 rounded-full bg-brand-50 text-xs font-medium text-brand-700 border border-brand-100">
                                        Profit
                                    </span>
                                </div>
                            </div>

                            <div className="w-full h-[400px]">
                                <BarChart
                                    xAxis={[
                                        {
                                            scaleType: "band",
                                            data: chartData.labels,
                                            tickLabelStyle: {
                                                angle: -25,
                                                textAnchor: "end",
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
                                            data: chartData.costs,
                                            label: "Total Cost",
                                            color: "#f43f5e",
                                            valueFormatter: (v) => formatCurrency(v),
                                            highlightScope: { faded: "global", highlighted: "item" },
                                        },
                                        {
                                            data: chartData.revenues,
                                            label: "Total Revenue",
                                            color: "#0ea5e9",
                                            valueFormatter: (v) => formatCurrency(v),
                                            highlightScope: { faded: "global", highlighted: "item" },
                                        },
                                        {
                                            data: chartData.profits,
                                            label: "Net Profit",
                                            color: "#14b8a6",
                                            valueFormatter: (v) => formatCurrency(v),
                                            highlightScope: { faded: "global", highlighted: "item" },
                                        },
                                    ]}
                                    height={400}
                                    grid={{ horizontal: true }}
                                    margin={{ left: 80, right: 30, top: 20, bottom: 60 }}
                                    slotProps={{ legend: { hidden: true } }}
                                    sx={{
                                        ".MuiBarElement-root": { rx: 4 },
                                    }}
                                />
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                                <h4 className="text-sm font-semibold text-slate-700">Product Performance Details</h4>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-white border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Product</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Category</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Qty Sold</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Revenue</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Cost</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Profit</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {[...report.products]
                                            .sort((a, b) => b.total_profit - a.total_profit)
                                            .map((item) => (
                                                <tr key={item.product_id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-medium text-slate-900">{item.product_name}</td>
                                                    <td className="px-4 py-3 text-slate-600">{item.category_name}</td>
                                                    <td className="px-4 py-3 text-slate-700">{item.total_quantity_sold}</td>
                                                    <td className="px-4 py-3 text-slate-700">{formatCurrency(item.total_revenue)}</td>
                                                    <td className="px-4 py-3 text-slate-700">{formatCurrency(item.total_cost)}</td>
                                                    <td className={`px-4 py-3 font-semibold ${item.total_profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                                        {formatCurrency(item.total_profit)}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function SummaryCard({ icon, label, value, tone, trend }) {
    const tones = {
        brand: "border-l-brand-500",
        emerald: "border-l-emerald-500",
        rose: "border-l-rose-500",
    };

    return (
        <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 ${tones[tone] || tones.brand}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="h-9 w-9 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 flex items-center justify-center">
                    {icon}
                </div>
                {trend && (
                    <span className={`text-xs ${trend === "up" ? "text-emerald-600" : "text-rose-600"}`}>
                        {trend === "up" ? <FaArrowUp /> : <FaArrowDown />}
                    </span>
                )}
            </div>
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className="text-lg font-semibold text-slate-900">{value}</p>
        </div>
    );
}

function ProductSearchInput({ onSelect }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim()) {
                fetchProducts(query);
            } else {
                setResults([]);
                setShowResults(false);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [query]);

    const fetchProducts = async (searchQuery) => {
        setLoading(true);
        try {
            const res = await api.get(`/product/?name=${encodeURIComponent(searchQuery)}`);
            const products = res.data.results || res.data || [];
            setResults(Array.isArray(products) ? products : []);
            setShowResults(true);
        } catch (err) {
            console.error("Failed to search products", err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                <FaSearch className="text-slate-400" />
                <input
                    className="w-full outline-none text-sm text-slate-700 placeholder-slate-400"
                    placeholder="Search product by name..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query && setShowResults(true)}
                />
                {loading && <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>}
            </div>

            {showResults && results.length > 0 && (
                <div className="absolute z-10 w-full mt-1 rounded-lg border border-slate-200 bg-white max-h-60 overflow-y-auto shadow-sm">
                    {results.map((product) => (
                        <button
                            key={product.id}
                            onClick={() => {
                                onSelect(product);
                                setShowResults(false);
                                setQuery("");
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                        >
                            <p className="text-sm font-medium text-slate-900">{product.name}</p>
                            <p className="text-xs text-slate-500">SKU: {product.sku}</p>
                        </button>
                    ))}
                </div>
            )}

            {showResults && results.length === 0 && query && !loading && (
                <div className="absolute z-10 w-full mt-1 rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-sm text-slate-500">No products found</p>
                </div>
            )}
        </div>
    );
}
