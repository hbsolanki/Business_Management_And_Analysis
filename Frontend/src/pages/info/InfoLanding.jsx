import { Link } from "react-router-dom";
import { ArrowRight, BookMarked, Compass, LifeBuoy, Search } from "lucide-react";
import { useMemo, useState } from "react";

import ModuleCard from "@/features/info/components/ModuleCard";
import PlaybookCard from "@/features/info/components/PlaybookCard";
import {
    INFO_KEY_METRICS,
    PLATFORM_PHASES,
    PRODUCT_MODULES,
    ROLE_PLAYBOOKS,
} from "@/features/info/data/infoModules";
import { tokenService } from "@/services/tokenService";
import { parseWork } from "@/features/info/utils/moduleAccess";

const ROLE_GUIDES = [
    {
        key: "OWNER",
        title: "Owner Guide",
        description: "Strategy, governance, subscriptions, and financial visibility.",
        path: "/info/owner",
    },
    {
        key: "MANAGER",
        title: "Manager Guide",
        description: "Execution control, employee supervision, and daily operations.",
        path: "/info/manager",
    },
    {
        key: "EMPLOYEE",
        title: "Employee Guide",
        description: "Assigned work process for tasks, products, stock, and invoicing.",
        path: "/info/employee",
    },
];

export default function InfoLanding() {
    const role = (tokenService.getRole() || "").toUpperCase() || null;
    const workSet = parseWork(tokenService.getWork());
    const [search, setSearch] = useState("");

    const modulesById = useMemo(
        () => new Map(PRODUCT_MODULES.map((item) => [item.id, item])),
        [],
    );

    const filteredPreviewModules = useMemo(() => {
        const term = search.trim().toLowerCase();
        const source = PRODUCT_MODULES.filter((module) => module.id !== "support");

        if (!term) return source.slice(0, 6);

        return source
            .filter((module) => {
                const haystack = [
                    module.title,
                    module.category,
                    module.description,
                    ...(module.highlights || []),
                ]
                    .join(" ")
                    .toLowerCase();
                return haystack.includes(term);
            })
            .slice(0, 6);
    }, [search]);

    const currentPlaybook = role ? ROLE_PLAYBOOKS[role] : null;

    return (
        <div className="space-y-8 pb-10">
            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 md:p-10">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    <BookMarked className="h-3.5 w-3.5" />
                    Platform Knowledge Hub
                </div>

                <h1 className="mt-4 text-3xl md:text-4xl font-bold text-slate-900">
                    End-to-end product guide with module-level navigation
                </h1>
                <p className="mt-3 max-w-3xl text-slate-600 leading-relaxed">
                    Use this section to understand every module from setup to daily operations and analytics. Open role guides, browse modules, and jump directly to the exact screen.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                    <Link to="/info/modules" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">
                        Explore All Modules
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link to="/info/support" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
                        Contact Support
                        <LifeBuoy className="h-4 w-4" />
                    </Link>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {INFO_KEY_METRICS.map((metric) => (
                        <div key={metric.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                            <p className="text-2xl font-bold text-slate-900">{metric.value}</p>
                            <p className="mt-1 text-sm text-slate-600">{metric.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
                <div className="flex items-center gap-2">
                    <Compass className="h-5 w-5 text-slate-700" />
                    <h2 className="text-xl font-bold text-slate-900">Zero to Production Flow</h2>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {PLATFORM_PHASES.map((phase) => (
                        <div key={phase.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <h3 className="text-base font-semibold text-slate-900">{phase.title}</h3>
                            <p className="mt-1 text-sm text-slate-600">{phase.description}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {phase.modules.map((moduleId) => {
                                    const module = modulesById.get(moduleId);
                                    if (!module) return null;
                                    return (
                                        <span
                                            key={moduleId}
                                            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600"
                                        >
                                            {module.title}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-4">
                {currentPlaybook ? (
                    <PlaybookCard
                        playbook={currentPlaybook}
                        role={role}
                        modulesById={modulesById}
                        workSet={workSet}
                    />
                ) : (
                    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
                        <h2 className="text-xl font-bold text-slate-900">Role-specific Guides</h2>
                        <p className="mt-2 text-sm text-slate-600">
                            Open your role guide for detailed workflow instructions and module responsibilities.
                        </p>
                        <div className="mt-5 grid gap-4 md:grid-cols-3">
                            {ROLE_GUIDES.map((guide) => (
                                <Link
                                    key={guide.key}
                                    to={guide.path}
                                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:bg-white hover:shadow-sm transition-all"
                                >
                                    <h3 className="text-base font-semibold text-slate-900">{guide.title}</h3>
                                    <p className="mt-1 text-sm text-slate-600">{guide.description}</p>
                                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
                                        Open guide
                                        <ArrowRight className="h-4 w-4" />
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Module Preview</h2>
                        <p className="text-sm text-slate-600">Click `Guide` on any module to read full meaning, when to use, and workflow.</p>
                    </div>
                    <div className="relative w-full sm:w-80">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search modules"
                            className="w-full pl-9"
                        />
                    </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredPreviewModules.length > 0 ? (
                        filteredPreviewModules.map((module) => (
                            <ModuleCard key={module.id} module={module} role={role} workSet={workSet} />
                        ))
                    ) : (
                        <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                            <p className="text-sm font-semibold text-slate-700">No modules matched your search.</p>
                            <p className="text-xs text-slate-500 mt-1">Try product, invoice, analytics, subscription, or support.</p>
                        </div>
                    )}
                </div>

                <div className="mt-6">
                    <Link
                        to="/info/modules"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-brand-700"
                    >
                        View full module directory
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>
        </div>
    );
}
