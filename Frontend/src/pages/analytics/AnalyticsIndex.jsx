import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaArrowRight,
    FaChartLine,
    FaChartPie,
    FaFilter,
    FaSearch,
    FaUsers,
    FaBoxes,
    FaCalendarAlt,
    FaTags,
    FaChartBar,
    FaFileExport,
    FaFileInvoiceDollar,
} from "react-icons/fa";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import { ANALYTICS_ENDPOINTS, FILTER_GROUPS } from "./analyticsRegistry";
import { tokenService } from "@/services/tokenService";

// Category icons mapping
const CATEGORY_ICONS = {
    Product: FaBoxes,
    Monthly: FaCalendarAlt,
    Customer: FaUsers,
    Taxation: FaFileInvoiceDollar,
};

// Category colors mapping - Monochrome professional scheme
const CATEGORY_COLORS = {
    Monthly: {
        bg: "bg-slate-50",
        border: "border-slate-300",
        text: "text-slate-700",
        badge: "bg-slate-100",
        gradient: "from-slate-700 to-slate-900",
    },
    Product: {
        bg: "bg-slate-50",
        border: "border-slate-300",
        text: "text-slate-700",
        badge: "bg-slate-100",
        gradient: "from-slate-800 to-slate-900",
    },
    Customer: {
        bg: "bg-slate-50",
        border: "border-slate-300",
        text: "text-slate-700",
        badge: "bg-slate-100",
        gradient: "from-slate-700 to-slate-800",
    },
    Taxation: {
        bg: "bg-slate-50",
        border: "border-slate-300",
        text: "text-slate-700",
        badge: "bg-slate-100",
        gradient: "from-slate-900 to-black",
    },
};

