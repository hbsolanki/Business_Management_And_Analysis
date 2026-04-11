import { ArrowRight, BookOpen, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";

export default function InfoPromoSection() {
    return (
        <section className="py-24 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-brand-100 rounded-full blur-3xl opacity-60"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-sky-100 rounded-full blur-3xl opacity-60"></div>

            <div className="section-shell relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    {/* Content */}
                    <div className="lg:w-1/2 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-bold uppercase tracking-wider mb-6">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                            </span>
                            New Feature
                        </div>
                        <h2 className="text-4xl md:text-5xl font-semibold text-slate-900 mb-6 tracking-tight leading-tight">
                            Master the Platform with <span className="text-gradient">BizVisionary Info</span>
                        </h2>
                        <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                            Whether you&apos;re an Owner, Manager, or Employee, our comprehensive documentation hub provides tailored guides to help you maximize your productivity and understand every feature in depth.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <Link
                                to="/info"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                            >
                                <BookOpen className="h-5 w-5" />
                                Explore the Guide
                            </Link>
                            <Link
                                to="/info/modules"
                                className="glass-panel inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-slate-700 rounded-xl hover:bg-white/70 hover:border-slate-300 transition-all duration-300"
                            >
                                Open Module Map <ArrowRight className="h-5 w-5" />
                            </Link>
                        </div>

                        <div className="mt-10 flex items-center justify-center lg:justify-start gap-8 text-sm font-medium text-slate-500">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                                <span>Role-Based Access</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-sky-500" />
                                <span>Team Management</span>
                            </div>
                        </div>
                    </div>

                    {/* Visual / Card Preview */}
                    <div className="lg:w-1/2 w-full perspective-1000">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-sky-600 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-all duration-500"></div>
                            <div className="relative bg-white/90 border border-white/70 rounded-3xl p-8 shadow-2xl transform transition-transform duration-500 group-hover:rotate-1">
                                <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
                                    <div>
                                        <h3 className="text-xl font-semibold text-slate-900">Documentation Hub</h3>
                                        <p className="text-sm text-slate-500">Quick access to all resources</p>
                                    </div>
                                    <div className="h-10 w-10 bg-brand-100 rounded-xl flex items-center justify-center text-brand-600">
                                        <BookOpen size={20} />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {[
                                        { title: "Owner Guide", desc: "Manage business, finances & teams", color: "bg-brand-50 text-brand-600" },
                                        { title: "Manager Guide", desc: "Oversee operations & employees", color: "bg-sky-50 text-sky-600" },
                                        { title: "Employee Guide", desc: "Track tasks, sales & inventory", color: "bg-emerald-50 text-emerald-600" }
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/70 transition-colors border border-transparent hover:border-slate-100">
                                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold ${item.color}`}>
                                                {item.title[0]}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-900">{item.title}</h4>
                                                <p className="text-xs text-slate-500">{item.desc}</p>
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-slate-300 ml-auto" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
