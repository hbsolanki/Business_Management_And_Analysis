import { useState, useEffect, lazy, Suspense } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
    FaLayerGroup, FaPlus, FaMoneyBillWave, FaFileInvoiceDollar,
    FaRegCalendarAlt,
    FaChartPie,
    FaPen,
    FaTrash,
    FaFilter,
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
    FaCaretDown,
    FaPercent,
    FaCheckCircle,
    FaInfoCircle
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
    const [monthData, setMonthData] = useState([]); 

    // Category Management State
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);

    // Monthly Cost Entry Management State
    const [costToEdit, setCostToEdit] = useState(null);
    const [editCostValue, setEditCostValue] = useState("");
    const [editGstRateValue, setEditGstRateValue] = useState("");
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
    }, [profile]);

    const fetchBranches = async () => {
        try {
            setFetchingBranches(true);
            const res = await branchService.list();
            const branchList = res.data?.results || res.data || [];
            setBranches(branchList);
            if (!selectedBranch) {
                const main = branchList.find(b => b.is_default) || branchList[0];
                if (main) setSelectedBranch(String(main.id));
                else {
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
    }, [branchContextReady, selectedBranch]);

    const fetchMonthlyData = async (branchId, month, year) => {
        try {
            if (!hasLoadedOnce) setLoading(true);
            else setIsRefreshing(true);
            const monthRes = await costService.getMonthlyCosts(branchId, month, year).catch(() => ({ data: { results: [] } }));
            const fetchedMonthlyData = monthRes.data?.results || (Array.isArray(monthRes.data) ? monthRes.data : []);
            setMonthData(fetchedMonthlyData);
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

    const handleCategorySaved = (savedCategory) => {
        if (savedCategory?.id) {
            setCategories((prev) => {
                const exists = prev.some((item) => item.id === savedCategory.id);
                if (exists) return prev.map((item) => (item.id === savedCategory.id ? savedCategory : item));
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

    const openEditCostModal = (item) => {
        setCostToEdit(item);
        setEditCostValue(item.cost);
        setEditGstRateValue(item.gst_rate);
        setShowEditCostModal(true);
    };

    const handleUpdateCost = async () => {
        if (!costToEdit) return;
        try {
            const payload = { 
                cost: Number(editCostValue),
                gst_rate: Number(editGstRateValue)
            };
            const res = await costService.updateCost(costToEdit.id, payload);
            const updatedItem = res.data;
            setMonthData((prev) => prev.map((c) => c.id === costToEdit.id ? updatedItem : c));
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

    const displayedPeriod = `${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`;
    const totalMonthlyCost = Array.isArray(monthData) ? monthData.reduce((sum, item) => sum + Number(item.cost || 0), 0) : 0;
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

    const editGstPrice = (Number(editCostValue || 0) * (Number(editGstRateValue || 0) / 100)).toFixed(2);

    return (
        <div className="min-h-screen pb-20 bg-slate-50">
            <ProtectedHeader />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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
                                    to="/cost/expenses/add"
                                    className="group inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-900 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm transition-all"
                                >
                                    <FaPlus size={12} className="group-hover:rotate-90 transition-transform text-slate-400 group-hover:text-slate-900" />
                                    Add Expense
                                </Link>

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
                                                                    <p className="font-semibold text-slate-900 text-sm">{item.cost_category?.display_name || item.cost_category?.name || "Uncategorized"}</p>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        {Number(item.gst_amount) > 0 && (
                                                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                                                                                GST ({item.gst_rate}%): ₹{Number(item.gst_amount).toFixed(2)}
                                                                            </span>
                                                                        )}
                                                                        {item.cost_category?.description ? (
                                                                            <p className="text-[11px] text-slate-500 truncate">{item.cost_category.description}</p>
                                                                        ) : null}
                                                                    </div>
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

                    <div className="lg:col-span-1 space-y-6">
                        <section className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
                            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 rounded-t-xl flex items-center justify-between">
                                <h2 className="text-sm font-bold text-slate-900">Cost Categories</h2>
                                <button
                                    onClick={() => { setSelectedCategory(null); setShowCategoryModal(true); }}
                                    className="text-[9px] font-bold uppercase tracking-widest text-slate-600 bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200 shadow-sm"
                                >
                                    + New
                                </button>
                            </div>
                            <div className="h-[340px] overflow-y-auto p-1.5 scrollbar-thin space-y-0.5">
                                {!Array.isArray(categories) || categories.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-center px-4">
                                        <p className="text-slate-400 text-[10px] italic">No categories defined.</p>
                                    </div>
                                ) : (
                                    categories.map(category => (
                                        <div key={category.id} className="group min-h-[48px] flex justify-between items-center px-3 py-2 rounded-lg border border-transparent hover:bg-slate-50 hover:border-slate-100 transition-all">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="h-1.5 w-1.5 rounded-full bg-slate-200 group-hover:bg-slate-900 transition-colors"></div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-700 text-[11px] group-hover:text-slate-900 transition-colors truncate">{category.display_name || category.name}</p>
                                                    {category.description ? (
                                                        <p className="text-[10px] text-slate-400 group-hover:text-slate-500 transition-colors truncate">{category.description}</p>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={() => { setSelectedCategory(category); setShowCategoryModal(true); }}
                                                    className="h-6 w-6 flex items-center justify-center text-slate-400 hover:text-slate-900 rounded bg-white border border-slate-100 shadow-sm"
                                                >
                                                    <FaPen size={8} />
                                                </button>
                                                <button
                                                    onClick={() => { setCategoryToDelete(category); setShowDeleteModal(true); }}
                                                    className="h-6 w-6 flex items-center justify-center text-slate-400 hover:text-rose-600 rounded bg-white border border-slate-100 shadow-sm"
                                                >
                                                    <FaTrash size={8} />
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

            {showEditCostModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-200 animate-in fade-in zoom-in duration-200 relative">
                        <button 
                            onClick={() => setShowEditCostModal(false)} 
                            className="absolute top-5 right-5 p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:rotate-90"
                        >
                            <FaPlus className="rotate-45" size={12} />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-md">
                                <FaPen size={14} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Edit Transaction</h3>
                                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{costToEdit?.cost_category?.name}</p>
                            </div>
                        </div>
                        
                        <div className="space-y-4 mb-6">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="relative group">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Base Price</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                        <input
                                            type="number"
                                            className="w-full rounded-xl pl-8 pr-4 py-2.5 bg-slate-50 text-slate-900 font-bold text-sm border border-slate-100 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 outline-none transition-all"
                                            value={editCostValue}
                                            onChange={(e) => setEditCostValue(e.target.value)}
                                            min="0"
                                        />
                                    </div>
                                </div>
                                
                                <div className="relative group">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">GST Rate</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full rounded-xl px-4 py-2.5 bg-slate-50 text-slate-900 font-bold text-sm border border-slate-100 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 outline-none transition-all"
                                            value={editGstRateValue}
                                            onChange={(e) => setEditGstRateValue(e.target.value)}
                                            min="0"
                                        />
                                        <FaPercent className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Calculated Tax</label>
                                    <div className="h-12 flex items-center px-4 bg-slate-900 rounded-xl shadow-lg shadow-slate-200 border border-slate-800">
                                        <span className="text-white/40 font-bold text-xs mr-2">₹</span>
                                        <span className="text-white font-bold text-base tabular-nums">{editGstPrice}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowEditCostModal(false); setCostToEdit(null); }}
                                className="flex-1 px-4 py-2.5 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateCost}
                                className="flex-[1.5] px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 text-[10px] uppercase tracking-widest active:scale-95"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
