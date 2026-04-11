import { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { FaLock, FaExclamationCircle, FaCreditCard } from "react-icons/fa";
import { toast } from "react-hot-toast";

export default function CheckoutForm({ amount, onClose, onPaymentSuccess }) {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            if (!stripe || !elements) {
                throw new Error("Stripe has not been properly initialized. Please check your internet connection and AdBlocker.");
            }

            const { paymentIntent, error } = await stripe.confirmPayment({
                elements,
                redirect: 'if_required',
                confirmParams: {
                    return_url: `${window.location.origin}/payment-success${window.location.pathname.includes('subscriptions') ? '?type=subscription' : ''}`,
                },
            });

            if (paymentIntent && paymentIntent.status === "succeeded") {
                toast.success("Payment successful!");
                if (onPaymentSuccess) onPaymentSuccess(paymentIntent);
                if (onClose) onClose();
            } else if (error) {
                if (error.type === "card_error" || error.type === "validation_error") {
                    setMessage(error.message);
                } else {
                    setMessage(error.message || "An unexpected error occurred.");
                }
            }
        } catch (err) {
            console.error("Payment error:", err);
            setMessage(err.message || "An error occurred while processing payment.");
        }

        setIsLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                        <FaCreditCard className="text-sm" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-900">Payment Details</h4>
                        <p className="text-xs text-slate-500 font-medium">Please enter your billing information</p>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Amount Due</span>
                        <span className="text-2xl font-bold text-slate-900">
                            {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="p-1">
                <div className="mb-4">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                        Secure Payment Method
                    </label>
                    <PaymentElement id="payment-element" options={{ layout: "tabs" }} />
                </div>
            </div>

            {message && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                    <FaExclamationCircle className="flex-shrink-0" />
                    <p>{message}</p>
                </div>
            )}

            <button
                disabled={isLoading || !stripe || !elements}
                id="submit"
                className={`btn-primary w-full ${isLoading || !stripe || !elements ? "opacity-70 cursor-not-allowed" : ""}`}
            >
                {isLoading ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Processing...</span>
                    </>
                ) : (
                    <>
                        <FaLock size={14} />
                        <span>Pay Now</span>
                    </>
                )}
            </button>

            <div className="text-center">
                <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                    <FaLock size={10} />
                    Payments are secure and encrypted
                </p>
            </div>
        </form>
    );
}
