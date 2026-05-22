import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
    FaLayerGroup,
    FaMoneyBillWave,
    FaRegCalendarAlt,
    FaPlus,
    FaCheckCircle,
    FaInfoCircle,
    FaBolt,
    FaWifi,
    FaTruck,
    FaBullhorn,
    FaTools,
    FaUserTie,
    FaShieldAlt,
    FaUtensils,
    FaStore,
    FaCar,
    FaHome,
    FaBriefcase,
    FaFileInvoiceDollar,
    FaCodeBranch,
    FaCaretDown,
    FaPercent
} from "react-icons/fa";
import toast from "react-hot-toast";

import costService from "@/features/cost/services/costService";
import costCategoryService from "@/features/costCategory/services/costCategoryService";
import { branchService } from "@/features/business/services/branchService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import BackButton from "@/components/shared/BackButton";

export default function AddCost() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { profile } = useSelector((state) => state.user);
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState(searchParams.get("branch_id") || "");

    const [selectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear] = useState(new Date().getFullYear());

    const [categories, setCategories] = useState([]);
    const [costs, setCosts] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const roleStr = typeof profile?.role === 'object' ? profile.role.role : profile?.role;
        if (roleStr === "OWNER") {
            fetchBranches();
        } else if (!selectedBranch && profile?.branch) {
            const branchId = typeof profile.branch === 'object' ? profile.branch.id : profile.branch;
            setSelectedBranch(String(branchId || ""));
        }
    }, [profile]);

    const fetchBranches = async () => {
        try {
            const res = await branchService.list();
            const branchList = res.data?.results || res.data || [];
            setBranches(branchList);

            if (!selectedBranch) {
                const main = branchList.find((b) => b.is_default) || branchList[0];
                if (main) setSelectedBranch(String(main.id));
                else setLoading(false);
            }
        } catch {
            toast.error("Failed to load branches");
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedBranch) {
            fetchData(selectedBranch);
        } else {
            setCategories([]);
            setCosts({});
            setLoading(false);
        }
    }, [selectedBranch]);

    const fetchData = async (branchId) => {
        try {
            setLoading(true);
            const [catRes, monthRes] = await Promise.all([
                costCategoryService.getAll(branchId),
                costService.getMonthlyCosts(branchId, selectedMonth, selectedYear).catch(() => ({ data: { results: [] } })),
            ]);

            const allCategories = catRes.data?.results || (Array.isArray(catRes.data) ? catRes.data : []);
            const monthlyData = monthRes.data?.results || (Array.isArray(monthRes.data) ? monthRes.data : []);

            const recordedCategoryIds = new Set(monthlyData.map(item => item.cost_category?.id));
            const availableCategories = allCategories.filter(cat => !recordedCategoryIds.has(cat.id));

            setCategories(availableCategories);
            
            const initialCosts = {};
            availableCategories.forEach(cat => {
                initialCosts[cat.id] = { amount: "", gst_rate: cat.gst_rate || "0.00" };
            });
            setCosts(initialCosts);

        } catch (error) {
            console.error(error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    // Deep linking logic for reminder action link
    useEffect(() => {
        if (!loading && categories.length > 0) {
            const catId = searchParams.get('category_id');
            if (catId) {
                // Short timeout to ensure DOM is fully rendered
                setTimeout(() => {
                    const el = document.getElementById(`category-${catId}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('ring-4', 'ring-amber-400', 'ring-offset-2');
                        setTimeout(() => el.classList.remove('ring-4', 'ring-amber-400', 'ring-offset-2'), 3000);
                    }
                }, 100);
            }
        }
    }, [loading, categories, searchParams]);

    const handleInputChange = (categoryId, field, value) => {
        setCosts((prev) => ({
            ...prev,
            [categoryId]: {
                ...prev[categoryId],
                [field]: value,
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const costCategoryItems = Object.entries(costs)
            .map(([id, data]) => ({
                cost_category_id: Number(id),
                cost: String(data.amount ?? "").trim(),
                gst_rate: String(data.gst_rate ?? "0.00").trim(),
            }))
            .filter((item) => Number(item.cost) > 0);

        if (costCategoryItems.length === 0) {
            toast.error("Please enter at least one cost");
            return;
        }

        setSubmitting(true);
        try {
            await costService.addCost({
                cost_category_items: costCategoryItems,
                month: Number(selectedMonth),
                year: Number(selectedYear),
                ...(selectedBranch ? { branch_id: Number(selectedBranch) } : {}),
            });
            toast.success("Costs added successfully");
            navigate(-1);
        } catch (error) {
            console.error(error);
            toast.error("Failed to save costs");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-transparent"></div>
            </div>
        );
    }

    const totalAmount = Object.values(costs).reduce((sum, data) => sum + (Number(data.amount) || 0), 0);
    const filledCount = Object.values(costs).filter((data) => Number(data.amount) > 0).length;

    const monthLabel = new Date(selectedYear, selectedMonth - 1).toLocaleString("en-US", { month: "long", year: "numeric" });
    const totalFormatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(totalAmount || 0);

    const getCategoryIcon = (name = "") => {
        const key = name.toLowerCase();
        if (key.includes("rent") || key.includes("lease")) return FaHome;
        if (key.includes("salary") || key.includes("payroll")) return FaUserTie;
        if (key.includes("utility") || key.includes("electric") || key.includes("water")) return FaBolt;
        if (key.includes("internet") || key.includes("wifi") || key.includes("network")) return FaWifi;
        if (key.includes("transport") || key.includes("delivery") || key.includes("logistic")) return FaTruck;
        if (key.includes("marketing") || key.includes("advert")) return FaBullhorn;
        if (key.includes("maintenance") || key.includes("repair")) return FaTools;
        if (key.includes("insurance")) return FaShieldAlt;
        if (key.includes("tax")) return FaFileInvoiceDollar;
        if (key.includes("food") || key.includes("refreshment")) return FaUtensils;
        if (key.includes("store") || key.includes("shop")) return FaStore;
        if (key.includes("fuel") || key.includes("vehicle") || key.includes("travel")) return FaCar;
        if (key.includes("office")) return FaBriefcase;
        if (key.includes("finance") || key.includes("bank") || key.includes("interest")) return FaMoneyBillWave;
        return FaLayerGroup;
    };

    return (
        <div className="min-h-screen pb-20 bg-slate-50">
            <ProtectedHeader />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-6">
                    <BackButton to="/cost-category" label="Back to Dashboard" />
                </div>

                <div className="space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                                <span className="p-2.5 bg-slate-900 rounded-xl text-white shadow-lg">
                                    <FaRegCalendarAlt className="text-xl" />
                                </span>
                                Record Expenses
                            </h1>
                            <p className="text-slate-500 text-sm font-medium ml-1">
                                Financial logging for {monthLabel}
                            </p>
                        </div>
                    </div>

                    {/* Branch Selector */}
                    {(typeof profile?.role === 'object' ? profile.role.role : profile?.role) === "OWNER" && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex items-center gap-2 text-slate-500 min-w-max">
                                    <FaCodeBranch className="text-sm" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Target Branch:</span>
                                </div>
                                <div className="relative flex-1 max-w-xs">
                                    <select
                                        value={selectedBranch}
                                        onChange={(e) => setSelectedBranch(e.target.value)}
                                        className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">Select Branch</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name} {b.is_default ? "(Main)" : ""}</option>
                                        ))}
                                    </select>
                                    <FaCaretDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Expense List</h2>
                                <p className="text-[11px] font-medium text-slate-500 mt-0.5">Fill in the details for each category below</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total</p>
                                    <p className="text-lg font-black text-slate-900 tabular-nums leading-none">{totalFormatted}</p>
                                </div>
                                <div className="h-8 w-[1px] bg-slate-200"></div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Count</p>
                                    <p className="text-lg font-black text-slate-900 tabular-nums leading-none">{filledCount}</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="space-y-6">
                                {!Array.isArray(categories) || categories.length === 0 ? (
                                    <div className="text-center py-16 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                                        <FaCheckCircle className="text-emerald-500 text-3xl mx-auto mb-4" />
                                        <p className="text-slate-900 font-bold text-base">Everything is recorded!</p>
                                        <p className="text-slate-500 text-sm mt-1">No pending categories for this period.</p>
                                    </div>
                                ) : (
                                    categories.map((category) => {
                                        const amount = Number(costs[category.id]?.amount || 0);
                                        const rate = Number(costs[category.id]?.gst_rate || 0);
                                        const gstPrice = (amount * (rate / 100)).toFixed(2);
                                        
                                        return (
                                            <div key={category.id} id={`category-${category.id}`} className="group p-5 bg-slate-50/30 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-white hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300">
                                                <div className="flex flex-col lg:flex-row gap-6">
                                                    {/* Info Section */}
                                                    <div className="flex items-center gap-4 min-w-[200px]">
                                                        <div className="w-12 h-12 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center text-slate-700 group-hover:scale-110 transition-transform">
                                                            {(() => {
                                                                const Icon = getCategoryIcon(category.name);
                                                                return <Icon size={18} />;
                                                            })()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <span className="font-bold text-slate-900 text-base block truncate leading-tight">{category.name}</span>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 font-black rounded uppercase tracking-tighter">Default: {category.gst_rate}%</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Three Box Layout */}
                                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                        {/* Box 1: Price */}
                                                        <div className="relative">
                                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">1. Base Price</label>
                                                            <div className="relative">
                                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    placeholder="0.00"
                                                                    className="w-full pl-8 pr-4 py-3.5 rounded-xl bg-white border border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 outline-none transition-all font-black text-slate-900 text-base tabular-nums shadow-sm"
                                                                    value={costs[category.id]?.amount || ""}
                                                                    onChange={(e) => handleInputChange(category.id, "amount", e.target.value)}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Box 2: Rate */}
                                                        <div className="relative">
                                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">2. GST Rate</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    placeholder="0.00"
                                                                    className="w-full pl-4 pr-10 py-3.5 rounded-xl bg-white border border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 outline-none transition-all font-black text-slate-900 text-base tabular-nums shadow-sm"
                                                                    value={costs[category.id]?.gst_rate || ""}
                                                                    onChange={(e) => handleInputChange(category.id, "gst_rate", e.target.value)}
                                                                />
                                                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                                    <FaPercent className="text-xs text-slate-400" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Box 3: GST Amount */}
                                                        <div className="relative">
                                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">3. GST Price</label>
                                                            <div className="h-[58px] flex items-center px-5 bg-slate-900 rounded-xl shadow-lg shadow-slate-900/10 border border-slate-800 transition-all group-hover:scale-[1.02]">
                                                                <span className="text-white/50 font-bold text-base mr-2">₹</span>
                                                                <span className="text-white font-black text-lg tabular-nums tracking-tight">{gstPrice}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-slate-100">
                                <div className="flex items-start gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 max-w-md">
                                    <div className="mt-1 p-2 bg-white rounded-lg shadow-sm">
                                        <FaInfoCircle className="text-slate-400" size={16} />
                                    </div>
                                    <p className="text-xs font-medium text-slate-500 leading-relaxed">
                                        Fill in the <strong className="text-slate-900">Base Price</strong> and <strong className="text-slate-900">GST Rate</strong>. 
                                        The final tax amount and total costs will be calculated and synchronized with your GST dashboard instantly.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting || categories.length === 0 || totalAmount === 0}
                                    className="w-full md:w-auto min-w-[220px] h-14 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-slate-200 transition-all active:scale-95 text-base group"
                                >
                                    {submitting ? (
                                        <div className="h-5 w-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            Save Transactions
                                            <FaPlus size={12} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
