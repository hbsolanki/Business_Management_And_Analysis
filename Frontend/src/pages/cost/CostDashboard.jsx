
import { useState, useEffect, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { FaLayerGroup, FaPlus, FaMoneyBillWave, FaCalendarAlt, FaTrash, FaPen } from "react-icons/fa";
import toast from "react-hot-toast";

import costService from "@/features/cost/services/costService";
import costCategoryService from "@/features/costCategory/services/costCategoryService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";

const CostCategoryModal = lazy(() => import("@/features/costCategory/components/CostCategoryModal"));
const Modal = lazy(() => import("@/components/ui/Modal"));

export default function CostDashboard() {
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [monthData, setMonthData] = useState(null);

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

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [empRes, monthRes] = await Promise.all([
                costCategoryService.getAll(),
                costService.getMonthlyCosts().catch(() => ({ data: [] })),
            ]);

            setCategories(empRes.data);
            setMonthData(Array.isArray(monthRes.data) ? monthRes.data : []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load cost data");
        } finally {
            setLoading(false);
        }
    };

    /* ---------- CATEGORY HANDLERS ---------- */
    const handleCategorySaved = (saved) => {
        if (selectedCategory) {
            setCategories((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
        } else {
            setCategories((prev) => [...prev, saved]);
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

    // Current Month Display
    const currentMonth = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

    // Calculate total cost
    const totalMonthlyCost = Array.isArray(monthData)
        ? monthData.reduce((sum, item) => sum + Number(item.cost || 0), 0)
        : 0;
    const totalMonthlyCostFormatted = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(totalMonthlyCost);

    const totalCategories = categories.length;
    const recordedCount = Array.isArray(monthData) ? monthData.length : 0;
    const remainingCount = Math.max(totalCategories - recordedCount, 0);
    const coveragePercent = totalCategories > 0 ? Math.round((recordedCount / totalCategories) * 100) : 0;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20 bg-transparent">
            <ProtectedHeader />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

                {/* Header */}
                <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-8 py-7 bg-slate-50 border-b border-slate-200">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    <span className="h-2 w-2 rounded-full bg-slate-500"></span>
                                    Cost management
                                </div>
                                <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mt-3">Cost Dashboard</h1>
                                <p className="text-slate-500 mt-1 flex items-center gap-2">
                                    <FaCalendarAlt /> {currentMonth} overview and category tracking.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Link
                                    to="/cost-category/month"
                                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all"
                                >
                                    <FaPlus size={12} /> Record expenses
                                </Link>
                                <button
                                    onClick={() => { setSelectedCategory(null); setShowCategoryModal(true); }}
                                    className="inline-flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                                >
                                    <FaLayerGroup size={14} /> New category
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-2xl p-4 border border-slate-200">
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                        <FaMoneyBillWave />
                                    </span>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total monthly cost</p>
                                        <p className="text-2xl font-semibold text-slate-900">{totalMonthlyCostFormatted}</p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">All recorded costs for {currentMonth}.</p>
                            </div>
                            <div className="bg-white rounded-2xl p-4 border border-slate-200">
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 border border-sky-100">
                                        <FaLayerGroup />
                                    </span>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Category coverage</p>
                                        <p className="text-2xl font-semibold text-slate-900">{recordedCount}/{totalCategories}</p>
                                    </div>
                                </div>
                                <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                    <div className="h-full bg-slate-900" style={{ width: `${coveragePercent}%` }}></div>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">{coveragePercent}% of categories recorded</p>
                            </div>
                            <div className="bg-white rounded-2xl p-4 border border-slate-200">
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
                                        <FaCalendarAlt />
                                    </span>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Remaining categories</p>
                                        <p className="text-2xl font-semibold text-slate-900">{remainingCount}</p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">Add entries to keep totals accurate.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Monthly Breakdown (Main Content) */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap justify-between items-center gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">Monthly entries</h2>
                                    <p className="text-xs text-slate-500 mt-1">Manage recorded costs for {currentMonth}.</p>
                                </div>
                                <Link
                                    to="/cost-category/month"
                                    className="flex items-center gap-2 text-slate-700 font-semibold text-sm hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    <FaPlus size={12} /> Add entries
                                </Link>
                            </div>
                            <div className="p-6 space-y-3">
                                {(!monthData || monthData.length === 0) ? (
                                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200">
                                        <FaMoneyBillWave className="mx-auto text-slate-300 text-4xl mb-4" />
                                        <p className="text-slate-600 font-medium">No expenses recorded yet.</p>
                                        <p className="text-slate-400 text-sm mt-1">Add entries to keep your monthly total accurate.</p>
                                        <Link to="/cost-category/month" className="text-slate-700 font-semibold text-sm hover:underline mt-3 inline-block">
                                            Record your first expense →
                                        </Link>
                                    </div>
                                ) : (
                                    <>
                                        {monthData.map((item) => (
                                            <div key={item.id} className="group flex flex-wrap justify-between items-center gap-4 px-5 py-4 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-11 h-11 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center">
                                                        <FaLayerGroup size={16} />
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-slate-800 block">{item.cost_category?.name || "Unknown"}</span>
                                                        <span className="text-xs text-slate-400">Recorded for {currentMonth}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="font-semibold text-slate-900 text-lg">
                                                        {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(item.cost))}
                                                    </span>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => openEditCostModal(item)}
                                                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                                                        >
                                                            <FaPen size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setCostToDelete(item); setShowDeleteCostModal(true); }}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                        >
                                                            <FaTrash size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="pt-4 mt-4 border-t border-slate-200 flex justify-between items-center px-2">
                                            <span className="font-semibold text-slate-700">Total</span>
                                            <span className="font-semibold text-xl text-slate-900">
                                                {totalMonthlyCostFormatted}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Sidebar - Cost Categories */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap justify-between items-center gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">Categories</h2>
                                    <p className="text-xs text-slate-500 mt-1">{totalCategories} active categories</p>
                                </div>
                                <button
                                    onClick={() => { setSelectedCategory(null); setShowCategoryModal(true); }}
                                    className="flex items-center gap-2 text-slate-700 font-semibold text-sm hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    <FaPlus size={12} /> New
                                </button>
                            </div>
                            <div className="p-4 space-y-2">
                                {categories.length === 0 ? (
                                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200">
                                        <FaLayerGroup className="mx-auto text-slate-300 text-3xl mb-3" />
                                        <p className="text-slate-500 text-sm">No categories yet.</p>
                                    </div>
                                ) : (
                                    categories.map(category => (
                                        <div key={category.id} className="group flex justify-between items-center px-4 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-all">
                                            <span className="font-medium text-slate-700 text-sm">{category.name}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => { setSelectedCategory(category); setShowCategoryModal(true); }}
                                                    className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded"
                                                >
                                                    <FaPen size={10} />
                                                </button>
                                                <button
                                                    onClick={() => { setCategoryToDelete(category); setShowDeleteModal(true); }}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                >
                                                    <FaTrash size={10} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                            <p className="text-sm font-semibold text-slate-700">Category hygiene</p>
                            <p className="text-xs text-slate-500 mt-2">Keep categories focused and non-overlapping to simplify monthly analysis.</p>
                            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 border border-slate-200">
                                <span className="text-xs font-semibold text-slate-700">Remaining this month</span>
                                <span className="text-sm font-semibold text-slate-900">{remainingCount}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Modals */}
            {showCategoryModal && (
                <Suspense fallback={null}>
                    <CostCategoryModal
                        category={selectedCategory}
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
