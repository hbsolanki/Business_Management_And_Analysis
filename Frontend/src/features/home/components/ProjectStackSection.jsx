import { useEffect, useMemo, useRef, useState } from "react";
import {
    FaUsers,
    FaBoxOpen,
    FaTruck,
    FaShoppingCart,
    FaChartLine,
    FaProjectDiagram,
    FaDatabase,
    FaTasks,
    FaRobot,
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
        kicker: "Execution Workflow",
        title: "Task & Project Management",
        detail:
            "Assign, track, and optimize internal operations with a powerful task system. Delegate work to specific employees and monitor progress across every branch in real-time.",
        points: [
            "Employee delegation",
            "Real-time status tracking",
            "Operational accountability",
        ],
        modules: ["Task Dashboard", "Status Workflow", "Employee Tasks"],
        outcome: "Maximized team productivity and clarity.",
        icon: FaTasks,
        tone: "slate",
    },
    {
        kicker: "Future of Work",
        title: "AI Strategic Agent",
        detail:
            "Interact with your business data through natural language. Our AI Agent synthesizes complex metrics, drafts operational plans, and turns raw logs into strategic insights.",
        points: [
            "Natural Language Queries",
            "Operational Synthesis",
            "Strategic Planning",
        ],
        modules: ["AI Assistant", "Data Synthesis", "Instant Insights"],
        outcome: "Enterprise-grade intelligence at your fingertips.",
        icon: FaRobot,
        tone: "purple",
    },
];

const STACK_LAYERS = [
    {
        title: "Business Core",
        subtitle: "Branches, Users, Roles & Profiles",
        className: "from-indigo-900 to-slate-900",
        glow: "shadow-indigo-500/20",
    },
    {
        title: "Inventory Platform",
        subtitle: "Products, Suppliers, & Fulfillment",
        className: "from-brand-600 to-indigo-800",
        glow: "shadow-brand-500/20",
    },
    {
        title: "Sales & Insights",
        subtitle: "Invoices, Analytics, & Reporting",
        className: "from-emerald-500 to-teal-700",
        glow: "shadow-emerald-500/20",
    },
    {
        title: "Intelligent Operations",
        subtitle: "AI Agent & Workflows",
        className: "from-purple-600 to-fuchsia-800",
        glow: "shadow-purple-500/20",
    },
];

const TONE_STYLES = {
    slate: {
        icon: "bg-slate-900 text-white",
        text: "text-slate-900",
        border: "border-slate-200",
        bg: "bg-slate-50",
    },
    brand: {
        icon: "bg-indigo-600 text-white",
        text: "text-indigo-900",
        border: "border-indigo-100",
        bg: "bg-indigo-50/30",
    },
    sky: {
        icon: "bg-emerald-500 text-white",
        text: "text-emerald-900",
        border: "border-emerald-100",
        bg: "bg-emerald-50/30",
    },
    purple: {
        icon: "bg-purple-600 text-white",
        text: "text-purple-900",
        border: "border-purple-100",
        bg: "bg-purple-50/30",
    },
};

