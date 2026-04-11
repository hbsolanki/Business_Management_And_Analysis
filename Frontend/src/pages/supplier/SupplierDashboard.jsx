import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import {
    FaArrowRight,
    FaPlus,
    FaTruck,
    FaUsers,
    FaShoppingCart,
    FaFileInvoice,
    FaUser
} from "react-icons/fa";

import ProtectedHeader from "@/components/layout/ProtectedHeader";



const NavCard = ({ to, icon: Icon, label, desc, color, bg }) => (
    <Link
        to={to}
        className="glass-panel rounded-3xl p-8 group transition-all hover:bg-white/80 hover:shadow-2xl hover:shadow-brand-100 hover:-translate-y-1 relative overflow-hidden h-full flex flex-col justify-between"
    >
        <div className="relative z-10">
            <div className={`h-14 w-14 rounded-2xl ${bg} ${color} flex items-center justify-center text-2xl transition-transform group-hover:scale-110 duration-300 shadow-sm font-bold`}>
                <Icon />
            </div>
            <h3 className="text-xl font-black text-slate-900 mt-6 tracking-tight">{label}</h3>
            <p className="text-sm text-slate-500 mt-2 font-medium leading-relaxed">{desc}</p>
        </div>
        <div className="mt-8 flex items-center gap-2 text-slate-400 group-hover:text-brand-600 transition-colors relative z-10">
            <span className="text-xs font-bold uppercase tracking-widest">Open Workspace</span>
            <FaArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
        </div>
        <div className={`absolute -right-4 -bottom-4 h-32 w-32 ${bg} opacity-5 rounded-full group-hover:scale-150 transition-transform duration-700`} />
    </Link>
);

export default function SupplierDashboard() {
    const navigate = useNavigate();
    const { profile } = useSelector((state) => state.user);


    return (
        <div className="min-h-screen bg-transparent pb-16 font-sans">
            <ProtectedHeader />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
                {/* Hero Section */}
                <section className="relative overflow-hidden glass-panel rounded-[40px] p-8 md:p-12">
                    <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                        <div>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-brand-100">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                                </span>
                                Supplier Headquarters
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
                                Master Your <br />
                                <span className="text-brand-600">Procurement</span> Flow
                            </h1>
                            <p className="text-slate-500 mt-6 text-lg max-w-xl font-medium leading-relaxed">
                                Seamlessly manage vendors, track purchase orders, and monitor your business expenditure from a single console.
                            </p>

                            <div className="mt-10 flex flex-wrap gap-4">
                                <button
                                    onClick={() => navigate("/supplier/vendor/new")}
                                    className="px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-3 shadow-lg shadow-slate-200"
                                >
                                    <FaPlus size={14} />
                                    Onboard Vendor
                                </button>
                                <button
                                    onClick={() => navigate("/supplier/customer/new")}
                                    className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-500 transition-all hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-3 shadow-lg shadow-emerald-200"
                                >
                                    <FaUser size={14} />
                                    New Customer
                                </button>
                                <button
                                    onClick={() => navigate("/supplier/purchase-order/new")}
                                    className="px-8 py-4 bg-brand-600 text-white font-bold rounded-2xl hover:bg-brand-500 transition-all hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-3 shadow-lg shadow-brand-200"
                                >
                                    <FaShoppingCart size={14} />
                                    New Purchase Order
                                </button>
                                <button
                                    onClick={() => navigate("/supplier/sales-order/new")}
                                    className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-all hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-3 shadow-lg shadow-indigo-200"
                                >
                                    <FaFileInvoice size={14} />
                                    New Sales Order
                                </button>
                            </div>
                        </div>

                        <div className="hidden lg:block relative">
                            <div className="h-64 w-64 rounded-[60px] bg-brand-50 flex items-center justify-center text-7xl text-brand-600 shadow-inner rotate-6 transition-transform duration-700 font-bold">
                                <FaTruck size={100} />
                            </div>
                        </div>
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-brand-50/30 to-transparent pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 h-64 w-64 bg-indigo-50 opacity-20 rounded-full blur-3xl pointer-events-none" />
                </section>


                {/* Navigation Blocks */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <NavCard
                        to="/supplier/vendor"
                        icon={FaUsers}
                        label="Vendor Directory"
                        desc="Access full contact information, GST details, and historical data for all your registered supply partners."
                        color="text-brand-600"
                        bg="bg-brand-50"
                    />
                    <NavCard
                        to="/supplier/purchase-order"
                        icon={FaShoppingCart}
                        label="Purchase Orders"
                        desc="Monitor order statuses, verify item fulfillment, and keep your inventory synchronized with incoming stock."
                        color="text-indigo-600"
                        bg="bg-indigo-50"
                    />
                    <NavCard
                        to="/supplier/sales-order"
                        icon={FaFileInvoice}
                        label="Sales Orders"
                        desc="Track outbound orders, manage fulfillment, and keep customer dispatches aligned with inventory."
                        color="text-emerald-600"
                        bg="bg-emerald-50"
                    />
                    <NavCard
                        to="/supplier/customer"
                        icon={FaUser}
                        label="Customers"
                        desc="Maintain customer profiles, verify contact details, and connect them to their business platform."
                        color="text-sky-600"
                        bg="bg-sky-50"
                    />
                </div>
            </main>
        </div>
    );
}
