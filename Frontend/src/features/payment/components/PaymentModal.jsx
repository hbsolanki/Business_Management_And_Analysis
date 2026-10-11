import { useState, useEffect } from "react";
import { FaTimes, FaShieldAlt } from "react-icons/fa";
import { paymentService } from "@/services/paymentService";

export default function PaymentModal({ isOpen, onClose, invoiceId, subscriptionId, amount }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && (invoiceId || subscriptionId)) {
            setLoading(true);
            setError(null);

            const successUrl = subscriptionId 
                ? `${window.location.origin}/subscriptions?session_id={CHECKOUT_SESSION_ID}#current-plan`
                : `${window.location.origin}/invoice/${invoiceId}/payment/success`;
            const cancelUrl = subscriptionId 
                ? `${window.location.origin}/subscriptions`
                : `${window.location.origin}/payment-dashboard`;

            const initPayment = subscriptionId
                ? paymentService.initiateSubscriptionPayment(subscriptionId, successUrl, cancelUrl)
                : paymentService.initiateInvoiceOnlinePayment(invoiceId, "", successUrl, cancelUrl);

            initPayment
                .then((data) => {
                    if (data.checkout_url) {
                        // Secure redirect to Stripe-hosted Checkout Page
                        window.location.href = data.checkout_url;
                    } else {
                        throw new Error("Stripe Checkout URL was not returned by the server.");
                    }
                })
                .catch((err) => {
                    console.error("Failed to init secure payment redirect:", err);
                    const errorMsg = err.response?.data?.stripe_error ||
                        err.response?.data?.stripe_connect ||
                        err.response?.data?.detail ||
                        err.response?.data?.message ||
                        err.message ||
                        "Failed to initialize secure checkout. Please try again.";
                    setError(errorMsg);
                    setLoading(false);
                });
        }
    }, [isOpen, invoiceId, subscriptionId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                <div className="glass-panel relative transform overflow-hidden rounded-2xl text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white/60">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2" id="modal-title">
                            <FaShieldAlt className="text-emerald-500" />
                            Secure Stripe Gateway
                        </h3>
                        {!loading && (
                            <button
                                onClick={onClose}
                                className="glass-panel p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-white/80 transition-all"
                            >
                                <FaTimes size={14} />
                            </button>
                        )}
                    </div>

                    {/* Content */}
                    <div className="px-6 py-12">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center">
                                <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                                <h4 className="text-slate-900 font-bold text-base mb-2">Connecting to Secure Stripe Gateway</h4>
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Please wait, redirecting...</p>
                            </div>
                        ) : error ? (
                            <div className="text-center">
                                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-semibold border border-red-100 leading-relaxed">
                                    {error}
                                </div>
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all shadow-md"
                                >
                                    Close
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
