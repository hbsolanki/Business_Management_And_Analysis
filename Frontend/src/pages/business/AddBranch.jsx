import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import OwnerHeader from "@/components/layout/OwnerHeader";
import BackButton from "@/components/shared/BackButton";
import { branchService } from "@/features/business/services/branchService";
import { fetchAddressFromGps } from "@/features/business/utils/gpsAddress";
import {
  FaCodeBranch,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaSpinner,
  FaLocationArrow,
  FaCheck,
  FaTimes
} from "react-icons/fa";

export default function AddBranch() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [locatingAddress, setLocatingAddress] = useState(false);
  const [formError, setFormError] = useState("");
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    country: "India",
    pin_code: "",
    contact_number: "",
    is_default: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError("");
    try {
      await branchService.create({
        name: formData.name.trim(),
        contact_number: formData.contact_number?.trim() || "",
        is_default: formData.is_default,
        address_data: {
          address_line_1: formData.address_line_1?.trim() || "",
          address_line_2: formData.address_line_2?.trim() || "",
          city: formData.city?.trim() || "",
          state: formData.state?.trim() || "",
          country: formData.country?.trim() || "",
          pin_code: formData.pin_code?.trim() || "",
        },
      });
      toast.success("Branch created successfully");
      navigate(-1);
    } catch (err) {
      const data = err?.response?.data;
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const hasFieldErrors = Object.values(data).some((value) => Array.isArray(value));
        if (hasFieldErrors) {
          setErrors(data);
          const errorMsg = data.detail ||
            data.non_field_errors?.[0] ||
            Object.values(data).find(v => Array.isArray(v))?.[0] ||
            "Failed to create branch";
          toast.error(errorMsg);
        } else {
          setFormError(data.detail || data.message || "Failed to create branch");
          toast.error(data.detail || data.message || "Failed to create branch");
        }
      } else {
        setFormError("Failed to create branch");
        toast.error("Failed to create branch");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    if (locatingAddress) return;

    setLocatingAddress(true);
    try {
      const result = await fetchAddressFromGps();
      if (result.structured) {
        const s = result.structured;
        setFormData((prev) => ({
          ...prev,
          address_line_1: s.road || s.pedestrian || s.suburb || s.neighbourhood || "",
          address_line_2: (s.suburb && s.road) ? s.suburb : (s.neighbourhood || ""),
          city: s.city || s.town || s.village || s.county || "",
          state: s.state || "",
          country: s.country || prev.country,
          pin_code: s.postcode || "",
        }));
      } else {
        setFormData((prev) => ({ ...prev, address_line_1: result.address }));
      }

      if (errors.address_line_1) {
        setErrors((prev) => ({ ...prev, address_line_1: null }));
      }
      toast.success("Address fetched from GPS");
    } catch (error) {
      toast.error(error?.message || "Failed to fetch address from GPS");
    } finally {
      setLocatingAddress(false);
    }
  };

    return (
    <div className="min-h-screen bg-slate-50/30 pb-12">
      <OwnerHeader />

      <main className="max-w-3xl mx-auto px-4 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <BackButton label="Back" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">Branch Management</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <header className="px-5 py-4 bg-white border-b border-slate-100 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-md">
              <FaCodeBranch size={14} />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 tracking-tight leading-tight">Establish Branch</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Operational Location Setup</p>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="p-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Branch Name <span className="text-red-500">*</span></label>
                <input
                  type="text" name="name" value={formData.name} onChange={handleChange} required
                  placeholder="e.g. Primary Outlet"
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg px-4 py-2 text-sm font-bold text-slate-900 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all"
                />
                {errors.name && <p className="text-[8px] font-bold text-red-500 mt-1 ml-1 uppercase">{errors.name[0]}</p>}
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Contact Access</label>
                <div className="relative group">
                  <FaPhoneAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-800 transition" size={10} />
                  <input
                    type="text" name="contact_number" value={formData.contact_number} onChange={handleChange}
                    placeholder="+91 ••••• •••••"
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-9 pr-4 py-2 text-sm font-bold text-slate-900 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="md:col-span-2 pt-2 flex items-center justify-between border-b border-slate-50 pb-2">
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Location Matrix</h3>
                <button
                  type="button" onClick={handleUseCurrentLocation} disabled={locatingAddress}
                  className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[9px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  {locatingAddress ? <FaSpinner className="animate-spin" /> : <FaLocationArrow size={9} />}
                  {locatingAddress ? "Syncing..." : "Auto-Fill GPS"}
                </button>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Street Architecture</label>
                <div className="relative group">
                  <FaMapMarkerAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-800 transition" size={10} />
                  <input
                    type="text" name="address_line_1" value={formData.address_line_1} onChange={handleChange}
                    placeholder="Building, Road, Area"
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-9 pr-4 py-2 text-sm font-bold text-slate-900 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">City</label>
                <input
                  type="text" name="city" value={formData.city} onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg px-4 py-2 text-sm font-bold text-slate-900 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">State / Province</label>
                <input
                  type="text" name="state" value={formData.state} onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg px-4 py-2 text-sm font-bold text-slate-900 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/50 border border-slate-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg transition-all ${formData.is_default ? "bg-slate-800 text-white shadow-md" : "bg-white text-slate-300 border border-slate-100"}`}>
                  <FaCheckCircle size={12} />
                </div>
                <div>
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-none">Primary Hub</h4>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">Main operational base</p>
                </div>
              </div>
              <button
                type="button" onClick={() => setFormData((prev) => ({ ...prev, is_default: !prev.is_default }))}
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all duration-300 ${formData.is_default ? "bg-slate-800" : "bg-slate-200"}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${formData.is_default ? "translate-x-5.5" : "translate-x-1"}`} />
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-50">
              <button
                type="button" onClick={() => navigate(-1)}
                className="px-5 py-2 rounded-lg text-slate-400 font-bold uppercase tracking-widest text-[9px] hover:text-slate-900 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={saving}
                className="px-9 py-2.5 rounded-xl bg-slate-800 text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200 hover:bg-slate-700 transition-all disabled:opacity-50 active:scale-95"
              >
                {saving ? "Processing..." : "Confirm Establishment"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
