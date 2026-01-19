import Logo from "@/assets/VISIONARY.png";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    FaUserPlus,
    FaSignInAlt,
    FaBars,
    FaTimes,
    FaHome,
} from "react-icons/fa";

function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 10) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setIsOpen(false);
    }, [location]);

    return (
        <nav
            className={`sticky top-0 z-50 transition-all duration-300 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-24">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <img
                            src={Logo}
                            alt="BizVisionary Logo"
                            className="h-10 w-auto transition-transform duration-300 group-hover:scale-105"
                        />
                        <span className="text-2xl font-bold text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors">
                            BizVisionary
                        </span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link
                            to="/"
                            className="text-gray-600 hover:text-blue-600 font-medium transition-colors flex items-center gap-2"
                        >
                            <FaHome />
                            Home
                        </Link>
                        <Link
                            to="/owner/register"
                            className="text-gray-600 hover:text-blue-600 font-medium transition-colors flex items-center gap-2"
                        >
                            <FaUserPlus />
                            Business Register
                        </Link>

                        <Link
                            to="/login"
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5"
                        >
                            <FaSignInAlt />
                            Login
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden text-gray-700 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
                    >
                        {isOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-gray-200 shadow-xl animate-fade-in-down">
                    <div className="px-6 py-6 space-y-4">
                        <Link
                            to="/"
                            className="flex items-center gap-3 text-lg font-medium text-gray-700 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                            <FaHome className="text-blue-500" />
                            Home
                        </Link>
                        <Link
                            to="/owner/register"
                            className="flex items-center gap-3 text-lg font-medium text-gray-700 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                            <FaUserPlus className="text-blue-500" />
                            Business Register
                        </Link>

                        <Link
                            to="/login"
                            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-700 transition w-full"
                        >
                            <FaSignInAlt />
                            Login
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}

export default Header;
