import { useState } from "react";
import { paymentService } from "@/services/paymentService";
import { toast } from "react-hot-toast";
import {
    FaCreditCard, FaMoneyBillWave, FaTimes, FaSpinner,
    FaCheckCircle, FaUniversity, FaQrcode, FaFileInvoice, FaCcStripe,
} from "react-icons/fa";


const OFFLINE_METHODS = [
    { value: "CASH", label: "Cash", icon: FaMoneyBillWave, color: "text-emerald-500" },
    { value: "UPI", label: "UPI", icon: FaQrcode, color: "text-purple-500" },
    { value: "NEFT", label: "NEFT", icon: FaUniversity, color: "text-blue-500" },
    { value: "RTGS", label: "RTGS", icon: FaUniversity, color: "text-indigo-500" },
    { value: "IMPS", label: "IMPS", icon: FaUniversity, color: "text-cyan-500" },
    { value: "NET_BANKING", label: "Net Banking", icon: FaUniversity, color: "text-sky-500" },
    { value: "CHEQUE", label: "Cheque", icon: FaFileInvoice, color: "text-slate-500" },
    { value: "CARD", label: "Card (Offline)", icon: FaCreditCard, color: "text-rose-500" },
];

const NEEDS_REFERENCE = ["NEFT", "RTGS", "IMPS", "UPI", "CHEQUE"];

