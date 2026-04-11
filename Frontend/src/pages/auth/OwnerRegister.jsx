import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import toast from "react-hot-toast";
import { authService } from "@/services/authService";
import {
    FaBuilding,
    FaUser,
    FaLock,
    FaPhone,
    FaInfoCircle,
    FaGlobe,
    FaEye,
    FaEyeSlash,
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
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                {label}
            </label>
            <div className="relative">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    name={name}
                    type={inputType}
                    value={value}
                    onChange={onChange}
                    required={required}
                    placeholder={placeholder}
                    className={`w-full input-icon-left pr-4 py-3 text-sm ${error ? "border-red-500 focus:ring-red-200 focus:border-red-500" : "border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"} ${isPassword ? "input-icon-right" : ""}`}
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
        password: "",
        confirm_password: "",
        mobile_number: "",
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    /* ---------------- Password Validation ---------------- */
    const validatePassword = (password) =>
        /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&]).{8,}$/.test(password);

    /* ---------------- Handle Change ---------------- */
    const handleChange = (e) => {
        const { name, value } = e.target;
        let newValue = value;

        // Specific logic for mobile number to restrict to 10 digits
        if (name === "mobile_number") {
            const onlyNums = value.replace(/[^0-9]/g, "");
            if (onlyNums.length <= 10) {
                newValue = onlyNums;
            } else {
                // If more than 10 digits, keep the current 10 digits
                newValue = formData.mobile_number;
            }
        }

        setFormData((prev) => ({ ...prev, [name]: newValue }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    /* ---------------- Handle Submit ---------------- */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        setErrors({});

        // Frontend validation for mobile number
        if (formData.mobile_number.length !== 10) {
            setErrors({ mobile_number: ["Mobile number must be exactly 10 digits"] });
            toast.error("Invalid mobile number. Please enter 10 digits.");
            setLoading(false);
            return;
        }

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

        // Remove confirm_password before sending to backend
        const dataToSend = { ...formData };
        delete dataToSend.confirm_password;

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

                toast.success("Account created and logged in successfully");
                navigate("/owner");
            } catch (loginErr) {
                console.error("Auto-login failed:", loginErr);
                toast.success("Owner registered successfully. Please log in.");
                navigate("/login");
            }
        } catch (err) {
            const responseErrors = err.response?.data;
            if (responseErrors && typeof responseErrors === "object" && !Array.isArray(responseErrors)) {
                // If it's a structural error object, map it to the form errors
                setErrors(responseErrors);
            } else if (err.response?.status === 409) {
                toast.error("Username already exists");
            } else {
                toast.error(typeof responseErrors === 'string' ? responseErrors : "Something went wrong creating the account");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async (codeResponse) => {
        console.log(codeResponse);
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
        <div className="min-h-screen flex flex-col bg-transparent">
            <Header />

            <div className="flex-grow flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-2xl form-card overflow-hidden">
                    <div className="form-header">
                        <div className="form-header-icon">
                            <FaUser />
                        </div>
                        <div>
                            <h1 className="form-title">Owner Register</h1>
                            <p className="form-subtitle">Set up your owner account to get started.</p>
                        </div>
                    </div>

                    <div className="form-section">
                        <form className="space-y-5" onSubmit={handleSubmit}>
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
                                label="Mobile Number"
                                name="mobile_number"
                                type="tel"
                                icon={FaPhone}
                                placeholder="1234567890"
                                value={formData.mobile_number}
                                onChange={handleChange}
                                error={errors.mobile_number ? errors.mobile_number[0] : null}
                            />

                            <div className="space-y-5 pt-2">
                                <InputField
                                    label="Username"
                                    name="username"
                                    icon={FaGlobe}
                                    placeholder="johndoe123"
                                    value={formData.username}
                                    onChange={handleChange}
                                    error={errors.username ? errors.username[0] : null}
                                />
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

                            <button
                                type="submit"
                                disabled={loading}
                                className={`btn-primary w-full ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
                            >
                                {loading ? "Creating Account..." : "Create Owner Account"}
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

                            <p className="text-center text-sm text-gray-600 mt-6">
                                Already have an account?{" "}
                                <Link to="/login" className="text-slate-900 font-bold hover:underline">
                                    Log in
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
