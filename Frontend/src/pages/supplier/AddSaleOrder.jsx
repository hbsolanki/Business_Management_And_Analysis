import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
    FaAlignLeft,
    FaBoxOpen,
    FaCodeBranch,
    FaMoneyBillWave,
    FaSave,
    FaShoppingCart,
    FaSpinner,
    FaTrash,
    FaUser,
    FaChevronDown,
} from "react-icons/fa";

import ProtectedHeader from "@/components/layout/ProtectedHeader";
import BackButton from "@/components/shared/BackButton";
import { branchService } from "@/features/business/services/branchService";
import { tokenService } from "@/services/tokenService";
import api from "@/services/api";
import { customerService } from "@/features/customer/services/customerService";
import { supplierService } from "@/features/supplier/services/supplierService";
import PurchaseOrderProductSearch from "@/features/supplier/components/PurchaseOrderProductSearch";
import {
    extractFirstError,
    normalizeListPayload,
    parsePositiveInt,
} from "@/features/supplier/utils/supplierHelpers";
import { getAssignedBranchesForWork, filterBranchesForRole } from "@/utils/branchFilter";

const INITIAL_FORM = {
    branch_id: "",
    customer_id: "",
    status: "PENDING",
    notes: "",
    items: [],
};

function getErrorText(value) {
    if (!value) return null;
    if (typeof value === "string") return value;
    return extractFirstError({ data: value }, "Invalid input");
}

