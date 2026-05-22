import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { 
    FaCalendarAlt, 
    FaBuilding, 
    FaLayerGroup, 
    FaMoneyBillWave, 
    FaCheck, 
    FaSpinner,
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
    FaPercent,
    FaCheckCircle
} from "react-icons/fa";
import api from "@/services/api";

export default function MonthlyCostCategoryForm({ id, onSaved, isEmbed = false, initialBranchId, initialMonth, initialYear }) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [branches, setBranches] = useState([]);
    const [categories, setCategories] = useState([]);
    const [costs, setCosts] = useState({});
    
    const [formData, setFormData] = useState({
        branch_id: initialBranchId || "",
        month: initialMonth || (new Date().getMonth() + 1),
        year: initialYear || new Date().getFullYear(),
    });

    const months = [
        { value: 1, label: "January" }, { value: 2, label: "February" },
        { value: 3, label: "March" }, { value: 4, label: "April" },
        { value: 5, label: "May" }, { value: 6, label: "June" },
        { value: 7, label: "July" }, { value: 8, label: "August" },
        { value: 9, label: "September" }, { value: 10, label: "October" },
        { value: 11, label: "November" }, { value: 12, label: "December" }
    ];

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    const years = Array.from({ length: 3 }, (_, i) => currentYear - 2 + i);

    const availableMonths = months.filter(m => {
        if (formData.year < currentYear) return true;
        if (formData.year === currentYear) return m.value <= currentMonth;
        return false;
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (formData.branch_id) {
            fetchPendingCategories();
        }
    }, [formData.branch_id, formData.month, formData.year]);

    const fetchInitialData = async () => {
        try {
            const res = await api.get("/business/branch/");
            const branchList = res.data.results || res.data;
            setBranches(branchList);
            
            // Auto-select first branch if available
            if (branchList.length > 0 && !formData.branch_id) {
                setFormData(prev => ({ ...prev, branch_id: branchList[0].id }));
            }
        } catch (e) {
            console.error("Failed to fetch branches:", e);
        }
    };

    const fetchPendingCategories = async () => {
        setLoading(true);
        try {
            const [catRes, recordedRes] = await Promise.all([
                api.get(`/cost/category/?branch=${formData.branch_id}`),
                api.get(`/cost/category/month/?branch=${formData.branch_id}&month=${formData.month}&year=${formData.year}`)
            ]);

            const allCats = catRes.data.results || catRes.data;
            const recorded = recordedRes.data.results || recordedRes.data;
            const recordedIds = new Set(recorded.map(r => r.cost_category.id));
            
            const pending = allCats.filter(c => !recordedIds.has(c.id));
            setCategories(pending);

            const initialCosts = {};
            pending.forEach(c => {
                initialCosts[c.id] = { amount: "", gst_rate: c.gst_rate || "0.00" };
            });
            setCosts(initialCosts);
        } catch (e) {
            console.error("Failed to fetch categories:", e);
            toast.error("Error loading categories");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (catId, field, value) => {
        setCosts(prev => ({
            ...prev,
            [catId]: { ...prev[catId], [field]: value }
        }));
    };

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const items = Object.entries(costs)
            .map(([id, data]) => ({
                cost_category_id: parseInt(id),
                cost: parseFloat(data.amount || 0),
                gst_rate: parseFloat(data.gst_rate || 0)
            }))
            .filter(item => item.cost > 0);

        if (items.length === 0) {
            toast.error("Please enter at least one cost amount");
            return;
        }

        setSubmitting(true);
        try {
            await api.post("/cost/category/month/", {
                branch_id: formData.branch_id,
                month: formData.month,
                year: formData.year,
                cost_category_items: items
            });

            toast.success("Monthly costs recorded successfully");
            if (onSaved) onSaved({ success: true });
        } catch (error) {
            console.error("Save failed:", error);
            toast.error(error.response?.data?.detail || "Failed to record costs");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header Sticky Area */}
            <div className="bg-white border-b border-slate-100 p-6 space-y-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg text-white">
                        <FaMoneyBillWave size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Record Monthly Costs</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Operational Expense Batch</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {/* Branch Selection */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            <FaBuilding size={8} /> Branch
                        </label>
                        <select
                            value={formData.branch_id}
                            onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-slate-900/5 outline-none appearance-none"
                        >
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Period Selection */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                <FaCalendarAlt size={8} /> Month
                            </label>
                            <select
                                value={formData.month}
                                onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-slate-900/5 outline-none appearance-none"
                            >
                                {availableMonths.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                Year
                            </label>
                            <select
                                value={formData.year}
                                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value), month: Math.min(formData.month, formData.year === currentYear ? currentMonth : 12) })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-slate-900/5 outline-none appearance-none"
                            >
                                {years.filter(y => y <= currentYear).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable List Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <FaSpinner className="animate-spin text-slate-900" size={32} />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Categories...</p>
                    </div>
                ) : categories.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100 px-8">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaCheckCircle className="text-emerald-500" size={32} />
                        </div>
                        <h3 className="text-slate-900 font-black text-lg tracking-tight">Everything Logged!</h3>
                        <p className="text-slate-500 text-xs font-medium mt-2 leading-relaxed">
                            No pending cost categories found for this branch and period.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {categories.map((cat) => {
                            const Icon = getCategoryIcon(cat.name);
                            const amount = parseFloat(costs[cat.id]?.amount || 0);
                            const rate = parseFloat(costs[cat.id]?.gst_rate || 0);
                            const gst = (amount * (rate / 100)).toFixed(2);

                            return (
                                <div key={cat.id} className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all group">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-slate-900 transition-colors">
                                            <Icon size={16} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 tracking-tight leading-none">{cat.name}</h4>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Default GST: {cat.gst_rate}%</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1.5 block ml-1">Base Amount</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs">₹</span>
                                                <input
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={costs[cat.id]?.amount || ""}
                                                    onChange={(e) => handleInputChange(cat.id, "amount", e.target.value)}
                                                    className="w-full pl-7 pr-3 py-2.5 bg-slate-50/50 rounded-xl text-sm font-black text-slate-900 outline-none border border-transparent focus:border-slate-200 focus:bg-white transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1.5 block ml-1">GST Rate</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={costs[cat.id]?.gst_rate || ""}
                                                    onChange={(e) => handleInputChange(cat.id, "gst_rate", e.target.value)}
                                                    className="w-full px-3 py-2.5 bg-slate-50/50 rounded-xl text-sm font-black text-slate-900 outline-none border border-transparent focus:border-slate-200 focus:bg-white transition-all"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300"><FaPercent size={8} /></span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1.5 block ml-1">Calculated Tax</label>
                                            <div className="w-full px-4 py-2.5 bg-slate-900 rounded-xl text-sm font-black text-white flex items-center shadow-lg shadow-slate-900/10 border border-slate-800">
                                                <span className="text-white/40 mr-1.5">₹</span>
                                                {gst}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        <div className="pt-6 shrink-0">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-slate-900 text-white py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {submitting ? (
                                    <>
                                        <FaSpinner className="animate-spin" />
                                        <span>Syncing Data...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaCheck />
                                        <span>Save Transactions</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
