import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { FaTimes } from "react-icons/fa";
import { paymentService } from "@/services/paymentService";
import CheckoutForm from "./CheckoutForm";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function PaymentModal({ isOpen, onClose, invoiceId, amount }) {
    const [clientSecret, setClientSecret] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && invoiceId) {
            setLoading(true);
            setError(null);

            if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
                setError("Configuration Error: Stripe Publishable Key is missing in frontend .env file.");
                setLoading(false);
                return;
            }

            paymentService.createPaymentIntent(invoiceId)
                .then((data) => {
                    setClientSecret(data.clientSecret);
                })
                .catch((err) => {
                    console.error("Failed to init payment:", err);
                    setError("Failed to initialize payment. Please try again.");
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            // Reset state when closed
            setClientSecret("");
        }
    }, [isOpen, invoiceId]);

    if (!isOpen) return null;

    const appearance = {
        theme: 'stripe',
        variables: {
            colorPrimary: '#2563eb',
            colorBackground: '#ffffff',
            colorText: '#1f2937',
        },
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
                        <h3 className="text-lg font-bold text-gray-900" id="modal-title">
                            Complete Payment
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
                                <CheckoutForm amount={amount} onClose={onClose} />
                            </Elements>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
