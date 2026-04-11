
import { useState, useEffect, lazy, Suspense } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
    FaLayerGroup, FaPlus, FaMoneyBillWave, FaFileInvoiceDollar,
    FaRegCalendarAlt,
    FaChartPie,
    FaPen,
    FaTrash,
    FaFilter
} from "react-icons/fa";
import {
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
    FaCodeBranch,
    FaCaretDown
} from "react-icons/fa";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

import costService from "@/features/cost/services/costService";
import costCategoryService from "@/features/costCategory/services/costCategoryService";
import { branchService } from "@/features/business/services/branchService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";

const CostCategoryModal = lazy(() => import("@/features/costCategory/components/CostCategoryModal"));
const Modal = lazy(() => import("@/components/ui/Modal"));

export default function CostDashboard() {
    const [searchParams, setSearchParams] = useSearchParams();

    // Data State
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [hasLoadedCategories, setHasLoadedCategories] = useState(false);
    const [branchContextReady, setBranchContextReady] = useState(false);
    const [categories, setCategories] = useState([]);
    const [monthData, setMonthData] = useState([]); // Initialize as empty array

    // Category Management State
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);

    // Monthly Cost Entry Management State
    const [costToEdit, setCostToEdit] = useState(null);
    const [editCostValue, setEditCostValue] = useState("");
    const [showEditCostModal, setShowEditCostModal] = useState(false);
    const [costToDelete, setCostToDelete] = useState(null);
    const [showDeleteCostModal, setShowDeleteCostModal] = useState(false);

    const { profile } = useSelector((state) => state.user);
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState(searchParams.get("branch_id") || "");
    const [fetchingBranches, setFetchingBranches] = useState(false);

    // Month/Year Filtering State
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Tracking currently loaded data to prevent redundant calls
    const [loadedFilters, setLoadedFilters] = useState({ month: null, year: null });

    const months = [
        { value: 1, label: "January" }, { value: 2, label: "February" },
        { value: 3, label: "March" }, { value: 4, label: "April" },
        { value: 5, label: "May" }, { value: 6, label: "June" },
        { value: 7, label: "July" }, { value: 8, label: "August" },
        { value: 9, label: "September" }, { value: 10, label: "October" },
        { value: 11, label: "November" }, { value: 12, label: "December" }
    ];

    const currentYear = new Date().getFullYear();
    const currentMonthNum = new Date().getMonth() + 1;
    const years = Array.from({ length: 3 }, (_, i) => currentYear - 2 + i);

    useEffect(() => {
        if (!profile) return;
        const roleStr = typeof profile?.role === 'object' ? profile.role.role : profile?.role;
        if (roleStr === "OWNER") {
            fetchBranches();
        } else {
            const branchId = typeof profile?.branch === 'object' ? profile.branch.id : profile?.branch;
            setSelectedBranch(String(branchId || ""));
            setBranchContextReady(true);
        }
    }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps -- branch bootstrap is driven by profile updates.

    const fetchBranches = async () => {
        try {
            setFetchingBranches(true);
            const res = await branchService.list();
            const branchList = res.data?.results || res.data || [];
            setBranches(branchList);
            if (!selectedBranch) {
                const main = branchList.find(b => b.is_default) || branchList[0];
                if (main) {
                    setSelectedBranch(String(main.id));
                } else {
                    setLoading(false);
                    setHasLoadedOnce(true);
                }
            }
        } catch {
            toast.error("Failed to load branches");
            setLoading(false);
            setHasLoadedOnce(true);
        } finally {
            setFetchingBranches(false);
            setBranchContextReady(true);
        }
    };

    useEffect(() => {
        if (!branchContextReady) return;

        const fetchCategories = async () => {
            try {
                const res = await costCategoryService.getAll(selectedBranch || "");
                setCategories(res.data?.results || (Array.isArray(res.data) ? res.data : []));
                setHasLoadedCategories(true);
            } catch (error) {
                console.error("Failed to load categories", error);
                toast.error("Failed to load cost categories");
            }
        };

        fetchCategories();
    }, [branchContextReady, selectedBranch]);

    useEffect(() => {
        if (!branchContextReady) return;
        fetchMonthlyData(selectedBranch || "", selectedMonth, selectedYear);
    }, [branchContextReady, selectedBranch]); // eslint-disable-line react-hooks/exhaustive-deps -- month/year update via explicit Filter button.

    const fetchMonthlyData = async (branchId, month, year) => {
        try {
            // Full-page loader only for the first load.
            if (!hasLoadedOnce) {
                setLoading(true);
            } else {
                setIsRefreshing(true);
            }

            const monthRes = await costService.getMonthlyCosts(branchId, month, year).catch(() => ({ data: { results: [] } }));
            const fetchedMonthlyData = monthRes.data?.results || (Array.isArray(monthRes.data) ? monthRes.data : []);
            setMonthData(fetchedMonthlyData);

            // Record what was successfully loaded
            setLoadedFilters({ month, year });
        } catch (error) {
            console.error(error);
            toast.error("Failed to load cost data");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
            setHasLoadedOnce(true);
        }
    };

    /* ---------- CATEGORY HANDLERS ---------- */
    const handleCategorySaved = (savedCategory) => {
        if (savedCategory?.id) {
            setCategories((prev) => {
                const exists = prev.some((item) => item.id === savedCategory.id);
                if (exists) {
                    return prev.map((item) => (item.id === savedCategory.id ? savedCategory : item));
                }
                return [...prev, savedCategory];
            });
        }
        setShowCategoryModal(false);
        setSelectedCategory(null);
    };

    const deleteCategory = async () => {
        if (!categoryToDelete) return;
        try {
            await costCategoryService.delete(categoryToDelete.id);
            setCategories((prev) => prev.filter((c) => c.id !== categoryToDelete.id));
            toast.success("Category deleted");
        } catch {
            toast.error("Failed to delete category");
        } finally {
            setShowDeleteModal(false);
            setCategoryToDelete(null);
        }
    };

    /* ---------- MONTHLY COST HANDLERS ---------- */
    const openEditCostModal = (item) => {
        setCostToEdit(item);
        setEditCostValue(item.cost);
        setShowEditCostModal(true);
    };

    const handleUpdateCost = async () => {
        if (!costToEdit) return;
        try {
            await costService.updateCost(costToEdit.id, { cost: Number(editCostValue) });
            setMonthData((prev) => prev.map((c) => c.id === costToEdit.id ? { ...c, cost: editCostValue } : c));
            toast.success("Cost updated");
        } catch {
            toast.error("Failed to update cost");
        } finally {
            setShowEditCostModal(false);
            setCostToEdit(null);
        }
    };

    const handleDeleteCost = async () => {
        if (!costToDelete) return;
        try {
            await costService.deleteCost(costToDelete.id);
            setMonthData((prev) => prev.filter((c) => c.id !== costToDelete.id));
            toast.success("Cost deleted");
        } catch {
            toast.error("Failed to delete cost");
        } finally {
            setShowDeleteCostModal(false);
            setCostToDelete(null);
        }
    };

    // Selected Month Display
    const displayedPeriod = `${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`;

    // Calculate total cost
    const totalMonthlyCost = Array.isArray(monthData)
        ? monthData.reduce((sum, item) => sum + Number(item.cost || 0), 0)
        : 0;
    const totalMonthlyCostFormatted = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(totalMonthlyCost);

    const totalCategories = categories.length;
    const recordedCount = Array.isArray(monthData) ? monthData.length : 0;
    const remainingCount = Math.max(totalCategories - recordedCount, 0);
    const coveragePercent = totalCategories > 0 ? Math.round((recordedCount / totalCategories) * 100) : 0;
    const canApplyFilter = selectedMonth !== loadedFilters.month || selectedYear !== loadedFilters.year;
    const recordExpensePath = selectedBranch ? `/cost-category/month?branch_id=${selectedBranch}` : "/cost-category/month";

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-transparent"></div>
            </div>
        );
    }

    /* ---------- UTILS ---------- */
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

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* Stats & Header Section */}
                <div className="space-y-5">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                            <div className="space-y-1">
                                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                                    <span className="p-2 bg-slate-900 rounded-lg text-white shadow-sm">
                                        <FaChartPie className="text-xl" />
                                    </span>
                                    Cost Dashboard
                                </h1>
                                <p className="text-slate-500 text-sm font-medium ml-1">
                                    Expense overview for {displayedPeriod}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5">
                                {/* Month Selector */}
                                <div className="relative min-w-[140px]">
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                        className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100 transition-all appearance-none cursor-pointer shadow-sm"
                                    >
                                        {months.map(m => (
                                            <option
                                                key={m.value}
                                                value={m.value}
                                                disabled={selectedYear === currentYear && m.value > currentMonthNum}
                                            >
                                                {m.label}
                                            </option>
                                        ))}
                                    </select>
                                    <FaCaretDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>

                                {/* Year Selector */}
                                <div className="relative min-w-[100px]">
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                                        className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100 transition-all appearance-none cursor-pointer shadow-sm"
                                    >
                                        {years.map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                    <FaCaretDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>

                                <button
                                    onClick={() => {
                                        if (canApplyFilter && !isRefreshing) {
                                            fetchMonthlyData(selectedBranch, selectedMonth, selectedYear);
                                        }
                                    }}
                                    disabled={!canApplyFilter || isRefreshing}
                                    className={`inline-flex items-center gap-2 font-semibold text-sm px-4 py-2.5 rounded-lg border shadow-sm transition-all active:scale-95 ${canApplyFilter
                                        ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
                                        : "bg-slate-50 text-slate-400 border-slate-200 cursor-default"
                                        } ${isRefreshing ? "opacity-75 cursor-wait" : ""}`}
                                >
                                    {isRefreshing ? (
                                        <div className="h-3 w-3 border-2 border-slate-400 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <FaFilter size={12} />
                                    )}
                                    {isRefreshing ? "Filtering..." : "Filter"}
                                </button>

                                <Link
                                    to={recordExpensePath}
                                    className="group inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm transition-all"
                                >
                                    <FaPlus size={12} className="group-hover:rotate-90 transition-transform" />
                                    Record Expenses
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Branch Selector for Owners */}
                    {(typeof profile?.role === 'object' ? profile.role.role : profile?.role) === "OWNER" && (
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="flex items-center gap-2 text-slate-500 min-w-max">
                                    <FaCodeBranch className="text-sm" />
                                    <span className="text-xs font-semibold uppercase tracking-wider">Viewing Branch</span>
                                </div>
                                <div className="relative flex-1 sm:max-w-sm">
                                    <select
                                        value={selectedBranch}
                                        onChange={(e) => {
                                            const newBranchId = e.target.value;
                                            setSelectedBranch(newBranchId);
                                            setSearchParams((prev) => {
                                                const params = new URLSearchParams(prev);
                                                if (newBranchId) params.set("branch_id", newBranchId);
                                                else params.delete("branch_id");
                                                return params;
                                            });
                                        }}
                                        className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100 transition-all appearance-none cursor-pointer"
                                        disabled={fetchingBranches}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Total Monthly Cost */}
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Month Total</p>
                                    <h3 className="text-2xl font-bold text-slate-900">{totalMonthlyCostFormatted}</h3>
                                </div>
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                                    <FaMoneyBillWave className="text-lg" />
                                </span>
                            </div>
                        </div>

                        {/* Category Coverage */}
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1 w-full">
                                    <div className="flex justify-between items-center pr-2">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Coverage</p>
                                        <span className="text-xs font-bold text-slate-700">{coveragePercent}%</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900">{recordedCount}/{totalCategories}</h3>
                                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                        <div className="h-full bg-slate-700 rounded-full transition-all duration-1000" style={{ width: `${coveragePercent}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Remaining Entries */}
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pending</p>
                                    <h3 className="text-2xl font-bold text-slate-900">{remainingCount}</h3>
                                </div>
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                                    <FaRegCalendarAlt className="text-lg" />
                                </span>
                            </div>
                        </div>

                        {/* Quick Action Category */}
                        <button
                            onClick={() => { setSelectedCategory(null); setShowCategoryModal(true); }}
                            className="bg-slate-50 rounded-xl p-5 border border-dashed border-slate-300 group hover:bg-white hover:border-slate-900 transition-all flex items-center justify-center gap-3"
                        >
                            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-slate-400 group-hover:text-slate-900 transition-colors shadow-sm border border-slate-200">
                                <FaPlus size={12} />
                            </div>
                            <span className="text-sm font-bold text-slate-500 group-hover:text-slate-900">New Category</span>
                        </button>
                    </div>
                </div>

                <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 transition-opacity duration-300 ${isRefreshing ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
                    {/* Left: Monthly Breakdown (Main Content) */}
                    <div className="lg:col-span-2">
                        <section className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px] overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 rounded-t-xl">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900">Monthly Expenditures</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">Verified expenses for {displayedPeriod}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Spend</p>
                                        <p className="text-lg font-bold text-slate-900">{totalMonthlyCostFormatted}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 p-0">
                                {(!monthData || monthData.length === 0) ? (
                                    <div className="h-[320px] flex items-center justify-center text-center px-6">
                                        <div>
                                            <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-3 border border-slate-100">
                                                <FaMoneyBillWave className="text-slate-400 text-xl" />
                                            </div>
                                            <p className="text-slate-900 font-semibold text-sm">No expenses recorded yet</p>
                                            <p className="text-slate-500 text-xs mt-1 mb-4">Start by adding expenses for this month.</p>
                                            <Link
                                                to={recordExpensePath}
                                                className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-all"
                                            >
                                                Record First Expense <FaPlus size={10} />
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-[320px] overflow-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-100 bg-slate-50/95 sticky top-0 z-10">
                                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-1/2">Category</th>
                                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right w-24">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {monthData.map((item) => (
                                                    <tr key={item.id} className="h-16 group hover:bg-slate-50/80 transition-colors">
                                                        <td className="px-6 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-white text-slate-700 rounded-lg flex items-center justify-center border border-slate-200 shadow-sm">
                                                                    {(() => {
                                                                        const Icon = getCategoryIcon(item.cost_category?.name);
                                                                        return <Icon size={14} />;
                                                                    })()}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-semibold text-slate-900 text-sm">{item.cost_category?.name || "Uncategorized"}</p>
                                                                    {item.cost_category?.description ? (
                                                                        <p className="text-[11px] text-slate-500 truncate">{item.cost_category.description}</p>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3 text-right">
                                                            <span className="font-bold text-slate-900 text-sm tabular-nums">
                                                                {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(item.cost))}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3 text-right">
                                                            <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => openEditCostModal(item)}
                                                                    className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white rounded-md transition-all border border-transparent hover:border-slate-200"
                                                                    aria-label={`Edit ${item.cost_category?.name || "cost entry"}`}
                                                                >
                                                                    <FaPen size={10} />
                                                                </button>
                                                                <button
                                                                    onClick={() => { setCostToDelete(item); setShowDeleteCostModal(true); }}
                                                                    className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all border border-transparent hover:border-rose-100"
                                                                    aria-label={`Delete ${item.cost_category?.name || "cost entry"}`}
                                                                >
                                                                    <FaTrash size={10} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Right: Sidebar - Cost Categories */}
                    <div className="lg:col-span-1 space-y-6">
                        <section className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
                            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50 rounded-t-xl flex items-center justify-between">
                                <h2 className="text-base font-bold text-slate-900">Cost Categories</h2>
                                <button
                                    onClick={() => { setSelectedCategory(null); setShowCategoryModal(true); }}
                                    className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
                                >
                                    + Add New
                                </button>
                            </div>
                            <div className="h-[320px] overflow-y-auto p-2 scrollbar-thin space-y-1">
                                {!Array.isArray(categories) || categories.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-center px-4">
                                        <p className="text-slate-400 text-xs italic">No categories defined.</p>
                                    </div>
                                ) : (
                                    categories.map(category => (
                                        <div key={category.id} className="group min-h-[60px] flex justify-between items-center px-3 py-2.5 rounded-lg border border-transparent hover:bg-slate-50 hover:border-slate-200 transition-all">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-1.5 w-1.5 rounded-full bg-slate-300 group-hover:bg-slate-700 transition-colors"></div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-700 text-xs group-hover:text-slate-900 transition-colors truncate">{category.name}</p>
                                                    {category.description ? (
                                                        <p className="text-[11px] text-slate-500 truncate">{category.description}</p>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={() => { setSelectedCategory(category); setShowCategoryModal(true); }}
                                                    className="h-6 w-6 flex items-center justify-center text-slate-400 hover:text-slate-900 rounded hover:bg-white border border-transparent hover:border-slate-100"
                                                >
                                                    <FaPen size={9} />
                                                </button>
                                                <button
                                                    onClick={() => { setCategoryToDelete(category); setShowDeleteModal(true); }}
                                                    className="h-6 w-6 flex items-center justify-center text-slate-400 hover:text-rose-600 rounded hover:bg-white border border-transparent hover:border-slate-100"
                                                >
                                                    <FaTrash size={9} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            {/* Modals */}
            {showCategoryModal && (
                <Suspense fallback={null}>
                    <CostCategoryModal
                        category={selectedCategory}
                        branchId={selectedBranch}
                        onClose={() => { setShowCategoryModal(false); setSelectedCategory(null); }}
                        onSaved={handleCategorySaved}
                    />
                </Suspense>
            )}

            <Suspense fallback={null}>
                <Modal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    title="Delete Category"
                    message={`Are you sure? This will not delete associated costs, but the category will be removed.`}
                    onConfirm={deleteCategory}
                    type="danger"
                    confirmText="Delete"
                />
            </Suspense>

            {/* Edit Cost Modal */}
            {showEditCostModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm mx-4 border border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit Cost</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Update the cost for <strong>{costToEdit?.cost_category?.name}</strong>
                        </p>
                        <input
                            type="number"
                            className="w-full rounded-xl px-4 py-3 mb-4 bg-white text-slate-900 font-semibold border border-slate-200 focus:ring-2 focus:ring-slate-200 outline-none"
                            value={editCostValue}
                            onChange={(e) => setEditCostValue(e.target.value)}
                            min="0"
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => { setShowEditCostModal(false); setCostToEdit(null); }}
                                className="px-4 py-2 text-slate-600 font-medium rounded-lg hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateCost}
                                className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Cost Modal */}
            <Suspense fallback={null}>
                <Modal
                    isOpen={showDeleteCostModal}
                    onClose={() => setShowDeleteCostModal(false)}
                    title="Delete Cost Entry"
                    message={`Are you sure you want to delete this cost entry for ${costToDelete?.cost_category?.name}?`}
                    onConfirm={handleDeleteCost}
                    type="danger"
                    confirmText="Delete"
                />
            </Suspense>
        </div>
    );
}
