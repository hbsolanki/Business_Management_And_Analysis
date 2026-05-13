import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import toast from "react-hot-toast";
import { authService } from "@/services/authService";
import {
    FaBuilding,
    FaUser,
    FaLock,
    FaEnvelope,
    FaInfoCircle,
    FaGlobe,
    FaEye,
    FaEyeSlash,
    FaShieldAlt,
} from "react-icons/fa";
import { setUserProfile } from "@/redux/slices/userSlice";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import { useDispatch } from "react-redux";

/* ---------------- Reusable Input Comp ---------------- */
const InputField = ({
    label,
    name,
    type = "text",
    icon: Icon,
    placeholder,
    required = true,
    value,
    onChange,
    error,
    disabled = false,
    rightElement = null,
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
        <div className="w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                {label}
            </label>
            <div className="relative flex items-center">
                <div className="relative flex-1">
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        name={name}
                        type={inputType}
                        value={value}
                        onChange={onChange}
                        required={required}
                        placeholder={placeholder}
                        disabled={disabled}
                        className={`w-full input-icon-left pr-4 py-3 text-sm ${error ? "border-red-500 focus:ring-red-200 focus:border-red-500" : "border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"} ${isPassword ? "input-icon-right" : ""} ${disabled ? "bg-slate-50 cursor-not-allowed text-slate-500" : ""}`}
                    />
                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    )}
                </div>
                {rightElement}
            </div>
            {error && (
                <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{error}</p>
            )}
        </div>
    );
};

