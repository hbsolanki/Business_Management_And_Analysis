import Logo from "@/assets/VISIONARY.png";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import Modal from "@/components/ui/Modal";
import { authService } from "@/services/authService";
import { tokenService } from "@/services/tokenService";
import api from "@/services/api";
import {
    FaUserCircle,
    FaSignOutAlt,
    FaBars,
    FaTimes,
    FaHome,
    FaThLarge,
    FaBriefcase,
    FaUser,
    FaChevronDown
} from "react-icons/fa";

function EmployeeHeader() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const navigate = useNavigate();
    const dropdownRef = useRef(null);

    useEffect(() => {
        const fetchUser = async () => {
            const id = tokenService.getId();
            if (id) {
                try {
                    const res = await api.get(`/user/${id}/`);
                    setUser(res.data);
                } catch (err) {
                    console.error("Failed to fetch user for header", err);
                }
            }
        };
        fetchUser();
    }, []);

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
        navigate("/");
    };

    const getProfileImage = () => {
        if (user?.profile_picture) {
            return <img src={user.profile_picture} alt="Profile" className="h-9 w-9 rounded-full object-cover border-2 border-green-100" />;
        }
        return <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center text-green-600"><FaUserCircle size={20} /></div>;
    };

    const toggleDropdown = (name) => {
        setActiveDropdown(activeDropdown === name ? null : name);
    };

    return (
        <>
            <nav className="bg-white/90 backdrop-blur-xl shadow-sm sticky top-0 z-50 border-b border-gray-100 transition-all font-sans" ref={dropdownRef}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        {/* Logo */}
                        <div className="flex-shrink-0 flex items-center gap-3 cursor-pointer group" onClick={() => navigate("/employee")}>
                            <div className="relative">
                                <div className="absolute inset-0 bg-green-500 blur-lg opacity-20 rounded-full group-hover:opacity-30 transition-opacity"></div>
                                <img src={Logo} alt="Logo" className="h-9 w-auto relative z-10" />
                            </div>
                            <span className="hidden md:block font-bold text-xl text-gray-900 tracking-tight ml-1">BizVisionary</span>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center gap-6">
                            <div className="flex items-center gap-1 bg-gray-50/80 p-1.5 rounded-xl border border-gray-100">
                                <NavLink to="/" icon={<FaHome />} text="Home" />
                                <NavLink to="/employee" icon={<FaThLarge />} text="Dashboard" />
                                {user?.work && (
                                    <NavLink to={`/${user.work.toLowerCase()}`} icon={<FaBriefcase />} text="My Workspace" />
                                )}
                            </div>

                            <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
                                {/* Profile Dropdown Trigger */}
                                <div className="relative">
                                    <button
                                        onClick={() => toggleDropdown("profile")}
                                        className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer"
                                    >
                                        <div className="flex flex-col items-end leading-none px-2">
                                            <span className="text-sm font-bold text-gray-700">{user?.first_name || "Employee"}</span>
                                            <span className="text-[10px] uppercase font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md mt-0.5">Employee</span>
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
                                            <DropdownItem to="/employee/edit" icon={<FaBriefcase />} text="Edit Profile" onClick={() => setActiveDropdown(null)} />
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
                                className="text-gray-700 hover:text-green-600 p-2 rounded-xl hover:bg-gray-50 transition-colors"
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
                            <MobileNavLink to="/employee" text="Dashboard" icon={<FaThLarge />} onClick={() => setIsMobileMenuOpen(false)} />
                            {user?.work && (
                                <MobileNavLink to={`/${user.work.toLowerCase()}`} text="My Workspace" icon={<FaBriefcase />} onClick={() => setIsMobileMenuOpen(false)} />
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
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
                                    className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
                                >
                                    <FaUser /> Profile
                                </Link>
                                <Link
                                    to="/employee/edit"
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

function NavLink({ to, icon, text }) {
    return (
        <Link to={to} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-green-700 hover:bg-white hover:shadow-sm transition-all">
            <span className="text-gray-400 group-hover:text-green-500 transition-colors">{icon}</span>
            {text}
        </Link>
    );
}

function DropdownItem({ to, icon, text, onClick }) {
    return (
        <Link
            to={to}
            onClick={onClick}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-green-600 transition-colors"
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
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:text-green-700 hover:bg-green-50 font-medium transition-all"
            onClick={onClick}
        >
            <span className="text-lg opacity-70">{icon}</span>
            {text}
        </Link>
    );
}

export default EmployeeHeader;
