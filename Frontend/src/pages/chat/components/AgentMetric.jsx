import React from 'react';

const AgentMetric = ({ icon: Icon, label, value, tone = "slate" }) => {
    const tones = {
        slate: "border-slate-200 bg-white text-slate-800",
        brand: "border-brand-100 bg-brand-50 text-brand-700",
        emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    };

    return (
        <div className={`rounded-2xl border px-4 py-4 shadow-sm ${tones[tone] || tones.slate} transition-all duration-300 hover:shadow-md`}>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] opacity-75">
                <Icon size={11} />
                {label}
            </div>
            <p className="text-sm font-bold leading-6 truncate">{value}</p>
        </div>
    );
};

export default AgentMetric;
