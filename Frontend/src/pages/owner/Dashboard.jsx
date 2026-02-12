import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import OwnerHeader from "@/components/layout/OwnerHeader";
import api from "@/services/api";
import { tokenService } from "@/services/tokenService";
import { toast } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { toggleDashboardAction } from "@/redux/slices/quickActionsSlice";
import { selectOwnerQuickSearchItems } from "@/redux/slices/quickSearchSlice";
import { OWNER_ACTIONS } from "@/config/quickActionsData";
import QuickActionsConfigModal from "@/components/shared/QuickActionsConfigModal";
import ChatUserModal from "@/components/shared/ChatUserModal";
import TaskQuickView from "@/features/task/components/TaskQuickView";
import { getTimeBasedGreeting } from "@/utils/dashboardHelpers";
import {
    FaUser,
    FaEdit,
    FaBuilding,
    FaUsers,
    FaProductHunt,
    FaBoxOpen,
    FaCashRegister,
    FaLayerGroup,
    FaUserTie,
    FaPlus,
    FaThLarge,
    FaComments,
    FaTasks,
    FaSearch,
    FaArrowRight,
    FaChartLine,
    FaInfoCircle,
    FaCrown
} from "react-icons/fa";

function OwnerDashboard() {
    const [owner, setOwner] = useState(null);
    const [businessData, setBusinessData] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [showBusinessModal, setShowBusinessModal] = useState(false);
    const [businessSaving, setBusinessSaving] = useState(false);
    const [businessErrors, setBusinessErrors] = useState({});
    const [businessForm, setBusinessForm] = useState({
        name: "",
        gst_number: "",
        description: ""
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    const navigate = useNavigate();
    const userId = tokenService.getId();
    const dispatch = useDispatch();
    const activeActionIds = useSelector((state) => state.quickActions.dashboardActions);
    const { chatPreferredUserId, chatPreferredUserName } = useSelector((state) => state.quickActions);
    const baseSearchItems = useSelector(selectOwnerQuickSearchItems);

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
                setOwner(userRes.data);
                setBusinessData(userRes.data.business || null);

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
    }, [userId, navigate]);

    const toggleAction = (actionId) => {
        dispatch(toggleDashboardAction(actionId));
    };

    const businessShortcut = businessData?.id
        ? { label: "Business Settings", desc: "Edit your business profile", path: `/business/edit/${businessData.id}` }
        : { label: "Register Business", desc: "Create your business profile", path: "/business/new" };

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
            managers: FaUserTie,
            products: FaProductHunt,
            inventory: FaBoxOpen,
            invoices: FaCashRegister,
            costs: FaLayerGroup,
            chat: FaComments,
            tasks: FaTasks,
            business: FaBuilding,
            profile: FaUser,
            edit_profile: FaEdit,
        }),
        []
    );

    const searchItems = useMemo(() => {
        const businessItem = {
            label: businessShortcut.label,
            desc: businessShortcut.desc,
            path: businessShortcut.path,
            icon: "business",
            group: "Company",
            keywords: ["company", "business"],
        };
        return [...baseSearchItems, businessItem];
    }, [baseSearchItems, businessShortcut.label, businessShortcut.desc, businessShortcut.path]);

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
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    if (!owner) return null;

    const user = owner;
    const greeting = getTimeBasedGreeting();

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

    const pinnedActions = activeActionIds.map((id) => OWNER_ACTIONS[id]).filter(Boolean);

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

    const handleBusinessChange = (e) => {
        const { name, value } = e.target;
        setBusinessForm((prev) => ({ ...prev, [name]: value }));
        if (businessErrors[name]) {
            setBusinessErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    const handleBusinessSubmit = async (e) => {
        e.preventDefault();
        const nextErrors = {};
        if (!businessForm.name.trim()) nextErrors.name = "Business name is required";
        if (!businessForm.description.trim()) nextErrors.description = "Description is required";
        if (Object.keys(nextErrors).length) {
            setBusinessErrors(nextErrors);
            return;
        }
        setBusinessSaving(true);
        setBusinessErrors({});
        try {
            const res = await api.post("/business/", {
                name: businessForm.name.trim(),
                gst_number: businessForm.gst_number?.trim() || null,
                description: businessForm.description.trim()
            });
            setBusinessData(res.data || null);
            toast.success("Business registered");
            setShowBusinessModal(false);
        } catch (err) {
            if (err.response?.data && typeof err.response.data === "object") {
                setBusinessErrors(err.response.data);
            } else {
                toast.error("Failed to register business");
            }
        } finally {
            setBusinessSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-transparent">
            <OwnerHeader />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {!businessData ? (
                    <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
                        <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mb-4">
                            <FaBuilding />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">Register your business</h2>
                        <p className="text-slate-500 mt-2">
                            You need a business profile before accessing products, invoices, analytics, and team tools.
                        </p>
                        <button
                            onClick={() => setShowBusinessModal(true)}
                            className="mt-6 inline-flex items-center justify-center px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all"
                        >
                            Register Business
                        </button>
                    </div>
                ) : (
                    <>

                        {/* Hero Section with Search & Greeting */}
                        <div className="relative mb-12 text-center">
                            <div className="relative z-10 max-w-4xl mx-auto pt-8 pb-4">
                                <h1 className="text-4xl font-bold mb-8 text-slate-800 tracking-tight">
                                    {greeting}, <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-indigo-600">{user.first_name}</span>
                                </h1>

                                <div className="relative max-w-2xl mx-auto">
                                    <form onSubmit={handleSearchSubmit} className="relative group transition-all duration-300 transform hover:-translate-y-0.5">
                                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                            <FaSearch className="text-slate-400 text-lg group-focus-within:text-brand-600 transition-colors duration-300" />
                                        </div>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search apps, employees, analytics..."
                                            className="w-full pl-14 pr-6 py-4 rounded-full bg-white border border-slate-200/60 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-100 focus:border-brand-500 shadow-xl transition-all duration-300 text-lg"
                                        />
                                    </form>

                                    {/* Search Results Dropdown */}
                                    {debouncedQuery && (
                                        <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden py-3 z-50 animate-fade-in-up text-left">
                                            <div className="px-5 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center border-b border-slate-50 pb-2 mb-1">
                                                <span>Search Results</span>
                                                <button onClick={() => setSearchQuery("")} className="text-brand-600 hover:text-brand-700 hover:bg-brand-50 px-2 py-1 rounded-md transition-colors">Clear</button>
                                            </div>
                                            {visibleItems.length === 0 ? (
                                                <div className="px-6 py-10 text-center">
                                                    <div className="text-4xl mb-3 opacity-20">🕵️‍♂️</div>
                                                    <p className="text-slate-500 font-medium">No matches found.</p>
                                                    <p className="text-xs text-slate-400 mt-1">Try searching for modules or keywords.</p>
                                                </div>
                                            ) : (
                                                visibleItems.map((item) => (
                                                    <button
                                                        key={item.label}
                                                        onClick={() => handleSearchSelect(item)}
                                                        className="w-full text-left px-5 py-3 hover:bg-slate-50 flex items-center gap-4 transition-all group"
                                                    >
                                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${item.bg} ${item.color} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                                            {(() => {
                                                                const Icon = iconMap[item.icon] || FaThLarge;
                                                                return <Icon size={18} />;
                                                            })()}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-slate-900 text-[15px] group-hover:text-brand-600 transition-colors">{item.label}</p>
                                                            <p className="text-xs text-slate-500 truncate">{item.desc}</p>
                                                        </div>
                                                        <FaArrowRight className="ml-auto text-slate-300 group-hover:text-brand-400 transition-colors transform group-hover:translate-x-1" size={14} />
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>



                        <div className="grid grid-cols-1 xl:grid-cols-[2.5fr_1fr] gap-8">
                            {/* Left Main Column */}
                            <div className="space-y-8">

                                {/* Application Grid */}
                                <div className="glass-panel rounded-3xl p-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                            <FaThLarge className="text-brand-600" /> Management Modules
                                        </h2>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        <AppCard to="/analytics" icon={FaChartLine} label="Analytics" color="text-indigo-600" bg="bg-indigo-50" />
                                        <AppCard to="/employees/manage" icon={FaUsers} label="Employees" color="text-brand-600" bg="bg-brand-50" />
                                        <AppCard to="/manager/manage" icon={FaUserTie} label="Managers" color="text-cyan-600" bg="bg-cyan-50" />
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
                                            <h3 className="text-lg font-bold text-gray-900">Owner Guide</h3>
                                            <p className="text-xs text-gray-500">Learn features, permissions, and best workflows.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4">
                                        <div>
                                            <p className="text-xs font-semibold text-gray-400 uppercase">Role</p>
                                            <p className="text-sm font-bold text-gray-900">Business Owner</p>
                                        </div>
                                        <Link
                                            to="/info/owner"
                                            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-all"
                                        >
                                            Open Guide
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            {/* Right Sidebar */}
                            <div className="space-y-8">
                                {/* Quick Actions (Pinned) */}
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
                                            <button onClick={() => setIsConfigModalOpen(true)} className="text-brand-600 font-bold text-sm hover:underline">
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

                                {/* Recent Tasks */}
                                <div className="h-[400px]">
                                    <TaskQuickView type="assigned_by" title="Recent Tasks" />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <QuickActionsConfigModal
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                availableActions={OWNER_ACTIONS}
                activeActionIds={activeActionIds}
                onToggleAction={toggleAction}
                themeColor="blue"
            />

            <ChatUserModal
                isOpen={isChatModalOpen}
                onClose={() => setIsChatModalOpen(false)}
            />

            {showBusinessModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-900">Register Business</h3>
                            <p className="text-sm text-slate-500">Complete basic details to get started.</p>
                        </div>
                        <form onSubmit={handleBusinessSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Business Name</label>
                                <input
                                    name="name"
                                    value={businessForm.name}
                                    onChange={handleBusinessChange}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
                                    placeholder="Enter business name"
                                />
                                {businessErrors.name && (
                                    <p className="text-rose-600 text-xs mt-1">{businessErrors.name}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GST Number</label>
                                <input
                                    name="gst_number"
                                    value={businessForm.gst_number}
                                    onChange={handleBusinessChange}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
                                    placeholder="Enter GST number"
                                />
                                {businessErrors.gst_number && (
                                    <p className="text-rose-600 text-xs mt-1">{businessErrors.gst_number}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</label>
                                <textarea
                                    name="description"
                                    rows={3}
                                    value={businessForm.description}
                                    onChange={handleBusinessChange}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
                                    placeholder="Describe your business"
                                />
                                {businessErrors.description && (
                                    <p className="text-rose-600 text-xs mt-1">{businessErrors.description}</p>
                                )}
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowBusinessModal(false)}
                                    className="px-4 py-2 rounded-xl text-slate-600 font-semibold bg-slate-100 hover:bg-slate-200 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={businessSaving}
                                    className={`px-5 py-2 rounded-xl text-white font-semibold transition ${businessSaving
                                        ? "bg-slate-300 cursor-not-allowed"
                                        : "bg-slate-900 hover:bg-slate-800"
                                        }`}
                                >
                                    {businessSaving ? "Saving..." : "Create Business"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Sub-components

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

export default OwnerDashboard;
