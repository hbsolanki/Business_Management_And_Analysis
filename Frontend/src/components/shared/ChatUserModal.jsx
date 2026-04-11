import { useState, useEffect, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { FaTimes, FaComments, FaSearch, FaUser, FaUserTie } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import SubscriptionNotice from "@/components/shared/SubscriptionNotice";

import { useDispatch, useSelector } from "react-redux";
import { setChatPreferredUser } from "@/redux/slices/quickActionsSlice";
import { tokenService } from "@/services/tokenService";

export default function ChatUserModal({ isOpen, onClose }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [subscriptionError, setSubscriptionError] = useState("");
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { chatPreferredUserId, chatPreferredUserName } = useSelector((state) => state.quickActions);
    const role = tokenService.getRole();

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            setSearchTerm("");
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await api.get("/user/");
            if (res.data && Array.isArray(res.data.results)) {
                setUsers(res.data.results);
            } else if (Array.isArray(res.data)) {
                setUsers(res.data);
            } else {
                setUsers([]);
            }
        } catch (err) {
            const detail = err?.response?.data?.detail || err?.response?.data?.message;
            if (err?.response?.status === 403 && typeof detail === "string" && detail.toLowerCase().includes("subscription")) {
                setSubscriptionError(detail);
                setUsers([]);
                return;
            }
            console.error("Failed to fetch users", err);
        } finally {
            setLoading(false);
        }
    };

    const handleChat = (id) => {
        const user = users.find((item) => String(item.id) === String(id));
        const name = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username : chatPreferredUserName;
        dispatch(setChatPreferredUser({ id, name }));
        navigate(`/chat?userId=${id}`);
        onClose();
    };

    const openInbox = () => {
        navigate("/chat");
        onClose();
    };

    const openBroadcast = () => {
        navigate("/chat/broadcast/new");
        onClose();
    };

    const clearPreferred = () => {
        dispatch(setChatPreferredUser(null));
    };

    const preferredUser = users.find((item) => String(item.id) === String(chatPreferredUserId));
    const preferredName = preferredUser
        ? `${preferredUser.first_name || ""} ${preferredUser.last_name || ""}`.trim() || preferredUser.username
        : chatPreferredUserName;

    // Filter users based on search term
    const filteredUsers = users.filter(user => {
        const term = searchTerm.toLowerCase();
        const fullName = `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase();
        const username = (user.username || "").toLowerCase();
        const roleObj = user.role;
        const roleStr = (typeof roleObj === "object" ? roleObj.role : roleObj) || "";
        const userRole = roleStr.toLowerCase();

        return fullName.includes(term) || username.includes(term) || userRole.includes(term);
    });

    const getRoleBadge = (userRole) => {
        const roleStr = typeof userRole === "object" ? userRole.role : userRole;
        switch (roleStr) {
            case "OWNER":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">Owner</span>;
            case "MANAGER":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">Manager</span>;
            case "EMPLOYEE":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">Employee</span>;
            default:
                return null;
        }
    };

    const getAvatar = (user) => {
        if (user.profile_picture) {
            return (
                <img
                    src={user.profile_picture}
                    alt={user.username}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                />
            );
        }

        // Fallback initials
        const initial = (user.first_name?.[0] || user.username?.[0] || "?").toUpperCase();
        let bgClass = "bg-slate-100 text-slate-600";
        const roleStr = typeof user.role === "object" ? user.role.role : user.role;
        if (roleStr === "OWNER") bgClass = "bg-purple-100 text-purple-600";
        else if (roleStr === "MANAGER") bgClass = "bg-amber-100 text-amber-600";

        return (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${bgClass} ring-2 ring-white shadow-sm`}>
                {initial}
            </div>
        );
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white p-6 md:p-8 text-left align-middle shadow-2xl transition-all border border-slate-100">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                    <div>
                                        <Dialog.Title
                                            as="h3"
                                            className="text-2xl font-bold text-slate-900 flex items-center gap-3"
                                        >
                                            <div className="p-2.5 bg-brand-50 text-brand-600 rounded-xl">
                                                <FaComments size={24} />
                                            </div>
                                            Start a Chat
                                        </Dialog.Title>
                                        <p className="text-sm text-slate-500 mt-1 ml-1">Select a team member to start a conversation.</p>
                                    </div>
                                    <div className="flex items-center gap-2 self-end md:self-auto">
                                        <button
                                            onClick={openInbox}
                                            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
                                        >
                                            Inboxes
                                        </button>
                                        {["OWNER", "MANAGER"].includes(role) && (
                                            <button
                                                onClick={openBroadcast}
                                                className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-all shadow-md shadow-slate-200"
                                            >
                                                Broadcast
                                            </button>
                                        )}
                                        <button
                                            onClick={onClose}
                                            className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-100"
                                        >
                                            <FaTimes size={20} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* Preferred User Section (if exists) */}
                                    {chatPreferredUserId && (
                                        <div className="bg-brand-50/50 rounded-2xl p-4 border border-brand-100">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
                                                        <FaUserTie />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-wider text-brand-600 mb-0.5">Quick Resume</p>
                                                        <p className="text-sm font-bold text-slate-900">
                                                            {preferredName || "Saved recipient"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleChat(chatPreferredUserId)}
                                                        className="px-4 py-1.5 text-xs font-bold bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm shadow-brand-200"
                                                    >
                                                        Continue
                                                    </button>
                                                    <button
                                                        onClick={clearPreferred}
                                                        className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-white/50 rounded-lg transition-colors"
                                                    >
                                                        Clear
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Search Bar */}
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <FaSearch className="text-slate-400" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search by name, role, or username..."
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    <div className="min-h-[300px] max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                                        {loading ? (
                                            <div className="flex flex-col items-center justify-center h-48 space-y-3">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                                                <p className="text-sm text-slate-500">Loading directory...</p>
                                            </div>
                                        ) : subscriptionError ? (
                                            <div className="p-4">
                                                <SubscriptionNotice
                                                    title={subscriptionError}
                                                    message="Chat is available only with an active plan. Please choose a plan to continue."
                                                    ctaLabel="Choose Plan"
                                                    ctaTo="/subscriptions"
                                                />
                                            </div>
                                        ) : filteredUsers.length === 0 ? (
                                            <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                                                <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
                                                    <FaUser />
                                                </div>
                                                <p className="text-slate-900 font-medium">No users found</p>
                                                <p className="text-sm text-slate-500 mt-1">Try adjusting your search terms.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {filteredUsers.map((user) => (
                                                    <div
                                                        key={user.id}
                                                        onClick={() => handleChat(user.id)}
                                                        className="group flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-brand-200 bg-white hover:bg-brand-50/30 transition-all cursor-pointer shadow-sm hover:shadow-md"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            {getAvatar(user)}
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-brand-700 transition-colors">
                                                                        {user.first_name} {user.last_name}
                                                                    </h4>
                                                                    {getRoleBadge(user.role)}
                                                                </div>
                                                                <p className="text-xs text-slate-500 font-medium mt-0.5">@{user.username}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            className="text-slate-400 group-hover:text-brand-600 bg-slate-50 group-hover:bg-white p-2 rounded-xl transition-all"
                                                        >
                                                            <FaComments />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
