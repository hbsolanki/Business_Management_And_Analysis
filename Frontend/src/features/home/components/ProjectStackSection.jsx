import { useEffect, useMemo, useRef, useState } from "react";
import {
    FaUsers,
    FaBoxOpen,
    FaTruck,
    FaShoppingCart,
    FaChartLine,
    FaProjectDiagram,
    FaDatabase,
} from "react-icons/fa";

const STACK_STEPS = [
    {
        kicker: "Core Architecture",
        title: "Centralized Business & Role Management",
        detail:
            "Create branches, manage deep employee configurations, and enforce strict role-based access control (RBAC) across owners, managers, and specific module workers.",
        points: [
            "Multi-branch architecture",
            "Granular permission scopes",
            "Employee work assignments",
        ],
        modules: ["Business Setup", "Branch Management", "Employee Profiles"],
        outcome: "Absolute organizational control and security.",
        icon: FaUsers,
        tone: "brand",
    },
    {
        kicker: "Product Engine",
        title: "Unified Product & Inventory Lifecycle",
        detail:
            "A comprehensive catalog that serves as the single source of truth for items. Track real-time stock levels, cost bases, margins, and SKU variations across the entire network.",
        points: [
            "Live global stock tracking",
            "Category taxonomy",
            "Financial baseline definitions",
        ],
        modules: ["Catalog", "Inventory Transactions", "Live Stocking"],
        outcome: "Never lose track of what you sell or how much you have.",
        icon: FaBoxOpen,
        tone: "sky",
    },
    {
        kicker: "Inbound Flow",
        title: "Supplier & Purchase Ecosystem",
        detail:
            "Manage relationships with vendors and execute seamless purchase orders. Track pending receivables, unit costs, and automatically reconcile stock upon delivery.",
        points: [
            "Vendor relationship records",
            "Smart PO generation",
            "One-click receiving workflows",
        ],
        modules: ["Supplier Logs", "Purchase Orders", "Receipt Tracking"],
        outcome: "Streamlined procurement without the guesswork.",
        icon: FaTruck,
        tone: "brand",
    },
    {
        kicker: "Outbound Flow",
        title: "Customer & Invoice Fulfillment",
        detail:
            "Rapid invoice creation, customer history tracking, and intelligent routing. Convert inventory into revenue with automated tax calculations and beautiful PDF generations.",
        points: [
            "Quick-add customer flows",
            "Live cart subtotaling",
            "Dynamic status workflows",
        ],
        modules: ["Customer Directory", "Invoice Creation", "Revenue Collection"],
        outcome: "Frictionless checkout and clear transaction history.",
        icon: FaShoppingCart,
        tone: "sky",
    },
    {
        kicker: "Intelligence",
        title: "Deep Dive Business Analytics",
        detail:
            "Turn raw transactional data into actionable financial charts. Analyze monthly profits, top-moving products, and highest-spending customers instantly with smart filters.",
        points: [
            "Visual revenue dashboards",
            "Customer spend tracking",
            "Profitability indicators",
        ],
        modules: ["Monthly Insights", "Trend Analysis", "Custom Reports"],
        outcome: "Make data-driven decisions faster than ever.",
        icon: FaChartLine,
        tone: "slate",
    },
];

const STACK_LAYERS = [
    {
        title: "Business Core",
        subtitle: "Branches, Users, Roles & Profiles",
        className: "from-slate-900 via-slate-800 to-slate-900 text-white border-slate-700/50 shadow-slate-900/20",
    },
    {
        title: "Inventory Platform",
        subtitle: "Products, Suppliers, & Fulfillment",
        className: "from-indigo-600 via-brand-600 to-indigo-700 text-white border-indigo-500/30 shadow-indigo-900/20",
    },
    {
        title: "Sales & Insights",
        subtitle: "Invoices, Analytics, & Reporting",
        className: "from-emerald-500 via-teal-500 to-emerald-600 text-white border-emerald-400/30 shadow-emerald-900/20",
    },
];

