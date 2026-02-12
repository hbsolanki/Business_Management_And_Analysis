import { FaClipboardCheck, FaChartBar, FaRocket } from "react-icons/fa";

const steps = [
    {
        id: 1,
        title: "Create Business Profile",
        description:
            "Register your organization and set up your business profile in minutes. It's the foundation for your growth.",
        icon: <FaClipboardCheck className="text-white text-2xl" />,
        color: "bg-brand-600",
        shadow: "shadow-brand-200",
    },
    {
        id: 2,
        title: "Manage Operations",
        description:
            "Track inventory, manage employees, and record sales in real-time. Everything you need in one dashboard.",
        icon: <FaChartBar className="text-white text-2xl" />,
        color: "bg-sky-600",
        shadow: "shadow-sky-200",
    },
    {
        id: 3,
        title: "Analyze & Grow",
        description:
            "Get detailed analytics and reports. Use data-driven insights to optimize performance and scale your revenue.",
        icon: <FaRocket className="text-white text-2xl" />,
        color: "bg-emerald-600",
        shadow: "shadow-emerald-200",
    },
];

export default function HowItWorks() {
    return (
        <section className="relative overflow-hidden py-24">
            <div className="absolute inset-0 -z-10">
                <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-white/80 to-transparent"></div>
                <div className="absolute inset-0 bg-grid-slate opacity-60 [mask-image:radial-gradient(70%_70%_at_top,white,transparent)]"></div>
            </div>

            <div className="section-shell relative">
                <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-up">
                    <h2 className="text-xs font-semibold text-brand-700 uppercase tracking-[0.3em] mb-3">
                        Workflow
                    </h2>
                    <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mb-4">
                        Master Your Business in 3 Steps
                    </h1>
                    <p className="text-lg text-slate-600 leading-relaxed">
                        Streamline your workflow with an intuitive platform designed for modern businesses.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-10 relative">
                    <div className="hidden md:block absolute top-[3.4rem] left-[10%] right-[10%] h-px border-t-2 border-dashed border-slate-200"></div>

                    {steps.map((step) => (
                        <div key={step.id} className="relative z-10 flex flex-col items-center text-center group">
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-8 shadow-xl transform transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-2 ${step.color} ${step.shadow} ring-4 ring-white`}>
                                {step.icon}
                            </div>

                            <div className="rounded-2xl bg-white/80 border border-white/70 p-6 shadow-card">
                                <h3 className="text-lg font-semibold text-slate-900 mb-3 group-hover:text-brand-700 transition-colors">
                                    {step.title}
                                </h3>
                                <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
