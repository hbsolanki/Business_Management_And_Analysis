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
    FaCaretDown
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

    // Strictly Current Month/Year for recording
    const [selectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear] = useState(new Date().getFullYear());

    const [categories, setCategories] = useState([]); // Available categories (not yet recorded)
    const [costs, setCosts] = useState({}); // { [categoryId]: amount }
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const roleStr = typeof profile?.role === 'object' ? profile.role.role : profile?.role;
        if (roleStr === "OWNER") {
            fetchBranches();
        } else if (!selectedBranch && profile?.branch) {
            // Handle profile.branch being an object or ID
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
                if (main) {
                    setSelectedBranch(String(main.id));
                } else {
                    setLoading(false);
                }
            }
        } catch {
            toast.error("Failed to load branches");
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedBranch) {
            // Ensure selectedBranch is an ID before fetching
            const branchId = typeof selectedBranch === 'object' ? selectedBranch.id : selectedBranch;
            fetchData(branchId);
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

            // Get IDs of categories already recorded this month
            const recordedCategoryIds = new Set(monthlyData.map(item => item.cost_category?.id));

            // Filter to only show categories NOT recorded
            const availableCategories = allCategories.filter(cat => !recordedCategoryIds.has(cat.id));

            setCategories(availableCategories);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (categoryId, value) => {
        setCosts((prev) => ({
            ...prev,
            [categoryId]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Transform costs object to array
        const costCategoryItems = Object.entries(costs)
            .map(([id, amount]) => ({
                cost_category_id: Number(id),
                cost: String(amount ?? "").trim(),
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

    const totalAmount = Object.values(costs).reduce((sum, value) => sum + (Number(value) || 0), 0);
    const filledCount = Object.values(costs).filter((value) => Number(value) > 0).length;

    // Month Label from selection
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
        <div className="min-h-screen pb-20 bg-transparent">
            <ProtectedHeader />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-6">
                    <BackButton to="/cost-category" label="Back to Dashboard" />
                </div>

                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                                <span className="p-2 bg-slate-900 rounded-lg text-white shadow-sm">
                                    <FaRegCalendarAlt className="text-xl" />
                                </span>
                                Record Expenses
                            </h1>
                            <p className="text-slate-500 text-sm font-medium ml-1">
                                Financial logging for {monthLabel}
                            </p>
                        </div>
                    </div>

                    {/* Branch Selector for Owners */}
                    {(typeof profile?.role === 'object' ? profile.role.role : profile?.role) === "OWNER" && (
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex items-center gap-2 text-slate-500 min-w-max">
                                    <FaCodeBranch className="text-sm" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Target Branch:</span>
                                </div>
                                <div className="relative flex-1 max-w-xs">
                                    <select
                                        value={selectedBranch}
                                        onChange={(e) => setSelectedBranch(e.target.value)}
                                        className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-slate-100 transition-all appearance-none cursor-pointer"
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Month Indicator */}
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Period</p>
                                    <h3 className="text-2xl font-bold text-slate-900">{monthLabel}</h3>
                                </div>
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100/50">
                                    <FaRegCalendarAlt className="text-lg" />
                                </span>
                            </div>
                        </div>

                        {/* Progress Indicator */}
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</p>
                                    <h3 className="text-2xl font-bold text-slate-900">{filledCount} / {categories.length}</h3>
                                </div>
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                                    <FaCheckCircle className="text-lg" />
                                </span>
                            </div>
                        </div>

                        {/* Session Total */}
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm bg-slate-50/50">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Session Total</p>
                                    <h3 className="text-2xl font-bold text-slate-900">{totalFormatted}</h3>
                                </div>
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-900 shadow-sm border border-slate-200">
                                    <FaMoneyBillWave className="text-lg" />
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                        <h2 className="text-base font-bold text-slate-900">Remaining Cost Categories</h2>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">Enter amounts for the current period</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {!Array.isArray(categories) || categories.length === 0 ? (
                                <div className="col-span-full text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                    <div className="h-12 w-12 bg-white rounded-lg shadow-sm flex items-center justify-center mx-auto mb-3 border border-slate-100">
                                        <FaCheckCircle className="text-emerald-500 text-xl" />
                                    </div>
                                    <p className="text-slate-900 font-bold text-sm">All caught up!</p>
                                    <p className="text-slate-500 text-xs mt-1">All active categories recorded.</p>
                                    <button
                                        type="button"
                                        onClick={() => navigate(-1)}
                                        className="mt-4 inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-all shadow-sm"
                                    >
                                        Return to Dashboard
                                    </button>
                                </div>
                            ) : (
                                categories.map((category) => (
                                    <div key={category.id} className="group relative bg-slate-50/30 rounded-xl p-4 border border-transparent hover:border-slate-200 hover:bg-white hover:shadow-sm transition-all duration-200">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 bg-white shadow-sm border border-slate-200 rounded-lg flex items-center justify-center text-slate-700 group-hover:text-slate-900 transition-colors">
                                                {(() => {
                                                    const Icon = getCategoryIcon(category.name);
                                                    return <Icon size={14} />;
                                                })()}
                                            </div>
                                            <span className="font-bold text-slate-700 text-sm truncate">{category.name}</span>
                                        </div>

                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                <span className="text-slate-400 font-bold text-sm">₹</span>
                                            </div>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="0.00"
                                                className="w-full pl-8 pr-10 py-2.5 rounded-lg bg-white border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all font-bold text-slate-900 text-sm placeholder:text-slate-300 tabular-nums"
                                                value={costs[category.id] || ""}
                                                onChange={(e) => handleInputChange(category.id, e.target.value)}
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">INR</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-slate-100">
                            <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 max-w-sm">
                                <FaInfoCircle className="text-slate-400" size={14} />
                                <p className="text-[11px] font-medium text-slate-500 leading-tight">
                                    Amounts help track total monthly spend. Ensure accuracy.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || categories.length === 0 || totalAmount === 0}
                                className="w-full md:w-auto min-w-[180px] h-12 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 text-sm"
                            >
                                {submitting ? (
                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        Save Transactions
                                        <FaPlus size={10} />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
