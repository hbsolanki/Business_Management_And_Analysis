import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { gstProfileService } from "@/features/business/services/gstProfileService";
import BackButton from "@/components/shared/BackButton";
import {
    FaShieldAlt,
    FaCheck,
    FaFingerprint,
    FaLayerGroup
} from "react-icons/fa";

const REGISTRATION_TYPES = [
    { value: "REGULAR", label: "Regular" },
    { value: "COMPOSITION", label: "Composition" },
    { value: "UNREGISTERED", label: "Unregistered" },
];

export default function ComplianceSettings() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profileId, setProfileId] = useState(null);

    const [formData, setFormData] = useState({
        gstin: "",
        registration_type: "REGULAR",
        is_active: true
    });

    useEffect(() => {
        async function fetchGSTProfile() {
            try {
                const res = await gstProfileService.get();
                const data = res.data;
                // Handle paginated or non-paginated response
                const profile = Array.isArray(data) ? data[0] : (data.results ? data.results[0] : data);
                
                if (profile && typeof profile === 'object' && !Array.isArray(profile)) {
                    setProfileId(profile.id);
                    setFormData({
                        gstin: profile.gstin || "",
                        registration_type: profile.registration_type || "REGULAR",
                        is_active: profile.is_active ?? true
                    });
                }
            } catch (error) {
                console.error("Failed to load GST profile", error);
                toast.error("Failed to load compliance data");
            } finally {
                setLoading(false);
            }
        }
        fetchGSTProfile();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (profileId) {
                await gstProfileService.update(profileId, formData);
                toast.success("Compliance profile updated successfully");
            } else {
                await gstProfileService.create(formData);
                toast.success("Compliance profile created successfully");
            }
            navigate(-1);
        } catch (error) {
            const errorMsg = error.response?.data?.gstin?.[0] || "Update failed. Verify your GSTIN format.";
            toast.error(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 font-sans">
            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
                <div className="flex justify-start">
                    <BackButton />
                </div>

                {/* Professional White Header Section */}
                <div className="relative overflow-hidden rounded-[2rem] bg-white p-6 md:p-10 shadow-sm border border-slate-200">
                    <div className="absolute inset-0 opacity-[0.03]">
                        <div
                            className="absolute inset-0"
                            style={{
                                backgroundImage: "radial-gradient(circle at 2px 2px, #000 1px, transparent 0)",
                                backgroundSize: "24px 24px",
                            }}
                        ></div>
                    </div>

                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center gap-6">
                            <div className="h-14 w-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 shadow-sm text-slate-700">
                                <FaShieldAlt className="text-2xl" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-1">
                                    {profileId ? "Edit Compliance" : "Register Compliance"}
                                </h1>
                                <p className="text-slate-500 text-sm md:text-base font-medium leading-relaxed max-w-xl">
                                    {profileId 
                                        ? "Update your existing GST registration details and compliance status."
                                        : "Complete your business setup by providing your tax registration details."
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                        <div className="space-y-8">
                            {/* GSTIN */}
                            <div className="space-y-2">
                                <label htmlFor="gstin" className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">
                                    GSTIN Identification
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <FaFingerprint size={14} />
                                    </div>
                                    <input
                                        type="text"
                                        id="gstin"
                                        name="gstin"
                                        value={formData.gstin}
                                        onChange={handleChange}
                                        required
                                        className="w-full min-h-[48px] pl-10 pr-4 py-2 border-b-2 border-slate-200 focus:border-slate-900 bg-transparent text-sm text-slate-800 font-bold font-mono tracking-widest placeholder:text-slate-300 outline-none transition-colors duration-150"
                                        placeholder="22AAAAA0000A1Z5"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Registration Type */}
                                <div className="space-y-2">
                                    <label htmlFor="registration_type" className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">
                                        Registration Type
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <FaLayerGroup size={14} />
                                        </div>
                                        <select
                                            id="registration_type"
                                            name="registration_type"
                                            value={formData.registration_type}
                                            onChange={handleChange}
                                            className="w-full min-h-[48px] pl-10 pr-4 py-2 border-b-2 border-slate-200 focus:border-slate-900 bg-transparent text-sm text-slate-800 font-bold outline-none transition-colors duration-150 appearance-none cursor-pointer"
                                        >
                                            {REGISTRATION_TYPES.map(type => (
                                                <option key={type.value} value={type.value}>{type.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Active Status */}
                                <div className="flex items-end pb-2">
                                    <label className="relative inline-flex items-center cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            name="is_active"
                                            checked={formData.is_active}
                                            onChange={handleChange}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900 transition-colors"></div>
                                        <span className="ml-3 text-xs font-bold text-slate-600 uppercase tracking-wide group-hover:text-slate-900 transition-colors">
                                            {formData.is_active ? "Active" : "Inactive"} Profile
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Action Button */}
                    <div className="pt-6 flex flex-col items-center gap-6">
                        <button
                            type="submit"
                            disabled={saving}
                            className={`group relative flex items-center justify-center gap-3 px-10 py-4 rounded-xl font-bold text-base text-white transition-all duration-300 shadow-lg ${
                                saving
                                    ? "bg-slate-400 cursor-not-allowed"
                                    : "bg-slate-900 hover:bg-slate-800 hover:shadow-slate-200 hover:-translate-y-1 active:scale-95"
                            }`}
                        >
                            {saving ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span className="tracking-tight">
                                        {profileId ? "Updating..." : "Registering..."}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <FaCheck className="text-lg transition-transform duration-500 group-hover:scale-125" />
                                    <span className="tracking-tight">
                                        {profileId ? "Save Compliance Updates" : "Complete Registration"}
                                    </span>
                                </>
                            )}
                        </button>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            <FaShieldAlt className="text-emerald-500" />
                            Secure Compliance Management
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
}
