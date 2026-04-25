import {
    FaBoxOpen,
    FaUsers,
    FaChartPie,
    FaMoneyBillWave,
    FaChartLine,
    FaShieldAlt,
    FaEnvelopeOpenText,
    FaRobot,
    FaTasks,
} from "react-icons/fa";

const features = [
    {
        title: "AI Business Agent",
        description:
            "Interact with your data through natural language. Get instant insights, operational synthesis, and tactical strategy.",
        icon: <FaRobot className="text-white text-2xl" />,
        color: "bg-purple-600",
    },
    {
        title: "Operational Workflows",
        description:
            "Assign tasks to employees, track live progress, and ensure absolute accountability across all branches.",
        icon: <FaTasks className="text-white text-2xl" />,
        color: "bg-slate-900",
    },
    {
        title: "Smart Invoicing",
        description:
            "Generate professional invoices and automatically handle collections with one-click email delivery.",
        icon: <FaEnvelopeOpenText className="text-white text-2xl" />,
        color: "bg-brand-600",
    },
    {
        title: "Inventory Management",
        description:
            "Track stock levels, monitor movement across branches, and ensure you never run out of critical items.",
        icon: <FaBoxOpen className="text-white text-2xl" />,
        color: "bg-sky-500",
    },
    {
        title: "Sales Tracking",
        description:
            "Monitor revenue growth and sales trends with intuitive, real-time dashboards for every branch.",
        icon: <FaChartLine className="text-white text-2xl" />,
        color: "bg-emerald-500",
    },
    {
        title: "Employee Management",
        description:
            "Organize your workforce with precision tools for managing roles, schedules, and work assignments.",
        icon: <FaUsers className="text-white text-2xl" />,
        color: "bg-amber-500",
    },
    {
        title: "Financial Insights",
        description:
            "Track operational expenses, manage payroll, and get a clear view of your business financial health.",
        icon: <FaMoneyBillWave className="text-white text-2xl" />,
        color: "bg-orange-500",
    },
    {
        title: "Advanced Analytics",
        description:
            "Analyze key performance metrics with powerful data visualization tools to make data-driven decisions.",
        icon: <FaChartPie className="text-white text-2xl" />,
        color: "bg-cyan-500",
    },
    {
        title: "Secure Access",
        description:
            "Enterprise-grade role-based access control (RBAC) ensures your data is safe and strictly authorized.",
        icon: <FaShieldAlt className="text-white text-2xl" />,
        color: "bg-teal-700",
    },
];

export default function FeaturesSection() {
    return (
        <section className="relative py-24">
            <div className="absolute inset-0 -z-10 md:mx-12 rounded-[2.5rem] bg-white/70 border border-white/60 shadow-soft"></div>
            <div className="section-shell relative">
                <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-up">
                    <h2 className="text-xs font-semibold text-brand-700 uppercase tracking-[0.3em]">
                        Everything you need
                    </h2>
                    <p className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                        All-in-one Platform for Business Growth
                    </p>
                    <p className="mt-4 text-lg text-slate-600">
                        Our platform provides comprehensive tools to manage every aspect of
                        your business operation seamlessly.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="group rounded-3xl border border-white/70 bg-white/80 p-8 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-glow"
                        >
                            <div
                                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg transform group-hover:scale-110 transition-transform ${feature.color}`}
                            >
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-brand-700 transition-colors">
                                {feature.title}
                            </h3>
                            <p className="text-slate-600 leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
