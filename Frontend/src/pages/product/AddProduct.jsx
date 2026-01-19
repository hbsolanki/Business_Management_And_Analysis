import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { productService } from "@/features/product/services/productService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
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

        try {
            await productService.create({
                ...formData,
                product_category: formData.product_category,
            });
            navigate(-1);
        } catch (err) {
            if (err.response?.data) {
                setErrors(err.response.data);
            }
        } finally {
            setLoading(false);
        }
    };

    const inputClass = (name) =>
        `mt-1 w-full border rounded-md px-3 py-2 ${errors[name] ? "border-red-500" : ""
        }`;

    return (
        <div className="min-h-screen bg-gray-50">
            <ProtectedHeader />

            <div className="container mx-auto px-4 py-10 max-w-3xl">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white">
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <TagIcon className="h-8 w-8 text-blue-200" /> Create New Product
                        </h2>
                        <p className="text-blue-100 mt-2">Add product details, pricing and tax information</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                    <TagIcon className="h-4 w-4 text-blue-600" />
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
                                    <p className="text-red-600 text-xs mt-1 font-medium ml-1">
                                        {errors.name[0]}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                    <ClipboardDocumentIcon className="h-4 w-4 text-blue-600" />
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
                                    <p className="text-red-600 text-xs mt-1 font-medium ml-1">
                                        {errors.sku[0]}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                    <Squares2X2Icon className="h-4 w-4 text-blue-600" />
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
                                    <p className="text-red-600 text-xs mt-1 font-medium ml-1">
                                        {errors.product_category[0]}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                    <CurrencyRupeeIcon className="h-4 w-4 text-blue-600" />
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
                                    <p className="text-red-600 text-xs mt-1 font-medium ml-1">
                                        {errors.cost_price[0]}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                    <CurrencyRupeeIcon className="h-4 w-4 text-blue-600" />
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
                                    <p className="text-red-600 text-xs mt-1 font-medium ml-1">
                                        {errors.base_price[0]}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-gray-700 mb-2">Input GST (%)</label>
                                <input
                                    type="number"
                                    name="input_gst_rate"
                                    value={formData.input_gst_rate}
                                    onChange={handleChange}
                                    required
                                    className={inputClass("input_gst_rate")}
                                />
                                <p className="text-xs text-gray-500 mt-1 ml-1 font-medium">
                                    Amount: ₹{inputGstAmount.toFixed(2)}
                                </p>
                                {errors.input_gst_rate && (
                                    <p className="text-red-600 text-xs mt-1 font-medium ml-1">
                                        {errors.input_gst_rate[0]}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-gray-700 mb-2">Output GST (%)</label>
                                <input
                                    type="number"
                                    name="output_gst_rate"
                                    value={formData.output_gst_rate}
                                    onChange={handleChange}
                                    required
                                    className={inputClass("output_gst_rate")}
                                />
                                <p className="text-xs text-gray-500 mt-1 ml-1 font-medium">
                                    Amount: ₹{outputGstAmount.toFixed(2)}
                                </p>
                                {errors.output_gst_rate && (
                                    <p className="text-red-600 text-xs mt-1 font-medium ml-1">
                                        {errors.output_gst_rate[0]}
                                    </p>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                    <DocumentTextIcon className="h-4 w-4 text-blue-600" />
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
                                    <p className="text-red-600 text-xs mt-1 font-medium ml-1">
                                        {errors.description[0]}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="px-6 py-2.5 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`px-8 py-2.5 rounded-xl text-white font-bold shadow-lg shadow-blue-500/30 transition-all transform active:scale-95 ${loading
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                                    }`}
                            >
                                {loading ? "Saving..." : "Create Product"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
