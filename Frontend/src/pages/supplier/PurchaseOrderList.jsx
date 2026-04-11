import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import {
    FaCalendarAlt,
    FaCheckCircle,
    FaCodeBranch,
    FaEllipsisV,
    FaEdit,
    FaFilter,
    FaPlus,
    FaSearch,
    FaShoppingCart,
    FaTrash,
    FaArrowLeft,
    FaEye,
    FaChevronDown
} from "react-icons/fa";

import ProtectedHeader from "@/components/layout/ProtectedHeader";
import Modal from "@/components/ui/Modal";
import { branchService } from "@/features/business/services/branchService";
import { supplierService } from "@/features/supplier/services/supplierService";
import {
    extractFirstError,
    normalizeListPayload,
} from "@/features/supplier/utils/supplierHelpers";

const INITIAL_PO_FILTERS = {
    order_date_after: "",
    order_date_before: "",
    branch: "",
    status: "",
    search: "",
};

const ORDER_STATUS_OPTIONS = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "FAILED", "CANCELLED"];

const FILTER_LABEL_CLASS = "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2";
const FILTER_INPUT_CLASS = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-50 outline-none transition-all";
const FILTER_INPUT_ICON_CLASS = `${FILTER_INPUT_CLASS} pl-10`;
const FILTER_SELECT_ICON_CLASS = `${FILTER_INPUT_CLASS} pl-10 pr-10 appearance-none`;

function resolveBranchId(branch) {
    if (!branch && branch !== 0) return null;
    if (typeof branch === "object") {
        return branch.id ?? branch.branch_id ?? null;
    }
    return branch;
}

function resolveAssignedBranches(profile) {
    if (!profile) return [];
    const collected = [];
    const pushBranch = (value) => {
        const id = resolveBranchId(value);
        if (!id && id !== 0) return;
        const source = typeof value === "object" ? value : null;
        collected.push({
            id: String(id),
            name: source?.name || source?.branch_name || `Branch #${id}`,
            is_default: Boolean(source?.is_default),
        });
    };

    // Primary: assigned_branches (new API structure)
    if (Array.isArray(profile.assigned_branches) && profile.assigned_branches.length > 0) {
        profile.assigned_branches.forEach(pushBranch);
    } else {
        // Legacy fallbacks
        if (Array.isArray(profile.branches)) profile.branches.forEach(pushBranch);
        if (Array.isArray(profile.branch_ids)) profile.branch_ids.forEach(pushBranch);
        if (profile.branch || profile.branch === 0) pushBranch(profile.branch);
        if (profile.branch_id || profile.branch_id === 0) pushBranch(profile.branch_id);
    }

    const seen = new Set();
    return collected.filter((branch) => {
        if (seen.has(branch.id)) return false;
        seen.add(branch.id);
        return true;
    });
}

function statusBadgeClass(status) {
    const normalized = String(status || "PENDING").toUpperCase();
    switch (normalized) {
        case "PENDING":
            return "bg-amber-50 text-amber-700 border-amber-200";
        case "CONFIRMED":
            return "bg-sky-50 text-sky-700 border-sky-200";
        case "SHIPPED":
            return "bg-blue-50 text-blue-700 border-blue-200";
        case "DELIVERED":
            return "bg-emerald-50 text-emerald-700 border-emerald-200";
        case "FAILED":
            return "bg-rose-50 text-rose-700 border-rose-200";
        case "CANCELLED":
            return "bg-slate-50 text-slate-700 border-slate-200";
        default:
            return "bg-slate-50 text-slate-600 border-slate-200";
    }
}

function toQueryString(filters) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        const normalized = String(value).trim();
        if (!normalized) return;
        params.set(key, normalized);
    });
    const query = params.toString();
    return query ? `?${query}` : "";
}

function formatDate(value) {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleDateString();
}

function formatDateTime(value) {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString();
}

function formatCurrency(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return value ? `INR ${value}` : "-";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(parsed);
}

