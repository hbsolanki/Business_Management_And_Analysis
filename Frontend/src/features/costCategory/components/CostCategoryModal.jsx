import { useState, useEffect } from "react";
import { HiOutlineXMark } from "react-icons/hi2";
import { toast } from "react-hot-toast";
import { FaPercent, FaLayerGroup, FaPlus, FaSpinner } from "react-icons/fa";
import costCategoryService from "../services/costCategoryService";
import api from "@/services/api";

export default function CostCategoryModal({ category, id, branchId, onClose, onSaved, isEmbed = false, initialData = null }) {
    const [form, setForm] = useState({ 
        name: initialData?.name || "", 
        description: initialData?.description || "", 
        gst_rate: initialData?.gst_rate || "0.00" 
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [errors, setErrors] = useState({});
    const [activeCategory, setActiveCategory] = useState(category);

    useEffect(() => {
        if (category) {
            setActiveCategory(category);
            setForm({
                name: category.name,
                description: category.description || "",
                gst_rate: category.gst_rate || "0.00",
            });
        } else if (id) {
            fetchCategory(id);
        }
    }, [category, id]);

    const fetchCategory = async (categoryId) => {
        setFetching(true);
        try {
            const res = await api.get(`/cost/category/${categoryId}/`);
            setActiveCategory(res.data);
            setForm({
                name: res.data.name,
                description: res.data.description || "",
                gst_rate: res.data.gst_rate || "0.00",
            });
        } catch (e) {
            console.error("Failed to fetch category:", e);
            toast.error("Failed to fetch cost category details");
        } finally {
            setFetching(false);
        }
    };

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
            if (!activeCategory && branchId) {
                payload.branch_id = Number(branchId);
            }

            const res = activeCategory
                ? await costCategoryService.update(activeCategory.id, form)
                : await costCategoryService.create(payload);

            if (onSaved) onSaved(res.data);
            toast.success(`Category ${activeCategory ? "updated" : "added"} successfully`);
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

    const innerContent = (
      <div className={`w-full ${isEmbed ? 'p-6' : 'bg-white max-w-[340px] rounded-2xl p-5 relative shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150'}`}>
        {!isEmbed && (
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-1.5 hover:bg-slate-50 rounded-lg transition-all text-slate-300 hover:text-slate-900"
          >
            <HiOutlineXMark className="h-4 w-4" />
          </button>
        )}

        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 ${isEmbed ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 border border-slate-100 text-slate-900'} rounded-xl flex items-center justify-center`}>
            {activeCategory ? <FaLayerGroup size={14} /> : <FaPlus size={12} />}
          </div>
          <div>
            <h3 className={`${isEmbed ? 'text-lg tracking-tight' : 'text-sm tracking-tight'} font-black text-slate-900 leading-tight`}>
              {activeCategory ? "Modify Category" : "Create Category"}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Expense Classification</p>
          </div>
        </div>

        {fetching ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
                <FaSpinner className="animate-spin text-slate-300" size={24} />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loading details...</p>
            </div>
        ) : (
          <div className={`${isEmbed ? 'space-y-5' : 'space-y-4'}`}>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Category Label</label>
              <input
                name="name"
                placeholder="e.g. Infrastructure, Marketing"
                value={form.name}
                onChange={handleChange}
                className={`w-full ${isEmbed ? 'bg-slate-50' : 'bg-slate-50/50'} border rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all ${errors.name ? "border-red-500" : "border-slate-100"}`}
              />
              {errors.name && (
                <p className="text-red-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-tighter">{errors.name[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tax Percentage (%)</label>
              <div className="relative group">
                <input
                  type="number"
                  step="0.01"
                  name="gst_rate"
                  placeholder="0.00"
                  value={form.gst_rate}
                  onChange={handleChange}
                  className={`w-full ${isEmbed ? 'bg-slate-50' : 'bg-slate-50/50'} border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all tabular-nums`}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <FaPercent size={12} className="text-slate-300 group-focus-within:text-slate-900 transition-colors" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Brief Description</label>
              <textarea
                name="description"
                placeholder="Optional categorization details..."
                value={form.description}
                onChange={handleChange}
                rows={3}
                className={`w-full ${isEmbed ? 'bg-slate-50' : 'bg-slate-50/50'} border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all resize-none placeholder:text-slate-300`}
              />
            </div>

            <div className={`flex gap-3 pt-4 ${isEmbed ? 'border-t border-slate-100 mt-6' : ''}`}>
              {!isEmbed && (
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={loading || !form.name.trim()}
                className="flex-[1.5] w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
              >
                {loading ? "Syncing..." : activeCategory ? "Update Changes" : "Confirm Entry"}
              </button>
            </div>
          </div>
        )}
      </div>
    );

    if (isEmbed) {
        return innerContent;
    }

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-[2px] flex items-center justify-center p-4">
        {innerContent}
      </div>
    );
}
