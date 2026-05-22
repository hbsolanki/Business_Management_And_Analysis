import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
    FaBuilding,
    FaEnvelope,
    FaPhone,
    FaSearch,
    FaSpinner,
    FaTimes,
    FaUser,
} from "react-icons/fa";

import ProtectedHeader from "@/components/layout/ProtectedHeader";
import BackButton from "@/components/shared/BackButton";
import { businessService } from "@/features/business/services/businessService";
import { customerService } from "@/features/customer/services/customerService";
import { extractFirstError } from "@/features/supplier/utils/supplierHelpers";
import api from "@/services/api";

const INITIAL_FORM = {
    name: "",
    mobile_number: "",
    gender: "",
    age: "",
    email: "",
    same_platform: false,
    supplier_business_id: "",
};

function getErrorText(value) {
    if (!value) return null;
    if (Array.isArray(value)) return value[0];
    return String(value);
}

export default function AddCustomer({ isEmbed = false, id: embedId = null, onComplete = null, initialData = null }) {
    const navigate = useNavigate();
    const { id: routeId } = useParams();
    const id = embedId || routeId;
    const isEditMode = Boolean(id);

    const [formData, setFormData] = useState(INITIAL_FORM);
    const [initialFetchedData, setInitialFetchedData] = useState(null);
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
        if (initialData && !isEditMode) {
            setFormData({
                name: initialData.name || "",
                mobile_number: initialData.mobile_number || "",
                gender: initialData.gender || "",
                age: initialData.age ? String(initialData.age) : "",
                email: initialData.email || "",
                same_platform: Boolean(initialData.same_platform),
                supplier_business_id: initialData.supplier_business_id ? String(initialData.supplier_business_id) : "",
            });
        }
    }, [initialData, isEditMode]);

    useEffect(() => {
        if (!isEditMode) return;

        let isMounted = true;
        const loadCustomer = async () => {
            try {
                const res = await customerService.getById(id);
                if (!isMounted) return;

                const customer = res?.data || {};
                const samePlatform = Boolean(customer.same_platform);
                const loadedData = {
                    name: customer.name || "",
                    mobile_number: customer.mobile_number || "",
                    gender: customer.gender || "",
                    age: customer.age ? String(customer.age) : "",
                    email: customer.email || "",
                    same_platform: samePlatform,
                    supplier_business_id: samePlatform && customer.customer_business ? String(customer.customer_business) : "",
                };

                setFormData(loadedData);
                setInitialFetchedData(loadedData);

                if (samePlatform && customer.customer_business) {
                    const list = await loadBusinesses();
                    let selected = list.find((b) => String(b.id) === String(customer.customer_business)) || null;
                    if (!selected) {
                        try {
                            const bizRes = await businessService.get(customer.customer_business);
                            const biz = bizRes?.data;
                            if (biz) {
                                selected = biz;
                                setBusinesses((prev) => [...prev, biz]);
                            }
                        } catch (err) {
                            console.error("Failed to load customer business", err);
                        }
                    }
                    setSelectedBusiness(selected);
                    if (selected?.name) setBusinessSearch(selected.name);
                }
            } catch (error) {
                toast.error(extractFirstError(error, "Failed to load customer"));
                if (isEmbed && onComplete) { onComplete(null); return; }
                navigate(-1);
            } finally {
                if (isMounted) setLoadingForm(false);
            }
        };

        loadCustomer();
        return () => {
            isMounted = false;
        };
    }, [id, isEditMode, loadBusinesses, navigate]);

    useEffect(() => {
        if (!formData.same_platform) return;
        loadBusinesses();
    }, [formData.same_platform, loadBusinesses]);

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
            mobile_number: formData.mobile_number.trim(),
            gender: formData.gender || undefined,
            age: formData.age ? Number(formData.age) : undefined,
            email: formData.email.trim(),
            same_platform: Boolean(formData.same_platform),
            ...(formData.same_platform && formData.supplier_business_id
                ? { customer_business_id: Number(formData.supplier_business_id) }
                : {}),
        };

        // Note: name check removed from payload validation as per "send like this info only"
        if (!payload.mobile_number) {
            setErrors({ mobile_number: ["Mobile number is required"] });
            setSaving(false);
            return;
        }

        try {
            if (isEditMode) {
                // Calculate only changed fields
                const changedFields = {};
                
                // Fields to check
                const keys = [
                    'name', 'mobile_number', 'gender', 'age', 'email', 
                    'same_platform', 'supplier_business_id'
                ];

                keys.forEach(key => {
                    const originalValue = initialFetchedData?.[key];
                    const currentValue = payload[key] !== undefined ? payload[key] : null;
                    
                    // Normalize for comparison
                    const normOriginal = originalValue === "" ? null : originalValue;
                    const normCurrent = currentValue === "" ? null : currentValue;

                    if (normOriginal != normCurrent) {
                        // Special handling for age (string vs number)
                        if (key === 'age' && normOriginal !== null && normCurrent !== null && Number(normOriginal) === Number(normCurrent)) return;
                        // Special handling for same platform/integration
                        if (key === 'supplier_business_id' && !payload.same_platform && originalValue === null) return;
                        
                        changedFields[key] = normCurrent;
                    }
                });

                if (Object.keys(changedFields).length === 0) {
                    toast.success("No changes detected");
                    navigate(-1);
                    return;
                }

                const res = await customerService.update(id, changedFields);
                toast.success("Customer updated successfully");
                if (isEmbed && onComplete) { onComplete(res.data); return; }
            } else {
                const res = await customerService.create(payload);
                toast.success("Customer created successfully");
                if (isEmbed && onComplete) { onComplete(res.data); return; }
            }
            navigate(-1);
        } catch (error) {
            const responseErrors = error?.response?.data;
            if (responseErrors && typeof responseErrors === "object") {
                setErrors(responseErrors);
            } else {
                toast.error(extractFirstError(error, "Failed to save customer"));
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

    const formContent = (
        <div className={`bg-white ${isEmbed ? "" : "rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50"} overflow-hidden`}>
            {!isEmbed && (
                <header className="px-8 sm:px-10 py-8 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
                            <FaUser />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">{isEditMode ? "Edit Customer" : "Create Customer"}</h1>
                            <p className="text-sm text-slate-500">Manage customer identity and platform mapping.</p>
                        </div>
                    </div>
                </header>
            )}

            {loadingForm ? (
                <div className="p-10 flex items-center justify-center text-slate-500">
                    <FaSpinner className="animate-spin mr-2" />
                    Loading customer details...
                </div>
            ) : (
                <form onSubmit={handleSubmit} className={`${isEmbed ? "p-4 space-y-4" : "form-section p-8 space-y-6"}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Name field kept in UI for UX, but excluded from payload as per request */}
                                    <div>
                                        <label className={labelClass}>Customer Name <span className="text-red-500">*</span></label>
                                        <div className="relative group">
                                            <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                                            <input
                                                name="name"
                                                required
                                                value={formData.name}
                                                onChange={handleChange}
                                                className={`${inputClass("name")} pl-11`}
                                                placeholder="Customer name"
                                            />
                                        </div>
                                        {getErrorText(errors.name) && <p className="text-red-500 text-xs mt-2 font-medium">{getErrorText(errors.name)}</p>}
                                    </div>

                                    <div>
                                        <label className={labelClass}>Mobile Number <span className="text-red-500">*</span></label>
                                        <div className="relative group">
                                            <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                                            <input
                                                name="mobile_number"
                                                required
                                                value={formData.mobile_number}
                                                onChange={handleChange}
                                                className={`${inputClass("mobile_number")} pl-11`}
                                                placeholder="9876543210"
                                            />
                                        </div>
                                        {getErrorText(errors.mobile_number) && <p className="text-red-500 text-xs mt-2 font-medium">{getErrorText(errors.mobile_number)}</p>}
                                    </div>

                                    <div>
                                        <label className={labelClass}>Gender</label>
                                        <div className="relative group">
                                            <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                                            <select
                                                name="gender"
                                                value={formData.gender}
                                                onChange={handleChange}
                                                className={`${inputClass("gender")} pl-11`}
                                            >
                                                <option value="">Select gender</option>
                                                <option value="MALE">Male</option>
                                                <option value="FEMALE">Female</option>
                                                <option value="OTHER">Other</option>
                                            </select>
                                        </div>
                                        {getErrorText(errors.gender) && <p className="text-red-500 text-xs mt-2 font-medium">{getErrorText(errors.gender)}</p>}
                                    </div>

                                    <div>
                                        <label className={labelClass}>Age</label>
                                        <div className="relative group">
                                            <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                                            <input
                                                type="number"
                                                name="age"
                                                min="0"
                                                value={formData.age}
                                                onChange={handleChange}
                                                className={`${inputClass("age")} pl-11`}
                                                placeholder="Enter age"
                                            />
                                        </div>
                                        {getErrorText(errors.age) && <p className="text-red-500 text-xs mt-2 font-medium">{getErrorText(errors.age)}</p>}
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className={labelClass}>Email</label>
                                        <div className="relative group">
                                            <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                className={`${inputClass("email")} pl-11`}
                                                placeholder="user@example.com"
                                            />
                                        </div>
                                        {getErrorText(errors.email) && <p className="text-red-500 text-xs mt-2 font-medium">{getErrorText(errors.email)}</p>}
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
                                                Customer uses the same platform
                                            </span>
                                        </div>
                                        {getErrorText(errors.same_platform) && <p className="text-red-500 text-xs mt-2 font-medium">{getErrorText(errors.same_platform)}</p>}
                                    </div>

                                    {formData.same_platform && (
                                        <div className="md:col-span-2 space-y-3">
                                            <label className={labelClass}>Customer Business</label>
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
                                            {getErrorText(errors.customer_business || errors.supplier_business_id) && <p className="text-red-500 text-xs mt-2 font-medium">{getErrorText(errors.customer_business || errors.supplier_business_id)}</p>}
                                        </div>
                                    )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => { if (isEmbed && onComplete) { onComplete(null); } else { navigate(-1); } }}
                            className="px-5 py-2 rounded-lg text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-slate-900 hover:bg-slate-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-8 py-2.5 rounded-xl bg-slate-800 text-white font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-slate-700 transition-all disabled:opacity-50"
                        >
                            {saving ? "Processing..." : isEditMode ? "Update Customer" : "Create Customer"}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );

    if (isEmbed) return formContent;

    return (
        <div className="min-h-screen bg-transparent">
            <ProtectedHeader />
            <main className="max-w-3xl mx-auto px-4 pt-6 pb-12">
                <div className="mb-4">
                    <BackButton label="Back" />
                </div>
                {formContent}
            </main>
        </div>
    );
}
