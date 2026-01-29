import { useState, useEffect, useMemo } from "react";
import { BarChart } from "@mui/x-charts/BarChart";
import {
    FaCalendarAlt, FaBoxOpen, FaChartBar, FaSync,
    FaDollarSign, FaShoppingCart, FaTrophy, FaArrowUp, FaArrowDown, FaTimes, FaSearch
} from "react-icons/fa";
import api from "@/services/api";

// Format date to YYYY-MM-DDTHH:mm
const formatDateTimeInput = (date) => {
    const d = new Date(date);
    // Adjustment to handle local time zone offset for input value if needed, 
    // but simplified ISO slice is usually enough if we accept UTC-ish or handle offset manually.
    // Better to use manual string construction to keep local time.
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Get default date range (last 7 days, 00:00 to current)
const getDefaultDateRange = () => {
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);
    lastWeek.setHours(0, 0, 0, 0); // Start of day

    return {
        from: formatDateTimeInput(lastWeek),
        to: formatDateTimeInput(today),
    };
};

export default function ProductPerformanceChart() {
    const defaultRange = getDefaultDateRange();
    const [fromDate, setFromDate] = useState(defaultRange.from);
    const [toDate, setToDate] = useState(defaultRange.to);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState([]);

    useEffect(() => {
        fetchPerformance();
    }, [selectedProduct]); // Refetch when product changes

    const fetchPerformance = async () => {
        try {
            setLoading(true);
            setError(null);

            let url = `/analytics/product/performance/`;
            const params = [];

            if (selectedProduct) {
                params.push(`product_id=${selectedProduct.id}`);
            }

            // Always use datetime parameters (YYYY-MM-DDTHH:mm:ss) as requested
            // Ensure seconds are included for the backend (datetime-local gives YYYY-MM-DDTHH:mm)
            const fromDateTime = fromDate.length === 16 ? `${fromDate}:00` : fromDate;
            const toDateTime = toDate.length === 16 ? `${toDate}:00` : toDate;

            params.push(`from_date_and_time=${fromDateTime}`);
            params.push(`to_date_and_time=${toDateTime}`);

            if (params.length > 0) {
                url += `?${params.join("&")}`;
            }

            const response = await api.get(url);

            // Handle different response structures
            if (Array.isArray(response.data)) {
                setData(response.data);
            } else if (response.data && typeof response.data === 'object') {
                // Single product response
                const singleData = {
                    ...response.data,
                    product_id: selectedProduct?.id,
                    product_name: selectedProduct?.name,
                    product_sku: selectedProduct?.sku,
                    total_revenue: response.data.total_revenue,
                    total_cost: response.data.total_cost,
                    total_quantity: response.data.total_quantity_sold
                };
                setData([singleData]);
            } else {
                setData([]);
            }

        } catch (err) {
            console.error("Failed to fetch product performance:", err);
            setError("Failed to load data. Please try again.");
            setData([]);
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

    const formatCurrency = (val) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(Number(val) || 0);

    // Calculate summary statistics
    const summary = useMemo(() => {
        if (!data || data.length === 0) {
            return {
                totalRevenue: 0,
                totalCost: 0,
                totalProfit: 0,
                totalQuantity: 0,
                bestProduct: null,
                productCount: 0,
            };
        }

        let totalRevenue = 0;
        let totalCost = 0;
        let totalQuantity = 0;
        let bestProduct = null;
        let maxProfit = -Infinity;

        data.forEach((p) => {
            const revenue = Number(p.total_revenue) || 0;
            const cost = Number(p.total_cost) || 0;
            const profit = revenue - cost;
            const qty = Number(p.total_quantity || p.total_quantity_sold) || 0;

            totalRevenue += revenue;
            totalCost += cost;
            totalQuantity += qty;

            if (profit > maxProfit) {
                maxProfit = profit;
                bestProduct = p;
            }
        });

        if (selectedProduct && data.length === 1) {
            bestProduct = data[0];
        }

        return {
            totalRevenue,
            totalCost,
            totalProfit: totalRevenue - totalCost,
            totalQuantity,
            bestProduct,
            productCount: data.length,
        };
    }, [data, selectedProduct]);

    // Prepare chart data
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return { labels: [], costs: [], revenues: [], profits: [] };

        return {
            labels: data.map((p) => p.product__name || p.product_name || `Product ${p.product_id || 'Unknown'}`),
            costs: data.map((p) => Number(p.total_cost) || 0),
            revenues: data.map((p) => Number(p.total_revenue) || 0),
            profits: data.map((p) => (Number(p.total_revenue) || 0) - (Number(p.total_cost) || 0)),
            skus: data.map((p) => p.product__sku || p.sku || p.product_sku || ""),
            quantities: data.map((p) => Number(p.total_quantity || p.total_quantity_sold) || 0),
        };
    }, [data]);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white">
                                <FaChartBar size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Product Performance</h3>
                                <p className="text-sm text-gray-500">Cost vs Revenue vs Profit analysis</p>
                            </div>
                        </div>

                        {/* Date Filters */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                <FaCalendarAlt className="text-gray-400" size={14} />
                                <span className="text-sm text-gray-500">From:</span>
                                <input
                                    type="datetime-local"
                                    value={fromDate}
                                    max={toDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">To:</span>
                                <input
                                    type="datetime-local"
                                    value={toDate}
                                    min={fromDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                />
                            </div>
                            <button
                                onClick={handleApplyFilter}
                                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                            >
                                <FaSync size={12} />
                                Apply
                            </button>
                        </div>
                    </div>

                    {/* Product Search Section */}
                    <div className="w-full max-w-md relative">
                        {selectedProduct ? (
                            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                                <div>
                                    <p className="font-semibold text-emerald-900">{selectedProduct.name}</p>
                                    <p className="text-xs text-emerald-700">SKU: {selectedProduct.sku}</p>
                                </div>
                                <button
                                    onClick={clearProductFilter}
                                    className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-full transition-colors"
                                    title="Clear filter"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        ) : (
                            <ProductSearchInput onSelect={setSelectedProduct} />
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 font-medium">Loading performance data...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="p-4 bg-red-100 rounded-full mb-4">
                            <FaChartBar className="text-red-500 text-2xl" />
                        </div>
                        <p className="text-gray-700 font-medium mb-2">{error}</p>
                        <button
                            onClick={fetchPerformance}
                            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="p-4 bg-gray-100 rounded-full mb-4">
                            <FaBoxOpen className="text-gray-400 text-3xl" />
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 mb-2">No Data Available</h4>
                        <p className="text-gray-500 max-w-sm">
                            No product sales found for the selected {selectedProduct ? 'product and ' : ''}date range.
                            Try adjusting the dates.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <SummaryCard
                                icon={<FaShoppingCart />}
                                label="Total Quantity"
                                value={summary.totalQuantity}
                                color="bg-blue-50 text-blue-600"
                            />
                            <SummaryCard
                                icon={<FaDollarSign />}
                                label="Total Revenue"
                                value={formatCurrency(summary.totalRevenue)}
                                color="bg-green-50 text-green-600"
                                trend="up"
                            />
                            <SummaryCard
                                icon={<FaBoxOpen />}
                                label="Total Cost"
                                value={formatCurrency(summary.totalCost)}
                                color="bg-red-50 text-red-600"
                                trend="down"
                            />
                            <SummaryCard
                                icon={<FaTrophy />}
                                label="Net Profit"
                                value={formatCurrency(summary.totalProfit)}
                                color={summary.totalProfit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}
                                trend={summary.totalProfit >= 0 ? "up" : "down"}
                            />
                        </div>

                        {/* Bar Chart */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h4 className="text-lg font-bold text-gray-900">Performance Analytics</h4>
                                    <p className="text-sm text-gray-500">Comprehensive view of cost, revenue, and profit</p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-xs font-medium text-red-700 border border-red-100">
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div> Cost
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-xs font-medium text-emerald-700 border border-emerald-100">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Revenue
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-xs font-medium text-blue-700 border border-blue-100">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div> Profit
                                    </div>
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
                                        }
                                    ]}
                                    series={[
                                        {
                                            data: chartData.costs,
                                            label: "Total Cost",
                                            color: "#ef4444",
                                            valueFormatter: (v) => formatCurrency(v),
                                            highlightScope: { faded: 'global', highlighted: 'item' },
                                        },
                                        {
                                            data: chartData.revenues,
                                            label: "Total Revenue",
                                            color: "#10b981",
                                            valueFormatter: (v) => formatCurrency(v),
                                            highlightScope: { faded: 'global', highlighted: 'item' },
                                        },
                                        {
                                            data: chartData.profits,
                                            label: "Net Profit",
                                            color: "#3b82f6",
                                            valueFormatter: (v) => formatCurrency(v),
                                            highlightScope: { faded: 'global', highlighted: 'item' },
                                        },
                                    ]}
                                    height={400}
                                    grid={{ horizontal: true }}
                                    margin={{ left: 80, right: 30, top: 20, bottom: 60 }}
                                    slotProps={{
                                        legend: { hidden: true }, // Using custom legend above for better styling
                                    }}
                                    sx={{
                                        ".MuiBarElement-root": {
                                            rx: 4, // Border radius
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function SummaryCard({ icon, label, value, color, trend }) {
    return (
        <div className={`rounded-xl p-4 ${color.split(" ")[0]} hover:shadow-md transition-all`}>
            <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${color}`}>
                    {icon}
                </div>
                {trend && (
                    <span className={`text-xs ${trend === "up" ? "text-green-600" : "text-red-600"}`}>
                        {trend === "up" ? <FaArrowUp /> : <FaArrowDown />}
                    </span>
                )}
            </div>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-lg font-bold text-gray-900">{value}</p>
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
            // Using 'name' parameter as requested
            const res = await api.get(`/product/?name=${encodeURIComponent(searchQuery)}`);
            const products = res.data.results || res.data || []; // Handle pagination or list
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
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
                <FaSearch className="text-gray-400" />
                <input
                    className="w-full outline-none text-sm text-gray-700 placeholder-gray-400"
                    placeholder="Search product by name..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query && setShowResults(true)}
                />
                {loading && <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>}
            </div>

            {showResults && results.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {results.map((product) => (
                        <button
                            key={product.id}
                            onClick={() => {
                                onSelect(product);
                                setShowResults(false);
                                setQuery("");
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors"
                        >
                            <p className="text-sm font-medium text-gray-900">{product.name}</p>
                            <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                        </button>
                    ))}
                </div>
            )}

            {showResults && results.length === 0 && query && !loading && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-lg p-4 text-center">
                    <p className="text-sm text-gray-500">No products found</p>
                </div>
            )}
        </div>
    );
}
