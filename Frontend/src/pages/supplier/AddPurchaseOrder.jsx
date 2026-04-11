import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    FaUsers,
} from "react-icons/fa";

import ProtectedHeader from "@/components/layout/ProtectedHeader";
import BackButton from "@/components/shared/BackButton";
import { branchService } from "@/features/business/services/branchService";
import { supplierService } from "@/features/supplier/services/supplierService";
import { tokenService } from "@/services/tokenService";
import PurchaseOrderProductSearch from "@/features/supplier/components/PurchaseOrderProductSearch";
import {
    extractFirstError,
    normalizeListPayload,
    parsePositiveInt,
} from "@/features/supplier/utils/supplierHelpers";

const STATUS_OPTIONS = ["PENDING", "DISPATCHED", "SHIPPED", "RECEIVED", "CANCELLED"];

const INITIAL_FORM = {
    supplier: "",
    branch_id: "",
    status: "PENDING",
    notes: "",
    items: [],
};

function getErrorText(value) {
    if (!value) return null;
    if (typeof value === "string") return value;
    // Use recursive extraction for objects/arrays to avoid React child crashes
    return extractFirstError({ data: value }, "Invalid input");
}

function resolveBranchId(branch) {
    if (!branch && branch !== 0) return null;
    if (typeof branch === "object") {
        return branch.id ?? branch.branch_id ?? null;
    }
    return branch;
}

function resolveAssignedBranches(profile, requiredWorkType = null) {
    if (!profile) return [];

    const roleStr = typeof profile?.role === 'object' ? profile.role.role : profile?.role;
    const isRestricted = roleStr === "EMPLOYEE" || roleStr === "MANAGER";

    const toBranchObject = (value, workType = null) => {
        if (!value && value !== 0) return null;

        const id = typeof value === "object" ? (value.id ?? value.branch_id) : value;
        if (!id && id !== 0) return null;

        // Filter by work type if restricted
        if (requiredWorkType && isRestricted) {
            const normalizedRequired = requiredWorkType.toUpperCase();
            const assignmentWorkType = (workType || (typeof value === 'object' ? value.work_type : null))?.toUpperCase();
            if (assignmentWorkType && assignmentWorkType !== normalizedRequired) {
                return null;
            }
        }

        const source = typeof value === "object" ? value : null;
        return {
            id: String(id),
            name: source?.name || source?.branch_name || source?.branch_details?.name || `Branch #${id}`,
            is_default: Boolean(source?.is_default),
        };
    };

    const collected = [];

    // 1. Primary: assigned_branches (new API structure)
    if (Array.isArray(profile.assigned_branches) && profile.assigned_branches.length > 0) {
        const allowedBranchIds = requiredWorkType && isRestricted
            ? new Set(
                (profile.assigned_works || []).filter(w => w.work_type?.toUpperCase() === requiredWorkType.toUpperCase()).map(w => String(w.branch_id))
            )
            : null;

        profile.assigned_branches.forEach(b => {
            if (allowedBranchIds && !allowedBranchIds.has(String(b.id))) return;
            const obj = toBranchObject(b);
            if (obj) collected.push(obj);
        });
    } else if (Array.isArray(profile.assigned_works)) {
        profile.assigned_works.forEach(w => {
            const b = toBranchObject(w.branch_id || w, w.work_type);
            if (b) collected.push(b);
        });
    }

    // 2. Legacy fallback
    if (collected.length === 0) {
        const legacyRaw = [
            ...(Array.isArray(profile.branches) ? profile.branches : []),
            ...(Array.isArray(profile.branch_ids) ? profile.branch_ids : []),
            ...(profile.branch ? [profile.branch] : []),
            ...(profile.branch_id ? [profile.branch_id] : [])
        ];
        legacyRaw.forEach(b => {
            const obj = toBranchObject(b);
            if (obj) collected.push(obj);
        });
    }

    const seen = new Set();
    return collected.filter((branch) => {
        if (seen.has(branch.id)) return false;
        seen.add(branch.id);
        return true;
    });
}

