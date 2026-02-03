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

export default function Broadcast() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [activeGroupId, setActiveGroupId] = useState(null);

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
            setGroups(res.data || []);
        } catch (err) {
            console.error("Failed to fetch groups", err);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await api.get("/business/users/");
            const currentUserId = Number(tokenService.getId());
            setUsers((res.data || []).filter(u => u.id !== currentUserId));
        } catch (err) {
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
                const isInGroup = group.users.some(gu => (gu.user_id || gu.id || gu) == u.id);
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
            ? users.filter(u => u.role?.toUpperCase() === role.toUpperCase())
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
        const groupUserIds = group.users.map(u => Number(u.user_id || u.id || u));
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
        const groupUserIds = group.users.map(u => Number(u.user_id || u.id || u));
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
            users: Array.from(selectedUserIds).map(id => ({ user_id: id }))
        };

        try {
            setSending(true);
            await api.post("/chat/broadcast/message/", payload);
            toast.success("Message broadcasted successfully!");
            setMessage("");
            clearSelection();
        } catch (err) {
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

    return (
        <div className="min-h-screen bg-[#f8f9fc] flex flex-col font-sans text-slate-800">
            <ProtectedHeader />

            <div className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 pb-24">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate("/chat")}
                            className="p-3 bg-white rounded-full text-slate-400 shadow-sm border border-slate-100 hover:bg-white hover:text-indigo-600 hover:border-indigo-100 hover:shadow-md transition-all active:scale-95"
                        >
                            <FaArrowLeft className="text-lg" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Broadcast</h1>
                            <p className="text-slate-500 font-medium">Reach your team instantly</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 h-auto lg:h-[calc(100vh-220px)]">

                    {/* LEFT PANEL: SELECTION */}
                    <div className="lg:col-span-8 flex flex-col gap-6 h-full min-h-0">

                        {/* 1. GROUPS SECTION */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col shrink-0">
                            <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2 text-indigo-900 font-bold">
                                    <FaLayerGroup className="text-indigo-500" />
                                    <span>Groups</span>
                                </div>
                                <div className="flex-1 max-w-xs relative">
                                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                                    <input
                                        type="text"
                                        placeholder="Search groups..."
                                        value={groupSearchQuery}
                                        onChange={(e) => setGroupSearchQuery(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                                    />
                                </div>
                                <button
                                    onClick={() => navigate("/chat/broadcast/new")}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow flex items-center gap-1.5 active:scale-95"
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
                                                className={`
                                                group relative shrink-0 pl-3 pr-4 py-2.5 rounded-xl border cursor-pointer transition-all select-none flex items-center gap-3 min-w-[140px] max-w-[220px]
                                                ${activeGroupId === group.id
                                                        ? 'bg-indigo-50 border-indigo-300 shadow-md ring-1 ring-indigo-200'
                                                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'}
                                            `}
                                                title="Click to filter, Double-click to edit"
                                            >
                                                {/* Edit Button overlay on hover or if needed */}
                                                <button
                                                    onClick={(e) => handleEditGroup(e, group)}
                                                    className="absolute top-1 right-1 p-1 bg-white/80 hover:bg-white text-slate-400 hover:text-indigo-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                                    title="Edit Group"
                                                >
                                                    <FaEdit size={10} />
                                                </button>

                                                {/* Selection Checkbox */}
                                                <div
                                                    onClick={(e) => handleGroupSelectToggle(e, group)}
                                                    className={`
                                                    w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 z-10
                                                    ${selectionState === 'all'
                                                            ? 'bg-indigo-600 border-indigo-600'
                                                            : selectionState === 'some'
                                                                ? 'bg-indigo-600 border-indigo-600'
                                                                : 'bg-white border-slate-300 hover:border-indigo-400'}
                                                `}
                                                >
                                                    {selectionState === 'all' && <FaCheck size={10} className="text-white" />}
                                                    {selectionState === 'some' && <div className="w-2.5 h-0.5 bg-white rounded-full" />}
                                                </div>

                                                <div className="flex flex-col min-w-0">
                                                    <span className={`text-sm font-bold truncate block ${activeGroupId === group.id ? 'text-indigo-900' : 'text-slate-700'}`}>
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
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col flex-1 min-h-0">
                            <div className="p-4 border-b border-slate-50 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-800 font-bold">
                                        <FaAddressBook className="text-slate-400" />
                                        <span>Recipients</span>
                                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                            {filteredUsers.length}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        {selectedUserIds.size > 0 && (
                                            <button
                                                onClick={clearSelection}
                                                className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
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
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-sm transition-all"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => selectAll()}
                                            className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                                        >
                                            <FaCheck size={10} /> All Shown
                                        </button>
                                        <button
                                            onClick={() => selectAll("EMPLOYEE")}
                                            className="px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                                        >
                                            <FaUsers size={12} /> Employees
                                        </button>
                                        <button
                                            onClick={() => selectAll("MANAGER")}
                                            className="px-3 py-2.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                                        >
                                            <FaUserTie size={12} /> Managers
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-slate-50/30">
                                {loading ? (
                                    <div className="flex justify-center items-center h-40">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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
                                                    className={`
                                                        p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all select-none relative overflow-hidden group
                                                        ${isSelected
                                                            ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-200'
                                                            : 'bg-white border-transparent hover:bg-white hover:border-slate-200 hover:shadow-md border-slate-100'}
                                                    `}
                                                >
                                                    {isSelected && <div className="absolute top-0 right-0 w-8 h-8 bg-indigo-100/50 rounded-bl-full -mr-4 -mt-4 z-0"></div>}

                                                    <div className={`
                                                        w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 z-10
                                                        ${isSelected
                                                            ? 'bg-indigo-600 border-indigo-600'
                                                            : 'border-slate-300 bg-white group-hover:border-indigo-300'}
                                                    `}>
                                                        {isSelected && <FaCheck size={9} className="text-white" />}
                                                    </div>

                                                    <div className="flex items-center gap-3 min-w-0 z-10">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${isSelected ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                                            {getInitials(user)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                                {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
                                                            </h4>
                                                            <p className="text-xs text-slate-500 capitalize flex items-center gap-1">
                                                                {user.role === 'MANAGER' ? <FaUserTie size={10} /> : <FaUser size={10} />}
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
                        <div className="bg-white rounded-2xl shadow-xl shadow-indigo-100/50 border border-slate-100 flex flex-col p-6 h-full">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <FaPaperPlane className="transform -rotate-12 translate-x-0.5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-extrabold text-slate-900">Compose</h2>
                                    <p className="text-xs text-slate-500">Send to selected users</p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between items-end mb-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recipients</label>
                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{selectedUserIds.size} Selected</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500 transition-all duration-500 ease-out"
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
                                    className="flex-1 w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 resize-none outline-none text-slate-700 leading-relaxed transition-all placeholder:text-slate-400"
                                ></textarea>

                                <div className="absolute bottom-4 right-4 text-xs text-slate-400 font-medium bg-white/80 backdrop-blur px-2 py-1 rounded-md">
                                    {message.length} chars
                                </div>
                            </div>

                            <button
                                onClick={handleSendBroadcast}
                                disabled={sending || selectedUserIds.size === 0 || !message.trim()}
                                className={`
                                    mt-6 w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg
                                    ${sending || selectedUserIds.size === 0 || !message.trim()
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/30 active:scale-[0.98]'}
                                `}
                            >
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
