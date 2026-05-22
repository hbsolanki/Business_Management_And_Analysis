import { useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import {
    HiOutlinePencilSquare,
    HiOutlineTrash,
    HiOutlineChevronRight,
    HiOutlineMagnifyingGlass,
} from "react-icons/hi2";
import { FaUserTie, FaIdCard, FaEnvelope, FaPhone, FaCircle, FaComments, FaPowerOff, FaEllipsisV, FaTimes } from "react-icons/fa";
import { getProfileImageUrl } from "@/utils/imageUtils";

export default function UserList({
    users = [],
    type = "EMPLOYEE",
    onView,
    onEdit,
    onDelete,
    onChat,
    onToggleStatus,
    emptyText = "No users found",
}) {
    const [searchTerm, setSearchTerm] = useState("");

    // Actions menu state
    const [actionsMenu, setActionsMenu] = useState(null);
    const [actionsMenuPosition, setActionsMenuPosition] = useState({ top: 0, left: 0, opacity: 0 });
    const actionsMenuRef = useRef(null);

    // Image Modal State
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        const closeMenuOnOutsideClick = (event) => {
            const target = event?.target;
            if (target instanceof Element && target.closest("[data-actions-trigger]")) return;
            if (target instanceof Element && target.closest("[data-actions-floating]")) return;
            setActionsMenu(null);
        };
        document.addEventListener("mousedown", closeMenuOnOutsideClick);
        return () => document.removeEventListener("mousedown", closeMenuOnOutsideClick);
    }, []);

    useEffect(() => {
        if (!actionsMenu) return;
        const closeMenu = () => setActionsMenu(null);
        window.addEventListener("resize", closeMenu);
        window.addEventListener("scroll", closeMenu, true);
        return () => {
            window.removeEventListener("resize", closeMenu);
            window.removeEventListener("scroll", closeMenu, true);
        };
    }, [actionsMenu]);

    useLayoutEffect(() => {
        if (!actionsMenu || !actionsMenuRef.current) return;

        const menuEl = actionsMenuRef.current;
        const menuRect = menuEl.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 8;
        const anchor = actionsMenu.anchorRect;

        let top = anchor.bottom + padding;
        if (top + menuRect.height > viewportHeight - padding) {
            top = Math.max(padding, anchor.top - menuRect.height - padding);
        }

        let left = anchor.right - menuRect.width;
        if (left < padding) left = padding;
        if (left + menuRect.width > viewportWidth - padding) {
            left = viewportWidth - menuRect.width - padding;
        }

        setActionsMenuPosition({ top, left, opacity: 1 });
    }, [actionsMenu]);

    // Add missing icons to import list or assume they are there; wait, in the file:
    // FaComments, FaCircle, FaPhone, FaEnvelope, FaIdCard, FaUserTie etc are imported at the top, but we don't see the top in this replace. 
    // We will use FaPowerOff from react-icons/fa. Let's just assume it's there or we provide a clear FaPowerOff if it fails.
    // Wait, let's just use a Heroicon like `NoSymbolIcon` or add `FaPowerOff` to the top using another chunk. Let's do another chunk for imports.

    const isManager = type === "MANAGER";
    const ThemeIcon = isManager ? FaUserTie : FaIdCard;

    const avatarBg = "bg-slate-100 text-slate-600";
    const badgeBg = "bg-slate-100 text-slate-700";

    const getBaseUser = (user) => user?.user || user;

    const getImageUrl = (path) => {
        return getProfileImageUrl(path);
    };

    const getWorkAssignments = (user) => {
        let works = [];
        const rawWorks = user.assigned_works || user.work || [];

        if (Array.isArray(rawWorks)) {
            works = rawWorks;
        } else if (typeof rawWorks === 'string') {
            try {
                const parsed = JSON.parse(rawWorks);
                works = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
                works = [rawWorks];
            }
        }

        return works.map(w => {
            if (typeof w === 'object' && w !== null) {
                // Handle { branch_id, branch_name, work_type }
                const type = w.work_type || w.name || "General";
                const branch = w.branch_name;
                return branch ? `${type} (${branch})` : type;
            }
            return String(w || "General");
        });
    };

    const filteredUsers = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return users.filter((user) => {
            const data = getBaseUser(user);
            const fullName = `${data.first_name || ""} ${data.last_name || ""}`.toLowerCase();
            const workList = getWorkAssignments(user).join(" ").toLowerCase();
            return (
                fullName.includes(term) ||
                data.email?.toLowerCase().includes(term) ||
                data.username?.toLowerCase().includes(term) ||
                data.mobile_number?.includes(term) ||
                workList.includes(term)
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
                    <HiOutlineMagnifyingGlass className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder={`Search ${isManager ? "managers" : "employees"}...`}
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-900 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {filteredUsers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center py-12">
                    <HiOutlineMagnifyingGlass className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-slate-500">{`No results found for "${searchTerm}"`}</p>
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
                                        const data = getBaseUser(user);
                                        const isActive = data.is_active !== false && user.is_active !== false;
                                        const userId = data.id || user.id;
                                        return (
                                            <tr
                                                key={userId}
                                                onClick={() => rowClickable && onView(userId)}
                                                className={`transition-colors ${rowClickable ? "hover:bg-slate-50 cursor-pointer" : ""
                                                    }`}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-12 w-12 relative cursor-pointer" onDoubleClick={() => setSelectedImage(getImageUrl(data.profile_picture))}>
                                                            {data.profile_picture ? (
                                                                <img
                                                                    className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-sm"
                                                                    src={getImageUrl(data.profile_picture)}
                                                                    alt=""
                                                                />
                                                            ) : (
                                                                <div
                                                                    className={`h-12 w-12 rounded-full flex items-center justify-center ${avatarBg} ring-2 ring-white shadow-sm`}
                                                                >
                                                                    <span className="font-semibold text-lg">
                                                                        {data.first_name?.[0]}{data.last_name?.[0]}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-semibold text-slate-900">
                                                                {data.first_name} {data.last_name}
                                                            </div>
                                                            <div className="text-xs text-slate-500">@{data.username}</div>
                                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                                {getWorkAssignments(user).slice(0, 3).map((work, idx) => (
                                                                    <span
                                                                        key={idx}
                                                                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[9px] font-bold uppercase tracking-wider border border-slate-200"
                                                                    >
                                                                        {work}
                                                                    </span>
                                                                ))}
                                                                {getWorkAssignments(user).length > 3 && (
                                                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-bold">
                                                                        +{getWorkAssignments(user).length - 3}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-slate-600 flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <FaEnvelope className="text-slate-400 text-xs" />
                                                            {data.email || "No email"}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <FaPhone className="text-slate-400 text-xs" />
                                                            {data.mobile_number || "No mobile"}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {!isActive && (
                                                        <span
                                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200`}
                                                        >
                                                            <FaCircle className="w-1.5 h-1.5 mr-1.5" />
                                                            Inactive
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            data-actions-trigger
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                const anchorRect = event.currentTarget.getBoundingClientRect();
                                                                setActionsMenuPosition((prev) => ({ ...prev, opacity: 0 }));
                                                                setActionsMenu((prev) => (
                                                                    prev && prev.userId === user.id
                                                                        ? null
                                                                        : { userId: user.id, user: user, anchorRect }
                                                                ));
                                                            }}
                                                            className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all flex items-center justify-center p-0"
                                                        >
                                                            <FaEllipsisV size={12} />
                                                        </button>
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
                            const data = getBaseUser(user);
                            const isActive = data.is_active !== false && user.is_active !== false;
                            const userId = data.id || user.id;
                            return (
                                <div
                                    key={userId}
                                    onClick={() => rowClickable && onView(userId)}
                                    className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-transform ${rowClickable ? "active:scale-[0.99]" : ""
                                        }`}
                                >
                                    <div className="flex items-center justify-between gap-2 mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-shrink-0 h-14 w-14 relative cursor-pointer" onDoubleClick={() => setSelectedImage(getImageUrl(data.profile_picture))}>
                                                {data.profile_picture ? (
                                                    <img
                                                        className="h-14 w-14 rounded-2xl object-cover shadow-sm"
                                                        src={getImageUrl(data.profile_picture)}
                                                        alt=""
                                                    />
                                                ) : (
                                                    <div
                                                        className={`h-14 w-14 rounded-2xl flex items-center justify-center ${avatarBg} shadow-sm`}
                                                    >
                                                        <span className="font-semibold text-xl">
                                                            {data.first_name?.[0]}{data.last_name?.[0]}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-900">
                                                    {data.first_name} {data.last_name}
                                                </h3>
                                                <p className="text-sm text-slate-500">@{data.username}</p>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {getWorkAssignments(user).slice(0, 2).map((work, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[8px] font-bold uppercase tracking-wider border border-slate-200"
                                                        >
                                                            {work}
                                                        </span>
                                                    ))}
                                                    {getWorkAssignments(user).length > 2 && (
                                                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[8px] font-bold">
                                                            +{getWorkAssignments(user).length - 2}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!isActive && (
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200`}
                                                >
                                                    <FaCircle className="w-1.5 h-1.5 mr-1.5" />
                                                    Inactive
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                data-actions-trigger
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    const anchorRect = event.currentTarget.getBoundingClientRect();
                                                    setActionsMenuPosition((prev) => ({ ...prev, opacity: 0 }));
                                                    setActionsMenu((prev) => (
                                                        prev && prev.userId === userId
                                                            ? null
                                                            : { userId: userId, user: user, anchorRect }
                                                    ));
                                                }}
                                                className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all flex items-center justify-center -mr-1"
                                            >
                                                <FaEllipsisV size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-3 text-sm text-slate-600 p-2 bg-slate-50 rounded-lg">
                                            <FaEnvelope className="text-slate-400" />
                                            <span className="truncate">{data.email || "No email"}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-600 p-2 bg-slate-50 rounded-lg">
                                            <FaPhone className="text-slate-400" />
                                            <span>{data.mobile_number || "No mobile"}</span>
                                        </div>
                                    </div>

                                    {rowClickable && (
                                        <div className="flex items-center justify-end mt-4 text-xs font-medium text-slate-500 border-t border-slate-200 pt-4">
                                            <span className="flex items-center gap-1 text-slate-600">
                                                View Profile <HiOutlineChevronRight className="w-3 h-3" />
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Actions Menu (Floating) */}
            {actionsMenu && (
                <div
                    ref={actionsMenuRef}
                    data-actions-floating
                    className="fixed z-[100] w-48 rounded-xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 py-1.5 focus:outline-none transition-opacity duration-150"
                    style={{
                        top: actionsMenuPosition.top,
                        left: actionsMenuPosition.left,
                        opacity: actionsMenuPosition.opacity,
                    }}
                >
                    {onView && (
                        <button
                            onClick={() => {
                                onView(actionsMenu.userId);
                                setActionsMenu(null);
                            }}
                            className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-bold transition-colors"
                        >
                            <HiOutlineChevronRight className="h-4 w-4 mr-3 text-slate-400 group-hover:text-slate-900" />
                            View Profile
                        </button>
                    )}
                    {showEdit && (
                        <button
                            onClick={() => {
                                onEdit(actionsMenu.userId);
                                setActionsMenu(null);
                            }}
                            className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-bold transition-colors"
                        >
                            <HiOutlinePencilSquare className="h-4 w-4 mr-3 text-slate-400 group-hover:text-slate-900" />
                            Edit {isManager ? "Manager" : "Employee"}
                        </button>
                    )}
                    {showChat && (
                        <button
                            onClick={() => {
                                onChat(actionsMenu.userId);
                                setActionsMenu(null);
                            }}
                            className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-bold transition-colors"
                        >
                            <FaComments className="h-4 w-4 mr-3 text-slate-400 group-hover:text-slate-900" />
                            Message
                        </button>
                    )}
                    {onToggleStatus && (
                        <button
                            onClick={() => {
                                onToggleStatus(actionsMenu.user);
                                setActionsMenu(null);
                            }}
                            className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-bold transition-colors"
                        >
                            <FaPowerOff className="h-4 w-4 mr-3 text-slate-400 group-hover:text-slate-900" />
                            {actionsMenu.user?.is_active !== false ? "Mark Inactive" : "Mark Active"}
                        </button>
                    )}

                    {showDelete && (
                        <>
                            <div className="h-px bg-slate-100 my-1.5 mx-3" />
                            <button
                                onClick={() => {
                                    onDelete(actionsMenu.userId);
                                    setActionsMenu(null);
                                }}
                                className="w-full flex items-center px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 font-medium transition-colors"
                            >
                                <HiOutlineTrash className="h-4 w-4 mr-3 text-rose-500" />
                                Delete {isManager ? "Manager" : "Employee"}
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Fullscreen Image Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-fade-in"
                    onClick={() => setSelectedImage(null)}
                >
                    <div
                        className="relative max-w-4xl max-h-[90vh] w-full flex justify-center items-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="absolute -top-12 right-0 md:-right-12 md:top-0 p-2 text-white/70 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-full transition-all"
                            onClick={() => setSelectedImage(null)}
                        >
                            <FaTimes className="w-6 h-6" />
                        </button>
                        <img
                            src={selectedImage}
                            alt="Profile"
                            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl ring-1 ring-white/20"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
