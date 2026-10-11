import { useState, useEffect } from "react";
import { paymentService } from "@/services/paymentService";
import { toast } from "react-hot-toast";
import {
    FaShieldAlt, FaCheckCircle, FaExclamationTriangle,
    FaSpinner, FaExternalLinkAlt, FaSync, FaClock, FaCcStripe,
} from "react-icons/fa";


const STATUS_CONFIG = {
    NOT_CONFIGURED: {
        label: "Not Set Up",
        icon: FaExclamationTriangle,
        color: "text-slate-400",
        bg: "bg-slate-50",
        border: "border-slate-200",
        badge: "bg-slate-100 text-slate-600",
    },
    PENDING: {
        label: "Onboarding Incomplete",
        icon: FaClock,
        color: "text-amber-500",
        bg: "bg-amber-50",
        border: "border-amber-200",
        badge: "bg-amber-100 text-amber-700",
    },
    RESTRICTED: {
        label: "Verification Pending",
        icon: FaExclamationTriangle,
        color: "text-orange-500",
        bg: "bg-orange-50",
        border: "border-orange-200",
        badge: "bg-orange-100 text-orange-700",
    },
    ACTIVE: {
        label: "Active",
        icon: FaCheckCircle,
        color: "text-emerald-500",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        badge: "bg-emerald-100 text-emerald-700",
    },
    DISABLED: {
        label: "Disabled",
        icon: FaExclamationTriangle,
        color: "text-red-500",
        bg: "bg-red-50",
        border: "border-red-200",
        badge: "bg-red-100 text-red-700",
    },
};

export default function StripeConnectSetup({ onStatusChange }) {
    const [connectData, setConnectData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchStatus = async () => {
        try {
            const data = await paymentService.getConnectStatus();
            setConnectData(data);
            onStatusChange?.(data);
        } catch (err) {
            console.error("Failed to fetch connect status:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleEnable = async () => {
        setActionLoading(true);
        try {
            const data = await paymentService.enableOnlinePayments();
            if (data.onboarding_url) {
                window.location.href = data.onboarding_url;
            } else if (data.status) {
                toast.success(data.detail || "Online payments already active.");
                fetchStatus();
            }
        } catch (err) {
            toast.error(err?.response?.data?.detail || "Failed to start onboarding.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleRefresh = async () => {
        setActionLoading(true);
        try {
            const data = await paymentService.refreshOnboardingLink();
            if (data.onboarding_url) {
                window.location.href = data.onboarding_url;
            }
        } catch (err) {
            toast.error(err?.response?.data?.detail || "Failed to refresh onboarding link.");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                <FaSpinner className="animate-spin" />
                <span>Checking payment status...</span>
            </div>
        );
    }

    const currentStatus = connectData?.status || "NOT_CONFIGURED";
    const cfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.NOT_CONFIGURED;
    const StatusIcon = cfg.icon;
    const canAccept = connectData?.can_accept_payments === true;

    return (
        <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-5 space-y-4`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                        <FaCcStripe className="text-[#635BFF] text-xl" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800">Online Payments</p>
                        <p className="text-xs text-slate-500">Powered by Stripe Connect</p>
                    </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                    {cfg.label}
                </span>
            </div>

            {/* Status detail row */}
            {currentStatus === "ACTIVE" && (
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: "Charges", value: connectData?.charges_enabled },
                        { label: "Payouts", value: connectData?.payouts_enabled },
                        { label: "KYC Done", value: connectData?.details_submitted },
                    ].map(({ label, value }) => (
                        <div key={label} className="bg-white/70 rounded-xl p-3 text-center">
                            <FaCheckCircle className={`mx-auto mb-1 ${value ? "text-emerald-500" : "text-slate-300"}`} />
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Description */}
            {currentStatus === "NOT_CONFIGURED" && (
                <p className="text-xs text-slate-500 leading-relaxed">
                    Enable online payments so customers can pay invoices directly via Stripe.
                    You'll complete a quick identity verification on Stripe's secure page.
                </p>
            )}
            {currentStatus === "PENDING" && (
                <p className="text-xs text-amber-700 leading-relaxed">
                    Your onboarding is incomplete. Click below to continue where you left off.
                    If your link expired, click Refresh Link.
                </p>
            )}
            {currentStatus === "RESTRICTED" && (
                <p className="text-xs text-orange-700 leading-relaxed">
                    Stripe is reviewing your documents. This usually takes a few minutes to hours.
                    You'll be notified when charges are enabled.
                </p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
                {currentStatus === "NOT_CONFIGURED" && (
                    <button
                        id="stripe-connect-enable-btn"
                        onClick={handleEnable}
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#635BFF] text-white text-xs font-bold uppercase tracking-wide hover:bg-[#5147e6] transition-all shadow-md shadow-[#635BFF]/20 disabled:opacity-60"
                    >
                        {actionLoading ? <FaSpinner className="animate-spin" /> : <FaShieldAlt />}
                        Enable Online Payments
                    </button>
                )}
                {currentStatus === "PENDING" && (
                    <>
                        <button
                            id="stripe-connect-continue-btn"
                            onClick={handleEnable}
                            disabled={actionLoading}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 text-white text-xs font-bold uppercase tracking-wide hover:bg-amber-600 transition-all disabled:opacity-60"
                        >
                            {actionLoading ? <FaSpinner className="animate-spin" /> : <FaExternalLinkAlt />}
                            Continue Onboarding
                        </button>
                        <button
                            id="stripe-connect-refresh-btn"
                            onClick={handleRefresh}
                            disabled={actionLoading}
                            title="Refresh expired onboarding link"
                            className="py-2.5 px-3 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all disabled:opacity-60"
                        >
                            <FaSync className={actionLoading ? "animate-spin" : ""} />
                        </button>
                    </>
                )}
                {currentStatus === "ACTIVE" && (
                    <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold">
                        <FaCheckCircle />
                        Customers can pay invoices online
                    </div>
                )}
                {currentStatus === "RESTRICTED" && (
                    <button
                        id="stripe-connect-check-btn"
                        onClick={fetchStatus}
                        disabled={actionLoading}
                        className="flex items-center gap-2 py-2 px-3 rounded-xl bg-white border border-orange-200 text-orange-600 text-xs font-semibold hover:bg-orange-50 transition-all"
                    >
                        <FaSync className={actionLoading ? "animate-spin" : ""} />
                        Check Status
                    </button>
                )}
            </div>

            {connectData?.stripe_account_id && (
                <p className="text-[10px] text-slate-400 font-mono">
                    Account: {connectData.stripe_account_id}
                </p>
            )}
        </div>
    );
}
