import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaSave, FaLayerGroup } from "react-icons/fa";
import toast from "react-hot-toast";

import costService from "@/features/cost/services/costService";
import costCategoryService from "@/features/costCategory/services/costCategoryService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";

export default function AddCost() {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]); // Available categories (not yet recorded)
    const [costs, setCosts] = useState({}); // { [categoryId]: amount }
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [catRes, monthRes] = await Promise.all([
                    costCategoryService.getAll(),
                    costService.getMonthlyCosts().catch(() => ({ data: [] })),
                ]);

                const allCategories = catRes.data || [];
                const monthlyData = Array.isArray(monthRes.data) ? monthRes.data : [];

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
        fetchData();
    }, []);

    const handleInputChange = (categoryId, value) => {
        setCosts((prev) => ({
            ...prev,
            [categoryId]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Transform costs object to array
        const cost_category_items = Object.entries(costs)
            .map(([id, amount]) => ({
                cost_category: id,
                cost: Number(amount),
            }))
            .filter((item) => item.cost > 0); // Only send items with positive cost

        if (cost_category_items.length === 0) {
            toast.error("Please enter at least one cost");
            return;
        }

        setSubmitting(true);
        try {
            await costService.addCost({ cost_category_items });
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
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <ProtectedHeader />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <button
                    onClick={() => navigate("/cost-category")}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors"
                >
                    <FaArrowLeft /> Back to Dashboard
                </button>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50">
                        <h1 className="text-2xl font-bold text-gray-900">Record  Expenses</h1>
                        <p className="text-gray-500 mt-1">Enter amounts for the categories you want to record.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {categories.length === 0 ? (
                                <div className="col-span-full text-center py-10">
                                    <FaLayerGroup className="mx-auto text-gray-300 text-4xl mb-4" />
                                    <p className="text-gray-600 font-medium">All categories recorded!</p>
                                    <p className="text-gray-400 text-sm mt-1">You've already added costs for all categories this month.</p>
                                </div>
                            ) : (
                                categories.map((category) => (
                                    <div key={category.id} className="relative group">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <FaLayerGroup className="text-blue-400" />
                                            {category.name}
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="0"
                                                className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all font-medium text-gray-900"
                                                value={costs[category.id] || ""}
                                                onChange={(e) => handleInputChange(category.id, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-8 flex justify-end pt-6 border-t border-gray-100">
                            <button
                                type="submit"
                                disabled={submitting || categories.length === 0}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all transform active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {submitting ? "Saving..." : <><FaSave /> Save Entries</>}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
