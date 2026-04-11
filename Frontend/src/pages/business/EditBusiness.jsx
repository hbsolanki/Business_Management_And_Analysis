import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { businessService } from "@/features/business/services/businessService";
import BackButton from "@/components/shared/BackButton";
import {
  FaBuilding,
  FaIdBadge,
  FaAlignLeft,
  FaTrash,
  FaExclamationTriangle,
} from "react-icons/fa";
import { authService } from "@/services/authService";
import { tokenService } from "@/services/tokenService";

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

  const handleDeleteBusiness = async () => {
    if (!window.confirm("Are you sure you want to delete this business? This action cannot be undone.")) return;

    try {
      await businessService.delete(bid);
      toast.success("Business deleted successfully");
      navigate("/owner");
    } catch (err) {
      toast.error("Failed to delete business");
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "CRITICAL ACTION: This will delete your ENTIRE business and your OWNER ACCOUNT permanently. \n\nAre you absolutely sure you want to proceed?"
    );
    if (!confirmed) return;

    try {
      // 1. Delete Business
      await businessService.delete(bid);

      // 2. Delete User account
      const userId = tokenService.getId();
      if (userId) {
        await authService.deleteUser(userId);
      }

      toast.success("Account and Business deleted successfully");
      await authService.logout();
      navigate("/");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete account completely");
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

        {/* Danger Zone */}
        <div className="bg-red-50/50 rounded-3xl border border-red-100 p-8 space-y-6">
          <div className="flex items-center gap-3 text-red-600">
            <FaExclamationTriangle className="text-xl" />
            <h3 className="text-lg font-bold uppercase tracking-tight">Danger Zone</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Delete Business</h4>
                <p className="text-xs text-slate-500 mt-1">Permanently remove this business. You can register a new one later.</p>
              </div>
              <button
                onClick={handleDeleteBusiness}
                className="mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
              >
                <FaTrash className="text-xs" /> Delete Business
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-red-600">Delete Account & Business</h4>
                <p className="text-xs text-slate-500 mt-1">Permanently delete your entire owner account and the business associated with it.</p>
              </div>
              <button
                onClick={handleDeleteAccount}
                className="mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                <FaTrash className="text-xs" /> Delete Entire Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
