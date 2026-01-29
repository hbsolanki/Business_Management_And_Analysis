import { Link } from "react-router-dom";
import { User, Briefcase, Users, ArrowRight, ShieldCheck, TrendingUp, Wallet, CheckCircle2 } from "lucide-react";

export default function InfoLanding() {
    return (
        <div className="space-y-16 pb-12">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-white rounded-3xl border border-gray-100 shadow-xl shadow-blue-900/5 p-8 md:p-12 lg:p-16 text-center">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-indigo-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

                <div className="relative z-10 max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider mb-6">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                        Documentation
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight leading-tight">
                        Master your business with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">Visionary</span>
                    </h1>
                    <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto mb-10">
                        Your comprehensive guide to executing role-specific tasks, analyzing performance, and scaling your operations efficiently.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link to="/info/owner" className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 hover:-translate-y-0.5">
                            Start as Owner <ArrowRight className="h-4 w-4" />
                        </Link>
                        <a href="#roles" className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-semibold hover:bg-gray-50 transition-all hover:border-gray-300">
                            Explore Roles
                        </a>
                    </div>
                </div>
            </div>

            {/* Role Guides */}
            <div id="roles" className="scroll-mt-24">
                <div className="flex items-center gap-4 mb-8">
                    <div className="h-px flex-1 bg-gray-200"></div>
                    <h2 className="text-xl font-bold text-gray-400 uppercase tracking-widest">Select Your Guide</h2>
                    <div className="h-px flex-1 bg-gray-200"></div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <RoleCard
                        to="/info/owner"
                        icon={User}
                        title="Owner Guide"
                        description="Complete control over business settings, team management, and financial insights."
                        color="blue"
                        features={["Business Profile", "Team Management", "Full Analytics"]}
                    />
                    <RoleCard
                        to="/info/manager"
                        icon={Briefcase}
                        title="Manager Guide"
                        description="Oversee daily operations, manage employee rosters, and track performance."
                        color="emerald"
                        features={["Staff Oversight", "Inventory Tracking", "Operational Views"]}
                    />
                    <RoleCard
                        to="/info/employee"
                        icon={Users}
                        title="Employee Guide"
                        description="Execute assigned tasks in sales, inventory, and management efficiently."
                        color="purple"
                        features={["Point of Sale", "Stock Updates", "Product Entry"]}
                    />
                </div>
            </div>

            {/* Platform Highlights */}
            <div className="bg-gray-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-overlay filter blur-[128px] opacity-20"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600 rounded-full mix-blend-overlay filter blur-[128px] opacity-20"></div>

                <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-12 text-center">Why Visionary?</h2>
                    <div className="grid md:grid-cols-3 gap-12">
                        <FeatureHighlight
                            icon={ShieldCheck}
                            title="Secure & Scalable"
                            description="Enterprise-grade role-based security ensures each team member accesses only what they need."
                        />
                        <FeatureHighlight
                            icon={TrendingUp}
                            title="Real-time Analytics"
                            description="Make data-driven decisions with instant insights into sales, profits, and inventory movement."
                        />
                        <FeatureHighlight
                            icon={Wallet}
                            title="Finance Tracking"
                            description="Keep your books balanced with comprehensive cost categorization and automated invoice management."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function RoleCard({ to, icon: Icon, title, description, color, features }) {
    const colorStyles = {
        blue: "bg-blue-50 text-blue-600 group-hover/card:bg-blue-600 group-hover/card:text-white",
        emerald: "bg-emerald-50 text-emerald-600 group-hover/card:bg-emerald-600 group-hover/card:text-white",
        purple: "bg-purple-50 text-purple-600 group-hover/card:bg-purple-600 group-hover/card:text-white",
    };

    const checkColors = {
        blue: "text-blue-600 group-hover/card:text-blue-100",
        emerald: "text-emerald-600 group-hover/card:text-emerald-100",
        purple: "text-purple-600 group-hover/card:text-purple-100",
    }

    return (
        <Link to={to} className="group/card block p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-50 to-transparent rounded-bl-full transition-opacity opacity-50 group-hover/card:opacity-100`}></div>

            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 relative z-10 ${colorStyles[color]}`}>
                <Icon className="h-7 w-7" />
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover/card:text-blue-600 transition-colors relative z-10">{title}</h3>
            <p className="text-gray-500 leading-relaxed mb-6 group-hover/card:text-gray-600 relative z-10">{description}</p>

            <div className="space-y-2 mb-8 relative z-10 border-t border-gray-50 pt-6 group-hover/card:border-gray-100">
                {features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm font-medium text-gray-500 group-hover/card:text-gray-700">
                        <CheckCircle2 className={`h-4 w-4 ${checkColors[color]}`} />
                        {feature}
                    </div>
                ))}
            </div>

            <div className="flex items-center text-sm font-bold text-gray-400 group-hover/card:text-blue-600 transition-colors relative z-10">
                Read Guide <ArrowRight className="h-4 w-4 ml-2 group-hover/card:translate-x-1 transition-transform" />
            </div>
        </Link>
    );
}

function FeatureHighlight({ icon: Icon, title, description }) {
    return (
        <div className="flex flex-col items-center text-center gap-4">
            <div className="shrink-0 h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center text-white ring-1 ring-white/20 shadow-lg shadow-black/10">
                <Icon className="h-8 w-8" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-base text-gray-400 leading-relaxed">{description}</p>
            </div>
        </div>
    );
}
