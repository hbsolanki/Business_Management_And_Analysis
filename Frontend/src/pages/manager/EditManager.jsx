import { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
        : "border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
    }`;
const getErrorText = (error) => {
    if (!error) return null;
    if (typeof error === 'string') return error;
    if (Array.isArray(error) && error.length > 0) {
        const res = getErrorText(error[0]);
        if (typeof res === 'string') return res;
    }
    if (typeof error === 'object' && error !== null) {
        const values = Object.values(error);
        if (values.length > 0) {
            const res = getErrorText(values[0]);
            if (typeof res === 'string') return res;
        }
        try { return JSON.stringify(error); } catch (e) { return String(error); }
    }
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

    const allVisibleBranches = useMemo(() => {
        const branchMap = new Map();
        // First add selected branches
        selectedBranchesData.forEach(b => {
            if (formData.branch_ids.includes(b.id)) {
                branchMap.set(String(b.id), b);
            }
        });
        // Then add searched branches
        branches.forEach(b => {
            branchMap.set(String(b.id), b);
        });
        return Array.from(branchMap.values());
    }, [branches, selectedBranchesData, formData.branch_ids]);

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
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-slate-900"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-12 bg-transparent font-sans">
            <OwnerHeader />

            <main className="max-w-5xl mx-auto px-4 pt-8">
                <div className="mb-6">
                    <BackButton label="Back to Managers" />
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                    <header className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex items-center gap-5">
                        <div className="h-14 w-14 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg border border-slate-800">
                            <FaUser size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Edit Manager Profile</h1>
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest opacity-80 mt-1">Update permissions & personal info</p>
                        </div>
                    </header>

                    <div className="p-8 space-y-8">
                        {/* Profile Picture Section */}
                        <section className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-slate-50 border border-slate-200">
                            <div className="relative h-24 w-24 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-white">
                                <img
                                    src={formData.imagePreview || "https://placehold.co/150"}
                                    alt="Profile"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Profile Photo</h3>
                                <label htmlFor="image-upload" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all cursor-pointer shadow-sm">
                                    <FaCamera size={12} className="text-slate-900" />
                                    Change Image
                                    <input id="image-upload" type="file" name="image" accept="image/*" className="hidden" onChange={handleChange} />
                                </label>
                            </div>
                        </section>

                        <form onSubmit={handleSubmit} className="space-y-10">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <InputField label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} icon={FaUser} error={errors.first_name} />
                                <InputField label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} icon={FaUser} error={errors.last_name} />
                                <InputField label="Username" name="username" value={formData.username} onChange={handleChange} icon={FaIdCard} error={errors.username} />
                                <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} icon={FaEnvelope} error={errors.email} />
                                <InputField label="Mobile Number" name="mobile_number" value={formData.mobile_number} onChange={handleChange} icon={FaPhone} error={errors.mobile_number} />
                                <InputField label="Salary" name="salary" type="number" value={formData.salary} onChange={handleChange} icon={FaMoneyBillWave} error={detailErrors.salary || errors.salary} />

                                <div>
                                    <label className={labelClass}>User Role</label>
                                    <div className="relative group">
                                    <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                                        <select
                                            name="role"
                                            value={formData.role}
                                            onChange={(e) => handleRoleChange(e.target.value)}
                                            className={`${inputClass(Boolean(errors.role))} pl-11 appearance-none font-bold`}
                                        >
                                            <option value="OWNER">Owner (Full Business Access)</option>
                                            <option value="MANAGER">Manager (Operational Controls)</option>
                                            <option value="EMPLOYEE">Employee (Restricted Access)</option>
                                        </select>
                                    </div>
                                    {errors.role && <p className="text-rose-600 text-xs mt-2 font-bold">{getErrorText(errors.role)}</p>}
                                </div>

                                <InputField label="New Password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Keep blank to remain unchanged" icon={FaIdCard} error={errors.password} />
                            </div>

                            {/* Branch Access Section */}
                            <section className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                                    <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200"><FaSearch size={14} /></div>
                                        Branch Assignments
                                    </h3>
                                    <div className="relative w-full sm:w-64">
                                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                                        <input
                                            type="text"
                                            placeholder="Search branches..."
                                            value={branchSearch}
                                            onChange={(e) => setBranchSearch(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                                            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-100 outline-none transition-all font-bold bg-slate-50"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 min-h-[160px]">
                                    {fetchingBranches ? (
                                        <div className="col-span-full flex flex-col items-center justify-center py-10 opacity-50"><div className="animate-spin h-6 w-6 border-2 border-slate-400 border-t-slate-900 rounded-full mb-3"></div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Updating search...</p></div>
                                    ) : allVisibleBranches.length > 0 ? (
                                        allVisibleBranches.map(branch => {
                                            const isSelected = formData.branch_ids.includes(branch.id);
                                            return (
                                                <button
                                                    key={branch.id}
                                                    type="button"
                                                    onClick={() => handleBranchChange(branch.id)}
                                                    className={`flex items-center gap-4 p-3.5 rounded-xl border transition-all text-left group ${isSelected ? "bg-white border-slate-900 shadow-sm ring-4 ring-slate-100" : "bg-white border-slate-200 hover:border-slate-300"}`}
                                                >
                                                    <div className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${isSelected ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-slate-200"}`}>
                                                        {isSelected && <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20"><path d="M0 11l2-2 5 5L18 3l2 2L7 18z" /></svg>}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-bold text-slate-900 truncate tracking-tight">{branch.name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate mt-0.5">{branch.contact_number || "No contact"}</p>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-full flex flex-col items-center justify-center py-10 text-slate-400">
                                            <FaSearch className="mb-3 opacity-20" size={32} />
                                            <p className="text-sm font-bold opacity-60">No branches found matching search</p>
                                        </div>
                                    )}
                                </div>
                                {(errors.branch_ids || errors.branch_id) && <p className="text-rose-600 text-xs font-bold text-center">{getErrorText(errors.branch_ids || errors.branch_id)}</p>}
                            </section>

                            {/* Description */}
                            <section className="space-y-4">
                                <label className={labelClass}>Bio / Notes</label>
                                <textarea
                                    name="description"
                                    rows={4}
                                    value={formData.description}
                                    onChange={handleChange}
                                    className={`${inputClass(Boolean(errors.description), false)} resize-none font-medium leading-relaxed p-5`}
                                    placeholder="Additional background, skills, or operational notes..."
                                />
                            </section>

                            {/* Submit Actions */}
                            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 border-t border-slate-100">
                                <button type="button" onClick={() => navigate(-1)} className="w-full sm:w-auto px-8 py-3 rounded-xl text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-all">Cancel</button>
                                <button type="submit" disabled={saving} className="w-full sm:w-auto px-12 py-3 rounded-xl bg-slate-900 text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                    {saving ? "Processing..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>

            {/* Role Confirmation Modal */}
            {roleConfirm.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-fade-in">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                        <div className="p-8 text-center space-y-4">
                            <div className="h-14 w-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100"><FaIdCard size={20} /></div>
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Confirm Role Escalation</h3>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">You are about to promote this user to <span className="text-slate-900 font-bold">{roleConfirm.nextRole}</span>. This will grant them significantly higher system permissions. Are you sure?</p>
                        </div>
                        <div className="p-5 bg-slate-50 flex items-center gap-3">
                            <button onClick={() => setRoleConfirm({ open: false, nextRole: "" })} className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">Cancel</button>
                            <button onClick={() => { setFormData(p => ({ ...p, role: roleConfirm.nextRole })); setRoleConfirm({ open: false, nextRole: "" }); }} className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all">Confirm Escalation</button>
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
        <div className="space-y-2">
            <label className={labelClass}>{label}</label>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                    {Icon && <Icon size={14} />}
                </div>
                <input
                    type={type}
                    name={name}
                    value={value || ""}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`${inputClass(Boolean(errorText))} pl-11 font-bold`}
                />
            </div>
            {errorText && <p className="text-rose-600 text-[10px] font-black uppercase tracking-widest">{errorText}</p>}
        </div>
    );
}
