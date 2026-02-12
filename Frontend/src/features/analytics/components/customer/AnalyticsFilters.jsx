import { useState, useEffect } from "react";
import { FaCalendarAlt, FaFilter, FaRedo, FaSearch } from "react-icons/fa";

const formatDate = (date) => {
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
};

export default function AnalyticsFilters({ currentFilters, onFilterChange }) {
    const [localFilters, setLocalFilters] = useState({
        startDate: "",
        endDate: "",
        searchQuery: "",
        productId: "",
        ...currentFilters
    });

    const [appliedFilters, setAppliedFilters] = useState({
        startDate: "",
        endDate: "",
        searchQuery: "",
        productId: "",
        ...currentFilters
    });

    // Sync with parent prop changes (e.g. URL updates or initial load)
    useEffect(() => {
        if (currentFilters) {
            setLocalFilters((prev) => ({ ...prev, ...currentFilters }));
            setAppliedFilters((prev) => ({ ...prev, ...currentFilters }));
        }
    }, [currentFilters]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setLocalFilters((prev) => ({ ...prev, [name]: value }));
    };

    const handleApply = () => {
        setAppliedFilters(localFilters);
        onFilterChange(localFilters);
    };

    const handleClear = () => {
        const resetFilters = { startDate: "", endDate: "", searchQuery: "", productId: "" };
        setLocalFilters(resetFilters);
        setAppliedFilters(resetFilters);
        onFilterChange(resetFilters);
    };

    const applyQuickRange = (days) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days + 1);
        const newFilters = {
            ...localFilters,
            startDate: formatDate(start),
            endDate: formatDate(end),
        };
        setLocalFilters(newFilters);
        setAppliedFilters(newFilters);
        onFilterChange(newFilters);
    };

    const applyThisMonth = () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date();
        const newFilters = {
            ...localFilters,
            startDate: formatDate(start),
            endDate: formatDate(end),
        };
        setLocalFilters(newFilters);
        setAppliedFilters(newFilters);
        onFilterChange(newFilters);
    };

    const hasActiveFilters =
        appliedFilters.startDate || appliedFilters.endDate || appliedFilters.searchQuery || appliedFilters.productId;

    const activeChips = [];
    if (appliedFilters.startDate || appliedFilters.endDate) {
        activeChips.push({
            label: `Date: ${appliedFilters.startDate || "Start"} → ${appliedFilters.endDate || "Today"}`,
        });
    }
    if (appliedFilters.searchQuery) {
        activeChips.push({ label: `Customer: ${appliedFilters.searchQuery}` });
    }
    if (appliedFilters.productId) {
        activeChips.push({ label: `Product ID: ${appliedFilters.productId}` });
    }

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-slate-100 rounded-lg">
                            <FaFilter className="text-slate-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">Filters</h3>
                            <p className="text-xs text-slate-500">
                                Configure criteria and click "Apply" to update results.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => applyQuickRange(7)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                        >
                            Last 7 days
                        </button>
                        <button
                            type="button"
                            onClick={() => applyQuickRange(30)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                        >
                            Last 30 days
                        </button>
                        <button
                            type="button"
                            onClick={() => applyQuickRange(90)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                        >
                            Last 90 days
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const now = new Date();
                                const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                const end = new Date(now.getFullYear(), now.getMonth(), 0);
                                const newFilters = {
                                    ...localFilters,
                                    startDate: formatDate(start),
                                    endDate: formatDate(end),
                                };
                                setLocalFilters(newFilters);
                                setAppliedFilters(newFilters);
                                onFilterChange(newFilters);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                        >
                            Last Month
                        </button>
                        <button
                            type="button"
                            onClick={applyThisMonth}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                        >
                            This month
                        </button>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-100"
                            >
                                <FaRedo className="text-xs" /> Reset
                            </button>
                        )}
                    </div>
                </div>

                {hasActiveFilters && (
                    <div className="flex flex-wrap gap-2">
                        {activeChips.map((chip, index) => (
                            <span
                                key={`${chip.label}-${index}`}
                                className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-600"
                            >
                                {chip.label}
                            </span>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="group relative">
                        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                            Start Date
                        </label>
                        <div className="relative">
                            <input
                                type="date"
                                name="startDate"
                                value={localFilters.startDate}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && handleApply()}
                                max={today}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm group-hover:border-slate-300"
                            />
                            <FaCalendarAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-brand-500 transition-colors" />
                        </div>
                    </div>

                    <div className="group relative">
                        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                            End Date
                        </label>
                        <div className="relative">
                            <input
                                type="date"
                                name="endDate"
                                value={localFilters.endDate}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && handleApply()}
                                max={today}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm group-hover:border-slate-300"
                            />
                            <FaCalendarAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-brand-500 transition-colors" />
                        </div>
                    </div>

                    <div className="group relative">
                        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                            Customer Search
                        </label>
                        <div className="relative">
                            <input
                                type="search"
                                name="searchQuery"
                                value={localFilters.searchQuery}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && handleApply()}
                                placeholder="Customer ID or mobile"
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm group-hover:border-slate-300"
                            />
                            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-brand-500 transition-colors" />
                        </div>
                    </div>

                    <div className="group relative">
                        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                            Product Filter
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                name="productId"
                                value={localFilters.productId}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && handleApply()}
                                placeholder="Product ID"
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm group-hover:border-slate-300"
                            />
                            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-brand-500 transition-colors" />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={handleApply}
                        className="px-6 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 shadow-sm shadow-brand-500/20 transition-all"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>
        </div>
    );
}
