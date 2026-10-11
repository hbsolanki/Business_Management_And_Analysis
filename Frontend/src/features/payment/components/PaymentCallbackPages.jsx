import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { paymentService } from "@/services/paymentService";
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaSync, FaCcStripe } from "react-icons/fa";


/**
 * Landing page after the owner completes Stripe onboarding.
 * Route: /payment/connect/return
 */
export function StripeConnectReturn() {
    const [status, setStatus] = useState("loading"); // "loading" | "success" | "pending" | "error"
    const [connectData, setConnectData] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const sync = async () => {
            try {
                const data = await paymentService.getConnectReturnStatus();
                setConnectData(data);
                if (data.can_accept_payments) {
                    setStatus("success");
                } else {
                    setStatus("pending");
                }
            } catch {
                setStatus("error");
            }
        };
        sync();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center space-y-5">
                {/* Stripe logo */}
                <div className="flex justify-center">
                    <FaCcStripe className="text-[#635BFF] text-5xl" />
                </div>

                {status === "loading" && (
                    <>
                        <FaSpinner className="mx-auto text-slate-400 text-3xl animate-spin" />
                        <p className="text-slate-600 font-medium">Verifying your Stripe account...</p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <FaCheckCircle className="mx-auto text-emerald-500 text-4xl" />
                        <h2 className="text-xl font-bold text-slate-800">You're all set!</h2>
                        <p className="text-sm text-slate-500">
                            Online payments are now active for your business.
                            Customers can pay invoices via Stripe Checkout.
                        </p>
                        <div className="grid grid-cols-3 gap-3 text-center text-xs">
                            {[
                                { label: "Charges", value: connectData?.charges_enabled },
                                { label: "Payouts", value: connectData?.payouts_enabled },
                                { label: "KYC", value: connectData?.details_submitted },
                            ].map(({ label, value }) => (
                                <div key={label} className={`rounded-xl p-3 ${value ? "bg-emerald-50" : "bg-slate-50"}`}>
                                    <FaCheckCircle className={`mx-auto mb-1 ${value ? "text-emerald-500" : "text-slate-300"}`} />
                                    <p className="font-semibold text-slate-600">{label}</p>
                                </div>
                            ))}
                        </div>
                        <button
                            id="connect-return-go-home"
                            onClick={() => navigate("/payment-dashboard")}
                            className="w-full py-3 rounded-xl bg-[#635BFF] text-white font-bold hover:bg-[#5147e6] transition-all"
                        >
                            Go to Payment Dashboard
                        </button>
                    </>
                )}

                {status === "pending" && (
                    <>
                        <FaSync className="mx-auto text-amber-500 text-4xl" />
                        <h2 className="text-xl font-bold text-slate-800">Verification in Progress</h2>
                        <p className="text-sm text-slate-500">
                            Stripe is still verifying your documents. This usually takes a few minutes to hours.
                            You'll be notified once charges are enabled.
                        </p>
                        <button
                            id="connect-return-go-settings"
                            onClick={() => navigate("/payment-dashboard")}
                            className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-all"
                        >
                            Back to Payment Dashboard
                        </button>
                    </>
                )}

                {status === "error" && (
                    <>
                        <FaTimesCircle className="mx-auto text-red-500 text-4xl" />
                        <h2 className="text-xl font-bold text-slate-800">Something went wrong</h2>
                        <p className="text-sm text-slate-500">
                            Could not verify your Stripe account status. Please try again.
                        </p>
                        <button
                            id="connect-return-retry"
                            onClick={() => window.location.reload()}
                            className="w-full py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all"
                        >
                            Retry
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

/**
 * Landing page when the Stripe onboarding link has expired.
 * Route: /payment/connect/refresh
 */
export function StripeConnectRefresh() {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRefresh = async () => {
        setLoading(true);
        try {
            const data = await paymentService.refreshOnboardingLink();
            if (data.onboarding_url) {
                window.location.href = data.onboarding_url;
            }
        } catch {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center space-y-5">
                <FaCcStripe className="mx-auto text-[#635BFF] text-5xl" />
                <FaSync className="mx-auto text-amber-500 text-3xl" />
                <h2 className="text-xl font-bold text-slate-800">Onboarding Link Expired</h2>
                <p className="text-sm text-slate-500">
                    Your Stripe onboarding link has expired. Click below to generate a new secure link
                    and continue where you left off.
                </p>
                <button
                    id="connect-refresh-btn"
                    onClick={handleRefresh}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-[#635BFF] text-white font-bold hover:bg-[#5147e6] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                    {loading ? <FaSpinner className="animate-spin" /> : <FaSync />}
                    Get New Onboarding Link
                </button>
                <button
                    onClick={() => navigate("/payment-dashboard")}
                    className="text-sm text-slate-400 hover:text-slate-600 transition-all underline"
                >
                    Cancel, go back to Payment Dashboard
                </button>
            </div>
        </div>
    );
}

/**
 * Landing page after a successful invoice payment via Stripe Checkout.
 * Route: /invoice/:id/payment/success
 */
export function InvoicePaymentSuccess() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const invoiceId = window.location.pathname.split("/")[2];
    const [syncing, setSyncing] = useState(true);

    useEffect(() => {
        if (!invoiceId) {
            setSyncing(false);
            return;
        }
        const syncStatus = async () => {
            try {
                await paymentService.syncInvoicePaymentStatus(invoiceId);
            } catch (err) {
                console.error("Failed to sync invoice payment status:", err);
            } finally {
                setSyncing(false);
            }
        };
        syncStatus();
    }, [invoiceId]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center space-y-5">
                {syncing ? (
                    <>
                        <FaSpinner className="mx-auto text-[#635BFF] text-3xl animate-spin" />
                        <p className="text-slate-600 font-medium">Verifying payment with Stripe...</p>
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                            <FaCheckCircle className="text-emerald-500 text-3xl" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Payment Successful!</h2>
                        <p className="text-sm text-slate-500">
                            Thank you! Your payment has been processed successfully.
                            The invoice status has been updated.
                        </p>
                        <button
                            id="payment-success-go-invoice"
                            onClick={() => navigate("/invoice")}
                            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all"
                        >
                            Back to Invoices
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

/**
 * Landing page when an invoice payment was cancelled.
 * Route: /invoice/:id/payment/cancel
 */
export function InvoicePaymentCancel() {
    const navigate = useNavigate();
    const invoiceId = window.location.pathname.split("/")[2];

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-slate-100 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                    <FaTimesCircle className="text-red-500 text-3xl" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Payment Cancelled</h2>
                <p className="text-sm text-slate-500">
                    Your payment was not completed. The invoice remains unpaid.
                    You can try again from the invoice page.
                </p>
                <button
                    id="payment-cancel-retry"
                    onClick={() => navigate(invoiceId ? `/invoice/${invoiceId}` : "/invoice")}
                    className="w-full py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-900 transition-all"
                >
                    Back to Invoice
                </button>
            </div>
        </div>
    );
}
