import { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { FaPercent, FaLayerGroup, FaPlus } from "react-icons/fa";
import costCategoryService from "../services/costCategoryService";

export default function CostCategoryModal({ category, branchId, onClose, onSaved }) {
    const [form, setForm] = useState({ name: "", description: "", gst_rate: "0.00" });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (category) {
            setForm({
                name: category.name,
                description: category.description || "",
                gst_rate: category.gst_rate || "0.00",
            });
        }
    }, [category]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: null });
        }
    };

    const handleSave = async () => {
        if (!form.name.trim()) return;

        setLoading(true);
        setErrors({});
        try {
            const payload = { ...form };
            if (!category && branchId) {
                payload.branch_id = Number(branchId);
            }

            const res = category
                ? await costCategoryService.update(category.id, form)
                : await costCategoryService.create(payload);

            onSaved(res.data);
            toast.success(`Category ${category ? "updated" : "added"} successfully`);
        } catch (e) {
            console.error(e);
            if (e.response && e.response.data) {
                setErrors(e.response.data);
            } else {
                toast.error("An error occurred");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
    <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-[340px] rounded-2xl p-5 relative shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-1.5 hover:bg-slate-50 rounded-lg transition-all text-slate-300 hover:text-slate-900"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-900">
            {category ? <FaLayerGroup size={14} /> : <FaPlus size={12} />}
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight leading-tight">
              {category ? "Modify Category" : "Create Category"}
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Expense Classification</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Category Label</label>
            <input
              name="name"
              placeholder="e.g. Infrastructure, Marketing"
              value={form.name}
              onChange={handleChange}
              className={`w-full bg-slate-50/50 border rounded-xl px-3.5 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all ${errors.name ? "border-red-500" : "border-slate-100"}`}
            />
            {errors.name && (
              <p className="text-red-500 text-[9px] font-bold mt-1 ml-1 uppercase tracking-tighter">{errors.name[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tax Percentage (%)</label>
            <div className="relative group">
              <input
                type="number"
                step="0.01"
                name="gst_rate"
                placeholder="0.00"
                value={form.gst_rate}
                onChange={handleChange}
                className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all tabular-nums"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <FaPercent size={10} className="text-slate-300 group-focus-within:text-slate-900 transition-colors" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Brief Description</label>
            <textarea
              name="description"
              placeholder="Optional categorization details..."
              value={form.description}
              onChange={handleChange}
              rows={2}
              className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all resize-none placeholder:text-slate-300"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !form.name.trim()}
              className="flex-[1.5] bg-slate-900 text-white py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
            >
              {loading ? "Syncing..." : category ? "Update Changes" : "Confirm Entry"}
            </button>
          </div>
        </div>
      </div>
    </div>
    );
}
