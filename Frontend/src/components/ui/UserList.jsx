import { useState, useMemo } from "react";
import {
    PencilSquareIcon,
    TrashIcon,
    ChevronRightIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { FaUserTie, FaIdCard, FaEnvelope, FaPhone, FaCircle, FaComments } from "react-icons/fa";
import { API_BASE_URL } from "@/services/api";

export default function UserList({
    users = [],
    type = "EMPLOYEE",
    onView,
    onEdit,
    onDelete,
    onChat,
    emptyText = "No users found",
}) {
    const [searchTerm, setSearchTerm] = useState("");

    const isManager = type === "MANAGER";
    const ThemeIcon = isManager ? FaUserTie : FaIdCard;

    const avatarBg = isManager ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700";
    const badgeBg = isManager ? "bg-slate-100 text-slate-700" : "bg-emerald-50 text-emerald-700";

    const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith("http")) return path;
        return `${API_BASE_URL}${path}`;
    };

    const filteredUsers = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return users.filter((user) => {
            const fullName = `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase();
            return (
                fullName.includes(term) ||
                user.email?.toLowerCase().includes(term) ||
                user.username?.toLowerCase().includes(term) ||
                user.mobile_number?.includes(term)
            );
        });
    }, [users, searchTerm]);

    const rowClickable = typeof onView === "function";
    const showChat = typeof onChat === "function";
    const showEdit = typeof onEdit === "function";
    const showDelete = typeof onDelete === "function";

    if (!users.length) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <div className={`mx-auto w-16 h-16 ${avatarBg} rounded-full flex items-center justify-center mb-4`}>
                    <ThemeIcon className="text-2xl" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                    No {isManager ? "Managers" : "Employees"} Found
                </h3>
                <p className="text-slate-500 mt-1">{emptyText}</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {isManager ? "Managers" : "Employees"}
                    </p>
                    <p className="text-sm text-slate-600">
                        {filteredUsers.length} of {users.length} records
                    </p>
                </div>

                <div className="relative w-full md:max-w-md">
                    <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder={`Search ${isManager ? "managers" : "employees"}...`}
                        className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {filteredUsers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center py-12">
                    <MagnifyingGlassIcon className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-slate-500">No results found for "{searchTerm}"</p>
                </div>
            ) : (
                <>
                    <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Name & Role
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Contact Information
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {filteredUsers.map((user) => {
                                        const isActive = user.is_active !== false;
                                        return (
                                            <tr
                                                key={user.id}
                                                onClick={() => rowClickable && onView(user.id)}
                                                className={`transition-colors ${
                                                    rowClickable ? "hover:bg-slate-50 cursor-pointer" : ""
                                                }`}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-12 w-12 relative">
                                                            {user.profile_picture ? (
                                                                <img
                                                                    className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-sm"
                                                                    src={getImageUrl(user.profile_picture)}
                                                                    alt=""
                                                                />
                                                            ) : (
                                                                <div
                                                                    className={`h-12 w-12 rounded-full flex items-center justify-center ${avatarBg} ring-2 ring-white shadow-sm`}
                                                                >
                                                                    <span className="font-semibold text-lg">
                                                                        {user.first_name?.[0]}{user.last_name?.[0]}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-semibold text-slate-900">
                                                                {user.first_name} {user.last_name}
                                                            </div>
                                                            <div className="text-xs text-slate-500">@{user.username}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-slate-600 flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <FaEnvelope className="text-slate-400 text-xs" />
                                                            {user.email || "No email"}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <FaPhone className="text-slate-400 text-xs" />
                                                            {user.mobile_number || "No mobile"}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                                            isActive ? badgeBg : "bg-slate-100 text-slate-500"
                                                        }`}
                                                    >
                                                        <FaCircle className="w-1.5 h-1.5 mr-1.5" />
                                                        {isActive ? "Active" : "Inactive"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {showChat && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onChat(user.id);
                                                                }}
                                                                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                                                                title="Chat"
                                                            >
                                                                <FaComments className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                        {showEdit && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onEdit(user.id);
                                                                }}
                                                                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                                                                title="Edit"
                                                            >
                                                                <PencilSquareIcon className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                        {showDelete && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onDelete(user.id);
                                                                }}
                                                                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                                title="Delete"
                                                            >
                                                                <TrashIcon className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="md:hidden grid grid-cols-1 gap-4">
                        {filteredUsers.map((user) => {
                            const isActive = user.is_active !== false;
                            return (
                                <div
                                    key={user.id}
                                    onClick={() => rowClickable && onView(user.id)}
                                    className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-transform ${
                                        rowClickable ? "active:scale-[0.99]" : ""
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2 mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-shrink-0 h-14 w-14 relative">
                                                {user.profile_picture ? (
                                                    <img
                                                        className="h-14 w-14 rounded-2xl object-cover shadow-sm"
                                                        src={getImageUrl(user.profile_picture)}
                                                        alt=""
                                                    />
                                                ) : (
                                                    <div
                                                        className={`h-14 w-14 rounded-2xl flex items-center justify-center ${avatarBg} shadow-sm`}
                                                    >
                                                        <span className="font-semibold text-xl">
                                                            {user.first_name?.[0]}{user.last_name?.[0]}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-900">
                                                    {user.first_name} {user.last_name}
                                                </h3>
                                                <p className="text-sm text-slate-500">@{user.username}</p>
                                            </div>
                                        </div>
                                        <span
                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                                isActive ? badgeBg : "bg-slate-100 text-slate-500"
                                            }`}
                                        >
                                            <FaCircle className="w-1.5 h-1.5 mr-1.5" />
                                            {isActive ? "Active" : "Inactive"}
                                        </span>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-3 text-sm text-slate-600 p-2 bg-slate-50 rounded-lg">
                                            <FaEnvelope className="text-slate-400" />
                                            <span className="truncate">{user.email || "No email"}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-600 p-2 bg-slate-50 rounded-lg">
                                            <FaPhone className="text-slate-400" />
                                            <span>{user.mobile_number || "No mobile"}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-4 text-xs font-medium text-slate-500 border-t border-slate-200 pt-4">
                                        <div className="flex items-center gap-2">
                                            {showChat && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onChat(user.id);
                                                    }}
                                                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                                                >
                                                    <FaComments className="w-4 h-4" />
                                                </button>
                                            )}
                                            {showEdit && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEdit(user.id);
                                                    }}
                                                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                                                >
                                                    <PencilSquareIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                            {showDelete && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete(user.id);
                                                    }}
                                                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        {rowClickable && (
                                            <span className="flex items-center gap-1 text-slate-600">
                                                View Profile <ChevronRightIcon className="w-3 h-3" />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
