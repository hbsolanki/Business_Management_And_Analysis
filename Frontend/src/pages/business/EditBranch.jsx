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
} from "react-icons/fa";

export default function EditBranch() {
  const { id } = useParams();
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
      try {
        const res = await branchService.get(id);
        const data = res.data || {};
        const addr = data.address || {};
        setFormData({
          name: data.name || "",
          address_line_1: addr.address_line_1 || "",
          address_line_2: addr.address_line_2 || "",
          city: addr.city_name || "",
          state: addr.state_name || "",
          country: addr.country_name || "",
          pin_code: addr.pin_code || "",
          contact_number: data.contact_number || "",
          is_default: Boolean(data.is_default),
        });
        originalDataRef.current = {
          name: data.name || "",
          address_line_1: addr.address_line_1 || "",
          address_line_2: addr.address_line_2 || "",
          city: addr.city || "",
          state: addr.state_name || "",
          country: addr.country_name || "",
          pin_code: addr.pin_code || "",
          contact_number: data.contact_number || "",
          is_default: Boolean(data.is_default),
        };
      } catch {
        toast.error("Failed to load branch details");
        navigate("/business/branch");
      } finally {
        setLoading(false);
      }
    };
    fetchBranch();
  }, [id, navigate]);

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

    // Check if anything changed
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
      await branchService.update(id, {
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
      navigate(-1);
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
        // Fallback to display string if structured data is absent
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
      <div className="min-h-screen bg-slate-50">
        <OwnerHeader />
        <div className="flex items-center justify-center py-24">
          <div className="h-10 w-10 rounded-full border-2 border-slate-200 border-t-slate-700 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <OwnerHeader />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <BackButton to="/business/branch" label="Back to Branches" />
          {!formData.is_default ? (
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-semibold hover:bg-rose-100"
            >
              <FaTrash size={12} />
              Delete Branch
            </button>
          ) : null}
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <header className="px-5 sm:px-6 lg:px-8 py-5 sm:py-6 border-b border-slate-200">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <FaCodeBranch size={18} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Edit Branch</h1>
                <p className="text-sm text-slate-500 mt-1">Update branch details and primary branch settings.</p>
              </div>
            </div>
            {formError ? (
              <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {formError}
              </p>
            ) : null}
          </header>

          <form onSubmit={handleSubmit} className="px-5 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Branch Name
              </label>
              <div className="relative">
                <FaCodeBranch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Downtown Branch"
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
                />
              </div>
              {errors.name ? <p className="text-xs text-rose-600 mt-1">{errors.name[0]}</p> : null}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Contact Number
              </label>
              <div className="relative">
                <FaPhoneAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
                <input
                  type="text"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleChange}
                  placeholder="e.g. +91 9876543210"
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
                />
              </div>
              {errors.contact_number ? <p className="text-xs text-rose-600 mt-1">{errors.contact_number[0]}</p> : null}
            </div>

            {/* Address Section */}
            <div className="space-y-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Branch Address
                </label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locatingAddress}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {locatingAddress ? <FaSpinner className="animate-spin" size={11} /> : <FaLocationArrow size={11} />}
                  {locatingAddress ? "Fetching..." : "Use GPS"}
                </button>
              </div>

              {/* Address Line 1 */}
              <div>
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
                  <input
                    type="text"
                    name="address_line_1"
                    value={formData.address_line_1}
                    onChange={handleChange}
                    placeholder="Address Line 1 (Street, Area)"
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
                  />
                </div>
                {errors.address_line_1 ? <p className="text-xs text-rose-600 mt-1">{errors.address_line_1[0]}</p> : null}
              </div>

              {/* Address Line 2 */}
              <input
                type="text"
                name="address_line_2"
                value={formData.address_line_2}
                onChange={handleChange}
                placeholder="Address Line 2 (Landmark, Optional)"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
              />

              <div className="grid grid-cols-2 gap-4">
                {/* City */}
                <div>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="City"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
                  />
                  {errors.city ? <p className="text-xs text-rose-600 mt-1">{errors.city[0]}</p> : null}
                </div>
                {/* State */}
                <div>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="State"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
                  />
                  {errors.state ? <p className="text-xs text-rose-600 mt-1">{errors.state[0]}</p> : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Pin Code */}
                <div>
                  <input
                    type="text"
                    name="pin_code"
                    value={formData.pin_code}
                    onChange={handleChange}
                    placeholder="Pin Code"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
                  />
                  {errors.pin_code ? <p className="text-xs text-rose-600 mt-1">{errors.pin_code[0]}</p> : null}
                </div>
                {/* Country */}
                <div>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="Country"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
                  />
                  {errors.country ? <p className="text-xs text-rose-600 mt-1">{errors.country[0]}</p> : null}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  Main Branch
                  <FaCheckCircle className={formData.is_default ? "text-emerald-600" : "text-slate-300"} />
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formData.is_default
                    ? "This branch is currently the main location."
                    : "Enable this to make it your main branch."}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={formData.is_default}
                onClick={() => setFormData((prev) => ({ ...prev, is_default: !prev.is_default }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_default ? "bg-slate-900" : "bg-slate-300"}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${formData.is_default ? "translate-x-5" : "translate-x-0.5"}`}
                />
              </button>
            </div>

            <div className="pt-5 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full sm:w-auto sm:min-w-[150px] px-5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`w-full sm:w-auto sm:min-w-[170px] px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition ${saving ? "bg-slate-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800"}`}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </section>
      </main>

      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Branch"
        message={`Are you sure you want to delete the branch "${formData.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmText="Delete Branch"
        type="danger"
      />
    </div>
  );
}
