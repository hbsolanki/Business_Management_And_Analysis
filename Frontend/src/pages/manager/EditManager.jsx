import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { managerService } from "@/features/manager/services/managerService";
import OwnerHeader from "@/components/layout/OwnerHeader";
import BackButton from "@/components/shared/BackButton";
import { FaUser, FaEnvelope, FaPhone, FaIdCard, FaCamera, FaSave, FaMoneyBillWave } from "react-icons/fa";
import { toast } from "react-hot-toast";

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
    });

    const originalData = useRef({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [roleConfirm, setRoleConfirm] = useState({ open: false, nextRole: "" });

    useEffect(() => {
        const fetchManager = async () => {
            try {
                const res = await managerService.getById(id);
                const data = res.data;

                const fetchedData = {
                    first_name: data.first_name || "",
                    last_name: data.last_name || "",
                    email: data.email || "",
                    username: data.username || "",
                    mobile_number: data.mobile_number || "",
                    salary: data.salary !== undefined && data.salary !== null ? String(data.salary) : "",
                    role: data.role || "MANAGER",
                    description: data.description || "",
                };

                originalData.current = { ...fetchedData };

                setFormData({
                    ...fetchedData,
                    password: "",
                    image: null,
                    imagePreview: data.profile_picture || data.image || "",
                });
            } catch (err) {
                console.error("Failed to fetch manager", err);
                toast.error("Failed to load manager details");
                navigate("/manager/manage");
            } finally {
                setLoading(false);
            }
        };

        fetchManager();
    }, [id, navigate]);

    const handleChange = (e) => {
        const { name, value, files } = e.target;

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        const normalize = (value) => (value === null || value === undefined ? "" : String(value));
        const fieldsToCheck = ["first_name", "last_name", "email", "username", "mobile_number", "salary", "role", "description"];
        const updates = {};

        fieldsToCheck.forEach((field) => {
            if (normalize(formData[field]) !== normalize(originalData.current[field])) {
                updates[field] = formData[field];
            }
        });

        if (formData.password) {
            updates.password = formData.password;
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
                payload.append(key, value);
            });
            payload.append("profile_picture", formData.image);
        }

        try {
            await managerService.update(id, payload);
            toast.success("Manager updated successfully");
            navigate(-1);
        } catch (err) {
            console.error("Update failed", err);
            const errorMsg = err.response?.data?.detail || "Failed to update manager";
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
                    <div className="form-header">
                        <div className="form-header-icon">
                            <FaUser />
                        </div>
                        <div>
                            <h1 className="form-title">Edit Manager</h1>
                            <p className="form-subtitle">Update manager details and permissions.</p>
                        </div>
                    </div>

                    <div className="form-section">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-8">
                            <div className="relative h-20 w-20 rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden">
                                <img
                                    src={formData.imagePreview || "https://via.placeholder.com/150"}
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
                            {/* Basic Info Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField
                                    label="First Name"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    icon={FaUser}
                                />
                                <InputField
                                    label="Last Name"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    icon={FaUser}
                                />
                                <InputField
                                    label="Username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    icon={FaIdCard}
                                />
                                <InputField
                                    label="Email Address"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    icon={FaEnvelope}
                                />
                                <InputField
                                    label="Mobile Number"
                                    name="mobile_number"
                                    value={formData.mobile_number}
                                    onChange={handleChange}
                                    icon={FaPhone}
                                />
                                <InputField
                                    label="Salary"
                                    name="salary"
                                    type="number"
                                    value={formData.salary}
                                    onChange={handleChange}
                                    icon={FaMoneyBillWave}
                                    placeholder="Monthly salary"
                                />
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                                    <div className="relative">
                                        <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <select
                                            name="role"
                                            value={formData.role}
                                            onChange={(e) => handleRoleChange(e.target.value)}
                                            className="block w-full rounded-xl text-sm input-icon-left pr-10 py-2.5 bg-white text-slate-700 border border-slate-200 shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition"
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
                                </div>
                                <InputField
                                    label="New Password"
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Leave blank to keep current"
                                    icon={FaIdCard}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Description / Notes</label>
                                <textarea
                                    name="description"
                                    rows={3}
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="w-full rounded-xl resize-none"
                                    placeholder="Additional details about this manager..."
                                />
                            </div>

                            {/* Action Bar */}
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

function InputField({ label, name, type = "text", value, onChange, placeholder, icon: Icon }) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
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
            className="block w-full input-icon-left pr-3 py-2.5 rounded-xl text-sm"
        />
            </div>
        </div>
    );
}
