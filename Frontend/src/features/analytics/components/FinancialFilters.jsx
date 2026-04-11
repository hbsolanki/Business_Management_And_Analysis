import { useEffect } from "react";
import { FaFilter, FaTimes, FaSearch } from "react-icons/fa";

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

export default function FinancialFilters({ filters, onChange, onApply, onReset, isLoading = false }) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const handleChange = (field, value) => {
        onChange((prev) => ({ ...prev, [field]: value }));
    };

    useEffect(() => {
        const yearValue = filters.year ? Number(filters.year) : currentYear;
        if (yearValue === currentYear && Number(filters.month) > currentMonth) {
            onChange((prev) => ({ ...prev, month: "" }));
        }
    }, [filters.year, filters.month, currentYear, currentMonth, onChange]);

    const yearOptions = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
        yearOptions.push(y);
    }

    const maxMonth =
        !filters.year || Number(filters.year) === currentYear ? currentMonth : 12;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                        <FaFilter size={16} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
                        <p className="text-xs text-slate-500">Refine monthly financial summaries.</p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                            Month
                        </label>
                        <select
                            value={filters.month}
                            onChange={(e) => handleChange("month", e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                        >
                            <option value="">All months</option>
                            {MONTHS.map((m) => (
                                <option key={m.value} value={m.value} disabled={m.value > maxMonth}>
                                    {m.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                            Year
                        </label>
                        <select
                            value={filters.year}
                            onChange={(e) => handleChange("year", e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                        >
                            <option value="">All years</option>
                            {yearOptions.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => onApply(filters)}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition disabled:opacity-60"
                    >
                        <FaSearch size={14} />
                        Apply Filters
                    </button>
                    <button
                        onClick={onReset}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200 transition disabled:opacity-60"
                    >
                        <FaTimes size={14} />
                        Reset
                    </button>
                </div>
            </div>
        </div>
    );
}
