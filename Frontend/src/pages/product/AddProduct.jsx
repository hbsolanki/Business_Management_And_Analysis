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
        input_gst_rate: "",
        output_gst_rate: "",
        description: "",
    });

    useEffect(() => {
        productService.getCategories().then((res) => {
            setCategories(res.data || []);
        });
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((p) => ({ ...p, [name]: value }));
        if (errors[name]) {
            setErrors((p) => ({ ...p, [name]: null }));
        }
    };

    const costPrice = Number(formData.cost_price) || 0;
    const basePrice = Number(formData.base_price) || 0;

    const inputGstAmount = useMemo(
        () => (costPrice * Number(formData.input_gst_rate || 0)) / 100,
        [costPrice, formData.input_gst_rate]
    );

    const outputGstAmount = useMemo(
        () => (basePrice * Number(formData.output_gst_rate || 0)) / 100,
        [basePrice, formData.output_gst_rate]
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        setFormError("");

        try {
            await productService.create({
                ...formData,
                product_category: formData.product_category,
            });
            navigate(-1);
        } catch (err) {
            if (err.response?.status === 403) {
                const message = err.response?.data?.message || "No active subscription";
                setFormError(message);
                return;
            }
            if (err.response?.data) {
                setErrors(err.response.data);
            }
        } finally {
            setLoading(false);
        }
    };

    const inputClass = (name) =>
        `mt-1 w-full rounded-lg border px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
            errors[name]
                ? "border-rose-400 bg-rose-50"
                : "border-slate-200 bg-white focus:border-brand-500"
        }`;

    return (
        <div className="min-h-screen bg-transparent">
            <ProtectedHeader />

            <main className="form-shell py-8">
                <div className="mb-4">
                    <BackButton />
                </div>
                <div className="form-card overflow-hidden">
                    <div className="form-header">
                        <div className="flex items-start gap-3">
                            <div className="form-header-icon">
                                <TagIcon className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="form-title">Create Product</h2>
                                <p className="form-subtitle mt-1">
                                    Add product details, pricing, and tax information.
                                </p>
                            </div>
                        </div>
                        {formError && (
                            <div className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                                {formError}
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="form-section space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <TagIcon className="h-4 w-4" />
                                    Product Name
                                </label>
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g. Wireless Headphones"
                                    className={inputClass("name")}
                                />
                                {errors.name && (
                                    <p className="text-rose-600 text-xs mt-1 font-medium">
                                        {errors.name[0]}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <ClipboardDocumentIcon className="h-4 w-4" />
                                    SKU
                                </label>
                                <input
                                    name="sku"
                                    value={formData.sku}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g. WH-001"
                                    className={inputClass("sku")}
                                />
                                {errors.sku && (
                                    <p className="text-rose-600 text-xs mt-1 font-medium">
                                        {errors.sku[0]}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <Squares2X2Icon className="h-4 w-4" />
                                    Category
                                </label>
                                <select
                                    name="product_category"
                                    value={formData.product_category}
                                    onChange={handleChange}
                                    required
                                    className={inputClass("product_category")}
                                >
                                    <option value="">Select category</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.product_category && (
                                    <p className="text-rose-600 text-xs mt-1 font-medium">
                                        {errors.product_category[0]}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <CurrencyRupeeIcon className="h-4 w-4" />
                                    Cost Price
                                </label>
                                <input
                                    type="number"
                                    name="cost_price"
                                    value={formData.cost_price}
                                    onChange={handleChange}
                                    required
                                    placeholder="0.00"
                                    className={inputClass("cost_price")}
                                />
                                {errors.cost_price && (
                                    <p className="text-rose-600 text-xs mt-1 font-medium">
                                        {errors.cost_price[0]}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <CurrencyRupeeIcon className="h-4 w-4" />
                                    Base Price
                                </label>
                                <input
                                    type="number"
                                    name="base_price"
                                    value={formData.base_price}
                                    onChange={handleChange}
                                    required
                                    placeholder="0.00"
                                    className={inputClass("base_price")}
                                />
                                {errors.base_price && (
                                    <p className="text-rose-600 text-xs mt-1 font-medium">
                                        {errors.base_price[0]}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Input GST (%)
                                </label>
                                <input
                                    type="number"
                                    name="input_gst_rate"
                                    value={formData.input_gst_rate}
                                    onChange={handleChange}
                                    required
                                    className={inputClass("input_gst_rate")}
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Amount: ₹{inputGstAmount.toFixed(2)}
                                </p>
                                {errors.input_gst_rate && (
                                    <p className="text-rose-600 text-xs mt-1 font-medium">
                                        {errors.input_gst_rate[0]}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Output GST (%)
                                </label>
                                <input
                                    type="number"
                                    name="output_gst_rate"
                                    value={formData.output_gst_rate}
                                    onChange={handleChange}
                                    required
                                    className={inputClass("output_gst_rate")}
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Amount: ₹{outputGstAmount.toFixed(2)}
                                </p>
                                {errors.output_gst_rate && (
                                    <p className="text-rose-600 text-xs mt-1 font-medium">
                                        {errors.output_gst_rate[0]}
                                    </p>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <DocumentTextIcon className="h-4 w-4" />
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    required
                                    rows={3}
                                    placeholder="Enter product details..."
                                    className={inputClass("description")}
                                />
                                {errors.description && (
                                    <p className="text-rose-600 text-xs mt-1 font-medium">
                                        {errors.description[0]}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`btn-primary ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
                            >
                                {loading ? "Saving..." : "Create Product"}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
