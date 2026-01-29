import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import OwnerHeader from "@/components/layout/OwnerHeader";
import { toast } from "react-hot-toast";
import api from "@/services/api";
import { tokenService } from "@/services/tokenService";
import { useDispatch, useSelector } from "react-redux";
import { toggleQuickAction } from "@/redux/slices/quickActionsSlice";
import { OWNER_ACTIONS } from "@/config/quickActionsData";
import QuickActionsConfigModal from "@/components/shared/QuickActionsConfigModal";
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
    FaLayerGroup,
    FaUserTie,
    FaPlus,
    FaMoneyBillWave,
    FaThLarge
} from "react-icons/fa";

function Dashboard() {
    const [ownerData, setOwnerData] = useState(null);
    const [businessData, setBusinessData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    const navigate = useNavigate();
    const userId = tokenService.getId();
    const dispatch = useDispatch();
    const activeActionIds = useSelector((state) => state.quickActions.activeActionIds);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            navigate("/login");
            return;
        }

        api
            .get(`/user/${userId}/`)
            .then((res) => {
                setOwnerData(res.data);
                setBusinessData(res.data.business || null);
            })
            .catch((err) => {
                if (err.response?.status === 401) {
                    navigate("/login");
                }
            })
            .finally(() => setLoading(false));
    }, [navigate, userId]);

    const toggleAction = (actionId) => {
        dispatch(toggleQuickAction({
            actionId,
            role: 'owner'
        }));
    };

    const copyBusinessId = () => {
        if (businessData?.id) {
            navigator.clipboard.writeText(businessData.id);
            toast.success("Business ID copied!");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!ownerData) return null;

    // Renaming ownerData to user for consistency with the provided snippet
    const user = ownerData;

    return (
        <div className="min-h-screen bg-gray-50/50">
            <OwnerHeader />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Hero Section */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-800 shadow-xl text-white">
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-blue-500/20 rounded-full blur-2xl pointer-events-none"></div>

                    <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                {user?.profile_picture ? (
                                    <img
                                        alt={`${user.first_name?.[0]}${user.last_name?.[0]}`}
                                        src={user.profile_picture}
                                        className="h-24 w-24 rounded-2xl object-cover border-4 border-white/20 shadow-2xl bg-white/10"
                                    />
                                ) : (
                                    <div className="h-24 w-24 rounded-2xl bg-white/10 border-4 border-white/20 flex items-center justify-center text-white text-3xl font-bold shadow-2xl backdrop-blur-sm">
                                        {user?.first_name?.[0]}{user?.last_name?.[0]}
                                    </div>
                                )}
                                <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-indigo-800"></div>
                            </div>

                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                                        Welcome back, {user?.first_name}!
                                    </h1>
                                    <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-medium border border-white/10">
                                        Owner
                                    </span>
                                </div>
                                <p className="text-blue-100 text-lg">Welcome to your command center.</p>
                            </div>
                        </div>

                        <Link
                            to="/owner/edit"
                            className="group flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl border border-white/10"
                        >
                            <FaEdit className="group-hover:rotate-12 transition-transform" />
                            <span>Edit Profile</span>
                        </Link>
                    </div>
                </div>


                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column */}
                    <div className="md:col-span-2 space-y-8">
                        {/* Business Overview Card */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-all duration-300 relative">
                            {businessData ? (
                                <>
                                    <div className="p-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500"></div>
                                    <div className="p-6 md:p-8">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                                    <FaBuilding size={28} />
                                                </div>
                                                <div>
                                                    <h2 className="text-2xl font-bold text-gray-900">{businessData.name}</h2>
                                                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                        <span>ID: <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200 text-gray-700">{businessData.id}</span></span>
                                                        <button
                                                            onClick={copyBusinessId}
                                                            className="text-blue-600 hover:text-blue-800 text-xs font-semibold hover:underline"
                                                            title="Copy Business ID"
                                                        >
                                                            Copy
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <Link to={`/business/edit/${businessData.id}`} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                                                <FaEdit size={18} />
                                            </Link>
                                        </div>

                                        <p className="text-gray-600 leading-relaxed bg-gray-50/50 p-5 rounded-2xl border border-gray-100 text-sm">
                                            {businessData.description || "No description provided."}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="p-12 text-center">
                                    <div className="inline-flex p-4 bg-gray-50 rounded-full text-gray-400 mb-4">
                                        <FaBuilding size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Business Registered</h3>
                                    <p className="text-gray-500 mb-8">Register your business to unlock full features.</p>
                                    <Link to="/business/new" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-2">
                                        <FaPlus /> Register Business
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Apps & Tools */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <FaThLarge className="text-indigo-600" /> Apps & Tools
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <AppCard to="/analytics" icon={FaChartLine} label="Analytics" color="text-indigo-600" bg="bg-indigo-50" />
                                <AppCard to="/employees/manage" icon={FaUsers} label="Employees" color="text-blue-600" bg="bg-blue-50" />
                                <AppCard to="/manager/manage" icon={FaUserTie} label="Managers" color="text-cyan-600" bg="bg-cyan-50" />
                                <AppCard to="/product" icon={FaProductHunt} label="Products" color="text-orange-600" bg="bg-orange-50" />
                                <AppCard to="/inventory" icon={FaBoxOpen} label="Inventory" color="text-purple-600" bg="bg-purple-50" />
                                <AppCard to="/invoice" icon={FaCashRegister} label="Invoices" color="text-emerald-600" bg="bg-emerald-50" />
                                <AppCard to="/cost-category" icon={FaLayerGroup} label="Costs" color="text-rose-600" bg="bg-rose-50" />
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-8">
                        {/* Quick Actions */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    Quick Actions
                                </h2>
                                <button
                                    onClick={() => setIsConfigModalOpen(true)}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                >
                                    Configure
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {activeActionIds.length > 0 ? (
                                    activeActionIds.map(id => {
                                        const action = OWNER_ACTIONS[id];
                                        if (!action) return null;
                                        return (
                                            <QuickActionHorizontal
                                                key={id}
                                                to={action.path}
                                                icon={action.icon}
                                                label={action.label}
                                                desc={action.desc}
                                                color={action.color}
                                                bg={action.bg}
                                            />
                                        );
                                    })
                                ) : (
                                    <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                                        <p className="text-gray-500 text-sm mb-2">No quick actions pinned.</p>
                                        <button
                                            onClick={() => setIsConfigModalOpen(true)}
                                            className="text-blue-600 font-semibold text-sm hover:underline"
                                        >
                                            Add Actions
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Personal Details */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                                <FaUser className="text-blue-600" /> Personal Details
                            </h3>
                            <div className="space-y-6">
                                <InfoItem icon={FaUser} label="Full Name" value={`${user.first_name} ${user.last_name}`} />
                                <InfoItem icon={FaPhone} label="Mobile" value={user.mobile_number} />
                                <InfoItem icon={FaEnvelope} label="Email" value={user.email} />
                                <InfoItem icon={FaCalendarAlt} label="Joined" value={new Date(user.date_joined).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <QuickActionsConfigModal
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                availableActions={OWNER_ACTIONS}
                activeActionIds={activeActionIds}
                onToggleAction={toggleAction}
                themeColor="blue"
            />
        </div>
    );
}

// Sub-components

function QuickActionHorizontal({ to, icon, label, desc, color, bg }) {
    return (
        <Link
            to={to}
            className={`flex items-center gap-4 p-3 rounded-xl border border-transparent hover:border-gray-200 transition-all duration-200 group ${bg}`}
        >
            <div className={`p-2.5 rounded-lg bg-white shadow-sm ${color} group-hover:scale-105 transition-transform text-lg`}>
                {icon}
            </div>
            <div>
                <span className="block font-bold text-gray-900 text-sm">{label}</span>
                <span className="block text-xs text-gray-500">{desc}</span>
            </div>
        </Link>
    );
}

function StatCard({ label, value, icon: Icon, color, bg }) {
    return (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            {Icon && (
                <div className={`flex-shrink-0 p-3 rounded-xl ${bg} ${color}`}>
                    <Icon size={24} />
                </div>
            )}
            <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5 truncate">{label}</p>
                <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
            </div>
        </div>
    );
}

function AppCard({ to, icon: Icon, label, color, bg }) {
    return (
        <Link
            to={to}
            className="group p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center text-center gap-4"
        >
            <div className={`p-4 rounded-2xl ${bg} ${color} group-hover:ring-4 ring-opacity-30 ring-current transition-all duration-300`}>
                <Icon size={28} />
            </div>
            <span className="font-semibold text-gray-700 group-hover:text-gray-900 transition">{label}</span>
        </Link>
    );
}

function InfoItem({ icon: Icon, label, value }) {
    return (
        <div className="flex items-start gap-4 p-2 hover:bg-gray-50 rounded-xl transition-colors">
            <div className="p-2.5 bg-gray-100 rounded-xl text-gray-500">
                <Icon size={16} />
            </div>
            <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
                <p className="text-gray-800 font-medium text-sm break-all">{value || "Not set"}</p>
            </div>
        </div>
    );
}

export default Dashboard;
