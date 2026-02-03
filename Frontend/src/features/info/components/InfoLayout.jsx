import { Link, Outlet, useLocation } from "react-router-dom";
import { Info, User, Briefcase, Users, LayoutDashboard, ArrowRight } from "lucide-react";

import { tokenService } from "@/services/tokenService";

export default function InfoLayout() {
    const location = useLocation();
    const role = (tokenService.getRole() || "").toUpperCase();

    const allNavItems = [
        { name: "Overview", path: "/info", icon: LayoutDashboard, roles: ["PUBLIC", "OWNER", "MANAGER", "EMPLOYEE"] },
        { name: "Owner Guide", path: "/info/owner", icon: User, roles: ["OWNER"] },
        { name: "Manager Guide", path: "/info/manager", icon: Briefcase, roles: ["OWNER", "MANAGER"] },
        { name: "Employee Guide", path: "/info/employee", icon: Users, roles: ["OWNER", "MANAGER", "EMPLOYEE"] },
    ];

    const navItems = allNavItems.filter(item => {
        if (item.path === "/info") return true; // Always show overview
        if (!role) return false; // Hide others if not logged in
        return item.roles.includes(role);
    });

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar Navigation */}
            {/* Sidebar Navigation */}
            <aside className="w-72 bg-white border-r border-gray-100 hidden md:flex flex-col shrink-0 h-screen sticky top-0 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-20">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8 px-2">
                        <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-600/20">
                            <Info className="h-6 w-6" />
                        </div>
                        <span className="font-bold text-xl text-gray-900 tracking-tight">Bizz Visionary Info</span>
                    </div>

                    <nav className="space-y-1.5">
                        {navItems.map((item) => {
                            const isActive = item.path === "/info"
                                ? location.pathname === "/info"
                                : location.pathname.startsWith(item.path);

                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 font-medium text-sm border ${isActive
                                        ? "bg-blue-50/50 border-blue-100 text-blue-600 shadow-sm"
                                        : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-100"
                                        }`}
                                >
                                    <Icon className={`h-5 w-5 transition-colors duration-300 ${isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"}`} />
                                    {item.name}
                                    {isActive && <ArrowRight className="h-4 w-4 ml-auto text-blue-500 animate-pulse" />}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="p-6 mt-auto">
                    <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-xl shadow-gray-900/10">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                        <div className="relative z-10">
                            <h3 className="font-bold text-lg mb-1">Need help?</h3>
                            <p className="text-gray-300 text-xs mb-4 leading-relaxed">
                                Contact our support team for specialized assistance.
                            </p>
                            <Link
                                to="/info/support"
                                className="flex items-center justify-center w-full text-xs font-semibold bg-white text-gray-900 hover:bg-gray-50 transition-colors py-2.5 rounded-lg shadow-sm"
                            >
                                Contact Support
                            </Link>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="flex-1 min-w-0">
                <div className="md:hidden bg-white/80 backdrop-blur-xl border-b border-gray-200 p-4 sticky top-0 z-30">
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-xl">
                        <Info className="h-6 w-6" />
                        <span>Bizz Visionary Info</span>
                    </div>
                </div>

                <div className="p-4 md:p-8 max-w-5xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
