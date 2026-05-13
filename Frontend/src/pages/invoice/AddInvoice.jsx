import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { invoiceService } from "@/features/invoice/services/invoiceService";
import { branchService } from "@/features/business/services/branchService";
import { tokenService } from "@/services/tokenService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import BackButton from "@/components/shared/BackButton";

import {
    FaUser,
    FaPhone,
    FaEnvelope,
    FaMapMarkerAlt,
    FaVenusMars,
    FaBirthdayCake,
    FaFileInvoiceDollar,
    FaCreditCard,
    FaWallet,
    FaCodeBranch
} from "react-icons/fa";
import { getAssignedBranchesForWork, filterBranchesForRole } from "@/utils/branchFilter";

// Lazy Imports
const InvoiceItems = lazy(() => import("@/features/invoice/components/InvoiceItems"));
const PaymentModal = lazy(() => import("@/features/payment/components/PaymentModal"));

export default function AddInvoice() {
    const navigate = useNavigate();
    const { profile } = useSelector((state) => state.user);
    const userRole = String(typeof profile?.role === "object" ? profile?.role?.role : profile?.role || "").toUpperCase();
    const isRestrictedRole = userRole === "MANAGER" || userRole === "EMPLOYEE";
    
    const assignedBranches = useMemo(
        () => getAssignedBranchesForWork(profile, 'INVOICE'),
        [profile]
    );

    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState("");
    const [fetchingBranches, setFetchingBranches] = useState(false);

    const sanitizeMobileNumber = (value) =>
        String(value ?? "").replace(/\D/g, "").slice(0, 10);

    const [customer, setCustomer] = useState({
        name: "",
        mobile_number: "",
        email: "",
        address: "",
        age: "",
        gender: "",
    });

    const [items, setItems] = useState([]);
    const [paymentMode, setPaymentMode] = useState("CASH");
    const [loading, setLoading] = useState(false);
    const [createdInvoice, setCreatedInvoice] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [errors, setErrors] = useState({});

    /* ---------------- Fetch Branches ---------------- */
    useEffect(() => {
        async function fetchBranches() {
            setFetchingBranches(true);
            try {
                const res = await branchService.list();
                const branchData = Array.isArray(res.data) ? res.data : (res.data?.results || []);

                if (isRestrictedRole) {
                    const visibleBranches = filterBranchesForRole(branchData, assignedBranches);
                    const resolvedBranches = visibleBranches.length > 0 ? visibleBranches : assignedBranches;

                    if (resolvedBranches.length > 0) {
                        const defaultId = tokenService.getDefaultBranchId();
                        const preSelected = defaultId
                            ? resolvedBranches.find(b => String(b.id) === String(defaultId))
                            : (resolvedBranches.find((b) => b.is_default) || resolvedBranches[0]);

                        const finalBranch = preSelected || (resolvedBranches.find((b) => b.is_default) || resolvedBranches[0]);
                        setSelectedBranch(finalBranch ? String(finalBranch.id) : "");
                    } else {
                        setSelectedBranch("");
                    }
                    setBranches(resolvedBranches);
                    return;
                }

                setBranches(branchData);
                setSelectedBranch((prev) => {
                    if (prev && branchData.some((branch) => String(branch.id) === String(prev))) {
                        return prev;
                    }
                    const mainBranch = branchData.find((branch) => branch.is_default) || branchData[0];
                    return mainBranch ? String(mainBranch.id) : "";
                });
            } catch (err) {
                console.error("Failed to fetch branches", err);
            } finally {
                setFetchingBranches(false);
            }
        }
        fetchBranches();
    }, [isRestrictedRole, assignedBranches]);

    /* ---------------- Side Effects ---------------- */
    useEffect(() => {
        setItems([]);
        if (customer.mobile_number.length === 10) {
            fetchCustomerByMobileNumber(customer.mobile_number, selectedBranch);
        }
        if (errors.branch_id) {
            setErrors(prev => ({ ...prev, branch_id: null }));
        }
    }, [selectedBranch]);

    const fetchCustomerByMobileNumber = async (mobile, branchId) => {
        if (mobile.length !== 10) {
            setCustomer(prev => ({
                ...prev,
                name: "",
                email: "",
                address: "",
                age: "",
                gender: "",
            }));
            return;
        }

        try {
            const res = await invoiceService.checkCustomer(mobile, branchId);
            const customerData = res.data?.results?.[0];

            if (customerData) {
                setCustomer({
                    ...customerData,
                    gender: customerData.gender ? String(customerData.gender).toUpperCase() : ""
                });
                toast.success("Customer found");
            } else {
                setCustomer(prev => ({
                    ...prev,
                    name: "",
                    email: "",
                    address: "",
                    age: "",
                    gender: "",
                }));
            }
        } catch {
            // Silently fail
        }
    };

    const handleSubmit = async () => {
        if (!selectedBranch) {
            toast.error("Please select a branch");
            return;
        }

        if (
            !customer.name ||
            !customer.mobile_number
        ) {
            toast.error("Please complete customer details");
            return;
        }

        if (sanitizeMobileNumber(customer.mobile_number).length !== 10) {
            toast.error("Mobile number must be exactly 10 digits");
            return;
        }

        if (!items.length) {
            toast.error("Add at least one product");
            return;
        }

        const invalidQty = items.some((i) => !i.quantity || i.quantity <= 0);
        if (invalidQty) {
            toast.error("Quantity must be greater than 0");
            return;
        }

        setLoading(true);
        setErrors({});
        try {
            const payload = {
                branch_id: Number(selectedBranch),
                customer: {
                    name: String(customer.name || "").trim(),
                    mobile_number: String(customer.mobile_number || "").trim(),
                    gender: customer.gender ? String(customer.gender).toUpperCase() : null,
                    age: customer.age ? Number(customer.age) : null,
                    email: customer.email ? String(customer.email).trim() : "",
                },
                invoice_items: items.map(({ productId, quantity }) => ({
                    product_id: Number(productId),
                    quantity: Number(quantity),
                })),
                payment_mode: String(paymentMode || "CASH").toUpperCase(),
            };

            console.log("DEBUG: Sending invoice payload:", payload);
            const res = await invoiceService.create(payload);
            console.log("DEBUG: Invoice creation response:", res.data);

            if (paymentMode === "ONLINE") {
                setCreatedInvoice(res.data);
                setShowPaymentModal(true);
                toast.success("Invoice created. Proceed to payment.");
            } else {
                toast.success("Invoice created successfully");
                navigate(-1);
            }
        } catch (err) {
            const errorData = err?.response?.data;
            if (errorData && typeof errorData === 'object' && !Array.isArray(errorData)) {
                setErrors(errorData);
            }
            const errorMsg = errorData?.detail ||
                errorData?.non_field_errors?.[0] ||
                errorData?.branch_id?.[0] ||
                "Invoice creation failed";
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full rounded-xl border border-slate-200 input-icon-left pr-4 py-3 text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all";

    return (
        <div className="min-h-screen bg-transparent">
            <div className="pb-24 sm:pb-10">
                <ProtectedHeader />

                <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
                    <div>
                        <BackButton />
                    </div>
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                                <div className="p-2 bg-slate-900 rounded-lg text-white shadow-sm">
                                    <FaFileInvoiceDollar className="text-xl" />
                                </div>
                                Create Invoice
                            </h1>
                            <p className="text-slate-500 mt-2 font-medium">Generate a new invoice for customer</p>
                        </div>
                        {/* Desktop Actions */}
                        <div className="hidden md:flex gap-3">
                            <button
                                onClick={() => navigate(-1)}
                                className="bg-white border border-slate-200 px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className={`px-8 py-2.5 rounded-xl text-white font-semibold shadow-sm transition-all active:scale-95 flex items-center gap-2 ${loading
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-slate-900 hover:bg-slate-800"
                                    }`}
                            >
                                {loading ? "Creating..." : "Create Invoice"}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* LEFT COLUMN: Customer Details */}
                        <div className="lg:col-span-1 space-y-6">
                            <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm sticky top-24">
                                <div className="p-6 border-b border-slate-200 bg-slate-50">
                                    <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
                                        <FaUser className="text-slate-900" />
                                    </h2>
                                </div>

                                <div className="p-6 space-y-5">
                                    {(userRole === "OWNER" || isRestrictedRole) && (
                                        <div>
                                            <label className="text-xs font-semibold text-slate-700 uppercase mb-1.5 block">Branch <span className="text-red-500">*</span></label>
                                            <div className="relative group">
                                                <FaCodeBranch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition z-10" />
                                                <select
                                                    className={`${inputClass} appearance-none bg-transparent`}
                                                    value={selectedBranch}
                                                    onChange={(e) => setSelectedBranch(e.target.value)}
                                                    disabled={fetchingBranches || (isRestrictedRole && branches.length <= 1)}
                                                >
                                                    <option value="">Select Branch</option>
                                                    {branches.map(b => (
                                                        <option key={b.id} value={b.id}>{b.name || b.branch_name} {b.is_default ? "(Main)" : ""}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {errors.branch_id && (
                                                <p className="mt-2 text-xs font-medium text-rose-600">
                                                    {errors.branch_id[0]}
                                                </p>
                                            )}
                                            {isRestrictedRole && !fetchingBranches && branches.length === 0 && (
                                                <p className="mt-2 text-xs font-medium text-rose-600">
                                                    No branch is assigned to your account.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Mobile */}
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 uppercase mb-1.5 block">Mobile Number <span className="text-red-500">*</span></label>
                                        <div className="relative group">
                                            <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition" />
                                            <input
                                                className={inputClass}
                                                type="tel"
                                                inputMode="numeric"
                                                autoComplete="tel-national"
                                                pattern="[0-9]{10}"
                                                value={customer.mobile_number}
                                                placeholder="10-digit number"
                                                maxLength={10}
                                                onChange={(e) => {
                                                    const val = sanitizeMobileNumber(e.target.value);
                                                    setCustomer({ ...customer, mobile_number: val });
                                                    fetchCustomerByMobileNumber(val, selectedBranch);
                                                }}
                                                onPaste={(e) => {
                                                    e.preventDefault();
                                                    const pasted = e.clipboardData.getData("text");
                                                    const val = sanitizeMobileNumber(pasted);
                                                    setCustomer({ ...customer, mobile_number: val });
                                                    fetchCustomerByMobileNumber(val, selectedBranch);
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Name */}
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 uppercase mb-1.5 block">Full Name <span className="text-red-500">*</span></label>
                                        <div className="relative group">
                                            <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition" />
                                            <input
                                                className={inputClass}
                                                value={customer.name}
                                                placeholder="Customer Name"
                                                onChange={(e) =>
                                                    setCustomer({ ...customer, name: e.target.value })
                                                }
                                            />
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 uppercase mb-1.5 block">Email</label>
                                        <div className="relative group">
                                            <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition" />
                                            <input
                                                className={inputClass}
                                                value={customer.email}
                                                placeholder="Optional"
                                                type="email"
                                                onChange={(e) =>
                                                    setCustomer({ ...customer, email: e.target.value })
                                                }
                                            />
                                        </div>
                                    </div>

                                    {/* Address */}
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 uppercase mb-1.5 block">Address <span className="text-red-500">*</span></label>
                                        <div className="relative group">
                                            <FaMapMarkerAlt className="absolute left-3 top-4 text-slate-400 group-focus-within:text-slate-600 transition" />
                                            <textarea
                                                className="w-full rounded-xl border border-slate-200 input-icon-left pr-4 py-3 text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all resize-none"
                                                value={customer.address}
                                                placeholder="Billing Address"
                                                rows={2}
                                                onChange={(e) =>
                                                    setCustomer({ ...customer, address: e.target.value })
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Age */}
                                        <div>
                                            <label className="text-xs font-semibold text-slate-700 uppercase mb-1.5 block">Age <span className="text-red-500">*</span></label>
                                            <div className="relative group">
                                                <FaBirthdayCake className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition" />
                                                <input
                                                    type="number"
                                                    className={inputClass}
                                                    value={customer.age}
                                                    placeholder="Age"
                                                    onChange={(e) =>
                                                        setCustomer({ ...customer, age: e.target.value })
                                                    }
                                                />
                                            </div>
                                        </div>

                                        {/* Gender */}
                                        <div>
                                            <label className="text-xs font-semibold text-slate-700 uppercase mb-1.5 block">Gender <span className="text-red-500">*</span></label>
                                            <div className="relative group">
                                                <FaVenusMars className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition z-0" />
                                                <select
                                                    className={`${inputClass} appearance-none bg-transparent`}
                                                    value={customer.gender}
                                                    onChange={(e) =>
                                                        setCustomer({ ...customer, gender: e.target.value })
                                                    }
                                                >
                                                    <option value="">Select</option>
                                                    <option value="MALE">Male</option>
                                                    <option value="FEMALE">Female</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment Mode Selection */}
                                    <div className="pt-4 border-t border-slate-200">
                                        <label className="text-xs font-semibold text-slate-700 uppercase mb-3 block">Payment Method</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setPaymentMode("CASH")}
                                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${paymentMode === "CASH"
                                                    ? "border-slate-900 bg-slate-900 text-white"
                                                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                                                    }`}
                                            >
                                                <FaWallet className="text-xl" />
                                                <span className="text-xs font-semibold">Cash</span>
                                            </button>
                                            <button
                                                onClick={() => setPaymentMode("ONLINE")}
                                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${paymentMode === "ONLINE"
                                                    ? "border-slate-900 bg-slate-900 text-white"
                                                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                                                    }`}
                                            >
                                                <FaCreditCard className="text-xl" />
                                                <span className="text-xs font-semibold">Online</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* RIGHT COLUMN: Items */}
                        <div className="lg:col-span-2 space-y-6">
                            <Suspense fallback={
                                <div className="bg-white border border-slate-200 rounded-2xl p-8 h-64 flex items-center justify-center shadow-sm">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                                        <span className="text-slate-400 text-sm">Loading products...</span>
                                    </div>
                                </div>
                            }>
                                <InvoiceItems items={items} setItems={setItems} branchId={selectedBranch} />
                            </Suspense>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Actions */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-3 md:hidden">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex-1 bg-white border border-slate-200 px-4 py-3 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`flex-1 px-4 py-3 rounded-xl text-white font-semibold shadow-sm transition-all active:scale-95 ${loading
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-slate-900 hover:bg-slate-800"
                            }`}
                    >
                        {loading ? "Creating..." : "Create"}
                    </button>
                </div>
            </div>

            <Suspense fallback={null}>
                <PaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => {
                        setShowPaymentModal(false);
                        navigate(-1);
                    }}
                    invoiceId={createdInvoice?.id}
                    amount={createdInvoice?.total_amount}
                />
            </Suspense>
        </div >
    );
}
