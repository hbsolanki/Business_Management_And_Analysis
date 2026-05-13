import Logo from "@/assets/VISIONARY.png";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { tokenService } from "@/services/tokenService";
import Modal from "@/components/ui/Modal";
import QuickActionsConfigModal from "@/components/shared/QuickActionsConfigModal";
import { authService } from "@/services/authService";
import { useDispatch, useSelector } from "react-redux";
import { toggleHeaderAction } from "@/redux/slices/quickActionsSlice";
import { clearUserProfile } from "@/redux/slices/userSlice";
import { getProfileImageUrl } from "@/utils/imageUtils";

import { MANAGER_ACTIONS } from "@/config/quickActionsData";
import {
    FaChevronDown,
    FaHome,
    FaBolt,
    FaCog,
    FaBrain,
    FaUserCircle,
    FaUserEdit,
    FaSignOutAlt,
    FaHistory,
} from "react-icons/fa";

import NotificationBell from "@/components/shared/NotificationBell";

function ManagerHeader() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const navigate = useNavigate();
    const dropdownRef = useRef(null);

    const dispatch = useDispatch();
    const activeActionIds = useSelector((state) => state.quickActions.headerActions);
    const { profile: user } = useSelector((state) => state.user);
    const businessData = user?.role?.business || user?.business || user?.user?.role?.business || user?.user?.business || null;
    const businessName = typeof businessData === "object"
        ? businessData?.name || businessData?.business_name || "Business Workspace"
        : businessData || "Business Workspace";

    // User profile is loaded from Redux state (persisted in localStorage)

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleDropdown = (name) => {
        setActiveDropdown(activeDropdown === name ? null : name);
    };

    const toggleAction = (id) => {
        dispatch(toggleHeaderAction(id));
    };


    const handleLogout = async () => {
        try {
            await authService.logout();
            dispatch(clearUserProfile());
        } catch (error) {
            console.error("Logout failed:", error);
            dispatch(clearUserProfile());
        }
    };

    const getProfileImage = () => {
        const data = user?.user || user;
        const imageUrl = getProfileImageUrl(data?.profile_picture);
        
        if (imageUrl) {
            return <img src={imageUrl} alt="Profile" className="h-9 w-9 rounded-full object-cover border-2 border-purple-100 shadow-sm" />;
        }
        const initials = `${data?.first_name?.[0] || ""}${data?.last_name?.[0] || ""}`.trim() || "U";
        return (
            <div className="h-9 w-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-semibold shadow-sm border border-purple-200">
                {initials.toUpperCase()}
            </div>
        );
    };

    return (
        <>
            <nav className="bg-white/80 backdrop-blur-xl shadow-soft sticky top-0 z-50 border-b border-slate-100/70 transition-all font-sans" ref={dropdownRef}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        {/* Logo */}
                        <div className="flex min-w-0 flex-shrink-0 items-center gap-3 cursor-pointer group" onClick={() => navigate("/manager")}>
                            <div className="relative">
                                <div className="absolute inset-0 bg-brand-500 blur-lg opacity-20 rounded-full group-hover:opacity-30 transition-opacity"></div>
                                <img src={Logo} alt="Logo" className="h-9 w-auto relative z-10" />
                            </div>
                            <div className="min-w-0">
                                <p className="max-w-[160px] truncate text-sm font-bold tracking-tight text-slate-900 sm:max-w-[220px] md:text-base">
                                    {businessName}
                                </p>
                            </div>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center gap-4">
                            <div className="flex items-center gap-1 bg-white/70 p-1.5 rounded-xl border border-gray-100 relative">
                                <NavLink to="/" text="Home" icon={<FaHome />} />
                                { (user?.role?.business || user?.business) && (
                                    <div className="relative">
                                        <button
                                            onClick={() => toggleDropdown("quickActions")}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border border-transparent ${activeDropdown === "quickActions" ? "glass-panel text-purple-700 border-white/70" : "text-gray-600 hover:text-purple-700 hover:bg-white/70 hover:border-white/70"}`}>
                                            <FaBolt size={12} className="text-purple-500" />
                                            <span>Quick Actions</span>
                                            <FaChevronDown size={10} className={`transition-transform duration-200 ${activeDropdown === "quickActions" ? "rotate-180" : ""}`} />
                                        </button>

                                        {activeDropdown === "quickActions" && (
                                            <div className="glass-panel bg-white absolute top-full left-0 mt-2 w-64 rounded-xl shadow-xl py-2 z-50 animate-fade-in-down">
                                                {activeActionIds.length > 0 ? (
                                                    activeActionIds.map(id => {
                                                        const action = MANAGER_ACTIONS[id];
                                                        if (!action) return null;
                                                        return (
                                                            <DropdownItem
                                                                key={id}
                                                                to={action.path}
                                                                text={action.label}
                                                                icon={action.icon}
                                                                onClick={() => setActiveDropdown(null)}
                                                            />
                                                        );
                                                    })
                                                ) : (
                                                    <div className="px-4 py-3 text-center text-gray-400 text-sm">
                                                        No quick actions set.
                                                    </div>
                                                )}

                                                <div className="border-t border-gray-50 my-1"></div>
                                                <button
                                                    onClick={() => {
                                                        setActiveDropdown(null);
                                                        setIsConfigModalOpen(true);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm font-semibold text-purple-600 hover:bg-purple-50 transition-colors"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <FaCog /> Configure Actions
                                                    </span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {(user?.role?.business || user?.business) && <NotificationBell />}
                            </div>

                            <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
                                <div className="relative">
                                    <button
                                        onClick={() => toggleDropdown("profile")}
                                        className="glass-panel flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:shadow-md transition-all cursor-pointer"
                                    >
                                        <div className="flex flex-col items-end leading-none px-2">
                                            <span className="text-sm font-bold text-gray-700">{(user?.user || user)?.first_name || "Manager"}</span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[9px] uppercase font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-md">Manager</span>
                                                {tokenService.getBranches().length > 0 && (
                                                    <span className="text-[9px] uppercase font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md truncate max-w-[80px]">
                                                        {tokenService.getBranches()[0].name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {getProfileImage()}
                                    </button>

                                    {activeDropdown === "profile" && (
                                        <div className="glass-panel backdrop-blur-xl bg-white absolute top-full right-0 mt-3 w-64 rounded-2xl shadow-2xl py-3 z-50 animate-fade-in-down border border-white/20">
                                            <div className="px-5 py-4 border-b border-slate-100 mb-2">
                                                <p className="text-sm font-bold text-slate-900 truncate">
                                                    {(user?.user || user)?.first_name && (user?.user || user)?.last_name ? `${(user.user || user).first_name} ${(user.user || user).last_name}` : "User Profile"}
                                                </p>
                                                <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
                                                    {(user?.user || user)?.email || ""}
                                                </p>
                                            </div>

                                            <div className="space-y-0.5 px-2">
                                                <DropdownItem to="/profile" text="My Profile" icon={<FaUserCircle />} onClick={() => setActiveDropdown(null)} />
                                                <DropdownItem to="/ai-agent/session" text="AI Agent" icon={<FaBrain />} onClick={() => setActiveDropdown(null)} />
                                                <DropdownItem to="/activity-logs" text="Activity Logs" icon={<FaHistory />} onClick={() => setActiveDropdown(null)} />
                                                <DropdownItem to="/manager/edit" text="Edit Profile" icon={<FaUserEdit />} onClick={() => setActiveDropdown(null)} />
                                            </div>

                                            <div className="border-t border-slate-100 my-2 mx-2"></div>

                                            <div className="px-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveDropdown(null);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50/50 rounded-xl transition-all flex items-center gap-3"
                                                >
                                                    <FaSignOutAlt className="text-red-500" />
                                                    Sign Out
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden flex items-center gap-3">
                            <NotificationBell />
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="text-gray-700 hover:text-purple-600 px-3 py-2 rounded-xl hover:bg-white/70 transition-colors text-sm font-semibold"
                            >
                                {isMobileMenuOpen ? "Close" : "Menu"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {
                    isMobileMenuOpen && (
                        <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-xl animate-fade-in-down max-h-[80vh] overflow-y-auto">
                            <div className="p-4 space-y-2">
                                <MobileNavLink to="/" text="Home" icon={<FaHome />} onClick={() => setIsMobileMenuOpen(false)} />
                                {(user?.role?.business || user?.business) && (
                                    <>
                                        <div className="py-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                            <FaBolt className="text-purple-500" /> Quick Actions
                                        </div>

                                        {/* Render Active Quick Actions in Mobile Menu too */}
                                        {activeActionIds.length > 0 ? (
                                            activeActionIds.map(id => {
                                                const action = MANAGER_ACTIONS[id];
                                                if (!action) return null;
                                                return (
                                                    <MobileNavLink
                                                        key={id}
                                                        to={action.path}
                                                        text={action.label}
                                                        icon={action.icon}
                                                        onClick={() => setIsMobileMenuOpen(false)}
                                                    />
                                                );
                                            })
                                        ) : (
                                            <div className="px-4 py-2 text-sm text-gray-400">No quick actions set</div>
                                        )}

                                        <button
                                            onClick={() => {
                                                setIsMobileMenuOpen(false);
                                                setIsConfigModalOpen(true);
                                            }}
                                            className="w-full px-4 py-3 rounded-xl text-purple-600 bg-purple-50 font-medium transition-all"
                                        >
                                            Configure Actions
                                        </button>
                                    </>
                                )}

                                <div className="mt-3 p-4 border-t border-gray-100 bg-white/60 rounded-xl">
                                    <div className="flex items-center gap-4 mb-4">
                                        {getProfileImage()}
                                        <div>
                                            <div className="font-bold text-gray-900">{(user?.user || user)?.first_name} {(user?.user || user)?.last_name}</div>
                                            <div className="text-xs text-purple-600 font-bold uppercase">Manager</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mb-4">
                                        <Link
                                            to="/profile"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="glass-panel flex items-center justify-center text-gray-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-white/70 transition"
                                        >
                                            <span className="flex items-center gap-2">
                                                <FaUserCircle /> Profile
                                            </span>
                                        </Link>
                                        <Link
                                            to="/ai-agent/session"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="glass-panel flex items-center justify-center text-gray-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-white/70 transition"
                                        >
                                            <span className="flex items-center gap-2">
                                                <FaBrain /> AI Agent
                                            </span>
                                        </Link>
                                        <Link
                                            to="/manager/edit"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="glass-panel flex items-center justify-center text-gray-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-white/70 transition"
                                        >
                                            <span className="flex items-center gap-2">
                                                <FaUserEdit /> Edit
                                            </span>
                                        </Link>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsModalOpen(true);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        type="button"
                                        className="glass-panel w-full flex items-center justify-center border-red-100 text-red-600 px-4 py-3 rounded-xl font-bold hover:bg-red-50 transition-all"
                                    >
                                        <span className="flex items-center gap-2">
                                            <FaSignOutAlt /> Sign out
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </nav>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Sign Out"
                message="Are you sure you want to end your session?"
                onConfirm={handleLogout}
                confirmText="Sign Out"
                cancelText="Cancel"
            />

            {/* Config Quick Actions Modal */}
            <QuickActionsConfigModal
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                availableActions={MANAGER_ACTIONS}
                activeActionIds={activeActionIds}
                onToggleAction={toggleAction}
                themeColor="purple"
            />
        </>
    );
}

function NavLink({ to, text, icon }) {
    return (
        <Link to={to} className="glass-panel flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-purple-700 transition-all">
            <span className="text-gray-400">{icon}</span>
            {text}
        </Link>
    );
}

function DropdownItem({ to, text, icon, onClick }) {
    return (
        <Link
            to={to}
            onClick={onClick}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 rounded-xl transition-all group"
        >
            {icon && <span className="text-slate-400 group-hover:text-purple-500 transition-colors">{icon}</span>}
            {text}
        </Link>
    );
}

function MobileNavLink({ to, text, icon, onClick }) {
    return (
        <Link
            to={to}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:text-purple-700 hover:bg-purple-50 font-medium transition-all"
            onClick={onClick}
        >
            {icon && <span className="text-gray-400">{icon}</span>}
            {text}
        </Link>
    );
}

export default ManagerHeader;
