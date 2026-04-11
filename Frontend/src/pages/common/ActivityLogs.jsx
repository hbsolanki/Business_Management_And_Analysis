import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format, isToday, isYesterday } from "date-fns";
import { FaBox, FaFilter, FaHistory, FaRegClock, FaSearch, FaTachometerAlt, FaTimes, FaTruck, FaUser } from "react-icons/fa";
import toast from "react-hot-toast";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import { activityService } from "@/services/activityService";
import useActivityLogs from "@/hooks/useActivityLogs";
import api from "@/services/api";
import { useSelector } from "react-redux";
import { branchService } from "@/features/business/services/branchService";

const MODULE_META = {
    USER: { icon: FaUser, label: "User" },
    PRODUCT: { icon: FaBox, label: "Product" },
    DASHBOARD: { icon: FaTachometerAlt, label: "Dashboard" },
    INVENTORY: { icon: FaBox, label: "Inventory" },
    INVOICE: { icon: FaBox, label: "Invoice" },
    BUSINESS: { icon: FaBox, label: "Business" },
    SUPPLIER: { icon: FaTruck, label: "Supplier" },
};

const ACTION_META = {
    CREATE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    UPDATE: "bg-slate-100 text-slate-700 border-slate-200",
    DELETE: "bg-rose-50 text-rose-700 border-rose-200",
    VIEW: "bg-blue-50 text-blue-700 border-blue-200",
    LOGIN: "bg-violet-50 text-violet-700 border-violet-200",
};

