import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { FaCheckCircle, FaCrown, FaClock, FaUsers, FaBoxOpen, FaFileInvoice } from "react-icons/fa";
import toast from "react-hot-toast";

const fallbackPlans = [
    {
        id: 1,
        name: "Basic Plan",
        price: "99.00",
        duration_days: 28,
        max_products: 10,
        max_invoices: 200,
        max_staff: 5,
        has_advanced_analytics: false,
        has_chat: true,
        has_api_access: false
    }
];

export default function PlansSection({ compact = false, title = "Our Plans", subtitle = "Choose a plan that fits your team size and workflow needs.", currentPlan = null }) {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [purchasingId, setPurchasingId] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const fetchPlans = async () => {
            try {
                const res = await api.get("/subscription/plan/");
                if (!isMounted) return;
                const data = Array.isArray(res.data) ? res.data : [];
                setPlans(data);
            } catch (err) {
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
        setPurchasingId(plan.id);
        try {
            await api.post("/subscription/plan/purchase/", { plan_id: plan.id });
            toast.success("Plan selected successfully");
            // Optionally refresh or redirect
            window.location.reload();
        } catch (err) {
            toast.error(err?.response?.data?.detail || "Failed to choose plan");
        } finally {
            setPurchasingId(null);
        }
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

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {visiblePlans.map((plan, index) => {
                            // Check both 'plan' and 'plan_id' to be robust against serializer variants
                            const isCurrent = currentPlan && (currentPlan.plan === plan.id || currentPlan.plan_id === plan.id);
                            const isFree = parseFloat(plan.price || 0) === 0;

                            return (
                                <div
                                    key={plan.id ?? index}
                                    className={`relative bg-white border rounded-2xl p-6 shadow-sm transition-all ${isCurrent
                                        ? "border-brand-500 ring-4 ring-brand-50 shadow-brand-100"
                                        : "border-slate-200 hover:shadow-md hover:-translate-y-0.5"
                                        }`}
                                >
                                    {isCurrent && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[10px] font-bold uppercase tracking-wide px-3 py-1 rounded-full shadow-md">
                                            Current Plan
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                                        {plan.duration_days > 0 ? (
                                            <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">
                                                {plan.duration_days} days
                                            </span>
                                        ) : (
                                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                                                Forever
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-4 flex items-end gap-2">
                                        <span className="text-3xl font-extrabold text-slate-900">
                                            {isFree ? "Free" : `₹${plan.price}`}
                                        </span>
                                        {!isFree && <span className="text-xs text-slate-500 mb-1">per cycle</span>}
                                    </div>

                                    <div className="mt-5 space-y-3 text-sm text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <FaBoxOpen className="text-slate-400" />
                                            <span>{plan.max_products || "Unlimited"} products</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <FaFileInvoice className="text-slate-400" />
                                            <span>{plan.max_invoices || "Unlimited"} invoices</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <FaUsers className="text-slate-400" />
                                            <span>{plan.max_staff || "Unlimited"} staff members</span>
                                        </div>
                                        {plan.duration_days > 0 && (
                                            <div className="flex items-center gap-2">
                                                <FaClock className="text-slate-400" />
                                                <span>{plan.duration_days} day cycle</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-5 space-y-2 text-sm">
                                        <Feature label="Team chat" enabled={plan.has_chat} />
                                        <Feature label="Advanced analytics" enabled={plan.has_advanced_analytics} />
                                        <Feature label="API access" enabled={plan.has_api_access} />
                                    </div>

                                    <button
                                        onClick={() => handleChoosePlan(plan)}
                                        disabled={purchasingId === plan.id || isCurrent}
                                        className={`mt-6 w-full rounded-xl py-2.5 text-sm font-semibold transition-all ${isCurrent
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                                            : purchasingId === plan.id
                                                ? "bg-slate-300 text-slate-600 cursor-not-allowed"
                                                : "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200"
                                            }`}
                                    >
                                        {purchasingId === plan.id
                                            ? "Processing..."
                                            : isCurrent
                                                ? "Active Plan"
                                                : "Choose Plan"
                                        }
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}

function Feature({ label, enabled }) {
    return (
        <div className="flex items-center gap-2">
            <FaCheckCircle className={enabled ? "text-emerald-500" : "text-slate-300"} />
            <span className={enabled ? "text-slate-700" : "text-slate-400 line-through"}>{label}</span>
        </div>
    );
}
