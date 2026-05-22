import Logo from "@/assets/VISIONARY.png";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaUserPlus, FaSignInAlt, FaBars, FaTimes } from "react-icons/fa";

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

    const navLinks = [
        { name: "Home", path: "/" },
        { name: "Owner Register", path: "/owner/register", icon: FaUserPlus },
    ];

    return (
        <nav
            className={`sticky top-0 z-50 transition-all duration-300 backdrop-blur-xl ${scrolled ? "bg-white/90 shadow-soft border-b border-slate-200/70" : "bg-white/60 border-b border-white/40"}`}
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
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-2">
                        {navLinks.map((link) => {
                            const isActive = location.pathname === link.path;
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`relative px-4 py-2 text-sm font-semibold transition-all duration-300 rounded-lg flex items-center gap-2 ${isActive ? "text-brand-600 bg-brand-50" : "text-slate-600 hover:text-brand-600 hover:bg-slate-50"}`}
                                >
                                    {link.icon && <link.icon size={14} />}
                                    {link.name}
                                    {isActive && (
                                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-brand-600 rounded-full"></span>
                                    )}
                                </Link>
                            );
                        })}

                        <div className="h-6 w-[1px] bg-slate-200 mx-2"></div>

                        <Link
                            to="/login"
                            className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-xl shadow-slate-200 hover:bg-brand-600 hover:shadow-brand-100 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <FaSignInAlt size={14} />
                            Login
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden text-slate-700 hover:text-brand-600 transition-all p-2 rounded-xl bg-slate-100/50 hover:bg-white active:scale-95"
                    >
                        {isOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <div className={`md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-100 shadow-2xl transition-all duration-300 ease-in-out ${isOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-4 pointer-events-none"}`}>
                <div className="px-6 py-8 space-y-3">
                    {navLinks.map((link) => {
                        const isActive = location.pathname === link.path;
                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`flex items-center gap-4 text-base font-bold p-4 rounded-2xl transition-all ${isActive ? "bg-brand-50 text-brand-600 border border-brand-100" : "text-slate-600 hover:bg-slate-50 border border-transparent"}`}
                            >
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isActive ? "bg-white shadow-sm" : "bg-slate-100"}`}>
                                    {link.icon ? <link.icon size={18} /> : <div className="h-2 w-2 rounded-full bg-current" />}
                                </div>
                                {link.name}
                            </Link>
                        );
                    })}

                    <div className="pt-4 mt-4 border-t border-slate-100">
                        <Link
                            to="/login"
                            className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-4 rounded-2xl font-bold hover:bg-brand-600 shadow-lg transition-all active:scale-95"
                        >
                            <FaSignInAlt size={18} />
                            Login to Account
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default Header;
