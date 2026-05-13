import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
    FaPercent,
    FaEdit
} from "react-icons/fa";

import ProtectedHeader from "@/components/layout/ProtectedHeader";
import BackButton from "@/components/shared/BackButton";
import { branchService } from "@/features/business/services/branchService";
import { supplierService } from "@/features/supplier/services/supplierService";
import PurchaseOrderProductSearch from "@/features/supplier/components/PurchaseOrderProductSearch";
import {
    extractFirstError,
    normalizeListPayload,
    parsePositiveInt,
} from "@/features/supplier/utils/supplierHelpers";
import { getAssignedBranchesForWork, filterBranchesForRole } from "@/utils/branchFilter";

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
    if (Array.isArray(value)) return value[0];
    return String(value);
}

export default function EditPurchaseOrder() {
    const navigate = useNavigate();
    const { id } = useParams();

    const { profile } = useSelector((state) => state.user);
    const userRole = String(typeof profile?.role === "object" ? profile?.role?.role : profile?.role || "").toUpperCase();
    const isRestrictedRole = userRole === "MANAGER" || userRole === "EMPLOYEE";
    
    const assignedBranches = useMemo(
        () => getAssignedBranchesForWork(profile, 'SUPPLIER'),
        [profile]
    );

    const [vendors, setVendors] = useState([]);
    const [branches, setBranches] = useState([]);

    const [formData, setFormData] = useState(INITIAL_FORM);
    const [originalData, setOriginalData] = useState(null);
    const [errors, setErrors] = useState({});
    const [itemError, setItemError] = useState("");

    const [loadingPage, setLoadingPage] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadInitialData = async () => {
            if (!id) {
                navigate(-1);
                return;
            }

            try {
                setLoadingPage(true);
                const [vendorRes, branchRes, orderRes] = await Promise.all([
                    supplierService.getVendors(),
                    branchService.list(),
                    supplierService.getPurchaseOrderById(id),
                ]);

                if (!isMounted) return;

                const vendorList = normalizeListPayload(vendorRes.data);
                const branchData = normalizeListPayload(branchRes.data);
                const order = orderRes?.data || {};

                setVendors(vendorList);
                
                const accessibleBranches = (() => {
                    if (!isRestrictedRole) return branchData;
                    const filtered = filterBranchesForRole(branchData, assignedBranches);
                    return filtered.length > 0 ? filtered : assignedBranches;
                })();

                setBranches(accessibleBranches);

                const preferredBranch = accessibleBranches.find((branch) => branch.is_default) || accessibleBranches[0];
                const defaultBranch = preferredBranch ? String(preferredBranch.id) : "";
                const orderBranchId = String(order?.branch?.id ?? order?.branch_id ?? order?.branch ?? "");
                const isOrderBranchAllowed = accessibleBranches.some((branch) => String(branch.id) === orderBranchId);
                const resolvedBranchId = isRestrictedRole
                    ? (isOrderBranchAllowed ? orderBranchId : defaultBranch)
                    : (orderBranchId || defaultBranch);

                const mappedItems = (Array.isArray(order.items) ? order.items : []).map((item) => {
                    const productObj = item?.product_details || item?.product || {};
                    return {
                        product: String(productObj?.id ?? item?.product_id ?? ""),
                        productName: productObj?.name || "Product",
                        quantity: String(item?.quantity ?? "1"),
                        unit_cost: String(item?.unit_cost ?? ""),
                        tax_rate: String(item?.tax_rate ?? "0.00"),
                    };
                });

                const initialForm = {
                    supplier: String(order?.supplier?.id ?? order?.supplier ?? ""),
                    branch_id: resolvedBranchId,
                    status: order?.status || "PENDING",
                    notes: order?.notes || "",
                    items: mappedItems,
                };

                setFormData(initialForm);

                setOriginalData({
                    supplier: parsePositiveInt(initialForm.supplier),
                    branch: parsePositiveInt(initialForm.branch_id),
                    status: String(initialForm.status || "PENDING").trim() || "PENDING",
                    notes: String(initialForm.notes || "").trim(),
                    items: initialForm.items.map((item) => ({
                        product_id: parsePositiveInt(item.product),
                        quantity: parsePositiveInt(item.quantity),
                        unit_cost: String(item.unit_cost || "").trim(),
                        tax_rate: String(item.tax_rate || "0.00").trim(),
                    })),
                });
            } catch (error) {
                toast.error(extractFirstError(error, "Failed to load purchase order form data"));
                navigate(-1);
            } finally {
                if (isMounted) setLoadingPage(false);
            }
        };

        loadInitialData();

        return () => {
            isMounted = false;
        };
    }, [assignedBranches, id, isRestrictedRole, navigate]);

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
            const exists = prev.items.find((item) => String(item.product) === String(product.id));
            if (exists) return prev;

            const newItem = {
                product: String(product.id),
                productName: product.name,
                quantity: "1",
                unit_cost: product.cost_price ? String(product.cost_price) : "0",
                tax_rate: product.input_gst_rate ? String(product.input_gst_rate) : "0.00",
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

    const calculateTotals = () => {
        let subtotal = 0;
        let tax = 0;
        formData.items.forEach(item => {
            const q = Number(item.quantity) || 0;
            const c = Number(item.unit_cost) || 0;
            const r = Number(item.tax_rate) || 0;
            const lineSub = q * c;
            const lineTax = (lineSub * r) / 100;
            subtotal += lineSub;
            tax += lineTax;
        });
        return { subtotal, tax, total: subtotal + tax };
    };

    const { subtotal, tax, total } = calculateTotals();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setErrors({});
        setItemError("");

        const items = formData.items.map((item) => ({
            product_id: parsePositiveInt(item.product),
            quantity: parsePositiveInt(item.quantity),
            unit_cost: String(item.unit_cost || "").trim(),
            tax_rate: String(item.tax_rate || "0").trim(),
        }));

        const requestPayload = {
            supplier: parsePositiveInt(formData.supplier),
            branch: parsePositiveInt(formData.branch_id),
            status: String(formData.status || "PENDING").trim() || "PENDING",
            notes: String(formData.notes || "").trim(),
            items,
        };

        try {
            await supplierService.updatePurchaseOrder(id, requestPayload);
            toast.success("Purchase order updated successfully");
            navigate(-1);
        } catch (error) {
            const responseErrors = error?.response?.data;
            if (responseErrors && typeof responseErrors === "object") {
                setErrors(responseErrors);
                if (responseErrors.items) {
                    setItemError(getErrorText(responseErrors.items));
                }
            } else {
                toast.error(extractFirstError(error, "Failed to update purchase order"));
            }
        } finally {
            setSaving(false);
        }
    };

    const inputClass = (name) =>
        `w-full rounded-2xl border px-4 py-3.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all ${errors[name]
            ? "border-rose-400 bg-rose-50"
            : "border-slate-100 bg-slate-50 focus:border-slate-900 focus:bg-white shadow-sm"
        }`;

    const labelClass = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1";

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <ProtectedHeader />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
                <BackButton label="Back to Orders" />

                <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                    <header className="px-8 sm:px-10 py-8 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200">
                                <FaEdit className="text-xl" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Edit Purchase Order #{id}</h1>
                                <p className="text-sm font-medium text-slate-500">Update procurement and tax configuration</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-6 bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
                             <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Grand Total</p>
                                <p className="text-2xl font-black text-slate-900 tabular-nums">₹{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                             </div>
                        </div>
                    </header>

                    {loadingPage ? (
                        <div className="p-20 flex flex-col items-center justify-center text-slate-400 gap-4">
                            <FaSpinner className="animate-spin text-3xl text-slate-900" />
                            <p className="font-bold text-xs uppercase tracking-widest">Retrieving Order Data...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-8 sm:p-10 space-y-10">
                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                                <section className="xl:col-span-4 space-y-8">
                                    <div className="space-y-6">
                                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] border-l-4 border-slate-900 pl-4">Order Meta</h3>
                                        
                                        <div>
                                            <label className={labelClass}>Vendor / Supplier</label>
                                            <div className="relative">
                                                <select
                                                    name="supplier"
                                                    value={formData.supplier}
                                                    onChange={handleInputChange}
                                                    className={`${inputClass("supplier")} appearance-none cursor-pointer`}
                                                    required
                                                >
                                                    <option value="">Select Vendor</option>
                                                    {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                                                </select>
                                                <FaUsers className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className={labelClass}>Receiving Branch</label>
                                            <div className="relative">
                                                <select
                                                    name="branch_id"
                                                    value={formData.branch_id}
                                                    onChange={handleInputChange}
                                                    className={`${inputClass("branch_id")} appearance-none cursor-pointer`}
                                                    required
                                                >
                                                    <option value="">Select Branch</option>
                                                    {branches.map((b) => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                                                </select>
                                                <FaCodeBranch className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className={labelClass}>Execution Status</label>
                                            <div className="relative">
                                                <select
                                                    name="status"
                                                    value={formData.status}
                                                    onChange={handleInputChange}
                                                    className={`${inputClass("status")} appearance-none cursor-pointer`}
                                                >
                                                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-sky-500 shadow-sm shadow-sky-200"></div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className={labelClass}>Purchase Notes</label>
                                            <textarea
                                                rows={3}
                                                name="notes"
                                                value={formData.notes}
                                                onChange={handleInputChange}
                                                className={`${inputClass("notes")} resize-none`}
                                                placeholder="Instructions for the supplier..."
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="xl:col-span-8 space-y-8">
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] border-l-4 border-slate-900 pl-4">Inventory Items</h3>
                                            <div className="w-64">
                                                <PurchaseOrderProductSearch
                                                    onSelect={handleAddProduct}
                                                    branchId={formData.branch_id}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {formData.items.map((item, index) => {
                                                const lineSub = (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0);
                                                const lineTax = (lineSub * (Number(item.tax_rate) || 0)) / 100;
                                                const lineTotal = lineSub + lineTax;

                                                return (
                                                    <div key={`item-${index}`} className="group relative bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:border-slate-200 transition-all duration-300">
                                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                                            <div className="md:col-span-5">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">1. Product Information</p>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-900 border border-slate-100">
                                                                        <FaBoxOpen size={16} />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="font-black text-slate-900 text-sm truncate">{item.productName}</p>
                                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Line Total:</span>
                                                                            <span className="text-[10px] font-black text-slate-900 tabular-nums">₹{lineTotal.toFixed(2)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="md:col-span-7 grid grid-cols-4 gap-4">
                                                                <div>
                                                                    <label className={labelClass}>1. Quantity</label>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={item.quantity}
                                                                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-black text-slate-900 focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all tabular-nums text-center shadow-sm"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className={labelClass}>2. Unit Cost</label>
                                                                    <div className="relative">
                                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">₹</span>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            value={item.unit_cost}
                                                                            onChange={(e) => handleItemChange(index, "unit_cost", e.target.value)}
                                                                            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-6 pr-3 py-2.5 text-sm font-black text-slate-900 focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all tabular-nums text-right shadow-sm"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className={labelClass}>3. GST Rate %</label>
                                                                    <div className="relative group">
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            value={item.tax_rate}
                                                                            onChange={(e) => handleItemChange(index, "tax_rate", e.target.value)}
                                                                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-black text-slate-900 focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all tabular-nums text-center shadow-sm"
                                                                        />
                                                                        <FaPercent className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-slate-400" />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className={labelClass}>4. GST Amount</label>
                                                                    <div className="h-[42px] flex items-center justify-end px-4 bg-slate-900 rounded-xl shadow-lg shadow-slate-900/10 border border-slate-800">
                                                                        <span className="text-white/40 font-bold text-[10px] mr-1.5">₹</span>
                                                                        <span className="text-white font-black text-xs tabular-nums tracking-tight">{lineTax.toFixed(2)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => removeItemRow(index)}
                                                            className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white border border-slate-100 text-slate-300 hover:text-rose-600 shadow-sm flex items-center justify-center transition-all hover:scale-110 active:scale-90"
                                                        >
                                                            <FaTrash size={10} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        
                                        {itemError && <p className="text-rose-600 text-[10px] font-bold uppercase tracking-widest text-center mt-4">{itemError}</p>}
                                    </div>
                                </section>
                            </div>

                            <div className="pt-10 flex flex-col sm:flex-row items-center justify-between gap-8 border-t border-slate-100">
                                <div className="flex items-center gap-10">
                                    <div className="text-slate-400">
                                        <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Subtotal (Net)</p>
                                        <p className="text-lg font-bold text-slate-600 tabular-nums">₹{subtotal.toLocaleString()}</p>
                                    </div>
                                    <div className="text-slate-400">
                                        <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Tax Amount</p>
                                        <p className="text-lg font-bold text-indigo-600 tabular-nums">+ ₹{tax.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => navigate(-1)}
                                        className="flex-1 sm:flex-none px-10 py-4 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all"
                                    >
                                        Discard Changes
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-[2] sm:flex-none min-w-[240px] bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95 disabled:opacity-50"
                                    >
                                        {saving ? "Updating..." : "Commit Update"}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
}
