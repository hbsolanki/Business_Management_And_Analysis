import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaSave,
    FaLayerGroup,
    FaBolt,
    FaWifi,
    FaTruck,
    FaBullhorn,
    FaTools,
    FaUserTie,
    FaShieldAlt,
    FaMoneyBillWave,
    FaUtensils,
    FaStore,
    FaCar,
    FaHome,
    FaBriefcase,
    FaFileInvoiceDollar
} from "react-icons/fa";
import toast from "react-hot-toast";

import costService from "@/features/cost/services/costService";
import costCategoryService from "@/features/costCategory/services/costCategoryService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import BackButton from "@/components/shared/BackButton";

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
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-transparent"></div>
            </div>
        );
    }

    const totalAmount = Object.values(costs).reduce((sum, value) => sum + (Number(value) || 0), 0);
    const filledCount = Object.values(costs).filter((value) => Number(value) > 0).length;
    const monthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
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

                <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                    <div className="px-8 py-7 border-b border-slate-200 bg-slate-50">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    <span className="h-2 w-2 rounded-full bg-slate-500"></span>
                                    Monthly entry
                                </div>
                                <h1 className="text-2xl font-semibold text-slate-900 mt-3">Record Expenses</h1>
                                <p className="text-slate-500 mt-1">Capture the remaining category costs for {monthLabel}.</p>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                <FaLayerGroup className="text-slate-400 text-lg" />
                                Keep entries clean and consistent.
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-2xl p-4 border border-slate-200">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Month</p>
                                <p className="text-lg font-semibold text-slate-900 mt-2">{monthLabel}</p>
                                <p className="text-xs text-slate-400 mt-1">Current entry window</p>
                            </div>
                            <div className="bg-white rounded-2xl p-4 border border-slate-200">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Categories</p>
                                <p className="text-lg font-semibold text-slate-900 mt-2">
                                    {filledCount}/{categories.length}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">Filled so far</p>
                            </div>
                            <div className="bg-white rounded-2xl p-4 border border-slate-200">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Entered</p>
                                <p className="text-lg font-semibold text-slate-900 mt-2">{totalFormatted}</p>
                                <p className="text-xs text-slate-400 mt-1">Across visible categories</p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {categories.length === 0 ? (
                                <div className="col-span-full text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
                                    <FaLayerGroup className="mx-auto text-slate-300 text-4xl mb-4" />
                                    <p className="text-slate-700 font-semibold">All categories recorded!</p>
                                    <p className="text-slate-400 text-sm mt-2">You have already added costs for every category this month.</p>
                                </div>
                            ) : (
                                categories.map((category) => (
                                    <div key={category.id} className="bg-white rounded-2xl p-5 border border-slate-200 hover:bg-slate-50 transition-all">
                                        <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                                                {(() => {
                                                    const Icon = getCategoryIcon(category.name);
                                                    return <Icon />;
                                                })()}
                                            </span>
                                            {category.name}
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">₹</span>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="0"
                                                className="w-full pl-12 pr-14 py-3 rounded-xl bg-white text-slate-900 font-semibold border border-slate-200 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
                                                value={costs[category.id] || ""}
                                                onChange={(e) => handleInputChange(category.id, e.target.value)}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">INR</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-3">Add the {category.name} expense for {monthLabel}.</p>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 items-center pt-6 border-t border-slate-200">
                            <div className="bg-white rounded-2xl p-5 border border-slate-200">
                                <p className="text-sm font-semibold text-slate-700">Quick tips</p>
                                <ul className="text-xs text-slate-500 mt-2 space-y-2">
                                    <li>Enter only verified costs; you can edit later from the cost dashboard.</li>
                                    <li>Use round numbers for recurring items to keep monthly comparisons clean.</li>
                                    <li>Totals update instantly as you type.</li>
                                </ul>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 justify-end">
                                <button
                                    type="submit"
                                    disabled={submitting || categories.length === 0}
                                    className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-8 py-3.5 rounded-xl shadow-sm transition-all active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {submitting ? "Saving..." : <><FaSave /> Save Entries</>}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
