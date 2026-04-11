import { useEffect, useMemo, useState } from "react";
import { BarChart } from '@mui/x-charts/BarChart';
import {
    FaChartBar,
    FaCalendarAlt,
    FaFilter,
    FaBoxOpen,
    FaMoneyBillWave,
    FaChartLine,
    FaSearch,
    FaTimes,
    FaSync
} from 'react-icons/fa';
import api from '@/services/api';

// --- Helper Components & Functions ---

const formatCurrency = (val) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(Number(val) || 0);

const formatDateForInput = (date) => {
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getPresetDates = (preset) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
        case 'current_month':
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = today;
            break;
        case 'last_month':
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            end = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
        case 'last_3_months':
            start = new Date(today.getFullYear(), today.getMonth() - 3, 1);
            end = today;
            break;
        default:
            start.setDate(today.getDate() - 30);
            start.setHours(0, 0, 0, 0);
            end = today;
            break;
    }

    return {
        from: formatDateForInput(start),
        to: formatDateForInput(end),
    };
};

const FilterTab = ({ label, active, onClick, icon: Icon }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${active
            ? 'bg-slate-900 text-white shadow-md'
            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
    >
        {Icon && <Icon className={active ? 'text-white' : 'text-slate-400'} />}
        {label}
    </button>
);

const SummaryCard = ({ title, value, icon: Icon, colorClass }) => (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 shadow-sm relative overflow-hidden`}>
        <div className={`absolute top-0 right-0 p-4 opacity-10 ${colorClass}`}>
            <Icon size={40} />
        </div>
        <div className="relative z-10">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorClass.replace('text-', 'bg-').replace('600', '100')} ${colorClass}`}>
                <Icon size={20} />
            </div>
            <p className="text-slate-500 text-sm font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
        </div>
    </div>
);

// --- Main Component ---

