import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import toast from "react-hot-toast";
import { authService } from "@/services/authService";
import { FaUser, FaLock, FaSignInAlt, FaEye, FaEyeSlash } from "react-icons/fa";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";

function Login() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        setLoading(true);

        try {
            const data = await authService.login(formData);
            const role = data.user.role;
            toast.success("Successfully logged in");
            if (role === "OWNER") {
                navigate("/owner");
            } else if (role === "MANAGER") {
                navigate("/manager");
            } else {
                navigate("/employee");
            }
        } catch (error) {
            console.error(error);
            toast.error("Invalid username or password");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async (codeResponse) => {
        if (loading) return;
        setLoading(true);
        try {
            const data = await authService.googleLogin(codeResponse.code);
            const role = data.user.role;
            toast.success("Successfully logged in with Google");
            if (role === "OWNER") {
                navigate("/owner");
            } else if (role === "MANAGER") {
                navigate("/manager");
            } else {
                navigate("/employee");
            }
        } catch (error) {
            console.error(error);
            toast.error("Google Login Failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <Header />

            <div className="flex-grow">
                <div className="max-w-6xl mx-auto px-4 py-10 lg:py-16">
                    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-stretch">
                        <div className="hidden lg:flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
                            <div className="space-y-6">
                                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                                    Secure workspace
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-900 leading-tight">
                                        Run your business with clarity and control.
                                    </h1>
                                    <p className="text-slate-500 mt-3">
                                        Access analytics, teams, inventory, and invoices in a single, reliable workspace.
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className="h-10 w-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                                            <FaUser />
                                        </span>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">Role-based access</p>
                                            <p className="text-xs text-slate-500">Owners, managers, and employees stay aligned.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="h-10 w-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                                            <FaLock />
                                        </span>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">Secure authentication</p>
                                            <p className="text-xs text-slate-500">Protected sessions with refresh support.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                                Tip: Use Google login for faster access if enabled by your admin.
                            </div>
                        </div>

                        <div className="w-full">
                            <div className="w-full max-w-md mx-auto form-card overflow-hidden">
                                <div className="form-header">
                                    <div className="form-header-icon">
                                        <FaSignInAlt />
                                    </div>
                                    <div>
                                        <h2 className="form-title">Welcome Back</h2>
                                        <p className="form-subtitle">Sign in to your account.</p>
                                    </div>
                                </div>

                                <div className="form-section">
                                    <form className="space-y-6" onSubmit={handleSubmit}>
                                        <div>
                                            <label htmlFor="username">Username</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                                    <FaUser aria-hidden="true" className="h-4 w-4" />
                                                </span>
                                                <input
                                                    id="username"
                                                    name="username"
                                                    type="text"
                                                    value={formData.username}
                                                    onChange={handleChange}
                                                    required
                                                    autoComplete="username"
                                                    placeholder="Enter your username"
                                                    className="w-full input-icon-left pr-4 py-3"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="password">Password</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                                    <FaLock aria-hidden="true" className="h-4 w-4" />
                                                </span>
                                                <input
                                                    id="password"
                                                    name="password"
                                                    type={showPassword ? "text" : "password"}
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    required
                                                    autoComplete="current-password"
                                                    placeholder="Enter your password"
                                                    className="w-full input-icon-left input-icon-right pr-12 py-3"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                                >
                                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center text-sm font-semibold">
                                            <Link
                                                to="/forgot-username"
                                                className="text-slate-700 hover:text-slate-900 hover:underline transition-colors"
                                            >
                                                Forgot Username?
                                            </Link>
                                            <Link
                                                to="/forgot-password"
                                                className="text-slate-700 hover:text-slate-900 hover:underline transition-colors"
                                            >
                                                Forgot Password?
                                            </Link>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className={`btn-primary w-full inline-flex items-center justify-center gap-2 ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
                                        >
                                            {loading ? (
                                                <span className="inline-flex items-center gap-2">
                                                    Signing in...
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-2">
                                                    <FaSignInAlt className="h-4 w-4" />
                                                    <span>Login</span>
                                                </span>
                                            )}
                                        </button>

                                        <div className="relative my-4">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-gray-200"></div>
                                            </div>
                                            <div className="relative flex justify-center text-sm">
                                                <span className="px-2 bg-white text-gray-500">Or continue with</span>
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <GoogleLoginButton onGoogleLogin={handleGoogleLogin} loading={loading} />
                                        </div>

                                        <div className="text-center pt-4 border-t border-gray-100">
                                            <p className="text-sm text-gray-600">
                                                Don't have an account?{" "}
                                                <Link
                                                    to="/owner/register"
                                                    className="text-slate-900 font-bold hover:underline"
                                                >
                                                    Register Business
                                                </Link>
                                            </p>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;
