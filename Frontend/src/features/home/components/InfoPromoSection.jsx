import { ArrowRight, BookOpen, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";

export default function InfoPromoSection() {
    return (
        <section className="py-24 bg-white relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-50 rounded-full blur-3xl opacity-50"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    {/* Content */}
                    <div className="lg:w-1/2 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-wider mb-6">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            New Feature
                        </div>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight leading-tight">
                            Master the Platform with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Bizz Visionary Info</span>
                        </h2>
                        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                            Whether you're an Owner, Manager, or Employee, our comprehensive documentation hub provides tailored guides to help you maximize your productivity and understand every feature in depth.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <Link
                                to="/info"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                            >
                                <BookOpen className="h-5 w-5" />
                                Explore the Guide
                            </Link>
                            <Link
                                to="/info/owner"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-300"
                            >
                                View Role Guides <ArrowRight className="h-5 w-5" />
                            </Link>
                        </div>

                        <div className="mt-10 flex items-center justify-center lg:justify-start gap-8 text-sm font-medium text-gray-500">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-green-500" />
                                <span>Role-Based Access</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-purple-500" />
                                <span>Team Management</span>
                            </div>
                        </div>
                    </div>

                    {/* Visual / Card Preview */}
                    <div className="lg:w-1/2 w-full perspective-1000">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-all duration-500"></div>
                            <div className="relative bg-white border border-gray-100 rounded-3xl p-8 shadow-2xl transform transition-transform duration-500 group-hover:rotate-1">
                                <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">Documentation Hub</h3>
                                        <p className="text-sm text-gray-500">Quick access to all resources</p>
                                    </div>
                                    <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                                        <BookOpen size={20} />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {[
                                        { title: "Owner Guide", desc: "Manage business, finances & teams", color: "bg-blue-50 text-blue-600" },
                                        { title: "Manager Guide", desc: "Oversee operations & employees", color: "bg-purple-50 text-purple-600" },
                                        { title: "Employee Guide", desc: "Track tasks, sales & inventory", color: "bg-green-50 text-green-600" }
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold ${item.color}`}>
                                                {item.title[0]}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">{item.title}</h4>
                                                <p className="text-xs text-gray-500">{item.desc}</p>
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-gray-300 ml-auto" />
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
