import { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { FaTags } from "react-icons/fa";
import api from "@/services/api";

export default function CategoryModal({ category, onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", description: "" });
  const [initialForm, setInitialForm] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (category) {
      const nextForm = {
        name: category.name,
        description: category.description || "",
      };
      setForm(nextForm);
      setInitialForm(nextForm);
    } else {
      const blankForm = { name: "", description: "" };
      setForm(blankForm);
      setInitialForm(blankForm);
    }
  }, [category]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !loading) {
      handleSave();
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.description.trim()) {
      setErrors((prev) => ({
        ...prev,
        name: !form.name.trim() ? ["This field may not be blank."] : prev.name,
        description: !form.description.trim() ? ["This field may not be blank."] : prev.description,
      }));
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      let payload = form;
      if (category) {
        payload = {};
        if (form.name !== initialForm.name) payload.name = form.name;
        if (form.description !== initialForm.description) payload.description = form.description;
      }

      const res = category
        ? await api.patch(`/product/category/${category.id}/`, payload)
        : await api.post("/product/category/", payload);

      onSaved(res.data);
    } catch (e) {
      if (e.response && e.response.data) {
        setErrors(e.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <FaTags className="text-sm" />
            </div>
            <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {category ? "Edit Category" : "Add New Category"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {category ? "Update category details" : "Create a new category for your products"}
            </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-full p-1 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Category Name
            </label>
            <input
              name="name"
              placeholder="e.g. Electronics, Service"
              value={form.name}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                errors.name
                  ? "border-rose-300 bg-rose-50 text-rose-900 placeholder-rose-300"
                  : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-brand-500"
              }`}
            />
            {errors.name && (
              <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.name[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Description <span className="text-slate-400 font-normal">(Max 40)</span>
            </label>
            <textarea
              name="description"
              placeholder="Enter a brief description..."
              value={form.description}
              onChange={handleChange}
              rows={3}
              maxLength={40}
              required
              className={`w-full px-4 py-3 rounded-lg border bg-white text-slate-900 placeholder-slate-400 focus:outline-none resize-none ${
                errors.description
                  ? "border-rose-300 bg-rose-50 text-rose-900 placeholder-rose-300 focus:ring-2 focus:ring-rose-200"
                  : "border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              }`}
            />
            <p className="text-xs text-slate-400 mt-1">{form.description.length}/40</p>
            {errors.description && (
              <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.description[0]}</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Save Category"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
