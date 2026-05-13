import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { productService } from "@/features/product/services/productService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import BackButton from "@/components/shared/BackButton";
import {
    TagIcon,
    ClipboardDocumentIcon,
    Squares2X2Icon,
    CurrencyRupeeIcon,
    DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { FaPercent, FaInfoCircle } from "react-icons/fa";
import toast from "react-hot-toast";

const normalizeCategories = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
};

export default function AddProduct() {
    const navigate = useNavigate();

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState("");

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
            await productService.create({
                ...formData,
                product_category: formData.product_category,
                low_stock_limit: formData.low_stock_limit ? parseInt(formData.low_stock_limit, 10) : 0,
            });
            toast.success("Product created successfully");
            navigate(-1);
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
        `w-full rounded-2xl border px-4 py-3.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all ${errors[name]
            ? "border-rose-400 bg-rose-50"
            : "border-slate-100 bg-slate-50 focus:border-slate-900 focus:bg-white"
        }`;

    const labelClass = "flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1";

    return (
        <div className="min-h-screen bg-slate-50/30 pb-12">
            <ProtectedHeader />

            <main className="max-w-4xl mx-auto px-4 pt-6">
                <div className="mb-4 flex items-center justify-between">
                    <BackButton />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">Product Catalog</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white shadow-md">
                            <TagIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-slate-900 tracking-tight leading-tight">Create Catalog Entry</h1>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Inventory & Tax Configuration</p>
                        </div>
                    </div>
                    
                    {formError && (
                        <div className="mx-5 mt-4 flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                            <FaInfoCircle className="text-amber-500 mt-0.5" size={12} />
                            <p className="text-[11px] font-bold text-amber-900">{formError}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="p-5 space-y-8">
                        {/* Section: Basic Information */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-2">01. Identity & Classification</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className={labelClass}>Product Nomenclature</label>
                                    <input
                                        name="name" value={formData.name} onChange={handleChange} required
                                        placeholder="e.g. Precision Audio Driver"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 px-3.5 text-sm font-bold text-slate-900 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all"
                                    />
                                    {errors.name && <p className="text-rose-500 text-[8px] font-bold mt-1 ml-1 uppercase">{errors.name[0]}</p>}
                                </div>

                                <div className="space-y-1">
                                    <label className={labelClass}>SKU / Model ID</label>
                                    <div className="relative group">
                                        <ClipboardDocumentIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 group-focus-within:text-slate-800 transition-colors" />
                                        <input
                                            name="sku" value={formData.sku} onChange={handleChange} required
                                            placeholder="SKU-X100"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 pl-9 pr-3.5 text-sm font-bold text-slate-900 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all"
                                        />
                                    </div>
                                    {errors.sku && <p className="text-rose-500 text-[8px] font-bold mt-1 ml-1 uppercase">{errors.sku[0]}</p>}
                                </div>

                                <div className="space-y-1">
                                    <label className={labelClass}>Product Category</label>
                                    <div className="relative group">
                                        <Squares2X2Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 group-focus-within:text-slate-800 pointer-events-none" />
                                        <select
                                            name="product_category" value={formData.product_category} onChange={handleChange} required
                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 pl-9 pr-3.5 text-sm font-bold text-slate-900 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all cursor-pointer appearance-none"
                                        >
                                            <option value="">Select Domain</option>
                                            {categories.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {errors.product_category && <p className="text-rose-500 text-[8px] font-bold mt-1 ml-1 uppercase">{errors.product_category[0]}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Section: Tax & Pricing Architecture */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-2">02. Financial Architecture</h3>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Input GST Architecture */}
                                <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                                        Inbound (Input Tax)
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2">
                                            <label className={labelClass}>Cost Basis</label>
                                            <div className="relative group">
                                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 font-black text-[10px] group-focus-within:text-slate-800 transition">₹</span>
                                                <input
                                                    type="number" name="cost_price" value={formData.cost_price} onChange={handleChange} required
                                                    placeholder="0.00"
                                                    className="w-full bg-white border border-slate-100 rounded-lg py-2 pl-8 pr-3.5 text-sm font-bold text-slate-900 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all tabular-nums"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Input GST %</label>
                                            <div className="relative group">
                                                <FaPercent className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-300 group-focus-within:text-slate-800" />
                                                <input
                                                    type="number" step="0.01" name="input_gst_rate" value={formData.input_gst_rate} onChange={handleChange} required
                                                    className="w-full bg-white border border-slate-100 rounded-lg py-2 pl-7 pr-3.5 text-sm font-bold text-slate-900 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all tabular-nums"
                                                />
                                            </div>
                                        </div>
                                        <div className="h-9 flex items-center justify-end px-3 bg-slate-800 rounded-lg border border-slate-700 shadow-inner mt-5">
                                            <span className="text-white/30 font-black text-[9px] mr-1.5">₹</span>
                                            <span className="text-white font-black text-xs tabular-nums">{inputGstAmount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Output GST Architecture */}
                                <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-slate-800 rounded-full"></span>
                                        Outbound (Sales Tax)
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2">
                                            <label className={labelClass}>Selling Point</label>
                                            <div className="relative group">
                                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 font-black text-[10px] group-focus-within:text-slate-800 transition">₹</span>
                                                <input
                                                    type="number" name="base_price" value={formData.base_price} onChange={handleChange} required
                                                    placeholder="0.00"
                                                    className="w-full bg-white border border-slate-100 rounded-lg py-2 pl-8 pr-3.5 text-sm font-bold text-slate-900 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all tabular-nums"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Output GST %</label>
                                            <div className="relative group">
                                                <FaPercent className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-300 group-focus-within:text-slate-800" />
                                                <input
                                                    type="number" step="0.01" name="output_gst_rate" value={formData.output_gst_rate} onChange={handleChange} required
                                                    className="w-full bg-white border border-slate-100 rounded-lg py-2 pl-7 pr-3.5 text-sm font-bold text-slate-900 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all tabular-nums"
                                                />
                                            </div>
                                        </div>
                                        <div className="h-9 flex items-center justify-end px-3 bg-slate-800 rounded-lg border border-slate-700 shadow-inner mt-5">
                                            <span className="text-white/30 font-black text-[9px] mr-1.5">₹</span>
                                            <span className="text-white font-black text-xs tabular-nums">{outputGstAmount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section: Inventory & Details */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-2">03. Logistics & Specifications</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1">
                                    <label className={labelClass}>Stock Threshold</label>
                                    <div className="relative group">
                                        <FaInfoCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300 group-focus-within:text-slate-800" />
                                        <input
                                            type="number" name="low_stock_limit" value={formData.low_stock_limit} onChange={handleChange}
                                            placeholder="10"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 pl-9 pr-3.5 text-sm font-bold text-slate-900 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className={labelClass}>Technical Narrative</label>
                                    <textarea
                                        name="description" value={formData.description} onChange={handleChange} required
                                        rows={2}
                                        placeholder="Product parameters and specifications..."
                                        className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 px-3.5 text-sm font-medium text-slate-900 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all resize-none placeholder:text-slate-300"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Form Footer */}
                        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-50">
                            <div className="flex items-center gap-2 text-slate-400">
                                <FaInfoCircle size={10} />
                                <span className="text-[8px] font-black uppercase tracking-widest">Audited for GST Compliance Period 2024-25</span>
                            </div>
                            
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <button
                                    type="button" onClick={() => navigate(-1)}
                                    className="flex-1 sm:flex-none px-6 py-2 text-slate-400 font-black text-[9px] uppercase tracking-widest hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-all"
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit" disabled={loading}
                                    className="flex-[2] sm:flex-none min-w-[160px] bg-slate-800 text-white px-8 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-700 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 active:scale-95"
                                >
                                    {loading ? "Processing..." : "Finalize Catalog Entry"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
