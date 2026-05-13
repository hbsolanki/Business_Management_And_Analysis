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
  FaCheck,
  FaTimes
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="flex justify-start">
          <BackButton />
        </div>

        {/* Professional White Header Section */}
        <div className="relative overflow-hidden rounded-[2rem] bg-white p-6 md:p-10 shadow-sm border border-slate-200">
          <div className="absolute inset-0 opacity-[0.03]">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)',
              backgroundSize: '24px 24px'
            }}></div>
          </div>

          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="h-14 w-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0 shadow-sm text-brand-600">
                <FaBuilding className="text-2xl" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-1 font-display">
                  Edit Business
                </h1>
                <p className="text-slate-500 text-sm md:text-base font-medium leading-relaxed max-w-xl">
                  Keep your business profile accurate and up to date to ensure seamless operations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
            <div className="space-y-8">
              {/* Business Name */}
              <div className="space-y-2">
                <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-widest text-slate-400 ml-2">
                  Business Name <span className="text-brand-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full min-h-[44px] px-1 pl-2 py-2 border-b-2 border-slate-200 focus:border-brand-500 bg-transparent text-sm text-slate-800 font-medium placeholder:text-slate-400 outline-none transition-colors duration-150"
                    placeholder="Enter your legal business name"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label htmlFor="description" className="block text-xs font-semibold uppercase tracking-widest text-slate-400 ml-2">
                  Business Description
                </label>
                <div className="relative">
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full min-h-[44px] px-1 pl-2 py-2 border-b-2 border-slate-200 focus:border-brand-500 bg-transparent text-sm text-slate-800 font-medium placeholder:text-slate-400 outline-none transition-colors duration-150 resize-none"
                    placeholder="Briefly describe your business operations"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Action Buttons */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="group flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-base text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all duration-300 shadow-sm"
            >
              <FaTimes className="text-slate-400 group-hover:text-slate-600 transition-colors" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`group relative flex items-center justify-center gap-3 px-10 py-4 rounded-xl font-bold text-base text-white transition-all duration-300 shadow-lg ${
                saving
                  ? "bg-brand-400 cursor-not-allowed"
                  : "bg-brand-600 hover:bg-brand-700 hover:shadow-brand-200 hover:-translate-y-1 active:scale-95"
              }`}
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="tracking-tight">Saving Changes...</span>
                </>
              ) : (
                <>
                  <FaCheck className="text-lg transition-transform duration-500 group-hover:scale-125" />
                  <span className="tracking-tight">Save Profile Updates</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Danger Zone Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-red-100 p-6 md:p-8 space-y-6">
          <h2 className="text-lg font-bold text-red-600 flex items-center gap-3 uppercase tracking-tight font-display">
            <div className="p-2 rounded-xl bg-red-50 border border-red-100">
              <FaExclamationTriangle size={18} />
            </div>
            Critical Operations Zone
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Delete Business</h4>
                <p className="text-xs text-slate-500 mt-1">Permanently remove this business. All data will be lost.</p>
              </div>
              <button
                onClick={handleDeleteBusiness}
                className="mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-red-600 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors"
              >
                <FaTrash className="text-xs" /> Delete Business
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-red-50/30 border border-red-100 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-red-700">Delete Entire Identity</h4>
                <p className="text-xs text-slate-500 mt-1">Erase your entire account and business permanently.</p>
              </div>
              <button
                onClick={handleDeleteAccount}
                className="mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors shadow-sm"
              >
                <FaTrash className="text-xs" /> Delete Entire Account
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
