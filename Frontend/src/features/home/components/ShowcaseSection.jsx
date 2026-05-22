import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
    Sparkles,
    Bot,
    ReceiptIndianRupee,
    ArrowRight,
    CheckCircle2,
    Zap,
    TrendingUp,
    Building2,
    ChevronRight
} from "lucide-react";

export default function ShowcaseSection() {
    const [activeTab, setActiveTab] = useState("ai-agent");
    const [activeGstSubtab, setActiveGstSubtab] = useState("liability");

    return (
        <section className="relative py-24 overflow-hidden">
            {/* Background glow matching brand theme */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60rem] h-[35rem] bg-gradient-to-tr from-brand-300/10 via-sky-300/5 to-teal-300/5 rounded-full blur-3xl -z-10"></div>
            
            <div className="section-shell relative">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-up">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-bold uppercase tracking-wider mb-4">
                        <Sparkles className="h-3.5 w-3.5 text-brand-500 animate-pulse" />
                        Next-Gen Additions
                    </span>
                    <h2 className="text-4xl md:text-5xl font-semibold text-slate-900 tracking-tight leading-tight">
                        Powering Smarter Business Operations
                    </h2>
                    <p className="mt-4 text-lg text-slate-600">
                        Explore our latest professional features engineered to automate your day-to-day workflows and deliver audit-ready compliance tracking.
                    </p>
                </div>

                {/* Tab Controls */}
                <div className="flex justify-center mb-12">
                    <div className="glass-panel p-1.5 flex gap-2 w-full max-w-lg shadow-soft rounded-2xl bg-white/70">
                        <button
                            onClick={() => setActiveTab("ai-agent")}
                            className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-300 ${
                                activeTab === "ai-agent"
                                    ? "bg-slate-900 text-white shadow-lg"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/50"
                            }`}
                        >
                            <Bot className="h-5 w-5" />
                            AI Operational Agent
                        </button>
                        <button
                            onClick={() => setActiveTab("gst-dashboard")}
                            className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-300 ${
                                activeTab === "gst-dashboard"
                                    ? "bg-slate-900 text-white shadow-lg"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/50"
                            }`}
                        >
                            <ReceiptIndianRupee className="h-5 w-5" />
                            GST Compliance Ledger
                        </button>
                    </div>
                </div>

                {/* Main Showcase Panel */}
                <div className="glass-panel bg-white/80 border border-white/60 shadow-xl rounded-[2.5rem] p-6 md:p-10 lg:p-12 transition-all duration-500">
                    {activeTab === "ai-agent" ? (
                        <div className="flex flex-col lg:flex-row gap-12 items-center">
                            {/* Content */}
                            <div className="lg:w-1/2 space-y-6">
                                <div className="h-12 w-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shadow-sm">
                                    <Bot className="h-6 w-6" />
                                </div>
                                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
                                    Your Autonomous Business Sidekick
                                </h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Tired of clicking through nested menus to run standard operations? Our conversational AI Agent interprets your intent, triggers pre-filled operational forms instantly inside the chat feed, and handles repetitive tasks flawlessly.
                                </p>
                                
                                <ul className="space-y-3.5 pt-2">
                                    {[
                                        "Inline operational form generation (Invoices, Products, POs).",
                                        "Seamless execution loops with interactive edit/cancel controls.",
                                        "Direct execution indicators showing active background steps."
                                    ].map((benefit, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                                            <CheckCircle2 className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
                                            <span>{benefit}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="flex flex-wrap gap-4 pt-4">
                                    <Link
                                        to="/info/modules/ai-agent"
                                        className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-300"
                                    >
                                        Explore the AI Guide
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                    <Link
                                        to="/ai-agent/session"
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-6 py-3 font-semibold text-sm transition-all duration-300"
                                    >
                                        Try Agent Live
                                        <Zap className="h-4 w-4 text-amber-500" />
                                    </Link>
                                </div>
                            </div>

                            {/* Visual Simulator */}
                            <div className="lg:w-1/2 w-full">
                                <div className="bg-slate-950 rounded-3xl p-5 md:p-6 shadow-2xl border border-slate-800 text-slate-200 font-mono text-xs overflow-hidden relative">
                                    {/* Terminal Header */}
                                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                                        <div className="flex gap-1.5">
                                            <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                                            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                                            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                        </div>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">AI Operational Session</span>
                                        <span className="text-[10px] bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full font-sans">Active Pipeline</span>
                                    </div>

                                    {/* Console Feed */}
                                    <div className="space-y-4 font-sans text-sm">
                                        <div className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 text-slate-300 font-bold text-xs">U</div>
                                            <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 max-w-[85%] text-slate-300">
                                                Please create a new invoice for client Solanki with a base price of ₹14,500
                                            </div>
                                        </div>

                                        <div className="flex gap-3 animate-pulse">
                                            <div className="w-8 h-8 rounded-full bg-brand-950 flex items-center justify-center shrink-0 text-brand-400 border border-brand-800/40">
                                                <Bot className="h-4 w-4" />
                                            </div>
                                            <div className="text-xs font-mono text-brand-400 py-1.5 flex items-center gap-2">
                                                <span className="flex h-2.5 w-2.5 relative">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
                                                </span>
                                                [🧠 Pipeline] Triggering Invoice Creation Tool...
                                            </div>
                                        </div>

                                        {/* Nested Simulated Form */}
                                        <div className="ml-11 border-l-2 border-brand-500/30 pl-4 py-1">
                                            <div className="bg-slate-900/90 border border-brand-500/40 rounded-2xl p-5 shadow-glow space-y-4">
                                                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                                    <div className="flex items-center gap-2">
                                                        <ReceiptIndianRupee className="h-4.5 w-4.5 text-brand-400" />
                                                        <span className="font-semibold text-slate-200 text-sm">New Invoice Form</span>
                                                    </div>
                                                    <span className="text-[10px] text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-md">Drafting via AI</span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3.5 text-xs">
                                                    <div>
                                                        <span className="text-slate-500 block mb-1">Customer Name</span>
                                                        <div className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200">Solanki</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500 block mb-1">Base Price (INR)</span>
                                                        <div className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-brand-300 font-mono">₹14,500</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500 block mb-1">GST Output Rate</span>
                                                        <div className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-400">18% (Standard)</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500 block mb-1">Tax Amount</span>
                                                        <div className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-sky-400 font-mono">₹2,610</div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
                                                    <button className="bg-slate-850 hover:bg-slate-800 text-slate-400 px-3.5 py-1.5 rounded-lg text-xs font-semibold">
                                                        Cancel
                                                    </button>
                                                    <button className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-md flex items-center gap-1.5">
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        Create Invoice
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col lg:flex-row gap-12 items-center">
                            {/* Content */}
                            <div className="lg:w-1/2 space-y-6">
                                <div className="h-12 w-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shadow-sm">
                                    <ReceiptIndianRupee className="h-6 w-6" />
                                </div>
                                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
                                    Professional GST & Compliance Ledger
                                </h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Ditch manual spreadsheets for high-density, audit-ready compliance auditing. Track your exact tax liabilities from sales invoices, compare them against accumulated Input Tax Credits (ITC) from purchases/expenses, and view unified settlement maps.
                                </p>
                                
                                <ul className="space-y-3.5 pt-2">
                                    {[
                                        "Automated Outward Tax Liability Ledger.",
                                        "Live Input Tax Credit (ITC) reconciliation pipeline.",
                                        "One-click Net Tax Settlement Payable calculations.",
                                        "Robust multi-branch filtering for segmented returns."
                                    ].map((benefit, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                                            <CheckCircle2 className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
                                            <span>{benefit}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="flex flex-wrap gap-4 pt-4">
                                    <Link
                                        to="/info/modules/gst-dashboard"
                                        className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-300"
                                    >
                                        Read the GST Guide
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                    <Link
                                        to="/analytics"
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-6 py-3 font-semibold text-sm transition-all duration-300"
                                    >
                                        Open Live Ledger
                                        <TrendingUp className="h-4 w-4 text-brand-500" />
                                    </Link>
                                </div>
                            </div>

                            {/* Visual Simulator */}
                            <div className="lg:w-1/2 w-full">
                                <div className="bg-slate-50 rounded-3xl p-5 md:p-6 shadow-2xl border border-slate-200 text-slate-700 font-sans overflow-hidden">
                                    {/* Dashboard Header */}
                                    <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center animate-pulse">
                                                <ReceiptIndianRupee className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-slate-900">GST Ledger Dashboard</h4>
                                                <p className="text-[10px] text-slate-500">Live Compliance Audit</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 text-xs shadow-sm">
                                            <Building2 className="h-3.5 w-3.5 text-slate-400 ml-1" />
                                            <span className="font-semibold text-slate-700">All Branches</span>
                                            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                        </div>
                                    </div>

                                    {/* Sub-tabs Simulator */}
                                    <div className="flex gap-2 mb-5 border-b border-slate-200/80 pb-2">
                                        {[
                                            { id: "liability", label: "Liability Ledger" },
                                            { id: "itc", label: "ITC Credits" },
                                            { id: "settlement", label: "Tax Settlement" }
                                        ].map((subtab) => (
                                            <button
                                                key={subtab.id}
                                                onClick={() => setActiveGstSubtab(subtab.id)}
                                                className={`pb-2 px-3 text-xs font-semibold transition-all relative ${
                                                    activeGstSubtab === subtab.id
                                                        ? "text-slate-900 border-b-2 border-brand-600 font-bold"
                                                        : "text-slate-400 hover:text-slate-600"
                                                }`}
                                            >
                                                {subtab.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Interactive Cards Content */}
                                    <div className="space-y-4">
                                        {activeGstSubtab === "liability" && (
                                            <div className="space-y-3 animate-fade-in">
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="bg-white border border-slate-100 rounded-xl p-3.5 text-center shadow-sm">
                                                        <span className="text-[10px] text-slate-450 font-semibold block mb-1">Sales Base Value</span>
                                                        <span className="text-sm font-bold text-slate-900 font-mono">₹2,51,000</span>
                                                    </div>
                                                    <div className="bg-white border border-slate-100 rounded-xl p-3.5 text-center shadow-sm">
                                                        <span className="text-[10px] text-slate-450 font-semibold block mb-1">CGST (Sales)</span>
                                                        <span className="text-sm font-bold text-slate-800 font-mono">₹22,600</span>
                                                    </div>
                                                    <div className="bg-white border border-slate-100 rounded-xl p-3.5 text-center shadow-sm border-l-2 border-l-rose-500">
                                                        <span className="text-[10px] text-rose-500 font-bold block mb-1">Total Liability</span>
                                                        <span className="text-sm font-black text-rose-600 font-mono">₹45,200</span>
                                                    </div>
                                                </div>

                                                <div className="bg-white rounded-2xl border border-slate-150 p-4 shadow-sm">
                                                    <span className="text-xs font-bold text-slate-800 block mb-2.5">Recent GST Liability Entries</span>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-50">
                                                            <div className="flex items-center gap-2">
                                                                <span className="h-6 w-6 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600 flex items-center justify-center">#01</span>
                                                                <span className="font-semibold text-slate-850">Invoice INV-2026-004</span>
                                                            </div>
                                                            <span className="font-bold text-rose-600 font-mono">+₹2,610</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-50">
                                                            <div className="flex items-center gap-2">
                                                                <span className="h-6 w-6 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600 flex items-center justify-center">#02</span>
                                                                <span className="font-semibold text-slate-850">Invoice INV-2026-003</span>
                                                            </div>
                                                            <span className="font-bold text-rose-600 font-mono">+₹4,590</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {activeGstSubtab === "itc" && (
                                            <div className="space-y-3 animate-fade-in">
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="bg-white border border-slate-100 rounded-xl p-3.5 text-center shadow-sm">
                                                        <span className="text-[10px] text-slate-450 font-semibold block mb-1">Purchases Base Value</span>
                                                        <span className="text-sm font-bold text-slate-900 font-mono">₹1,82,200</span>
                                                    </div>
                                                    <div className="bg-white border border-slate-100 rounded-xl p-3.5 text-center shadow-sm">
                                                        <span className="text-[10px] text-slate-450 font-semibold block mb-1">Expense Credits</span>
                                                        <span className="text-sm font-bold text-slate-800 font-mono">₹4,300</span>
                                                    </div>
                                                    <div className="bg-white border border-slate-100 rounded-xl p-3.5 text-center shadow-sm border-l-2 border-l-brand-500">
                                                        <span className="text-[10px] text-brand-600 font-bold block mb-1">Claimable ITC</span>
                                                        <span className="text-sm font-black text-brand-600 font-mono">₹32,800</span>
                                                    </div>
                                                </div>

                                                <div className="bg-white rounded-2xl border border-slate-150 p-4 shadow-sm">
                                                    <span className="text-xs font-bold text-slate-800 block mb-2.5">Input Tax Credit Pipeline</span>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-50">
                                                            <div className="flex items-center gap-2">
                                                                <span className="h-6 w-6 rounded-md bg-brand-50 text-[10px] font-bold text-brand-650 flex items-center justify-center">PO</span>
                                                                <span className="font-semibold text-slate-850">PO #90041 - Supplier Restock</span>
                                                            </div>
                                                            <span className="font-bold text-brand-600 font-mono">+₹1,440</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-50">
                                                            <div className="flex items-center gap-2">
                                                                <span className="h-6 w-6 rounded-md bg-sky-50 text-[10px] font-bold text-sky-650 flex items-center justify-center">EX</span>
                                                                <span className="font-semibold text-slate-850">Office Lease Rental Expense</span>
                                                                <span className="text-[9px] text-brand-600 bg-brand-50 px-1 py-0.5 rounded">RCM</span>
                                                            </div>
                                                            <span className="font-bold text-brand-600 font-mono">+₹2,700</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {activeGstSubtab === "settlement" && (
                                            <div className="space-y-3 animate-fade-in">
                                                <div className="bg-white rounded-2xl border border-slate-150 p-4 shadow-sm text-center">
                                                    <span className="text-[10px] text-slate-500 font-semibold block mb-1">NET PAYABLE TAX LIABILITY</span>
                                                    <div className="text-2xl font-black text-slate-900 font-mono mb-2 flex items-center justify-center gap-1.5">
                                                        <span>₹12,400</span>
                                                        <span className="text-[10px] bg-amber-500/10 text-amber-700 px-2 py-0.5 rounded-full font-sans border border-amber-200/50">Draft Settlement</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 max-w-sm mx-auto">
                                                        Total Liability (₹45,200) offset against Input Credits (₹32,800) results in ₹12,400 outstanding.
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-white border border-slate-100 rounded-xl p-3.5 flex items-center gap-3">
                                                        <Building2 className="h-5 w-5 text-brand-500 shrink-0" />
                                                        <div>
                                                            <span className="text-[10px] text-slate-450 font-semibold block">North Branch Payable</span>
                                                            <span className="text-xs font-bold text-slate-900 font-mono">₹4,800</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white border border-slate-100 rounded-xl p-3.5 flex items-center gap-3">
                                                        <Building2 className="h-5 w-5 text-brand-500 shrink-0" />
                                                        <div>
                                                            <span className="text-[10px] text-slate-450 font-semibold block">South Branch Payable</span>
                                                            <span className="text-xs font-bold text-slate-900 font-mono">₹7,600</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
