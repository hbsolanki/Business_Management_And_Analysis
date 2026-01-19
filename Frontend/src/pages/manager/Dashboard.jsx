import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import ManagerHeader from "@/components/layout/ManagerHeader";
import api from "@/services/api";
import { tokenService } from "@/services/tokenService";
import {
    FaUser,
    FaEdit,
    FaBuilding,
    FaUsers,
    FaProductHunt,
    FaBoxOpen,
    FaCashRegister,
    FaPhone,
    FaEnvelope,
    FaCalendarAlt,
    FaChartLine,
    FaTags,
    FaLayerGroup
} from "react-icons/fa";

function ManagerDashboard() {
    const [manager, setManager] = useState(null);
    const [businessData, setBusinessData] = useState(null);
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();
    const userId = tokenService.getId();

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            navigate("/login");
            return;
        }

        api
            .get(`/user/${userId}/`)
            .then((res) => {
                setManager(res.data);
                setBusinessData(res.data.business || null);
            })
            .catch((err) => {
                if (err.response?.status === 401) {
                    navigate("/login");
                }
            })
            .finally(() => setLoading(false));
    }, [navigate, userId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!manager) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            <ManagerHeader />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
                {/* Welcome & Profile Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row items-center justify-between gap-6 transition hover:shadow-md">
                    <div className="flex items-center gap-6">
                        {manager.profile_picture ? (
                            <img
                                alt={`${manager.first_name?.[0]}${manager.last_name?.[0]}`}
                                src={manager.profile_picture}
                                className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-3xl font-bold shadow-lg object-cover"
                            />
                        ) : (
                            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                {manager.first_name?.[0]}
                                {manager.last_name?.[0]}
                            </div>
                        )}

                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                Welcome back, {manager.first_name}!
                            </h1>
                            <p className="text-gray-500 mt-1 flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">Manager</span>
                                • {manager.email}
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/manager/edit"
                        className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 hover:text-blue-600 transition shadow-sm flex items-center gap-2"
                    >
                        <FaEdit /> Edit Profile
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Business & Stats */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Business Card */}
                        {businessData ? (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition pointer-events-none">
                                    <FaBuilding className="text-9xl text-blue-600" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-6">
                                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                                <FaBuilding />
                                            </div>
                                            {businessData.name}
                                        </h2>
                                        {/* No edit text button for manager */}
                                    </div>

                                    <p className="text-gray-600 mb-6 leading-relaxed">
                                        {businessData.description || "No description provided."}
                                    </p>


                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                                <p className="text-gray-500 mb-4">No business details available.</p>
                            </div>
                        )}

                        {/* Management Grid */}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-4 ml-1">Management Console</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <ManagementLink to="/analytics" icon={FaChartLine} label="Analytics" color="text-indigo-600" bg="bg-indigo-100" />
                                <ManagementLink to="/employees/manage" icon={FaUsers} label="Employees" color="text-blue-600" bg="bg-blue-100" />
                                <ManagementLink to="/product" icon={FaProductHunt} label="Products" color="text-orange-600" bg="bg-orange-100" />
                                <ManagementLink to="/inventory" icon={FaBoxOpen} label="Inventory" color="text-purple-600" bg="bg-purple-100" />
                                <ManagementLink to="/invoice" icon={FaCashRegister} label="Invoices" color="text-green-600" bg="bg-green-100" />
                                <ManagementLink to="/cost-category" icon={FaLayerGroup} label="Cost Categories" color="text-pink-600" bg="bg-pink-100" />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Personal Details */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <FaUser className="text-gray-400" /> Personal Details
                            </h3>
                            <div className="space-y-6">
                                <InfoItem icon={FaUser} label="Username" value={manager.username} />
                                <InfoItem icon={FaEnvelope} label="Email" value={manager.email} />
                                <InfoItem icon={FaPhone} label="Mobile" value={manager.mobile_number} />
                                <InfoItem icon={FaCalendarAlt} label="Joined" value={new Date(manager.date_joined).toLocaleDateString()} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoItem({ icon: Icon, label, value }) {
    return (
        <div className="flex items-start gap-3">
            <div className="p-2 bg-gray-50 rounded-lg text-gray-400 mt-1">
                <Icon size={16} />
            </div>
            <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-gray-700 font-medium">{value || "Not set"}</p>
            </div>
        </div>
    );
}

function ManagementLink({ to, icon: Icon, label, color, bg }) {
    return (
        <Link to={to} className="group p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition flex flex-col items-center justify-center text-center gap-3">
            <div className={`p-3 rounded-full ${bg} ${color} group-hover:scale-110 transition duration-300`}>
                <Icon size={24} />
            </div>
            <span className="font-semibold text-gray-700 group-hover:text-blue-600 transition">{label}</span>
        </Link>
    );
}

export default ManagerDashboard;
