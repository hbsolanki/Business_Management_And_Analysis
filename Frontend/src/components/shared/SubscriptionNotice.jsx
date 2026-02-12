import { Link } from "react-router-dom";
import { FaCrown } from "react-icons/fa";

export default function SubscriptionNotice({
    title = "No active subscription",
    message = "Chat features are available only with an active plan.",
    ctaLabel = "View Plans",
    ctaTo = "/subscriptions",
}) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                    <FaCrown size={18} />
                </div>
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                    <p className="text-sm text-slate-500 mt-1">{message}</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                            to={ctaTo}
                            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all"
                        >
                            {ctaLabel}
                        </Link>
                        <Link
                            to="/subscriptions#current-plan"
                            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all"
                        >
                            Current Plan
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
