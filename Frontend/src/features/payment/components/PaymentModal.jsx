import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { FaTimes, FaShieldAlt } from "react-icons/fa";
import { paymentService } from "@/services/paymentService";
import CheckoutForm from "./CheckoutForm";

// Initialize Stripe
// Initialize Stripe - added catch to prevent unhandled promise rejections from AdBlockers
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY).catch(err => {
    console.warn("Stripe initialization failed (likely blocked by AdBlocker):", err);
    return null;
});

export default function PaymentModal({ isOpen, onClose, invoiceId, subscriptionId, amount, onPaymentSuccess }) {
    const [clientSecret, setClientSecret] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && (invoiceId || subscriptionId)) {
            setLoading(true);
            setError(null);

            if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
                setError("Configuration Error: Stripe Publishable Key is missing in frontend .env file.");
                setLoading(false);
                return;
            }

            const initPayment = subscriptionId
                ? paymentService.createSubscriptionPaymentIntent(subscriptionId)
                : paymentService.createPaymentIntent(invoiceId);

            Promise.all([initPayment, stripePromise])
                .then(([data, stripe]) => {
                    if (!stripe) {
                        throw new Error("Stripe SDK could not be loaded. Please disable your AdBlocker or try a different browser.");
                    }
                    setClientSecret(data.clientSecret);
                })
                .catch((err) => {
                    console.error("Failed to init payment:", err);
                    let errorMsg = err.response?.data?.detail ||
                        err.response?.data?.message ||
                        err.response?.data?.non_field_errors?.[0] ||
                        err.message ||
                        "Failed to initialize payment. Please try again.";

                    if (err.message?.includes("AdBlocker") || err.message?.includes("Stripe SDK")) {
                        errorMsg = "Payment system is blocked. Please disable your AdBlocker and refresh the page to continue.";
                    }
                    setError(errorMsg);
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            // Reset state when closed
            setClientSecret("");
        }
    }, [isOpen, invoiceId, subscriptionId]);

    if (!isOpen) return null;

    const appearance = {
        theme: 'stripe',
        variables: {
            colorPrimary: '#0f172a',
            colorBackground: '#ffffff',
            colorText: '#1e293b',
            colorDanger: '#ef4444',
            fontFamily: 'Inter, system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '12px',
        },
        rules: {
            '.Input': {
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease',
            },
            '.Input:focus': {
                border: '1px solid #0f172a',
                boxShadow: '0 0 0 4px rgba(15, 23, 42, 0.1)',
            },
            '.Label': {
                fontSize: '13px',
                fontWeight: '600',
                color: '#64748b',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.025em',
            },
            '.Tab': {
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            },
            '.Tab--selected': {
                border: '1px solid #0f172a',
                boxShadow: '0 0 0 1px #0f172a',
            },
        }
    };
    const options = {
        clientSecret,
        appearance,
    };

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
                            Secure Payment
                        </h3>
                        <button
                            onClick={onClose}
                            className="glass-panel p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-white/80 transition-all"
                        >
                            <FaTimes size={14} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="px-6 py-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-gray-500 font-medium">Initializing secure checkout...</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-8">
                                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm font-medium border border-red-100">
                                    {error}
                                </div>
                                <button
                                    onClick={onClose}
                                    className="text-sm text-gray-500 hover:text-gray-900 font-medium underline"
                                >
                                    Close
                                </button>
                            </div>
                        ) : clientSecret ? (
                            <Elements options={options} stripe={stripePromise}>
                                <CheckoutForm amount={amount} onClose={onClose} onPaymentSuccess={onPaymentSuccess} />
                            </Elements>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
