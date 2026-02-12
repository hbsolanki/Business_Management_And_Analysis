import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import ManagerHeader from "@/components/layout/ManagerHeader";
import api from "@/services/api";
import { tokenService } from "@/services/tokenService";
import { useDispatch, useSelector } from "react-redux";
import { toggleDashboardAction } from "@/redux/slices/quickActionsSlice";
import { selectManagerQuickSearchItems } from "@/redux/slices/quickSearchSlice";
import { MANAGER_ACTIONS } from "@/config/quickActionsData";
import QuickActionsConfigModal from "@/components/shared/QuickActionsConfigModal";
import ChatUserModal from "@/components/shared/ChatUserModal";
import TaskQuickView from "@/features/task/components/TaskQuickView";
import { getTimeBasedGreeting } from "@/utils/dashboardHelpers";
import {
    FaUser,
    FaEdit,
    FaUsers,
    FaProductHunt,
    FaBoxOpen,
    FaCashRegister,
    FaLayerGroup,
    FaCogs,
    FaTasks,
    FaSearch,
    FaArrowRight,
    FaComments,
    FaChartLine,
    FaInfoCircle,
    FaCrown
} from "react-icons/fa";

function ManagerDashboard() {
    const [manager, setManager] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    const navigate = useNavigate();
    const userId = tokenService.getId();
    const dispatch = useDispatch();
    const activeActionIds = useSelector((state) => state.quickActions.dashboardActions);
    const { chatPreferredUserId, chatPreferredUserName } = useSelector((state) => state.quickActions);
    const baseSearchItems = useSelector(selectManagerQuickSearchItems);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            navigate("/login");
            return;
        }

        const fetchData = async () => {
            try {
                // Fetch User & Business Data
                const userRes = await api.get(`/user/${userId}/`);
                setManager(userRes.data);

                try {
                    const planRes = await api.get("/subscription/plan/purchased/");
                    setSubscription(planRes.data || null);
                } catch {
                    setSubscription(null);
                }

            } catch (err) {
                console.error("Dashboard data fetch error:", err);
                if (err.response?.status === 401) {
                    navigate("/login");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate, userId]);

    const toggleAction = (actionId) => {
        dispatch(toggleDashboardAction(actionId));
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery.trim().toLowerCase());
        }, 200);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const iconMap = useMemo(
        () => ({
            analytics: FaChartLine,
            employees: FaUsers,
            products: FaProductHunt,
            inventory: FaBoxOpen,
            invoices: FaCashRegister,
            costs: FaLayerGroup,
            chat: FaComments,
            tasks: FaTasks,
            profile: FaUser,
            edit_profile: FaEdit,
        }),
        []
    );

    const searchItems = useMemo(() => baseSearchItems, [baseSearchItems]);

    const filteredItems = useMemo(() => {
        if (!debouncedQuery) return [];
        return searchItems.filter((item) => {
            const haystack = `${item.label} ${item.desc} ${item.group || ""} ${item.path || ""} ${(item.keywords || []).join(" ")}`.toLowerCase();
            return haystack.includes(debouncedQuery);
        });
    }, [searchItems, debouncedQuery]);

    const visibleItems = debouncedQuery ? filteredItems : searchItems.slice(0, 3);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    if (!manager) return null;

    const handleSearchSelect = (item) => {
        navigate(item.path);
        setSearchQuery("");
    };

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        if (!debouncedQuery) return;
        if (filteredItems.length > 0) {
            handleSearchSelect(filteredItems[0]);
        }
    };

    const pinnedActions = activeActionIds.map((id) => MANAGER_ACTIONS[id]).filter(Boolean);

    const handleActionOpen = (action) => {
        if (action.id === "chat") {
            if (chatPreferredUserId) {
                navigate(`/chat?userId=${chatPreferredUserId}`);
            } else {
                setIsChatModalOpen(true);
            }
            return;
        }
        navigate(action.path);
    };

    const openChatInbox = () => navigate("/chat");
    const openChatBroadcast = () => navigate("/chat/broadcast/new");
    const openChatPicker = () => setIsChatModalOpen(true);

    const greeting = getTimeBasedGreeting();

    return (
        <div className="min-h-screen bg-transparent">
            <ManagerHeader />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Hero Section */}
                <div className="relative rounded-3xl bg-gradient-to-br from-purple-700 to-indigo-800 text-white shadow-xl p-8 md:p-10">
                    <div className="absolute inset-0 overflow-hidden rounded-3xl">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <FaCogs size={200} />
                        </div>
                    </div>

                    <div className="relative z-10 max-w-3xl">
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">
                            {greeting}, {manager.first_name}!
                        </h1>
                        <p className="text-purple-100 text-lg mb-8">
                            Ready to manage operations today?
                        </p>

                        <div className="relative max-w-2xl">
                            <form onSubmit={handleSearchSubmit}>
                                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search operations, tasks, inventory..."
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/95 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-400/30 shadow-lg text-base"
                                />
                            </form>

                            {/* Search Results Dropdown */}
                            {debouncedQuery && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl overflow-hidden py-2 z-50 animate-fade-in-up">
                                    <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider flex justify-between">
                                        <span>Search Results</span>
                                        <button onClick={() => setSearchQuery("")} className="text-purple-600 hover:underline">Clear</button>
                                    </div>
                                    {visibleItems.length === 0 ? (
                                        <div className="px-6 py-8 text-center text-gray-500">
                                            No matches found.
                                        </div>
                                    ) : (
                                        visibleItems.map((item) => (
                                            <button
                                                key={item.label}
                                                onClick={() => handleSearchSelect(item)}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-4 transition-colors border-b border-gray-50 last:border-none"
                                            >
                                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${item.bg} ${item.color}`}>
                                                    {(() => {
                                                        const Icon = iconMap[item.icon] || FaCogs;
                                                        return <Icon size={18} />;
                                                    })()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                                                    <p className="text-xs text-gray-500 truncate">{item.desc}</p>
                                                </div>
                                                <FaArrowRight className="ml-auto text-gray-300" />
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[2.5fr_1fr] gap-8">
                    {/* Left Column - Business Overview & Console */}
                    <div className="space-y-8">

                        {/* Management Console */}
                        <div className="glass-panel rounded-3xl p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <FaCogs className="text-purple-600" /> Operations Console
                                </h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <AppCard to="/analytics" icon={FaChartLine} label="Analytics" color="text-indigo-600" bg="bg-indigo-50" />
                                <AppCard to="/employees/manage" icon={FaUsers} label="Employees" color="text-brand-600" bg="bg-brand-50" />
                                <AppCard to="/product" icon={FaProductHunt} label="Products" color="text-orange-600" bg="bg-orange-50" />
                                <AppCard to="/inventory" icon={FaBoxOpen} label="Inventory" color="text-purple-600" bg="bg-purple-50" />
                                <AppCard to="/invoice" icon={FaCashRegister} label="Invoices" color="text-emerald-600" bg="bg-emerald-50" />
                                <AppCard to="/cost-category" icon={FaLayerGroup} label="Costs" color="text-rose-600" bg="bg-rose-50" />
                                <AppCard to="/subscriptions" icon={FaCrown} label="Subscriptions" color="text-slate-900" bg="bg-slate-100" />
                                <AppCard to="/tasks" icon={FaTasks} label="Tasks" color="text-pink-600" bg="bg-pink-50" />
                                <AppCard to="/chat" icon={FaComments} label="Chat" color="text-blue-600" bg="bg-blue-50" />
                            </div>
                        </div>

                        {/* Subscription */}
                        <div className="glass-panel rounded-3xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                                        <FaCrown size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Subscription</h3>
                                        <p className="text-xs text-gray-500">Business plan status</p>
                                    </div>
                                </div>
                                <Link
                                    to="/subscriptions#current-plan"
                                    className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                                >
                                    View Details
                                </Link>
                            </div>
                            {subscription ? (
                                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{subscription.plan_name || "Current Plan"}</p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                ₹{subscription.price} / {subscription.duration_days} days
                                            </p>
                                        </div>
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${subscription.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                                            {subscription.status || (subscription.is_active ? "active" : "inactive")}
                                        </span>
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600">
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                            <p className="text-[10px] uppercase text-slate-400 font-semibold">Start</p>
                                            <p className="font-semibold text-slate-900">
                                                {subscription.start_date ? new Date(subscription.start_date).toLocaleDateString() : "—"}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                            <p className="text-[10px] uppercase text-slate-400 font-semibold">End</p>
                                            <p className="font-semibold text-slate-900">
                                                {subscription.end_date ? new Date(subscription.end_date).toLocaleDateString() : "—"}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 col-span-2 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] uppercase text-slate-400 font-semibold">Remaining Days</p>
                                                <p className="font-semibold text-slate-900">{subscription.remaining_days ?? "—"}</p>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${subscription.is_trial ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-slate-100 text-slate-700 border border-slate-200"}`}>
                                                {subscription.is_trial ? "Trial" : "Paid"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                                    No active subscription found. Explore plans to get started.
                                </div>
                            )}
                        </div>

                        {/* Role Guide */}
                        <div className="glass-panel rounded-3xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center">
                                    <FaInfoCircle size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Manager Guide</h3>
                                    <p className="text-xs text-gray-500">Learn daily operations, team tools, and approvals.</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase">Role</p>
                                    <p className="text-sm font-bold text-gray-900">Manager</p>
                                </div>
                                <Link
                                    to="/info/manager"
                                    className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-all"
                                >
                                    Open Guide
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Quick Actions & Profile */}
                    <div className="space-y-8">
                        {/* Quick Actions */}
                        <div className="glass-panel rounded-3xl p-6 relative">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
                                <button
                                    onClick={() => setIsConfigModalOpen(true)}
                                    className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors"
                                >
                                    CONFIGURE
                                </button>
                            </div>

                            {pinnedActions.length === 0 ? (
                                <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                                    <p className="text-gray-400 text-sm mb-3">No actions pinned</p>
                                    <button
                                        onClick={() => setIsConfigModalOpen(true)}
                                        className="text-brand-600 font-bold text-sm hover:underline"
                                    >
                                        Add Shortcuts
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {pinnedActions.map((action) => (
                                        <QuickActionCard
                                            key={action.id}
                                            action={action}
                                            onOpen={() => handleActionOpen(action)}
                                            isChat={action.id === "chat"}
                                            chatPreferredUserName={chatPreferredUserName}
                                            chatPreferredUserId={chatPreferredUserId}
                                            onChatInbox={openChatInbox}
                                            onChatBroadcast={openChatBroadcast}
                                            onChatPick={openChatPicker}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Tasks Quick Views */}
                        <div className="space-y-6">
                            <div className="h-[320px]">
                                <TaskQuickView type="assigned_to" title="My Tasks" />
                            </div>
                            <div className="h-[320px]">
                                <TaskQuickView type="assigned_by" title="Tasks Created" />
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
function QuickActionCard({
    action,
    onOpen,
    isChat,
    chatPreferredUserName,
    chatPreferredUserId,
    onChatInbox,
    onChatBroadcast,
    onChatPick,
}) {
    const chatStatus = chatPreferredUserName
        ? `Chatting with: ${chatPreferredUserName}`
        : "No quick contact set";

    const Wrapper = isChat ? "div" : "button";

    return (
        <Wrapper
            type={isChat ? undefined : "button"}
            onClick={isChat ? undefined : onOpen}
            className={`w-full text-left p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all ${isChat ? "" : "group"}`}
        >
            <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${action.bg} ${action.color} group-hover:scale-110 transition-transform`}>
                    {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{action.label}</p>
                    <p className="text-xs text-gray-500 truncate">{action.desc}</p>
                </div>
            </div>

            {isChat && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-3 ml-1">{chatStatus}</p>
                    <div className="flex gap-2">
                        <button
                            onClick={onOpen}
                            disabled={!chatPreferredUserId}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${chatPreferredUserId ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                        >
                            Open
                        </button>
                        <button onClick={onChatPick} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200">
                            {chatPreferredUserId ? "Change" : "Select"}
                        </button>
                        <button onClick={onChatInbox} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200">
                            Inbox
                        </button>
                    </div>
                </div>
            )}
        </Wrapper>
    );
}

function AppCard({ to, icon: Icon, label, color, bg }) {
    return (
        <Link
            to={to}
            className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl hover:bg-gray-50 transition-all group text-center"
        >
            <div className={`h-14 w-14 rounded-2xl ${bg} ${color} flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm`}>
                <Icon />
            </div>
            <span className="font-bold text-gray-700 text-sm group-hover:text-gray-900">{label}</span>
        </Link>
    );
}

export default ManagerDashboard;
