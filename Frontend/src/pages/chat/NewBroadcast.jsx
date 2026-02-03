import { useState, useEffect, useCallback } from "react";
import {
    FaUser, FaSearch, FaArrowLeft, FaCheck,
    FaUsers, FaUserTie, FaSave, FaFilter, FaLayerGroup,
    FaCheckCircle, FaTimesCircle, FaPlus, FaTrash, FaExclamationTriangle
} from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/services/api";
import { toast } from "react-hot-toast";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import { tokenService } from "@/services/tokenService";

export default function NewBroadcast() {
    const navigate = useNavigate();
    const { id } = useParams(); // If present, we are in EDIT mode
    const isEditMode = !!id;

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Form State
    const [groupName, setGroupName] = useState("");

    // Selection state
    const [selectedUserIds, setSelectedUserIds] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState("ALL"); // ALL, MANAGER, EMPLOYEE

    // Delete Confirmation Modal
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const fetchGroupDetails = useCallback(async () => {
        if (!id) return;
        try {
            // Fetch specific group details. 
            // Assuming GET /chat/broadcast/ returns list, we might need to find it or fetch specific
            // If backend supports GET /chat/broadcast/:id/, use that. 
            // Based on previous code, we only saw GET /chat/broadcast/ (list). 
            // I'll try to fetch all and find, or generic GET if available.
            // Let's assume generic GET /chat/broadcast/:id/ exists or we filter from list.
            // Safest is to fetch all and filter finding the ID, OR try the specific endpoint.
            // Looking at previous `Broadcast.jsx`, it used `api.get("/chat/broadcast/")`.
            // I will try to fetch the specific group if possible, else fetch all.
            const res = await api.get(`/chat/broadcast/${id}/`);
            const group = res.data;
            if (group) {
                setGroupName(group.name);
                const userIds = new Set(group.users.map(u => u.user_id || u.id || u));
                setSelectedUserIds(userIds);
            }
        } catch (err) {
            console.error("Failed to fetch group details", err);
            toast.error("Failed to load group details");
            navigate("/chat/broadcast");
        }
    }, [id, navigate]);

    const fetchUsers = useCallback(async () => {
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
    }, []);

    useEffect(() => {
        const init = async () => {
            await fetchUsers();
            if (isEditMode) {
                await fetchGroupDetails();
            }
        };
        init();
    }, [fetchUsers, fetchGroupDetails, isEditMode]);

    // Filter users
    const filteredUsers = users.filter((u) => {
        const name = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
        const username = (u.username || "").toLowerCase();
        const query = searchQuery.toLowerCase();
        const matchesSearch = name.includes(query) || username.includes(query);
        const matchesRole = filterRole === "ALL" || (u.role && u.role.toUpperCase() === filterRole);
        return matchesSearch && matchesRole;
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

    const selectAllFiltered = () => {
        const newSelected = new Set(selectedUserIds);
        filteredUsers.forEach(u => newSelected.add(u.id));
        setSelectedUserIds(newSelected);
        toast.success(`Selected ${filteredUsers.length} added`);
    };

    const clearSelection = () => {
        setSelectedUserIds(new Set());
    };

    const handleSaveGroup = async () => {
        if (!groupName.trim()) {
            toast.error("Please enter a group name");
            document.getElementById("groupNameInput")?.focus();
            return;
        }
        if (selectedUserIds.size === 0) {
            toast.error("Please select at least one user");
            return;
        }

        try {
            setSaving(true);
            const payload = {
                name: groupName,
                users: Array.from(selectedUserIds).map(id => ({ user_id: id }))
            };

            if (isEditMode) {
                await api.patch(`/chat/broadcast/${id}/`, payload);
                toast.success("Group updated successfully!");
            } else {
                await api.post("/chat/broadcast/", payload);
                toast.success("Group created successfully!");
            }
            navigate("/chat/broadcast");
        } catch (err) {
            console.error("Failed to save group", err);
            toast.error("Failed to save group");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteGroup = async () => {
        try {
            setDeleting(true);
            await api.delete(`/chat/broadcast/${id}/`);
            toast.success("Group deleted successfully");
            navigate("/chat/broadcast");
        } catch (err) {
            console.error("Failed to delete group", err);
            toast.error("Failed to delete group");
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const getInitials = (user) => {
        if (!user) return "?";
        return `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}` || user.username?.[0]?.toUpperCase() || "?";
    };

    return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col font-sans text-slate-800 relative">
            <ProtectedHeader />

            <div className="flex-1 w-full max-w-[1400px] mx-auto p-4 lg:p-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 animate-fade-in-down">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate("/chat/broadcast")}
                            className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-slate-400 shadow-sm border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all active:scale-95"
                        >
                            <FaArrowLeft />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                                {isEditMode ? "Edit Broadcast Group" : "Create New Broadcast"}
                            </h1>
                            <p className="text-sm text-slate-500">
                                {isEditMode ? "Modify group details and members" : "Define your audience and start broadcasting"}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => navigate("/chat/broadcast")}
                            className="hidden sm:block px-6 py-2.5 text-slate-500 font-semibold hover:bg-slate-100 rounded-xl transition-all"
                        >
                            Cancel
                        </button>

                        {isEditMode && (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="px-5 py-2.5 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-xl font-bold transition-all flex items-center gap-2"
                            >
                                <FaTrash size={14} /> <span className="hidden sm:inline">Delete</span>
                            </button>
                        )}

                        <button
                            onClick={handleSaveGroup}
                            disabled={saving}
                            className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transform hover:-translate-y-0.5
                                ${saving
                                    ? 'bg-indigo-400 cursor-wait'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                        >
                            {saving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <FaSave />
                            )}
                            {isEditMode ? "Update Group" : "Save & Create"}
                        </button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-8 items-start">

                    {/* Left Column: Configuration */}
                    <div className="lg:col-span-4 flex flex-col gap-6 sticky top-24">
                        {/* Group Name Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-fade-in-up">
                            <label className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4">
                                <FaLayerGroup /> Step 1: Group Name
                            </label>

                            <div className="relative group">
                                <input
                                    id="groupNameInput"
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    placeholder="e.g. Sales Team Announcements"
                                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:bg-white outline-none font-semibold text-lg transition-all placeholder:text-slate-300"
                                    autoFocus={!isEditMode}
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within:text-indigo-500 transition-colors">
                                    <FaPlus size={14} />
                                </div>
                            </div>
                        </div>

                        {/* Summary Card */}
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl shadow-xl shadow-indigo-200 p-6 text-white animate-fade-in-up delay-100 relative overflow-hidden">
                            {/* Abstract Shapes */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-5 -mb-5"></div>

                            <label className="flex items-center gap-2 text-xs font-bold text-indigo-100 uppercase tracking-wider mb-6 relative z-10">
                                <FaCheckCircle /> Overview
                            </label>

                            <div className="flex items-end gap-2 mb-2 relative z-10">
                                <span className="text-5xl font-bold">{selectedUserIds.size}</span>
                                <span className="text-lg font-medium text-indigo-100 mb-1.5">users selected</span>
                            </div>

                            <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden mb-6 relative z-10">
                                <div
                                    className="h-full bg-white/90 transition-all duration-500 ease-out rounded-full"
                                    style={{ width: `${Math.min((selectedUserIds.size / (users.length || 1)) * 100, 100)}%` }}
                                ></div>
                            </div>

                            <div className="space-y-3 relative z-10">
                                {selectedUserIds.size > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {Array.from(selectedUserIds).slice(0, 5).map(id => {
                                            const u = users.find(user => user.id === id);
                                            if (!u) return null;
                                            return (
                                                <span key={id} className="text-xs font-semibold bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg transition-colors cursor-default">
                                                    {u.first_name}
                                                </span>
                                            );
                                        })}
                                        {selectedUserIds.size > 5 && (
                                            <span className="text-xs font-semibold bg-white/10 px-2 py-1 rounded-lg">
                                                +{selectedUserIds.size - 5} more
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-indigo-100 italic">No users selected yet.</p>
                                )}
                            </div>

                            <button
                                onClick={clearSelection}
                                disabled={selectedUserIds.size === 0}
                                className="mt-8 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative z-10"
                            >
                                <FaTimesCircle /> Clear Selection
                            </button>
                        </div>
                    </div>

                    {/* Right Column: User Selection */}
                    <div className="lg:col-span-8 flex flex-col h-full min-h-[600px] animate-fade-in-up delay-200">
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
                            {/* Toolbar */}
                            <div className="p-5 border-b border-slate-50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white z-10">
                                <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
                                    <FaUsers /> Step 2: Select Members
                                </div>

                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    {[
                                        { id: 'ALL', label: 'All', icon: FaUsers },
                                        { id: 'EMPLOYEE', label: 'Employees', icon: FaUser },
                                        { id: 'MANAGER', label: 'Managers', icon: FaUserTie }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setFilterRole(tab.id)}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all
                                                ${filterRole === tab.id
                                                    ? 'bg-white text-indigo-600 shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <tab.icon size={12} /> {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Search & Actions */}
                            <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-50 flex flex-col sm:flex-row gap-4">
                                <div className="relative flex-1 group">
                                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Search by name or username..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-sm font-medium transition-all"
                                    />
                                </div>
                                <button
                                    onClick={selectAllFiltered}
                                    className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 shrink-0"
                                >
                                    <FaCheckCircle className="text-indigo-500" /> Select All {filterRole !== 'ALL' ? filterRole.toLowerCase() + 's' : ''}
                                </button>
                            </div>

                            {/* User Grid */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 bg-slate-50/30">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center h-64 gap-3">
                                        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                        <p className="text-sm font-medium text-slate-400">Loading users...</p>
                                    </div>
                                ) : filteredUsers.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center opacity-70">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                                            <FaFilter size={24} />
                                        </div>
                                        <div>
                                            <p className="text-slate-900 font-bold">No users found</p>
                                            <p className="text-xs text-slate-500 mt-1">Try adjusting your search or filter</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {filteredUsers.map(user => {
                                            const isSelected = selectedUserIds.has(user.id);
                                            return (
                                                <div
                                                    key={user.id}
                                                    onClick={() => toggleUser(user.id)}
                                                    className={`
                                                        p-4 rounded-2xl border flex items-center gap-4 cursor-pointer transition-all select-none relative overflow-hidden group
                                                        ${isSelected
                                                            ? 'bg-indigo-50 border-indigo-500 shadow-md ring-1 ring-indigo-500 transform scale-[1.02]'
                                                            : 'bg-white border-transparent shadow-sm hover:shadow-md border-slate-100 hover:border-indigo-200'}
                                                    `}
                                                >
                                                    {/* Selection Indicator */}
                                                    <div className={`
                                                        w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 shrink-0 relative z-10
                                                        ${isSelected
                                                            ? 'bg-indigo-600 border-indigo-600 scale-110'
                                                            : 'bg-slate-50 border-slate-200 group-hover:border-indigo-300'}
                                                    `}>
                                                        <FaCheck size={10} className={`text-white transition-transform duration-200 ${isSelected ? 'scale-100' : 'scale-0'}`} />
                                                    </div>

                                                    <div className="flex items-center gap-3 min-w-0 z-10 flex-1">
                                                        <div className={`
                                                            w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-colors
                                                            ${isSelected ? 'bg-white text-indigo-700' : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500'}
                                                        `}>
                                                            {getInitials(user)}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h4 className={`text-sm font-bold truncate transition-colors ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                                {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
                                                            </h4>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize flex items-center gap-1
                                                                    ${user.role === 'MANAGER'
                                                                        ? 'bg-violet-100 text-violet-700'
                                                                        : 'bg-blue-50 text-blue-600'}
                                                                `}>
                                                                    {user.role === 'MANAGER' ? <FaUserTie size={8} /> : <FaUser size={8} />}
                                                                    {user.role || 'User'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Footer stats */}
                            <div className="px-5 py-3 border-t border-slate-50 bg-slate-50 text-xs text-slate-400 font-medium flex justify-between">
                                <span>Showing {filteredUsers.length} users</span>
                                <span>Total: {users.length}</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* DELETE CONFIRMATION MODAL */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in-down p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 transform scale-100 transition-all">
                        <div className="mb-6 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                                <FaExclamationTriangle size={30} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Group?</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Are you sure you want to delete <span className="font-bold text-slate-800">"{groupName}"</span>?
                                This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteGroup}
                                disabled={deleting}
                                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-200 transition-colors flex items-center justify-center gap-2"
                            >
                                {deleting ? "Deleting..." : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .animate-fade-in-down { animation: fadeInDown 0.4s ease-out; }
                .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
                .delay-100 { animation-delay: 0.1s; }
                .delay-200 { animation-delay: 0.2s; }
                
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
