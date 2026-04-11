import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useMemo } from "react";

import ModuleCard from "@/features/info/components/ModuleCard";
import PlaybookCard from "@/features/info/components/PlaybookCard";
import { PRODUCT_MODULES, ROLE_PLAYBOOKS } from "@/features/info/data/infoModules";
import { parseWork } from "@/features/info/utils/moduleAccess";
import { tokenService } from "@/services/tokenService";

export default function RoleGuidePage({
    roleKey,
    title,
    description,
    operatingRhythm = [],
    qualityChecks = [],
}) {
    const modulesById = useMemo(
        () => new Map(PRODUCT_MODULES.map((item) => [item.id, item])),
        [],
    );
    const playbook = ROLE_PLAYBOOKS[roleKey];
    const signedInRole = (tokenService.getRole() || "").toUpperCase() || null;
    const workSet = signedInRole === roleKey ? parseWork(tokenService.getWork()) : new Set();

    const spotlightModules = useMemo(() => {
        if (!playbook) return [];
        return playbook.priorityModules
            .map((moduleId) => modulesById.get(moduleId))
            .filter(Boolean);
    }, [modulesById, playbook]);

    return (
        <div className="space-y-6 pb-8">
            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
                <Link
                    to="/info"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to overview
                </Link>
                <h1 className="mt-3 text-3xl font-bold text-slate-900">{title}</h1>
                <p className="mt-2 text-slate-600 max-w-3xl">{description}</p>
            </section>

            <PlaybookCard
                playbook={playbook}
                role={roleKey}
                modulesById={modulesById}
                workSet={workSet}
            />

            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
                <h2 className="text-xl font-bold text-slate-900">Operating Rhythm</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {operatingRhythm.map((item, index) => (
                        <article key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step {index + 1}</p>
                            <h3 className="mt-1 text-base font-semibold text-slate-900">{item.title}</h3>
                            <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
                <h2 className="text-xl font-bold text-slate-900">Quality Checks</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {qualityChecks.map((item) => (
                        <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 flex items-start gap-2.5">
                            <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                            <span>{item}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
                <h2 className="text-xl font-bold text-slate-900">Module Spotlight</h2>
                <p className="mt-1 text-sm text-slate-600">High-priority modules for this role.</p>
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {spotlightModules.map((module) => (
                        <ModuleCard
                            key={module.id}
                            module={module}
                            role={roleKey}
                            workSet={workSet}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
}
