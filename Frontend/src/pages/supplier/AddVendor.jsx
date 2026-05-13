import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
    FaBuilding,
    FaEnvelope,
    FaIdCard,
    FaMapMarkerAlt,
    FaPhone,
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
                const businessId =
                    vendor.supplier_business_id ??
                    vendor.supplier_business?.id ??
                    vendor.supplier_business ??
                    null;
                const samePlatform = Boolean(vendor.same_platform);
                const loadedData = {
                    name: vendor.name || "",
                    contact_person: vendor.contact_person || "",
                    email: vendor.email || "",
                    mobile_number: vendor.mobile_number || "",
                    gst_number: vendor.gst_number || "",
                    address: vendor.address || "",
                    same_platform: samePlatform,
                    supplier_business_id: samePlatform && businessId ? String(businessId) : "",
                };

                setFormData(loadedData);
                initialDataRef.current = loadedData;

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
    }, [id, isEditMode, loadBusinesses, navigate]);

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

    return (
        <div className="min-h-screen bg-slate-50/30">
            <ProtectedHeader />

            <main className="max-w-3xl mx-auto px-4 pt-6 pb-12">
                <div className="mb-4 flex items-center justify-between">
                    <BackButton label="Back" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">Vendor Management</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <header className="px-5 py-4 bg-white border-b border-slate-100 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-md">
                            <FaTruck size={14} />
                        </div>
                        <div>
                            <h1 className="text-base font-black text-slate-900 tracking-tight leading-tight">
                                {isEditMode ? "Modify Vendor" : "Create Vendor"}
                            </h1>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Supply Chain & Procurement</p>
                        </div>
                    </header>

                    {loadingForm ? (
                        <div className="p-10 flex flex-col items-center justify-center text-slate-300 text-[10px] font-bold uppercase tracking-widest gap-3">
                            <FaSpinner className="animate-spin text-lg" />
                            Synchronizing...
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-5 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Vendor Entity <span className="text-red-500">*</span></label>
                                    <div className="relative group">
                                        <FaBuilding className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-800 transition" size={11} />
                                        <input
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full rounded-lg border border-slate-100 pl-9 pr-4 py-2 text-sm font-bold bg-slate-50 text-slate-900 placeholder-slate-300 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all"
                                            placeholder="e.g. Acme Corp"
                                        />
                                    </div>
                                    {getErrorText(errors.name) && <p className="text-red-500 text-[8px] font-bold mt-1 ml-1 uppercase">{getErrorText(errors.name)}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Contact Person</label>
                                    <div className="relative group">
                                        <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-800 transition" size={11} />
                                        <input
                                            name="contact_person"
                                            value={formData.contact_person}
                                            onChange={handleChange}
                                            className="w-full rounded-lg border border-slate-100 pl-9 pr-4 py-2 text-sm font-bold bg-slate-50 text-slate-900 placeholder-slate-300 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all"
                                            placeholder="Lead Contact"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Business Email</label>
                                    <div className="relative group">
                                        <FaEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-800 transition" size={11} />
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full rounded-lg border border-slate-100 pl-9 pr-4 py-2 text-sm font-bold bg-slate-50 text-slate-900 placeholder-slate-300 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all"
                                            placeholder="vendor@domain.com"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mobile Access</label>
                                    <div className="relative group">
                                        <FaPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-800 transition" size={11} />
                                        <input
                                            name="mobile_number"
                                            value={formData.mobile_number}
                                            onChange={handleChange}
                                            className="w-full rounded-lg border border-slate-100 pl-9 pr-4 py-2 text-sm font-bold bg-slate-50 text-slate-900 placeholder-slate-300 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all"
                                            placeholder="Primary Phone"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tax ID / GST</label>
                                    <div className="relative group">
                                        <FaIdCard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-800 transition" size={11} />
                                        <input
                                            name="gst_number"
                                            value={formData.gst_number}
                                            onChange={handleChange}
                                            className="w-full rounded-lg border border-slate-100 pl-9 pr-4 py-2 text-sm font-bold bg-slate-50 text-slate-900 placeholder-slate-300 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all"
                                            placeholder="Registration #"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Dispatch Address</label>
                                    <div className="relative group">
                                        <FaMapMarkerAlt className="absolute left-3.5 top-3 text-slate-300 group-focus-within:text-slate-800 transition" size={11} />
                                        <textarea
                                            rows={2}
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            className="w-full rounded-lg border border-slate-100 pl-9 pr-4 py-2 text-sm font-medium bg-slate-50 text-slate-900 placeholder-slate-300 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all resize-none"
                                            placeholder="Street, City, Zip"
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5">
                                        <input
                                            type="checkbox"
                                            name="same_platform"
                                            id="same_platform"
                                            checked={formData.same_platform}
                                            onChange={handleChange}
                                            className="h-3.5 w-3.5 rounded border-slate-200 text-slate-800 focus:ring-slate-800/5"
                                        />
                                        <label htmlFor="same_platform" className="text-[10px] text-slate-600 font-bold uppercase tracking-widest cursor-pointer">
                                            Enable Platform Interconnect
                                        </label>
                                    </div>
                                </div>

                                {formData.same_platform && (
                                    <div className="md:col-span-2 space-y-2 pt-2 border-t border-slate-50">
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <FaLink size={9} /> Link Registered Entity
                                        </label>
                                        <div className="relative" ref={businessWrapperRef}>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                    {fetchingBusinesses ? (
                                                        <FaSpinner className="animate-spin text-slate-300" size={11} />
                                                    ) : (
                                                        <FaSearch className="text-slate-300 group-focus-within:text-slate-800 transition-colors" size={11} />
                                                    )}
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Search database..."
                                                    value={businessSearch}
                                                    onChange={(e) => {
                                                        setBusinessSearch(e.target.value);
                                                        if (e.target.value.length > 0) setBusinessOpen(true);
                                                    }}
                                                    onFocus={() => setBusinessOpen(true)}
                                                    className="block w-full pl-9 pr-9 py-2 rounded-lg text-sm font-bold border border-slate-100 bg-slate-50 text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-800/5 focus:border-slate-800 transition-all"
                                                />
                                                {businessSearch && (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setBusinessSearch(""); setBusinessOpen(true); loadBusinesses(); }}
                                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-300 hover:text-slate-800 transition-colors"
                                                    >
                                                        <FaTimes size={10} />
                                                    </button>
                                                )}
                                            </div>

                                            {businessOpen && (businesses.length > 0 || fetchingBusinesses) && (
                                                <div className="bg-white border border-slate-200 absolute z-[90] mt-1 w-full rounded-xl shadow-xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                                                    {businesses.length === 0 && !fetchingBusinesses ? (
                                                        <div className="p-4 text-center text-slate-300 text-[9px] font-bold uppercase tracking-widest italic">
                                                            No matches found
                                                        </div>
                                                    ) : (
                                                        <div className="py-1">
                                                            {businesses.map((biz) => (
                                                                <button
                                                                    key={biz.id}
                                                                    type="button"
                                                                    onClick={() => handleBusinessSelect(biz)}
                                                                    className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center gap-3 ${String(formData.supplier_business_id) === String(biz.id) ? "bg-slate-50" : ""}`}
                                                                >
                                                                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
                                                                        <FaBuilding size={12} />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="font-bold text-slate-900 text-[11px] truncate">{biz.name}</p>
                                                                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">ID: {biz.id}</p>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                            {businessNext && (
                                                                <div className="px-3 pb-3 pt-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={loadMoreBusinesses}
                                                                        disabled={loadingMoreBusinesses}
                                                                        className="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 transition hover:border-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
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
                                            <p className="text-[10px] text-slate-500 font-medium">
                                                Selected business: <span className="font-semibold text-slate-800">{selectedBusiness.name}</span> (ID: {selectedBusiness.id})
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-50">
                                <button
                                    type="button"
                                    onClick={() => navigate(-1)}
                                    className="px-5 py-2 rounded-lg text-slate-400 font-bold uppercase tracking-widest text-[9px] hover:text-slate-900 hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-9 py-2.5 rounded-xl bg-slate-800 text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200 hover:bg-slate-700 transition-all disabled:opacity-50 active:scale-95"
                                >
                                    {saving ? "Processing..." : isEditMode ? "Confirm Update" : "Establish Vendor"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
}
