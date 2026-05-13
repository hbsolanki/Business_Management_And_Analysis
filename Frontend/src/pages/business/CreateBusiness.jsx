import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { businessService } from "@/features/business/services/businessService";
import BackButton from "@/components/shared/BackButton";
import { useDispatch } from "react-redux";
import { fetchUserProfile } from "@/redux/slices/userSlice";
import { toast } from "react-hot-toast";
import { FaBuilding, FaFileAlt, FaArrowLeft, FaCheck } from "react-icons/fa";

export default function CreateBusiness() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await businessService.create(formData);
      dispatch(fetchUserProfile());
      toast.success("Business created successfully!");
      navigate("/owner");
    } catch (error) {
      console.error("Failed to create business:", error);
      toast.error("Failed to create business");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
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
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-1">
                  Create Business
                </h1>
                <p className="text-slate-500 text-sm md:text-base font-medium leading-relaxed max-w-xl">
                  Register your business to unlock full access and start managing your operations efficiently.
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
                    onChange={handleChange}
                    required
                    className="w-full min-h-[44px] px-1 pl-2 py-2 border-b-2 border-slate-200 focus:border-brand-500 bg-transparent text-sm text-slate-800 font-medium placeholder:text-slate-400 outline-none transition-colors duration-150"
                    placeholder="Enter your legal business name"
                  />
                </div>
              </div>

              {/* GST Number */}
              <div className="space-y-2">
                <label htmlFor="gst_number" className="block text-xs font-semibold uppercase tracking-widest text-slate-400 ml-2">
                  GST Number (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="gst_number"
                    id="gst_number"
                    onChange={handleChange}
                    className="w-full min-h-[44px] px-1 pl-2 py-2 border-b-2 border-slate-200 focus:border-brand-500 bg-transparent text-sm text-slate-800 font-medium placeholder:text-slate-400 outline-none transition-colors duration-150"
                    placeholder="Enter GSTIN for tax compliance"
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
                    onChange={handleChange}
                    rows={3}
                    className="w-full min-h-[44px] px-1 pl-2 py-2 border-b-2 border-slate-200 focus:border-brand-500 bg-transparent text-sm text-slate-800 font-medium placeholder:text-slate-400 outline-none transition-colors duration-150 resize-none"
                    placeholder="Briefly describe your business operations"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Action Button */}
          <div className="pt-6 flex flex-col items-center gap-6">
            <button
              type="submit"
              disabled={loading}
              className={`group relative flex items-center justify-center gap-3 px-10 py-4 rounded-xl font-bold text-base text-white transition-all duration-300 shadow-lg ${
                loading
                  ? "bg-brand-400 cursor-not-allowed"
                  : "bg-brand-600 hover:bg-brand-700 hover:shadow-brand-200 hover:-translate-y-1 active:scale-95"
              }`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="tracking-tight">Registering...</span>
                </>
              ) : (
                <>
                  <FaCheck className="text-lg transition-transform duration-500 group-hover:scale-125" />
                  <span className="tracking-tight">Create Business Profile</span>
                </>
              )}
            </button>
            
            <p className="text-xs text-slate-400 font-medium">
              By creating a business, you agree to our Terms of Service.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
