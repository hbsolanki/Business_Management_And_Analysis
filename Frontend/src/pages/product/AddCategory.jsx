import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { productService } from "@/features/product/services/productService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import BackButton from "@/components/shared/BackButton";
import { FaTags } from "react-icons/fa";
import toast from "react-hot-toast";

export default function AddCategory({ isEmbed = false, initialData = null, onComplete = null }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        name: initialData?.name || "",
        description: initialData?.description || "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name.trim() || !formData.description.trim()) {
            setErrors({
                name: !formData.name.trim() ? ["This field may not be blank."] : null,
                description: !formData.description.trim() ? ["This field may not be blank."] : null,
            });
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            const res = await productService.createCategory(formData);
            toast.success("Category created successfully");
            if (isEmbed && onComplete) {
                onComplete(res.data);
            } else {
                navigate("/product");
            }
        } catch (err) {
            if (err.response?.data) {
                setErrors(err.response.data);
                const errorMsg = err.response.data.detail ||
                    err.response.data.non_field_errors?.[0] ||
                    "Failed to create category";
                toast.error(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    const labelClass = "flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1";
    const inputClass = (name) =>
        `w-full rounded-xl border px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all ${errors[name]
            ? "border-rose-400 bg-rose-50"
            : "border-slate-200 bg-white focus:border-slate-800"
        }`;

    const formContent = (
        <div className={`bg-white ${isEmbed ? "" : "rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50"} overflow-hidden`}>
            {!isEmbed && (
                <div className="p-8 sm:p-10 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-200">
                            <FaTags className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">Create Category</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Organize products for cataloging</p>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className={`${isEmbed ? "p-5" : "p-8 sm:p-10"} space-y-6`}>
                <div>
                    <label className={labelClass}>Category Name</label>
                    <input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. Electronics, Raw Materials"
                        className={inputClass("name")}
                        required
                    />
                    {errors.name && <p className="text-rose-500 text-[8px] font-bold mt-1 ml-1 uppercase">{errors.name[0]}</p>}
                </div>

                <div>
                    <label className={labelClass}>Description (Max 40 chars)</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        maxLength={40}
                        placeholder="Brief summary of category contents"
                        rows={3}
                        className={`${inputClass("description")} resize-none`}
                        required
                    />
                    <p className="text-[10px] text-slate-400 font-bold mt-1.5 ml-1">{formData.description.length}/40</p>
                    {errors.description && <p className="text-rose-500 text-[8px] font-bold mt-1 ml-1 uppercase">{errors.description[0]}</p>}
                </div>

                <div className="pt-6 border-t border-slate-50">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-slate-800 text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                        {loading ? "Creating..." : "Save Category"}
                    </button>
                    {!isEmbed && (
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="w-full mt-3 py-2 text-slate-400 font-black text-[9px] uppercase tracking-widest hover:text-slate-800 transition-all"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>
        </div>
    );

    if (isEmbed) return formContent;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <ProtectedHeader />
            <main className="max-w-xl mx-auto px-4 pt-6">
                <div className="mb-4 flex items-center justify-between">
                    <BackButton />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">Product Catalog</p>
                </div>
                {formContent}
            </main>
        </div>
    );
}
