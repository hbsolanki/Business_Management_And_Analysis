import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { isModuleAccessible, resolveModulePath } from "@/features/info/utils/moduleAccess";

export default function PlaybookCard({ playbook, role, modulesById, workSet }) {
    if (!playbook) return null;

    return (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
            <h2 className="text-2xl font-bold text-slate-900">{playbook.title}</h2>
            <p className="mt-2 text-slate-600 leading-relaxed">{playbook.intro}</p>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Quick Start</h3>
                    <ol className="mt-3 space-y-3">
                        {playbook.quickStart.map((step, index) => (
                            <li key={step} className="flex items-start gap-3 text-sm text-slate-700">
                                <span className="mt-0.5 h-6 w-6 shrink-0 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">
                                    {index + 1}
                                </span>
                                <span>{step}</span>
                            </li>
                        ))}
                    </ol>
                </div>

                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Priority Modules</h3>
                    <div className="mt-3 space-y-2">
                        {playbook.priorityModules.map((moduleId) => {
                            const module = modulesById.get(moduleId);
                            if (!module) return null;
                            const canOpen = isModuleAccessible(module, role, workSet);
                            const modulePath = resolveModulePath(module, role);

                            return (
                                <div
                                    key={moduleId}
                                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                                >
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{module.title}</p>
                                        <p className="text-xs text-slate-500">{module.category}</p>
                                    </div>
                                    {canOpen ? (
                                        <Link to={modulePath} className="text-xs font-semibold text-slate-700 hover:text-brand-700 inline-flex items-center gap-1">
                                            Open
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </Link>
                                    ) : (
                                        <span className="text-xs font-semibold text-slate-400">Restricted</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