export default function AddPurchaseOrder() {
    const navigate = useNavigate();

    const { profile } = useSelector((state) => state.user);
    const userRole = String(typeof profile?.role === "object" ? profile?.role?.role : profile?.role || "").toUpperCase();
    const isRestrictedRole = userRole === "MANAGER" || userRole === "EMPLOYEE";
    const assignedBranches = useMemo(() => resolveAssignedBranches(profile, "SUPPLIER"), [profile]);

    const [vendors, setVendors] = useState([]);
    const [branches, setBranches] = useState([]);

    const [formData, setFormData] = useState(INITIAL_FORM);
    const [errors, setErrors] = useState({});
    const [itemError, setItemError] = useState("");

    const [loadingPage, setLoadingPage] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadInitialData = async () => {
            try {
                setLoadingPage(true);
                const [vendorRes, branchRes] = await Promise.all([
                    supplierService.getVendors(),
                    branchService.list(),
                ]);

                if (!isMounted) return;

                const vendorList = normalizeListPayload(vendorRes.data);
                const branchList = normalizeListPayload(branchRes.data);

                setVendors(vendorList);
                const accessibleBranches = (() => {
                    if (!isRestrictedRole) return branchList;
                    const assignedIds = new Set(assignedBranches.map((branch) => String(branch.id)));
                    const filtered = assignedIds.size > 0
                        ? branchList.filter((branch) => assignedIds.has(String(branch.id)))
                        : branchList;
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

                setFormData((prev) => ({ ...prev, branch_id: defaultBranch }));
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
            const exists = prev.items.find((i) => String(i.product) === String(product.id));
            if (exists) return prev;
            const newItem = {
                product: String(product.id),
                productName: product.name,
                quantity: "1",
                unit_cost: product.cost_price ? String(product.cost_price) : "0",
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

    const buildPayload = () => {
        const items = formData.items.map((item) => ({
            product_id: parsePositiveInt(item.product),
            quantity: parsePositiveInt(item.quantity),
            unit_cost: String(item.unit_cost || "").trim(),
        }));

        return {
            supplier_id: parsePositiveInt(formData.supplier),
            branch_id: parsePositiveInt(formData.branch_id),
            status: String(formData.status || "PENDING").trim() || "PENDING",
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

        if (!payload.supplier_id) nextErrors.supplier_id = ["Supplier is required"];
        if (!payload.branch_id) nextErrors.branch_id = ["Branch is required"];
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
            (item) => !item.product_id || !item.quantity || !item.unit_cost
        );

        if (payload.items.length === 0 || hasInvalidItem) {
            setItemError("Each line item requires product, quantity, and unit cost.");
            setSaving(false);
            return;
        }

        try {
            await supplierService.createPurchaseOrder({
                ...payload,
                items: payload.items.map((item) => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_cost: item.unit_cost,
                })),
            });
            toast.success("Purchase order created");
            navigate(-1);
        } catch (error) {
            const responseErrors = error?.response?.data;
            if (responseErrors && typeof responseErrors === "object") {
                setErrors(responseErrors);
                if (responseErrors.items) {
                    setItemError(getErrorText(responseErrors.items));
                }
            } else {
                toast.error(extractFirstError(error, "Failed to create purchase order"));
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

    return (
        <div className="min-h-screen bg-transparent">
            <ProtectedHeader />

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">
                <BackButton label="Back" />

                <div className="max-w-6xl mx-auto">
                    <section className="form-card overflow-hidden">
                        <header className="px-4 sm:px-6 md:px-8 py-5 sm:py-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                                <FaShoppingCart />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900">Create Purchase Order</h1>
                                <p className="text-sm text-slate-500">
                                    Fill in the supplier, branch, and items for this new order.
                                </p>
                            </div>
                        </header>

                        {loadingPage ? (
                            <div className="p-10 flex items-center justify-center text-slate-500">
                                <FaSpinner className="animate-spin mr-2" />
                                Loading form details...
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
                                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                                    <section className="xl:col-span-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 space-y-4">
                                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Order Details</h2>

                                        <div>
                                            <label className={labelClass}>Supplier <span className="text-red-500">*</span></label>
                                            <div className="relative group">
                                                <FaUsers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                                                <select
                                                    name="supplier"
                                                    value={formData.supplier}
                                                    onChange={handleInputChange}
                                                    className={`${inputClass("supplier")} pl-11`}
                                                    required
                                                >
                                                    <option value="">Select supplier</option>
                                                    {vendors.map((vendor) => (
                                                        <option key={vendor.id} value={vendor.id}>
                                                            {vendor.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            {getErrorText(errors.supplier) && <p className="text-red-500 text-xs mt-2 font-medium">{getErrorText(errors.supplier)}</p>}
                                        </div>

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
                                            <label className={labelClass}>Status</label>
                                            <div className="relative group">
                                                <FaShoppingCart className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                                                <select
                                                    name="status"
                                                    value={formData.status}
                                                    onChange={handleInputChange}
                                                    className={`${inputClass("status")} pl-11`}
                                                >
                                                    {STATUS_OPTIONS.map((status) => (
                                                        <option key={status} value={status}>
                                                            {status}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            {getErrorText(errors.status) && <p className="text-red-500 text-xs mt-2 font-medium">{getErrorText(errors.status)}</p>}
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

                                    <section className="xl:col-span-7 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div>
                                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Order Items</h2>
                                                <p className="text-xs text-slate-500 mt-1">Search and add products to the purchase order</p>
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
                                                    className="border border-slate-200 rounded-xl p-3 sm:p-4 grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50/50"
                                                >
                                                    <div className="md:col-span-5">
                                                        <label className={`${labelClass} flex items-center gap-1.5`}>
                                                            <FaBoxOpen className="text-slate-400" />
                                                            Product
                                                        </label>
                                                        <div className="w-full min-h-[46px] rounded-xl px-4 py-3 text-sm border border-slate-200 bg-slate-50 text-slate-700 font-medium relative flex items-center">
                                                            <span className="truncate">{item.productName || "Product"}</span>
                                                        </div>
                                                    </div>

                                                    <div className="md:col-span-3">
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

                                                    <div className="md:col-span-3">
                                                        <label className={`${labelClass} flex items-center gap-1.5`}>
                                                            <FaMoneyBillWave className="text-slate-400" />
                                                            Unit Cost
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.unit_cost}
                                                            onChange={(event) => handleItemChange(index, "unit_cost", event.target.value)}
                                                            className="w-full rounded-xl px-4 py-3 text-sm border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 outline-none transition-all"
                                                            placeholder="0.00"
                                                            required
                                                        />
                                                    </div>

                                                    <div className="md:col-span-1 flex items-end md:justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItemRow(index)}
                                                            className="h-11 w-full md:w-11 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 inline-flex items-center justify-center transition-colors"
                                                            title="Remove item"
                                                        >
                                                            <FaTrash />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
                                            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 sm:px-6 py-4 w-full sm:w-auto sm:min-w-[280px] flex justify-between items-center gap-4">
                                                <span className="text-slate-500 font-bold uppercase tracking-wider text-sm">Order Total</span>
                                                <span className="text-2xl font-bold text-slate-900">
                                                    ₹{formData.items.reduce((sum, item) => sum + ((parsePositiveInt(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>

                                        {itemError && <p className="text-red-500 text-xs font-medium">{itemError}</p>}
                                    </section>
                                </div>

                                <div className="form-actions flex-col-reverse sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={() => navigate(-1)}
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
                                        {saving ? "Saving..." : "Create Purchase Order"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