export default function ModernProductPerformanceChart() {
    const [activePreset, setActivePreset] = useState('current_month');
    const [dateRange, setDateRange] = useState(getPresetDates('current_month'));
    const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'PRODUCT' | 'CATEGORY'
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState({ summary: {}, products: [] });

    // -- Fetch Logic --

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            let url = `/analytics/product/performance/report/`;
            const params = new URLSearchParams();

            // Date Filters (Always Apply)
            const fromStr = dateRange.from.length === 16 ? `${dateRange.from}:00` : dateRange.from;
            const toStr = dateRange.to.length === 16 ? `${dateRange.to}:00` : dateRange.to;
            params.append('from_date_and_time', fromStr);
            params.append('to_date_and_time', toStr);

            // Context Filters (Mutually Exclusive based on Type)
            if (filterType === 'PRODUCT' && selectedProduct) {
                params.append('product_id', selectedProduct.id);
            } else if (filterType === 'CATEGORY' && selectedCategory) {
                params.append('category_id', selectedCategory.id);
            }

            const response = await api.get(`${url}?${params.toString()}`);
            const payload = response.data || {};

            // Normalize Data
            const products = (Array.isArray(payload.products) ? payload.products : []).map(p => ({
                ...p,
                total_revenue: Number(p.total_revenue) || 0,
                total_cost: Number(p.total_cost) || 0,
                total_profit: Number(p.total_profit) || 0,
                total_quantity_sold: Number(p.total_quantity_sold) || 0,
            }));

            // Calculate summary if not provided (or rely on backend summary)
            const summary = payload.summary || products.reduce((acc, p) => ({
                total_revenue: (acc.total_revenue || 0) + p.total_revenue,
                total_cost: (acc.total_cost || 0) + p.total_cost,
                total_profit: (acc.total_profit || 0) + p.total_profit,
                total_quantity_sold: (acc.total_quantity_sold || 0) + p.total_quantity_sold,
            }), {});

            setData({ summary, products });
        } catch (err) {
            console.error("Fetch error:", err);
            setError("Failed to load analytics data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Intentionally run once on mount; subsequent fetches are user-triggered.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Initial load

    const handleApply = () => {
        fetchData();
    };

    // -- Memoized Chart Data --

    const chartSeries = useMemo(() => {
        if (!data.products.length) return { xAxis: [], series: [] };

        // Sort by revenue for better visualization
        const sorted = [...data.products].sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 10); // Top 10

        return {
            xAxis: [{ scaleType: 'band', data: sorted.map(p => p.product_name.substring(0, 15) + (p.product_name.length > 15 ? '...' : '')) }],
            series: [
                { data: sorted.map(p => p.total_revenue), label: 'Revenue', color: '#0ea5e9' },
                { data: sorted.map(p => p.total_profit), label: 'Profit', color: '#10b981' },
                { data: sorted.map(p => p.total_cost), label: 'Cost', color: '#f43f5e' }
            ]
        };
    }, [data.products]);

    // -- Render --

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header & Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <FaChartBar className="text-brand-600" />
                            Product Performance
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Analyze revenue, cost, and profit metrics.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                            <FilterTab label="All" active={filterType === 'ALL'} onClick={() => setFilterType('ALL')} />
                            <FilterTab label="Category" active={filterType === 'CATEGORY'} onClick={() => setFilterType('CATEGORY')} />
                            <FilterTab label="Product" active={filterType === 'PRODUCT'} onClick={() => setFilterType('PRODUCT')} />
                        </div>
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="mt-6 flex flex-col md:flex-row gap-4 items-end border-t border-slate-100 pt-5">

                    {/* Date Inputs & Presets */}
                    <div className="flex flex-col gap-3 w-full md:w-auto">
                        {/* Preset Segmented Control */}
                        <div className="flex bg-slate-100/80 p-1 rounded-xl shadow-sm border border-slate-200/60 max-w-fit">
                            {[
                                { id: 'current_month', label: 'Current Month' },
                                { id: 'last_month', label: 'Previous Month' },
                                { id: 'last_3_months', label: 'Last 3 Months' },
                            ].map(preset => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => {
                                        setActivePreset(preset.id);
                                        setDateRange(getPresetDates(preset.id));
                                    }}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${activePreset === preset.id
                                            ? 'bg-white text-brand-700 shadow-sm border border-slate-200/60'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 border border-transparent'
                                        }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-4 w-full">
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-slate-500 mb-1">From</label>
                                <div className="relative">
                                    <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="datetime-local"
                                        value={dateRange.from}
                                        onChange={e => {
                                            setActivePreset('custom');
                                            setDateRange(prev => ({ ...prev, from: e.target.value }));
                                        }}
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-colors"
                                    />
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-slate-500 mb-1">To</label>
                                <div className="relative">
                                    <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="datetime-local"
                                        value={dateRange.to}
                                        onChange={e => {
                                            setActivePreset('custom');
                                            setDateRange(prev => ({ ...prev, to: e.target.value }));
                                        }}
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Context Inputs */}
                        <div className="flex-1 w-full">
                            {filterType === 'PRODUCT' && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Select Product</label>
                                    <ProductSearchInput onSelect={setSelectedProduct} selected={selectedProduct} onClear={() => setSelectedProduct(null)} />
                                </div>
                            )}
                            {filterType === 'CATEGORY' && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Select Category</label>
                                    <CategorySearchInput onSelect={setSelectedCategory} selected={selectedCategory} onClear={() => setSelectedCategory(null)} />
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleApply}
                            disabled={loading}
                            className="px-6 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 flex items-center gap-2 h-[42px]"
                        >
                            {loading ? <FaSync className="animate-spin" /> : <FaFilter />}
                            Apply Filters
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center text-red-600">
                        {error}
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <SummaryCard
                                title="Total Revenue"
                                value={formatCurrency(data.summary?.total_revenue)}
                                icon={FaMoneyBillWave}
                                colorClass="text-sky-600"
                            />
                            <SummaryCard
                                title="Net Profit"
                                value={formatCurrency(data.summary?.total_profit)}
                                icon={FaChartLine}
                                colorClass="text-emerald-600"
                            />
                            <SummaryCard
                                title="Total Cost"
                                value={formatCurrency(data.summary?.total_cost)}
                                icon={FaBoxOpen}
                                colorClass="text-rose-600"
                            />
                            <SummaryCard
                                title="Quantity Sold"
                                value={data.summary?.total_quantity_sold || 0}
                                icon={FaBoxOpen}
                                colorClass="text-amber-600"
                            />
                        </div>

                        {/* Chart Section */}
                        {data.products.length > 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                                <h3 className="text-lg font-bold text-slate-900 mb-6">Revenue vs Cost vs Profit (Top 10)</h3>
                                <div className="h-[400px] w-full">
                                    <BarChart
                                        xAxis={chartSeries.xAxis}
                                        series={chartSeries.series}
                                        height={400}
                                        slotProps={{ legend: { hidden: false, position: { vertical: 'top', horizontal: 'right' } } }}
                                        margin={{ top: 40, right: 30, bottom: 60, left: 80 }}
                                        sx={{
                                            '.MuiBarElement-root': { rx: 4 }, // Rounded bars
                                        }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                                No data found for the selected range/filters.
                            </div>
                        )}
                    </>
                )}
            </div>
            );
}

            // --- Internal Product Search Component ---

            function ProductSearchInput({onSelect, selected, onClear}) {
    const [query, setQuery] = useState("");
            const [results, setResults] = useState([]);
            const [showResults, setShowResults] = useState(false);
            const [searching, setSearching] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim()) searchProducts(query);
            else setResults([]);
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    const searchProducts = async (q) => {
                setSearching(true);
            try {
            const res = await api.get(`/product/?name=${encodeURIComponent(q)}`);
            setResults(res.data.results || res.data || []);
            setShowResults(true);
        } catch (e) {
                console.error(e);
        } finally {
                setSearching(false);
        }
    };

            if (selected) {
        return (
            <div className="flex items-center justify-between px-3 py-2 bg-brand-50 border border-brand-200 rounded-lg text-brand-900 text-sm">
                <span className="font-medium truncate">{selected.name}</span>
                <button onClick={onClear} className="text-brand-500 hover:text-brand-700">
                    <FaTimes />
                </button>
            </div>
            );
    }

            return (
            <div className="relative">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
                    <FaSearch className="text-slate-400 mr-2" />
                    <input
                        type="text"
                        className="bg-transparent border-none outline-none text-sm w-full placeholder-slate-400"
                        placeholder="Search products..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onFocus={() => query && setShowResults(true)}
                        onBlur={() => setTimeout(() => setShowResults(false), 200)}
                    />
                    {searching && <FaSync className="animate-spin text-brand-500" />}
                </div>

                {showResults && results.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {results.map(product => (
                            <button
                                key={product.id}
                                onClick={() => {
                                    onSelect(product);
                                    setQuery("");
                                    setShowResults(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm border-b border-slate-50 last:border-0"
                            >
                                <div className="font-medium text-slate-900">{product.name}</div>
                                <div className="text-xs text-slate-500">SKU: {product.sku}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            );
}

            // --- Internal Category Search Component ---

            function CategorySearchInput({onSelect, selected, onClear}) {
    const [query, setQuery] = useState("");
            const [results, setResults] = useState([]);
            const [showResults, setShowResults] = useState(false);
            const [searching, setSearching] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim()) searchCategories(query);
            else setResults([]);
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    const searchCategories = async (q) => {
                setSearching(true);
            try {
            const res = await api.get(`/product/category/?name=${encodeURIComponent(q)}`);
            setResults(res.data.results || res.data || []);
            setShowResults(true);
        } catch (e) {
                console.error(e);
        } finally {
                setSearching(false);
        }
    };

            if (selected) {
        return (
            <div className="flex items-center justify-between px-3 py-2 bg-brand-50 border border-brand-200 rounded-lg text-brand-900 text-sm">
                <span className="font-medium truncate">{selected.name}</span>
                <button onClick={onClear} className="text-brand-500 hover:text-brand-700">
                    <FaTimes />
                </button>
            </div>
            );
    }

            return (
            <div className="relative">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
                    <FaSearch className="text-slate-400 mr-2" />
                    <input
                        type="text"
                        className="bg-transparent border-none outline-none text-sm w-full placeholder-slate-400"
                        placeholder="Search categories..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onFocus={() => query && setShowResults(true)}
                        onBlur={() => setTimeout(() => setShowResults(false), 200)}
                    />
                    {searching && <FaSync className="animate-spin text-brand-500" />}
                </div>

                {showResults && results.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {results.map(category => (
                            <button
                                key={category.id}
                                onClick={() => {
                                    onSelect(category);
                                    setQuery("");
                                    setShowResults(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm border-b border-slate-50 last:border-0"
                            >
                                <div className="font-medium text-slate-900">{category.name}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            );
}
