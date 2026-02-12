import Logo from "@/assets/VISIONARY.png";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

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
                        <span className="text-2xl font-display font-semibold text-slate-900 tracking-tight group-hover:text-brand-700 transition-colors">
                            BizVisionary
                        </span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-6">
                        <Link
                            to="/"
                            className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:text-brand-700 hover:bg-white/70 transition-colors"
                        >
                            Home
                        </Link>
                        <Link
                            to="/owner/register"
                            className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:text-brand-700 hover:bg-white/70 transition-colors"
                        >
                            Business Register
                        </Link>

                        <Link
                            to="/login"
                            className="flex items-center rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-glow hover:bg-brand-700 transition-all hover:-translate-y-0.5"
                        >
                            Login
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden text-slate-700 hover:text-brand-700 transition-colors px-3 py-2 rounded-xl hover:bg-white/70 text-sm font-semibold"
                    >
                        {isOpen ? "Close" : "Menu"}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden absolute top-20 left-0 w-full bg-white/95 border-b border-slate-200/70 shadow-xl animate-fade-in-down backdrop-blur-xl">
                    <div className="px-6 py-6 space-y-4">
                        <Link
                            to="/"
                            className="flex items-center text-lg font-semibold text-slate-700 hover:text-brand-700 p-2 rounded-xl hover:bg-brand-50/70 transition-colors"
                        >
                            Home
                        </Link>
                        <Link
                            to="/owner/register"
                            className="flex items-center text-lg font-semibold text-slate-700 hover:text-brand-700 p-2 rounded-xl hover:bg-brand-50/70 transition-colors"
                        >
                            Business Register
                        </Link>

                        <Link
                            to="/login"
                            className="flex items-center justify-center bg-brand-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-brand-700 transition w-full"
                        >
                            Login
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}

export default Header;