const TONE_STYLES = {
    slate: {
        icon: "bg-slate-900 text-white shadow-md shadow-slate-200",
        badgeActive: "bg-slate-900 text-white shadow-sm",
        dotActive: "bg-slate-900 border-slate-900 ring-slate-100",
        borderActive: "border-slate-300",
        bgActive: "bg-gradient-to-br from-white to-slate-50",
    },
    brand: {
        icon: "bg-indigo-600 text-white shadow-md shadow-indigo-100",
        badgeActive: "bg-indigo-600 text-white shadow-sm",
        dotActive: "bg-indigo-600 border-indigo-600 ring-indigo-50",
        borderActive: "border-indigo-200",
        bgActive: "bg-gradient-to-br from-white to-indigo-50/50",
    },
    sky: {
        icon: "bg-emerald-500 text-white shadow-md shadow-emerald-100",
        badgeActive: "bg-emerald-500 text-white shadow-sm",
        dotActive: "bg-emerald-500 border-emerald-500 ring-emerald-50",
        borderActive: "border-emerald-200",
        bgActive: "bg-gradient-to-br from-white to-emerald-50/50",
    },
};

function getActiveLayer(stepIndex) {
    if (stepIndex <= 1) return 0;
    if (stepIndex <= 3) return 1;
    return 2;
}

