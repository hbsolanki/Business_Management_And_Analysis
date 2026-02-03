import Logo from "@/assets/VISIONARY.png";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import Modal from "@/components/ui/Modal";
import QuickActionsConfigModal from "@/components/shared/QuickActionsConfigModal";
import { authService } from "@/services/authService";
import { tokenService } from "@/services/tokenService";
import api from "@/services/api";
import { useDispatch, useSelector } from "react-redux";
import { toggleHeaderAction } from "@/redux/slices/quickActionsSlice";

import { toggleTheme } from "@/redux/slices/themeSlice";
import { fetchUserProfile, clearUserProfile } from "@/redux/slices/userSlice";
import { MANAGER_ACTIONS } from "@/config/quickActionsData";
import {
    FaUserCircle,
    FaSignOutAlt,
    FaBars,
    FaTimes,
    FaHome,
    FaBriefcase,
    FaChevronDown,
    FaUser,
    FaInfoCircle,
    FaCog,
    FaSun,
    FaMoon,
    FaComments
} from "react-icons/fa";

function ManagerHeader() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    // User state moved to Redux
    const [activeDropdown, setActiveDropdown] = useState(null);
    const navigate = useNavigate();
    const dropdownRef = useRef(null);

    const dispatch = useDispatch();
    const activeActionIds = useSelector((state) => state.quickActions.headerActions);
    const theme = useSelector((state) => state.theme.mode);
    const { profile: user } = useSelector((state) => state.user);

    useEffect(() => {
        if (!user) {
            dispatch(fetchUserProfile());
        }
    }, [dispatch, user]);

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

    const handleLogout = () => {
        authService.logout();
        dispatch(clearUserProfile());
        navigate("/");
    };

    const getProfileImage = () => {
        if (user?.profile_picture) {
            return <img src={user.profile_picture} alt="Profile" className="h-9 w-9 rounded-full object-cover border-2 border-purple-100" />;
        }
        return <div className="h-9 w-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"><FaUserCircle size={20} /></div>;
    };

    const toggleDropdown = (name) => {
        setActiveDropdown(activeDropdown === name ? null : name);
    };

    const toggleAction = (id) => {
        dispatch(toggleHeaderAction(id));
    };

    return (
        <>
            <nav className="bg-white/90 backdrop-blur-xl shadow-sm sticky top-0 z-50 border-b border-gray-100 transition-all font-sans" ref={dropdownRef}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        {/* Logo */}
                        <div className="flex-shrink-0 flex items-center gap-3 cursor-pointer group" onClick={() => navigate("/manager")}>
                            <div className="relative">
                                <div className="absolute inset-0 bg-purple-500 blur-lg opacity-20 rounded-full group-hover:opacity-30 transition-opacity"></div>
                                <img src={Logo} alt="Logo" className="h-9 w-auto relative z-10" />
                            </div>
                            <span className="hidden md:block font-bold text-xl text-gray-900 tracking-tight ml-1">BizVisionary</span>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center gap-6">
                            <div className="flex items-center gap-1 bg-gray-50/80 p-1.5 rounded-xl border border-gray-100 relative">
                                <NavLink to="/" icon={<FaHome />} text="Home" />
                                <NavLink to="/info" icon={<FaInfoCircle />} text="Info" />
                                <NavLink to="/chat" icon={<FaComments />} text="Chat" />

                                {/* Theme Toggle */}
                                <button
                                    onClick={() => dispatch(toggleTheme())}
                                    className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-yellow-500 transition-colors"
                                    title="Toggle Theme"
                                >
                                    {theme === 'dark' ? <FaSun size={20} /> : <FaMoon size={20} />}
                                </button>

                                {/* Quick Actions Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => toggleDropdown("quickActions")}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeDropdown === "quickActions" ? "bg-white text-purple-700 shadow-sm" : "text-gray-600 hover:text-purple-700 hover:bg-white hover:shadow-sm"}`}
                                    >
                                        <span>Quick Actions</span>
                                        <FaChevronDown size={10} className={`transition-transform duration-200 ${activeDropdown === "quickActions" ? "rotate-180" : ""}`} />
                                    </button>

                                    {activeDropdown === "quickActions" && (
                                        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in-down">
                                            {activeActionIds.length > 0 ? (
                                                activeActionIds.map(id => {
                                                    const action = MANAGER_ACTIONS[id];
                                                    if (!action) return null;
                                                    return (
                                                        <DropdownItem
                                                            key={id}
                                                            to={action.path}
                                                            icon={action.icon}
                                                            text={action.label}
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
                                                className="w-full text-left px-4 py-2 text-sm font-semibold text-purple-600 hover:bg-purple-50 flex items-center gap-3 transition-colors"
                                            >
                                                <FaCog /> Configure Actions
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
                                {/* Profile Dropdown Trigger */}
                                <div className="relative">
                                    <button
                                        onClick={() => toggleDropdown("profile")}
                                        className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer"
                                    >
                                        <div className="flex flex-col items-end leading-none px-2">
                                            <span className="text-sm font-bold text-gray-700">{user?.first_name || "Manager"}</span>
                                            <span className="text-[10px] uppercase font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-md mt-0.5">Manager</span>
                                        </div>
                                        {getProfileImage()}
                                    </button>

                                    {activeDropdown === "profile" && (
                                        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in-down">
                                            <div className="px-4 py-3 border-b border-gray-50 mb-1">
                                                <p className="text-sm font-bold text-gray-900 truncate">{user?.first_name} {user?.last_name}</p>
                                                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                            </div>
                                            <DropdownItem to="/profile" icon={<FaUser />} text="My Profile" onClick={() => setActiveDropdown(null)} />
                                            <DropdownItem to="/manager/edit" icon={<FaBriefcase />} text="Edit Profile" onClick={() => setActiveDropdown(null)} />
                                            <div className="border-t border-gray-50 my-1"></div>
                                            <button
                                                onClick={() => {
                                                    setActiveDropdown(null);
                                                    setIsModalOpen(true);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                                            >
                                                <FaSignOutAlt /> Sign Out
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden flex items-center gap-4">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="text-gray-700 hover:text-purple-600 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                {isMobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-xl animate-fade-in-down max-h-[80vh] overflow-y-auto">
                        <div className="p-4 space-y-2">
                            <MobileNavLink to="/" text="Home" icon={<FaHome />} onClick={() => setIsMobileMenuOpen(false)} />
                            <MobileNavLink to="/chat" text="Chat" icon={<FaComments />} onClick={() => setIsMobileMenuOpen(false)} />
                            <div className="py-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Quick Actions</div>

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
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-purple-600 bg-purple-50 font-medium transition-all"
                            >
                                <span className="text-lg opacity-70"><FaCog /></span>
                                Configure Actions
                            </button>

                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                            <div className="flex items-center gap-4 mb-4">
                                {getProfileImage()}
                                <div>
                                    <div className="font-bold text-gray-900">{user?.first_name} {user?.last_name}</div>
                                    <div className="text-xs text-purple-600 font-bold uppercase">Manager</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <Link
                                    to="/profile"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
                                >
                                    <FaUser /> Profile
                                </Link>
                                <Link
                                    to="/manager/edit"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
                                >
                                    <FaBriefcase /> Edit
                                </Link>
                            </div>
                            <button
                                onClick={() => {
                                    setIsModalOpen(true);
                                    setIsMobileMenuOpen(false);
                                }}
                                className="w-full flex items-center justify-center gap-2 bg-white border border-red-100 text-red-600 px-4 py-3 rounded-xl font-bold hover:bg-red-50 transition-all shadow-sm"
                            >
                                <FaSignOutAlt /> Sign out
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {/* Logout Modal */}
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

function NavLink({ to, icon, text }) {
    return (
        <Link to={to} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-purple-700 hover:bg-white hover:shadow-sm transition-all">
            <span className="text-gray-400 group-hover:text-purple-500 transition-colors">{icon}</span>
            {text}
        </Link>
    );
}

function DropdownItem({ to, icon, text, onClick }) {
    return (
        <Link
            to={to}
            onClick={onClick}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-purple-600 transition-colors"
        >
            <span className="text-gray-400 text-lg">{icon}</span>
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
            <span className="text-lg opacity-70">{icon}</span>
            {text}
        </Link>
    );
}

export default ManagerHeader;
