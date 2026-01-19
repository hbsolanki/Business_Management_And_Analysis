import {
    PencilSquareIcon,
    TrashIcon,
    ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { FaUserTie, FaIdCard, FaEnvelope, FaPhone, FaCircle } from "react-icons/fa";
import { API_BASE_URL } from "@/services/api";

export default function UserList({
    users = [],
    type = "EMPLOYEE", // EMPLOYEE or MANAGER
    onView, // function(id) passed to handle navigation
    onEdit, // function(id) optional
    onDelete, // function(id)
    emptyText = "No users found"
}) {
    const isManager = type === "MANAGER";
    const ThemeIcon = isManager ? FaUserTie : FaIdCard;
    const themeColor = isManager ? "blue" : "green"; // simplified color theme logic
    // Using explicit classes instead of dynamic interpolation for consistency and Tailwind scanning
    const avatarBg = isManager ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600";
    const badgeBg = isManager ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700";

    const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith("http")) return path;
        return `${API_BASE_URL}${path}`;
    };

    if (!users.length) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <div className={`mx-auto w-16 h-16 ${avatarBg} rounded-full flex items-center justify-center mb-4`}>
                    <ThemeIcon className="text-2xl" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No {isManager ? "Managers" : "Employees"} Found</h3>
                <p className="text-gray-500 mt-1">{emptyText}</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Name & Role
                            </th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Contact Information
                            </th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th scope="col" className="relative px-6 py-4">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                        {users.map((user) => (
                            <tr
                                key={user.id}
                                onClick={() => onView && onView(user.id)}
                                className="group hover:bg-gray-50/80 transition-colors cursor-pointer"
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
                                                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${avatarBg} ring-2 ring-white shadow-sm`}>
                                                    <span className="font-bold text-lg">{user.first_name?.[0]}{user.last_name?.[0]}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                {user.first_name} {user.last_name}
                                            </div>
                                            <div className="text-xs text-gray-500">@{user.username}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-700 flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <FaEnvelope className="text-gray-400 text-xs" />
                                            {user.email || "No email"}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <FaPhone className="text-gray-400 text-xs" />
                                            {user.mobile_number || "No mobile"}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badgeBg}`}>
                                        <FaCircle className="w-1.5 h-1.5 mr-1.5" />
                                        Active
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEdit(user.id); // Typically handled by generic link elsewhere, but keeping prop
                                            }}
                                            className="text-gray-400 hover:text-blue-600 transition-colors bg-white p-2 rounded-lg hover:bg-blue-50"
                                        >
                                            <PencilSquareIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(user.id);
                                            }}
                                            className="text-gray-400 hover:text-red-600 transition-colors bg-white p-2 rounded-lg hover:bg-red-50"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                        <ChevronRightIcon className="w-5 h-5 text-gray-300 ml-2" />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
