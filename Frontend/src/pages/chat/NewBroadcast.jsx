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
import SubscriptionNotice from "@/components/shared/SubscriptionNotice";

export default function NewBroadcast() {
    const navigate = useNavigate();
    const { id } = useParams(); // If present, we are in EDIT mode
    const isEditMode = !!id;

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [subscriptionError, setSubscriptionError] = useState("");

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
                // GET returns users as [{user: {id, first_name, ...}}]
                const userIds = new Set(group.users.map(u => Number(u.user?.id || u.user_id || u.id || u)));
                setSelectedUserIds(userIds);
            }
        } catch (err) {
            const detail = err?.response?.data?.detail || err?.response?.data?.message;
            if (err?.response?.status === 403 && typeof detail === "string" && detail.toLowerCase().includes("subscription")) {
                setSubscriptionError(detail);
                return;
            }
            console.error("Failed to fetch group details", err);
            toast.error("Failed to load group details");
            navigate("/chat/broadcast");
        }
    }, [id, navigate]);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get("/user/");
            const currentUserId = Number(tokenService.getId());
            setUsers((res.data.results || []).filter(u => u.id !== currentUserId));
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
        const roleStr = typeof u.role === 'object' ? u.role.role : u.role;
        const matchesRole = filterRole === "ALL" || (roleStr && roleStr.toUpperCase() === filterRole);
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
                users: Array.from(selectedUserIds).map(id => ({ user_id: Number(id) }))
            };

            if (isEditMode) {
                await api.patch(`/chat/broadcast/${id}/`, payload);
                toast.success("Group updated successfully!");
            } else {
                await api.post("/chat/broadcast/", payload);
                toast.success("Group created successfully!");
            }
            navigate(-1);
        } catch (err) {
            const detail = err?.response?.data?.detail || err?.response?.data?.message;
            if (err?.response?.status === 403 && typeof detail === "string" && detail.toLowerCase().includes("subscription")) {
                setSubscriptionError(detail);
                return;
            }
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
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
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
                        message="Broadcast groups are available only with an active plan. Please choose a plan to continue."
                        ctaLabel="Choose Plan"
                        ctaTo="/subscriptions"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col font-sans text-slate-800 relative bg-slate-50">
            <ProtectedHeader />

            <div className="flex-1 w-full max-w-[1400px] mx-auto p-4 lg:p-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 animate-fade-in-down">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate("/chat/broadcast")}
                            className="bg-white border border-slate-200 w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95"
                        >
                            <FaArrowLeft />
                        </button>
                        <div>
                            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
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
                            className="hidden sm:block px-6 py-2.5 text-slate-500 font-semibold hover:bg-slate-50 rounded-xl transition-all"
                        >
                            Cancel
                        </button>

                        {isEditMode && (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-xl font-semibold transition-all flex items-center gap-2"
                            >
                                <FaTrash size={14} /> <span className="hidden sm:inline">Delete</span>
                            </button>
                        )}

                        <button
                            onClick={handleSaveGroup}
                            disabled={saving}
                            className={`px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-sm
                                ${saving
                                    ? 'bg-slate-400 cursor-wait text-white'
                                    : 'bg-slate-900 text-white hover:bg-slate-800'}`}
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
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 animate-fade-in-up shadow-sm">
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-4">
                                <FaLayerGroup /> Step 1: Group Name
                            </label>

                            <div className="relative group">
                                <input
                                    id="groupNameInput"
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    placeholder="e.g. Sales Team Announcements"
                                    className="w-full pl-4 input-icon-right py-4 bg-white border border-slate-200 rounded-xl focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none font-semibold text-lg transition-all placeholder:text-slate-300"
                                    autoFocus={!isEditMode}
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within:text-slate-500 transition-colors">
                                    <FaPlus size={14} />
                                </div>
                            </div>
                        </div>

                        {/* Summary Card */}
                        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 text-slate-900 animate-fade-in-up delay-100 relative overflow-hidden">

                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-6 relative z-10">
                                <FaCheckCircle /> Overview
                            </label>

                            <div className="flex items-end gap-2 mb-2 relative z-10">
                                <span className="text-5xl font-semibold text-slate-900">{selectedUserIds.size}</span>
                                <span className="text-lg font-medium text-slate-500 mb-1.5">users selected</span>
                            </div>

                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-6 relative z-10">
                                <div
                                    className="h-full bg-slate-900 transition-all duration-500 ease-out rounded-full"
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
                                                <span key={id} className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors cursor-default border border-slate-200">
                                                    {u.first_name}
                                                </span>
                                            );
                                        })}
                                        {selectedUserIds.size > 5 && (
                                            <span className="text-xs font-semibold bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                                                +{selectedUserIds.size - 5} more
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 italic">No users selected yet.</p>
                                )}
                            </div>

                            <button
                                onClick={clearSelection}
                                disabled={selectedUserIds.size === 0}
                                className="mt-8 w-full py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative z-10 border border-slate-200"
                            >
                                <FaTimesCircle /> Clear Selection
                            </button>
                        </div>
                    </div>

                    {/* Right Column: User Selection */}
                    <div className="lg:col-span-8 flex flex-col h-full min-h-[600px] animate-fade-in-up delay-200">
                        <div className="bg-white border border-slate-200 rounded-3xl flex flex-col h-full overflow-hidden shadow-sm">
                            {/* Toolbar */}
                            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50 z-10">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    <FaUsers /> Step 2: Select Members
                                </div>

                                <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                                    {[
                                        { id: 'ALL', label: 'All', icon: FaUsers },
                                        { id: 'EMPLOYEE', label: 'Employees', icon: FaUser },
                                        { id: 'MANAGER', label: 'Managers', icon: FaUserTie }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setFilterRole(tab.id)}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${filterRole === tab.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                                            <tab.icon size={12} /> {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Search & Actions */}
                            <div className="px-5 py-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row gap-4">
                                <div className="relative flex-1 group">
                                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Search by name or username..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full input-icon-left pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-none text-sm font-medium transition-all bg-white"
                                    />
                                </div>
                                <button
                                    onClick={selectAllFiltered}
                                    className="bg-white border border-slate-200 px-4 py-2.5 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0"
                                >
                                    <FaCheckCircle className="text-slate-700" /> Select All {filterRole !== 'ALL' ? filterRole.toLowerCase() + 's' : ''}
                                </button>
                            </div>

                            {/* User Grid */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 bg-white">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center h-64 gap-3">
                                        <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                                        <p className="text-sm font-medium text-slate-400">Loading users...</p>
                                    </div>
                                ) : filteredUsers.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center opacity-70">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 border border-slate-200">
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
                                                    className={`bg-white p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all select-none relative overflow-hidden group border ${isSelected ? 'bg-slate-100 border-slate-300 ring-1 ring-slate-200 transform scale-[1.01]' : 'border-slate-200 hover:bg-slate-50'} `}>
                                                    {/* Selection Indicator */}
                                                    <div className={` w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 shrink-0 relative z-10 ${isSelected ? 'bg-slate-900 border-slate-900 scale-110' : 'bg-white border-slate-200 group-hover:border-slate-400'} `}>
                                                        <FaCheck size={10} className={`text-white transition-transform duration-200 ${isSelected ? 'scale-100' : 'scale-0'}`} />
                                                    </div>

                                                    <div className="flex items-center gap-3 min-w-0 z-10 flex-1">
                                                        {renderUserAvatar(user, isSelected)}
                                                        <div className="min-w-0 flex-1">
                                                            <h4 className={`text-sm font-semibold truncate transition-colors ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                                                                {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
                                                            </h4>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize flex items-center gap-1 border border-slate-200 bg-slate-100 text-slate-700`}>
                                                                    {(typeof user.role === 'object' ? user.role.role : user.role) === 'MANAGER' ? <FaUserTie size={8} /> : <FaUser size={8} />}
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
                            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 font-medium flex justify-between">
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
                    <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-sm w-full p-6 transform scale-100 transition-all">
                        <div className="mb-6 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4 border border-red-200">
                                <FaExclamationTriangle size={30} />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-2">Delete Group?</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Are you sure you want to delete <span className="font-bold text-slate-800">&quot;{groupName}&quot;</span>?
                                This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-3 bg-white hover:bg-slate-100 text-slate-600 rounded-xl font-semibold transition-colors border border-slate-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteGroup}
                                disabled={deleting}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
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