export default function InvoicePaymentButton({
    invoice,          // { id, total_amount, payment_status }
    canAcceptOnline,  // boolean — from StripeConnectAccount.can_accept_payments
    onSuccess,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState("choose"); // "choose" | "online" | "offline"
    const [offlineMethod, setOfflineMethod] = useState("CASH");
    const [referenceNumber, setReferenceNumber] = useState("");
    const [notes, setNotes] = useState("");
    const [amount, setAmount] = useState(invoice?.total_amount || "");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const alreadyPaid = invoice?.payment_status === "PAID";

    const reset = () => {
        setMode("choose");
        setOfflineMethod("CASH");
        setReferenceNumber("");
        setNotes("");
        setAmount(invoice?.total_amount || "");
        setLoading(false);
        setSuccess(false);
    };

    const handleOnline = async () => {
        setLoading(true);
        try {
            const successUrl = `${window.location.origin}/invoice/${invoice.id}/payment/success`;
            const cancelUrl = `${window.location.origin}/payment-dashboard`;
            const data = await paymentService.initiateInvoiceOnlinePayment(invoice.id, notes, successUrl, cancelUrl);
            if (data.checkout_url) {
                window.location.href = data.checkout_url;
            }
        } catch (err) {
            const detail = err?.response?.data?.detail;
            if (err?.response?.status === 402) {
                toast.error("Online payments not enabled yet. Complete Stripe onboarding first.");
            } else {
                toast.error(detail || "Failed to initiate online payment.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOffline = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            toast.error("Please enter a valid amount.");
            return;
        }
        if (NEEDS_REFERENCE.includes(offlineMethod) && !referenceNumber.trim()) {
            toast.error(`Reference number is required for ${offlineMethod}.`);
            return;
        }
        setLoading(true);
        try {
            await paymentService.recordOfflinePayment({
                invoiceId: invoice.id,
                method: offlineMethod,
                amount: parseFloat(amount),
                referenceNumber: referenceNumber.trim(),
                notes: notes.trim(),
            });
            setSuccess(true);
            toast.success("Payment recorded successfully!");
            onSuccess?.();
            setTimeout(() => { setIsOpen(false); reset(); }, 1800);
        } catch (err) {
            toast.error(err?.response?.data?.detail || "Failed to record payment.");
        } finally {
            setLoading(false);
        }
    };

    if (alreadyPaid) {
        return (
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                <FaCheckCircle />
                Paid
            </div>
        );
    }

    return (
        <>
            <button
                id={`invoice-pay-btn-${invoice?.id}`}
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition-all shadow-md shadow-brand-600/20"
            >
                <FaCreditCard size={13} />
                Record Payment
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => { setIsOpen(false); reset(); }} />

                    <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <p className="font-bold text-slate-800">Invoice #{invoice?.id}</p>
                                <p className="text-xs text-slate-400">
                                    Total: ₹{parseFloat(invoice?.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <button onClick={() => { setIsOpen(false); reset(); }} className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                                <FaTimes size={14} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {success ? (
                                <div className="flex flex-col items-center gap-3 py-8">
                                    <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <FaCheckCircle className="text-emerald-500 text-2xl" />
                                    </div>
                                    <p className="font-bold text-slate-800">Payment Recorded!</p>
                                    <p className="text-xs text-slate-400">Invoice marked as paid.</p>
                                </div>
                            ) : mode === "choose" ? (
                                <>
                                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Select Payment Method</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Online Card */}
                                        <button
                                            id="pay-online-btn"
                                            onClick={() => canAcceptOnline ? setMode("online") : toast.error("Enable online payments in Settings first.")}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                                                canAcceptOnline
                                                    ? "border-[#635BFF]/30 bg-[#635BFF]/5 hover:border-[#635BFF] hover:bg-[#635BFF]/10 cursor-pointer"
                                                    : "border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed"
                                            }`}
                                        >
                                            <FaCcStripe className="text-[#635BFF] text-2xl" />
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-slate-700">Online</p>
                                                <p className="text-[10px] text-slate-400">Stripe Checkout</p>
                                            </div>
                                            {!canAcceptOnline && (
                                                <span className="text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-semibold">Setup Required</span>
                                            )}
                                        </button>

                                        {/* Offline Card */}
                                        <button
                                            id="pay-offline-btn"
                                            onClick={() => setMode("offline")}
                                            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-slate-200 bg-slate-50 hover:border-slate-400 hover:bg-slate-100 transition-all cursor-pointer"
                                        >
                                            <FaMoneyBillWave className="text-emerald-500 text-2xl" />
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-slate-700">Offline</p>
                                                <p className="text-[10px] text-slate-400">Cash / NEFT / UPI</p>
                                            </div>
                                        </button>
                                    </div>
                                </>
                            ) : mode === "online" ? (
                                <div className="space-y-4">
                                    <div className="bg-[#635BFF]/5 border border-[#635BFF]/20 rounded-xl p-4 text-sm text-slate-600">
                                        Customer will be redirected to a secure Stripe Checkout page to pay ₹{parseFloat(invoice?.total_amount || 0).toLocaleString("en-IN")}.
                                    </div>
                                    <textarea
                                        placeholder="Notes (optional)"
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        rows={2}
                                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 resize-none"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={() => setMode("choose")} className="px-4 py-2 rounded-xl text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all">Back</button>
                                        <button
                                            id="confirm-online-pay-btn"
                                            onClick={handleOnline}
                                            disabled={loading}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#635BFF] text-white text-sm font-bold hover:bg-[#5147e6] transition-all disabled:opacity-60"
                                        >
                                            {loading ? <FaSpinner className="animate-spin" /> : <FaCcStripe />}
                                            Generate Payment Link
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Offline form */
                                <div className="space-y-4">
                                    {/* Method selector */}
                                    <div>
                                        <p className="text-xs text-slate-500 font-semibold mb-2 uppercase tracking-wide">Payment Method</p>
                                        <div className="grid grid-cols-4 gap-2">
                                            {OFFLINE_METHODS.map(m => (
                                                <button
                                                    key={m.value}
                                                    id={`offline-method-${m.value}`}
                                                    onClick={() => setOfflineMethod(m.value)}
                                                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all text-center ${
                                                        offlineMethod === m.value
                                                            ? "border-brand-600 bg-brand-50"
                                                            : "border-slate-200 hover:border-slate-300"
                                                    }`}
                                                >
                                                    <m.icon className={`${m.color} text-base`} />
                                                    <span className="text-[9px] font-bold text-slate-600">{m.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Amount */}
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Amount (₹)</label>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    {/* Reference */}
                                    {NEEDS_REFERENCE.includes(offlineMethod) && (
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                                                {offlineMethod === "CHEQUE" ? "Cheque Number" : "UTR / Reference Number"}
                                            </label>
                                            <input
                                                type="text"
                                                value={referenceNumber}
                                                onChange={e => setReferenceNumber(e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                                                placeholder={offlineMethod === "CHEQUE" ? "e.g. 123456" : "e.g. UTIB000000000"}
                                            />
                                        </div>
                                    )}

                                    {/* Notes */}
                                    <textarea
                                        placeholder="Notes (optional)"
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        rows={2}
                                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
                                    />

                                    <div className="flex gap-2">
                                        <button onClick={() => setMode("choose")} className="px-4 py-2 rounded-xl text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all">Back</button>
                                        <button
                                            id="confirm-offline-pay-btn"
                                            onClick={handleOffline}
                                            disabled={loading}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all disabled:opacity-60"
                                        >
                                            {loading ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                                            Mark as Paid
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
