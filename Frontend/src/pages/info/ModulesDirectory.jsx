import { Link } from "react-router-dom";
import { ArrowLeft, Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";

import ModuleCard from "@/features/info/components/ModuleCard";
import { PRODUCT_MODULES } from "@/features/info/data/infoModules";
import { tokenService } from "@/services/tokenService";
import { isModuleAccessible, parseWork } from "@/features/info/utils/moduleAccess";

const AVAILABILITY_OPTIONS = [
    { value: "all", label: "All" },
    { value: "available", label: "Available" },
    { value: "restricted", label: "Restricted" },
];

export default function ModulesDirectory() {
    const role = (tokenService.getRole() || "").toUpperCase() || null;
    const workSet = parseWork(tokenService.getWork());

    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("all");
    const [availability, setAvailability] = useState("all");

    const categories = useMemo(
        () => ["all", ...new Set(PRODUCT_MODULES.map((module) => module.category))],
        [],
    );

    const modules = useMemo(() => {
        const term = search.trim().toLowerCase();
        return PRODUCT_MODULES.filter((module) => {
            if (category !== "all" && module.category !== category) return false;

            if (availability !== "all") {
                const available = isModuleAccessible(module, role, workSet);
                if (availability === "available" && !available) return false;
                if (availability === "restricted" && available) return false;
            }

            if (!term) return true;
            const haystack = [
                module.title,
                module.description,
                module.category,
                ...(module.highlights || []),
            ]
                .join(" ")
                .toLowerCase();

            return haystack.includes(term);
        });
    }, [availability, category, role, search, workSet]);

    return (
        <div className="space-y-6 pb-8">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
                <Link
                    to="/info"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to overview
                </Link>

                <h1 className="mt-4 text-3xl font-bold text-slate-900">Module Directory</h1>
                <p className="mt-2 text-slate-600 max-w-3xl leading-relaxed">
                    Full map of platform modules with role-aware access. Click `Guide` on any card for complete usage documentation.
                </p>

                {/* Search and Filters */}
                <div className="mt-8 space-y-5">
                    {/* Search Bar */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                            <Search className="h-4 w-4 text-slate-600" />
                            Search Modules
                        </label>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search by module, feature, or category..."
                                className="w-full pl-12 pr-4 py-2.5 rounded-lg border-2 border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white outline-none transition-all"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                    aria-label="Clear search"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filters */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                            <Filter className="h-4 w-4 text-slate-600" />
                            Filter Options
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {/* Category Filter */}
                            <div className="relative">
                                <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <select
                                    value={category}
                                    onChange={(event) => setCategory(event.target.value)}
                                    className="w-full pl-11 pr-10 py-2.5 rounded-lg border-2 border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white outline-none transition-all appearance-none cursor-pointer"
                                >
                                    {categories.map((item) => (
                                        <option key={item} value={item}>
                                            {item === "all" ? "All categories" : item}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {/* Availability Filter */}
                            <div className="relative">
                                <select
                                    value={availability}
                                    onChange={(event) => setAvailability(event.target.value)}
                                    className="w-full pl-4 pr-10 py-2.5 rounded-lg border-2 border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white outline-none transition-all appearance-none cursor-pointer"
                                >
                                    {AVAILABILITY_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Results Summary */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <p className="text-sm text-slate-600">
                            <span className="font-bold text-slate-900">{modules.length}</span> {modules.length === 1 ? 'module' : 'modules'}
                        </p>
                        {(search || category !== "all" || availability !== "all") && (
                            <button
                                onClick={() => {
                                    setSearch("");
                                    setCategory("all");
                                    setAvailability("all");
                                }}
                                className="text-sm text-slate-700 hover:text-slate-900 font-semibold transition-colors"
                            >
                                Reset filters
                            </button>
                        )}
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {modules.length > 0 ? (
                    modules.map((module) => (
                        <ModuleCard key={module.id} module={module} role={role} workSet={workSet} />
                    ))
                ) : (
                    <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-slate-200 bg-white p-12 text-center">
                        <div className="max-w-md mx-auto">
                            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                <Search className="h-8 w-8 text-slate-400" />
                            </div>
                            <p className="text-lg font-bold text-slate-900 mb-2">No matching modules found</p>
                            <p className="text-sm text-slate-600 mb-6">
                                Try adjusting your search or filters to find what you&apos;re looking for.
                            </p>
                            <button
                                onClick={() => {
                                    setSearch("");
                                    setCategory("all");
                                    setAvailability("all");
                                }}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                            >
                                Clear all filters
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
