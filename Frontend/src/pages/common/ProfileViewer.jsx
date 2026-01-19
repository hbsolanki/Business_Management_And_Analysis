import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { tokenService } from "@/services/tokenService";
import api, { API_BASE_URL } from "@/services/api";
import {
    FaUser,
    FaEnvelope,
    FaPhone,
    FaCalendarAlt,
    FaEdit,
    FaBriefcase,
    FaArrowLeft
} from "react-icons/fa";

function ProfileViewer() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { id } = useParams(); // Get ID from URL if present

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
                if (!id) {
                    // Only redirect to login if trying to view self and failing
                    navigate("/login");
                } else {
                    // If viewing others fails, maybe 404 or just stay?
                    // For now, let's just stop loading, UI will show null/error
                }
            })
            .finally(() => setLoading(false));
    }, [navigate, id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user) return null;

    // Determine edit route based on role
    const getEditRoute = () => {
        if (user.is_owner) return "/owner/edit";
        if (user.is_manager) return "/manager/edit";
        if (user.is_employee) return "/employee/edit";
        return "/profile/edit"; // Fallback
    };

    const getRoleLabel = () => {
        if (user.is_owner) return "Business Owner";
        if (user.is_manager) return "Manager";
        if (user.is_employee) return "Employee";
        return "User";
    };

    const getRoleColor = () => {
        if (user.is_owner) return "blue";
        if (user.is_manager) return "purple";
        if (user.is_employee) return "green";
        return "gray";
    };

    const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith("http")) return path;
        return `${API_BASE_URL}${path}`;
    };

    const color = getRoleColor();
    const editRoute = getEditRoute();

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition font-medium"
                >
                    <FaArrowLeft /> Back
                </button>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Header with Background */}
                    <div className={`h-32 bg-gradient-to-r from-${color}-500 to-${color}-600`}></div>

                    <div className="px-8 pb-8">
                        <div className="relative flex justify-between items-end -mt-12 mb-6">
                            <div className="flex items-end gap-6">
                                <div className="p-1.5 bg-white rounded-full">
                                    {user.profile_picture ? (
                                        <img
                                            src={getImageUrl(user.profile_picture)}
                                            alt="Profile"
                                            className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md bg-white"
                                        />
                                    ) : (
                                        <div className={`w-24 h-24 rounded-full bg-${color}-100 flex items-center justify-center border-4 border-white shadow-md text-${color}-600`}>
                                            {user.first_name?.[0]}{user.last_name?.[0]}
                                        </div>
                                    )}
                                </div>
                                <div className="mb-1">
                                    <h1 className="text-2xl font-bold text-gray-900">{user.first_name} {user.last_name}</h1>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`px-2 py-0.5 rounded-md bg-${color}-50 text-${color}-700 text-xs font-bold uppercase`}>
                                            {getRoleLabel()}
                                        </span>
                                        <span className="text-gray-500 text-sm">@{user.username}</span>
                                    </div>
                                </div>
                            </div>

                            <Link
                                to={editRoute}
                                className={`px-5 py-2.5 bg-${color}-600 hover:bg-${color}-700 text-white rounded-xl font-medium shadow-sm transition flex items-center gap-2`}
                            >
                                <FaEdit /> Edit Profile
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <FaUser className={`text-${color}-500`} /> Personal Details
                                </h2>
                                <div className="space-y-4">
                                    <InfoItem icon={FaEnvelope} label="Email" value={user.email} />
                                    <InfoItem icon={FaPhone} label="Mobile" value={user.mobile_number} />
                                    <InfoItem icon={FaCalendarAlt} label="Joined" value={new Date(user.date_joined).toLocaleDateString()} />
                                </div>
                            </div>

                            {user.business && (
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <FaBriefcase className={`text-${color}-500`} /> Business Info
                                    </h2>
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                        <h3 className="font-semibold text-gray-900">{user.business.name}</h3>
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                            {user.business.description || "No description provided."}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoItem({ icon: Icon, label, value }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition border border-transparent hover:border-gray-100">
            <div className="text-gray-400">
                <Icon size={18} />
            </div>
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">{label}</p>
                <p className="text-gray-900 font-medium">{value || "Not provided"}</p>
            </div>
        </div>
    );
}

export default ProfileViewer;