export default function AnalyticsIndex() {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [group, setGroup] = useState("All");

    const role = tokenService.getRole();
    const normalizedRole = role ? role.toUpperCase() : "";
    const isAuthorizedForReport = normalizedRole === "OWNER" || normalizedRole === "MANAGER";

    const filteredLinks = useMemo(() => {
        const normalized = query.trim().toLowerCase();

        return ANALYTICS_ENDPOINTS.filter((item) => {
            const groupMatch = group === "All" || item.group === group;
            if (!groupMatch) return false;
            if (!normalized) return true;

            return (
                item.title.toLowerCase().includes(normalized) ||
                item.description.toLowerCase().includes(normalized) ||
                item.tags.some((tag) => tag.toLowerCase().includes(normalized))
            );
        });
    }, [query, group]);

    // Group reports by category
    const groupedReports = useMemo(() => {
        const grouped = {};
        filteredLinks.forEach((report) => {
            if (!grouped[report.group]) {
                grouped[report.group] = [];
            }
            grouped[report.group].push(report);
        });
        return grouped;
    }, [filteredLinks]);

    const totalReports = ANALYTICS_ENDPOINTS.length;
    const categoryCount = FILTER_GROUPS.length - 1;

    return (
        <div className="min-h-screen bg-slate-50">
            <ProtectedHeader />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Professional Hero Section */}
                <section className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-xl p-8 sm:p-12">
                    {/* Subtle pattern overlay */}
                    <div className="absolute inset-0 opacity-[0.03]">
                        <div className="absolute inset-0" style={{
                            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                            backgroundSize: '32px 32px'
                        }}></div>
                    </div>

                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                        {/* Left: Title & Description */}
                        <div className="max-w-2xl space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 mb-2">
                                <FaChartBar className="text-slate-400 text-sm" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enterprise Intelligence</span>
                            </div>

                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
                                Analytics Dashboard
                            </h1>
                            <p className="text-base sm:text-lg text-slate-400 font-medium leading-relaxed">
                                Access secure, verified business insights across infrastructure, products, and customers. High-fidelity data for critical decision making.
                            </p>

                            {isAuthorizedForReport && (
                                <div className="pt-4">
                                    <button
                                        onClick={() => navigate('/analytics/report')}
                                        className="inline-flex items-center gap-3 px-8 py-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl shadow-lg transition-all active:scale-95"
                                    >
                                        <FaFileExport className="text-lg" />
                                        Generate Custom Report
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Right: Quick Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <StatCard
                                icon={FaChartPie}
                                label="Active Reports"
                                value={totalReports}
                            />
                            <StatCard
                                icon={FaTags}
                                label="Data Domains"
                                value={categoryCount}
                            />
                        </div>
                    </div>
                </section>

                {/* Search & Filter Section */}
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="p-6 space-y-5">
                        {/* Search Bar */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                                <FaSearch className="text-slate-600" />
                                Search Reports
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <FaSearch className="text-slate-400" />
                                </div>
                                <input
                                    type="search"
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Search by name, description, or keywords..."
                                    className="w-full pl-11 pr-12 py-3.5 rounded-lg border-2 border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white outline-none transition-all"
                                />
                                {query && (
                                    <button
                                        onClick={() => setQuery("")}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                        aria-label="Clear search"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Category Filters */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                                <FaFilter className="text-slate-600" />
                                Filter by Category
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {FILTER_GROUPS.map((item) => {
                                    const Icon = CATEGORY_ICONS[item] || FaChartLine;
                                    const isActive = group === item;
                                    const colors = CATEGORY_COLORS[item];

                                    return (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => setGroup(item)}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${isActive
                                                ? colors
                                                    ? `bg-slate-900 text-white border-slate-900 shadow-md`
                                                    : "bg-slate-900 text-white border-slate-900 shadow-md"
                                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-900"
                                                }`}
                                        >
                                            <Icon className={isActive ? "text-white" : "text-slate-400"} />
                                            {item}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Results Summary */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                            <p className="text-sm text-slate-600">
                                <span className="font-bold text-slate-900">{filteredLinks.length}</span> {filteredLinks.length === 1 ? 'report' : 'reports'}
                            </p>
                            {(query || group !== "All") && (
                                <button
                                    onClick={() => {
                                        setQuery("");
                                        setGroup("All");
                                    }}
                                    className="text-sm text-slate-700 hover:text-slate-900 font-semibold transition-colors"
                                >
                                    Reset filters
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* Reports Grid */}
                {filteredLinks.length === 0 ? (
                    <section className="bg-white rounded-xl border border-slate-200 p-16 text-center">
                        <div className="max-w-md mx-auto">
                            <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-5">
                                <FaSearch className="text-slate-400 text-3xl" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">No reports found</h3>
                            <p className="text-slate-600 mb-6 leading-relaxed">
                                We couldn&apos;t find any reports matching your criteria. Try adjusting your search or filters.
                            </p>
                            <button
                                onClick={() => {
                                    setQuery("");
                                    setGroup("All");
                                }}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                            >
                                Clear all filters
                            </button>
                        </div>
                    </section>
                ) : group === "All" ? (
                    // Grouped by Category
                    <div className="space-y-8">
                        {Object.entries(groupedReports).map(([category, reports]) => {
                            const Icon = CATEGORY_ICONS[category] || FaChartLine;
                            const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.Product;

                            return (
                                <section key={category} className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${colors.gradient} shadow-lg flex items-center justify-center`}>
                                            <Icon className="text-white text-xl" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900">{category} Analytics</h2>
                                            <p className="text-sm text-slate-500">{reports.length} {reports.length === 1 ? 'report' : 'reports'} available</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {reports.map((report) => (
                                            <ReportCard key={report.id} report={report} navigate={navigate} />
                                        ))}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                ) : (
                    // Single Category View
                    <section>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredLinks.map((report) => (
                                <ReportCard key={report.id} report={report} navigate={navigate} />
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}

// Professional Stat Card Component
function StatCard({ icon: Icon, label, value }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 min-w-[140px] text-center space-y-3">
            <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto shadow-inner">
                <Icon className="text-white text-xl" />
            </div>
            <div>
                <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{label}</p>
            </div>
        </div>
    );
}

// Professional Report Card Component
function ReportCard({ report, navigate }) {
    const colors = CATEGORY_COLORS[report.group] || CATEGORY_COLORS.Product;
    const Icon = CATEGORY_ICONS[report.group] || FaChartLine;

    return (
        <button
            onClick={() => navigate(`/analytics/view/${report.id}`)}
            className="group text-left bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${colors.badge} ${colors.text}`}>
                    <Icon className="text-sm" />
                    {report.group}
                </div>
                <div className="h-9 w-9 rounded-lg bg-slate-100 group-hover:bg-slate-900 text-slate-600 group-hover:text-white flex items-center justify-center transition-all duration-200">
                    <FaArrowRight size={14} />
                </div>
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug">
                {report.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-slate-600 mb-5 line-clamp-2 leading-relaxed">
                {report.description}
            </p>

            {/* Footer Metadata */}
            <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <FaFilter className="text-slate-400" />
                    <span className="font-medium">
                        {report.filters.length > 0
                            ? `${report.filters.length} ${report.filters.length > 1 ? 'filters' : 'filter'}`
                            : 'No filters'}
                    </span>
                </div>
            </div>
        </button>
    );
}
