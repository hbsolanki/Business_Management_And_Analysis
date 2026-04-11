import { Link, NavLink, Outlet } from "react-router-dom";
import {
    BookOpenText,
    CircleHelp,
    Compass,
    LayoutGrid,
    ShieldCheck,
    UserRound,
    UsersRound,
} from "lucide-react";
import { useMemo } from "react";

import { PRODUCT_MODULES } from "@/features/info/data/infoModules";
import { isModuleAccessible, parseWork, resolveModulePath } from "@/features/info/utils/moduleAccess";
import { tokenService } from "@/services/tokenService";

const NAV_ITEMS = [
    { label: "Overview", path: "/info", icon: Compass, roles: ["PUBLIC", "OWNER", "MANAGER", "EMPLOYEE"] },
    { label: "Module Directory", path: "/info/modules", icon: LayoutGrid, roles: ["PUBLIC", "OWNER", "MANAGER", "EMPLOYEE"] },
    { label: "Owner Guide", path: "/info/owner", icon: UserRound, roles: ["OWNER"] },
    { label: "Manager Guide", path: "/info/manager", icon: ShieldCheck, roles: ["OWNER", "MANAGER"] },
    { label: "Employee Guide", path: "/info/employee", icon: UsersRound, roles: ["OWNER", "MANAGER", "EMPLOYEE"] },
    { label: "Support", path: "/info/support", icon: CircleHelp, roles: ["PUBLIC", "OWNER", "MANAGER", "EMPLOYEE"] },
];

const QUICK_LINK_IDS = {
    OWNER: ["dashboard", "subscriptions", "analytics"],
    MANAGER: ["dashboard", "employee-management", "tasks"],
    EMPLOYEE: ["dashboard", "tasks", "chat"],
};

function isAllowedByRole(item, role) {
    const effectiveRole = role || "PUBLIC";
    return item.roles.includes(effectiveRole);
}

export default function InfoLayout() {
    const role = (tokenService.getRole() || "").toUpperCase() || null;
    const workSet = parseWork(tokenService.getWork());

    const navItems = NAV_ITEMS.filter((item) => isAllowedByRole(item, role));
    const moduleById = useMemo(
        () => new Map(PRODUCT_MODULES.map((module) => [module.id, module])),
        [],
    );

    const quickLinks = useMemo(() => {
        if (!role || !QUICK_LINK_IDS[role]) return [];
        return QUICK_LINK_IDS[role]
            .map((moduleId) => moduleById.get(moduleId))
            .filter(Boolean)
            .filter((module) => isModuleAccessible(module, role, workSet))
            .map((module) => ({
                id: module.id,
                title: module.title,
                path: resolveModulePath(module, role),
            }));
    }, [moduleById, role, workSet]);

    return (
        <div className="min-h-screen">
            <div className="section-shell py-4 md:py-6">
                <div className="grid gap-6 lg:grid-cols-[290px_1fr]">
                    <aside className="hidden lg:block">
                        <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                                    <BookOpenText className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-base font-bold text-slate-900">Info Center</p>
                                    <p className="text-xs text-slate-500">Workflow + module guide</p>
                                </div>
                            </div>

                            <nav className="mt-5 space-y-1.5">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            end={item.path === "/info"}
                                            className={({ isActive }) =>
                                                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${isActive
                                                    ? "bg-slate-900 text-white"
                                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                                }`
                                            }
                                        >
                                            <Icon className="h-4 w-4 shrink-0" />
                                            {item.label}
                                        </NavLink>
                                    );
                                })}
                            </nav>

                            {quickLinks.length > 0 && (
                                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Quick Access
                                    </p>
                                    <div className="mt-2 space-y-2">
                                        {quickLinks.map((item) => (
                                            <Link
                                                key={item.id}
                                                to={item.path}
                                                className="block rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-white hover:text-slate-900"
                                            >
                                                {item.title}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>

                    <main className="min-w-0">
                        <div className="lg:hidden rounded-2xl border border-slate-200 bg-white shadow-sm p-4 mb-4">
                            <div className="flex items-center gap-2 text-slate-900 font-semibold mb-3">
                                <BookOpenText className="h-4 w-4" />
                                Info Center
                            </div>
                            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                                {navItems.map((item) => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        end={item.path === "/info"}
                                        className={({ isActive }) =>
                                            `shrink-0 rounded-lg px-3 py-2 text-xs font-semibold border transition-colors ${isActive
                                                ? "bg-slate-900 text-white border-slate-900"
                                                : "bg-white text-slate-600 border-slate-200"
                                            }`
                                        }
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </div>
                        </div>

                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
}
