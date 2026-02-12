import {
    FaPercentage,
    FaUserCheck,
    FaUserPlus,
    FaUsers,
    FaUserTimes,
} from "react-icons/fa";

const parseNumber = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "string") return Number(value.replace(/,/g, ""));
    return Number(value);
};

const normalizeRate = (value) => {
    const numeric = parseNumber(value);
    if (!Number.isFinite(numeric) || numeric === 0) return numeric === 0 ? 0 : null;
    return numeric > 1 ? numeric / 100 : numeric;
};

import PremiumOverlay from "@/components/common/PremiumOverlay";

export default function CustomerRetention({ data, loading, isLocked }) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse h-24 bg-gray-100 rounded-2xl" />
                ))}
            </div>
        );
    }

    if (!data && !isLocked) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                No retention data available for the selected filters.
            </div>
        );
    }

    const lockedData = {
        total_customers: 1250,
        new_customers: 150,
        returning_customers: 1100,
        retention_rate: 88,
        churn_rate: 12,
    };

    const displayData = isLocked ? lockedData : data;

    const totalCustomers = parseNumber(displayData.total_customers);
    const newCustomers = parseNumber(displayData.new_customers);
    const returningCustomers = parseNumber(displayData.returning_customers);
    const retentionRate = normalizeRate(displayData.retention_rate);
    const churnRate = normalizeRate(displayData.churn_rate);

    const newShare = totalCustomers > 0 ? (newCustomers / totalCustomers) * 100 : null;
    const returningShare = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : null;

    return (
        <div className="relative group">
            {isLocked && <PremiumOverlay message="Unlock advanced retention metrics with the Premium plan." blur={true} />}
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 ${isLocked ? "blur-sm opacity-50 select-none pointer-events-none" : ""}`}>
                <StatCard
                    title="Total Customers"
                    value={isLocked ? "1,250" : (totalCustomers || "—")}
                    icon={<FaUsers />}
                    accent="brand"
                    sub={totalCustomers ? "Current period" : "No totals"}
                />
                <StatCard
                    title="New Customers"
                    value={isLocked ? "150" : (newCustomers || "—")}
                    icon={<FaUserPlus />}
                    accent="sky"
                    sub={newShare !== null ? `${newShare.toFixed(1)}% of total` : "No totals"}
                />
                <StatCard
                    title="Returning"
                    value={isLocked ? "1,100" : (returningCustomers || "—")}
                    icon={<FaUserCheck />}
                    accent="emerald"
                    sub={returningShare !== null ? `${returningShare.toFixed(1)}% of total` : "No totals"}
                />
                <StatCard
                    title="Retention Rate"
                    value={isLocked ? "88.0%" : (retentionRate !== null ? `${(retentionRate * 100).toFixed(1)}%` : "—")}
                    icon={<FaPercentage />}
                    accent="indigo"
                    sub="Share returning"
                />
                <StatCard
                    title="Churn Rate"
                    value={isLocked ? "12.0%" : (churnRate !== null ? `${(churnRate * 100).toFixed(1)}%` : "—")}
                    icon={<FaUserTimes />}
                    accent="rose"
                    sub="Share lost"
                />
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, accent, sub }) {
    const accentStyles = {
        brand: { border: "border-l-brand-500", icon: "text-brand-600 bg-brand-50 border-brand-100" },
        sky: { border: "border-l-sky-500", icon: "text-sky-600 bg-sky-50 border-sky-100" },
        emerald: {
            border: "border-l-emerald-500",
            icon: "text-emerald-600 bg-emerald-50 border-emerald-100",
        },
        indigo: {
            border: "border-l-indigo-500",
            icon: "text-indigo-600 bg-indigo-50 border-indigo-100",
        },
        rose: { border: "border-l-rose-500", icon: "text-rose-600 bg-rose-50 border-rose-100" },
    };

    const styles = accentStyles[accent] || accentStyles.brand;

    return (
        <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 ${styles.border}`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {title}
                    </p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">{value}</p>
                    <p className="text-xs text-slate-500 mt-1">{sub}</p>
                </div>
                <div className={`h-9 w-9 rounded-lg border ${styles.icon} flex items-center justify-center`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}
