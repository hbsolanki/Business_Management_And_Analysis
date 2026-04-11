import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { FaCheckCircle, FaCrown, FaUsers, FaBoxOpen, FaFileInvoice, FaCodeBranch } from "react-icons/fa";
import toast from "react-hot-toast";
import PaymentModal from "@/features/payment/components/PaymentModal";


const fallbackPlans = [
    {
        id: 1,
        name: "Basic Plan",
        price: "99.00",
        duration_days: 28,
        max_products: 10,
        max_invoices: 200,
        max_staff: 5,
        max_branches: 1,
        has_advanced_analytics: false,
        has_chat: true,
        has_ai_agent: false,
        has_api_access: false
    }
];

export default function PlansSection({ compact = false, title = "Our Plans", subtitle = "Choose a plan that fits your team size and workflow needs.", currentPlan = null, onSuccess }) {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [purchasingId, setPurchasingId] = useState(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedSubscriptionId, setSelectedSubscriptionId] = useState(null);
    const [selectedPlanAmount, setSelectedPlanAmount] = useState(0);

    useEffect(() => {
        let isMounted = true;

        const fetchPlans = async () => {
            try {
                const res = await api.get("/subscription/plan/");
                if (!isMounted) return;
                const data = Array.isArray(res.data) ? res.data : [];
                setPlans(data);
            } catch {
                if (!isMounted) return;
                setError("Failed to load plans");
                setPlans([]);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchPlans();
        return () => {
            isMounted = false;
        };
    }, []);

    const visiblePlans = useMemo(() => {
        let sourcePlans = plans.length > 0 ? plans : (loading || error ? fallbackPlans : []);

        // 1. Sort: Free plan first (assuming price 0 or duration 0 is Free)
        // Adjust sort logic based on price
        const sorted = [...sourcePlans].sort((a, b) => {
            const priceA = parseFloat(a.price || 0);
            const priceB = parseFloat(b.price || 0);
            return priceA - priceB;
        });

        // 2. Filter: If user has a paid active plan (id exists and duration > 0), hide Free plans
        const isPaidActive = currentPlan && currentPlan.duration_days > 0 && currentPlan.is_active;

        if (isPaidActive) {
            return sorted.filter(p => parseFloat(p.price || 0) > 0);
        }

        return sorted;
    }, [plans, loading, error, currentPlan]);

    const handleChoosePlan = async (plan) => {
        if (!plan?.id) return;

        // If it's a free plan, the old logic might still apply OR it might be handled by the same endpoint.
        // Assuming the user wants the new flow for paid plans.
        const price = parseFloat(plan.price || 0);

        setPurchasingId(plan.id);
        try {
            const res = await api.post("/subscription/plan/purchase/", { plan_id: plan.id });

            if (price > 0) {
                // Paid plan: Get subscription_id and open payment modal
                const { subscription_id } = res.data;
                setSelectedSubscriptionId(subscription_id);
                setSelectedPlanAmount(price);
                setIsPaymentModalOpen(true);
            } else {
                // Free plan: Success immediately
                toast.success("Plan activated successfully");
                if (onSuccess) onSuccess();
            }
        } catch (err) {
            toast.error(err?.response?.data?.detail || "Failed to choose plan");
        } finally {
            setPurchasingId(null);
        }
    };

    const handlePaymentSuccess = () => {
        setIsPaymentModalOpen(false);
        toast.success("Subscription activated successfully!");
        if (onSuccess) onSuccess();
    };

    return (
        <section className="py-10">
            <div className={`mx-auto ${compact ? "max-w-6xl" : "max-w-5xl"} px-4 sm:px-6 lg:px-8`}>
                <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                                <FaCrown className="text-slate-500" /> Plans
                            </div>
                            <h2 className="mt-3 text-3xl font-bold text-slate-900">{title}</h2>
                            <p className="mt-2 text-slate-500">{subtitle}</p>
                        </div>
                        {loading && (
                            <div className="text-xs text-slate-400">Loading plans...</div>
                        )}
                    </div>

                    {error && (
                        <div className="mb-6 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                            {error}. Showing available plan details.
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {visiblePlans.map((plan, index) => {
                            const isCurrent = currentPlan && (currentPlan.plan === plan.id || currentPlan.plan_id === plan.id);
                            const isFree = parseFloat(plan.price || 0) === 0;
                            const isRecommended = index === 1;

                            return (
                                <div
                                    key={plan.id ?? index}
                                    className={`relative flex flex-col p-8 rounded-2xl transition-all duration-300 ${isCurrent
                                        ? "bg-white border-2 border-slate-900 shadow-xl"
                                        : isRecommended
                                            ? "bg-white border-2 border-blue-600 shadow-lg"
                                            : "bg-white border border-slate-200 shadow-sm hover:shadow-md"
                                        }`}
                                >
                                    {isCurrent && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider px-4 py-1 rounded-md shadow-sm">
                                            Active Plan
                                        </div>
                                    )}

                                    <div className="mb-8">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="text-xl font-bold text-slate-900">
                                                {plan.name}
                                            </h3>
                                        </div>

                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-extrabold text-slate-900">
                                                {isFree ? "Free" : `₹${Math.floor(plan.price)}`}
                                            </span>
                                            {!isFree && (
                                                <span className="text-slate-500 font-semibold text-sm">
                                                    /{plan.duration_days} days
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                                            {isFree
                                                ? "Essential features to get your business started."
                                                : `Full access to all business features for ${plan.duration_days} days.`}
                                        </p>
                                    </div>

                                    <div className="flex-1 space-y-4 pt-6 border-t border-slate-100">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                                            Plan Features
                                        </div>
                                        <FeatureItem
                                            icon={<FaCodeBranch className="text-slate-400" size={16} />}
                                            label={`${plan.max_branches || "Unlimited"} Branches`}
                                        />
                                        <FeatureItem
                                            icon={<FaBoxOpen className="text-slate-400" size={16} />}
                                            label={`${plan.max_products || "Unlimited"} Products`}
                                        />
                                        <FeatureItem
                                            icon={<FaFileInvoice className="text-slate-400" size={16} />}
                                            label={`${plan.max_invoices || "Unlimited"} Invoices`}
                                        />
                                        <FeatureItem
                                            icon={<FaUsers className="text-slate-400" size={16} />}
                                            label={`${plan.max_staff || "Unlimited"} Staff Members`}
                                        />

                                        <div className="pt-4 space-y-3">
                                            <FeatureRow label="Team Chat & Collaboration" enabled={plan.has_chat} />
                                            <FeatureRow label="AI Agent Access" enabled={plan.has_ai_agent} />
                                            <FeatureRow label="Advanced Business Analytics" enabled={plan.has_advanced_analytics} />
                                            <FeatureRow label="Standard API Access" enabled={plan.has_api_access} />
                                        </div>
                                    </div>

                                    {!isFree && (
                                        <button
                                            onClick={() => handleChoosePlan(plan)}
                                            disabled={purchasingId === plan.id || isCurrent}
                                            className={`mt-10 w-full rounded-xl py-3.5 text-sm font-bold transition-all duration-200 ${isCurrent
                                                ? "bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed"
                                                : isRecommended
                                                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm active:scale-95"
                                                    : "bg-slate-900 text-white hover:bg-slate-800 shadow-sm active:scale-95"
                                                }`}
                                        >
                                            {purchasingId === plan.id ? (
                                                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto"></div>
                                            ) : isCurrent ? (
                                                "Current Plan"
                                            ) : (
                                                "Select Plan"
                                            )}
                                        </button>
                                    )}

                                    {isFree && !isCurrent && (
                                        <div className="mt-10 py-3.5 px-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                                            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                                Active
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                subscriptionId={selectedSubscriptionId}
                amount={selectedPlanAmount}
                onPaymentSuccess={handlePaymentSuccess}
            />
        </section >
    );
}

function FeatureItem({ icon, label }) {
    return (
        <div className="flex items-center gap-3">
            <div className="text-slate-400">
                {icon}
            </div>
            <span className="text-sm font-semibold text-slate-700">
                {label}
            </span>
        </div>
    );
}

function FeatureRow({ label, enabled }) {
    return (
        <div className="flex items-center gap-3">
            <div className={`flex-shrink-0 h-4 w-4 rounded-full flex items-center justify-center ${enabled ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-300"}`}>
                <FaCheckCircle size={10} />
            </div>
            <span className={`text-[13px] font-medium ${enabled
                ? "text-slate-600"
                : "text-slate-400 line-through decoration-slate-200"}`}
            >
                {label}
            </span>
        </div>
    );
}
