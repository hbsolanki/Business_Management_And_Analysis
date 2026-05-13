import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { tokenService } from "@/services/tokenService";
import { businessService } from "@/features/business/services/businessService";
import Modal from "@/components/ui/Modal";
import api, { API_BASE_URL } from "@/services/api";
import { getProfileImageUrl } from "@/utils/imageUtils";
import { authService } from "@/services/authService";
import toast from "react-hot-toast";
import {
    FaUser,
    FaEnvelope,
    FaPhone,
    FaCalendarAlt,
    FaEdit,
    FaBriefcase,
    FaArrowLeft,
    FaIdBadge,
    FaCheckCircle,
    FaMapMarkerAlt,
    FaMoneyBillWave,
    FaShieldAlt,
    FaTools,
    FaKey,
    FaClock
} from "react-icons/fa";

function ProfileViewer() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const navigate = useNavigate();
    const { id } = useParams();

    useEffect(() => {
        const currentUserId = tokenService.getId();
        const targetId = id || currentUserId;

        if (!targetId) {
            setLoading(false);
            navigate("/login");
            return;
        }

        setLoading(true);
        api.get(`/user/${targetId}/`)
            .then((res) => setUser(res.data))
            .catch((err) => {
                console.error("Failed to fetch profile", err);
                toast.error("Failed to load profile");
                if (err?.response?.status === 401) {
                    navigate("/login");
                }
            })
            .finally(() => setLoading(false));
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900"></div>
            </div>
        );
    }

    if (!user) return null;

    const userData = user.user || user;
    const getRoleString = (obj) => {
        if (!obj) return "";
        if (typeof obj === "string") return obj.toUpperCase();
        if (typeof obj === "object") return (obj.role || "").toUpperCase();
        return "";
    };

    const roleStr = getRoleString(user?.role) || getRoleString(userData?.role);
    const isOwner = Boolean(user?.is_owner || roleStr === "OWNER");
    const isManager = Boolean(user?.is_manager || roleStr === "MANAGER");
    const isEmployee = Boolean(user?.is_employee || roleStr === "EMPLOYEE");
    const isMyProfile = String(userData?.id || user?.id) === String(tokenService.getId());

    const getEditRoute = () => {
        if (isOwner) return "/owner/edit";
        if (isManager) return "/manager/edit";
        if (isEmployee) return "/employee/edit";
        return "/profile/edit";
    };

    const roleLabel = isOwner ? "Business Owner" : isManager ? "Manager" : isEmployee ? "Employee" : "User";

    const getImageUrl = (path) => {
        return getProfileImageUrl(path);
    };

    const getWorkAssignments = (data) => {
        if (!data) return [];
        const source = data.assigned_works || data.work || [];

        if (Array.isArray(source) && source.length > 0) {
            return source;
        }

        if (typeof source === "string" && source.trim()) {
            try {
                const parsed = JSON.parse(source);
                if (Array.isArray(parsed)) return parsed;
                return [String(parsed)];
            } catch {
                return [source];
            }
        }

        return ["General"];
    };

    const formatDate = (value, options) => {
        if (!value) return "Not available";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Not available";
        return date.toLocaleDateString(undefined, options);
    };

    const formatDateTime = (value) => {
        if (!value) return "Not available";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Not available";
        return date.toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short"
        });
    };

    const handleDeleteBusiness = async () => {
        const business = user?.role?.business || user?.business;
        if (!business?.id) return;

        setIsDeleting(true);
        try {
            await businessService.delete(business.id);
            toast.success("Business deleted successfully");
            setUser((prev) => ({
                ...prev,
                business: null,
                role: prev.role ? { ...prev.role, business: null } : null
            }));
        } catch (error) {
            console.error("Failed to delete business", error);
            toast.error("Failed to delete business");
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
        }
    };

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            await api.delete(`/user/${userData.id || user.id}/`);
            toast.success("Account deleted successfully");
            await authService.logout();
            navigate("/");
        } catch (error) {
            console.error("Failed to delete account", error);
            toast.error("Failed to delete account");
        } finally {
            setIsDeleting(false);
            setIsDeleteUserModalOpen(false);
        }
    };

    const workAssignments = getWorkAssignments(user);
    const branchList = Array.isArray(user.assigned_branches) && user.assigned_branches.length > 0
        ? user.assigned_branches
        : (Array.isArray(user.branches) && user.branches.length > 0
            ? user.branches
            : (user.branch ? [user.branch] : []));

    const employeeDetails = user.employee_details || user.employee_detail || {};
    const salaryValue = employeeDetails.salary ?? user.salary ?? 0;
    const salaryNumber = Number(salaryValue || 0);
    const salaryText = Number.isFinite(salaryNumber)
        ? `₹${salaryNumber.toLocaleString("en-IN")}`
        : `₹${salaryValue || 0}`;
    const bioText = user.bio || employeeDetails.bio || user.description || "";
    const address = employeeDetails.address || user.address || {};

    return (
        <div className="min-h-screen bg-transparent py-6 sm:py-8">
            <div className="section-shell space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white hover:text-slate-900"
                    >
                        <FaArrowLeft className="text-xs" />
                        Back
                    </button>

                    {isMyProfile && (
                        <Link
                            to={getEditRoute()}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800"
                        >
                            <FaEdit size={12} />
                            Edit Profile
                        </Link>
                    )}
                </div>

                <section className="glass-panel rounded-3xl border border-white/70 p-5 shadow-soft sm:p-7">
                    <div className="grid items-center gap-6 xl:grid-cols-[auto_minmax(0,1fr)_260px]">
                        <div className="mx-auto xl:mx-0">
                            {userData.profile_picture ? (
                                <img
                                    src={getImageUrl(userData.profile_picture)}
                                    alt="Profile"
                                    className="h-28 w-28 rounded-2xl border-4 border-white object-cover shadow-md sm:h-32 sm:w-32"
                                />
                            ) : (
                                <div className="flex h-28 w-28 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-slate-700 to-slate-900 text-3xl font-bold text-white shadow-md sm:h-32 sm:w-32">
                                    {userData.first_name?.[0]}{userData.last_name?.[0]}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 text-center xl:text-left">
                            <div className="flex flex-wrap items-center justify-center gap-2 xl:justify-start">
                                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                                    {userData.first_name} {userData.last_name}
                                </h1>
                                <FaCheckCircle className="text-emerald-500" title="Verified User" />
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-2 xl:justify-start">
                                <span className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                    {roleLabel}
                                </span>
                                <span className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold text-slate-400">
                                    @{userData.username}
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-2 xl:justify-start">
                                <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
                                    <FaEnvelope className="text-slate-400" size={10} />
                                    {userData.email || "Not set"}
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
                                    <FaPhone className="text-slate-400" size={10} />
                                    {userData.mobile_number || "Not set"}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
                            <SummaryPill
                                icon={FaCheckCircle}
                                label="Status"
                                value={userData.is_active ? "Active" : "Inactive"}
                                tone={userData.is_active ? "success" : "danger"}
                            />
                            <SummaryPill
                                icon={FaCalendarAlt}
                                label="Joined"
                                value={formatDate(userData.date_joined, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric"
                                })}
                            />
                            <SummaryPill
                                icon={FaClock}
                                label="Updated"
                                value={formatDateTime(user.updated_at || userData.updated_at)}
                            />
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    <div className="space-y-6 xl:col-span-2">
                        <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm sm:p-6">
                            <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                    <FaIdBadge size={16} />
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-slate-900">Personal Information</h2>
                                    <p className="text-xs text-slate-500">Primary contact and account identity</p>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <InfoItem icon={FaEnvelope} label="Email Address" value={userData.email} verified />
                                <InfoItem icon={FaPhone} label="Phone Number" value={userData.mobile_number} />
                                <InfoItem
                                    icon={FaCalendarAlt}
                                    label="Member Since"
                                    value={formatDate(userData.date_joined, {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric"
                                    })}
                                />
                                <InfoItem icon={FaUser} label="Employee ID" value={`#${userData.id}`} mono />
                            </div>
                        </section>

                        {address && Object.values(address).some(v => v) && (
                            <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm sm:p-6">
                                <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                        <FaMapMarkerAlt size={16} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold text-slate-900">Address Details</h2>
                                        <p className="text-xs text-slate-500">Residential and contact location</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <InfoItem icon={FaMapMarkerAlt} label="Street Address" value={address.address_line_1} />
                                    <InfoItem icon={FaMapMarkerAlt} label="Area / Landmark" value={address.address_line_2} />
                                    <InfoItem icon={FaMapMarkerAlt} label="City" value={address.city_name || address.city} />
                                    <InfoItem icon={FaMapMarkerAlt} label="State" value={address.state_name || address.state} />
                                    <InfoItem icon={FaMapMarkerAlt} label="Pin Code" value={address.pin_code} />
                                    <InfoItem icon={FaMapMarkerAlt} label="Country" value={address.country_name || address.country} />
                                </div>
                            </section>
                        )}

                        {(isManager || isEmployee) && (
                            <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm sm:p-6">
                                <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                        <FaShieldAlt size={16} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold text-slate-900">Professional Details</h2>
                                        <p className="text-xs text-slate-500">Compensation and assigned responsibilities</p>
                                    </div>
                                </div>

                                <div className="grid gap-6 lg:grid-cols-2">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            <FaMoneyBillWave size={12} />
                                            Monthly Salary
                                        </p>
                                        <p className="text-2xl font-bold text-slate-900 tracking-tight">{salaryText}</p>
                                    </div>

                                    <div>
                                        <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            <FaTools size={12} />
                                            Work Assignments
                                        </p>
                                        <div className="space-y-4">
                                            {/* Group by branch if structured, otherwise show list */}
                                            {workAssignments.some(w => typeof w === 'object' && w.branch_name) ? (
                                                Object.entries(
                                                    workAssignments.reduce((acc, curr) => {
                                                        const bName = curr.branch_name || "General";
                                                        if (!acc[bName]) acc[bName] = [];
                                                        acc[bName].push(curr.work_type || curr.name || "General");
                                                        return acc;
                                                    }, {})
                                                ).map(([branchName, types]) => (
                                                    <div key={branchName} className="space-y-2">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{branchName}</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {types.map((type, idx) => (
                                                                <div key={`${branchName}-${type}-${idx}`} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                                                                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 text-white">
                                                                        <FaKey size={9} />
                                                                    </div>
                                                                    <span className="text-[11px] font-bold uppercase tracking-tight text-slate-700">
                                                                        {String(type)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    {workAssignments.map((work, idx) => (
                                                        <div key={`${String(work)}-${idx}`} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                                                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
                                                                <FaKey size={10} />
                                                            </div>
                                                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                                                                {String(work?.work_type || work?.name || work || "General")}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {bioText && (
                            <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm sm:p-6">
                                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">About / Notes</h2>
                                <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                                    {bioText}
                                </p>
                            </section>
                        )}
                    </div>

                    <aside className="space-y-6">
                        {(user.role?.business || user.business) && (
                            <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm sm:p-6">
                                <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                            <FaBriefcase size={15} />
                                        </div>
                                        <div>
                                            <h2 className="text-base font-semibold text-slate-900">Business Information</h2>
                                            <p className="text-xs text-slate-500">Compliance and registration data</p>
                                        </div>
                                    </div>
                                    {(user.role?.business?.id || user.business?.id) && isOwner && isMyProfile && (
                                        <Link
                                            to={`/business/edit/${user.role?.business?.id || user.business?.id}`}
                                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                        >
                                            Edit
                                        </Link>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <InfoLine label="Company Name" value={user.role?.business?.name || user.business?.name} />
                                        {(isOwner || isManager) && isMyProfile && (
                                            <Link
                                                to="/business/compliance"
                                                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 transition hover:bg-slate-100"
                                            >
                                                {(user.role?.business?.gst_profile || user.business?.gst_profile) ? "Edit GST" : "Manage GST"}
                                            </Link>
                                        )}
                                    </div>
                                    <InfoLine label="Business ID" value={(user.role?.business?.id || user.business?.id) ? `#${user.role?.business?.id || user.business?.id}` : "N/A"} mono />

                                    {/* GST Profile Details */}
                                    {(() => {
                                        const gstProfile = user.role?.business?.gst_profile || user.business?.gst_profile;
                                        if (!gstProfile) return null;

                                        return (
                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                <FaShieldAlt size={10} />
                                                Compliance Profile
                                            </p>
                                            <div className="grid grid-cols-2 gap-4">
                                                <InfoLine label="GSTIN" value={gstProfile.gstin} mono />
                                                <InfoLine label="Reg. Type" value={gstProfile.registration_type_display} />
                                                <InfoLine label="State Code" value={gstProfile.state_code} />
                                                <InfoLine label="Status" value={gstProfile.is_active ? "Active" : "Inactive"} />
                                            </div>
                                        </div>
                                        );
                                    })()}

                                    <div className="mt-4">
                                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Description</p>
                                        <p className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
                                            {user.role?.business?.description || user.business?.description || "No description provided."}
                                        </p>
                                    </div>
                                </div>

                                {isOwner && isMyProfile && (
                                    <button
                                        onClick={() => setIsDeleteModalOpen(true)}
                                        className="mt-5 w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                                    >
                                        Delete Business
                                    </button>
                                )}
                            </section>
                        )}

                        {branchList.length > 0 && (
                            <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm sm:p-6">
                                <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                        <FaMapMarkerAlt size={15} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold text-slate-900">Assigned Branches</h2>
                                        <p className="text-xs text-slate-500">Location access details</p>
                                    </div>
                                </div>

                                <div className="custom-scrollbar max-h-[24rem] space-y-3 overflow-y-auto pr-1">
                                    {branchList.map((branch, idx) => {
                                        if (!branch) return null;

                                        const branchId = typeof branch === "object" ? branch.id : branch;
                                        const branchName = typeof branch === "object"
                                            ? (branch.name || `Branch #${branch.id || idx + 1}`)
                                            : `Branch #${branch}`;
                                        const branchContact = typeof branch === "object" ? branch.contact_number : null;
                                        const branchAddress = typeof branch === "object" ? branch.address : null;
                                        const isMain = typeof branch === "object" && branch.is_default;

                                        return (
                                            <div key={branchId || idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                                <div className="mb-2 flex items-center gap-2">
                                                    <p className="text-sm font-semibold text-slate-900">{branchName}</p>
                                                    {isMain && (
                                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                                                            Main
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="space-y-1 text-xs text-slate-600">
                                                    <p>ID: {branchId ? `#${branchId}` : "N/A"}</p>
                                                    {branchContact && <p>Contact: {branchContact}</p>}
                                                    {branchAddress && typeof branchAddress === "object" ? (
                                                        <p className="leading-relaxed">
                                                            {[
                                                                branchAddress.address_line_1,
                                                                branchAddress.address_line_2,
                                                                branchAddress.city_name,
                                                                branchAddress.state_name || branchAddress.state,
                                                                branchAddress.country_name || branchAddress.country,
                                                                branchAddress.pin_code,
                                                            ].filter(Boolean).join(", ")}
                                                        </p>
                                                    ) : branchAddress ? (
                                                        <p>{branchAddress}</p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {!(user.role?.business || user.business) && isOwner && isMyProfile && (
                            <section className="rounded-2xl border border-red-200 bg-red-50/70 p-5 shadow-sm sm:p-6">
                                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-red-600">Danger Zone</h3>
                                <p className="mb-4 text-xs text-red-700">
                                    No business is registered for this account. You can delete the account permanently.
                                </p>
                                <button
                                    onClick={() => setIsDeleteUserModalOpen(true)}
                                    className="w-full rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                                >
                                    Delete My Account
                                </button>
                            </section>
                        )}
                    </aside>
                </div>
            </div>

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Business?"
                message="Are you sure you want to delete your business? This action cannot be undone and will permanently delete all associated data."
                confirmText={isDeleting ? "Deleting..." : "Yes, Delete"}
                cancelText="Cancel"
                onConfirm={handleDeleteBusiness}
                type="danger"
            />

            <Modal
                isOpen={isDeleteUserModalOpen}
                onClose={() => setIsDeleteUserModalOpen(false)}
                title="Delete Entire Account?"
                message="Are you absolutely sure you want to delete your entire owner account? This action is permanent and cannot be undone."
                confirmText={isDeleting ? "Deleting..." : "Delete Account"}
                cancelText="Cancel"
                onConfirm={handleDeleteAccount}
                type="danger"
            />
        </div>
    );
}

function SummaryPill({ icon: Icon, label, value, tone = "default" }) {
    const toneClass = tone === "success"
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : tone === "danger"
            ? "bg-rose-50 text-rose-700 border-rose-100"
            : "bg-white text-slate-700 border-slate-200";

    return (
        <div className={`rounded-xl border px-3 py-2 ${toneClass}`}>
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
                <Icon className="text-xs" />
                {label}
            </div>
            <p className="text-xs font-semibold leading-relaxed">{value || "Not available"}</p>
        </div>
    );
}

function InfoLine({ label, value, mono }) {
    return (
        <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className={`text-sm font-medium text-slate-700 ${mono ? "font-mono" : ""}`}>
                {value || "Not available"}
            </p>
        </div>
    );
}

function InfoItem({ icon: Icon, label, value, mono, verified }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-2 flex items-center gap-2">
                <Icon className="text-xs text-slate-400" />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                {verified && <FaCheckCircle className="text-xs text-emerald-500" title="Verified" />}
            </div>
            <p className={`text-sm font-semibold text-slate-800 ${mono ? "font-mono" : ""}`}>
                {value || <span className="italic text-slate-400">Not set</span>}
            </p>
        </div>
    );
}

export default ProfileViewer;
