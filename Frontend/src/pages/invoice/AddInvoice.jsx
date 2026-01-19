import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { invoiceService } from "@/features/invoice/services/invoiceService";
import InvoiceItems from "@/features/invoice/components/InvoiceItems";
import ProtectedHeader from "@/components/layout/ProtectedHeader";

import {
    FaUser,
    FaPhone,
    FaEnvelope,
    FaMapMarkerAlt,
    FaMoneyBillWave,
    FaVenusMars,
    FaBirthdayCake,
} from "react-icons/fa";

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

    const fetchCustomerByMobileNumber = async (mobile) => {
        if (mobile.length !== 10) return;

        try {
            const res = await invoiceService.checkCustomer(mobile);
            if (res.data?.exists) {
                setCustomer(res.data.customer);
                toast.success("Customer found");
            }
        } catch {
            toast.error("Failed to fetch customer");
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
            await invoiceService.create({
                items: items.map(({ productId, quantity }) => ({
                    productId,
                    quantity,
                })),
                payment_mode: paymentMode,
                ...customer,
                age: Number(customer.age),
            });

            toast.success("Invoice created successfully");
            navigate(-1);
        } catch (err) {
            toast.error(err?.response?.data || "Invoice failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="pb-10">
                {/* ProtectedHeader is usually fixed or at top. If it's sticky, we don't need padding. But let's verify. 
                 Assuming ProtectedHeader handles itself. We need to wrap layout.
                 */}
                <div className="absolute top-0 w-full z-10"><ProtectedHeader /></div>
                {/* Space for header */}
                <div className="h-20"></div>

                <div className="max-w-5xl mx-auto px-4 py-10 space-y-8 animate-fade-in-up">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create Invoice</h1>
                            <p className="text-gray-500 mt-1">Generate a new invoice for customer</p>
                        </div>
                        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 font-medium text-sm">Cancel</button>
                    </div>

                    {/* ================= Customer Details ================= */}
                    <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 space-y-6">
                        <div className="pb-4 border-b border-gray-100">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                                <FaUser className="text-blue-600" />
                                Customer Details
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">Enter customer information to auto-fetch or create new</p>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-6">
                            {/* Mobile */}
                            <div>
                                <label className="text-sm font-bold text-gray-700 block mb-2">Mobile Number *</label>
                                <div className="relative group">
                                    <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition" />
                                    <input
                                        className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                                        value={customer.mobile_number}
                                        placeholder="10-digit number"
                                        onChange={(e) => {
                                            setCustomer({ ...customer, mobile_number: e.target.value });
                                            fetchCustomerByMobileNumber(e.target.value);
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="text-sm font-bold text-gray-700 block mb-2">Full Name *</label>
                                <div className="relative group">
                                    <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition" />
                                    <input
                                        className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
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
                                <label className="text-sm font-bold text-gray-700 block mb-2">Email</label>
                                <div className="relative group">
                                    <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition" />
                                    <input
                                        className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                                        value={customer.email}
                                        placeholder="Optional"
                                        onChange={(e) =>
                                            setCustomer({ ...customer, email: e.target.value })
                                        }
                                    />
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <label className="text-sm font-bold text-gray-700 block mb-2">Address *</label>
                                <div className="relative group">
                                    <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition" />
                                    <input
                                        className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                                        value={customer.address}
                                        placeholder="Billing Address"
                                        onChange={(e) =>
                                            setCustomer({ ...customer, address: e.target.value })
                                        }
                                    />
                                </div>
                            </div>

                            {/* Age */}
                            <div>
                                <label className="text-sm font-bold text-gray-700 block mb-2">Age *</label>
                                <div className="relative group">
                                    <FaBirthdayCake className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition" />
                                    <input
                                        type="number"
                                        className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
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
                                <label className="text-sm font-bold text-gray-700 block mb-2">Gender *</label>
                                <div className="relative group">
                                    <FaVenusMars className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition z-0" />
                                    <select
                                        className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition bg-transparent appearance-none"
                                        value={customer.gender}
                                        onChange={(e) =>
                                            setCustomer({ ...customer, gender: e.target.value })
                                        }
                                    >
                                        <option value="">Select gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ================= Invoice Items ================= */}
                    <InvoiceItems items={items} setItems={setItems} />

                    {/* ================= Payment ================= */}
                    <div className="flex flex-col md:flex-row gap-6">
                        <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex-1 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-green-50 rounded-full text-green-600">
                                    <FaMoneyBillWave className="text-xl" />
                                </div>
                                <label className="text-base font-bold text-gray-800">Payment Mode</label>
                            </div>
                            <select
                                className="border rounded-lg px-4 py-2 bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-green-500"
                                value={paymentMode}
                                onChange={(e) => setPaymentMode(e.target.value)}
                            >
                                <option value="CASH">Cash</option>
                                <option value="ONLINE">Online</option>
                            </select>
                        </section>

                        {/* ================= Submit ================= */}
                        <div className="flex items-center">
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className={`h-full px-10 py-4 rounded-2xl text-white font-bold text-lg shadow-lg shadow-green-500/30 transition-all transform hover:scale-[1.02] active:scale-95 ${loading
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                                    }`}
                            >
                                {loading ? "Saving..." : "Create Invoice"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
