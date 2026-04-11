import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
    FaAddressCard,
    FaBuilding,
    FaCheckCircle,
    FaEnvelope,
    FaIdCard,
    FaMapMarkerAlt,
    FaPhone,
    FaSave,
    FaSearch,
    FaSpinner,
    FaTimes,
    FaTruck,
    FaUser,
    FaLink,
} from "react-icons/fa";

import ProtectedHeader from "@/components/layout/ProtectedHeader";
import BackButton from "@/components/shared/BackButton";
import { supplierService } from "@/features/supplier/services/supplierService";
import { extractFirstError } from "@/features/supplier/utils/supplierHelpers";
import { businessService } from "@/features/business/services/businessService";
import api from "@/services/api";

const INITIAL_FORM = {
    name: "",
    contact_person: "",
    email: "",
    mobile_number: "",
    gst_number: "",
    address: "",
    same_platform: false,
    supplier_business_id: "",
};

function getErrorText(value) {
    if (!value) return null;
    if (Array.isArray(value)) return value[0];
    return String(value);
}

export default function AddVendor() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const [formData, setFormData] = useState(INITIAL_FORM);
    const [errors, setErrors] = useState({});
    const [loadingForm, setLoadingForm] = useState(isEditMode);
    const [saving, setSaving] = useState(false);
    const [businesses, setBusinesses] = useState([]);
    const [businessSearch, setBusinessSearch] = useState("");
    const [fetchingBusinesses, setFetchingBusinesses] = useState(false);
    const [businessOpen, setBusinessOpen] = useState(false);
    const [selectedBusiness, setSelectedBusiness] = useState(null);
    const [businessNext, setBusinessNext] = useState(null);
    const [loadingMoreBusinesses, setLoadingMoreBusinesses] = useState(false);
    const businessWrapperRef = useRef(null);
    const initialDataRef = useRef(INITIAL_FORM);

    const mergeBusinesses = useCallback((current, incoming) => {
        const map = new Map(current.map((item) => [String(item.id), item]));
        incoming.forEach((item) => map.set(String(item.id), item));
        return Array.from(map.values());
    }, []);

    const loadBusinesses = useCallback(async (name = "") => {
        setFetchingBusinesses(true);
        try {
            const res = await businessService.list(name ? { name } : {});
            const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
            setBusinesses(data);
            setBusinessNext(res.data?.next || null);
            return data;
        } catch (error) {
            console.error("Failed to load businesses", error);
            return [];
        } finally {
            setFetchingBusinesses(false);
        }
    }, []);

    const loadMoreBusinesses = useCallback(async () => {
        if (!businessNext || loadingMoreBusinesses) return;
        setLoadingMoreBusinesses(true);
        try {
            const res = await api.get(businessNext);
            const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
            setBusinesses((prev) => mergeBusinesses(prev, data));
            setBusinessNext(res.data?.next || null);
        } catch (error) {
            console.error("Failed to load more businesses", error);
        } finally {
            setLoadingMoreBusinesses(false);
        }
    }, [businessNext, loadingMoreBusinesses, mergeBusinesses]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (businessWrapperRef.current && !businessWrapperRef.current.contains(event.target)) {
                setBusinessOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!formData.same_platform) return;
        const timer = setTimeout(() => {
            loadBusinesses(businessSearch.trim());
        }, 300);
        return () => clearTimeout(timer);
    }, [businessSearch, formData.same_platform, loadBusinesses]);

    useEffect(() => {
        if (!isEditMode) return;

        let isMounted = true;
        const loadVendor = async () => {
            try {
                const res = await supplierService.getVendorById(id);
                if (!isMounted) return;

                const vendor = res?.data || {};
                const loadedData = {
                    name: vendor.name || "",
                    contact_person: vendor.contact_person || "",
                    email: vendor.email || "",
                    mobile_number: vendor.mobile_number || "",
                    gst_number: vendor.gst_number || "",
                    address: vendor.address || "",
                    same_platform: Boolean(vendor.same_platform),
                    supplier_business_id: vendor.same_platform && businessId ? String(businessId) : "",
                };

                setFormData(nextForm);
                initialDataRef.current = nextForm;

                if (samePlatform && businessId) {
                    const list = await loadBusinesses();
                    let selected = list.find((b) => String(b.id) === String(businessId)) || null;
                    if (!selected) {
                        try {
                            const bizRes = await businessService.get(businessId);
                            const biz = bizRes?.data;
                            if (biz) {
                                selected = biz;
                                setBusinesses((prev) => [...prev, biz]);
                            }
                        } catch (err) {
                            console.error("Failed to load vendor business", err);
                        }
                    }
                    setSelectedBusiness(selected);
                    if (selected?.name) setBusinessSearch(selected.name);
                }
            } catch (error) {
                toast.error(extractFirstError(error, "Failed to load vendor"));
                navigate(-1);
            } finally {
                if (isMounted) setLoadingForm(false);
            }
        };

        loadVendor();
        return () => {
            isMounted = false;
        };
    }, [id, isEditMode, navigate]);

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;
        setFormData((prev) => {
            const nextValue = type === "checkbox" ? checked : value;
            const nextState = { ...prev, [name]: nextValue };

            if (name === "same_platform") {
                if (!checked) {
                    nextState.supplier_business_id = "";
                    setSelectedBusiness(null);
                    setBusinessSearch("");
                    setBusinessOpen(false);
                } else {
                    loadBusinesses();
                    setBusinessOpen(true);
                }
            }

            return nextState;
        });
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    const handleBusinessSelect = (biz) => {
        if (!biz) return;
        setSelectedBusiness(biz);
        setFormData((prev) => ({ ...prev, supplier_business_id: String(biz.id) }));
        setBusinessSearch(biz.name || "");
        setBusinessOpen(false);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setErrors({});

        const payload = {
            name: formData.name.trim(),
            contact_person: formData.contact_person.trim(),
            email: formData.email.trim(),
            mobile_number: formData.mobile_number.trim(),
            gst_number: formData.gst_number.trim(),
            address: formData.address.trim(),
            same_platform: Boolean(formData.same_platform),
            ...(formData.same_platform && formData.supplier_business_id
                ? { supplier_business_id: Number(formData.supplier_business_id) }
                : {}),
        };

        if (!payload.name) {
            setErrors({ name: ["Vendor name is required"] });
            setSaving(false);
            return;
        }

        try {
            if (isEditMode) {
                const initial = initialDataRef.current || {};
                const normalizeValue = (key, value) => {
                    if (["name", "contact_person", "email", "mobile_number", "gst_number", "address", "api_url"].includes(key)) {
                        return String(value || "").trim();
                    }
                    if (key === "integration_active" || key === "same_platform") return Boolean(value);
                    if (key === "supplier_business_id") return value ? Number(value) : null;
                    return value;
                };

                const normalizedInitial = {
                    name: normalizeValue("name", initial.name),
                    contact_person: normalizeValue("contact_person", initial.contact_person),
                    email: normalizeValue("email", initial.email),
                    mobile_number: normalizeValue("mobile_number", initial.mobile_number),
                    gst_number: normalizeValue("gst_number", initial.gst_number),
                    address: normalizeValue("address", initial.address),
                    same_platform: normalizeValue("same_platform", initial.same_platform),
                    supplier_business_id: normalizeValue("supplier_business_id", initial.supplier_business_id),
                };

                const normalizedPayload = {
                    name: normalizeValue("name", payload.name),
                    contact_person: normalizeValue("contact_person", payload.contact_person),
                    email: normalizeValue("email", payload.email),
                    mobile_number: normalizeValue("mobile_number", payload.mobile_number),
                    gst_number: normalizeValue("gst_number", payload.gst_number),
                    address: normalizeValue("address", payload.address),
                    same_platform: normalizeValue("same_platform", payload.same_platform),
                    supplier_business_id: normalizeValue("supplier_business_id", payload.supplier_business_id),
                };

                const patchPayload = {};
                Object.keys(normalizedPayload).forEach((key) => {
                    if (key === "supplier_business_id") return;
                    if (normalizedPayload[key] !== normalizedInitial[key]) {
                        patchPayload[key] = normalizedPayload[key];
                    }
                });

                if (payload.same_platform && normalizedPayload.supplier_business_id !== normalizedInitial.supplier_business_id) {
                    patchPayload.supplier_business_id = normalizedPayload.supplier_business_id;
                }

                if (Object.keys(patchPayload).length === 0) {
                    toast.success("No changes to update");
                    setSaving(false);
                    return;
                }

                await supplierService.updateVendor(id, patchPayload);
                toast.success("Vendor updated successfully");
            } else {
                await supplierService.createVendor(payload);
                toast.success("Vendor created successfully");
            }
            navigate(-1);
        } catch (error) {
            const responseErrors = error?.response?.data;
            if (responseErrors && typeof responseErrors === "object") {
                setErrors(responseErrors);
            } else {
                toast.error(extractFirstError(error, "Failed to save vendor"));
            }
        } finally {
            setSaving(false);
        }
    };

    const inputClass = (name) =>
        `w-full rounded-xl input-icon-left pr-4 py-3 text-sm ${errors[name]
            ? "border-red-500 focus:ring-2 focus:ring-red-200"
            : "border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 outline-none transition-all"
        }`;

    const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2";

    return (
        <div className="min-h-screen bg-transparent">
            <ProtectedHeader />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <BackButton label="Back" />

                <div className="max-w-3xl mx-auto">

                    <section className="form-card overflow-visible">
                        <header className="px-8 py-6 border-b border-slate-200 bg-slate-50 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                                {isEditMode ? <FaAddressCard /> : <FaTruck />}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900">
                                    {isEditMode ? "Edit Vendor" : "Create Vendor"}
                                </h1>
                                <p className="text-sm text-slate-500">
                                    Use clean labels and complete supplier details.
                                </p>
                            </div>
                        </header>

                        {loadingForm ? (
                            <div className="p-10 flex items-center justify-center text-slate-500">
                                <FaSpinner className="animate-spin mr-2" />
                                Loading vendor details...
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="form-section p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className={labelClass}>Vendor Name <span className="text-red-500">*</span></label>
                                        <div className="relative group">
                                            <FaBuilding className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                                            <input
                                                name="name"
                                                required
                                                value={formData.name}
                                                onChange={handleChange}
                                                className={`${inputClass("name")} pl-11`}
                                                placeholder="Enter vendor name"
                                            />
                                        </div>
                                        {getErrorText(errors.name) && <p className="text-red-500 text-xs mt-2 font-medium">{getErrorText(errors.name)}</p>}
                                    </div>

                                    <div>
                                        <label className={labelClass}>Contact Person</label>
                                        <div className="relative group">
                                            <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                                            <input
                                                name="contact_person"
                                                value={formData.contact_person}
                                                onChange={handleChange}
                                                className={`${inputClass("contact_person")} pl-11`}
                                                placeholder="Primary contact name"
                                            />
                                        </div>
                                        {getErrorText(errors.contact_person) && <p className="text-red-500 text-xs mt-2 font-medium">{getErrorText(errors.contact_person)}</p>}
                                    </div>

                                    <div>
                                        <label className={labelClass}>Email</label>
                                        <div className="relative group">
                                            <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                className={`${inputClass("email")} pl-11`}
                                                placeholder="vendor@example.com"
                                            />
                                        </div>
                                        {getErrorText(errors.email) && <p className="text-red-500 text-xs mt-2 font-medium">{getErrorText(errors.email)}</p>}
                                    </div>

                                    <div>
                                        <label className={labelClass}>Mobile Number</label>
                                        <div className="relative group">
                                            <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                                            <input
                                                name="mobile_number"
                                                value={formData.mobile_number}
                                                onChange={handleChange}
                                                className={`${inputClass("mobile_number")} pl-11`}
                                                placeholder="Enter mobile number"
                                            />
                                        </div>
                                        {getErrorText(errors.mobile_number) && <p className="text-red-500 text-xs mt-2 font-medium">{getErrorText(errors.mobile_number)}</p>}
                                    </div>

                                    <div>
                                        <label className={labelClass}>GST Number</label>
                                        <div className="relative group">
                                            <FaIdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                                            <input
                                                name="gst_number"
                                                value={formData.gst_number}
                                                onChange={handleChange}
                                                className={`${inputClass("gst_number")} pl-11`}
                                                placeholder="Enter GST number"
                                            />
                                        </div>
                                        {getErrorText(errors.gst_number) && <p className="text-red-500 text-xs mt-2 font-medium">{getErrorText(errors.gst_number)}</p>}
                                    </div>

                                    <div>
                                        <label className={labelClass}>Address</label>
                                        <div className="relative group">
                                            <FaMapMarkerAlt className="absolute left-4 top-4 text-slate-400 group-focus-within:text-brand-600 transition" />
                                            <textarea
                                                rows={3}
                                                name="address"
                                                value={formData.address}
                                                onChange={handleChange}
                                                className={`${inputClass("address")} pl-11`}
                                                placeholder="Vendor address"
                                            />
                                        </div>
                                        {getErrorText(errors.address) && <p className="text-red-500 text-xs mt-2 font-medium">{getErrorText(errors.address)}</p>}
                                    </div>



                                    <div className="md:col-span-2">
                                        <label className={labelClass}>Same Platform</label>
                                        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                            <input
                                                type="checkbox"
                                                name="same_platform"
                                                checked={formData.same_platform}
                                                onChange={handleChange}
                                                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                            />
                                            <span className="text-sm text-slate-700 font-medium">
                                                Vendor uses the same platform
                                            </span>
                                        </div>
                                        {getErrorText(errors.same_platform) && <p className="text-red-500 text-xs mt-2 font-medium">{getErrorText(errors.same_platform)}</p>}
                                    </div>

                                    {formData.same_platform && (
                                        <div className="md:col-span-2 space-y-3">
                                            <label className={labelClass}>Vendor Business</label>
                                            <div className="relative" ref={businessWrapperRef}>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        {fetchingBusinesses ? (
                                                            <FaSpinner className="animate-spin text-slate-500" />
                                                        ) : (
                                                            <FaSearch className="text-slate-400 group-focus-within:text-brand-600 transition-colors" />
                                                        )}
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Search business by name..."
                                                        value={businessSearch}
                                                        onChange={(e) => {
                                                            setBusinessSearch(e.target.value);
                                                            if (e.target.value.length > 0) setBusinessOpen(true);
                                                        }}
                                                        onFocus={() => setBusinessOpen(true)}
                                                        className="block w-full input-icon-left input-icon-right py-3 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-500 transition-all text-sm font-medium border border-slate-200 bg-white"
                                                    />
                                                    {businessSearch && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setBusinessSearch("");
                                                                setBusinessOpen(true);
                                                                loadBusinesses();
                                                            }}
                                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                                        >
                                                            <FaTimes />
                                                        </button>
                                                    )}
                                                </div>

                                                {businessOpen && (businesses.length > 0 || fetchingBusinesses) && (
                                                    <div className="bg-white border border-slate-200 absolute z-[90] mt-2 w-full rounded-xl shadow-lg max-h-80 overflow-y-auto custom-scrollbar animate-fade-in-up">
                                                        {businesses.length === 0 && !fetchingBusinesses ? (
                                                            <div className="p-4 text-center text-slate-500 text-sm">
                                                                No business found{businessSearch ? ` matching "${businessSearch}"` : ""}
                                                            </div>
                                                        ) : (
                                                            <div className="py-2">
                                                                <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50">
                                                                    {fetchingBusinesses ? "Loading..." : `Found ${businesses.length} businesses`}
                                                                </div>
                                                                {businesses.map((biz) => (
                                                                    <button
                                                                        key={biz.id}
                                                                        type="button"
                                                                        onClick={() => handleBusinessSelect(biz)}
                                                                        className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between group border-b border-slate-100 last:border-0 ${String(formData.supplier_business_id) === String(biz.id) ? "bg-brand-50" : ""}`}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-slate-700 transition-colors">
                                                                                <FaBuilding />
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-semibold text-slate-900 text-sm">{biz.name}</p>
                                                                                <p className="text-[10px] text-slate-500 font-mono">ID: {biz.id}</p>
                                                                            </div>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                                {businessNext && (
                                                                    <div className="px-4 py-3">
                                                                        <button
                                                                            type="button"
                                                                            onClick={loadMoreBusinesses}
                                                                            disabled={loadingMoreBusinesses}
                                                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-60"
                                                                        >
                                                                            {loadingMoreBusinesses ? "Loading..." : "Load more businesses"}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {selectedBusiness && (
                                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                                    Selected business: <span className="font-semibold text-slate-800">{selectedBusiness.name}</span> (ID: {selectedBusiness.id})
                                                </div>
                                            )}
                                            {getErrorText(errors.supplier_business_id) && <p className="text-red-500 text-xs mt-2 font-medium">{getErrorText(errors.supplier_business_id)}</p>}
                                        </div>
                                    )}
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
                                        className={`btn-primary inline-flex items-center gap-2 ${saving ? "opacity-70 cursor-not-allowed" : ""}`}
                                    >
                                        <FaSave />
                                        {saving ? "Saving..." : isEditMode ? "Update Vendor" : "Create Vendor"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
