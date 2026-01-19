import { FaClipboardCheck, FaChartBar, FaRocket } from "react-icons/fa";

const steps = [
    {
        id: 1,
        title: "Create Business Profile",
        description:
            "Register your organization and set up your business profile in minutes. It's the foundation for your growth.",
        icon: <FaClipboardCheck className="text-white text-2xl" />,
        color: "bg-blue-600",
        shadow: "shadow-blue-200",
    },
    {
        id: 2,
        title: "Manage Operations",
        description:
            "Track inventory, manage employees, and record sales in real-time. Everything you need in one dashboard.",
        icon: <FaChartBar className="text-white text-2xl" />,
        color: "bg-indigo-600",
        shadow: "shadow-indigo-200",
    },
    {
        id: 3,
        title: "Analyze & Grow",
        description:
            "Get detailed analytics and reports. Use data-driven insights to optimize performance and scale your revenue.",
        icon: <FaRocket className="text-white text-2xl" />,
        color: "bg-purple-600",
        shadow: "shadow-purple-200",
    },
];

export default function HowItWorks() {
    return (
        <section className="py-24 bg-gray-50 relative overflow-hidden">
            {/* Background Pattern - Dot Matrix */}
            <svg
                className="absolute inset-0 z-0 h-full w-full stroke-gray-200 opacity-50 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]"
                aria-hidden="true"
            >
                <defs>
                    <pattern
                        id="how-it-works-dots"
                        width={20}
                        height={20}
                        x="50%"
                        y={-1}
                        patternUnits="userSpaceOnUse"
                    >
                        <circle cx={1} cy={1} r={1} className="fill-gray-300" />
                    </pattern>
                </defs>
                <rect
                    width="100%"
                    height="100%"
                    strokeWidth={0}
                    fill="url(#how-it-works-dots)"
                />
            </svg>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <h2 className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">
                        Workflow
                    </h2>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 mb-4">
                        Master Your Business in 3 Steps
                    </h1>
                    <p className="text-lg text-gray-600 leading-relaxed">
                        Streamline your workflow with our intuitive platform designed for modern businesses.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-12 relative px-4">
                    {/* Dotted Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-[2.5rem] left-[16%] right-[16%] h-0.5 border-t-[3px] border-dotted border-gray-300 z-0" aria-hidden="true"></div>

                    {steps.map((step) => (
                        <div key={step.id} className="relative z-10 flex flex-col items-center text-center group">
                            {/* Icon Container */}
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-8 shadow-xl transform transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-2 ${step.color} ${step.shadow} ring-4 ring-white`}>
                                {step.icon}
                            </div>

                            {/* Content */}
                            <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                                {step.title}
                            </h3>
                            <p className="text-gray-500 leading-relaxed text-sm md:text-base">
                                {step.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
