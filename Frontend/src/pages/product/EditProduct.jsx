import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { productService } from "@/features/product/services/productService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import BackButton from "@/components/shared/BackButton";
import {
    TagIcon,
    CurrencyRupeeIcon,
    ClipboardDocumentIcon,
    Squares2X2Icon,
    DocumentTextIcon,
} from "@heroicons/react/24/outline";

function EditProduct() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        sku: "",
        cost_price: "",
        base_price: "",
        input_gst_rate: "",
        output_gst_rate: "",
        description: "",
        product_category: "",
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
                    input_gst_rate: product.input_gst_rate || "",
                    output_gst_rate: product.output_gst_rate || "",
                    description: product.description || "",
                    product_category: product.product_category?.id || "",
                });

                setCategories(categoryRes.data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const costPrice = Number(formData.cost_price) || 0;
    const basePrice = Number(formData.base_price) || 0;

    const inputGstAmount = useMemo(() => {
        if (!formData.input_gst_rate || costPrice <= 0) return 0;
        return (costPrice * Number(formData.input_gst_rate)) / 100;
    }, [costPrice, formData.input_gst_rate]);

    const outputGstAmount = useMemo(() => {
        if (!formData.output_gst_rate || basePrice <= 0) return 0;
        return (basePrice * Number(formData.output_gst_rate)) / 100;
    }, [basePrice, formData.output_gst_rate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await productService.update(id, {
                name: formData.name,
                sku: formData.sku,
                cost_price: formData.cost_price,
                base_price: formData.base_price,
                input_gst_rate: formData.input_gst_rate || null,
                output_gst_rate: formData.output_gst_rate || null,
                description: formData.description,
                product_category: formData.product_category || null,
            });

            navigate(-1);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClass = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500";

    if (loading) {
        return (
            <div className="min-h-screen bg-transparent">
                <ProtectedHeader />
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
                </div>
            </div>
        );
    }

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
                                <h2 className="form-title">Edit Product</h2>
                                <p className="form-subtitle mt-1">Update product details and pricing.</p>
                            </div>
                        </div>
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
                                    className={inputClass}
                                />
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
                                    className={inputClass}
                                />
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
                                    className={inputClass}
                                >
                                    <option value="">Select category</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
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
                                    className={inputClass}
                                />
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
                                    className={inputClass}
                                />
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
                                    className={inputClass}
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    GST on Cost Price (₹{costPrice || 0}) → ₹{inputGstAmount.toFixed(2)}
                                </p>
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
                                    className={inputClass}
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    GST on Base Price (₹{basePrice || 0}) → ₹{outputGstAmount.toFixed(2)}
                                </p>
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
                                    rows={3}
                                    className={inputClass}
                                />
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
                                disabled={isSubmitting}
                                className={`btn-primary ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""}`}
                            >
                                {isSubmitting ? "Saving..." : "Update Product"}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}

export default EditProduct;