function getOrderItemProductName(item) {
    const productObj = item?.product_details || item?.product || {};
    const productId = Number(productObj?.id ?? item?.product_id ?? item?.product);
    return productObj?.name || item?.product_name || `Product #${productId || "N/A"}`;
}

function countActiveFilters(filters) {
    return Object.values(filters).reduce((count, value) => {
        if (value === null || value === undefined) return count;
        return String(value).trim() ? count + 1 : count;
    }, 0);
}

export default function PurchaseOrderList() {
    const navigate = useNavigate();
    const { profile } = useSelector((state) => state.user);
    const userRole = String(typeof profile?.role === "object" ? profile?.role?.role : profile?.role || "").toUpperCase();
    const isRestrictedRole = userRole === "MANAGER" || userRole === "EMPLOYEE";
    const assignedBranches = useMemo(() => resolveAssignedBranches(profile), [profile]);
    const [searchParams, setSearchParams] = useSearchParams();
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [orderToDelete, setOrderToDelete] = useState(null);
    const [orderToDeliver, setOrderToDeliver] = useState(null);
    const [poFilterForm, setPoFilterForm] = useState(INITIAL_PO_FILTERS);
    const [appliedPoFilters, setAppliedPoFilters] = useState(INITIAL_PO_FILTERS);
    const [actionsMenu, setActionsMenu] = useState(null);
    const [actionsMenuPosition, setActionsMenuPosition] = useState({ top: 0, left: 0, opacity: 0 });
    const actionsMenuRef = useRef(null);

    const activePoFilterCount = useMemo(
        () => countActiveFilters(appliedPoFilters),
        [appliedPoFilters]
    );

    const getPreferredBranchId = (branchList = []) => {
        const preferred = branchList.find((branch) => branch?.is_default) || branchList[0];
        return preferred ? String(preferred.id) : "";
    };

    const loadBranches = async () => {
        try {
            const res = await branchService.list();
            const allBranches = normalizeListPayload(res.data);
            if (!isRestrictedRole) {
                setBranches(allBranches);
                return allBranches;
            }
            const assignedIds = new Set(assignedBranches.map((branch) => String(branch.id)));
            const filtered = assignedIds.size > 0
                ? allBranches.filter((branch) => assignedIds.has(String(branch.id)))
                : allBranches;
            const accessible = filtered.length > 0 ? filtered : assignedBranches;
            setBranches(accessible);
            return accessible;
        } catch (error) {
            console.error("Failed to load branches", error);
            const fallback = isRestrictedRole ? assignedBranches : [];
            setBranches(fallback);
            return fallback;
        }
    };

    const loadPurchaseOrders = async (filters = appliedPoFilters) => {
        try {
            setLoadingOrders(true);
            const { search, ...rest } = filters;
            const effectiveFilters = { ...rest };

            if (isRestrictedRole) {
                const restrictedBranch = String(effectiveFilters.branch || "") || getPreferredBranchId(branches);
                if (!restrictedBranch) {
                    setPurchaseOrders([]);
                    return;
                }
                effectiveFilters.branch = restrictedBranch;
            }

            // Client-side search for ID or Supplier Name if search is present
            // In a real scenario, this might be handled by the backend, 
            // but we'll implement it here for immediate UX.
            const query = toQueryString(effectiveFilters);
            const res = await supplierService.getPurchaseOrders(query);
            const data = normalizeListPayload(res.data);

            if (search) {
                const lowerSearch = search.toLowerCase();
                setPurchaseOrders(data.filter(order =>
                    String(order.id).includes(lowerSearch) ||
                    (order.supplier?.name || order.supplier_name || "").toLowerCase().includes(lowerSearch)
                ));
            } else {
                setPurchaseOrders(data);
            }
        } catch (error) {
            console.error("Failed to load purchase orders", error);
            toast.error(extractFirstError(error, "Failed to load purchase orders"));
        } finally {
            setLoadingOrders(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            const availableBranches = await loadBranches();
            
            // Extract filters from searchParams
            const urlFilters = {};
            Object.keys(INITIAL_PO_FILTERS).forEach(key => {
                const val = searchParams.get(key);
                if (val !== null) urlFilters[key] = val;
            });

            const restrictedBranch = isRestrictedRole ? getPreferredBranchId(availableBranches) : "";
            const mergedFilters = {
                ...INITIAL_PO_FILTERS,
                ...urlFilters,
            };

            if (isRestrictedRole) {
                // Ensure branch is restricted if role is manager/employee
                mergedFilters.branch = String(mergedFilters.branch || "") || restrictedBranch;
            }

            setPoFilterForm(mergedFilters);
            setAppliedPoFilters(mergedFilters);
            await loadPurchaseOrders(mergedFilters);
        };
        init();
    }, [isRestrictedRole, assignedBranches, searchParams]);

    useEffect(() => {
        const closeMenuOnOutsideClick = (event) => {
            const target = event?.target;
            if (target instanceof Element && target.closest("[data-actions-trigger]")) return;
            if (target instanceof Element && target.closest("[data-actions-floating]")) return;
            setActionsMenu(null);
        };
        document.addEventListener("mousedown", closeMenuOnOutsideClick);
        return () => document.removeEventListener("mousedown", closeMenuOnOutsideClick);
    }, []);

    useEffect(() => {
        if (!actionsMenu) return;
        const closeMenu = () => setActionsMenu(null);
        window.addEventListener("resize", closeMenu);
        window.addEventListener("scroll", closeMenu, true);
        return () => {
            window.removeEventListener("resize", closeMenu);
            window.removeEventListener("scroll", closeMenu, true);
        };
    }, [actionsMenu]);

    useLayoutEffect(() => {
        if (!actionsMenu || !actionsMenuRef.current) return;
        const menuEl = actionsMenuRef.current;
        const menuRect = menuEl.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 8;
        const anchor = actionsMenu.anchorRect;

        let top = anchor.bottom + padding;
        if (top + menuRect.height > viewportHeight - padding) {
            top = Math.max(padding, anchor.top - menuRect.height - padding);
        }
        let left = anchor.right - menuRect.width;
        if (left < padding) left = padding;
        if (left + menuRect.width > viewportWidth - padding) {
            left = viewportWidth - menuRect.width - padding;
        }
        setActionsMenuPosition({ top, left, opacity: 1 });
    }, [actionsMenu]);


    const confirmPurchaseOrderDelete = async () => {
        if (!orderToDelete?.id) return;
        try {
            await supplierService.deletePurchaseOrder(orderToDelete.id);
            toast.success("Purchase order deleted");
            setPurchaseOrders((prev) => prev.filter((order) => order.id !== orderToDelete.id));
            await loadPurchaseOrders(appliedPoFilters);
        } catch (error) {
            console.error("Purchase order delete failed", error);
            toast.error(extractFirstError(error, "Failed to delete purchase order"));
        } finally {
            setOrderToDelete(null);
        }
    };

    const confirmPurchaseOrderDeliver = async () => {
        if (!orderToDeliver?.id) return;
        try {
            const res = await supplierService.deliverPurchaseOrder(orderToDeliver.id);
            toast.success("Purchase order marked as delivered");
            setPurchaseOrders((prev) =>
                prev.map((order) =>
                    order.id === orderToDeliver.id
                        ? { ...order, status: "DELIVERED", ...res.data }
                        : order
                )
            );
        } catch (error) {
            console.error("Purchase order delivery failed", error);
            toast.error(extractFirstError(error, "Failed to deliver purchase order"));
        } finally {
            setOrderToDeliver(null);
        }
    };

    const applyPurchaseOrderFilters = () => {
        const nextFilters = { ...poFilterForm };
        if (isRestrictedRole) {
            nextFilters.branch = String(poFilterForm.branch || "") || getPreferredBranchId(branches);
        }
        
        // Update URL params - this will trigger useEffect to load data
        const newParams = {};
        Object.entries(nextFilters).forEach(([key, value]) => {
            if (value) newParams[key] = value;
        });
        setSearchParams(newParams);
    };

    const resetPurchaseOrderFilters = () => {
        const resetFilters = isRestrictedRole
            ? { ...INITIAL_PO_FILTERS, branch: getPreferredBranchId(branches) }
            : INITIAL_PO_FILTERS;
        
        // Update URL params - this will trigger useEffect to load data
        setSearchParams(isRestrictedRole ? { branch: resetFilters.branch } : {});
    };

    const renderOrderItemsCompact = (items = []) => {
        if (!Array.isArray(items) || items.length === 0) return "No items";
        return items.slice(0, 3).map((item) => `${getOrderItemProductName(item)} x ${item.quantity || 0}`).join(", ");
    };

    const activeOrderMenuItem = useMemo(() => {
        if (!actionsMenu || actionsMenu.kind !== "order") return null;
        return purchaseOrders.find((order) => Number(order.id) === Number(actionsMenu.id)) || null;
    }, [actionsMenu, purchaseOrders]);

    return (
        <div className="min-h-screen bg-transparent pb-16">
            <ProtectedHeader />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                <section className="glass-panel rounded-3xl p-8">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                            <button
                                onClick={() => navigate("/supplier")}
                                className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-600 mb-4 transition-colors font-semibold text-sm"
                            >
                                <FaArrowLeft size={12} />
                                Back to Dashboard
                            </button>
                            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
                                <span className="h-11 w-11 rounded-2xl bg-indigo-600 text-white inline-flex items-center justify-center shadow-lg shadow-indigo-200">
                                    <FaShoppingCart />
                                </span>
                                Purchase Orders
                            </h1>
                            <p className="text-slate-500 mt-2 text-sm">
                                Track, receive, and manage all branch procurement records.
                            </p>
                        </div>

                        <Link
                            to="/supplier/purchase-order/new"
                            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 text-white px-6 py-3 text-sm font-bold hover:bg-brand-500 transition shadow-lg shadow-brand-200"
                        >
                            <FaPlus />
                            New Purchase Order
                        </Link>
                    </div>
                </section>

                <section className="glass-panel rounded-3xl overflow-hidden border border-indigo-100/80">
                    <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-indigo-50/40 via-white to-white font-sans">
                        <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                                <div className="flex items-center gap-3">
                                    <span className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-700 inline-flex items-center justify-center">
                                        <FaFilter size={14} />
                                    </span>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">Filter Orders</p>
                                        <p className="text-xs text-slate-500">Narrow down your POs by date, branch, or status.</p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5">
                                    {activePoFilterCount} Active Filters
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                <div>
                                    <label className={FILTER_LABEL_CLASS}>From Date</label>
                                    <div className="relative group">
                                        <FaCalendarAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" size={13} />
                                        <input
                                            type="date"
                                            value={poFilterForm.order_date_after}
                                            onChange={(event) => setPoFilterForm((prev) => ({ ...prev, order_date_after: event.target.value }))}
                                            className={FILTER_INPUT_ICON_CLASS}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={FILTER_LABEL_CLASS}>To Date</label>
                                    <div className="relative group">
                                        <FaCalendarAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" size={13} />
                                        <input
                                            type="date"
                                            value={poFilterForm.order_date_before}
                                            onChange={(event) => setPoFilterForm((prev) => ({ ...prev, order_date_before: event.target.value }))}
                                            className={FILTER_INPUT_ICON_CLASS}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={FILTER_LABEL_CLASS}>Branch</label>
                                    <div className="relative group">
                                        <FaCodeBranch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" size={13} />
                                        <select
                                            value={poFilterForm.branch}
                                            onChange={(event) => setPoFilterForm((prev) => ({ ...prev, branch: event.target.value }))}
                                            className={FILTER_SELECT_ICON_CLASS}
                                            disabled={isRestrictedRole && branches.length <= 1}
                                        >
                                            <option value="">{isRestrictedRole ? "Select branch" : "All branches"}</option>
                                            {branches.map((branch) => (
                                                <option key={branch.id} value={branch.id}>{branch.branch_name || branch.name}</option>
                                            ))}
                                        </select>
                                        <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
                                    </div>
                                </div>
                                <div>
                                    <label className={FILTER_LABEL_CLASS}>Status</label>
                                    <div className="relative group">
                                        <FaCheckCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" size={13} />
                                        <select
                                            value={poFilterForm.status}
                                            onChange={(event) => setPoFilterForm((prev) => ({ ...prev, status: event.target.value }))}
                                            className={FILTER_SELECT_ICON_CLASS}
                                        >
                                            <option value="">All Statuses</option>
                                            {ORDER_STATUS_OPTIONS.map((status) => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                        <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
                                    </div>
                                </div>
                                <div>
                                    <label className={FILTER_LABEL_CLASS}>Search ID/Supplier</label>
                                    <div className="relative group">
                                        <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" size={13} />
                                        <input
                                            type="text"
                                            placeholder="Search ID or Supplier Name"
                                            value={poFilterForm.search}
                                            onChange={(event) => setPoFilterForm((prev) => ({ ...prev, search: event.target.value }))}
                                            className={FILTER_INPUT_ICON_CLASS}
                                        />
                                    </div>
                                </div>
                                <div className="lg:col-span-4 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={applyPurchaseOrderFilters}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white px-8 py-2.5 text-sm font-bold hover:bg-slate-800 transition shadow-sm"
                                    >
                                        Apply Filters
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetPurchaseOrderFilters}
                                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 px-8 py-2.5 text-sm font-bold hover:bg-slate-50 transition"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        {loadingOrders ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
                                <p className="text-sm font-medium">Fetching orders...</p>
                            </div>
                        ) : purchaseOrders.length === 0 ? (
                            <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                <FaShoppingCart size={32} className="mx-auto text-slate-300 mb-3" />
                                <p className="text-slate-500 font-medium">No purchase orders found.</p>
                                <button onClick={resetPurchaseOrderFilters} className="text-brand-600 text-sm font-bold mt-2 hover:underline">Clear all filters</button>
                            </div>
                        ) : (
                            purchaseOrders.map((order) => {
                                const normalizedStatus = String(order.status || "PENDING").toUpperCase();
                                return (
                                    <div
                                        key={order.id}
                                        className="rounded-2xl border border-slate-200 bg-white hover:border-brand-200 hover:shadow-sm transition-all duration-200"
                                    >
                                        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex-1 text-left">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs uppercase tracking-tight">
                                                        PO
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3">
                                                            <p className="font-bold text-slate-900 tracking-tight">#{order.id}</p>
                                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${statusBadgeClass(normalizedStatus)}`}>
                                                                {normalizedStatus}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 font-medium">
                                                            <p className="flex items-center gap-1.5"><span className="text-slate-400">Supplier:</span> {order.supplier?.name || order.supplier_name || "N/A"}</p>
                                                            <span className="text-slate-300 hidden sm:inline">•</span>
                                                            <p className="flex items-center gap-1.5"><span className="text-slate-400">Branch:</span> {order.branch?.name || order.branch_name || order.branch_details?.name || "N/A"}</p>
                                                            <span className="text-slate-300 hidden sm:inline">•</span>
                                                            <p className="flex items-center gap-1.5"><span className="text-slate-400">Date:</span> {formatDate(order.order_date)}</p>
                                                            <span className="text-slate-300 hidden sm:inline">•</span>
                                                            <p className="flex items-center gap-1.5"><span className="text-brand-600 font-bold">{formatCurrency(order.total_amount)}</span></p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 self-end md:self-center">
                                                <button
                                                    type="button"
                                                    data-actions-trigger
                                                    onClick={(event) => {
                                                        const anchorRect = event.currentTarget.getBoundingClientRect();
                                                        setActionsMenuPosition((prev) => ({ ...prev, opacity: 0 }));
                                                        setActionsMenu((prev) => (
                                                            prev && prev.kind === "order" && Number(prev.id) === Number(order.id)
                                                                ? null
                                                                : { kind: "order", id: order.id, anchorRect }
                                                        ));
                                                    }}
                                                    className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-brand-600 hover:border-brand-200 transition-all flex items-center justify-center"
                                                >
                                                    <FaEllipsisV size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>
            </main>

            {
                actionsMenu && (
                    createPortal(
                        <div
                            ref={actionsMenuRef}
                            data-actions-floating
                            className="fixed z-[80] w-48 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
                            style={{
                                top: actionsMenuPosition.top,
                                left: actionsMenuPosition.left,
                                opacity: actionsMenuPosition.opacity,
                            }}
                        >
                            {actionsMenu.kind === "order" && activeOrderMenuItem && (
                                <div className="space-y-1">
                                    <p className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-1">Actions</p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActionsMenu(null);
                                            navigate(`/supplier/purchase-order/${activeOrderMenuItem.id}`);
                                        }}
                                        className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-brand-50 hover:text-brand-600 transition-colors flex items-center gap-3"
                                    >
                                        <div className="h-7 w-7 rounded-lg bg-brand-100/50 text-brand-600 flex items-center justify-center">
                                            <FaEye size={12} />
                                        </div>
                                        View Detail
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActionsMenu(null);
                                            navigate(`/supplier/purchase-order/${activeOrderMenuItem.id}/edit`);
                                        }}
                                        className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-brand-50 hover:text-brand-600 transition-colors flex items-center gap-3"
                                    >
                                        <div className="h-7 w-7 rounded-lg bg-brand-100/50 text-brand-600 flex items-center justify-center">
                                            <FaEdit size={12} />
                                        </div>
                                        Edit PO
                                    </button>
                                    {activeOrderMenuItem.status?.toUpperCase() !== "DELIVERED" && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActionsMenu(null);
                                                setOrderToDeliver(activeOrderMenuItem);
                                            }}
                                            className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center gap-3"
                                        >
                                            <div className="h-7 w-7 rounded-lg bg-emerald-100/50 text-emerald-600 flex items-center justify-center">
                                                <FaCheckCircle size={12} />
                                            </div>
                                            Mark Delivered
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActionsMenu(null);
                                            setOrderToDelete(activeOrderMenuItem);
                                        }}
                                        className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
                                    >
                                        <div className="h-7 w-7 rounded-lg bg-red-100/50 text-red-600 flex items-center justify-center">
                                            <FaTrash size={12} />
                                        </div>
                                        Cancel & Delete
                                    </button>
                                </div>
                            )}
                        </div>,
                        document.body
                    )
                )
            }

            <Modal
                isOpen={Boolean(orderToDelete)}
                onClose={() => setOrderToDelete(null)}
                title="Cancel Purchase Order"
                message={`Are you sure you want to cancel and delete purchase order #${orderToDelete?.id}? This action cannot be undone.`}
                onConfirm={confirmPurchaseOrderDelete}
                confirmText="Cancel Order"
                type="danger"
            />

            <Modal
                isOpen={Boolean(orderToDeliver)}
                onClose={() => setOrderToDeliver(null)}
                title="Inventory Fulfillment"
                message={`Confirm delivery of purchase order #${orderToDeliver?.id}. This will automatically update your inventory levels for all items included in this order.`}
                onConfirm={confirmPurchaseOrderDeliver}
                confirmText="Confirm Delivery"
                variant="success"
            />
        </div >
    );
}
