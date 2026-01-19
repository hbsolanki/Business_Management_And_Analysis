import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { productService } from "@/features/product/services/productService";

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

    /* ---------------- Fetch Product & Categories ---------------- */
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

    /* ---------------- Handle Change ---------------- */
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    /* ---------------- UI PREVIEW (DISPLAY ONLY) ---------------- */
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

    /* ---------------- Submit (ONLY % SENT) ---------------- */
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                Loading...
            </div>
        );
    }

    /* ---------------- UI ---------------- */
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
            <div className="w-full max-w-lg bg-white rounded-xl shadow-md p-8">
                <h2 className="text-center text-2xl font-bold mb-6">
                    Edit Product
                </h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Name */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium">
                            <TagIcon className="h-5 w-5" />
                            Product Name
                        </label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="mt-1 w-full border rounded-md px-3 py-2"
                        />
                    </div>

                    {/* SKU */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium">
                            <ClipboardDocumentIcon className="h-5 w-5" />
                            SKU
                        </label>
                        <input
                            name="sku"
                            value={formData.sku}
                            onChange={handleChange}
                            required
                            className="mt-1 w-full border rounded-md px-3 py-2"
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium">
                            <Squares2X2Icon className="h-5 w-5" />
                            Category
                        </label>
                        <select
                            name="product_category"
                            value={formData.product_category}
                            onChange={handleChange}
                            className="mt-1 w-full border rounded-md px-3 py-2"
                        >
                            <option value="">Select category</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Cost Price */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium">
                            <CurrencyRupeeIcon className="h-5 w-5" />
                            Cost Price
                        </label>
                        <input
                            type="number"
                            name="cost_price"
                            value={formData.cost_price}
                            onChange={handleChange}
                            required
                            className="mt-1 w-full border rounded-md px-3 py-2"
                        />
                    </div>

                    {/* Base Price */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium">
                            <CurrencyRupeeIcon className="h-5 w-5" />
                            Base Price
                        </label>
                        <input
                            type="number"
                            name="base_price"
                            value={formData.base_price}
                            onChange={handleChange}
                            required
                            className="mt-1 w-full border rounded-md px-3 py-2"
                        />
                    </div>

                    {/* Input GST */}
                    <div>
                        <label className="text-sm font-medium">
                            Input GST (%)
                        </label>
                        <input
                            type="number"
                            name="input_gst_rate"
                            value={formData.input_gst_rate}
                            onChange={handleChange}
                            className="mt-1 w-full border rounded-md px-3 py-2"
                        />
                        <p className="text-xs text-gray-600 mt-1">
                            GST on Cost Price (₹{costPrice || 0}) →
                            <span className="font-semibold text-gray-800">
                                ₹{inputGstAmount.toFixed(2)}
                            </span>
                        </p>
                    </div>

                    {/* Output GST */}
                    <div>
                        <label className="text-sm font-medium">
                            Output GST (%)
                        </label>
                        <input
                            type="number"
                            name="output_gst_rate"
                            value={formData.output_gst_rate}
                            onChange={handleChange}
                            className="mt-1 w-full border rounded-md px-3 py-2"
                        />
                        <p className="text-xs text-gray-600 mt-1">
                            GST on Base Price (₹{basePrice || 0}) →
                            <span className="font-semibold text-gray-800">
                                ₹{outputGstAmount.toFixed(2)}
                            </span>
                        </p>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium">
                            <DocumentTextIcon className="h-5 w-5" />
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="mt-1 w-full border rounded-md px-3 py-2"
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full py-2 rounded-md text-white font-semibold ${isSubmitting
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-500"
                            }`}
                    >
                        {isSubmitting ? "Saving..." : "Update Product"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default EditProduct;
