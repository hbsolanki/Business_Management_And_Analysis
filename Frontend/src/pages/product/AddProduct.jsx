import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { productService } from "@/features/product/services/productService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import BackButton from "@/components/shared/BackButton";
import { HiOutlineTag } from "react-icons/hi2";
import { FaInfoCircle } from "react-icons/fa";
import toast from "react-hot-toast";
import CategoryModal from "@/features/product/components/Category/CategoryModal";

const normalizeCategories = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
};

export default function AddProduct({ isEmbed = false, onComplete = null }) {
    const navigate = useNavigate();

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    const [formData, setFormData] = useState({
        name: "",
        sku: "",
        product_category: "",
        cost_price: "",
        base_price: "",
        input_gst_rate: "0.00",
        output_gst_rate: "0.00",
        description: "",
        low_stock_limit: "",
    });

    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            try {
                const catRes = await productService.getCategories();
                if (!isMounted) return;
                setCategories(normalizeCategories(catRes.data));
            } catch (err) {
                console.error("Failed to load AddProduct data", err);
            }
        };

        loadData();
        return () => { isMounted = false; };
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((p) => ({ ...p, [name]: value }));
        if (errors[name]) {
            setErrors((p) => ({ ...p, [name]: null }));
        }
    };

    const costPriceNum = Number(formData.cost_price) || 0;
    const basePriceNum = Number(formData.base_price) || 0;
    const inputRateNum = Number(formData.input_gst_rate) || 0;
    const outputRateNum = Number(formData.output_gst_rate) || 0;

    const inputGstAmount = (costPriceNum * inputRateNum) / 100;
    const outputGstAmount = (basePriceNum * outputRateNum) / 100;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        setFormError("");

        try {
            const response = await productService.create({
                ...formData,
                product_category: formData.product_category || null,
                low_stock_limit: formData.low_stock_limit ? parseInt(formData.low_stock_limit, 10) : 0,
            });
            toast.success("Product created successfully");
            if (isEmbed && onComplete) {
                onComplete(response);
            } else {
                navigate(-1);
            }
        } catch (err) {
            if (err.response?.status === 403) {
                const message = err.response?.data?.message || "No active subscription";
                setFormError(message);
                return;
            }
            if (err.response?.data) {
                setErrors(err.response.data);
                const errorMsg = err.response.data.detail ||
                    err.response.data.non_field_errors?.[0] ||
                    "Failed to add product";
                toast.error(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    const inputClass = (name) =>
        `w-full rounded-2xl border px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all ${errors[name]
            ? "border-rose-400 bg-rose-50"
            : "border-slate-200 bg-slate-50 focus:border-slate-900 focus:bg-white"
        }`;

    const labelClass = "flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1";

    const formContent = (
        <div className={`bg-white ${isEmbed ? "" : "rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50"} overflow-hidden`}>
            {!isEmbed && (
                <div className="p-8 sm:p-10 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-200">
                        <HiOutlineTag className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">Create Product</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Inventory & Tax Configuration</p>
                    </div>
                </div>
            )}
            
            {formError && (
                <div className="mx-8 mt-6 flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                    <FaInfoCircle className="text-amber-500 mt-0.5" size={14} />
                    <p className="text-xs font-bold text-amber-900">{formError}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className={`${isEmbed ? "p-5" : "p-8 sm:p-10"} space-y-8`}>
                {/* Section: Basic Information */}
                <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2.5">01. Identity & Classification</h3>
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className={labelClass}>Product Nomenclature</label>
                            <input
                                name="name" value={formData.name} onChange={handleChange} required
                                placeholder="e.g. Precision Audio Driver"
                                className={inputClass("name")}
                            />
                            {errors.name && <p className="text-rose-500 text-[8px] font-bold mt-1 ml-1 uppercase">{errors.name[0]}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>SKU / Model ID</label>
                                <input
                                    name="sku" value={formData.sku} onChange={handleChange} required
                                    placeholder="SKU-X100"
                                    className={inputClass("sku")}
                                />
                                {errors.sku && <p className="text-rose-500 text-[8px] font-bold mt-1 ml-1 uppercase">{errors.sku[0]}</p>}
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5 ml-1">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingCategory(null);
                                                setShowCategoryModal(true);
                                            }}
                                            className="text-[9px] font-black text-slate-600 hover:text-slate-900 uppercase tracking-widest transition-all"
                                        >
                                            + Add
                                        </button>
                                        {formData.product_category && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const selectedCat = categories.find(c => String(c.id) === String(formData.product_category));
                                                    if (selectedCat) {
                                                        setEditingCategory(selectedCat);
                                                        setShowCategoryModal(true);
                                                    }
                                                }}
                                                className="text-[9px] font-black text-slate-600 hover:text-slate-900 uppercase tracking-widest transition-all border-l border-slate-200 pl-3"
                                            >
                                                ✎ Edit
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <select
                                    name="product_category" value={formData.product_category} onChange={handleChange} required
                                    className={`${inputClass("product_category")} appearance-none cursor-pointer`}
                                >
                                    <option value="">Select</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                {errors.product_category && <p className="text-rose-500 text-[8px] font-bold mt-1 ml-1 uppercase">{errors.product_category[0]}</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Tax & Pricing Architecture */}
                <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2.5">02. Financial & Description</h3>
                    <div className="grid grid-cols-1 gap-4 p-5 rounded-3xl bg-slate-50/50 border border-slate-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Cost Basis (₹)</label>
                                <input
                                    type="number" name="cost_price" value={formData.cost_price} onChange={handleChange} required
                                    placeholder="0.00"
                                    className={inputClass("cost_price")}
                                />
                                {errors.cost_price && <p className="text-rose-500 text-[8px] font-bold mt-1 ml-1 uppercase">{errors.cost_price[0]}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Selling Point (₹)</label>
                                <input
                                    type="number" name="base_price" value={formData.base_price} onChange={handleChange} required
                                    placeholder="0.00"
                                    className={inputClass("base_price")}
                                />
                                {errors.base_price && <p className="text-rose-500 text-[8px] font-bold mt-1 ml-1 uppercase">{errors.base_price[0]}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Input GST %</label>
                                <input
                                    type="number" step="0.01" name="input_gst_rate" value={formData.input_gst_rate} onChange={handleChange} required
                                    className={inputClass("input_gst_rate")}
                                />
                                {errors.input_gst_rate && <p className="text-rose-500 text-[8px] font-bold mt-1 ml-1 uppercase">{errors.input_gst_rate[0]}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Output GST %</label>
                                <input
                                    type="number" step="0.01" name="output_gst_rate" value={formData.output_gst_rate} onChange={handleChange} required
                                    className={inputClass("output_gst_rate")}
                                />
                                {errors.output_gst_rate && <p className="text-rose-500 text-[8px] font-bold mt-1 ml-1 uppercase">{errors.output_gst_rate[0]}</p>}
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Low Stock Threshold</label>
                            <input
                                type="number" name="low_stock_limit" value={formData.low_stock_limit} onChange={handleChange}
                                placeholder="10"
                                className={inputClass("low_stock_limit")}
                            />
                            {errors.low_stock_limit && <p className="text-rose-500 text-[8px] font-bold mt-1 ml-1 uppercase">{errors.low_stock_limit[0]}</p>}
                        </div>

                        <div>
                            <label className={labelClass}>Description</label>
                            <textarea
                                name="description" value={formData.description} onChange={handleChange} required
                                rows={3} placeholder="Product specifications (required)..."
                                className={`${inputClass("description")} resize-none`}
                            />
                            {errors.description && <p className="text-rose-500 text-[8px] font-bold mt-1 ml-1 uppercase">{errors.description[0]}</p>}
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-50">
                    <button
                        type="submit" disabled={loading}
                        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                    >
                        {loading ? "Processing..." : "Finalize Catalog Entry"}
                    </button>
                    {!isEmbed && (
                        <button
                            type="button" onClick={() => navigate(-1)}
                            className="w-full mt-4 py-2 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-100 rounded-2xl transition-all"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            {showCategoryModal && (
                <CategoryModal
                    category={editingCategory}
                    onClose={() => setShowCategoryModal(false)}
                    onSaved={(newCat) => {
                        setCategories((prev) => {
                            if (editingCategory) {
                                return prev.map((c) => (c.id === newCat.id ? newCat : c));
                            }
                            return [newCat, ...prev];
                        });
                        setFormData((prev) => ({
                            ...prev,
                            product_category: newCat.id,
                        }));
                        setShowCategoryModal(false);
                    }}
                />
            )}
        </div>
    );

    if (isEmbed) return formContent;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <ProtectedHeader />
            <main className="max-w-4xl mx-auto px-4 pt-6">
                <div className="mb-4">
                    <BackButton />
                </div>
                {formContent}
            </main>
        </div>
    );
}
