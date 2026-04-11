import { useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowRight, FaPlay, FaTimes } from "react-icons/fa";
import { Dialog, DialogPanel } from "@headlessui/react";
import app_owner_dashboard from "../../../assets/Home/app_owner_dashboard_BMA.png";


export default function HeroSection() {
    const [isVideoOpen, setIsVideoOpen] = useState(false);

    return (
        <section className="relative isolate overflow-hidden">
            <div className="absolute inset-0 -z-10">
                <div className="absolute -top-32 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-brand-300/40 blur-3xl"></div>
                <div className="absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-sky-200/50 blur-3xl"></div>
                <div className="absolute inset-0 bg-grid-slate [mask-image:radial-gradient(70%_70%_at_top,white,transparent)]"></div>
            </div>

            <div className="section-shell pb-20 pt-10 sm:pt-14 lg:pt-20 lg:pb-24 lg:flex lg:items-center lg:gap-12">
                <div className="max-w-2xl lg:max-w-xl animate-fade-up">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700 shadow-soft">
                        <span className="h-2 w-2 rounded-full bg-brand-500"></span>
                        Operations OS 2.0
                    </span>
                    <h1 className="mt-6 text-4xl font-semibold text-slate-900 sm:text-5xl lg:text-6xl">
                        Build smarter operations with{" "}
                        <span className="text-gradient">real-time business clarity</span>
                    </h1>
                    <p className="mt-6 text-lg leading-relaxed text-ink-700">
                        BizVisionary unifies invoicing, inventory, and team workflows into one
                        adaptive platform, so you can act on insights faster and scale with confidence.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-slate-600">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 shadow-soft">
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                            99.9% uptime
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 shadow-soft">
                            <span className="h-2 w-2 rounded-full bg-sky-500"></span>
                            24/7 guided support
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 shadow-soft">
                            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                            Secure data vaults
                        </span>
                    </div>

                    <div className="mt-10 flex flex-wrap items-center gap-4">
                        <Link
                            to="/owner/register"
                            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-glow hover:bg-brand-700 transition-all"
                        >
                            Get Started <FaArrowRight />
                        </Link>
                        <button
                            onClick={() => setIsVideoOpen(true)}
                            className="inline-flex items-center gap-3 rounded-full border border-white/60 bg-white/70 px-5 py-3 text-sm font-semibold text-slate-800 shadow-soft hover:border-brand-200 transition"
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                                <FaPlay size={10} />
                            </span>
                            Watch the demo
                        </button>
                    </div>

                    <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-brand-500"></span>
                            Instant onboarding
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-sky-500"></span>
                            Role-based access
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                            Live analytics
                        </div>
                    </div>
                </div>

                <div className="mt-14 flex-1 lg:mt-0 animate-fade-up">
                    <div className="relative mx-auto max-w-2xl lg:max-w-none">
                        <div className="absolute -top-6 -left-6 hidden sm:block rounded-2xl bg-white/80 p-4 shadow-card">
                            <p className="text-xs uppercase tracking-widest text-slate-500">Cashflow</p>
                            <p className="text-lg font-semibold text-slate-900">+18% M/M</p>
                        </div>
                        <div className="absolute -bottom-6 right-6 hidden sm:flex items-center gap-3 rounded-2xl bg-white/80 p-4 shadow-card">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700 font-semibold">
                                AI
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Alerts resolved</p>
                                <p className="text-sm font-semibold text-slate-900">24 min avg</p>
                            </div>
                        </div>
                        <div className="rounded-3xl bg-white/80 p-3 shadow-card ring-1 ring-white/60 backdrop-blur animate-float">
                            <img
                                src={app_owner_dashboard}
                                alt="App screenshot"
                                width={2432}
                                height={1442}
                                className="w-full rounded-2xl shadow-lg"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Video Modal */}
            <Dialog open={isVideoOpen} onClose={() => setIsVideoOpen(false)} className="relative z-50">
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" aria-hidden="true" />

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <DialogPanel className="w-full max-w-4xl rounded-2xl bg-slate-950 p-1 shadow-2xl ring-1 ring-white/10 relative">
                        <button
                            onClick={() => setIsVideoOpen(false)}
                            className="absolute -top-12 right-0 text-white hover:text-slate-300 transition-colors p-2"
                        >
                            <span className="sr-only">Close</span>
                            <FaTimes size={24} />
                        </button>

                        <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900">
                            <iframe
                                className="w-full h-full"
                                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1"
                                title="App Demo"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </section>
    );
}
