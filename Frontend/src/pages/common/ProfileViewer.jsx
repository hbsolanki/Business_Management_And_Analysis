import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { tokenService } from "@/services/tokenService";
import { businessService } from "@/features/business/services/businessService";
import Modal from "@/components/ui/Modal";
import api, { API_BASE_URL } from "@/services/api";
import {
    FaUser,
    FaEnvelope,
    FaPhone,
    FaCalendarAlt,
    FaEdit,
    FaBriefcase,
    FaArrowLeft,
    FaIdBadge,
    FaCheckCircle
} from "react-icons/fa";

function ProfileViewer() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const navigate = useNavigate();
    const { id } = useParams();

    useEffect(() => {
        const currentUserId = tokenService.getId();
        const targetId = id || currentUserId;

        if (!targetId) {
            navigate("/login");
            return;
        }

        api.get(`/user/${targetId}/`)
            .then((res) => setUser(res.data))
            .catch((err) => {
                console.error("Failed to fetch profile", err);
                if (!id) navigate("/login");
            })
            .finally(() => setLoading(false));
    }, [navigate, id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    if (!user) return null;

    const isOwner = Boolean(user?.is_owner || user?.role?.toUpperCase() === "OWNER");
    const isManager = Boolean(user?.is_manager || user?.role?.toUpperCase() === "MANAGER");
    const isEmployee = Boolean(user?.is_employee || user?.role?.toUpperCase() === "EMPLOYEE");

    const getEditRoute = () => {
        if (isOwner) return "/owner/edit";
        if (isManager) return "/manager/edit";
        if (isEmployee) return "/employee/edit";
        return "/profile/edit";
    };

    const getRoleDetails = () => {
        if (isOwner) {
            return {
                label: "Business Owner",
                badge: "bg-gray-50 text-gray-800 border-gray-200",
                hero: "from-gray-100 via-white to-gray-100",
                avatarBg: "from-gray-50 to-gray-100",
                avatarText: "text-gray-800",
                iconBg: "bg-gray-50",
                iconText: "text-gray-700",
                border: "border-gray-200"
            };
        }
        if (isManager) {
            return {
                label: "Manager",
                badge: "bg-gray-50 text-gray-800 border-gray-200",
                hero: "from-gray-100 via-white to-gray-100",
                avatarBg: "from-gray-50 to-gray-100",
                avatarText: "text-gray-800",
                iconBg: "bg-gray-50",
                iconText: "text-gray-700",
                border: "border-gray-200"
            };
        }
        if (isEmployee) {
            return {
                label: "Employee",
                badge: "bg-gray-50 text-gray-800 border-gray-200",
                hero: "from-gray-100 via-white to-gray-100",
                avatarBg: "from-gray-50 to-gray-100",
                avatarText: "text-gray-800",
                iconBg: "bg-gray-50",
                iconText: "text-gray-700",
                border: "border-gray-200"
            };
        }
        return {
            label: "User",
            badge: "bg-gray-50 text-gray-800 border-gray-200",
            hero: "from-gray-100 via-white to-gray-100",
            avatarBg: "from-gray-50 to-gray-100",
            avatarText: "text-gray-800",
            iconBg: "bg-gray-50",
            iconText: "text-gray-700",
            border: "border-gray-200"
        };
    };

    const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith("http")) return path;
        return `${API_BASE_URL}${path}`;
    };

    const role = getRoleDetails();

    const handleDeleteBusiness = async () => {
        setIsDeleting(true);
        try {
            await businessService.delete(user.business.id);
            tokenService.clearTokens();
            navigate("/login");
        } catch (error) {
            console.error("Failed to delete business", error);
            // Optionally show error toast
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
        }
    };

    return (
        <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 bg-white text-black">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="group flex items-center gap-2 text-gray-700 hover:text-black transition-colors font-semibold px-4 py-2 rounded-xl hover:bg-gray-100 border border-transparent hover:border-gray-200"
                >
                    <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Dashboard</span>
                </button>

                {/* Main Profile Card */}
                <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-200 relative">

                    {/* Hero Banner */}
                    <div className={`h-36 bg-gradient-to-r ${role.hero} relative border-b border-gray-200`}></div>

                    <div className="px-6 sm:px-8 pb-10">
                        {/* Profile Header */}
                        <div className="flex flex-col md:flex-row items-start md:items-end -mt-16 mb-8 gap-6 relative z-10">

                            {/* Avatar - Overlapping Banner */}
                            <div className="relative">
                                <div className="p-1.5 bg-white rounded-full shadow-lg inline-block">
                                    {user.profile_picture ? (
                                        <img
                                            src={getImageUrl(user.profile_picture)}
                                            alt="Profile"
                                            className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-inner bg-gray-100"
                                        />
                                    ) : (
                                        <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${role.avatarBg} flex items-center justify-center border-4 border-white shadow-inner ${role.avatarText} text-4xl font-bold`}>
                                            {user.first_name?.[0]}{user.last_name?.[0]}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute bottom-3 right-3 bg-green-500 w-5 h-5 rounded-full border-4 border-white shadow-sm" title="Active"></div>
                            </div>

                            {/* Name & Role - Pushed down to clear banner for readability */}
                            <div className="flex-1 pt-2 md:pt-0 pb-2 text-center md:text-left">
                                <h1 className="text-3xl sm:text-4xl font-bold text-black flex items-center justify-center md:justify-start gap-3">
                                    {user.first_name} {user.last_name}
                                    <FaCheckCircle className="text-gray-500 text-lg opacity-80" title="Verified User" />
                                </h1>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2">
                                    <span className={`px-3 py-1 rounded-lg text-sm font-bold uppercase tracking-wide border shadow-sm ${role.badge}`}>
                                        {role.label}
                                    </span>
                                    <span className="text-gray-700 font-medium bg-white px-3 py-1 rounded-lg border border-gray-200 flex items-center gap-1.5 shadow-sm">
                                        <span className="text-gray-400">@</span>{user.username}
                                    </span>
                                </div>
                            </div>

                            {/* Edit Button */}
                            <div className="mb-2 w-full md:w-auto flex justify-center md:block">
                                <Link
                                    to={getEditRoute()}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-lg shadow-brand-500/30 transition-all hover:scale-105 active:scale-95"
                                >
                                    <FaEdit />
                                    <span>Edit Profile</span>
                                </Link>
                            </div>
                        </div>

                        {/* Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                            {/* Personal Info Column (2 col wide on lg) */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                    <h2 className="text-lg font-bold text-black mb-6 flex items-center gap-2">
                                        <div className={`p-2 rounded-lg ${role.iconBg} ${role.iconText}`}>
                                            <FaIdBadge />
                                        </div>
                                        Personal Information
                                    </h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                                        <InfoItem icon={FaEnvelope} label="Email Address" value={user.email} verified />
                                        <InfoItem icon={FaPhone} label="Phone Number" value={user.mobile_number} />
                                        <InfoItem icon={FaCalendarAlt} label="Member Since" value={new Date(user.date_joined).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} />
                                        <InfoItem icon={FaUser} label="User ID" value={`#${user.id}`} mono />
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar / Business Info */}
                            <div className="space-y-6">
                                {user.business && (
                                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                                                    <FaBriefcase size={16} />
                                                </div>
                                                <div>
                                                    <h2 className="text-base font-semibold text-slate-900">Business Details</h2>
                                                    <p className="text-xs text-slate-500">Profile and compliance information</p>
                                                </div>
                                            </div>
                                            {isOwner && (
                                                <Link
                                                    to={`/business/edit/${user.business.id}`}
                                                    className="text-xs font-semibold text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                                                >
                                                    Edit
                                                </Link>
                                            )}
                                        </div>

                                        <div className="mt-5 space-y-4">
                                            <div>
                                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Company Name</p>
                                                <p className="text-lg font-bold text-slate-900">{user.business.name}</p>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Business ID</p>
                                                    <span className="inline-flex items-center text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
                                                        {user.business.id || "N/A"}
                                                    </span>
                                                </div>
                                                {(isOwner || isManager) && (
                                                    <div>
                                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">GST Number</p>
                                                        <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md border ${user.business.gst_number ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                                                            {user.business.gst_number || "Not set"}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</p>
                                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                                    <p className="text-sm text-slate-600 leading-relaxed">
                                                        {user.business.description || "No description provided."}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {isOwner && (
                                            <div className="mt-6 pt-4 border-t border-slate-100">
                                                <button
                                                    onClick={() => setIsDeleteModalOpen(true)}
                                                    className="w-full text-center text-red-600 hover:text-red-700 text-sm font-semibold py-2 rounded-lg hover:bg-red-50 transition-colors"
                                                >
                                                    Delete Business
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Status */}
                            </div>
                        </div>
                    </div>
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
        </div>
    );
}

function InfoItem({ icon: Icon, label, value, mono, verified }) {
    return (
        <div className="group">
            <div className="flex items-center gap-2 mb-1.5">
                <Icon className="text-gray-400 group-hover:text-brand-600 transition-colors text-sm" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                {verified && <FaCheckCircle className="text-green-500 text-xs" title="Verified" />}
            </div>
            <p className={`text-base font-semibold text-black ${mono ? 'font-mono bg-gray-50 px-2 py-0.5 rounded-md inline-block text-sm border border-gray-200' : ''}`}>
                {value || <span className="text-gray-400 italic">Not set</span>}
            </p>
        </div>
    );
}

export default ProfileViewer;
