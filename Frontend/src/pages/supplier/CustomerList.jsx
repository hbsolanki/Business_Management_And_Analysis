import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import {
    FaArrowLeft,
    FaEllipsisV,
    FaEdit,
    FaEnvelope,
    FaFilter,
    FaPhone,
    FaPlus,
    FaSearch,
    FaTrash,
    FaUser,
} from "react-icons/fa";

import ProtectedHeader from "@/components/layout/ProtectedHeader";
import Modal from "@/components/ui/Modal";
import { customerService } from "@/features/customer/services/customerService";
import { extractFirstError, normalizeListPayload } from "@/features/supplier/utils/supplierHelpers";

const INITIAL_CUSTOMER_FILTERS = {
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

function buildFilterParams(filters) {
    const params = {};
    Object.entries(filters).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        const normalized = String(value).trim();
        if (!normalized) return;
        params[key] = normalized;
    });
    return params;
}

export default function CustomerList() {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [loadingCustomers, setLoadingCustomers] = useState(true);
    const [customerToDelete, setCustomerToDelete] = useState(null);
    const [customerFilterForm, setCustomerFilterForm] = useState(INITIAL_CUSTOMER_FILTERS);
    const [appliedCustomerFilters, setAppliedCustomerFilters] = useState(INITIAL_CUSTOMER_FILTERS);
    const [actionsMenu, setActionsMenu] = useState(null);
    const [actionsMenuPosition, setActionsMenuPosition] = useState({ top: 0, left: 0, opacity: 0 });
    const actionsMenuRef = useRef(null);

    const activeCustomerFilterCount = useMemo(
        () => countActiveFilters(appliedCustomerFilters),
        [appliedCustomerFilters]
    );

    const loadCustomers = async (filters = appliedCustomerFilters) => {
        try {
            setLoadingCustomers(true);
            const params = buildFilterParams(filters);
            const res = await customerService.list(params);
            setCustomers(normalizeListPayload(res.data));
        } catch (error) {
            console.error("Failed to load customers", error);
            toast.error(extractFirstError(error, "Failed to load customers"));
        } finally {
            setLoadingCustomers(false);
        }
    };

    useEffect(() => {
        loadCustomers(INITIAL_CUSTOMER_FILTERS);
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

    const confirmCustomerDelete = async () => {
        if (!customerToDelete?.id) return;
        try {
            await customerService.delete(customerToDelete.id);
            toast.success("Customer deleted");
            setCustomers((prev) => prev.filter((customer) => customer.id !== customerToDelete.id));
        } catch (error) {
            console.error("Customer delete failed", error);
            toast.error(extractFirstError(error, "Failed to delete customer"));
        } finally {
            setCustomerToDelete(null);
        }
    };

    const applyCustomerFilters = async () => {
        setAppliedCustomerFilters(customerFilterForm);
        await loadCustomers(customerFilterForm);
    };

    const resetCustomerFilters = async () => {
        setCustomerFilterForm(INITIAL_CUSTOMER_FILTERS);
        setAppliedCustomerFilters(INITIAL_CUSTOMER_FILTERS);
        await loadCustomers(INITIAL_CUSTOMER_FILTERS);
    };

    const activeCustomerMenuItem = useMemo(() => {
        if (!actionsMenu || actionsMenu.kind !== "customer") return null;
        return customers.find((customer) => Number(customer.id) === Number(actionsMenu.id)) || null;
    }, [actionsMenu, customers]);

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
                                <span className="h-11 w-11 rounded-2xl bg-sky-600 text-white inline-flex items-center justify-center shadow-lg shadow-sky-200">
                                    <FaUser />
                                </span>
                                Customer Management
                            </h1>
                            <p className="text-slate-500 mt-2 text-sm">
                                Maintain customer profiles and connect them to the right business platform.
                            </p>
                        </div>

                        <Link
                            to="/supplier/customer/new"
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-6 py-3 text-sm font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-200"
                        >
                            <FaPlus />
                            New Customer
                        </Link>
                    </div>
                </section>

                <section className="glass-panel rounded-3xl overflow-hidden border border-sky-100/70">
                    <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-sky-50/40 via-white to-white font-sans">
                        <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                                <div className="flex items-center gap-3">
                                    <span className="h-9 w-9 rounded-xl bg-sky-100 text-sky-700 inline-flex items-center justify-center">
                                        <FaFilter size={14} />
                                    </span>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">Filter Customers</p>
                                        <p className="text-xs text-slate-500">Search customers by name or mobile number.</p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5">
                                    {activeCustomerFilterCount} Active Filters
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] gap-4 items-end">
                                <div>
                                    <label className={FILTER_LABEL_CLASS}>Customer Name</label>
                                    <div className="relative group">
                                        <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" size={13} />
                                        <input
                                            value={customerFilterForm.name}
                                            onChange={(event) => setCustomerFilterForm((prev) => ({ ...prev, name: event.target.value }))}
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
                                            value={customerFilterForm.mobile_number}
                                            onChange={(event) => setCustomerFilterForm((prev) => ({ ...prev, mobile_number: event.target.value }))}
                                            placeholder="Search by mobile..."
                                            className={FILTER_INPUT_ICON_CLASS}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={applyCustomerFilters}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white px-6 py-2.5 text-sm font-bold hover:bg-slate-800 transition shadow-sm flex-1 md:flex-none"
                                    >
                                        Apply
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetCustomerFilters}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition shadow-sm flex-1 md:flex-none"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {loadingCustomers ? (
                            <div className="col-span-full flex items-center justify-center text-slate-500 py-16">
                                <span className="animate-spin rounded-full h-5 w-5 border-2 border-sky-500 border-t-transparent mr-3"></span>
                                Loading customers...
                            </div>
                        ) : customers.length === 0 ? (
                            <div className="col-span-full text-center text-slate-500 py-16 text-sm">
                                No customers found. Try adjusting your filters or add a new customer.
                            </div>
                        ) : (
                            customers.map((customer) => {
                                const isSamePlatform = Boolean(customer.same_platform);
                                const businessLabel = customer.customer_business_name || customer.customer_business || "N/A";
                                return (
                                    <div
                                        key={customer.id}
                                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-3"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center text-lg flex-shrink-0">
                                                    <FaUser />
                                                </div>
                                                <div className="truncate">
                                                    <p className="text-sm font-bold text-slate-900 truncate">{customer.name || "Unnamed"}</p>
                                                    <p className="text-[10px] text-slate-500 font-medium">
                                                        ID: {customer.id} {isSamePlatform && "• Platform Member"}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                data-actions-trigger
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    const anchorRect = event.currentTarget.getBoundingClientRect();
                                                    setActionsMenuPosition((prev) => ({ ...prev, opacity: 0 }));
                                                    setActionsMenu((prev) => (
                                                        prev && prev.kind === "customer" && Number(prev.id) === Number(customer.id)
                                                            ? null
                                                            : { kind: "customer", id: customer.id, anchorRect }
                                                    ));
                                                }}
                                                className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-brand-600 transition-all flex items-center justify-center flex-shrink-0"
                                            >
                                                <FaEllipsisV size={11} />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] text-slate-600 border-t border-slate-50 pt-2">
                                            <div className="flex items-center gap-2">
                                                <FaPhone size={10} className="text-slate-400" />
                                                <span className="font-medium">{customer.mobile_number || "N/A"}</span>
                                            </div>
                                            <div className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-tighter text-[9px] ${isSamePlatform ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                                {isSamePlatform ? "Internal" : "External"}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>
            </main>

            {actionsMenu && (
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
                        {actionsMenu.kind === "customer" && activeCustomerMenuItem && (
                            <div className="space-y-1">
                                <p className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-1">Actions</p>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setActionsMenu(null);
                                        navigate(`/supplier/customer/${activeCustomerMenuItem.id}`);
                                    }}
                                    className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition-colors flex items-center gap-3"
                                >
                                    <div className="h-7 w-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                                        <FaUser size={12} />
                                    </div>
                                    View Details
                                </button>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setActionsMenu(null);
                                        navigate(`/supplier/customer/${activeCustomerMenuItem.id}/edit`);
                                    }}
                                    className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition-colors flex items-center gap-3"
                                >
                                    <div className="h-7 w-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                                        <FaEdit size={12} />
                                    </div>
                                    Edit Customer
                                </button>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setActionsMenu(null);
                                        setCustomerToDelete(activeCustomerMenuItem);
                                    }}
                                    className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
                                >
                                    <div className="h-7 w-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                                        <FaTrash size={12} />
                                    </div>
                                    Delete Customer
                                </button>
                            </div>
                        )}
                    </div>,
                    document.body
                )
            )}

            <Modal
                isOpen={Boolean(customerToDelete)}
                onClose={() => setCustomerToDelete(null)}
                title="Confirm Deletion"
                message={`Are you sure you want to permanently delete \"${customerToDelete?.name || ""}\"?`}
                onConfirm={confirmCustomerDelete}
                confirmText="Delete Customer"
                cancelText="Keep Customer"
                type="danger"
            />
        </div>
    );
}
