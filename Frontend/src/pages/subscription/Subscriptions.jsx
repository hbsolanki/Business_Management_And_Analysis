import { useEffect, useMemo, useState, useCallback } from "react";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import PlansSection from "@/features/subscription/components/PlansSection";
import PaymentModal from "@/features/payment/components/PaymentModal";
import api, { API_BASE_URL } from "@/services/api";
import toast from "react-hot-toast";
import {
    FaCheckCircle,
    FaCrown,
    FaFileInvoice,
    FaBoxOpen,
    FaUsers,
    FaChartBar,
    FaCodeBranch,
    FaExclamationTriangle,
    FaArrowRight,
    FaBell
} from "react-icons/fa";
import { lazy, Suspense } from "react";

const EntityReminderModal = lazy(() => import("@/features/reminder/components/EntityReminderModal"));

export default function Subscriptions() {
    const [purchased, setPurchased] = useState(null);
    const [loading, setLoading] = useState(true);
    const [usage, setUsage] = useState(null);
    const [usageLoading, setUsageLoading] = useState(false);
    const [renewing, setRenewing] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [renewSubscriptionId, setRenewSubscriptionId] = useState(null);
    const [renewAmount, setRenewAmount] = useState(0);
    const [showReminderModal, setShowReminderModal] = useState(false);

    const pendingSub = useMemo(() => {
        if (!purchased) return null;
        if (purchased.status === "pending_payment" || purchased.status === "pending") {
            return purchased;
        }
        return purchased.pending_subscription || null;
    }, [purchased]);

    const usageStats = useMemo(() => {
        if (!purchased || !usage) return [];
        return [
            {
                key: "branches",
                label: "Branches",
                used: Number(usage.branches_created || 0),
                max: Number(purchased.max_branches || 0),
                Icon: FaCodeBranch
            },
            {
                key: "products",
                label: "Products",
                used: Number(usage.product_created || 0),
                max: Number(purchased.max_products || 0),
                Icon: FaBoxOpen
            },
            {
                key: "invoices",
                label: "Invoices",
                used: Number(usage.invoices_created || 0),
                max: Number(purchased.max_invoices || 0),
                Icon: FaFileInvoice
            },
            {
                key: "staff",
                label: "Staff",
                used: Number(usage.staff_created || 0),
                max: Number(purchased.max_staff || 0),
                Icon: FaUsers
            }
        ];
    }, [purchased, usage]);

    const normalizeOne = (data) => {
        if (!data) return null;
        if (Array.isArray(data)) return data[0] || null;
        if (Array.isArray(data.results)) return data.results[0] || null;
        return data;
    };

    const fetchPurchased = useCallback(async (isMounted = true) => {
        try {
            const res = await api.get("/subscription/plan/purchased/");
            if (!isMounted) return;
            setPurchased(normalizeOne(res.data));
        } catch {
            if (!isMounted) return;
            setPurchased(null);
        } finally {
            if (isMounted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        fetchPurchased(isMounted);
        return () => {
            isMounted = false;
        };
    }, [fetchPurchased]);

    useEffect(() => {
        let isMounted = true;
        const fetchUsage = async () => {
            const usageId = purchased?.subscription_id || purchased?.id;
            if (!usageId) {
                setUsage(null);
                return;
            }
            setUsageLoading(true);
            try {
                const res = await api.get(`/subscription/${usageId}/usage/`);
                if (!isMounted) return;
                setUsage(normalizeOne(res.data));
            } catch {
                if (!isMounted) return;
                setUsage(null);
            } finally {
                if (isMounted) setUsageLoading(false);
            }
        };

        fetchUsage();
        return () => {
            isMounted = false;
        };
    }, [purchased?.subscription_id, purchased?.id]);

    const handleRenew = useCallback(async () => {
        if (!purchased?.plan && !purchased?.plan_id) {
            toast.error("Plan information not available");
            return;
        }

        const planId = purchased.plan || purchased.plan_id;
        setRenewing(true);

        try {
            const res = await api.post("/subscription/plan/purchase/", { plan_id: planId });
            const { subscription_id } = res.data;

            setRenewSubscriptionId(subscription_id);
            setRenewAmount(parseFloat(purchased.price || 0));
            setIsPaymentModalOpen(true);
        } catch (err) {
            toast.error(err?.response?.data?.detail || "Failed to initiate renewal");
        } finally {
            setRenewing(false);
        }
    }, [purchased]);

    const handlePaymentSuccess = useCallback(() => {
        setIsPaymentModalOpen(false);
        toast.success("Subscription payment completed and activated!");
        fetchPurchased(true);
    }, [fetchPurchased]);

    return (
        <div className="min-h-screen bg-transparent">
            <ProtectedHeader />
            <div className="py-10">
                <section id="current-plan" className="pb-10">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                                    <FaCrown className="text-slate-500" /> Current Plan
                                </div>
                                <h2 className="mt-3 text-2xl font-bold text-slate-900">Your Subscription</h2>
                                <p className="mt-2 text-slate-500">Full details, usage, and plan limits in one view.</p>
                            </div>
                            {!loading && !purchased && (
                                <a
                                    href={`${API_BASE_URL}/subscription/plan/purchase/`}
                                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all"
                                >
                                    Purchase Plan
                                </a>
                            )}
                            {!loading && purchased && purchased.remaining_days !== null && purchased.remaining_days !== undefined && purchased.remaining_days < 10 && (
                                <button
                                    onClick={handleRenew}
                                    disabled={renewing}
                                    className={`inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${renewing
                                        ? "bg-slate-400 text-white cursor-wait"
                                        : "bg-amber-500 text-white hover:bg-amber-400"
                                        }`}
                                >
                                    {renewing ? "Processing..." : "Renew Now"}
                                </button>
                            )}
                            {!loading && purchased && (purchased.plan || purchased.plan_id) && (
                                <button
                                    onClick={() => setShowReminderModal(true)}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-amber-500 hover:bg-amber-50 hover:border-amber-200 text-sm font-semibold transition-all shadow-sm"
                                    title="Set Reminder"
                                >
                                    <FaBell />
                                    <span>Reminder</span>
                                </button>
                            )}
                        </div>

                        {loading && (
                            <div className="text-sm text-slate-400 bg-white border border-slate-200 rounded-2xl p-6">
                                Loading subscription details...
                            </div>
                        )}

                        {!loading && !purchased && (
                            <div className="text-sm text-slate-500 bg-white border border-dashed border-slate-200 rounded-2xl p-6">
                                No active subscription found. Choose a plan below to get started.
                            </div>
                        )}

                        {pendingSub && (
                            <div className="mb-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-md border border-amber-500/20 rounded-3xl p-6 shadow-xl shadow-amber-500/5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -z-10 transition-transform group-hover:scale-150 duration-700"></div>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                                    <div className="flex items-start gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center flex-shrink-0 animate-pulse">
                                            <FaExclamationTriangle size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-black text-amber-900 leading-tight">Payment Action Required</h4>
                                            <p className="text-xs text-amber-700 font-semibold mt-1 max-w-xl">
                                                You have an incomplete checkout for the <strong className="text-amber-900 font-black">{pendingSub.plan_name}</strong> plan (₹{pendingSub.price} for {pendingSub.duration_days} days). Pay securely to activate your features instantly.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setRenewSubscriptionId(pendingSub.subscription_id || pendingSub.id);
                                            setRenewAmount(parseFloat(pendingSub.price || 0));
                                            setIsPaymentModalOpen(true);
                                        }}
                                        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-600 text-white text-xs font-black uppercase tracking-wider hover:bg-amber-500 active:translate-y-0.5 hover:-translate-y-0.5 shadow-lg shadow-amber-600/20 hover:shadow-amber-500/30 transition-all duration-300 w-full sm:w-auto"
                                    >
                                        <span>Pay Securely Now</span>
                                        <FaArrowRight size={10} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {purchased && (
                            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">
                                            {(!purchased.duration_days) ? "Free Plan" : purchased.plan_name}
                                        </h3>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {(!purchased.duration_days)
                                                ? "Lifetime access"
                                                : `₹${purchased.price} / ${purchased.duration_days} days`
                                            }
                                        </p>
                                    </div>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${purchased.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                                        {purchased.status || (purchased.is_active ? "active" : "inactive")}
                                    </span>
                                </div>

                                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                    <div className="border border-slate-200 rounded-xl p-4">
                                        <p className="text-[10px] uppercase text-slate-400 font-semibold">Start Date</p>
                                        <p className="font-semibold text-slate-900">
                                            {purchased.start_date ? new Date(purchased.start_date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : "—"}
                                        </p>
                                    </div>
                                    <div className="border border-slate-200 rounded-xl p-4">
                                        <p className="text-[10px] uppercase text-slate-400 font-semibold">End Date</p>
                                        <p className="font-semibold text-slate-900">
                                            {purchased.end_date ? new Date(purchased.end_date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : "—"}
                                        </p>
                                    </div>
                                    <div className="border border-slate-200 rounded-xl p-4">
                                        <p className="text-[10px] uppercase text-slate-400 font-semibold">Remaining Days</p>
                                        <p className="font-semibold text-slate-900">{purchased.remaining_days ?? "—"}</p>
                                    </div>
                                    <div className="border border-slate-200 rounded-xl p-4">
                                        <p className="text-[10px] uppercase text-slate-400 font-semibold">Type</p>
                                        <p className="font-semibold text-slate-900">{purchased.is_trial ? "Trial" : "Paid"}</p>
                                    </div>
                                </div>

                                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <FaBoxOpen className="text-slate-400" />
                                            <span>{purchased.max_products || "Unlimited"} products</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <FaFileInvoice className="text-slate-400" />
                                            <span>{purchased.max_invoices || "Unlimited"} invoices</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <FaUsers className="text-slate-400" />
                                            <span>{purchased.max_staff || "Unlimited"} staff members</span>
                                        </div>
                                    </div>
                                    <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                                        <Feature label="Team chat" enabled={purchased.has_chat} />
                                        <Feature label="AI Agent" enabled={purchased.has_ai_agent} />
                                        <Feature label="Advanced analytics" enabled={purchased.has_advanced_analytics} />
                                        <Feature label="API access" enabled={purchased.has_api_access} />
                                    </div>
                                </div>

                                <div className="mt-6 border border-slate-200 rounded-2xl p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                                                <FaChartBar />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-900">Current Usage</h4>
                                                <p className="text-xs text-slate-500">Usage for this plan cycle</p>
                                            </div>
                                        </div>
                                        {usageLoading && <span className="text-xs text-slate-400">Loading...</span>}
                                    </div>
                                    {!usageLoading && !usage && (
                                        <div className="text-xs text-slate-500">Usage data not available yet.</div>
                                    )}
                                    {usage && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
                                            {usageStats.map(({ key, label, used, max, Icon }) => {
                                                const isUnlimited = !max;
                                                const safeMax = max || 0;
                                                const pct = safeMax > 0 ? Math.min(100, Math.round((used / safeMax) * 100)) : 0;
                                                const left = Math.max(0, safeMax - used);

                                                return (
                                                    <div key={key} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2 text-slate-600">
                                                                <Icon className="text-slate-400" />
                                                                <span className="text-[10px] uppercase text-slate-400 font-semibold">{label}</span>
                                                            </div>
                                                            <span className="text-[10px] font-semibold text-slate-500">
                                                                {used}/{isUnlimited ? "∞" : safeMax}
                                                            </span>
                                                        </div>

                                                        {!isUnlimited ? (
                                                            <>
                                                                <div className="mt-3 h-2 w-full rounded-full bg-white border border-slate-200 overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-slate-900/80"
                                                                        style={{ width: `${pct}%` }}
                                                                    />
                                                                </div>
                                                                <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
                                                                    <span>{pct}% used</span>
                                                                    <span>{left} left</span>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="mt-3 text-[10px] text-slate-500 font-medium">
                                                                Unlimited access
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <PlansSection
                    title="Subscription Plans"
                    subtitle="Compare plan limits and choose what fits your business today."
                    currentPlan={purchased}
                    onSuccess={fetchPurchased}
                />
            </div>

            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                subscriptionId={renewSubscriptionId}
                amount={renewAmount}
                onPaymentSuccess={handlePaymentSuccess}
            />

            {showReminderModal && purchased && (purchased.plan || purchased.plan_id) && (
                <Suspense fallback={null}>
                    <EntityReminderModal
                        isOpen={showReminderModal}
                        onClose={() => setShowReminderModal(false)}
                        entityType="subscription.plan"
                        entityId={purchased.plan || purchased.plan_id}
                        entityTitle={`Subscription Plan: ${purchased.plan_name || "Current Plan"}`}
                    />
                </Suspense>
            )}
        </div>
    );
}

function Feature({ label, enabled }) {
    return (
        <div className="flex items-center gap-2 text-sm">
            <FaCheckCircle className={enabled ? "text-emerald-500" : "text-slate-300"} />
            <span className={enabled ? "text-slate-700" : "text-slate-400 line-through"}>{label}</span>
        </div>
    );
}
