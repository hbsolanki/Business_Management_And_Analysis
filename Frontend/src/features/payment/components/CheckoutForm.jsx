import { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { FaLock, FaExclamationCircle, FaCreditCard } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { paymentService } from "@/services/paymentService";

export default function CheckoutForm({ amount, onClose, onPaymentSuccess, subscriptionId, invoiceId }) {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isStripeReady, setIsStripeReady] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!stripe || !elements || !isStripeReady) {
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            const { paymentIntent, error } = await stripe.confirmPayment({
                elements,
                redirect: 'if_required',
                confirmParams: {
                    return_url: `${window.location.origin}/payment-success${window.location.pathname.includes('subscriptions') ? '?type=subscription' : ''}`,
                },
            });

            if (paymentIntent && paymentIntent.status === "succeeded") {
                // Call backend immediately to confirm secure payment and activate subscription
                if (subscriptionId) {
                    try {
                        await paymentService.confirmSubscriptionPayment({
                            payment_intent_id: paymentIntent.id
                        });
                        toast.success("Subscription activated successfully!");
                    } catch (confirmErr) {
                        console.error("Backend payment confirmation failed:", confirmErr);
                        toast.error("Stripe payment went through, but backend confirmation failed. We're activating it soon.");
                    }
                }

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
                <div className="mb-4 min-h-[150px] relative">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                        Secure Payment Method
                    </label>
                    
                    {!isStripeReady && (
                        <div className="absolute inset-0 top-6 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10 rounded-xl border border-slate-100">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-[10px] font-bold text-slate-400 tracking-wider">LOADING SECURE GATEWAY...</span>
                            </div>
                        </div>
                    )}

                    <PaymentElement 
                        id="payment-element" 
                        options={{ layout: "accordion" }}
                        onReady={() => setIsStripeReady(true)}
                    />
                </div>
            </div>

            {message && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                    <FaExclamationCircle className="flex-shrink-0" />
                    <p>{message}</p>
                </div>
            )}

            <button
                disabled={isLoading || !stripe || !elements || !isStripeReady}
                id="submit"
                className={`btn-primary w-full ${isLoading || !stripe || !elements || !isStripeReady ? "opacity-70 cursor-not-allowed" : ""}`}
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
