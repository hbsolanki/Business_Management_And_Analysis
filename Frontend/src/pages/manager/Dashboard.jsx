import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import ManagerHeader from "@/components/layout/ManagerHeader";
import api from "@/services/api";
import { tokenService } from "@/services/tokenService";
import { useDispatch, useSelector } from "react-redux";
import { toggleDashboardAction } from "@/redux/slices/quickActionsSlice";
import { selectManagerQuickSearchItems } from "@/redux/slices/quickSearchSlice";
import { fetchUserProfile } from "@/redux/slices/userSlice";
import { MANAGER_ACTIONS } from "@/config/quickActionsData";
import QuickActionsConfigModal from "@/components/shared/QuickActionsConfigModal";
import ChatUserModal from "@/components/shared/ChatUserModal";
import AiAgentFeaturedCard from "@/components/shared/AiAgentFeaturedCard";
import TaskQuickView from "@/features/task/components/TaskQuickView";
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
  FaCrown,
  FaHistory,
  FaTruck,
  FaFileExport,
  FaRobot,
  FaThLarge,
  FaWallet,
} from "react-icons/fa";
import LowStockAlert from "@/features/inventory/components/LowStockAlert";

function ManagerDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userId = tokenService.getId();

  const { profile: manager, loading: profileLoading } = useSelector(
    (state) => state.user,
  );
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true); // This loading state is now primarily for subscription
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const activeActionIds = useSelector(
    (state) => state.quickActions.dashboardActions,
  );
  const { chatPreferredUserId, chatPreferredUserName } = useSelector(
    (state) => state.quickActions,
  );
  const baseSearchItems = useSelector(selectManagerQuickSearchItems);

  // Handle profile initialization
  useEffect(() => {
    if (!manager && !profileLoading && userId) {
      dispatch(fetchUserProfile());
    }
  }, [manager, profileLoading, userId, dispatch]);

  // Handle data fetching (subscription, etc.)
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      try {
        const planRes = await api.get("/subscription/plan/purchased/");
        setSubscription(planRes.data || null);
      } catch (err) {
        console.error("Subscription fetch error:", err);
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchSubscriptionData();
    } else {
      navigate("/login");
    }
  }, [userId, navigate]);

  const toggleAction = (actionId) => {
    dispatch(toggleDashboardAction(actionId));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim().toLowerCase());
      setSelectedIndex(0);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const iconMap = useMemo(
    () => ({
      analytics: FaChartLine,
      employees: FaUsers,
      products: FaProductHunt,
      inventory: FaBoxOpen,
      supplier: FaTruck,
      invoices: FaCashRegister,
      costs: FaLayerGroup,
      chat: FaComments,
      tasks: FaTasks,
      profile: FaUser,
      edit_profile: FaEdit,
      ai_agent: FaRobot,
    }),
    [],
  );

  const searchItems = useMemo(() => baseSearchItems, [baseSearchItems]);

  const filteredItems = useMemo(() => {
    if (!debouncedQuery) return [];
    return searchItems.filter((item) => {
      const haystack =
        `${item.label} ${item.desc} ${item.group || ""} ${item.path || ""} ${(item.keywords || []).join(" ")}`.toLowerCase();
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
    setSelectedIndex(0);
  };

  const handleKeyDown = (e) => {
    if (!debouncedQuery || visibleItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % visibleItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + visibleItems.length) % visibleItems.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSearchSelect(visibleItems[selectedIndex]);
    } else if (e.key === "Escape") {
      setSearchQuery("");
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    if (!debouncedQuery) return;
    if (visibleItems.length > 0) {
      handleSearchSelect(visibleItems[selectedIndex]);
    }
  };

  const pinnedActions = activeActionIds
    .map((id) => MANAGER_ACTIONS[id])
    .filter(Boolean);

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
  const openChatPicker = () => setIsChatModalOpen(true);


  return (
    <div className="min-h-screen bg-transparent">
      <ManagerHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section - Aligned with Owner Dashboard */}
        <div className="relative mb-6 pt-2">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <div className="flex flex-col items-center gap-1">
              <span className="px-3 py-1 rounded-full bg-slate-100 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border border-slate-200">Manager Portal</span>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-brand-600 animate-gradient-x">
                  {manager.first_name}
                </span>
              </h1>
            </div>

            <div className="relative max-w-2xl mx-auto">
              <form
                onSubmit={handleSearchSubmit}
                className="relative group transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                  <FaSearch className="text-slate-400 text-lg group-focus-within:text-brand-600 transition-colors duration-300" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search operations, tasks, inventory..."
                  className="w-full pl-14 pr-6 py-4 rounded-full bg-white border border-slate-200/60 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-100 focus:border-brand-500 shadow-xl transition-all duration-300 text-lg"
                />
              </form>

              {/* Search Results Dropdown */}
              {debouncedQuery && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden py-3 z-50 animate-fade-in-up text-left">
                  <div className="px-5 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center border-b border-slate-50 pb-2 mb-1">
                    <span>Search Results</span>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-brand-600 hover:text-brand-700 hover:bg-brand-50 px-2 py-1 rounded-md transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  {visibleItems.length === 0 ? (
                    <div className="px-6 py-10 text-center">
                      <div className="text-4xl mb-3 opacity-20">🕵️‍♂️</div>
                      <p className="text-slate-500 font-medium tracking-tight">
                        No matches found for &quot;{searchQuery}&quot;
                      </p>
                      <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest">
                        Try searching for modules or keywords
                      </p>
                    </div>
                  ) : (
                    visibleItems.map((item, index) => (
                      <button
                        key={item.label}
                        onClick={() => handleSearchSelect(item)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`w-full text-left px-5 py-3 flex items-center gap-4 transition-all group border-l-4 ${selectedIndex === index
                          ? "bg-purple-50/50 border-purple-500"
                          : "hover:bg-slate-50 border-transparent"
                          }`}
                      >
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center ${item.bg || "bg-slate-50"} ${item.color || "text-slate-600"} shadow-sm group-hover:scale-110 transition-transform duration-300`}
                        >
                          {(() => {
                            const Icon = iconMap[item.icon] || FaThLarge;
                            return <Icon size={18} />;
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className={`font-semibold text-[15px] transition-colors ${selectedIndex === index ? "text-purple-600" : "text-slate-900"}`}
                            >
                              {(() => {
                                const parts = item.label.split(
                                  new RegExp(`(${debouncedQuery})`, "gi"),
                                );
                                return parts.map((part, i) =>
                                  part.toLowerCase() ===
                                    debouncedQuery.toLowerCase() ? (
                                    <span
                                      key={i}
                                      className="bg-purple-100 text-purple-700 rounded-sm px-0.5"
                                    >
                                      {part}
                                    </span>
                                  ) : (
                                    <span key={i}>{part}</span>
                                  ),
                                );
                              })()}
                            </p>
                            {item.group && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                                {item.group}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">
                            {item.desc}
                          </p>
                        </div>
                        <FaArrowRight
                          className={`ml-auto transition-all transform ${selectedIndex === index ? "text-purple-500 translate-x-1" : "text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1"}`}
                          size={14}
                        />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <LowStockAlert />

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,2.2fr)_minmax(320px,0.95fr)] 2xl:gap-8">
          {/* Left Column - Business Overview & Console */}
          <div className="min-w-0 space-y-6 xl:space-y-8">
            <div>
              <AiAgentFeaturedCard />
            </div>

            {/* Management Console */}
            <div className="glass-panel rounded-3xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FaCogs className="text-purple-600" /> Operations Console
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <AppCard
                  to="/analytics"
                  icon={FaChartLine}
                  label="Analytics"
                  color="text-indigo-600"
                  bg="bg-indigo-50"
                />
                <AppCard
                  to="/analytics/report"
                  icon={FaFileExport}
                  label="Report Center"
                  color="text-brand-600"
                  bg="bg-brand-50"
                />
                <AppCard
                  to="/employees/manage"
                  icon={FaUsers}
                  label="Employees"
                  color="text-brand-600"
                  bg="bg-brand-50"
                />
                <AppCard
                  to="/product"
                  icon={FaProductHunt}
                  label="Products"
                  color="text-orange-600"
                  bg="bg-orange-50"
                />
                <AppCard
                  to="/inventory"
                  icon={FaBoxOpen}
                  label="Inventory"
                  color="text-purple-600"
                  bg="bg-purple-50"
                />
                <AppCard
                  to="/supplier"
                  icon={FaTruck}
                  label="Suppliers"
                  color="text-amber-600"
                  bg="bg-amber-50"
                />
                <AppCard
                  to="/invoice"
                  icon={FaCashRegister}
                  label="Invoices"
                  color="text-emerald-600"
                  bg="bg-emerald-50"
                />
                <AppCard
                  to="/payment-dashboard"
                  icon={FaWallet}
                  label="Payments"
                  color="text-violet-600"
                  bg="bg-violet-50"
                />
                <AppCard
                  to="/cost-category"
                  icon={FaLayerGroup}
                  label="Costs"
                  color="text-rose-600"
                  bg="bg-rose-50"
                />
                <AppCard
                  to="/subscriptions"
                  icon={FaCrown}
                  label="Subscriptions"
                  color="text-slate-900"
                  bg="bg-slate-100"
                />
                <AppCard
                  to="/tasks"
                  icon={FaTasks}
                  label="Tasks"
                  color="text-pink-600"
                  bg="bg-pink-50"
                />
                <AppCard
                  to="/chat"
                  icon={FaComments}
                  label="Chat"
                  color="text-blue-600"
                  bg="bg-blue-50"
                />
                <AppCard
                  to="/activity-logs"
                  icon={FaHistory}
                  label="Activity Logs"
                  color="text-slate-900"
                  bg="bg-slate-100"
                />
              </div>
            </div>

            {/* Subscription */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
              <div className="glass-panel h-fit rounded-3xl p-6">
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                      <FaCrown size={18} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        Subscription
                      </h3>
                      <p className="text-xs text-gray-500">
                        Business plan status
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/subscriptions#current-plan"
                    className="inline-flex w-fit rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                  >
                    View Details
                  </Link>
                </div>
                {subscription ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {subscription.plan_name || "Current Plan"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          ₹{subscription.price} / {subscription.duration_days}{" "}
                          days
                        </p>
                      </div>
                      <span
                        className={`w-fit rounded-full border px-2.5 py-1 text-xs font-bold ${subscription.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}
                      >
                        {subscription.status ||
                          (subscription.is_active ? "active" : "inactive")}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 text-xs text-slate-600 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[10px] font-semibold uppercase text-slate-400">
                          Start
                        </p>
                        <p className="font-semibold text-slate-900">
                          {subscription.start_date
                            ? new Date(
                              subscription.start_date,
                            ).toLocaleDateString()
                            : "—"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[10px] font-semibold uppercase text-slate-400">
                          End
                        </p>
                        <p className="font-semibold text-slate-900">
                          {subscription.end_date
                            ? new Date(
                              subscription.end_date,
                            ).toLocaleDateString()
                            : "—"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-slate-400">
                              Remaining Days
                            </p>
                            <p className="font-semibold text-slate-900">
                              {subscription.remaining_days ?? "—"}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-bold ${subscription.is_trial ? "border border-amber-200 bg-amber-50 text-amber-700" : "border border-slate-200 bg-slate-100 text-slate-700"}`}
                          >
                            {subscription.is_trial ? "Trial" : "Paid"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
                    No active subscription found. Explore plans to get started.
                  </div>
                )}
              </div>

              <div className="glass-panel rounded-3xl p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">
                    <FaInfoCircle size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Manager Guide
                    </h3>
                    <p className="text-xs text-gray-500">
                      Learn daily operations, team tools, and approvals.
                    </p>
                  </div>
                </div>
                <div className="flex min-h-[160px] flex-col justify-between rounded-2xl bg-gray-50 p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">
                      Role
                    </p>
                    <p className="text-sm font-bold text-gray-900">Manager</p>
                  </div>
                  <Link
                    to="/info/manager"
                    className="mt-5 inline-flex w-fit rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-slate-800"
                  >
                    Open Guide
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Quick Actions & Profile */}
          <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            {/* Shortcuts */}
            <div className="glass-panel rounded-3xl p-6 relative">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">Shortcuts</h2>
                <button
                  onClick={() => setIsConfigModalOpen(true)}
                  className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors"
                >
                  CONFIGURE
                </button>
              </div>

              {pinnedActions.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                  <p className="text-gray-400 text-sm mb-3">
                    No actions pinned
                  </p>
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
                      onChatPick={openChatPicker}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Tasks Quick Views */}
            <div className="space-y-6">
              <div className="h-[300px] xl:h-[320px]">
                <TaskQuickView type="assigned_to" title="My Tasks" />
              </div>
              <div className="h-[300px] xl:h-[320px]">
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
    </div>
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
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center ${action.bg} ${action.color} group-hover:scale-110 transition-transform`}
        >
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
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${chatPreferredUserId ? "bg-brand-600 text-white hover:bg-brand-700" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
            >
              Open
            </button>
            <button
              onClick={onChatPick}
              className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200"
            >
              {chatPreferredUserId ? "Change" : "Select"}
            </button>
            <button
              onClick={onChatInbox}
              className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200"
            >
              Inbox
            </button>
          </div>
        </div>
      )}
    </Wrapper>
  );
}

function AppCard({
  to,
  icon: Icon,
  label,
  color,
  bg,
  description,
  featured = false,
}) {
  return (
    <Link
      to={to}
      className={`group rounded-2xl transition-all ${featured
          ? "col-span-2 md:col-span-4 flex flex-col md:flex-row md:items-center md:justify-between gap-5 rounded-3xl p-5 hover:bg-white/60"
          : "flex flex-col items-center justify-center gap-3 p-4 text-center hover:bg-gray-50"
        }`}
    >
      <div
        className={`flex ${featured ? "items-start gap-4" : "flex-col items-center gap-3"} min-w-0`}
      >
        <div
          className={`h-14 w-14 rounded-2xl ${bg} ${color} flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm`}
        >
          <Icon />
        </div>
        <div className={`${featured ? "text-left" : "text-center"}`}>
          <span className="block font-bold text-gray-700 text-sm md:text-base group-hover:text-gray-900">
            {label}
          </span>
          {description ? (
            <p
              className={`mt-1 text-xs leading-5 text-slate-500 ${featured ? "max-w-xl" : ""}`}
            >
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {featured ? (
        <div className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors group-hover:bg-brand-700">
          Open Workspace
        </div>
      ) : null}
    </Link>
  );
}

export default ManagerDashboard;
