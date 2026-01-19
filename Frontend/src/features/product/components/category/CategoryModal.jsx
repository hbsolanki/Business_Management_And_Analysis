import { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import api from "@/services/api";

export default function CategoryModal({ category, onClose, onSaved }) {
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
        ? await api.patch(`/product/category/${category.id}/`, form)
        : await api.post("/product/category/", form);

      onSaved(res.data);
    } catch (e) {
      console.log(e);
      if (e.response && e.response.data) {
        setErrors(e.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-full max-w-sm rounded-lg p-5 relative">
        <button onClick={onClose} className="absolute top-3 right-3">
          <XMarkIcon className="h-5 w-5" />
        </button>

        <h3 className="text-lg font-semibold mb-4">
          {category ? "Edit Category" : "Add Category"}
        </h3>

        <div className="mb-3">
          <input
            name="name"
            placeholder="Category name"
            value={form.name}
            onChange={handleChange}
            className={`w-full border rounded-md px-3 py-2 ${errors.name ? "border-red-500" : ""
              }`}
          />
          {errors.name && (
            <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>
          )}
        </div>

        <textarea
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
          className="w-full border rounded-md px-3 py-2 mb-4"
        />

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-md"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
