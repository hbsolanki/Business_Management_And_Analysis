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
            setTimeout(() => navigate(-1), 3000);
        } catch (err) {
            console.error(err);
            toast.error(getErrorMessage(err, "Failed to process request"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-transparent">
            <Header />

            <div className="flex-grow flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md form-card overflow-hidden">
                    <div className="form-header">
                        <div className="form-header-icon">
                            <FaEnvelope />
                        </div>
                        <div>
                            <h2 className="form-title">Forgot Username</h2>
                            <p className="form-subtitle">Enter your email to retrieve your username.</p>
                        </div>
                    </div>

                    <div className="form-section">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label>Email Address</label>
                                <div className="relative">
                                    <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your registered email"
                                        className="w-full input-icon-left pr-4 py-3"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`btn-primary w-full ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
                            >
                                {loading ? "Sending..." : <><FaPaperPlane /> Send Username</>}
                            </button>
                        </form>

                        <div className="text-center pt-6 mt-2 border-t border-gray-100">
                            <Link
                                to="/login"
                                className="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
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
