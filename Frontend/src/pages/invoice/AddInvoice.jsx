import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { invoiceService } from "@/features/invoice/services/invoiceService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";

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
            toast.error(err?.response?.data || "Invoice failed");
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all shadow-sm";

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="pb-10">
                <ProtectedHeader />

                <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-500/30">
                                    <FaFileInvoiceDollar className="text-xl" />
                                </div>
                                Create Invoice
                            </h1>
                            <p className="text-gray-500 mt-2 font-medium">Generate a new invoice for customer</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate(-1)}
                                className="px-6 py-2.5 rounded-xl font-semibold text-gray-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className={`px-8 py-2.5 rounded-xl text-white font-bold shadow-lg shadow-blue-500/30 transition-all transform active:scale-95 flex items-center gap-2 ${loading
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                                    }`}
                            >
                                {loading ? "Creating..." : "Create Invoice"}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* LEFT COLUMN: Customer Details */}
                        <div className="lg:col-span-1 space-y-6">
                            <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden sticky top-24">
                                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                                    <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                                        <FaUser className="text-blue-500" />
                                        Customer Details
                                    </h2>
                                </div>

                                <div className="p-6 space-y-5">
                                    {/* Mobile */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-700 uppercase mb-1.5 block">Mobile Number <span className="text-red-500">*</span></label>
                                        <div className="relative group">
                                            <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition" />
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
                                        <label className="text-xs font-bold text-gray-700 uppercase mb-1.5 block">Full Name <span className="text-red-500">*</span></label>
                                        <div className="relative group">
                                            <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition" />
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
                                        <label className="text-xs font-bold text-gray-700 uppercase mb-1.5 block">Email</label>
                                        <div className="relative group">
                                            <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition" />
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
                                        <label className="text-xs font-bold text-gray-700 uppercase mb-1.5 block">Address <span className="text-red-500">*</span></label>
                                        <div className="relative group">
                                            <FaMapMarkerAlt className="absolute left-3 top-4 text-gray-400 group-focus-within:text-blue-600 transition" />
                                            <textarea
                                                className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all shadow-sm resize-none"
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
                                            <label className="text-xs font-bold text-gray-700 uppercase mb-1.5 block">Age <span className="text-red-500">*</span></label>
                                            <div className="relative group">
                                                <FaBirthdayCake className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition" />
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
                                            <label className="text-xs font-bold text-gray-700 uppercase mb-1.5 block">Gender <span className="text-red-500">*</span></label>
                                            <div className="relative group">
                                                <FaVenusMars className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition z-0" />
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
                                    <div className="pt-4 border-t border-gray-100">
                                        <label className="text-xs font-bold text-gray-700 uppercase mb-3 block">Payment Method</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setPaymentMode("CASH")}
                                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${paymentMode === "CASH"
                                                        ? "border-green-500 bg-green-50 text-green-700"
                                                        : "border-gray-100 hover:border-gray-200 text-gray-500"
                                                    }`}
                                            >
                                                <FaWallet className="text-xl" />
                                                <span className="text-xs font-bold">Cash</span>
                                            </button>
                                            <button
                                                onClick={() => setPaymentMode("ONLINE")}
                                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${paymentMode === "ONLINE"
                                                        ? "border-blue-500 bg-blue-50 text-blue-700"
                                                        : "border-gray-100 hover:border-gray-200 text-gray-500"
                                                    }`}
                                            >
                                                <FaCreditCard className="text-xl" />
                                                <span className="text-xs font-bold">Online</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* RIGHT COLUMN: Items */}
                        <div className="lg:col-span-2 space-y-6">
                            <Suspense fallback={
                                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 h-64 flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        <span className="text-gray-400 text-sm">Loading products...</span>
                                    </div>
                                </div>
                            }>
                                <InvoiceItems items={items} setItems={setItems} />
                            </Suspense>
                        </div>
                    </div>
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
