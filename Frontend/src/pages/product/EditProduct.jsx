import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { productService } from "@/features/product/services/productService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import BackButton from "@/components/shared/BackButton";
import {
    TagIcon,
    ClipboardDocumentIcon,
    Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { FaPercent, FaInfoCircle, FaEdit, FaSync } from "react-icons/fa";
import toast from "react-hot-toast";

const normalizeCategories = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
};

export default function EditProduct() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        name: "",
        sku: "",
        cost_price: "",
        base_price: "",
        input_gst_rate: "0.00",
        output_gst_rate: "0.00",
        description: "",
        product_category: "",
        low_stock_limit: "",
    });

    useEffect(() => {
        async function fetchData() {
            try {
                const [productRes, categoryRes] = await Promise.all([
                    productService.getById(id),
                    productService.getCategories(),
                ]);

                const product = productRes.data;

                setFormData({
                    name: product.name || "",
                    sku: product.sku || "",
                    cost_price: product.cost_price || "",
                    base_price: product.base_price || "",
                    input_gst_rate: product.input_gst_rate || "0.00",
                    output_gst_rate: product.output_gst_rate || "0.00",
                    description: product.description || "",
                    product_category: product.product_category?.id || "",
                    low_stock_limit: product.low_stock_limit || "",
                });

                setCategories(normalizeCategories(categoryRes.data));
            } catch (err) {
                console.error(err);
                toast.error("Failed to load product data");
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: null }));
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
        setIsSubmitting(true);
        setErrors({});

        try {
            await productService.update(id, {
                ...formData,
                product_category: formData.product_category || null,
                low_stock_limit: formData.low_stock_limit ? parseInt(formData.low_stock_limit, 10) : 0,
            });
            toast.success("Product updated successfully");
            navigate(-1);
        } catch (err) {
            console.error(err);
            if (err.response?.data) {
                setErrors(err.response.data);
                const errorMsg = err.response.data.detail ||
                    err.response.data.non_field_errors?.[0] ||
                    "Failed to update product";
                toast.error(errorMsg);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClass = (name) =>
        `w-full rounded-2xl border px-4 py-3.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all ${errors[name]
            ? "border-rose-400 bg-rose-50"
            : "border-slate-100 bg-slate-50 focus:border-slate-900 focus:bg-white"
        }`;

    const labelClass = "flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1";

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                <FaSync className="animate-spin text-slate-900 text-3xl" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Synchronizing Catalog Data...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <ProtectedHeader />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-6">
                    <BackButton />
                </div>

                <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                    <div className="p-8 sm:p-10 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-200">
                                <FaEdit className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Edit Product Meta</h1>
                                <p className="text-sm font-medium text-slate-500">Updating SKU: {formData.sku}</p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 sm:p-10 space-y-10">
                        {/* Section: Basic Information */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] border-l-4 border-slate-900 pl-4">Basic Information</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className={labelClass}>Product Identity / Name</label>
                                    <input
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        className={inputClass("name")}
                                    />
                                    {errors.name && <p className="text-rose-600 text-[10px] font-bold mt-1.5 ml-1">{errors.name[0]}</p>}
                                </div>

                                <div>
                                    <label className={labelClass}>SKU / Catalog ID</label>
                                    <div className="relative group">
                                        <input
                                            name="sku"
                                            value={formData.sku}
                                            onChange={handleChange}
                                            required
                                            className={inputClass("sku")}
                                        />
                                        <ClipboardDocumentIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
                                    </div>
                                    {errors.sku && <p className="text-rose-600 text-[10px] font-bold mt-1.5 ml-1">{errors.sku[0]}</p>}
                                </div>

                                <div>
                                    <label className={labelClass}>Product Category</label>
                                    <div className="relative">
                                        <select
                                            name="product_category"
                                            value={formData.product_category}
                                            onChange={handleChange}
                                            required
                                            className={`${inputClass("product_category")} appearance-none cursor-pointer`}
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <Squares2X2Icon className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section: Tax & Pricing Architecture */}
                        <div className="space-y-6 pt-6 border-t border-slate-100">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] border-l-4 border-slate-900 pl-4">Financial Configuration</h3>

                            {/* Input GST Architecture */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                                <div className="sm:col-span-3 mb-2">
                                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                                        Procurement (Input Tax)
                                    </p>
                                </div>
                                <div>
                                    <label className={labelClass}>1. Cost Price</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                        <input
                                            type="number"
                                            name="cost_price"
                                            value={formData.cost_price}
                                            onChange={handleChange}
                                            required
                                            className="w-full rounded-2xl border border-slate-200 pl-8 pr-4 py-3.5 text-sm font-black text-slate-900 focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all tabular-nums shadow-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>2. Input GST %</label>
                                    <div className="relative group">
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="input_gst_rate"
                                            value={formData.input_gst_rate}
                                            onChange={handleChange}
                                            required
                                            className="w-full rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-black text-slate-900 focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all tabular-nums shadow-sm"
                                        />
                                        <FaPercent className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400" />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>3. Input GST Price</label>
                                    <div className="h-[52px] flex items-center px-5 bg-slate-900 rounded-2xl shadow-lg shadow-slate-900/10 border border-slate-800">
                                        <span className="text-white/40 font-bold text-sm mr-2">₹</span>
                                        <span className="text-white font-black text-base tabular-nums tracking-tight">{inputGstAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Output GST Architecture */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                                <div className="sm:col-span-3 mb-2">
                                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                        Sales (Output Tax)
                                    </p>
                                </div>
                                <div>
                                    <label className={labelClass}>1. Base Price</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                        <input
                                            type="number"
                                            name="base_price"
                                            value={formData.base_price}
                                            onChange={handleChange}
                                            required
                                            className="w-full rounded-2xl border border-slate-200 pl-8 pr-4 py-3.5 text-sm font-black text-slate-900 focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all tabular-nums shadow-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>2. Output GST %</label>
                                    <div className="relative group">
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="output_gst_rate"
                                            value={formData.output_gst_rate}
                                            onChange={handleChange}
                                            required
                                            className="w-full rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-black text-slate-900 focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all tabular-nums shadow-sm"
                                        />
                                        <FaPercent className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400" />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>3. Output GST Price</label>
                                    <div className="h-[52px] flex items-center px-5 bg-slate-900 rounded-2xl shadow-lg shadow-slate-900/10 border border-slate-800">
                                        <span className="text-white/40 font-bold text-sm mr-2">₹</span>
                                        <span className="text-white font-black text-base tabular-nums tracking-tight">{outputGstAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section: Inventory & Details */}
                        <div className="space-y-6 pt-6 border-t border-slate-100">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] border-l-4 border-slate-900 pl-4">Inventory & Logistics</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-1">
                                    <label className={labelClass}>Low Stock Threshold</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            name="low_stock_limit"
                                            value={formData.low_stock_limit}
                                            onChange={handleChange}
                                            className={inputClass("low_stock_limit")}
                                        />
                                        <FaInfoCircle className="absolute right-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className={labelClass}>Detailed Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        required
                                        rows={2}
                                        className={`${inputClass("description")} resize-none`}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Form Footer */}
                        <div className="pt-10 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-100">
                            <div className="flex items-center gap-3 text-slate-400">
                                <FaInfoCircle size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Audited configuration for tax compliance</span>
                            </div>
                            
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <button
                                    type="button"
                                    onClick={() => navigate(-1)}
                                    className="flex-1 sm:flex-none px-8 py-4 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-100 rounded-2xl transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] sm:flex-none min-w-[200px] bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 active:scale-95"
                                >
                                    {isSubmitting ? "Updating..." : "Commit Changes"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