function getActiveLayer(stepIndex) {
    if (stepIndex === 0) return 0;
    if (stepIndex <= 2) return 1;
    if (stepIndex <= 4) return 2;
    return 3;
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
                threshold: 0.6,
                rootMargin: "-20% 0px -20% 0px",
            }
        );

        cardRefs.current.forEach((card) => {
            if (card) observer.observe(card);
        });

        return () => observer.disconnect();
    }, []);

    const activeItem = STACK_STEPS[activeStep];
    const activeLayer = getActiveLayer(activeStep);
    const ActiveIcon = activeItem.icon;

    return (
        <section className="relative py-24 md:py-32 bg-white border-t border-slate-100 overflow-clip">
            {/* Background elements */}
            <div className="absolute inset-0 -z-10 bg-[url('/noise.png')] opacity-[0.02]" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl overflow-hidden opacity-10 blur-3xl pointer-events-none">
                <div className="absolute top-1/4 left-0 w-96 h-96 bg-indigo-500 rounded-full" />
                <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-brand-500 rounded-full" />
            </div>

            <div className="section-shell">
                <div className="mb-20 max-w-3xl">
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-black tracking-[0.2em] uppercase text-white mb-6">
                        <FaProjectDiagram size={10} />
                        Systems Architecture
                    </span>
                    <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-[0.95]">
                        THE ERP STACK
                    </h2>
                    <p className="mt-6 text-xl text-slate-500 leading-relaxed font-medium">
                        A centralized operation engine built for radical visibility and control.
                    </p>
                </div>

                <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-24 items-start">
                    {/* Left Side: Sticky Architecture Control Panel */}
                    <aside className="lg:sticky lg:top-32 lg:self-start">
                        <div className="relative rounded-[48px] bg-slate-900 p-8 md:p-12 shadow-[0_40px_100px_-20px_rgba(15,23,42,0.3)] overflow-hidden text-white group">
                            {/* Panel Background Pattern */}
                            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #fff 1px, transparent 1px) 0 0 / 30px 30px' }} />
                            
                            {/* Graphic Area */}
                            <div className="relative h-[240px] md:h-[300px] mb-12 flex items-center justify-center perspective-[1000px]">
                                <div className="relative w-full max-w-[300px] preserve-3d transition-transform duration-700"
                                    style={{ transform: 'rotateX(55deg) rotateZ(-35deg)' }}
                                >
                                    {STACK_LAYERS.map((layer, index) => {
                                        const isActive = activeLayer === index;
                                        const layerOffset = index * 45;
                                        
                                        return (
                                            <div
                                                key={`stack-layer-${index}`}
                                                className={`absolute inset-x-0 h-16 rounded-2xl border-2 transition-all duration-700 ease-out flex flex-col justify-center px-6 ${isActive ? 'opacity-100 scale-110 border-white/40 bg-gradient-to-br ' + layer.className + ' shadow-[0_0_50px_rgba(255,255,255,0.2)]' : 'opacity-20 border-white/10'}`}
                                                style={{ 
                                                    top: `${index * 10}px`,
                                                    transform: `translateZ(${layerOffset}px)`,
                                                    zIndex: STACK_LAYERS.length - index
                                                }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <p className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-slate-400'}`}>{layer.title}</p>
                                                    {isActive && <div className="h-2 w-2 rounded-full bg-white animate-pulse" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {/* Floating Active Icon */}
                                <div className="absolute top-0 right-0 p-4">
                                    <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transform transition-all duration-500 scale-100 group-hover:scale-110">
                                        <ActiveIcon size={24} className="text-white" />
                                    </div>
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="relative pt-8 border-t border-white/10">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400/80 mb-3 block">
                                    {activeItem.kicker}
                                </span>
                                <h3 className="text-2xl md:text-3xl font-black mb-6 tracking-tight leading-none">
                                    {activeItem.title}
                                </h3>
                                <p className="text-slate-400 leading-relaxed font-medium mb-8">
                                    {activeItem.detail}
                                </p>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Capabilities</p>
                                        {activeItem.points.map(p => (
                                            <div key={p} className="flex items-center gap-3 text-xs font-bold text-slate-200">
                                                <div className="h-1 w-1 bg-indigo-500 rounded-full" />
                                                {p}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="space-y-4">
                                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Modules</p>
                                        <div className="flex flex-wrap gap-2">
                                            {activeItem.modules.slice(0, 2).map(m => (
                                                <span key={m} className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-black uppercase text-slate-400">
                                                    {m}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Right Side: Scrollable Navigation Narrative */}
                    <div className="relative py-20 pb-40">
                        <div className="space-y-32">
                            {STACK_STEPS.map((item, index) => {
                                const isActive = index === activeStep;
                                const style = TONE_STYLES[item.tone];
                                
                                return (
                                    <div
                                        key={`narrative-step-${index}`}
                                        data-stack-index={index}
                                        ref={(el) => (cardRefs.current[index] = el)}
                                        className={`group relative transition-all duration-1000 ${isActive ? 'opacity-100 scale-100' : 'opacity-20 scale-95 blur-[2px]'}`}
                                    >
                                        <div className="flex items-center gap-6 mb-4">
                                            <span className="text-4xl font-black italic text-slate-900/5 transition-all group-hover:text-slate-900/10">
                                                {String(index + 1).padStart(2, '0')}
                                            </span>
                                            <div className="h-px flex-1 bg-slate-100" />
                                        </div>
                                        <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-4">
                                            {item.title}
                                        </h4>
                                        <p className="text-slate-500 font-medium leading-relaxed max-w-md">
                                            {item.detail.split('.')[0]}.
                                        </p>
                                        
                                        {/* Status Bar */}
                                        <div className="mt-8 flex items-center gap-4">
                                            <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-indigo-600 animate-ping' : 'bg-slate-200'}`} />
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                {isActive ? 'Active Synthesis' : 'Inert Layer'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="mt-40 p-12 rounded-[40px] bg-slate-50 border border-slate-100 text-center">
                            <FaDatabase className="mx-auto text-slate-200 mb-4" size={32} />
                            <p className="text-sm font-black uppercase tracking-widest text-slate-400">System Foundation Reached</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
