import { FaCrown, FaLock } from "react-icons/fa";
import { Link } from "react-router-dom";

export default function PremiumOverlay({ message = "This feature requires an upgrade", blur = true }) {
    return (
        <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center p-6 text-center rounded-2xl overflow-hidden ${blur ? "backdrop-blur-sm bg-white/60" : "bg-white/90"}`}>
            <div className="p-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 shadow-inner mb-4 animate-pulse-slow">
                <FaCrown className="text-3xl text-amber-500" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2">
                Premium Analytics
            </h3>

            <p className="text-sm text-slate-600 max-w-xs mb-6 leading-relaxed">
                {message}
            </p>

            <Link
                to="/settings/billing"
                className="group relative inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 text-white font-semibold text-sm shadow-lg hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-shimmer" />
                <FaLock className="text-xs opacity-70" />
                <span>Upgrade Plan</span>
            </Link>
        </div>
    );
}
