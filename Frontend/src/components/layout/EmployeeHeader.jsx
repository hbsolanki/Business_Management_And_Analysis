import Logo from "@/assets/VISIONARY.png";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import Modal from "@/components/ui/Modal";
import { authService } from "@/services/authService";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserProfile, clearUserProfile } from "@/redux/slices/userSlice";

import NotificationBell from "@/components/shared/NotificationBell";
import {
    FaHome,
    FaInfoCircle,
    FaBriefcase,
    FaUserCircle,
    FaUserEdit,
    FaSignOutAlt,
} from "react-icons/fa";

function EmployeeHeader() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    // User state moved to Redux
    const [activeDropdown, setActiveDropdown] = useState(null);
    const navigate = useNavigate();
    const dropdownRef = useRef(null);

    const dispatch = useDispatch();
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
            return <img src={user.profile_picture} alt="Profile" className="h-9 w-9 rounded-full object-cover border-2 border-green-100" />;
        }
        const initials = `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`.trim() || "U";
        return (
            <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-semibold">
                {initials.toUpperCase()}
            </div>
        );
    };

    const toggleDropdown = (name) => {
        setActiveDropdown(activeDropdown === name ? null : name);
    };

    return (
        <>
            <nav className="bg-white/80 backdrop-blur-xl shadow-soft sticky top-0 z-50 border-b border-slate-100/70 transition-all font-sans" ref={dropdownRef}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        {/* Logo */}
                        <div className="flex-shrink-0 flex items-center gap-3 cursor-pointer group" onClick={() => navigate("/employee")}>
                            <div className="relative">
                                <div className="absolute inset-0 bg-brand-500 blur-lg opacity-20 rounded-full group-hover:opacity-30 transition-opacity"></div>
                                <img src={Logo} alt="Logo" className="h-9 w-auto relative z-10" />
                            </div>
                            <span className="hidden md:block font-display font-semibold text-xl text-slate-900 tracking-tight ml-1">BizVisionary</span>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center gap-6">
                            <div className="flex items-center gap-1 bg-white/70 p-1.5 rounded-xl border border-gray-100 relative">
                                <NavLink to="/" text="Home" icon={<FaHome />} />
                                <NavLink to="/info" text="Info" icon={<FaInfoCircle />} />
                                {user?.work && (
                                    <NavLink to={`/${user.work.toLowerCase()}`} text="My Workspace" icon={<FaBriefcase />} />
                                )}

                                <NotificationBell />

                            </div>

                            <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
                                {/* Profile Dropdown Trigger */}
                                <div className="relative">
                                    <button
                                        onClick={() => toggleDropdown("profile")}
                                        className="glass-panel flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:shadow-md transition-all cursor-pointer"
                                    >
                                        <div className="flex flex-col items-end leading-none px-2">
                                            <span className="text-sm font-bold text-gray-700">{user?.first_name || "Employee"}</span>
                                            <span className="text-[10px] uppercase font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md mt-0.5">Employee</span>
                                        </div>
                                        {getProfileImage()}
                                    </button>

                                    {activeDropdown === "profile" && (
                                        <div className="glass-panel bg-white/90 absolute top-full right-0 mt-2 w-48 rounded-xl shadow-xl py-2 z-50 animate-fade-in-down">
                                            <div className="px-4 py-3 border-b border-gray-50 mb-1">
                                                <p className="text-sm font-bold text-gray-900 truncate">{user?.first_name} {user?.last_name}</p>
                                                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                            </div>
                                            <DropdownItem to="/profile" text="My Profile" icon={<FaUserCircle />} onClick={() => setActiveDropdown(null)} />
                                            <DropdownItem to="/employee/edit" text="Edit Profile" icon={<FaUserEdit />} onClick={() => setActiveDropdown(null)} />
                                            <div className="border-t border-gray-50 my-1"></div>
                                            <button
                                                onClick={() => {
                                                    setActiveDropdown(null);
                                                    setIsModalOpen(true);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <FaSignOutAlt /> Sign Out
                                                </span>
                                            </button>
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
                                className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-xl hover:bg-white/70 transition-colors text-sm font-semibold"
                            >
                                {isMobileMenuOpen ? "Close" : "Menu"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-xl animate-fade-in-down max-h-[80vh] overflow-y-auto">
                        <div className="p-4 space-y-2">
                            <MobileNavLink to="/" text="Home" icon={<FaHome />} onClick={() => setIsMobileMenuOpen(false)} />
                            {user?.work && (
                                <MobileNavLink to={`/${user.work.toLowerCase()}`} text="My Workspace" icon={<FaBriefcase />} onClick={() => setIsMobileMenuOpen(false)} />
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-white/60">
                            <div className="flex items-center gap-4 mb-4">
                                {getProfileImage()}
                                <div>
                                    <div className="font-bold text-gray-900">{user?.first_name} {user?.last_name}</div>
                                    <div className="text-xs text-green-600 font-bold uppercase">Employee</div>
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
                                    to="/employee/edit"
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
                                className="glass-panel w-full flex items-center justify-center border-red-100 text-red-600 px-4 py-3 rounded-xl font-bold hover:bg-red-50 transition-all"
                            >
                                <span className="flex items-center gap-2">
                                    <FaSignOutAlt /> Sign out
                                </span>
                            </button>
                        </div>
                    </div>
                )}
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
        </>
    );
}

function NavLink({ to, text, icon }) {
    return (
        <Link to={to} className="glass-panel flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-green-700 transition-all">
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
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-gray-900 hover:bg-white/70 hover:text-green-600 transition-colors"
        >
            {icon && <span className="text-gray-400">{icon}</span>}
            {text}
        </Link>
    );
}

function MobileNavLink({ to, text, icon, onClick }) {
    return (
        <Link
            to={to}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:text-green-700 hover:bg-green-50 font-medium transition-all"
            onClick={onClick}
        >
            {icon && <span className="text-gray-400">{icon}</span>}
            {text}
        </Link>
    );
}

export default EmployeeHeader;