export default function AddSaleOrder({ isEmbed = false, onComplete = null, initialData = null }) {
    const navigate = useNavigate();
    const location = useLocation();

    const { profile } = useSelector((state) => state.user);
    const userRole = String(typeof profile?.role === "object" ? profile?.role?.role : profile?.role || "").toUpperCase();
    const isRestrictedRole = userRole === "MANAGER" || userRole === "EMPLOYEE";
    
    const assignedBranches = useMemo(
        () => getAssignedBranchesForWork(profile, 'SUPPLIER'),
        [profile]
    );

    const [branches, setBranches] = useState([]);

    // Customer selection state
    const [customers, setCustomers] = useState([]);
    const [customerSearch, setCustomerSearch] = useState("");
    const [fetchingCustomers, setFetchingCustomers] = useState(false);
    const [customerOpen, setCustomerOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerNext, setCustomerNext] = useState(null);
    const [loadingMoreCustomers, setLoadingMoreCustomers] = useState(false);
    const customerWrapperRef = useRef(null);

    const [formData, setFormData] = useState(INITIAL_FORM);
    const [errors, setErrors] = useState({});
    const [itemError, setItemError] = useState("");

    useEffect(() => {
        if (initialData) {
            setFormData((prev) => ({
                ...prev,
                branch_id: initialData.branch_id ? String(initialData.branch_id) : prev.branch_id,
                customer_id: initialData.customer_id ? String(initialData.customer_id) : prev.customer_id,
                status: initialData.status || prev.status,
                notes: initialData.notes || prev.notes,
                items: Array.isArray(initialData.items) ? initialData.items : prev.items,
            }));
            if (initialData.customerName) {
                setCustomerSearch(initialData.customerName);
            }
        }
    }, [initialData]);

    const [loadingPage, setLoadingPage] = useState(true);
    const [saving, setSaving] = useState(false);

    const mergeCustomers = useCallback((current, incoming) => {
        const map = new Map(current.map((item) => [String(item.id), item]));
        incoming.forEach((item) => map.set(String(item.id), item));
        return Array.from(map.values());
    }, []);

    const loadCustomers = useCallback(async (search = "") => {
        setFetchingCustomers(true);
        try {
            const res = await customerService.list(search ? { search } : {});
            const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
            setCustomers(data);
            setCustomerNext(res.data?.next || null);
            return data;
        } catch (error) {
            console.error("Failed to load customers", error);
            return [];
        } finally {
            setFetchingCustomers(false);
        }
    }, []);

    const loadMoreCustomers = useCallback(async () => {
        if (!customerNext || loadingMoreCustomers) return;
        setLoadingMoreCustomers(true);
        try {
            const res = await api.get(customerNext);
            const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
            setCustomers((prev) => mergeCustomers(prev, data));
            setCustomerNext(res.data?.next || null);
        } catch (error) {
            console.error("Failed to load more customers", error);
        } finally {
            setLoadingMoreCustomers(false);
        }
    }, [customerNext, loadingMoreCustomers, mergeCustomers]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (customerWrapperRef.current && !customerWrapperRef.current.contains(event.target)) {
                setCustomerOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadCustomers(customerSearch.trim());
        }, 300);
        return () => clearTimeout(timer);
    }, [customerSearch, loadCustomers]);

    useEffect(() => {
        let isMounted = true;

        const loadInitialData = async () => {
            try {
                setLoadingPage(true);
                const [branchRes] = await Promise.all([
                    branchService.list(),
                    loadCustomers(),
                ]);

                if (!isMounted) return;

                const branchData = normalizeListPayload(branchRes.data);
                const accessibleBranches = (() => {
                    if (!isRestrictedRole) return branchData;
                    const filtered = filterBranchesForRole(branchData, assignedBranches);
                    return filtered.length > 0 ? filtered : assignedBranches;
                })();

                setBranches(accessibleBranches);

                let defaultBranch = "";
                if (accessibleBranches.length > 0) {
                    const defaultId = tokenService.getDefaultBranchId();
                    const preSelected = defaultId
                        ? accessibleBranches.find(b => String(b.id) === String(defaultId))
                        : (accessibleBranches.find(b => b.is_default) || accessibleBranches[0]);

                    const finalB = preSelected || accessibleBranches[0];
                    defaultBranch = finalB ? String(finalB.id) : "";
                }

                const preSelectedCustomerId = location.state?.selectedCustomer;
                let initialCustomer = null;
                if (preSelectedCustomerId) {
                    try {
                        const custRes = await customerService.getById(preSelectedCustomerId);
                        initialCustomer = custRes.data;
                        setSelectedCustomer(initialCustomer);
                        setCustomerSearch(initialCustomer.name || initialCustomer.mobile_number || "");
                    } catch (e) {
                        console.error("Failed to fetch pre-selected customer", e);
                    }
                }

                setFormData((prev) => ({
                    ...prev,
                    branch_id: defaultBranch,
                    customer_id: initialCustomer ? String(initialCustomer.id) : ""
                }));
            } catch (error) {
                toast.error(extractFirstError(error, "Failed to load form data"));
                navigate(-1);
            } finally {
                if (isMounted) setLoadingPage(false);
            }
        };

        loadInitialData();

        return () => {
            isMounted = false;
        };
    }, [assignedBranches, isRestrictedRole, navigate]);

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    const handleItemChange = (index, field, value) => {
        setFormData((prev) => {
            const nextItems = [...prev.items];
            nextItems[index] = { ...nextItems[index], [field]: value };
            return { ...prev, items: nextItems };
        });
        if (itemError) setItemError("");
    };

    const handleAddProduct = (product) => {
        setFormData((prev) => {
            const skuValue = product?.sku || String(product?.id || "");
            const exists = prev.items.find((i) => String(i.sku) === String(skuValue));
            if (exists) return prev;
            const newItem = {
                product_id: Number(product.id),
                sku: skuValue,
                productName: product.name,
                quantity: "1",
                price: product.base_price
                    ? String(product.base_price)
                    : (product.cost_price ? String(product.cost_price) : "0"),
            };
            return { ...prev, items: [...prev.items, newItem] };
        });
        if (itemError) setItemError("");
    };

    const removeItemRow = (index) => {
        setFormData((prev) => {
            const nextItems = prev.items.filter((_, itemIndex) => itemIndex !== index);
            return { ...prev, items: nextItems };
        });
    };

    const handleCustomerSelect = (customer) => {
        if (!customer) return;
        setSelectedCustomer(customer);
        setFormData((prev) => ({ ...prev, customer_id: String(customer.id) }));
        setCustomerSearch(customer.name || customer.mobile_number || "");
        setCustomerOpen(false);
    };

    const buildPayload = () => {
        const items = formData.items.map((item) => ({
            product_id: parsePositiveInt(item.product_id),
            sku: String(item.sku || "").trim(),
            quantity: parsePositiveInt(item.quantity),
            price: String(item.price || "").trim(),
        }));

        return {
            branch_id: parsePositiveInt(formData.branch_id),
            customer_id: parsePositiveInt(formData.customer_id),
            status: formData.status || "PENDING",
            notes: String(formData.notes || "").trim(),
            items,
        };
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setErrors({});
        setItemError("");

        const payload = buildPayload();
        const nextErrors = {};

        if (!payload.branch_id) nextErrors.branch_id = ["Branch is required"];
        if (!payload.customer_id) nextErrors.customer_id = ["Customer is required"];

        if (isRestrictedRole && payload.branch_id) {
            const allowedBranches = new Set(branches.map((branch) => String(branch.id)));
            if (allowedBranches.size > 0 && !allowedBranches.has(String(payload.branch_id))) {
                nextErrors.branch_id = ["Select a branch assigned to your account"];
            }
        }

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            setSaving(false);
            return;
        }

        const hasInvalidItem = payload.items.some(
            (item) => !item.product_id || !item.sku || !item.quantity || !item.price
        );

        if (payload.items.length === 0 || hasInvalidItem) {
            setItemError("Each line item requires product SKU, quantity, and price.");
            setSaving(false);
            return;
        }

        try {
            const res = await supplierService.createSaleOrder(payload);
            toast.success("Sale order created");
            if (isEmbed && onComplete) {
                onComplete(res.data);
            } else {
                navigate(-1);
            }
        } catch (error) {
            const responseErrors = error?.response?.data;
            if (responseErrors && typeof responseErrors === "object") {
                setErrors(responseErrors);
                if (responseErrors.items) {
                    setItemError(getErrorText(responseErrors.items));
                }
            } else {
                toast.error(extractFirstError(error, "Failed to create sales order"));
            }
        } finally {
            setSaving(false);
        }
    };

    const inputClass = (name) =>
        `w-full rounded-xl input-icon-left pr-4 py-3 text-sm ${errors[name]
            ? "border-red-500 focus:ring-2 focus:ring-red-200"
            : "border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 outline-none transition-all"
        }`;

    const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2";

    const formContent = (
        <section className={`form-card ${isEmbed ? "" : "overflow-hidden"}`}>
            <header className="px-4 sm:px-6 md:px-8 py-5 sm:py-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                    <FaShoppingCart />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Create Sales Order</h1>
                    <p className="text-sm text-slate-500">
                        Fill in the branch, notes, and items for this new order.
                    </p>
                </div>
            </header>

            {loadingPage ? (
                <div className="p-10 flex items-center justify-center text-slate-500">
                    <FaSpinner className="animate-spin mr-2" />
                    Loading form details...
                </div>
            ) : (
                <form onSubmit={handleSubmit} className={`${isEmbed ? "p-3 space-y-4" : "p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8"}`}>
                    <div className={`grid grid-cols-1 ${isEmbed ? "md:grid-cols-12 gap-4" : "xl:grid-cols-12 gap-6"}`}>
                        <section className={`${isEmbed ? "md:col-span-5" : "xl:col-span-5"} rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 space-y-4`}>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Order Details</h2>

                            <div>
                                <label className={labelClass}>Branch <span className="text-red-500">*</span></label>
                                <div className="relative group">
                                    <FaCodeBranch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                                    <select
                                        name="branch_id"
                                        value={formData.branch_id}
                                        onChange={handleInputChange}
                                        disabled={isRestrictedRole && branches.length <= 1}
                                        className={`${inputClass("branch_id")} pl-11 ${isRestrictedRole && branches.length <= 1 ? "bg-slate-100" : ""}`}
                                        required
                                    >
                                        <option value="">Select branch</option>
                                        {branches.map((branch) => (
                                            <option key={branch.id} value={String(branch.id)}>
                                                {branch.branch_name || branch.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {getErrorText(errors.branch_id || errors.branch) && <p className="text-red-500 text-xs mt-2 font-medium">{getErrorText(errors.branch_id || errors.branch)}</p>}
                                {isRestrictedRole && branches.length === 0 && (
                                    <p className="text-red-500 text-xs mt-2 font-medium">No branch is assigned to your account.</p>
                                )}
                            </div>

                            <div>
                                <label className={labelClass}>Customer <span className="text-red-500">*</span></label>
                                <div className="relative" ref={customerWrapperRef}>
                                    <div className="relative group">
                                        <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                                        <input
                                            type="text"
                                            placeholder="Search customer by name or mobile..."
                                            value={customerSearch}
                                            onChange={(e) => {
                                                setCustomerSearch(e.target.value);
                                                setCustomerOpen(true);
                                                if (!e.target.value) {
                                                    setSelectedCustomer(null);
                                                    setFormData(prev => ({ ...prev, customer_id: "" }));
                                                }
                                            }}
                                            onFocus={() => setCustomerOpen(true)}
                                            className={`${inputClass("customer_id")} pl-11`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setCustomerOpen(!customerOpen)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                                        >
                                            <FaChevronDown className={`transition-transform duration-200 ${customerOpen ? "rotate-180" : ""}`} size={12} />
                                        </button>
                                    </div>

                                    {customerOpen && (
                                        <div className="absolute z-50 left-0 right-0 mt-2 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            <div className="max-h-[280px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                                {fetchingCustomers && customers.length === 0 ? (
                                                    <div className="p-4 text-center text-slate-500 text-xs font-medium flex items-center justify-center gap-2">
                                                        <FaSpinner className="animate-spin" /> Fetching customers...
                                                    </div>
                                                ) : customers.length === 0 ? (
                                                    <div className="p-4 text-center text-slate-400 text-xs font-medium">
                                                        No customers found
                                                    </div>
                                                ) : (
                                                    <>
                                                        {customers.map((cust) => (
                                                            <button
                                                                key={cust.id}
                                                                type="button"
                                                                onClick={() => handleCustomerSelect(cust)}
                                                                className={`w-full rounded-xl px-4 py-3 text-left transition-all flex items-center justify-between group ${String(formData.customer_id) === String(cust.id) ? "bg-brand-50 border-brand-100" : "hover:bg-slate-50"}`}
                                                            >
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className={`text-sm font-bold ${String(formData.customer_id) === String(cust.id) ? "text-brand-700" : "text-slate-700"}`}>
                                                                        {cust.name || "Unnamed Customer"}
                                                                    </span>
                                                                    <span className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                                                                        {cust.mobile_number || "No number"}
                                                                    </span>
                                                                </div>
                                                                {String(formData.customer_id) === String(cust.id) && (
                                                                    <div className="h-6 w-6 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-md">
                                                                        <FaSave size={10} />
                                                                    </div>
                                                                )}
                                                            </button>
                                                        ))}

                                                        {customerNext && (
                                                            <button
                                                                type="button"
                                                                disabled={loadingMoreCustomers}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    loadMoreCustomers();
                                                                }}
                                                                className="w-full rounded-xl py-3 text-brand-600 text-xs font-bold hover:bg-brand-50 transition flex items-center justify-center gap-2"
                                                            >
                                                                {loadingMoreCustomers ? <FaSpinner className="animate-spin" /> : "Load More Customers"}
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {getErrorText(errors.customer_id || errors.customer) && <p className="text-red-500 text-xs mt-2 font-medium">{getErrorText(errors.customer_id || errors.customer)}</p>}
                            </div>

                            <div>
                                <label className={labelClass}>Notes</label>
                                <div className="relative group">
                                    <FaAlignLeft className="absolute left-4 top-4 text-slate-400 group-focus-within:text-brand-600 transition" />
                                    <textarea
                                        rows={3}
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleInputChange}
                                        className={`${inputClass("notes")} pl-11`}
                                        placeholder="Optional notes for this order"
                                    />
                                </div>
                                {getErrorText(errors.notes) && <p className="text-red-500 text-xs mt-2 font-medium">{getErrorText(errors.notes)}</p>}
                            </div>
                        </section>

                        <section className={`${isEmbed ? "md:col-span-7" : "xl:col-span-7"} rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4`}>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Order Items</h2>
                                    <p className="text-xs text-slate-500 mt-1">Search and add products to the sales order</p>
                                </div>
                                <div className="w-full sm:w-[340px] max-w-full">
                                    <PurchaseOrderProductSearch
                                        onSelect={handleAddProduct}
                                        branchId={formData.branch_id}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                {formData.items.map((item, index) => (
                                    <div
                                        key={`item-${index}`}
                                        className={`border border-slate-200 rounded-xl p-3 sm:p-4 grid gap-3 bg-slate-50/50 ${isEmbed ? "grid-cols-2" : "grid-cols-1 md:grid-cols-12"}`}
                                    >
                                        <div className={isEmbed ? "col-span-2" : "md:col-span-5"}>
                                            <label className={`${labelClass} flex items-center gap-1.5`}>
                                                <FaBoxOpen className="text-slate-400" />
                                                Product
                                            </label>
                                            <div className="w-full min-h-[46px] rounded-xl px-4 py-3 text-sm border border-slate-200 bg-slate-50 text-slate-700 font-medium relative flex items-center">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="truncate">{item.productName || "Product"}</span>
                                                    <span className="text-[11px] text-slate-500 truncate">SKU: {item.sku || "-"}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={isEmbed ? "col-span-1" : "md:col-span-3"}>
                                            <label className={`${labelClass} flex items-center gap-1.5`}>
                                                <FaBoxOpen className="text-slate-400" />
                                                Quantity
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(event) => handleItemChange(index, "quantity", event.target.value)}
                                                className="w-full rounded-xl px-4 py-3 text-sm border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 outline-none transition-all"
                                                placeholder="Qty"
                                                required
                                            />
                                        </div>

                                        <div className={isEmbed ? "col-span-1" : "md:col-span-3"}>
                                            <label className={`${labelClass} flex items-center gap-1.5`}>
                                                <FaMoneyBillWave className="text-slate-400" />
                                                Price
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.price}
                                                onChange={(event) => handleItemChange(index, "price", event.target.value)}
                                                className="w-full rounded-xl px-4 py-3 text-sm border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 outline-none transition-all"
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>

                                        <div className={`flex items-end ${isEmbed ? "col-span-2 justify-end" : "md:col-span-1 md:justify-end"}`}>
                                            <button
                                                type="button"
                                                onClick={() => removeItemRow(index)}
                                                className={`h-11 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 inline-flex items-center justify-center transition-colors ${isEmbed ? "px-4 gap-2 text-xs font-bold uppercase tracking-wider w-full" : "w-full md:w-11"}`}
                                                title="Remove item"
                                            >
                                                <FaTrash />
                                                {isEmbed && <span>Remove Item</span>}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
                                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 sm:px-6 py-4 w-full sm:w-auto sm:min-w-[280px] flex justify-between items-center gap-4">
                                    <span className="text-slate-500 font-bold uppercase tracking-wider text-sm">Order Total</span>
                                    <span className="text-2xl font-bold text-slate-900">
                                        ₹{formData.items.reduce((sum, item) => sum + ((parsePositiveInt(item.quantity) || 0) * (parseFloat(item.price) || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            {itemError && <p className="text-red-500 text-xs font-medium">{itemError}</p>}
                        </section>
                    </div>

                    <div className="form-actions flex-col-reverse sm:flex-row">
                        <button
                            type="button"
                            onClick={() => {
                                if (isEmbed && onComplete) {
                                    onComplete(null);
                                } else {
                                    navigate(-1);
                                }
                            }}
                            className="btn-secondary w-full sm:w-auto text-center"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className={`btn-primary inline-flex items-center justify-center gap-2 w-full sm:w-auto ${saving ? "opacity-70 cursor-not-allowed" : ""}`}
                        >
                            <FaSave />
                            {saving ? "Saving..." : "Create Sales Order"}
                        </button>
                    </div>
                </form>
            )}
        </section>
    );

    if (isEmbed) return formContent;

    return (
        <div className="min-h-screen bg-transparent">
            <ProtectedHeader />

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">
                <BackButton label="Back" />

                <div className="max-w-6xl mx-auto">
                    {formContent}
                </div>
            </main>
        </div>
    );
}
