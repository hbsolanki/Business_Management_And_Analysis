import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useStripe } from "@stripe/react-stripe-js";
import { FaCheckCircle, FaExclamationCircle, FaArrowRight } from "react-icons/fa";

export default function PaymentSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState("loading"); // loading, success, error
    const [message, setMessage] = useState("Verifying payment...");

    useEffect(() => {
        const paymentIntentClientSecret = searchParams.get("payment_intent_client_secret");

        if (!paymentIntentClientSecret) {
            setStatus("error");
            setMessage("Something went wrong. No payment information found.");
            return;
        }

        // We can also retrieve the PaymentIntent to check its status if needed,
        // although technically the existence of the client secret in the URL implies 
        // we returned from Stripe. 
        // For a simple success page, we can assume success or check `redirect_status`.

        const redirectStatus = searchParams.get("redirect_status");

        if (redirectStatus === 'succeeded') {
            setStatus("success");
            setMessage("Payment successful! Thank you for your business.");
        } else {
            setStatus("error");
            setMessage("Payment verification failed. Please check your invoice status.");
        }

    }, [searchParams]);

    return (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white border border-slate-200 py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 text-center">

                    {status === 'loading' && (
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-6"></div>
                            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Processing...</h2>
                            <p className="text-slate-500">Please wait while we confirm your payment.</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6 border border-emerald-200">
                                <FaCheckCircle size={32} />
                            </div>
                            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Payment Successful!</h2>
                            <p className="text-slate-500 mb-8">{message}</p>

                            <button
                                onClick={() => navigate('/invoice')}
                                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl transition-all"
                            >
                                <span>View Invoices</span>
                                <FaArrowRight size={14} />
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6 border border-red-200">
                                <FaExclamationCircle size={32} />
                            </div>
                            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Payment Failed</h2>
                            <p className="text-slate-500 mb-8">{message}</p>

                            <button
                                onClick={() => navigate('/invoice')}
                                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl transition-all"
                            >
                                <span>Back to Invoices</span>
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
