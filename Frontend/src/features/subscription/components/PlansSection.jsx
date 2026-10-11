import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { FaCheck, FaCrown, FaUsers, FaBoxOpen, FaFileInvoice, FaCodeBranch, FaChevronRight, FaGem, FaRocket, FaShieldAlt } from "react-icons/fa";
import toast from "react-hot-toast";
import { paymentService } from "@/services/paymentService";

export default function PlansSection({ compact = false, title = "Select Your Experience", subtitle = "Choose a plan that fits your business scale. From startups to enterprises, we have you covered.", currentPlan = null, onSuccess, isEmbed = false, onComplete = null }) {
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
                setError("Service temporarily unavailable");
                setPlans([]);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchPlans();
        return () => { isMounted = false; };
    }, []);

    const visiblePlans = useMemo(() => {
        return [...plans].sort((a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0));
    }, [plans]);

    const handleChoosePlan = async (plan) => {
        if (!plan?.id) return;
        const price = parseFloat(plan.price || 0);
        setPurchasingId(plan.id);
        try {
            const res = await api.post("/subscription/plan/purchase/", { plan_id: plan.id });
            const { subscription_id } = res.data;
            if (price > 0) {
                const successUrl = `${window.location.origin}/subscriptions?session_id={CHECKOUT_SESSION_ID}#current-plan`;
                const cancelUrl = `${window.location.origin}/subscriptions`;
                const payData = await paymentService.initiateSubscriptionPayment(subscription_id, successUrl, cancelUrl);
                if (payData.checkout_url) {
                    window.location.href = payData.checkout_url;
                    return;
                }
            } else {
                toast.success("Plan activated successfully");
                if (onSuccess) onSuccess();
                if (isEmbed && onComplete) onComplete(res.data);
            }
        } catch (err) {
            toast.error(err?.response?.data?.detail || err?.response?.data?.error || "Action failed");
        } finally {
            setPurchasingId(null);
        }
    };

    const handlePaymentSuccess = () => {
        setIsPaymentModalOpen(false);
        toast.success("Subscription activated!");
        if (onSuccess) onSuccess();
        if (isEmbed && onComplete) onComplete({ success: true });
    };

    if (loading) {
        return (
            <div className="py-24 flex items-center justify-center">
                <div className="h-12 w-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!loading && plans.length === 0) {
        return null;
    }

    return (
        <section className={isEmbed ? "relative p-2 overflow-hidden bg-transparent" : "relative py-16 overflow-hidden"}>
            {/* Background Elements */}
            {!isEmbed && (
                <>
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl -z-10"></div>
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-10"></div>
                </>
            )}

            <div className={isEmbed ? "" : "section-shell"}>
                <div className={`text-center max-w-3xl mx-auto ${isEmbed ? "mb-6" : "mb-12"}`}>
                    <h2 className={`font-black text-slate-900 tracking-tight ${isEmbed ? "text-xl mb-2" : "text-3xl md:text-4xl mb-4"}`}>
                        {title}
                    </h2>
                    <p className={`text-slate-500 font-medium leading-relaxed ${isEmbed ? "text-xs px-2" : "text-base"}`}>
                        {subtitle}
                    </p>
                </div>

                <div className="overflow-x-auto pb-8 custom-scrollbar">
                    <div className="flex xl:grid xl:grid-cols-4 gap-6 min-w-max xl:min-w-0 p-4">
                        {visiblePlans.map((plan, index) => {
                            const isRecommended = index === 1 || plan.name?.toLowerCase().includes("pro");
                            const isFree = parseFloat(plan.price || 0) === 0;
                            // Multi-strategy plan matching for robustness
                            const isCurrent = currentPlan && (
                                currentPlan.plan === plan.id || 
                                currentPlan.plan_id === plan.id || 
                                currentPlan.id === plan.id
                            );
                            const isEnterprise = index === visiblePlans.length - 1 && visiblePlans.length > 2;

                            return (
                                <div
                                    key={plan.id ?? index}
                                    className={`relative flex flex-col group transition-all duration-500 hover:-translate-y-2 w-[280px] sm:w-[320px] xl:w-full ${
                                        isRecommended 
                                        ? "bg-white border-2 border-brand-500 shadow-2xl shadow-brand-500/20 z-10 rounded-3xl" 
                                        : "bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-xl shadow-slate-200/50 rounded-3xl"
                                    }`}
                                >
                                    {isRecommended && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-600 to-brand-400 text-white text-[9px] font-black uppercase tracking-widest px-5 py-1.5 rounded-full shadow-lg">
                                            Most Popular
                                        </div>
                                    )}

                                    <div className="p-6 pb-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm ${
                                                isRecommended ? "bg-brand-50 text-brand-600" : "bg-slate-50 text-slate-400"
                                            }`}>
                                                {isFree ? <FaRocket /> : isRecommended ? <FaGem /> : isEnterprise ? <FaCrown /> : <FaShieldAlt />}
                                            </div>
                                            
                                            {isCurrent && (
                                                currentPlan.is_active ? (
                                                    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border border-emerald-100">
                                                        <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></div>
                                                        Current
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border border-rose-100">
                                                        <div className="h-1 w-1 rounded-full bg-rose-500 animate-pulse"></div>
                                                        Expired
                                                    </div>
                                                )
                                            )}
                                        </div>

                                        <h3 className="text-lg font-black text-slate-900 mb-1">{plan.name}</h3>
                                        
                                        <div className="flex items-baseline gap-1 mt-3">
                                            <span className="text-3xl font-black text-slate-900 tracking-tight">
                                                {isFree ? "Free" : `₹${Math.floor(plan.price)}`}
                                            </span>
                                            {!isFree && (
                                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">/{plan.duration_days}d</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="px-6 py-4 flex-1 space-y-6">
                                        <div className="space-y-3">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Quotas</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <QuotaCard icon={<FaCodeBranch />} label="Branches" value={plan.max_branches} />
                                                <QuotaCard icon={<FaBoxOpen />} label="Products" value={plan.max_products} />
                                                <QuotaCard icon={<FaFileInvoice />} label="Invoices" value={plan.max_invoices} />
                                                <QuotaCard icon={<FaUsers />} label="Staff" value={plan.max_staff} />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Features</p>
                                            <div className="space-y-2">
                                                <FeatureItem label="Advanced Analytics" enabled={plan.has_advanced_analytics} />
                                                <FeatureItem label="Team Chat" enabled={plan.has_chat} />
                                                <FeatureItem label="AI Operations Agent" enabled={plan.has_ai_agent} />
                                                <FeatureItem label="API Access" enabled={plan.has_api_access} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 pt-2">
                                        <button
                                            onClick={() => !isCurrent && handleChoosePlan(plan)}
                                            disabled={purchasingId === plan.id || isCurrent}
                                            className={`w-full group/btn relative flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all duration-300 ${
                                                isCurrent
                                                ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                                                : isRecommended
                                                    ? "bg-brand-500 text-white hover:bg-brand-600 shadow-xl shadow-brand-500/20"
                                                    : "bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/10"
                                            }`}
                                        >
                                            {purchasingId === plan.id ? (
                                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            ) : isCurrent ? (
                                                "Active Plan"
                                            ) : (
                                                <>
                                                    <span>{isFree ? "Start Now" : "Get Started"}</span>
                                                    <FaChevronRight size={10} className="transition-transform group-hover/btn:translate-x-1" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>


        </section>
    );
}

function QuotaCard({ icon, label, value }) {
    return (
        <div className="bg-slate-50/50 border border-slate-100 p-2.5 rounded-xl">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <span className="text-[9px]">{icon}</span>
                <span className="text-[8px] font-black uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-xs font-black text-slate-900">{value || "∞"}</div>
        </div>
    );
}

function FeatureItem({ label, enabled }) {
    return (
        <div className="flex items-center gap-2.5">
            <div className={`h-4 w-4 rounded-md flex items-center justify-center ${
                enabled ? "bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-500/10" : "bg-slate-50 text-slate-300"
            }`}>
                <FaCheck size={7} strokeWidth={3} />
            </div>
            <span className={`text-[12px] font-bold ${enabled ? "text-slate-700" : "text-slate-400 line-through decoration-slate-200"}`}>
                {label}
            </span>
        </div>
    );
}
