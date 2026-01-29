import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import { authService } from "@/services/authService";
import toast from "react-hot-toast";
import { FaEnvelope, FaPaperPlane, FaArrowLeft } from "react-icons/fa";

// Helper to extract error message
const getErrorMessage = (err, defaultMessage) => {
    const data = err.response?.data;
    if (!data) return defaultMessage;
    if (data.detail) return data.detail;
    if (Array.isArray(data.error)) return data.error[0];
    return data.error || defaultMessage;
};

export default function ForgotUsername() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        try {
            const response = await authService.forgetUsername(email);
            toast.success(response.message || "Username sent to your email!");
            // Optional: Navigate back to login after a delay or let user choose
            setTimeout(() => navigate("/login"), 3000);
        } catch (err) {
            console.error(err);
            toast.error(getErrorMessage(err, "Failed to process request"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col">
            <Header />

            {/* Background Decor */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 right-0 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl"></div>
            </div>

            <div className="container mx-auto px-4 flex justify-center items-center flex-grow pt-20 pb-10 relative z-10">
                <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-white/10 opacity-30 skew-x-12 transform -translate-x-1/2"></div>
                        <h2 className="text-2xl font-bold text-white mb-1 relative z-10">
                            Forgot Username
                        </h2>
                        <p className="text-blue-100 text-sm relative z-10">
                            Enter your email to retrieve your username.
                        </p>
                    </div>

                    <div className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                                <div className="relative group">
                                    <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition" />
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your registered email"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all disabled:opacity-50"
                            >
                                {loading ? "Sending..." : <><FaPaperPlane /> Send Username</>}
                            </button>
                        </form>

                        <div className="text-center pt-6 mt-2 border-t border-gray-100">
                            <Link
                                to="/login"
                                className="inline-flex items-center text-sm font-semibold text-gray-600 hover:text-blue-600 transition"
                            >
                                <FaArrowLeft className="mr-2" /> Back to Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
