import { useState, useEffect } from "react";
import {
    FaUser, FaSearch, FaArrowLeft, FaPaperPlane, FaSpinner, FaCheck,
    FaUsers, FaUserTie, FaPlus, FaFilter, FaLayerGroup, FaAddressBook
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { toast } from "react-hot-toast";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import { tokenService } from "@/services/tokenService";
import { FaEdit } from "react-icons/fa";
import SubscriptionNotice from "@/components/shared/SubscriptionNotice";

export default function Broadcast() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [activeGroupId, setActiveGroupId] = useState(null);
    const [subscriptionError, setSubscriptionError] = useState("");

    // Selection state
    const [selectedUserIds, setSelectedUserIds] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [groupSearchQuery, setGroupSearchQuery] = useState("");

    // Message state
    const [message, setMessage] = useState("");

    // Fetch users AND groups
    useEffect(() => {
        fetchUsers();
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            const res = await api.get("/chat/broadcast/");
            setGroups(res.data?.results || (Array.isArray(res.data) ? res.data : []));
        } catch (err) {
            const detail = err?.response?.data?.detail || err?.response?.data?.message;
            if (err?.response?.status === 403 && typeof detail === "string" && detail.toLowerCase().includes("subscription")) {
                setSubscriptionError(detail);
                return;
            }
            console.error("Failed to fetch groups", err);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const currentUserId = Number(tokenService.getId());
            const res = await api.get("/user/");
            // Filter out current user on frontend
            const users = (res.data.results || []).filter(u => u.id !== currentUserId);
            setUsers(users);
        } catch (err) {
            const detail = err?.response?.data?.detail || err?.response?.data?.message;
            if (err?.response?.status === 403 && typeof detail === "string" && detail.toLowerCase().includes("subscription")) {
                setSubscriptionError(detail);
                return;
            }
            console.error("Failed to fetch users", err);
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    // Filter Groups
    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(groupSearchQuery.toLowerCase())
    );

    // Filter users
    const filteredUsers = users.filter((u) => {
        const name = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
        const username = (u.username || "").toLowerCase();
        const query = searchQuery.toLowerCase();
        const matchesSearch = name.includes(query) || username.includes(query);

        if (activeGroupId) {
            const group = groups.find(g => g.id === activeGroupId);
            if (group) {
                // Loose equality for ID matching
                // GET returns users as [{user: {id, ...}}]
                const isInGroup = group.users.some(gu => (gu.user?.id || gu.user_id || gu.id || gu) == u.id);
                return matchesSearch && isInGroup;
            }
        }
        return matchesSearch;
    });

    // Handlers
    const toggleUser = (id) => {
        const newSelected = new Set(selectedUserIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedUserIds(newSelected);
    };

    const selectAll = (role = null) => {
        const newSelected = new Set(selectedUserIds);
        const usersToSelect = role
            ? users.filter(u => {
                const roleStr = typeof u.role === 'object' ? u.role.role : u.role;
                return roleStr?.toUpperCase() === role.toUpperCase();
            })
            : filteredUsers; // If no role, select all currently filtered

        usersToSelect.forEach(u => newSelected.add(u.id));
        setSelectedUserIds(newSelected);
        toast.success(`Selected ${usersToSelect.length} users`);
    };

    const clearSelection = () => {
        setSelectedUserIds(new Set());
        setActiveGroupId(null);
    };

    const handleGroupClick = (group) => {
        if (activeGroupId === group.id) {
            setActiveGroupId(null);
            return;
        }
        setActiveGroupId(group.id);
    };

    const handleEditGroup = (e, group) => {
        e.stopPropagation();
        navigate(`/chat/broadcast/${group.id}/edit`);
    };

    const handleGroupSelectToggle = (e, group) => {
        e.stopPropagation();
        // GET returns users as [{user: {id, ...}}]
        const groupUserIds = group.users.map(u => Number(u.user?.id || u.user_id || u.id || u));
        const validGroupUserIds = groupUserIds.filter(id => users.some(u => u.id === id));

        const allSelected = validGroupUserIds.length > 0 && validGroupUserIds.every(id => selectedUserIds.has(id));

        const newSelected = new Set(selectedUserIds);
        if (allSelected) {
            validGroupUserIds.forEach(id => newSelected.delete(id));
        } else {
            validGroupUserIds.forEach(id => newSelected.add(id));
        }
        setSelectedUserIds(newSelected);
    };

    const getGroupSelectionState = (group) => {
        // GET returns users as [{user: {id, ...}}]
        const groupUserIds = group.users.map(u => Number(u.user?.id || u.user_id || u.id || u));
        const validGroupUserIds = groupUserIds.filter(id => users.some(u => u.id === id));
        if (validGroupUserIds.length === 0) return 'none';

        const selectedCount = validGroupUserIds.filter(id => selectedUserIds.has(id)).length;
        if (selectedCount === validGroupUserIds.length) return 'all';
        if (selectedCount > 0) return 'some';
        return 'none';
    };

    const handleSendBroadcast = async () => {
        if (selectedUserIds.size === 0) {
            toast.error("Please select at least one user");
            return;
        }
        if (!message.trim()) {
            toast.error("Please enter a message");
            return;
        }

        const payload = {
            message: message,
            users: Array.from(selectedUserIds).map(id => ({ user_id: Number(id) }))
        };

        try {
            setSending(true);
            await api.post("/chat/broadcast/message/", payload);
            toast.success("Message broadcasted successfully!");
            setMessage("");
            clearSelection();
        } catch (err) {
            const detail = err?.response?.data?.detail || err?.response?.data?.message;
            if (err?.response?.status === 403 && typeof detail === "string" && detail.toLowerCase().includes("subscription")) {
                setSubscriptionError(detail);
                return;
            }
            console.error("Broadcast failed", err);
            toast.error(err.response?.data?.error || "Failed to send broadcast");
        } finally {
            setSending(false);
        }
    };

    const getInitials = (user) => {
        if (!user) return "?";
        return `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}` || user.username?.[0]?.toUpperCase() || "?";
    };

    const renderUserAvatar = (user, isSelected = false) => {
        if (user?.profile_picture) {
            return (
                <img
                    src={user.profile_picture}
                    alt={user.username || "User"}
                    className={`w-10 h-10 rounded-full object-cover border ${isSelected ? "border-slate-300" : "border-slate-200"}`}
                />
            );
        }
        return (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                {getInitials(user)}
            </div>
        );
    };

    if (subscriptionError) {
        return (
            <div className="min-h-screen bg-slate-50">
                <ProtectedHeader />
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <SubscriptionNotice
                        title={subscriptionError}
                        message="Broadcast is available only with an active plan. Please choose a plan to continue."
                        ctaLabel="Choose Plan"
                        ctaTo="/subscriptions"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-slate-50">
            <ProtectedHeader />

            <div className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 pb-24">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate("/chat")}
                            className="bg-white border border-slate-200 p-3 rounded-full text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95"
                        >
                            <FaArrowLeft className="text-lg" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Broadcast</h1>
                            <p className="text-slate-500 font-medium">Reach your team instantly</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 h-auto lg:h-[calc(100vh-220px)]">

                    {/* LEFT PANEL: SELECTION */}
                    <div className="lg:col-span-8 flex flex-col gap-6 h-full min-h-0">

                        {/* 1. GROUPS SECTION */}
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shrink-0 shadow-sm">
                            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2 text-slate-900 font-semibold">
                                    <FaLayerGroup className="text-slate-700" />
                                    <span>Groups</span>
                                </div>
                                <div className="flex-1 max-w-xs relative">
                                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                                    <input
                                        type="text"
                                        placeholder="Search groups..."
                                        value={groupSearchQuery}
                                        onChange={(e) => setGroupSearchQuery(e.target.value)}
                                        className="w-full input-icon-left pr-3 py-1.5 rounded-lg text-sm border border-slate-200 focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-none transition-all placeholder:text-slate-400 bg-white"
                                    />
                                </div>
                                <button
                                    onClick={() => navigate("/chat/broadcast/new")}
                                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                                >
                                    <FaPlus /> New
                                </button>
                            </div>

                            <div className="p-4 overflow-x-auto custom-scrollbar flex items-center gap-3">
                                {filteredGroups.length === 0 ? (
                                    <div className="text-sm text-slate-400 italic px-2">
                                        {groupSearchQuery ? "No matching groups found" : "No groups created yet"}
                                    </div>
                                ) : (
                                    filteredGroups.map(group => {
                                        const selectionState = getGroupSelectionState(group);
                                        return (
                                            <div
                                                key={group.id}
                                                onClick={() => handleGroupClick(group)}
                                                onDoubleClick={(e) => handleEditGroup(e, group)}
                                                className={` group relative shrink-0 pl-3 pr-4 py-2.5 rounded-xl cursor-pointer transition-all select-none flex items-center gap-3 min-w-[140px] max-w-[220px] border ${activeGroupId === group.id ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50'} `} title="Click to filter, Double-click to edit"
                                            >
                                                {/* Edit Button overlay on hover or if needed */}
                                                <button
                                                    onClick={(e) => handleEditGroup(e, group)}
                                                    className="absolute top-1 right-1 p-1 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                                    title="Edit Group"
                                                >
                                                    <FaEdit size={10} />
                                                </button>

                                                {/* Selection Checkbox */}
                                                <div
                                                    onClick={(e) => handleGroupSelectToggle(e, group)}
                                                    className={` w-5 h-5 rounded-md flex items-center justify-center transition-colors shrink-0 z-10 ${selectionState === 'all' ? 'bg-slate-900 border-slate-900' : selectionState === 'some' ? 'bg-slate-900 border-slate-900' : 'bg-white border border-slate-200 hover:border-slate-400'} `}>
                                                    {selectionState === 'all' && <FaCheck size={10} className="text-white" />}
                                                    {selectionState === 'some' && <div className="w-2.5 h-0.5 bg-white rounded-full" />}
                                                </div>

                                                <div className="flex flex-col min-w-0">
                                                    <span className={`text-sm font-semibold truncate block ${activeGroupId === group.id ? 'text-slate-900' : 'text-slate-700'}`}>
                                                        {group.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-medium">
                                                        {group.users?.length || 0} Members
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                        {/* 2. RECIPIENTS SECTION */}
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col flex-1 min-h-0 shadow-sm">
                            <div className="p-4 border-b border-slate-200 space-y-4 bg-slate-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-800 font-semibold">
                                        <FaAddressBook className="text-slate-400" />
                                        <span>Recipients</span>
                                        <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                                            {filteredUsers.length}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        {selectedUserIds.size > 0 && (
                                            <button
                                                onClick={clearSelection}
                                                className="text-xs font-semibold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                Clear Selection
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="relative flex-1">
                                        <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search name or username..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full input-icon-left pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-none text-sm transition-all"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => selectAll()}
                                            className="px-3 py-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-200"
                                        >
                                            <FaCheck size={10} /> All Shown
                                        </button>
                                        <button
                                            onClick={() => selectAll("EMPLOYEE")}
                                            className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                                        >
                                            <FaUsers size={12} /> Employees
                                        </button>
                                        <button
                                            onClick={() => selectAll("MANAGER")}
                                            className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                                        >
                                            <FaUserTie size={12} /> Managers
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-white">
                                {loading ? (
                                    <div className="flex justify-center items-center h-40">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                                    </div>
                                ) : filteredUsers.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                        <FaFilter className="text-3xl opacity-20" />
                                        <p>No users matching filter</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-2">
                                        {filteredUsers.map(user => {
                                            const isSelected = selectedUserIds.has(user.id);
                                            return (
                                                <div
                                                    key={user.id}
                                                    onClick={() => toggleUser(user.id)}
                                                    className={`bg-white p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-all select-none relative overflow-hidden group border ${isSelected ? 'bg-slate-100 border-slate-300' : 'border-slate-200 hover:bg-slate-50'} `}>
                                                    {isSelected && <div className="absolute top-0 right-0 w-8 h-8 bg-slate-200/60 rounded-bl-full -mr-4 -mt-4 z-0"></div>}

                                                    <div className={` w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 z-10 ${isSelected ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-200 group-hover:border-slate-400'} `}>
                                                        {isSelected && <FaCheck size={9} className="text-white" />}
                                                    </div>

                                                    <div className="flex items-center gap-3 min-w-0 z-10">
                                                        {renderUserAvatar(user, isSelected)}
                                                        <div className="min-w-0">
                                                            <h4 className={`text-sm font-semibold truncate ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                                                                {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
                                                            </h4>
                                                            <p className="text-xs text-slate-500 capitalize flex items-center gap-1">
                                                                {(typeof user.role === 'object' ? user.role.role : user.role) === 'MANAGER' ? <FaUserTie size={10} /> : <FaUser size={10} />}
                                                                {user.role || 'User'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL: COMPOSE */}
                    <div className="lg:col-span-4 flex flex-col h-full min-h-0">
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col p-6 h-full">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200">
                                    <FaPaperPlane className="transform -rotate-12 translate-x-0.5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">Compose</h2>
                                    <p className="text-xs text-slate-500">Send to selected users</p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between items-end mb-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recipients</label>
                                    <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">{selectedUserIds.size} Selected</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-slate-900 transition-all duration-500 ease-out"
                                        style={{ width: `${Math.min((selectedUserIds.size / (users.length || 1)) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col min-h-0 relative">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Message</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Type your broadcast message here..."
                                    className="flex-1 w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none outline-none text-slate-700 leading-relaxed transition-all placeholder:text-slate-400"
                                ></textarea>

                                <div className="absolute bottom-4 right-4 text-xs text-slate-400 font-medium bg-white px-2 py-1 rounded-md border border-slate-200">
                                    {message.length} chars
                                </div>
                            </div>

                            <button
                                onClick={handleSendBroadcast}
                                disabled={sending || selectedUserIds.size === 0 || !message.trim()}
                                className={` mt-6 w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${sending || selectedUserIds.size === 0 || !message.trim() ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98]'} `}>
                                {sending ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                                Send Broadcast
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
