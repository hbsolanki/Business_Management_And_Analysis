import { useCallback, useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { format, isToday, isYesterday } from "date-fns";
import {
    FaBox,
    FaFilter,
    FaHistory,
    FaRegClock,
    FaSearch,
    FaTimes,
    FaTruck,
    FaUser,
    FaGlobe,
    FaBriefcase,
    FaBolt,
    FaArrowRight,
    FaCheckCircle,
    FaInfoCircle,
    FaExclamationCircle,
    FaTag,
    FaLayerGroup
} from "react-icons/fa";
import toast from "react-hot-toast";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import { activityService } from "@/services/activityService";
import useActivityLogs from "@/hooks/useActivityLogs";
import api from "@/services/api";
import { useSelector } from "react-redux";
import { branchService } from "@/features/business/services/branchService";

/**
 * Modern Activity Log UI with Glassmorphism and Vertical Timeline
 * Designed for high density, visual clarity, and smooth experience.
 */

const MODULE_META = {
    USER: { icon: FaUser, label: "User", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
    PRODUCT: { icon: FaBox, label: "Product", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
    DASHBOARD: { icon: FaGlobe, label: "System", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100" },
    INVENTORY: { icon: FaLayerGroup, label: "Inventory", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
    INVOICE: { icon: FaTag, label: "Invoice", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
    BUSINESS: { icon: FaBriefcase, label: "Business", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    SUPPLIER: { icon: FaTruck, label: "Supplier", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
    DEFAULT: { icon: FaBolt, label: "Action", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100" }
};

const ACTION_COLORS = {
    CREATE: "bg-emerald-500 text-white",
    UPDATE: "bg-amber-500 text-white",
    DELETE: "bg-rose-500 text-white",
    LOGIN: "bg-indigo-500 text-white",
    DEFAULT: "bg-slate-500 text-white",
};

const TARGET_ROUTES = {
    PRODUCT: (id) => `/product/${id}/edit`,
    PRODUCTCATEGORY: () => `/product`,
    TASK: (id) => `/tasks/${id}`,
    USER: (id) => `/profile/${id}`,
    BUSINESS: () => `/owner`,
    INVOICE: () => `/invoice`,
    SUPPLIER: (id) => `/supplier/vendor/${id}/edit`,
    VENDOR: (id) => `/supplier/vendor/${id}/edit`,
    PURCHASEORDER: (id) => `/supplier/purchase-order/${id}/edit`,
    PURCHASE_ORDER: (id) => `/supplier/purchase-order/${id}/edit`,
};

const DEFAULT_FILTERS = {
    actor: "",
    module: "",
    action: "",
    branch: "",
};

// --- Helpers ---

const safeText = (value, fallback = "-") => {
    if (value === null || value === undefined || value === "") return fallback;
    return String(value);
};

const getActorName = (actorDetails) => {
    if (!actorDetails) return "System";
    const data = actorDetails.user || actorDetails;
    const first = safeText(data.first_name, "");
    const last = safeText(data.last_name, "");
    const fullName = `${first} ${last}`.trim();
    return fullName || safeText(data.username, "System");
};

const getActorInitial = (actorDetails) => {
    const actorName = getActorName(actorDetails);
    return actorName.charAt(0).toUpperCase() || "S";
};

const formatUserDisplay = (user) => {
    if (!user || typeof user !== "object") return "";
    const data = user.user || user;
    const name = `${safeText(data.first_name, "")} ${safeText(data.last_name, "")}`.trim();
    const fallback = safeText(data.username, "User");
    const roleObj = user.role || data.role;
    // Robust check for roleObj
    const roleStr = (roleObj && typeof roleObj === "object") ? roleObj.role : roleObj;
    const role = safeText(roleStr, "UNKNOWN");
    return name ? `${name} (@${fallback}) • ${role}` : `@${fallback} • ${role}`;
};

const getActorId = (log) => {
    if (log.actor_details?.user?.id) return String(log.actor_details.user.id);
    if (log.actor_details?.id) return String(log.actor_details.id);
    if (log.actor) return String(log.actor);
    return "";
};

const getTargetDisplay = (log) => {
    let base = safeText(log.target_model, "Resource");
    // PascalCase to Spaced Case
    base = base.replace(/([A-Z])/g, ' $1').trim();

    if (log.meta && typeof log.meta === 'object') {
        const data = log.meta;
        const nameField = data.name || data.title || data.username || data.product_name || data.category_name || data.branch_name || data.invoice_number || data.order_number;

        if (nameField && typeof nameField === 'string') {
            return `${base}: ${nameField}`;
        }

        if (data.changes && typeof data.changes === 'object') {
            const changes = data.changes;
            const changeName = changes.name || changes.title || changes.username || changes.product_name || changes.category_name || changes.branch_name;
            if (changeName) {
                const val = Array.isArray(changeName) ? (changeName[1] || changeName[0]) : changeName;
                if (val && typeof val === 'string') {
                    return `${base}: ${val}`;
                }
            }
        }
    }

    return base;
};

const getTargetLink = (log) => {
    if (!log || !log.target_id || !log.target_model) return null;
    const model = String(log.target_model).toUpperCase();
    const generator = TARGET_ROUTES[model];
    return generator ? generator(log.target_id) : null;
};

const matchesFilters = (log, filters) => {
    if (filters.module && safeText(log.module, "").toUpperCase() !== filters.module.toUpperCase()) return false;
    if (filters.action && safeText(log.action, "").toUpperCase() !== filters.action.toUpperCase()) return false;
    if (filters.actor && getActorId(log) !== filters.actor) return false;
    if (filters.branch && String(log.branch || log.branch_id || "") !== String(filters.branch)) return false;
    return true;
};

// --- Component ---

export default function ActivityLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);

    // Search and Actor Selection
    const [actorSearch, setActorSearch] = useState("");
    const [actorResults, setActorResults] = useState([]);
    const [isSearchingActor, setIsSearchingActor] = useState(false);
    const [selectedActor, setSelectedActor] = useState(null);

    // Real-time hook
    const { liveLogs, clearLiveLogs } = useActivityLogs();

    const fetchLogs = useCallback(async (cursor = null, isLoadMore = false) => {
        try {
            if (isLoadMore) setLoadingMore(true);
            else setLoading(true);

            const params = {
                cursor,
                limit: 20,
                module: filters.module || undefined,
                action: filters.action || undefined,
                actor: filters.actor || undefined,
                branch: filters.branch || undefined,
            };

            const res = await activityService.getLogs(params);
            const data = res.data;

            setLogs((prev) => (isLoadMore ? [...prev, ...data.results] : data.results));
            setNextCursor(data.next);
        } catch (error) {
            console.error("Failed to fetch logs", error);
            toast.error("Failed to load activity logs");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Live log handling
    useEffect(() => {
        if (liveLogs.length > 0) {
            const filteredLive = liveLogs.filter(log => matchesFilters(log, filters));
            if (filteredLive.length > 0) {
                setLogs(prev => {
                    const existingIds = new Set(prev.map(l => l.id));
                    const uniqueNew = filteredLive.filter(l => !existingIds.has(l.id));
                    return [...uniqueNew, ...prev];
                });
            }
        }
    }, [liveLogs, filters]);

    const handleApplyFilters = () => {
        setFilters(draftFilters);
        setShowFilters(false);
    };

    const handleClearFilters = () => {
        setDraftFilters(DEFAULT_FILTERS);
        setFilters(DEFAULT_FILTERS);
        setActorSearch("");
        setSelectedActor(null);
        setShowFilters(false);
    };

    const searchActors = useCallback(async (query) => {
        if (!query || query.length < 2) {
            setActorResults([]);
            return;
        }
        try {
            setIsSearchingActor(true);
            const res = await api.get(`/user/search/?q=${query}`);
            setActorResults(res.data || []);
        } catch (error) {
            console.error("Actor search failed", error);
        } finally {
            setIsSearchingActor(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (actorSearch && !selectedActor) {
                searchActors(actorSearch);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [actorSearch, selectedActor, searchActors]);

    const onSelectActor = (user) => {
        setSelectedActor(user);
        setActorSearch(formatUserDisplay(user));
        setDraftFilters(prev => ({ ...prev, actor: String(user.id || user.user?.id) }));
        setActorResults([]);
    };

    const clearActorSelection = () => {
        setSelectedActor(null);
        setActorSearch("");
        setDraftFilters(prev => ({ ...prev, actor: "" }));
    };

    // --- Render Logic ---

    const renderEmpty = () => (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <FaHistory size={32} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No logs found</h3>
            <p className="text-slate-500 mt-2 max-w-sm">
                Try adjusting your filters or wait for new activities to happen in the system.
            </p>
            <button
                onClick={handleClearFilters}
                className="mt-6 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg"
            >
                Clear all filters
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <ProtectedHeader />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            Activity Logs
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                        </h1>
                        <p className="text-slate-500 font-medium">Real-time audit trail of all business operations.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all border shadow-sm ${showFilters ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'}`}
                        >
                            <FaFilter size={14} className={showFilters ? 'text-white' : 'text-slate-400'} />
                            Filters
                            {Object.values(filters).some(v => v !== "") && (
                                <span className="ml-1 px-2 py-0.5 bg-emerald-500 text-white text-[10px] rounded-full">Active</span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="mb-8 glass-panel rounded-3xl p-6 border border-white/60 bg-white/50 shadow-xl animate-fade-in-down">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Actor Search */}
                            <div className="space-y-2 lg:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Actor (User)</label>
                                <div className="relative">
                                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={actorSearch}
                                        onChange={(e) => {
                                            setActorSearch(e.target.value);
                                            if (selectedActor) clearActorSelection();
                                        }}
                                        placeholder="Search by name or username..."
                                        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/80 border border-slate-200 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium"
                                    />
                                    {selectedActor && (
                                        <button onClick={clearActorSelection} className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500">
                                            <FaTimes size={12} />
                                        </button>
                                    )}

                                    {/* Actor Search Results */}
                                    {actorResults.length > 0 && !selectedActor && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-fade-in-up max-h-60 overflow-y-auto">
                                            {actorResults.map(res => (
                                                <button
                                                    key={res.id}
                                                    onClick={() => onSelectActor(res)}
                                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors border-b border-slate-50 last:border-none"
                                                >
                                                    <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                        {getActorInitial(res)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-900 truncate">
                                                            {getActorName(res)}
                                                        </p>
                                                        <p className="text-xs text-slate-500 truncate lowercase">
                                                            @{res.username || res.user?.username}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Module Selector */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Module</label>
                                <select
                                    value={draftFilters.module}
                                    onChange={(e) => setDraftFilters(prev => ({ ...prev, module: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-slate-200 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium"
                                >
                                    <option value="">All Modules</option>
                                    {Object.keys(MODULE_META).map(key => (
                                        <option key={key} value={key}>{MODULE_META[key].label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Action Selector */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Action Type</label>
                                <select
                                    value={draftFilters.action}
                                    onChange={(e) => setDraftFilters(prev => ({ ...prev, action: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-slate-200 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium"
                                >
                                    <option value="">All Actions</option>
                                    <option value="CREATE">Create</option>
                                    <option value="UPDATE">Update</option>
                                    <option value="DELETE">Delete</option>
                                    <option value="VIEW">View</option>
                                    <option value="LOGIN">Login</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                            <button
                                onClick={handleClearFilters}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all"
                            >
                                Clear All
                            </button>
                            <button
                                onClick={handleApplyFilters}
                                className="px-8 py-2.5 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                )}

                {/* Timeline Content */}
                <div className="relative">
                    {/* Vertical Line */}
                    <div className="absolute left-6 md:left-8 top-4 bottom-4 w-1 bg-gradient-to-b from-slate-200 via-slate-200 to-transparent rounded-full hidden sm:block"></div>

                    <div className="space-y-8">
                        {loading && logs.length === 0 ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="flex gap-6 animate-pulse">
                                    <div className="h-12 w-12 rounded-full bg-slate-200 shrink-0"></div>
                                    <div className="flex-1 space-y-3 pt-2">
                                        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                                        <div className="h-20 bg-slate-200 rounded-3xl"></div>
                                    </div>
                                </div>
                            ))
                        ) : logs.length === 0 ? (
                            renderEmpty()
                        ) : (
                            logs.map((log, index) => {
                                const module = MODULE_META[safeText(log.module, "DEFAULT").toUpperCase()] || MODULE_META.DEFAULT;
                                const actionColor = ACTION_COLORS[safeText(log.action, "DEFAULT").toUpperCase()] || ACTION_COLORS.DEFAULT;
                                const targetDisplay = getTargetDisplay(log);
                                const targetLink = getTargetLink(log);
                                const isNew = liveLogs.some(l => l.id === log.id);

                                return (
                                    <div key={log.id} className={`relative flex flex-col sm:flex-row gap-4 md:gap-8 group transition-all duration-500 ${isNew ? 'animate-fade-in-up' : ''}`}>
                                        {/* Actor Avatar (Timeline Marker) */}
                                        <div className="relative z-10 flex flex-col items-center shrink-0">
                                            <div className="h-12 w-12 md:h-16 md:w-16 rounded-full bg-white border-4 border-[#F8FAFC] shadow-lg flex items-center justify-center font-black text-slate-700 md:text-xl relative group-hover:scale-110 transition-transform duration-300 ring-2 ring-slate-100">
                                                {log.actor_details?.profile_picture ? (
                                                    <img
                                                        src={log.actor_details.profile_picture}
                                                        alt="Actor"
                                                        className="h-full w-full rounded-full object-cover"
                                                    />
                                                ) : (
                                                    getActorInitial(log.actor_details)
                                                )}

                                                {/* Pulsing Dot for Recent Logs */}
                                                {isToday(new Date(log.created_at)) && (
                                                    <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white"></div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Log Content Card */}
                                        <div className="flex-1 min-w-0 pt-2">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-xs font-black text-slate-900 tracking-tight">
                                                    {getActorName(log.actor_details)}
                                                </span>
                                                <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                                                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                                                    <FaRegClock size={10} />
                                                    {isToday(new Date(log.created_at))
                                                        ? format(new Date(log.created_at), 'h:mm a')
                                                        : formatSafeDate(log.created_at)
                                                    }
                                                </span>
                                            </div>

                                            <div className={`glass-panel rounded-[2rem] p-6 border transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 ${isNew ? 'bg-emerald-50/50 border-emerald-100 ring-2 ring-emerald-500/20' : 'bg-white/70 border-white shadow-soft'}`}>
                                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                                    <div className="space-y-3 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border ${module.bg} ${module.color} ${module.border} text-[10px] font-black uppercase tracking-widest`}>
                                                                <module.icon size={10} />
                                                                {module.label}
                                                            </div>
                                                            <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${actionColor} shadow-sm`}>
                                                                {safeText(log.action, "Action")}
                                                            </div>
                                                        </div>

                                                        <h3 className="text-base md:text-lg font-bold text-slate-900 leading-snug">
                                                            {log.message}
                                                        </h3>

                                                        {targetDisplay && (
                                                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-slate-50/50 px-3 py-2 rounded-xl w-fit border border-slate-100">
                                                                <FaBolt size={10} className="text-brand-500" />
                                                                {targetLink ? (
                                                                    <Link to={targetLink} className="text-brand-600 hover:underline flex items-center gap-1">
                                                                        {targetDisplay}
                                                                        <FaArrowRight size={8} />
                                                                    </Link>
                                                                ) : (
                                                                    <span>{targetDisplay}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex md:flex-col items-center md:items-end gap-2 shrink-0">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                            Branch #{log.branch || log.branch_id || "Global"}
                                                        </span>
                                                        <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                                                            <FaInfoCircle size={14} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Load More Section */}
                    {nextCursor && (
                        <div className="flex justify-center mt-12 py-8">
                            <button
                                onClick={() => fetchLogs(nextCursor, true)}
                                disabled={loadingMore}
                                className="flex items-center gap-3 px-8 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-sm hover:border-slate-400 hover:shadow-xl transition-all disabled:opacity-50"
                            >
                                {loadingMore ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                        Syncing more logs...
                                    </>
                                ) : (
                                    <>
                                        <FaRegClock className="text-slate-400" />
                                        Load older activity
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Custom Styles for Glassmorphism and Animations */}
            <style dangerouslySetInnerHTML={{ __html: `
                .glass-panel {
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                }
                .shadow-soft {
                    box-shadow: 0 4px 20px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
                }
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fade-in-down {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; }
                .animate-fade-in-down { animation: fade-in-down 0.5s ease-out forwards; }
                .animate-fade-in { animation: opacity 0.5s ease-out forwards; }
            `}} />
        </div>
    );
}
