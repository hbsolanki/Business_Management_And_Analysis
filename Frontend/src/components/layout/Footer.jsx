import { FaFacebookF, FaLinkedinIn, FaInstagram } from "react-icons/fa";
import { Link } from "react-router-dom";

const currentYear = new Date().getFullYear();

function Footer() {
    return (
        <>
            <section className="relative mt-14 md:mx-12">
                <div className="absolute inset-0 -z-10 rounded-[2.5rem] bg-white/80 border border-white/70 shadow-card"></div>
                <div className="section-shell py-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div>
                            <h3 className="text-2xl font-semibold text-slate-900 mb-3">
                                BizVisionary
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                BizVisionary helps teams optimize operations with data-driven insights,
                                unified workflows, and smart analytics designed for modern businesses.
                            </p>
                            <div className="flex items-center gap-3 mt-6">
                                <a
                                    href="https://www.facebook.com/bizvisionary011"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 flex items-center justify-center bg-brand-600 text-white rounded-full hover:bg-brand-700 transition-colors"
                                >
                                    <FaFacebookF />
                                </a>
                                <a
                                    href="https://www.linkedin.com/in/bizvisionary011/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 flex items-center justify-center bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-colors"
                                >
                                    <FaLinkedinIn />
                                </a>
                                <a
                                    href="https://www.instagram.com/bizvisionary011/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 flex items-center justify-center bg-amber-500 text-white rounded-full hover:bg-amber-600 transition-colors"
                                >
                                    <FaInstagram />
                                </a>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">
                                Contact
                            </h3>
                            <div className="text-sm text-slate-600 space-y-2">
                                <p>Ahmedabad, India</p>
                                <p>Phone: +91 81600 62665</p>
                                <p>Email: contact@alphagentec.in</p>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">
                                Quick Links
                            </h3>
                            <div className="text-sm text-slate-600 space-y-2">
                                <Link to="/info" className="block hover:text-slate-900 transition-colors">
                                    Info Overview
                                </Link>
                                <Link to="/info/modules" className="block hover:text-slate-900 transition-colors">
                                    Module Directory
                                </Link>
                                <Link to="/info/support" className="block hover:text-slate-900 transition-colors">
                                    Support
                                </Link>
                                <Link to="/owner/register" className="block hover:text-slate-900 transition-colors">
                                    Get Started
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 border-t border-slate-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                        <p>© {currentYear} Ethics - BizVisionary. All Rights Reserved.</p>
                        <div className="flex items-center gap-4">
                            <Link to="/info/support" className="hover:text-slate-700 transition-colors">Privacy</Link>
                            <Link to="/info/support" className="hover:text-slate-700 transition-colors">Terms</Link>
                            <Link to="/info/support" className="hover:text-slate-700 transition-colors">Status</Link>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}

export default Footer;
