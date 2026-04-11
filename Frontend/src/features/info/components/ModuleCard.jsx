import { Link } from "react-router-dom";
import { ArrowRight, Lock } from "lucide-react";

import {
    isModuleAccessible,
    isModuleVisibleForRole,
    moduleAvailabilityLabel,
    resolveModulePath,
} from "@/features/info/utils/moduleAccess";

export default function ModuleCard({ module, role, workSet, showHighlights = true }) {
    const Icon = module.icon;
    const visibleForRole = isModuleVisibleForRole(module, role);
    const accessible = isModuleAccessible(module, role, workSet);
    const isPublic = module.roles.includes("PUBLIC");
    const path = accessible ? resolveModulePath(module, role) : !role && !isPublic ? "/login" : null;
    const guidePath = `/info/modules/${module.id}`;

    const statusLabel = role
        ? moduleAvailabilityLabel(module, role, workSet)
        : isPublic
            ? "Public"
            : "Login required";

    const statusTone = accessible
        ? "bg-emerald-100 text-emerald-700"
        : visibleForRole || !role
            ? "bg-amber-100 text-amber-700"
            : "bg-slate-200 text-slate-600";

    return (
        <article className="h-full rounded-2xl border border-slate-200 bg-white shadow-sm p-5 flex flex-col">
            <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{module.category}</p>
                    <h3 className="text-lg font-bold text-slate-900">{module.title}</h3>
                </div>
            </div>

            <p className="mt-3 text-sm text-slate-600 leading-relaxed">{module.description}</p>

            {showHighlights && Array.isArray(module.highlights) && module.highlights.length > 0 && (
                <ul className="mt-4 space-y-2">
                    {module.highlights.slice(0, 3).map((item) => (
                        <li key={item} className="text-xs text-slate-600 flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            )}

            <div className="mt-auto pt-5 flex items-center justify-between gap-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTone}`}>
                    {statusLabel}
                </span>

                <div className="flex items-center gap-3">
                    <Link
                        to={guidePath}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-brand-700 transition-colors"
                    >
                        Guide
                        <ArrowRight className="h-4 w-4" />
                    </Link>

                    {path ? (
                        <Link
                            to={path}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-slate-800 hover:text-brand-700 transition-colors"
                        >
                            Open
                        </Link>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-400">
                            <Lock className="h-4 w-4" />
                            Restricted
                        </span>
                    )}
                </div>
            </div>
        </article>
    );
}
