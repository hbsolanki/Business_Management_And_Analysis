import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { managerService } from "@/features/manager/services/managerService";
import { branchService } from "@/features/business/services/branchService";
import OwnerHeader from "@/components/layout/OwnerHeader";
import BackButton from "@/components/shared/BackButton";
import { FaUser, FaEnvelope, FaPhone, FaIdCard, FaCamera, FaMoneyBillWave, FaSearch } from "react-icons/fa";
import { toast } from "react-hot-toast";

const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2";
const inputClass = (hasError, withIcon = true) =>
    `block w-full ${withIcon ? "input-icon-left" : ""} pr-4 py-2.5 rounded-xl text-sm bg-white text-slate-700 placeholder-slate-400 border outline-none transition-all ${hasError
        ? "border-rose-400 focus:ring-2 focus:ring-rose-200"
        : "border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
    }`;
const getErrorText = (error) => {
    if (!error) return null;
    if (Array.isArray(error)) return error[0];
    return String(error);
};

export default function EditManager() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        username: "",
        mobile_number: "",
        salary: "",
        role: "",
        password: "",
        description: "",
        image: null,
        imagePreview: "",
        branch_ids: [],
    });

    const [branchSearch, setBranchSearch] = useState("");
    const [branches, setBranches] = useState([]);
    const [selectedBranchesData, setSelectedBranchesData] = useState([]);
    const [fetchingBranches, setFetchingBranches] = useState(false);
    const [errors, setErrors] = useState({});

    const originalData = useRef({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [roleConfirm, setRoleConfirm] = useState({ open: false, nextRole: "" });
    const detailErrors = errors.employee_details || {};

    const fetchBranches = useCallback(async (name = "") => {
        setFetchingBranches(true);
        try {
            const res = await branchService.list(name ? { name } : {});
            if (Array.isArray(res.data)) {
                setBranches(res.data);
            } else if (res.data?.results) {
                setBranches(res.data.results);
            }
        } catch (err) {
            console.error("Failed to fetch branches", err);
        } finally {
            setFetchingBranches(false);
        }
    }, []);

    const fetchManager = useCallback(async () => {
        try {
            const res = await managerService.getById(id);
            const data = res.data;
            const user = data.user || data || {};
            const details = data.employee_details || data.employee_detail || {};
            const addressSource = details.address || data.address || {};

            const fetchedData = {
                first_name: user.first_name || "",
                last_name: user.last_name || "",
                email: user.email || "",
                username: user.username || "",
                mobile_number: user.mobile_number || "",
                address_data: {
                    address_line_1: addressSource.address_line_1 || "",
                    address_line_2: addressSource.address_line_2 || "",
                    city: addressSource.city_name || addressSource.city || "",
                    state: addressSource.state_name || addressSource.state || "",
                    country: addressSource.country_name || addressSource.country || "",
                    pin_code: addressSource.pin_code || "",
                },
                salary: details.salary !== undefined && details.salary !== null
                    ? String(details.salary)
                    : (data.salary !== undefined && data.salary !== null ? String(data.salary) : ""),
                role: data.role || "MANAGER",
                description: details.bio || details.description || data.description || "",
                branch_ids: Array.isArray(data.assigned_branches) && data.assigned_branches.length > 0
                    ? data.assigned_branches.map(b => b.id)
                    : (data.branch_ids ||
                        (Array.isArray(data.branch) ? data.branch.map(b => b.id) :
                            (Array.isArray(data.branches) ? (typeof data.branches[0] === 'object' ? data.branches.map(b => b.id) : data.branches) :
                                (data.branch_data?.id ? [data.branch_data.id] :
                                    (data.branch_id ? [data.branch_id] : []))))),
            };

            originalData.current = { ...fetchedData };

            setFormData({
                ...fetchedData,
                password: "",
                image: null,
                imagePreview: data.profile_picture || data.image || "",
            });

            // Store branch objects for display (prefer assigned_branches)
            const branchSource = data.assigned_branches || data.branch || data.branches;
            if (Array.isArray(branchSource) && typeof branchSource[0] === 'object') {
                setSelectedBranchesData(branchSource);
            }
        } catch (err) {
            console.error("Failed to fetch manager", err);
            toast.error("Failed to load manager details");
            navigate("/manager/manage");
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchBranches();
        fetchManager();
    }, [fetchBranches, fetchManager]);

    const handleSearch = () => {
        fetchBranches(branchSearch);
    };

    const handleChange = (e) => {
        let { name, value, files } = e.target;

        if (name === "mobile_number") {
            value = value.replace(/\D/g, "").slice(0, 10);
        }

        if (name === "image") {
            const file = files[0];
            if (file) {
                setFormData(prev => ({
                    ...prev,
                    image: file,
                    imagePreview: URL.createObjectURL(file),
                }));
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value,
            }));
            if (errors[name]) {
                setErrors(prev => ({ ...prev, [name]: null }));
            }
        }
    };

    const roleRank = { EMPLOYEE: 1, MANAGER: 2, OWNER: 3 };
    const shouldConfirmRoleChange = (nextRole) => {
        const currentRole = formData.role || "MANAGER";
        return (roleRank[nextRole] || 0) > (roleRank[currentRole] || 0);
    };

    const handleRoleChange = (nextRole) => {
        if (shouldConfirmRoleChange(nextRole)) {
            setRoleConfirm({ open: true, nextRole });
            return;
        }
        setFormData((prev) => ({ ...prev, role: nextRole }));
    };

    const handleBranchChange = (branchId) => {
        setFormData(prev => {
            const branch_ids = prev.branch_ids.includes(branchId)
                ? prev.branch_ids.filter(id => id !== branchId)
                : [...prev.branch_ids, branchId];
            return { ...prev, branch_ids };
        });
        if (errors.branch_ids) setErrors(prev => ({ ...prev, branch_ids: null }));
        if (errors.branch_id) setErrors(prev => ({ ...prev, branch_id: null }));
    };



    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});

        const normalize = (value) => {
            if (Array.isArray(value)) return JSON.stringify(value.sort());
            if (value && typeof value === "object") return JSON.stringify(value);
            return (value === null || value === undefined ? "" : String(value));
        };
        const fieldsToCheck = ["first_name", "last_name", "email", "username", "mobile_number", "role"];
        const userUpdates = {};

        fieldsToCheck.forEach((field) => {
            if (normalize(formData[field]) !== normalize(originalData.current[field])) {
                userUpdates[field] = formData[field];
            }
        });

        const updates = {};
        if (Object.keys(userUpdates).length > 0) {
            updates.user = userUpdates;
        }

        const detailUpdates = {};
        if (normalize(formData.salary) !== normalize(originalData.current.salary)) {
            const salaryValue = formData.salary !== "" ? Number(formData.salary) : null;
            detailUpdates.salary = Number.isFinite(salaryValue) ? salaryValue : formData.salary;
        }
        if (normalize(formData.description) !== normalize(originalData.current.description)) {
            detailUpdates.bio = formData.description || "";
        }
        if (normalize(formData.address_data) !== normalize(originalData.current.address_data)) {
            detailUpdates.address = formData.address_data;
        }
        if (Object.keys(detailUpdates).length > 0) {
            updates.employee_details = detailUpdates;
        }

        // Convert branch_ids to assigned_branches format
        if (normalize(formData.branch_ids) !== normalize(originalData.current.branch_ids)) {
            updates.assigned_branches = formData.branch_ids.map(id => ({ id }));
        }

        if (formData.password) {
            if (!updates.user) updates.user = {};
            updates.user.password = formData.password;
        }

        const hasFile = Boolean(formData.image);
        const hasChanges = hasFile || Object.keys(updates).length > 0;

        if (!hasChanges) {
            toast("No changes to save", { icon: "ℹ️" });
            setSaving(false);
            return;
        }

        let payload = updates;
        if (hasFile) {
            payload = new FormData();
            Object.entries(updates).forEach(([key, value]) => {
                if (value === undefined) return;
                if (Array.isArray(value) || (value && typeof value === "object")) {
                    payload.append(key, JSON.stringify(value));
                } else {
                    payload.append(key, value);
                }
            });
            if (formData.image) {
                payload.append("profile_picture", formData.image);
            }
        }

        try {
            await managerService.update(id, payload);
            toast.success("Manager updated successfully");
            navigate(-1);
        } catch (err) {
            console.error("Update failed", err);
            if (err.response?.data && typeof err.response.data === 'object' && !Array.isArray(err.response.data)) {
                setErrors(err.response.data);
            }
            const errorMsg = err.response?.data?.non_field_errors?.[0]
                || err.response?.data?.detail
                || (err.response?.data?.branch_id?.[0])
                || (err.response?.data?.branch_ids?.[0])
                || "Failed to update manager";
            toast.error(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-12 bg-transparent">
            <OwnerHeader />

            <main className="form-shell pt-8">
                <div className="mb-6">
                    <BackButton to="/manager/manage" label="Back to Managers" />
                </div>

                <div className="form-card overflow-hidden">
                    <div className="form-header bg-slate-50">
                        <div className="form-header-icon">
                            <FaUser />
                        </div>
                        <div>
                            <h1 className="form-title">Edit Manager</h1>
                            <p className="form-subtitle">Update manager details and permissions.</p>
                        </div>
                    </div>

                    <div className="form-section p-8">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-8 rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="relative h-20 w-20 rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden">
                                <img
                                    src={formData.imagePreview || "https://placehold.co/150"}
                                    alt="Profile"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-slate-900">Profile photo</p>
                                <label htmlFor="image-upload" className="btn-secondary inline-flex items-center gap-2 cursor-pointer">
                                    <FaCamera size={14} />
                                    Change photo
                                    <input
                                        id="image-upload"
                                        type="file"
                                        name="image"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleChange}
                                    />
                                </label>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Manager Details</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputField
                                        label="First Name"
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        icon={FaUser}
                                        error={errors.first_name}
                                    />
                                    <InputField
                                        label="Last Name"
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        icon={FaUser}
                                        error={errors.last_name}
                                    />
                                    <InputField
                                        label="Username"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        icon={FaIdCard}
                                        error={errors.username}
                                    />
                                    <InputField
                                        label="Email Address"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        icon={FaEnvelope}
                                        error={errors.email}
                                    />
                                    <InputField
                                        label="Mobile Number"
                                        name="mobile_number"
                                        value={formData.mobile_number}
                                        onChange={handleChange}
                                        icon={FaPhone}
                                        error={errors.mobile_number}
                                    />
                                    <InputField
                                        label="Salary"
                                        name="salary"
                                        type="number"
                                        value={formData.salary}
                                        onChange={handleChange}
                                        icon={FaMoneyBillWave}
                                        placeholder="Monthly salary"
                                        error={detailErrors.salary || errors.salary}
                                    />
                                    <div>
                                        <label className={labelClass}>Role</label>
                                        <div className="relative">
                                            <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <select
                                                name="role"
                                                value={formData.role}
                                                onChange={(e) => handleRoleChange(e.target.value)}
                                                className={`${inputClass(Boolean(getErrorText(errors.role)))} appearance-none`}
                                            >
                                                <option value="OWNER">Owner</option>
                                                <option value="MANAGER">Manager</option>
                                                <option value="EMPLOYEE">Employee</option>
                                            </select>
                                            <svg
                                                className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </div>
                                        {getErrorText(errors.role) && (
                                            <p className="text-rose-600 text-xs mt-2 font-medium">{getErrorText(errors.role)}</p>
                                        )}
                                    </div>
                                    <InputField
                                        label="New Password"
                                        name="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Leave blank to keep current"
                                        icon={FaIdCard}
                                        error={errors.password}
                                    />
                                </div>
                            </section>

                            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Branches</p>
                                        <p className="text-xs text-slate-500 mt-1">Manage branch access for this manager.</p>
                                    </div>
                                    <div className="relative w-full sm:w-64">
                                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" size={12} />
                                        <input
                                            type="text"
                                            placeholder="Search branches..."
                                            value={branchSearch}
                                            onChange={(e) => setBranchSearch(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                                            className="w-full pl-9 pr-12 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 outline-none transition-all bg-white"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSearch}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-600 hover:text-brand-700 text-[10px] font-bold uppercase"
                                        >
                                            Search
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 min-h-[120px]">
                                    {fetchingBranches ? (
                                        <div className="col-span-full py-8 flex flex-col items-center justify-center gap-2">
                                            <div className="animate-spin h-5 w-5 border-2 border-slate-300 border-t-slate-900 rounded-full"></div>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Searching branches...</p>
                                        </div>
                                    ) : (branches.length > 0 || formData.branch_ids.length > 0) ? (
                                        Array.from(new Map([
                                            ...selectedBranchesData.filter(b => formData.branch_ids.includes(b.id)).map(b => [String(b.id), b]),
                                            ...branches.map(b => [String(b.id), b]),
                                        ].filter(x => x[1])).values()).map(b => (
                                            <label key={b.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors group border border-transparent hover:border-slate-200">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.branch_ids.includes(b.id)}
                                                    onChange={() => handleBranchChange(b.id)}
                                                    className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500 cursor-pointer"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-slate-700 truncate">{b.name}</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {b.is_default && <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">Main Branch</span>}
                                                        {formData.branch_ids.includes(b.id) && (
                                                            <span className="text-[9px] font-bold text-brand-600 uppercase tracking-tighter">Manager Branch</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </label>
                                        ))
                                    ) : (
                                        <div className="col-span-full py-8 flex flex-col items-center justify-center text-slate-400">
                                            <FaSearch size={24} className="mb-2 opacity-20" />
                                            <p className="text-sm font-medium">No branches found matching "{branchSearch}"</p>
                                        </div>
                                    )}
                                </div>
                                {errors.branch_ids && <p className="text-rose-600 text-xs font-medium">{errors.branch_ids[0]}</p>}
                                {errors.branch_id && <p className="text-rose-600 text-xs font-medium">{errors.branch_id[0]}</p>}
                            </section>

                            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                                <label className={labelClass}>Description / Notes</label>
                                <textarea
                                    name="description"
                                    rows={3}
                                    value={formData.description}
                                    onChange={handleChange}
                                    className={`${inputClass(Boolean(getErrorText(detailErrors.bio || errors.description)), false)} resize-none`}
                                    placeholder="Additional details about this manager..."
                                />
                                {getErrorText(detailErrors.bio || errors.description) && (
                                    <p className="text-rose-600 text-xs mt-2 font-medium">{getErrorText(detailErrors.bio || errors.description)}</p>
                                )}
                            </section>

                            <div className="form-actions">
                                <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="btn-primary">
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>

            {roleConfirm.open && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-900">Confirm Role Change</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                You are about to set role to <span className="font-semibold text-slate-900">{roleConfirm.nextRole}</span>.
                            </p>
                        </div>
                        <div className="p-6 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setRoleConfirm({ open: false, nextRole: "" })}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={() => {
                                    setFormData((prev) => ({ ...prev, role: roleConfirm.nextRole }));
                                    setRoleConfirm({ open: false, nextRole: "" });
                                }}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function InputField({ label, name, type = "text", value, onChange, placeholder, icon: Icon, error }) {
    const errorText = getErrorText(error);
    return (
        <div>
            <label className={labelClass}>{label}</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    {Icon && <Icon size={16} />}
                </div>
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={inputClass(Boolean(errorText))}
                />
            </div>
            {errorText && <p className="text-rose-600 text-xs mt-2 font-medium">{errorText}</p>}
        </div>
    );
}
