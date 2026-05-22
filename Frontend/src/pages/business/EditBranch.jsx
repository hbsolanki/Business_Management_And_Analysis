import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import OwnerHeader from "@/components/layout/OwnerHeader";
import BackButton from "@/components/shared/BackButton";
import Modal from "@/components/ui/Modal";
import { branchService } from "@/features/business/services/branchService";
import { fetchAddressFromGps } from "@/features/business/utils/gpsAddress";
import {
  FaCodeBranch,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaTrash,
  FaSpinner,
  FaLocationArrow,
  FaCheck,
  FaTimes
} from "react-icons/fa";

export default function EditBranch({ isEmbed = false, id: propsId = null, onComplete = null }) {
  const { id: routeId } = useParams();
  const id = propsId || routeId;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locatingAddress, setLocatingAddress] = useState(false);
  const [formError, setFormError] = useState("");
  const [errors, setErrors] = useState({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const originalDataRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    country: "",
    pin_code: "",
    contact_number: "",
    is_default: false,
  });

  useEffect(() => {
    const fetchBranch = async () => {
      if (!id) return;
      try {
        const res = await branchService.get(id);
        const data = res.data || {};
        const addr = data.address || {};
        const stateData = {
          name: data.name || "",
          address_line_1: addr.address_line_1 || "",
          address_line_2: addr.address_line_2 || "",
          city: addr.city_name || "",
          state: addr.state_name || "",
          country: addr.country_name || "",
          pin_code: addr.pin_code || "",
          contact_number: data.contact_number || "",
          is_default: Boolean(data.is_default),
        };
        setFormData(stateData);
        originalDataRef.current = { ...stateData };
      } catch {
        toast.error("Failed to load branch details");
        if (!isEmbed) navigate("/business/branch");
      } finally {
        setLoading(false);
      }
    };
    fetchBranch();
  }, [id, navigate, isEmbed]);

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

    const orig = originalDataRef.current;
    const hasChanges = !orig || Object.keys(orig).some((key) => {
      const curr = typeof formData[key] === "string" ? formData[key].trim() : formData[key];
      const original = typeof orig[key] === "string" ? orig[key].trim() : orig[key];
      return curr !== original;
    });

    if (!hasChanges) {
      toast("No changes to save.", { icon: "ℹ️" });
      return;
    }

    setSaving(true);
    setErrors({});
    setFormError("");
    try {
      const response = await branchService.update(id, {
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
      toast.success("Branch updated successfully");
      if (isEmbed && onComplete) {
        onComplete(response);
      } else {
        navigate(-1);
      }
    } catch (err) {
      const data = err?.response?.data;
      if (data?.non_field_errors?.length) {
        setFormError(data.non_field_errors[0]);
        toast.error(data.non_field_errors[0]);
      } else if (data && typeof data === "object" && !Array.isArray(data)) {
        const hasFieldErrors = Object.values(data).some((value) => Array.isArray(value));
        if (hasFieldErrors) {
          setErrors(data);
        } else {
          setFormError(data.detail || data.message || "Failed to update branch");
        }
      } else {
        setFormError("Failed to update branch");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await branchService.delete(id);
      toast.success("Branch deleted successfully");
      navigate(-1);
    } catch {
      toast.error("Failed to delete branch");
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

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-24 ${isEmbed ? "" : "min-h-screen bg-slate-50/50"}`}>
        {!isEmbed && <OwnerHeader />}
        <div className="h-12 w-12 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" />
      </div>
    );
  }

  const formContent = (
    <div className={`space-y-6 ${isEmbed ? "" : "max-w-4xl mx-auto px-4 sm:px-6 py-10"}`}>
      {!isEmbed && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <BackButton to="/business/branch" label="Back to Branches" />
          {!formData.is_default && (
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="group flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white border border-red-100 text-red-600 text-sm font-bold hover:bg-red-50 transition-all shadow-sm active:scale-95"
            >
              <FaTrash className="text-xs transition-transform group-hover:-rotate-12" />
              Remove Branch
            </button>
          )}
        </div>
      )}

      {/* Header Section */}
      {!isEmbed && (
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
                <FaCodeBranch className="text-2xl" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-1 font-display">Edit Branch</h1>
                <p className="text-slate-500 text-sm md:text-base font-medium leading-relaxed max-w-xl">Update branch operational details and manage primary branch status.</p>
              </div>
            </div>
          </div>
          {formError && <div className="mt-6 flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium"><FaSpinner className="animate-spin shrink-0" />{formError}</div>}
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <section className={`bg-white ${isEmbed ? "" : "rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8"}`}>
          <div className={`grid grid-cols-1 ${isEmbed ? "gap-4" : "md:grid-cols-2 gap-x-10 gap-y-8"}`}>
            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 ml-2">Branch Name <span className="text-brand-500">*</span></label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full min-h-[44px] px-1 pl-2 py-2 border-b-2 border-slate-200 focus:border-brand-500 bg-transparent text-sm text-slate-800 font-medium placeholder:text-slate-400 outline-none transition-colors duration-150" placeholder="e.g. Downtown Hub" />
              {errors.name && <p className="text-[11px] font-bold text-red-500 mt-1 ml-2">{errors.name[0]}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 ml-2">Contact Number</label>
              <input type="text" name="contact_number" value={formData.contact_number} onChange={handleChange} className="w-full min-h-[44px] px-1 pl-2 py-2 border-b-2 border-slate-200 focus:border-brand-500 bg-transparent text-sm text-slate-800 font-medium placeholder:text-slate-400 outline-none transition-colors duration-150" placeholder="e.g. +91 98765 43210" />
              {errors.contact_number && <p className="text-[11px] font-bold text-red-500 mt-1 ml-2">{errors.contact_number[0]}</p>}
            </div>

            <div className="md:col-span-2 pt-4 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 ml-2">Location Details</h3>
              <button type="button" onClick={handleUseCurrentLocation} disabled={locatingAddress} className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-50">
                {locatingAddress ? <FaSpinner className="animate-spin" /> : <FaLocationArrow className="transition-transform group-hover:rotate-12" />}
                {locatingAddress ? "Locating..." : "Use GPS"}
              </button>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Address Line 1</label>
              <input type="text" name="address_line_1" value={formData.address_line_1} onChange={handleChange} placeholder="Street, Area, Building" className="w-full min-h-[44px] px-1 pl-2 py-2 border-b-2 border-slate-200 focus:border-brand-500 bg-transparent text-sm text-slate-800 font-medium placeholder:text-slate-400 outline-none transition-colors duration-150" />
              {errors.address_line_1 && <p className="text-[11px] font-bold text-red-500 mt-1 ml-2">{errors.address_line_1[0]}</p>}
            </div>

            <div className={`grid ${isEmbed ? "grid-cols-1 sm:grid-cols-2 gap-4" : "grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8"} md:col-span-2`}>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">City</label>
                <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full min-h-[44px] px-1 pl-2 py-2 border-b-2 border-slate-200 focus:border-brand-500 bg-transparent text-sm text-slate-800 font-medium placeholder:text-slate-400 outline-none transition-colors duration-150" placeholder="City" />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">State</label>
                <input type="text" name="state" value={formData.state} onChange={handleChange} className="w-full min-h-[44px] px-1 pl-2 py-2 border-b-2 border-slate-200 focus:border-brand-500 bg-transparent text-sm text-slate-800 font-medium placeholder:text-slate-400 outline-none transition-colors duration-150" placeholder="State" />
              </div>
            </div>
          </div>

          <div className="mt-10 p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-xl transition-colors ${formData.is_default ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-400"}`}>
                <FaCheckCircle size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Main Branch Status</h4>
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-tight">{formData.is_default ? "Primary branch set." : "Enable to set as primary."}</p>
              </div>
            </div>
            <button type="button" onClick={() => setFormData((prev) => ({ ...prev, is_default: !prev.is_default }))} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ${formData.is_default ? "bg-brand-600" : "bg-slate-300"}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${formData.is_default ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </section>

        <div className={`pt-6 flex ${isEmbed ? "flex-col" : "sm:flex-row"} items-center justify-center gap-4`}>
          {!isEmbed && (
            <button type="button" onClick={() => navigate(-1)} className="group flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-base text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all duration-300 shadow-sm">
              <FaTimes className="text-slate-400 group-hover:text-slate-600 transition-colors" />
              Cancel
            </button>
          )}
          <button type="submit" disabled={saving} className={`group relative flex items-center justify-center gap-3 w-full py-4 rounded-xl font-bold text-base text-white transition-all duration-300 shadow-lg ${saving ? "bg-brand-400 cursor-not-allowed" : "bg-brand-600 hover:bg-brand-700 hover:shadow-brand-200 hover:-translate-y-1 active:scale-95"}`}>
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FaCheck className="text-lg" />}
            <span className="tracking-tight">{saving ? "Updating..." : "Save Branch Updates"}</span>
          </button>
        </div>
      </form>
    </div>
  );

  if (isEmbed) return formContent;

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans">
      <OwnerHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {formContent}
      </main>
      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Branch" message={`Are you sure you want to delete the branch "${formData.name}"? This action cannot be undone.`} onConfirm={handleDelete} confirmText="Delete Branch" type="danger" />
    </div>
  );
}
