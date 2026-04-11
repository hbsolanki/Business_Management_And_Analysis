import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import {
    FaEllipsisV,
    FaEdit,
    FaFilter,
    FaPhone,
    FaPlus,
    FaSearch,
    FaTrash,
    FaTruck,
    FaUsers,
    FaArrowLeft,
    FaEye
} from "react-icons/fa";

import ProtectedHeader from "@/components/layout/ProtectedHeader";
import Modal from "@/components/ui/Modal";
import { supplierService } from "@/features/supplier/services/supplierService";
import {
    extractFirstError,
    normalizeListPayload,
} from "@/features/supplier/utils/supplierHelpers";

const INITIAL_VENDOR_FILTERS = {
    name: "",
    mobile_number: "",
};

const FILTER_LABEL_CLASS = "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2";
const FILTER_INPUT_CLASS = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-50 outline-none transition-all";
const FILTER_INPUT_ICON_CLASS = `${FILTER_INPUT_CLASS} pl-10`;

function countActiveFilters(filters) {
    return Object.values(filters).reduce((count, value) => {
        if (value === null || value === undefined) return count;
        return String(value).trim() ? count + 1 : count;
    }, 0);
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

export default function VendorList() {
    const navigate = useNavigate();
    const { profile } = useSelector((state) => state.user);

    const [vendors, setVendors] = useState([]);
    const [loadingVendors, setLoadingVendors] = useState(true);
    const [vendorToDelete, setVendorToDelete] = useState(null);
    const [vendorFilterForm, setVendorFilterForm] = useState(INITIAL_VENDOR_FILTERS);
    const [appliedVendorFilters, setAppliedVendorFilters] = useState(INITIAL_VENDOR_FILTERS);
    const [actionsMenu, setActionsMenu] = useState(null);
    const [actionsMenuPosition, setActionsMenuPosition] = useState({ top: 0, left: 0, opacity: 0 });
    const actionsMenuRef = useRef(null);

    const activeVendorFilterCount = useMemo(
        () => countActiveFilters(appliedVendorFilters),
        [appliedVendorFilters]
    );

    const loadVendors = async (filters = appliedVendorFilters) => {
        try {
            setLoadingVendors(true);
            const query = toQueryString(filters);
            const res = await supplierService.getVendors(query);
            setVendors(normalizeListPayload(res.data));
        } catch (error) {
            console.error("Failed to load vendors", error);
            toast.error(extractFirstError(error, "Failed to load vendors"));
        } finally {
            setLoadingVendors(false);
        }
    };

    useEffect(() => {
        loadVendors(INITIAL_VENDOR_FILTERS);
    }, []);

    useEffect(() => {
        const closeMenuOnOutsideClick = (event) => {
            const target = event?.target;
            if (target instanceof Element && target.closest("[data-actions-trigger]")) return;
            if (target instanceof Element && target.closest("[data-actions-floating]")) return;
            setActionsMenu(null);
        };

        document.addEventListener("mousedown", closeMenuOnOutsideClick);
        return () => {
            document.removeEventListener("mousedown", closeMenuOnOutsideClick);
        };
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


    const confirmVendorDelete = async () => {
        if (!vendorToDelete?.id) return;
        try {
            await supplierService.deleteVendor(vendorToDelete.id);
            toast.success("Vendor deleted");
            setVendors((prev) => prev.filter((vendor) => vendor.id !== vendorToDelete.id));
            if (true) {
                // Expansion logic removed, so this check is simplified
            }
        } catch (error) {
            console.error("Vendor delete failed", error);
            toast.error(extractFirstError(error, "Failed to delete vendor"));
        } finally {
            setVendorToDelete(null);
        }
    };

    const applyVendorFilters = async () => {
        setAppliedVendorFilters(vendorFilterForm);
        await loadVendors(vendorFilterForm);
    };

    const resetVendorFilters = async () => {
        setVendorFilterForm(INITIAL_VENDOR_FILTERS);
        setAppliedVendorFilters(INITIAL_VENDOR_FILTERS);
        await loadVendors(INITIAL_VENDOR_FILTERS);
    };

    const activeVendorMenuItem = useMemo(() => {
        if (!actionsMenu || actionsMenu.kind !== "vendor") return null;
        return vendors.find((vendor) => Number(vendor.id) === Number(actionsMenu.id)) || null;
    }, [actionsMenu, vendors]);

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
                                <span className="h-11 w-11 rounded-2xl bg-brand-600 text-white inline-flex items-center justify-center shadow-lg shadow-brand-200">
                                    <FaUsers />
                                </span>
                                Vendor Management
                            </h1>
                            <p className="text-slate-500 mt-2 text-sm">
                                Manage your trusted suppliers, contact details, and procurement history.
                            </p>
                        </div>

                        <Link
                            to="/supplier/vendor/new"
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-6 py-3 text-sm font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-200"
                        >
                            <FaPlus />
                            New Vendor
                        </Link>
                    </div>
                </section>

                <section className="glass-panel rounded-3xl overflow-hidden border border-brand-100/70">
                    <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-brand-50/40 via-white to-white font-sans">
                        <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                                <div className="flex items-center gap-3">
                                    <span className="h-9 w-9 rounded-xl bg-brand-100 text-brand-700 inline-flex items-center justify-center">
                                        <FaFilter size={14} />
                                    </span>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">Filter Vendors</p>
                                        <p className="text-xs text-slate-500">Find vendors by name or contact number.</p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5">
                                    {activeVendorFilterCount} Active Filters
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] gap-4 items-end">
                                <div>
                                    <label className={FILTER_LABEL_CLASS}>Vendor Name</label>
                                    <div className="relative group">
                                        <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" size={13} />
                                        <input
                                            value={vendorFilterForm.name}
                                            onChange={(event) => setVendorFilterForm((prev) => ({ ...prev, name: event.target.value }))}
                                            placeholder="Search by name..."
                                            className={FILTER_INPUT_ICON_CLASS}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={FILTER_LABEL_CLASS}>Mobile Number</label>
                                    <div className="relative group">
                                        <FaPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" size={13} />
                                        <input
                                            value={vendorFilterForm.mobile_number}
                                            onChange={(event) => setVendorFilterForm((prev) => ({ ...prev, mobile_number: event.target.value }))}
                                            placeholder="Search by mobile..."
                                            className={FILTER_INPUT_ICON_CLASS}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={applyVendorFilters}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white px-6 py-2.5 text-sm font-bold hover:bg-slate-800 transition shadow-sm flex-1 md:flex-none"
                                    >
                                        Apply
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetVendorFilters}
                                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 px-6 py-2.5 text-sm font-bold hover:bg-slate-50 transition flex-1 md:flex-none"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-3">
                        {loadingVendors ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-600 mb-4"></div>
                                <p className="text-sm font-medium">Refreshing vendor records...</p>
                            </div>
                        ) : vendors.length === 0 ? (
                            <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                <FaUsers size={32} className="mx-auto text-slate-300 mb-3" />
                                <p className="text-slate-500 font-medium">No vendors found matching your criteria.</p>
                                <button onClick={resetVendorFilters} className="text-brand-600 text-sm font-bold mt-2 hover:underline">Clear all filters</button>
                            </div>
                        ) : (
                            vendors.map((vendor) => {
                                return (
                                    <div
                                        key={vendor.id}
                                        className="rounded-2xl border border-slate-200 bg-white hover:border-brand-200 hover:shadow-sm transition-all duration-200"
                                    >
                                        <div className="p-4 flex items-center justify-between gap-4">
                                            <div className="flex-1 text-left">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">
                                                        {vendor.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">{vendor.name}</p>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                                                <FaPhone size={10} className="text-slate-400" />
                                                                {vendor.mobile_number || "N/A"}
                                                            </p>
                                                            <span className="text-slate-300">•</span>
                                                            <p className="text-xs text-slate-500">{vendor.contact_person || "No contact person"}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    data-actions-trigger
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        const anchorRect = event.currentTarget.getBoundingClientRect();
                                                        setActionsMenuPosition((prev) => ({ ...prev, opacity: 0 }));
                                                        setActionsMenu((prev) => (
                                                            prev && prev.kind === "vendor" && Number(prev.id) === Number(vendor.id)
                                                                ? null
                                                                : { kind: "vendor", id: vendor.id, anchorRect }
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
                            {actionsMenu.kind === "vendor" && activeVendorMenuItem && (
                                <div className="space-y-1">
                                    <p className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-1">Actions</p>
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setActionsMenu(null);
                                            navigate(`/supplier/vendor/${activeVendorMenuItem.id}`);
                                        }}
                                        className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-brand-50 hover:text-brand-600 transition-colors flex items-center gap-3"
                                    >
                                        <div className="h-7 w-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                                            <FaEye size={12} />
                                        </div>
                                        View Details
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setActionsMenu(null);
                                            navigate(`/supplier/vendor/${activeVendorMenuItem.id}/edit`);
                                        }}
                                        className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition-colors flex items-center gap-3"
                                    >
                                        <div className="h-7 w-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                                            <FaEdit size={12} />
                                        </div>
                                        Edit Details
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setActionsMenu(null);
                                            setVendorToDelete(activeVendorMenuItem);
                                        }}
                                        className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
                                    >
                                        <div className="h-7 w-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                                            <FaTrash size={12} />
                                        </div>
                                        Delete Vendor
                                    </button>
                                </div>
                            )}
                        </div>,
                        document.body
                    )
                )
            }

            <Modal
                isOpen={Boolean(vendorToDelete)}
                onClose={() => setVendorToDelete(null)}
                title="Confirm Deletion"
                message={`Are you sure you want to permanently delete "${vendorToDelete?.name || ""}"? All records associated with this vendor will be preserved but the vendor entry will be removed.`}
                onConfirm={confirmVendorDelete}
                confirmText="Delete Vendor"
                cancelText="Keep Vendor"
                type="danger"
            />
        </div >
    );
}
