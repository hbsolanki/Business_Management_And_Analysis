import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import ManagerHeader from "@/components/layout/ManagerHeader";
import api from "@/services/api";
import { tokenService } from "@/services/tokenService";
import { useDispatch, useSelector } from "react-redux";
import { toggleDashboardAction } from "@/redux/slices/quickActionsSlice";
import { MANAGER_ACTIONS } from "@/config/quickActionsData";
import QuickActionsConfigModal from "@/components/shared/QuickActionsConfigModal";
import ChatUserModal from "@/components/shared/ChatUserModal";
import TaskQuickView from "@/features/task/components/TaskQuickView";
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
    FaLayerGroup,
    FaUserTie,
    FaCogs,
    FaTasks
} from "react-icons/fa";

function ManagerDashboard() {
    const [manager, setManager] = useState(null);
    const [businessData, setBusinessData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);

    const navigate = useNavigate();
    const userId = tokenService.getId();
    const dispatch = useDispatch();
    const activeActionIds = useSelector((state) => state.quickActions.dashboardActions);
    const chatPreferredUserId = useSelector((state) => state.quickActions.chatPreferredUserId);

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

    const toggleAction = (actionId) => {
        dispatch(toggleDashboardAction(actionId));
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!manager) return null;

    return (
        <div className="min-h-screen bg-gray-50/50">
            <ManagerHeader />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Hero Section */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-800 shadow-xl text-white">
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-blue-500/20 rounded-full blur-2xl pointer-events-none"></div>

                    <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                {manager.profile_picture ? (
                                    <img
                                        alt={`${manager.first_name?.[0]}${manager.last_name?.[0]}`}
                                        src={manager.profile_picture}
                                        className="h-24 w-24 rounded-2xl object-cover border-4 border-white/20 shadow-2xl bg-white/10"
                                    />
                                ) : (
                                    <div className="h-24 w-24 rounded-2xl bg-white/10 border-4 border-white/20 flex items-center justify-center text-white text-3xl font-bold shadow-2xl backdrop-blur-sm">
                                        {manager.first_name?.[0]}{manager.last_name?.[0]}
                                    </div>
                                )}
                                <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-indigo-800"></div>
                            </div>

                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                                        Hello, {manager.first_name}!
                                    </h1>
                                    <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-medium border border-white/10">
                                        Manager
                                    </span>
                                </div>
                                <p className="text-blue-100 text-lg">Manage operations efficiently.</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            {/* Additional Action Buttons could go here */}
                            <button className="px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl font-medium transition-all border border-white/10">
                                View Reports
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Business Overview & Console */}
                    <div className="lg:col-span-2 space-y-8">
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
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Business Data</h3>
                                    <p className="text-gray-500">Contact owner for details.</p>
                                </div>
                            )}
                        </div>

                        {/* Management Console */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <FaCogs className="text-gray-700" /> Management Console
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <AppCard to="/analytics" icon={FaChartLine} label="Analytics" color="text-indigo-600" bg="bg-indigo-50" />
                                <AppCard to="/employees/manage" icon={FaUsers} label="Employees" color="text-blue-600" bg="bg-blue-50" />
                                <AppCard to="/product" icon={FaProductHunt} label="Products" color="text-orange-600" bg="bg-orange-50" />
                                <AppCard to="/inventory" icon={FaBoxOpen} label="Inventory" color="text-purple-600" bg="bg-purple-50" />
                                <AppCard to="/invoice" icon={FaCashRegister} label="Invoices" color="text-emerald-600" bg="bg-emerald-50" />
                                <AppCard to="/cost-category" icon={FaLayerGroup} label="Costs" color="text-rose-600" bg="bg-rose-50" />
                                <AppCard to="/tasks" icon={FaTasks} label="Tasks" color="text-pink-600" bg="bg-pink-50" />
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Quick Actions & Profile */}
                    <div className="space-y-8">
                        {/* Quick Actions */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    Quick Actions
                                </h2>
                                <button
                                    onClick={() => setIsConfigModalOpen(true)}
                                    className="text-sm font-medium text-purple-600 hover:text-purple-700 hover:underline"
                                >
                                    Configure
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {activeActionIds.length > 0 ? (
                                    activeActionIds.map(id => {
                                        const action = MANAGER_ACTIONS[id];
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
                                                onClick={(e) => {
                                                    if (action.id === 'chat') {
                                                        e.preventDefault();
                                                        if (chatPreferredUserId) {
                                                            navigate(`/chat?userId=${chatPreferredUserId}`);
                                                        } else {
                                                            setIsChatModalOpen(true);
                                                        }
                                                    }
                                                }}
                                            />
                                        );
                                    })
                                ) : (
                                    <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                                        <p className="text-gray-500 text-sm mb-2">No quick actions pinned.</p>
                                        <button
                                            onClick={() => setIsConfigModalOpen(true)}
                                            className="text-purple-600 font-semibold text-sm hover:underline"
                                        >
                                            Add Actions
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tasks Quick Views */}
                        <div className="grid grid-cols-1 gap-6">
                            <div className="h-80">
                                <TaskQuickView type="assigned_to" title="My Tasks" />
                            </div>
                            <div className="h-80">
                                <TaskQuickView type="assigned_by" title="Tasks Created" />
                            </div>
                        </div>

                        {/* Personal Details */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                                <FaUser className="text-emerald-600" /> Personal Details
                            </h3>
                            <div className="space-y-6">
                                <InfoItem icon={FaUser} label="Full Name" value={`${manager.first_name} ${manager.last_name}`} />
                                <InfoItem icon={FaPhone} label="Mobile" value={manager.mobile_number} />
                                <InfoItem icon={FaEnvelope} label="Email" value={manager.email} />
                                <InfoItem icon={FaCalendarAlt} label="Joined" value={new Date(manager.date_joined).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <QuickActionsConfigModal
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                availableActions={MANAGER_ACTIONS}
                activeActionIds={activeActionIds}
                onToggleAction={toggleAction}
                themeColor="purple"
            />

            <ChatUserModal
                isOpen={isChatModalOpen}
                onClose={() => setIsChatModalOpen(false)}
            />
        </div >
    );
}

// Sub-components
function QuickActionHorizontal({ to, icon, label, desc, color, bg, onClick }) {
    return (
        <Link
            to={to}
            onClick={onClick}
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

export default ManagerDashboard;
