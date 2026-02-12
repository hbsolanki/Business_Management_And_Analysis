import { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { FaLock, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { toast } from "react-hot-toast";

export default function CheckoutForm({ amount, onClose }) {
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
            const { paymentIntent, error } = await stripe.confirmPayment({
                elements,
                redirect: 'if_required',
                confirmParams: {
                    // Change this to your payment completion page
                    return_url: `${window.location.origin}/payment-success`,
                },
            });

            if (paymentIntent && paymentIntent.status === "succeeded") {
                // Payment completed successfully without redirect
                toast.success("Payment successful!");

                // Close the modal
                if (onClose) {
                    onClose();
                }

                // You might want to trigger a refresh of the invoice list here
                // but since we don't have that callback prop yet, we'll just close.
                // The parent component should handle data refreshing if needed.
            } else if (error) {
                if (error.type === "card_error" || error.type === "validation_error") {
                    setMessage(error.message);
                } else {
                    setMessage("An unexpected error occurred.");
                }
            }
        } catch (err) {
            console.error("Payment error:", err);
            setMessage("An error occurred while processing payment.");
        }

        setIsLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white/70 p-4 rounded-xl border border-gray-100 mb-6">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-500 text-sm">Amount to pay</span>
                    <span className="text-xl font-bold text-gray-900">
                        {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)}
                    </span>
                </div>
            </div>

            <div className="p-1">
                <PaymentElement id="payment-element" options={{ layout: "tabs" }} />
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