export default function ProjectStackSection() {
    const [activeStep, setActiveStep] = useState(0);
    const cardRefs = useRef([]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const index = Number(entry.target.getAttribute("data-stack-index"));
                    if (!Number.isNaN(index)) setActiveStep(index);
                });
            },
            {
                root: null,
                threshold: 0.52,
                rootMargin: "-8% 0px -32% 0px",
            }
        );

        cardRefs.current.forEach((card) => {
            if (card) observer.observe(card);
        });

        return () => observer.disconnect();
    }, []);

    const progressWidth = useMemo(
        () => `${((activeStep + 1) / STACK_STEPS.length) * 100}%`,
        [activeStep]
    );

    const activeLayer = getActiveLayer(activeStep);
    const activeItem = STACK_STEPS[activeStep];
    const ActiveIcon = activeItem.icon;

    return (
        <section className="relative py-24 md:py-32 bg-slate-50 border-t border-slate-200">
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-indigo-100/40 blur-3xl translate-x-1/3 -translate-y-1/4" />
                <div className="absolute bottom-0 left-0 h-[600px] w-[600px] rounded-full bg-emerald-100/40 blur-3xl -translate-x-1/3 translate-y-1/4" />
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay" />
            </div>

            <div className="section-shell">
                <div className="mb-12 md:mb-16 max-w-3xl text-center md:text-left">
                    <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold tracking-wider uppercase text-indigo-700 ring-1 ring-inset ring-indigo-700/10 mb-5">
                        <FaProjectDiagram size={10} />
                        Project Analysis
                    </span>
                    <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                        THE ERP STACK
                    </h2>
                    <p className="mt-5 text-lg text-slate-600 leading-relaxed max-w-2xl">
                        A modern, layered architecture designed for speed, reliability, and scale. Connect your entire business operation on a single unified platform.
                    </p>
                </div>

                <div className="grid lg:grid-cols-[minmax(340px,0.95fr)_minmax(0,1.1fr)] gap-10 lg:gap-16 items-start">
                    <aside className="lg:sticky lg:top-28 lg:self-start">
                        <div className="rounded-[30px] border border-white/70 bg-white/85 p-6 shadow-card backdrop-blur relative z-10 mx-auto w-full max-w-md mb-12 lg:mb-0">
                            <div className="relative h-[250px] mt-4">
                                {STACK_LAYERS.map((layer, index) => {
                                    const isActive = activeLayer === index;
                                    return (
                                        <div
                                            key={layer.title}
                                            className={`absolute left-1/2 w-[90%] -translate-x-1/2 rounded-2xl border bg-gradient-to-r px-5 py-5 shadow-2xl transition-all duration-500 ease-out ${layer.className} ${isActive ? "scale-[1.05] ring-4 ring-white/20 z-10" : "opacity-60 grayscale-[30%] z-0"}`}
                                            style={{
                                                top: `${index * 75 + 10}px`,
                                                transform: `translateX(-50%) perspective(1000px) rotateX(12deg) ${isActive ? 'translateY(-5px)' : ''}`,
                                            }}
                                        >
                                            <p className="text-sm font-black tracking-wide uppercase">{layer.title}</p>
                                            <p className="text-xs mt-1.5 opacity-90 font-medium">{layer.subtitle}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 shadow-inner">
                                <div className="flex items-start gap-4">
                                    <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${TONE_STYLES[activeItem.tone].icon}`}>
                                        <ActiveIcon size={20} />
                                    </span>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{activeItem.kicker}</p>
                                        <p className="text-sm font-bold text-slate-900 mt-1 leading-snug">{activeItem.title}</p>
                                    </div>
                                </div>
                                <div className="mt-5 h-2 rounded-full bg-slate-200 overflow-hidden shadow-inner">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-brand-500 to-emerald-500 transition-all duration-500 ease-out"
                                        style={{ width: progressWidth }}
                                    />
                                </div>
                                <p className="mt-3 text-xs text-slate-600">{activeItem.outcome}</p>
                            </div>

                            <div className="mt-6 flex flex-wrap gap-2">
                                {activeItem.points.map((point) => (
                                    <div
                                        key={point}
                                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200/60 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm"
                                    >
                                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                        {point}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 font-semibold">Modules in focus</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {activeItem.modules.map((moduleName) => (
                                        <span
                                            key={moduleName}
                                            className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                                        >
                                            {moduleName}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </aside>

                    <div className="relative">
                        <div className="relative pr-1">
                            <div className="absolute left-4 top-6 bottom-6 hidden md:block w-px bg-slate-200" />
                            <div className="space-y-10 lg:space-y-14">
                            {STACK_STEPS.map((item, index) => {
                                const isActive = index === activeStep;
                                const isCompleted = index < activeStep;
                                const tone = TONE_STYLES[item.tone];
                                const Icon = item.icon;

                                return (
                                    <article
                                        key={item.title}
                                        data-stack-index={index}
                                        ref={(element) => {
                                            cardRefs.current[index] = element;
                                        }}
                                        onMouseEnter={() => setActiveStep(index)}
                                        className={`relative md:pl-12 rounded-3xl border p-6 md:p-8 lg:min-h-[68vh] lg:flex lg:flex-col lg:justify-center transition-all duration-300 ${isActive
                                            ? `${tone.borderActive} ${tone.bgActive} shadow-xl shadow-slate-200/50 scale-[1.01]`
                                            : "bg-white/60 border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-md"
                                            }`}
                                    >
                                        <span
                                            className={`hidden md:flex absolute left-[0.5rem] top-8 h-3.5 w-3.5 rounded-full border-2 transition-all ${isActive
                                                ? `${tone.dotActive} ring-4`
                                                : isCompleted
                                                    ? "bg-slate-500 border-slate-500"
                                                    : "bg-white border-slate-300"
                                                }`}
                                        />

                                        <header className="flex flex-wrap items-start justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isActive ? tone.icon : "bg-slate-100 text-slate-400"
                                                    } transition-colors duration-300`}>
                                                    <Icon size={18} />
                                                </span>
                                                <div className="pt-1">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{item.kicker}</p>
                                                    <h3 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">{item.title}</h3>
                                                </div>
                                            </div>
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${isActive ? tone.badgeActive : "bg-slate-100 text-slate-600"
                                                    }`}
                                            >
                                                {String(index + 1).padStart(2, "0")}
                                            </span>
                                        </header>

                                        <p className="mt-4 text-slate-600 leading-relaxed">{item.detail}</p>

                                        <div className="mt-6 flex flex-wrap gap-2.5">
                                            {item.points.map((point) => (
                                                <span
                                                    key={point}
                                                    className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${isActive ? "bg-white border-slate-200 text-slate-700" : "bg-slate-50 border-slate-200/60 text-slate-500"
                                                        }`}
                                                >
                                                    {point}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="mt-4">
                                            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 font-semibold">Mapped modules</p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {item.modules.map((moduleName) => (
                                                    <span
                                                        key={`${item.title}-${moduleName}`}
                                                        className="inline-flex rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
                                                    >
                                                        {moduleName}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="mt-5 pt-4 opacity-70 flex items-center gap-2">
                                            <div className="h-px bg-slate-200 flex-1" />
                                            <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">{item.outcome}</p>
                                        </div>
                                    </article>
                                );
                            })}
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2 px-2 text-xs text-slate-500">
                            <FaDatabase className="text-slate-400" size={11} />
                            Scroll to explore each layer of your project architecture.
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