function OwnerRegister() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        username: "",
        email: "",
        otp: "",
        password: "",
        confirm_password: "",
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [otpTimer, setOtpTimer] = useState(0);

    /* ---------------- Timer Logic ---------------- */
    useEffect(() => {
        let interval;
        if (otpTimer > 0) {
            interval = setInterval(() => {
                setOtpTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [otpTimer]);

    /* ---------------- Password Validation ---------------- */
    const validatePassword = (password) =>
        /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&]).{8,}$/.test(password);

    /* ---------------- Handle Change ---------------- */
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    /* ---------------- Send OTP ---------------- */
    const handleSendOtp = async () => {
        if (!formData.email) {
            setErrors({ email: ["Email is required to send OTP"] });
            return;
        }
        if (!/\S+@\S+\.\S+/.test(formData.email)) {
            setErrors({ email: ["Please enter a valid email address"] });
            return;
        }

        setOtpLoading(true);
        try {
            await authService.sendOtp(formData.email);
            setIsOtpSent(true);
            setOtpTimer(60); // 60 seconds cooldown
            toast.success("Verification code sent to your email");
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data?.error || "Failed to send OTP";

            if (status === 403) {
                toast.error(msg);
                setErrors({ email: [msg] });
                setIsOtpSent(false); // Reset if blocked
            } else {
                toast.error(msg);
                if (err.response?.data?.error?.includes("already exists")) {
                    setErrors({ email: ["Email already registered"] });
                }
            }
        } finally {
            setOtpLoading(false);
        }
    };

    /* ---------------- Handle Submit ---------------- */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        if (!isOtpSent) {
            toast.error("Please verify your email with OTP first");
            return;
        }

        if (!formData.otp) {
            setErrors({ otp: ["OTP is required"] });
            return;
        }

        setLoading(true);
        setErrors({});

        if (!validatePassword(formData.password)) {
            setErrors({
                password: [
                    "Password must be at least 8 characters and include number & special character",
                ],
            });
            setLoading(false);
            return;
        }

        if (formData.password !== formData.confirm_password) {
            setErrors({
                confirm_password: ["Passwords do not match"],
            });
            setLoading(false);
            return;
        }

        // Prepare data for backend
        const { otp, confirm_password, ...userFields } = formData;
        const dataToSend = {
            user: { ...userFields },
            otp: otp
        };

        try {
            await authService.registerOwner(dataToSend);

            // Auto-login after successful 201 registration
            try {
                const loginData = await authService.login({
                    username: formData.username,
                    password: formData.password
                });

                if (loginData.userProfile) {
                    dispatch(setUserProfile(loginData.userProfile));
                }

                toast.success("Account created and verified successfully");
                navigate("/owner");
            } catch (loginErr) {
                console.error("Auto-login failed:", loginErr);
                toast.success("Registration complete. Please log in.");
                navigate("/login");
            }
        } catch (err) {
            const responseData = err.response?.data;
            const status = err.response?.status;

            if (status === 403) {
                // Handle 1-hour block
                toast.error(responseData.error || "Access denied. Too many attempts.");
                setErrors({ otp: [responseData.error] });
            } else if (responseData && typeof responseData === "object" && !Array.isArray(responseData)) {
                const flattenedErrors = responseData.user && typeof responseData.user === "object"
                    ? { ...responseData, ...responseData.user }
                    : responseData;
                setErrors(flattenedErrors);

                if (responseData.error) {
                    toast.error(responseData.error);
                }
            } else {
                toast.error("Registration failed. Please check your data.");
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
            const role = data.user.role;

            if (data.userProfile) {
                dispatch(setUserProfile(data.userProfile));
            }

            toast.success("Successfully logged in with Google");
            if (role === "OWNER") {
                navigate("/owner");
            } else if (role === "MANAGER") {
                navigate("/manager");
            } else if (role === "EMPLOYEE") {
                navigate("/employee");
            } else {
                // New Google user with no role/business yet
                navigate("/business/new");
            }
        } catch (error) {
            console.error(error);
            toast.error("Google Login Failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-transparent">
            <Header />

            <div className="flex-grow flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-2xl form-card overflow-hidden animate-in fade-in zoom-in duration-300">
                    <div className="form-header">
                        <div className="form-header-icon">
                            <FaUser />
                        </div>
                        <div>
                            <h1 className="form-title">Secure Owner Registration</h1>
                            <p className="form-subtitle">Register with your email and verify your identity.</p>
                        </div>
                    </div>

                    <div className="form-section">
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <InputField
                                    label="First Name"
                                    name="first_name"
                                    icon={FaUser}
                                    placeholder="John"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    error={errors.first_name ? errors.first_name[0] : null}
                                />
                                <InputField
                                    label="Last Name"
                                    name="last_name"
                                    icon={FaUser}
                                    placeholder="Doe"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    error={errors.last_name ? errors.last_name[0] : null}
                                />
                            </div>

                            <InputField
                                label="Email Address"
                                name="email"
                                type="email"
                                icon={FaEnvelope}
                                placeholder="john@example.com"
                                value={formData.email}
                                onChange={handleChange}
                                disabled={isOtpSent && otpTimer > 0}
                                error={errors.email ? errors.email[0] : null}
                                rightElement={
                                    <button
                                        type="button"
                                        onClick={handleSendOtp}
                                        disabled={otpLoading || otpTimer > 0}
                                        className={`ml-2 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all h-[46px] min-w-[120px] ${otpTimer > 0
                                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                : "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10"
                                            }`}
                                    >
                                        {otpLoading ? (
                                            <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                                        ) : otpTimer > 0 ? (
                                            `${otpTimer}s`
                                        ) : isOtpSent ? (
                                            "Resend"
                                        ) : (
                                            "Get OTP"
                                        )}
                                    </button>
                                }
                            />

                            {isOtpSent && (
                                <div className="animate-in slide-in-from-top-2 duration-300">
                                    <InputField
                                        label="Verification Code"
                                        name="otp"
                                        icon={FaShieldAlt}
                                        placeholder="Enter 6-digit OTP"
                                        value={formData.otp}
                                        onChange={handleChange}
                                        error={errors.otp ? errors.otp[0] : null}
                                    />
                                </div>
                            )}

                            <div className="space-y-6 pt-2 border-t border-slate-100 mt-6">
                                <InputField
                                    label="Username"
                                    name="username"
                                    icon={FaGlobe}
                                    placeholder="johndoe123"
                                    value={formData.username}
                                    onChange={handleChange}
                                    error={errors.username ? errors.username[0] : null}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <InputField
                                        label="Password"
                                        name="password"
                                        type="password"
                                        icon={FaLock}
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleChange}
                                        error={errors.password ? errors.password[0] : null}
                                    />
                                    <InputField
                                        label="Confirm Password"
                                        name="confirm_password"
                                        type="password"
                                        icon={FaLock}
                                        placeholder="••••••••"
                                        value={formData.confirm_password}
                                        onChange={handleChange}
                                        error={errors.confirm_password ? errors.confirm_password[0] : null}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`btn-primary w-full py-4 mt-4 ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Verifying & Creating...</span>
                                    </div>
                                ) : (
                                    "Complete Registration"
                                )}
                            </button>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-100"></div>
                                </div>
                                <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.2em]">
                                    <span className="px-3 bg-white text-gray-400">Or join using</span>
                                </div>
                            </div>

                            <div className="mb-4">
                                <GoogleLoginButton onGoogleLogin={handleGoogleLogin} loading={loading} />
                            </div>

                            <p className="text-center text-sm text-gray-500 mt-8 pt-6 border-t border-slate-50">
                                Already part of the vision?{" "}
                                <Link to="/login" className="text-slate-900 font-bold hover:underline ml-1">
                                    Sign In
                                </Link>
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OwnerRegister;
