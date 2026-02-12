import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { invoiceService } from "@/features/invoice/services/invoiceService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import BackButton from "@/components/shared/BackButton";

import {
    FaUser,
    FaPhone,
    FaEnvelope,
    FaMapMarkerAlt,
    FaMoneyBillWave,
    FaVenusMars,
    FaBirthdayCake,
    FaFileInvoiceDollar,
    FaCreditCard,
    FaWallet
} from "react-icons/fa";

// Lazy Imports
const InvoiceItems = lazy(() => import("@/features/invoice/components/InvoiceItems"));
const PaymentModal = lazy(() => import("@/features/payment/components/PaymentModal"));

export default function AddInvoice() {
    const navigate = useNavigate();

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

    const fetchCustomerByMobileNumber = async (mobile) => {
        if (mobile.length !== 10) return;

        try {
            const res = await invoiceService.checkCustomer(mobile);
            if (res.data?.exists) {
                setCustomer(res.data.customer);
                toast.success("Customer found");
            }
        } catch {
            toast.error("Customer not found");
        }
    };

    const handleSubmit = async () => {
        if (
            !customer.name ||
            !customer.mobile_number ||
            !customer.address ||
            !customer.age ||
            !customer.gender
        ) {
            toast.error("Please complete customer details");
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
        try {
            const res = await invoiceService.create({
                items: items.map(({ productId, quantity }) => ({
                    productId,
                    quantity,
                })),
                payment_mode: paymentMode,
                ...customer,
                age: Number(customer.age),
            });

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
            if (errorData?.details) {
                toast.error(errorData.details);
            } else if (typeof errorData === "string") {
                toast.error(errorData);
            } else {
                toast.error("Invoice creation failed");
            }
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
                        <div className="hidden sm:flex gap-3">
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
                                        Customer Details
                                    </h2>
                                </div>

                                <div className="p-6 space-y-5">
                                    {/* Mobile */}
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 uppercase mb-1.5 block">Mobile Number <span className="text-red-500">*</span></label>
                                        <div className="relative group">
                                            <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition" />
                                            <input
                                                className={inputClass}
                                                value={customer.mobile_number}
                                                placeholder="10-digit number"
                                                maxLength={10}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setCustomer({ ...customer, mobile_number: val });
                                                    fetchCustomerByMobileNumber(val);
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
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
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
                                <InvoiceItems items={items} setItems={setItems} />
                            </Suspense>
                        </div>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-3 sm:hidden">
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
