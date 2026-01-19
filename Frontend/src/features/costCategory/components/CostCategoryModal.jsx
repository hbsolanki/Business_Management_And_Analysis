import { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import costCategoryService from "../services/costCategoryService";

export default function CostCategoryModal({ category, onClose, onSaved }) {
    const [form, setForm] = useState({ name: "", description: "" });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (category) {
            setForm({
                name: category.name,
                description: category.description || "",
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
            const res = category
                ? await costCategoryService.update(category.id, form)
                : await costCategoryService.create(form);

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
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
            <div className="bg-white w-full max-w-sm rounded-lg p-5 relative shadow-xl">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="h-5 w-5" />
                </button>

                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                    {category ? "Edit Category" : "Add Category"}
                </h3>

                <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                        name="name"
                        placeholder="e.g. Electricity, Rent"
                        value={form.name}
                        onChange={handleChange}
                        className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${errors.name ? "border-red-500" : "border-gray-300"}`}
                    />
                    {errors.name && (
                        <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>
                    )}
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                    <textarea
                        name="description"
                        placeholder="Brief description..."
                        value={form.description}
                        onChange={handleChange}
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                    {loading ? "Saving..." : "Save"}
                </button>
            </div>
        </div>
    );
}