const TARGET_ROUTES = {
    PRODUCT: (id) => `/product/${id}/edit`,
    CATEGORY: () => `/product`, // Categories are in a modal on the product page
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

const formatSafeDate = (value) => {
    try {
        return format(new Date(value), "MMM d, yyyy • h:mm a");
    } catch {
        return String(value || "-");
    }
};

const safeText = (value, fallback = "-") => {
    if (value === null || value === undefined || value === "") return fallback;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
};

const getActorName = (actorDetails) => {
    if (!actorDetails) return "System";
    if (typeof actorDetails !== "object") return safeText(actorDetails, "System");
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

const getUserInitials = (user) => {
    if (!user || typeof user !== "object") return "U";
    const data = user.user || user;
    const first = safeText(data.first_name, "").charAt(0);
    const last = safeText(data.last_name, "").charAt(0);
    const initials = `${first}${last}`.trim();
    return (initials || safeText(data.username, "U").charAt(0)).toUpperCase();
};

const formatUserDisplay = (user) => {
    if (!user || typeof user !== "object") return "";
    const data = user.user || user;
    const name = `${safeText(data.first_name, "")} ${safeText(data.last_name, "")}`.trim();
    const fallback = safeText(data.username, "User");
    const roleObj = user.role || data.role;
    const roleStr = typeof roleObj === "object" ? roleObj.role : roleObj;
    const role = safeText(roleStr, "UNKNOWN");
    return name ? `${name} (@${fallback}) • ${role}` : `@${fallback} • ${role}`;
};

const getActorId = (log) => {
    if (!log || typeof log !== "object") return "";
    const id = log.actor_details?.id ?? log.actor_id ?? log.actor;
    return id === undefined || id === null ? "" : String(id);
};

const getLogKey = (log) => {
    if (!log || typeof log !== "object") return "";
    if (log.id !== undefined && log.id !== null) return `id:${log.id}`;
    return `fallback:${safeText(log.created_at, "")}:${safeText(log.action, "")}:${safeText(log.message, "")}`;
};

const formatTargetDisplay = (log) => {
    let base = safeText(log.target_model, "");
    if (base) {
        base = base.replace(/([A-Z])/g, ' $1').trim();
    } else {
        base = "Target";
    }

    if (log.meta && typeof log.meta === 'object') {
        const data = log.meta;

        // Strategy 1: Look for direct name fields in metadata
        // For Product Category creation, it usually has `name`
        const nameField = data.name || data.title || data.username || data.product_name || data.category_name || data.branch_name || data.invoice_number || data.order_number;

        if (nameField && typeof nameField === 'string') {
            return `${base}: ${nameField}`;
        }

        // Strategy 2: Look for changes object common in update logs
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

    // Strategy 3: Heuristic on message
    // If we couldn't find a specialized name in meta, but it's a ProductCategory,
    // let's try to extract it from the log message (e.g., "Created Category: Electronics")
    if (log.target_model === "ProductCategory" && log.message) {
        const msg = String(log.message);
        if (msg.includes("Category:")) {
            const parts = msg.split("Category:");
            if (parts.length > 1 && parts[1].trim()) {
                return `${base}: ${parts[1].trim()}`;
            }
        }
    }

    // Show ID for everything, including ProductCategory
    if (log.target_id) {
        return `${base} #${log.target_id}`;
    }

    return base;
};

const sanitizeActorInput = (value) => String(value || "").replace(/\D/g, "");

const matchesFilters = (log, filters) => {
    if (!log || typeof log !== "object") return false;
    if (filters.module && safeText(log.module, "") !== filters.module) return false;
    if (filters.action && safeText(log.action, "") !== filters.action) return false;
    if (filters.actor && getActorId(log) !== filters.actor) return false;
    if (filters.branch && String(log.branch || log.branch_id || "") !== String(filters.branch)) return false;
    return true;
};

const getTargetLink = (log) => {
    if (!log || !log.target_id || !log.target_model) return null;
    const model = String(log.target_model).toUpperCase();
    const generator = TARGET_ROUTES[model];
    return generator ? generator(log.target_id) : null;
};

export default function ActivityLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [actorSearch, setActorSearch] = useState("");
    const [actorResults, setActorResults] = useState([]);
    const [actorLoading, setActorLoading] = useState(false);
    const [selectedActor, setSelectedActor] = useState(null);

    const { profile } = useSelector((state) => state.user);
    const [branches, setBranches] = useState([]);
    const [fetchingBranches, setFetchingBranches] = useState(false);
    const roleStr = typeof profile?.role === 'object' ? profile.role.role : profile?.role;
    const isOwner = roleStr === "OWNER";

    // Initialize/Fetch Branches
    useEffect(() => {
        if (isOwner) {
            fetchBranches();
        } else {
            // For managers/employees, enforce their assigned branch
            const branchId = typeof profile?.branch === 'object' ? profile.branch.id : profile?.branch;
            setFilters(prev => ({ ...prev, branch: String(branchId || "") }));
            setDraftFilters(prev => ({ ...prev, branch: String(branchId || "") }));
        }
    }, [profile]);

    const fetchBranches = async () => {
        try {
            setFetchingBranches(true);
            const res = await branchService.list();
            const branchList = res.data?.results || res.data || [];
            setBranches(branchList);
        } catch (err) {
            console.error("Failed to fetch branches", err);
        } finally {
            setFetchingBranches(false);
        }
    };

    const onNewLog = useCallback((newLog) => {
        if (!newLog) return;
        setLogs((prev) => {
            const current = Array.isArray(prev) ? prev : [];
            if (!matchesFilters(newLog, filters)) return current;
            const incomingKey = getLogKey(newLog);
            if (incomingKey && current.some((item) => getLogKey(item) === incomingKey)) {
                return current;
            }
            return [newLog, ...current];
        });
    }, [filters]);

    const { isConnected } = useActivityLogs(onNewLog);

    const fetchLogs = useCallback(
        async (cursor = null, replace = false) => {
            try {
                if (cursor) setLoadingMore(true);
                else setLoading(true);

                const res = await activityService.getActivityLogs(cursor, filters);
                const rows = Array.isArray(res.data?.results) ? res.data.results : [];

                setLogs((prev) => (replace ? rows : [...prev, ...rows]));
                setNextCursor(res.data?.next || null);
            } catch (error) {
                console.error("Failed to fetch activity logs", error);
                toast.error("Failed to load activity logs");
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [filters],
    );

    useEffect(() => {
        fetchLogs(null, true);
    }, [fetchLogs]);

    useEffect(() => {
        const trimmed = actorSearch.trim();
        if (!showFilters || !trimmed || selectedActor) {
            setActorResults([]);
            setActorLoading(false);
            return;
        }

        const timer = setTimeout(async () => {
            setActorLoading(true);
            try {
                const response = await api.get("/user/", {
                    params: { search: trimmed },
                });
                const users = Array.isArray(response.data?.results)
                    ? response.data.results
                    : Array.isArray(response.data)
                        ? response.data
                        : [];
                setActorResults(users.filter(Boolean));
            } catch (error) {
                console.error("Failed to search users", error);
                setActorResults([]);
            } finally {
                setActorLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [actorSearch, selectedActor, showFilters]);

    const onFilterChange = (event) => {
        const { name, value } = event.target;
        setDraftFilters((prev) => ({ ...prev, [name]: value }));
    };

    const applyFilters = () => {
        setFilters({
            actor: sanitizeActorInput(draftFilters.actor),
            module: safeText(draftFilters.module, "").trim(),
            action: safeText(draftFilters.action, "").trim(),
            branch: safeText(draftFilters.branch, "").trim(),
        });
    };

    const resetFilters = () => {
        const initialBranch = !isOwner
            ? String((typeof profile?.branch === 'object' ? profile.branch.id : profile?.branch) || "")
            : "";

        setDraftFilters({ ...DEFAULT_FILTERS, branch: initialBranch });
        setFilters({ ...DEFAULT_FILTERS, branch: initialBranch });
        setSelectedActor(null);
        setActorSearch("");
        setActorResults([]);
    };

    const appliedFilterCount = Object.values(filters).filter(Boolean).length;

    const onSelectActor = (user) => {
        const data = user?.user || user;
        const actorId = data?.id ? String(data.id) : "";
        setSelectedActor(user || null);
        setDraftFilters((prev) => ({ ...prev, actor: actorId }));
        setActorSearch(formatUserDisplay(user));
        setActorResults([]);
    };

    const clearSelectedActor = () => {
        setSelectedActor(null);
        setDraftFilters((prev) => ({ ...prev, actor: "" }));
        setActorSearch("");
        setActorResults([]);
    };

    return (
        <div className="min-h-screen bg-white">
            <ProtectedHeader />

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <section className="mb-8 glass-panel rounded-3xl p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 mb-3">
                                <span className="flex h-2 w-2 relative">
                                    <span className={`animate-ping absolute inline-flex h-2 w-2 rounded-full opacity-75 ${isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                </span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isConnected ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {isConnected ? "Live Updates Active" : "Updates Disconnected"}
                                </span>
                            </div>
                            <h1 className="text-3xl font-bold font-display text-slate-900 tracking-tight">Activity Logs</h1>
                            <p className="text-sm font-medium text-slate-500 mt-2">
                                Real-time system audit and event history monitoring.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowFilters((prev) => !prev)}
                            className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl border transition-all ${showFilters ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-500/20' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:shadow-sm hover:bg-slate-50'}`}
                        >
                            <FaFilter size={14} className={showFilters ? 'text-white' : 'text-brand-500'} />
                            {showFilters ? 'Hide Filters' : 'Filter Logs'}
                        </button>
                    </div>

                    {showFilters && (
                        <form
                            className="mt-6 border-t border-slate-200/60 pt-6 animate-fade-in-down"
                            onSubmit={(event) => {
                                event.preventDefault();
                                applyFilters();
                            }}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div className="relative md:col-span-2">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <FaSearch className="text-slate-400 text-sm" />
                                    </div>
                                    <input
                                        type="text"
                                        value={actorSearch}
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            setActorSearch(value);
                                            if (selectedActor) {
                                                setSelectedActor(null);
                                                setDraftFilters((prev) => ({ ...prev, actor: "" }));
                                            }
                                        }}
                                        placeholder="Search actor by username, name..."
                                        className="w-full rounded-xl border border-slate-200 bg-white/50 focus:bg-white pl-10 pr-10 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                    />
                                    {selectedActor ? (
                                        <button
                                            type="button"
                                            onClick={clearSelectedActor}
                                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-rose-500 transition-colors"
                                            aria-label="Clear selected actor"
                                        >
                                            <FaTimes size={14} />
                                        </button>
                                    ) : null}

                                    {actorLoading && (
                                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                                            <div className="h-4 w-4 rounded-full border-2 border-slate-200 border-t-brand-600 animate-spin" />
                                        </div>
                                    )}

                                    {showFilters && !selectedActor && actorSearch.trim() && (
                                        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 max-h-64 overflow-y-auto outline-none ring-1 ring-black/5 overflow-hidden">
                                            {actorResults.length > 0 ? (
                                                <div className="p-1">
                                                    {actorResults.map((user) => (
                                                        <button
                                                            type="button"
                                                            key={user.id}
                                                            onClick={() => onSelectActor(user)}
                                                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                                        >
                                                            {user.profile_picture ? (
                                                                <img
                                                                    src={user.profile_picture}
                                                                    alt={safeText(user.username, "User")}
                                                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center text-[10px] font-bold text-brand-600 shrink-0">
                                                                    {getUserInitials(user)}
                                                                </div>
                                                            )}
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-slate-900 truncate">
                                                                    {safeText(user.first_name, "")} {safeText(user.last_name, "")}
                                                                </p>
                                                                <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5 tracking-wide">
                                                                    @{safeText(user.username, "-")} • {safeText(user.role, "-")}
                                                                </p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : !actorLoading ? (
                                                <div className="px-4 py-6 text-center text-sm font-medium text-slate-500 bg-slate-50/50">No users match your search.</div>
                                            ) : null}
                                        </div>
                                    )}
                                </div>

                                <div className="relative">
                                    <select
                                        name="module"
                                        value={draftFilters.module}
                                        onChange={onFilterChange}
                                        className="w-full rounded-xl border border-slate-200 bg-white/50 focus:bg-white pl-4 pr-10 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">All Modules</option>
                                        <option value="USER">User</option>
                                        <option value="PRODUCT">Product</option>
                                        <option value="INVENTORY">Inventory</option>
                                        <option value="INVOICE">Invoice</option>
                                        <option value="BUSINESS">Business</option>
                                        <option value="SUPPLIER">Supplier</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>

                                <div className="relative">
                                    <select
                                        name="action"
                                        value={draftFilters.action}
                                        onChange={onFilterChange}
                                        className="w-full rounded-xl border border-slate-200 bg-white/50 focus:bg-white pl-4 pr-10 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">All Actions</option>
                                        <option value="CREATE">Create</option>
                                        <option value="UPDATE">Update</option>
                                        <option value="DELETE">Delete</option>
                                        <option value="VIEW">View</option>
                                        <option value="LOGIN">Login</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>

                                {/* Branch Filter for Owners */}
                                {isOwner && (
                                    <div className="relative">
                                        <select
                                            name="branch"
                                            value={draftFilters.branch}
                                            onChange={onFilterChange}
                                            className="w-full rounded-xl border border-slate-200 bg-white/50 focus:bg-white pl-4 pr-10 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all appearance-none cursor-pointer disabled:opacity-50"
                                            disabled={fetchingBranches}
                                        >
                                            <option value="">All Branches</option>
                                            {branches.map((b) => (
                                                <option key={b.id} value={b.id}>
                                                    {b.branch_name || b.name}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 md:col-span-1">
                                    <button
                                        type="submit"
                                        className="flex-1 rounded-xl bg-slate-900 border border-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800 focus:ring-2 focus:ring-slate-900/20 focus:outline-none transition-all"
                                    >
                                        Apply Filters
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="flex-none rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 focus:ring-2 focus:ring-slate-200 focus:outline-none transition-all"
                                        title="Reset filters"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>

                            {appliedFilterCount > 0 && (
                                <div className="mt-5 flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Active:</span>
                                    {filters.actor && (
                                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                                            <FaUser size={10} className="text-brand-500" />
                                            {selectedActor && String(selectedActor.id) === filters.actor ? formatUserDisplay(selectedActor) : `User #${filters.actor}`}
                                        </span>
                                    )}
                                    {filters.module && (
                                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                                            <FaBox size={10} className="text-brand-500" />
                                            {MODULE_META[filters.module]?.label || filters.module}
                                        </span>
                                    )}
                                    {filters.action && (
                                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                                            <span className={`w-1.5 h-1.5 rounded-full ${ACTION_META[filters.action]?.split(' ')[0] || 'bg-brand-500'}`}></span>
                                            {filters.action}
                                        </span>
                                    )}
                                    {filters.branch && isOwner && (
                                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                                            <svg className="w-3 h-3 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                            {branches.find(b => String(b.id) === filters.branch)?.branch_name || filters.branch}
                                        </span>
                                    )}
                                </div>
                            )}
                        </form>
                    )}
                </section>

                {loading && logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-9 h-9 rounded-full border-2 border-slate-200 border-t-slate-700 animate-spin" />
                        <p className="text-sm text-slate-500 mt-3">Loading logs...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="border border-dashed border-slate-200 rounded-xl bg-white py-16 text-center">
                        <FaHistory className="mx-auto text-slate-300" size={22} />
                        <p className="text-sm font-semibold text-slate-700 mt-3">No activity logs found</p>
                        <p className="text-xs text-slate-500 mt-1">Try changing filters.</p>
                    </div>
                ) : (
                    <div className="space-y-8 relative">
                        {/* Vertical Timeline Line */}
                        <div className="absolute left-[39px] top-4 bottom-4 w-px bg-slate-200 hidden sm:block"></div>

                        {Object.entries(
                            logs.reduce((acc, log) => {
                                try {
                                    const d = new Date(log.created_at);
                                    let dateKey = format(d, 'MMM d, yyyy');
                                    if (isToday(d)) dateKey = 'Today';
                                    else if (isYesterday(d)) dateKey = 'Yesterday';

                                    if (!acc[dateKey]) acc[dateKey] = [];
                                    acc[dateKey].push(log);
                                } catch {
                                    const fallback = 'Unknown Date';
                                    if (!acc[fallback]) acc[fallback] = [];
                                    acc[fallback].push(log);
                                }
                                return acc;
                            }, {})
                        ).map(([dateLabel, dayLogs]) => (
                            <div key={dateLabel} className="space-y-4">
                                <div className="sticky top-20 z-10 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 backdrop-blur-sm px-4 py-1.5 shadow-sm ml-0 sm:ml-4">
                                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">{dateLabel}</h3>
                                </div>

                                <div className="space-y-3">
                                    {dayLogs.map((log) => {
                                        const moduleMeta = MODULE_META[log.module] || { icon: FaHistory, label: safeText(log.module, "Module") };
                                        const ModuleIcon = moduleMeta.icon;
                                        const actionClass = ACTION_META[log.action] || "bg-slate-100 text-slate-700 border-slate-200";
                                        const actorName = getActorName(log.actor_details);
                                        const actorRole = safeText(log.actor_details?.role, "SYSTEM");

                                        return (
                                            <div key={getLogKey(log)} className="relative flex items-start group">
                                                {/* Timeline Node */}
                                                <div className="absolute left-[35px] top-5 w-2.5 h-2.5 rounded-full bg-slate-300 ring-4 ring-slate-50 group-hover:bg-brand-500 transition-colors hidden sm:block"></div>

                                                <article
                                                    className="w-full sm:ml-16 glass-panel rounded-2xl p-4 sm:p-5 transition-shadow hover:shadow-md"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-10 h-10 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                                                                {log.actor_details?.profile_picture ? (
                                                                    <img
                                                                        src={log.actor_details.profile_picture}
                                                                        alt="Actor"
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <span className="text-sm font-bold text-brand-600 bg-brand-50 w-full h-full flex items-center justify-center">
                                                                        {getActorInitial(log.actor_details)}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-slate-900 truncate">{actorName}</p>
                                                                <p className="text-xs font-semibold text-brand-600 tracking-wide">{actorRole}</p>
                                                            </div>
                                                        </div>

                                                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 shrink-0">
                                                            <FaRegClock size={12} className="text-slate-400" />
                                                            {format(new Date(log.created_at), 'h:mm a')}
                                                        </div>
                                                    </div>

                                                    <div className="ml-13 sm:ml-0 mt-3 pl-[3.25rem] sm:pl-0">
                                                        <p className="text-[15px] text-slate-700 leading-relaxed font-medium">
                                                            {safeText(log.message)}
                                                        </p>

                                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                                            <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${actionClass}`}>
                                                                {safeText(log.action)}
                                                            </span>

                                                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white shadow-sm px-2.5 py-1 text-xs font-semibold text-slate-700">
                                                                <ModuleIcon size={12} className="text-slate-400" />
                                                                {moduleMeta.label}
                                                            </span>

                                                            {log.target_model && (
                                                                <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 truncate max-w-[200px] sm:max-w-xs">
                                                                    {formatTargetDisplay(log)}
                                                                </span>
                                                            )}

                                                            {getTargetLink(log) && (
                                                                <Link
                                                                    to={getTargetLink(log)}
                                                                    className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 hover:bg-brand-100 hover:text-brand-800 transition-colors ml-auto sm:ml-0 shadow-sm"
                                                                >
                                                                    View Details
                                                                </Link>
                                                            )}
                                                        </div>

                                                        {log.meta ? (
                                                            <details className="mt-4 group/details">
                                                                <summary className="text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer flex items-center gap-1 transition-colors outline-none focus:ring-2 focus:ring-brand-500 rounded p-1 w-max">
                                                                    <span className="text-brand-500 group-open/details:rotate-90 transition-transform">▸</span>
                                                                    View Metadata
                                                                </summary>
                                                                <pre className="mt-2 text-[11px] text-slate-600 bg-slate-900 text-white border border-slate-800 rounded-xl p-3 overflow-x-auto shadow-inner">
                                                                    {typeof log.meta === "object" ? JSON.stringify(log.meta, null, 2) : safeText(log.meta)}
                                                                </pre>
                                                            </details>
                                                        ) : null}
                                                    </div>
                                                </article>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {nextCursor ? (
                            <div className="pt-3 flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => fetchLogs(nextCursor)}
                                    disabled={loadingMore}
                                    className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    {loadingMore ? "Loading..." : "Load More"}
                                </button>
                            </div>
                        ) : null}
                    </div>
                )}
            </main>
        </div>
    );
}
