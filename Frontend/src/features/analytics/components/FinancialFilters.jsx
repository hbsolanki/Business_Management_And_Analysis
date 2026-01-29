import { useState } from "react";
import { FaFilter, FaCalendarAlt, FaTimes, FaSearch } from "react-icons/fa";

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

export default function FinancialFilters({ onApply, onReset, isLoading = false }) {
    const currentDate = new Date();
    const [filters, setFilters] = useState({
        month: "",
        year: "",
        from_date: "",
        to_date: "",
    });
    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleChange = (field, value) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
    };

    const handleApply = () => {
        const cleanFilters = {};
        if (filters.month) cleanFilters.month = filters.month;
        if (filters.year) cleanFilters.year = filters.year;
        if (filters.from_date) cleanFilters.from_date = filters.from_date;
        if (filters.to_date) cleanFilters.to_date = filters.to_date;
        onApply(cleanFilters);
    };

    const handleReset = () => {
        setFilters({ month: "", year: "", from_date: "", to_date: "" });
        onReset();
    };

    // Generate year options (last 5 years + next year)
    const yearOptions = [];
    for (let y = currentDate.getFullYear() + 1; y >= currentDate.getFullYear() - 5; y--) {
        yearOptions.push(y);
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <FaFilter size={16} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Filters</h3>
                </div>
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors"
                >
                    {showAdvanced ? "Simple" : "Advanced"}
                </button>
            </div>

            {/* Filter Controls */}
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Month Select */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                            Month
                        </label>
                        <select
                            value={filters.month}
                            onChange={(e) => handleChange("month", e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                        >
                            <option value="">All Months</option>
                            {MONTHS.map((m) => (
                                <option key={m.value} value={m.value}>
                                    {m.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Year Select */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                            Year
                        </label>
                        <select
                            value={filters.year}
                            onChange={(e) => handleChange("year", e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                        >
                            <option value="">All Years</option>
                            {yearOptions.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Advanced Date Filters */}
                    {showAdvanced && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">
                                    <FaCalendarAlt className="inline mr-1" size={12} />
                                    From Date
                                </label>
                                <input
                                    type="date"
                                    value={filters.from_date}
                                    onChange={(e) => handleChange("from_date", e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">
                                    <FaCalendarAlt className="inline mr-1" size={12} />
                                    To Date
                                </label>
                                <input
                                    type="date"
                                    value={filters.to_date}
                                    onChange={(e) => handleChange("to_date", e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 mt-6">
                    <button
                        onClick={handleApply}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                        <FaSearch size={14} />
                        Apply Filters
                    </button>
                    <button
                        onClick={handleReset}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50"
                    >
                        <FaTimes size={14} />
                        Reset
                    </button>
                </div>
            </div>
        </div>
    );
}
