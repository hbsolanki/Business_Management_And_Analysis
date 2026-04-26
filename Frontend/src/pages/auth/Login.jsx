import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import Header from "@/components/layout/Header";
import toast from "react-hot-toast";
import { authService } from "@/services/authService";
import { setUserProfile } from "@/redux/slices/userSlice";
import { FaUser, FaLock, FaSignInAlt, FaEye, FaEyeSlash } from "react-icons/fa";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import { getLandingPath } from "@/features/auth/utils/authUtils";

function Login() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

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
            
            if (data.userProfile) {
                dispatch(setUserProfile(data.userProfile));
            }

            toast.success("Successfully logged in");

            const { path } = getLandingPath(data.userProfile);
            navigate(path, { replace: true });
        } catch (error) {
            console.error(error);
            if (error?.response?.status === 409) {
                toast.error("This user is already logged in from another session.");
            } else {
                toast.error(error?.response?.data?.error || "Invalid username or password");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async (codeResponse) => {
        if (loading) return;
        setLoading(true);
        try {
            const data = await authService.googleLogin(codeResponse.code);
            
            if (data.userProfile) {
                dispatch(setUserProfile(data.userProfile));
            }

            toast.success("Successfully logged in with Google");

            const { path } = getLandingPath(data.userProfile);
            navigate(path, { replace: true });
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

            <div className="flex-grow flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden">
                    <div className="px-10 py-8 border-b border-slate-50 flex items-center gap-4 bg-slate-50/30">
                        <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
                            <FaSignInAlt />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Welcome Back</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sign in to your account</p>
                        </div>
                    </div>

                    <div className="p-10">
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div>
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block" htmlFor="username">Username</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
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
                                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium text-slate-700 bg-slate-50/50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block" htmlFor="password">Password</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
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
                                        className="w-full pl-11 pr-12 py-3.5 rounded-2xl border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium text-slate-700 bg-slate-50/50"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                    >
                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
                                <Link
                                    to="/forgot-username"
                                    className="text-slate-400 hover:text-slate-900 transition-colors"
                                >
                                    Forgot Username?
                                </Link>
                                <Link
                                    to="/forgot-password"
                                    className="text-slate-400 hover:text-slate-900 transition-colors"
                                >
                                    Forgot Password?
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full group relative flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-black transition-all duration-300 shadow-xl shadow-slate-900/10 ${
                                    loading 
                                    ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                                    : "bg-slate-900 text-white hover:bg-slate-800"
                                }`}
                            >
                                {loading ? (
                                    <div className="h-5 w-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <FaSignInAlt className="h-4 w-4" />
                                        <span>Secure Login</span>
                                    </>
                                )}
                            </button>

                            <div className="relative my-8">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-100"></div>
                                </div>
                                <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.2em]">
                                    <span className="px-4 bg-white text-slate-400">Or continue with</span>
                                </div>
                            </div>

                            <div className="mb-8">
                                <GoogleLoginButton onGoogleLogin={handleGoogleLogin} loading={loading} />
                            </div>

                            <div className="text-center pt-6 border-t border-slate-50">
                                <p className="text-xs font-bold text-slate-500">
                                    New to Biz Visionary?{" "}
                                    <Link
                                        to="/owner/register"
                                        className="text-brand-600 font-black uppercase tracking-widest hover:underline ml-1"
                                    >
                                        Create Account
                                    </Link>
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;
