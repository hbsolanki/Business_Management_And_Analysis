
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
    const currentMonth = new Date().toLocaleString("default", { month: "long", year: "numeric" });

    // Calculate total cost
    const totalMonthlyCost = Array.isArray(monthData)
        ? monthData.reduce((sum, item) => sum + Number(item.cost || 0), 0)
        : 0;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <ProtectedHeader />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Cost Management</h1>
                        <p className="text-gray-500 mt-1 flex items-center gap-2">
                            <FaCalendarAlt /> {currentMonth}
                        </p>
                    </div>
                    <div className="bg-white px-6 py-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                            <FaMoneyBillWave />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium uppercase">Total Monthly Cost</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(totalMonthlyCost)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Monthly Breakdown (Main Content) */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-gray-900">Current Month Expenses</h2>
                                <Link
                                    to="/cost-category/month"
                                    className="flex items-center gap-1 text-blue-600 font-semibold text-sm hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    <FaPlus size={12} /> Add
                                </Link>
                            </div>
                            <div className="p-6">
                                {(!monthData || monthData.length === 0) ? (
                                    <div className="text-center py-10">
                                        <FaMoneyBillWave className="mx-auto text-gray-300 text-4xl mb-4" />
                                        <p className="text-gray-500">No expenses recorded this month.</p>
                                        <Link to="/cost-category/month" className="text-blue-600 font-medium text-sm hover:underline mt-2 inline-block">
                                            Record your first expense →
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {monthData.map((item) => (
                                            <div key={item.id} className="group flex justify-between items-center py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                                                        <FaLayerGroup size={16} />
                                                    </div>
                                                    <span className="font-medium text-gray-800">{item.cost_category?.name || "Unknown"}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="font-bold text-gray-900 text-lg">
                                                        {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(item.cost))}
                                                    </span>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => openEditCostModal(item)}
                                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                        >
                                                            <FaPen size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setCostToDelete(item); setShowDeleteCostModal(true); }}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                        >
                                                            <FaTrash size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="pt-4 mt-4 border-t border-gray-100 flex justify-between items-center px-4">
                                            <span className="font-bold text-gray-700">Total</span>
                                            <span className="font-bold text-xl text-blue-600">
                                                {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(totalMonthlyCost)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Sidebar - Cost Categories */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-gray-900">Categories</h2>
                                <button
                                    onClick={() => { setSelectedCategory(null); setShowCategoryModal(true); }}
                                    className="flex items-center gap-1 text-blue-600 font-semibold text-sm hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    <FaPlus size={12} /> New
                                </button>
                            </div>
                            <div className="p-4">
                                {categories.length === 0 ? (
                                    <div className="text-center py-8">
                                        <FaLayerGroup className="mx-auto text-gray-300 text-3xl mb-3" />
                                        <p className="text-gray-500 text-sm">No categories yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {categories.map(category => (
                                            <div key={category.id} className="group flex justify-between items-center px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                                                <span className="font-medium text-gray-700 text-sm">{category.name}</span>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => { setSelectedCategory(category); setShowCategoryModal(true); }}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                    >
                                                        <FaPen size={10} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setCategoryToDelete(category); setShowDeleteModal(true); }}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                    >
                                                        <FaTrash size={10} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
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
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Cost</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Update the cost for <strong>{costToEdit?.cost_category?.name}</strong>
                        </p>
                        <input
                            type="number"
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 focus:ring-2 focus:ring-blue-100 outline-none"
                            value={editCostValue}
                            onChange={(e) => setEditCostValue(e.target.value)}
                            min="0"
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => { setShowEditCostModal(false); setCostToEdit(null); }}
                                className="px-4 py-2 text-gray-600 font-medium rounded-lg hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateCost}
                                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
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
