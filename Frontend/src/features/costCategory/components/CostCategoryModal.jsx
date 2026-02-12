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
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 relative shadow-lg border border-slate-200">
                <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600">
                    <XMarkIcon className="h-5 w-5" />
                </button>

                <h3 className="text-lg font-semibold mb-4 text-slate-900">
                    {category ? "Edit Category" : "Add Category"}
                </h3>

                <div className="mb-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                    <input
                        name="name"
                        placeholder="e.g. Electricity, Rent"
                        value={form.name}
                        onChange={handleChange}
                        className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 ${errors.name ? "border-red-500" : "border-slate-200"}`}
                    />
                    {errors.name && (
                        <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>
                    )}
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                    <textarea
                        name="description"
                        placeholder="Brief description..."
                        value={form.description}
                        onChange={handleChange}
                        rows={3}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
                    />
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full bg-slate-900 text-white py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                    {loading ? "Saving..." : "Save"}
                </button>
            </div>
        </div>
    );
}
