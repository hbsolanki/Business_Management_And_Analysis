import { Link, useParams } from "react-router-dom";
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    BookOpenText,
    CheckCircle2,
    ClipboardList,
    ExternalLink,
    Layers3,
    Lock,
} from "lucide-react";
import { useMemo } from "react";

import {
    MODULE_GUIDES,
    PRODUCT_MODULES,
} from "@/features/info/data/infoModules";
import {
    isModuleAccessible,
    moduleAvailabilityLabel,
    parseWork,
    resolveModulePath,
} from "@/features/info/utils/moduleAccess";
import { tokenService } from "@/services/tokenService";

function ListSection({ title, icon: Icon, items }) {
    if (!Array.isArray(items) || items.length === 0) return null;
    return (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 md:p-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Icon className="h-5 w-5 text-slate-700" />
                {title}
            </h2>
            <ol className="mt-4 space-y-3">
                {items.map((item, index) => (
                    <li key={`${title}-${index}`} className="flex items-start gap-3 text-sm text-slate-700">
                        <span className="mt-0.5 h-6 w-6 rounded-lg bg-slate-100 text-xs font-bold text-slate-700 flex items-center justify-center shrink-0">
                            {index + 1}
                        </span>
                        <span>{item}</span>
                    </li>
                ))}
            </ol>
        </section>
    );
}

export default function ModuleGuide() {
    const { moduleId } = useParams();
    const role = (tokenService.getRole() || "").toUpperCase() || null;
    const workSet = parseWork(tokenService.getWork());

    const module = PRODUCT_MODULES.find((item) => item.id === moduleId);
    const guide = module ? MODULE_GUIDES[module.id] : null;
    const moduleById = useMemo(
        () => new Map(PRODUCT_MODULES.map((item) => [item.id, item])),
        [],
    );

    if (!module) {
        return (
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-8 text-center">
                <h1 className="text-2xl font-bold text-slate-900">Module guide not found</h1>
                <p className="mt-2 text-sm text-slate-600">
                    The selected guide does not exist. Open module directory and pick another module.
                </p>
                <Link
                    to="/info/modules"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                    Back to directory
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        );
    }

    const Icon = module.icon;
    const isAccessible = isModuleAccessible(module, role, workSet);
    const statusLabel = role
        ? moduleAvailabilityLabel(module, role, workSet)
        : module.roles.includes("PUBLIC")
            ? "Public"
            : "Login required";
    const openPath = isAccessible ? resolveModulePath(module, role) : null;
    const relatedModules = (guide?.relatedModules || [])
        .map((id) => moduleById.get(id))
        .filter(Boolean);

    return (
        <div className="space-y-6 pb-8">
            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
                <Link
                    to="/info/modules"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to module directory
                </Link>

                <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                            <Icon className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{module.category}</p>
                            <h1 className="text-3xl font-bold text-slate-900">{module.title}</h1>
                            <p className="mt-2 text-slate-600 max-w-3xl">{module.description}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isAccessible ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {statusLabel}
                        </span>
                        {openPath ? (
                            <Link
                                to={openPath}
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                            >
                                Open module
                                <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                        ) : (
                            <span className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-400">
                                <Lock className="h-3.5 w-3.5" />
                                Restricted
                            </span>
                        )}
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 md:p-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <BookOpenText className="h-5 w-5 text-slate-700" />
                    What It Means
                </h2>
                <p className="mt-3 text-sm text-slate-700 leading-relaxed">
                    {guide?.meaning || "Detailed documentation for this module will be added shortly."}
                </p>
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
                <ListSection title="When To Use" icon={CheckCircle2} items={guide?.whenToUse || []} />
                <ListSection title="How To Use" icon={ClipboardList} items={guide?.howToUse || []} />
            </div>

            {Array.isArray(guide?.keyTerms) && guide.keyTerms.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 md:p-6">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Layers3 className="h-5 w-5 text-slate-700" />
                        Key Terms
                    </h2>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {guide.keyTerms.map((term) => (
                            <article key={term.term} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <h3 className="text-sm font-semibold text-slate-900">{term.term}</h3>
                                <p className="mt-1 text-sm text-slate-600">{term.definition}</p>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {Array.isArray(guide?.checks) && guide.checks.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 md:p-6">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-slate-700" />
                        Quality Checklist
                    </h2>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {guide.checks.map((check) => (
                            <div key={check} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                                {check}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {Array.isArray(guide?.reports) && guide.reports.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 md:p-6">
                    <h2 className="text-lg font-bold text-slate-900">Analytics Reports Map</h2>
                    <p className="mt-1 text-sm text-slate-600">
                        Use these report cards to understand purpose, valid filters, and output for each analytics view.
                    </p>
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {guide.reports.map((report) => (
                            <article key={report.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <h3 className="text-sm font-semibold text-slate-900">{report.title}</h3>
                                <p className="mt-1 text-xs text-slate-600">{report.purpose}</p>
                                <dl className="mt-3 space-y-2 text-xs">
                                    <div>
                                        <dt className="font-semibold text-slate-700">Endpoint</dt>
                                        <dd className="text-slate-600 break-all">{report.endpoint}</dd>
                                    </div>
                                    <div>
                                        <dt className="font-semibold text-slate-700">Filters</dt>
                                        <dd className="text-slate-600">{report.filters}</dd>
                                    </div>
                                    <div>
                                        <dt className="font-semibold text-slate-700">When To Use</dt>
                                        <dd className="text-slate-600">{report.whenToUse}</dd>
                                    </div>
                                    <div>
                                        <dt className="font-semibold text-slate-700">Output</dt>
                                        <dd className="text-slate-600">{report.output}</dd>
                                    </div>
                                </dl>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {relatedModules.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 md:p-6">
                    <h2 className="text-lg font-bold text-slate-900">Related Modules</h2>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {relatedModules.map((item) => (
                            <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                                <p className="mt-1 text-xs text-slate-600">{item.description}</p>
                                <div className="mt-3 flex items-center gap-3">
                                    <Link
                                        to={`/info/modules/${item.id}`}
                                        className="text-xs font-semibold text-slate-700 hover:text-brand-700 inline-flex items-center gap-1"
                                    >
                                        Read guide
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                    {isModuleAccessible(item, role, workSet) ? (
                                        <Link
                                            to={resolveModulePath(item, role)}
                                            className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                                        >
                                            Open
                                        </Link>
                                    ) : (
                                        <span className="text-xs font-semibold text-slate-400">Restricted</span>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
