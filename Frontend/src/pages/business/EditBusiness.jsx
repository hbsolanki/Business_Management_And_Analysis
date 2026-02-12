import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { businessService } from "@/features/business/services/businessService";
import BackButton from "@/components/shared/BackButton";
import {
  FaBuilding,
  FaIdBadge,
  FaAlignLeft,
  FaSave,
} from "react-icons/fa";

export default function EditBusiness() {
  const { bid } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    gst_number: "",
    description: "",
  });

  useEffect(() => {
    async function fetchBusiness() {
      try {
        const res = await businessService.get(bid);
        const data = res.data;

        setFormData({
          name: data.name || "",
          gst_number: data.gst_number || "",
          description: data.description || "",
        });
      } catch {
        toast.error("Failed to load business");
      } finally {
        setLoading(false);
      }
    }

    fetchBusiness();
  }, [bid]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await businessService.update(bid, {
        name: formData.name,
        gst_number: formData.gst_number || null,
        description: formData.description,
      });

      toast.success("Business updated successfully");
      navigate(-1);
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 bg-transparent">
      <div className="form-shell max-w-3xl space-y-6">
        <BackButton />

        <div className="form-card overflow-hidden">
          <div className="form-header">
            <div className="form-header-icon">
              <FaBuilding />
            </div>
            <div>
              <h2 className="form-title">Edit Business</h2>
              <p className="form-subtitle mt-1">
                Keep your business profile accurate and up to date.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="form-section space-y-6">
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Business Name
                </label>
                <div className="relative">
                  <FaBuilding className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
                    placeholder="Enter business name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  GST Number
                </label>
                <div className="relative">
                  <FaIdBadge className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="gst_number"
                    value={formData.gst_number}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
                    placeholder="Enter GST number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Description
                </label>
                <div className="relative">
                  <FaAlignLeft className="absolute left-4 top-4 text-slate-400" />
                  <textarea
                    name="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
                    placeholder="Describe your business..."
                  />
                </div>
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
                disabled={saving}
                className={`btn-primary ${saving ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
