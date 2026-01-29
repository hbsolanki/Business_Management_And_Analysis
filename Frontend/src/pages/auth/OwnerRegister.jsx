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
    FaCheckCircle,
    FaEye,
    FaEyeSlash,
} from "react-icons/fa";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";

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
            <div className="relative group">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors duration-200" />
                <input
                    name={name}
                    type={inputType}
                    value={value}
                    onChange={onChange}
                    required={required}
                    placeholder={placeholder}
                    className={`w-full bg-gray-50 border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all duration-200 ${error
                        ? "border-red-500 focus:ring-red-200 focus:border-red-500"
                        : "border-gray-200 focus:ring-blue-100 focus:border-blue-500"
                        } ${isPassword ? "pr-10" : ""}`}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer focus:outline-none"
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

    const [formData, setFormData] = useState({
        name: "",
        description: "",
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
        setFormData((prev) => ({ ...prev, [name]: value }));
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
        const { confirm_password, ...dataToSend } = formData;

        try {
            await authService.registerBusiness(dataToSend);
            toast.success("Business registered successfully");
            navigate("/owner");
        } catch (err) {
            const responseErrors = err.response?.data;
            if (responseErrors && typeof responseErrors === "object") {
                setErrors(responseErrors);
            } else if (err.response?.status === 409) {
                toast.error("Username already exists");
            } else {
                toast.error("Something went wrong");
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
        <div className="min-h-screen bg-white">
            <Header />

            <div className="flex min-h-screen pt-20">
                {/* Left Side: Form */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 xl:p-16">
                    <div className="w-full max-w-lg">
                        <div className="mb-8">
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                                Register Your Business
                            </h1>
                            <p className="text-gray-500 mt-2">
                                Join thousands of business owners effectively managing their operations.
                            </p>
                        </div>

                        <form className="space-y-5" onSubmit={handleSubmit}>
                            {/* Business Section */}
                            <div className="space-y-5 p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                                    <FaBuilding /> Business Details
                                </h3>
                                <InputField
                                    label="Business Name"
                                    name="name"
                                    icon={FaBuilding}
                                    placeholder="e.g. Acme Corp"
                                    value={formData.name}
                                    onChange={handleChange}
                                    error={errors.name ? errors.name[0] : null}
                                />
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                                        Description
                                    </label>
                                    <div className="relative group">
                                        <FaInfoCircle className="absolute left-3 top-3 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                        <textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleChange}
                                            required
                                            placeholder="Tell us about your business..."
                                            className={`w-full bg-white border rounded-xl pl-10 pr-4 py-3 text-sm min-h-[80px] focus:outline-none focus:ring-2 transition-all duration-200 ${errors.description
                                                ? "border-red-500 focus:ring-red-200"
                                                : "border-gray-200 focus:ring-blue-100 focus:border-blue-500"
                                                }`}
                                        />
                                    </div>
                                    {errors.description && (
                                        <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{errors.description[0]}</p>
                                    )}
                                </div>
                            </div>

                            {/* Personal Section */}
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
                                type="number"
                                icon={FaPhone}
                                placeholder="1234567890"
                                value={formData.mobile_number}
                                onChange={handleChange}
                                error={errors.mobile_number ? errors.mobile_number[0] : null}
                            />

                            {/* Credentials */}
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
                                className={`w-full py-3.5 rounded-xl text-white font-bold text-lg shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 ${loading
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                    }`}
                            >
                                {loading ? "Creating Account..." : "Create Business Account"}
                            </button>

                            <div className="relative my-4">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-blue-50/50 text-gray-500">Or continue with</span>
                                </div>
                            </div>

                            <div className="mb-6">
                                <GoogleLoginButton onGoogleLogin={handleGoogleLogin} loading={loading} />
                            </div>

                            <p className="text-center text-sm text-gray-600 mt-6">
                                Already have an account?{" "}
                                <Link to="/login" className="text-blue-600 font-bold hover:underline">
                                    Log in
                                </Link>
                            </p>
                        </form>
                    </div>
                </div>

                {/* Right Side: Content / Testimonials */}
                <div className="hidden lg:flex w-1/2 bg-blue-600 relative overflow-hidden items-center justify-center p-12">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-900 opacity-90 z-0"></div>
                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                    <div className="relative z-10 max-w-lg text-white">
                        <h2 className="text-4xl font-bold mb-6 leading-tight">
                            Scale your business with data-driven insights.
                        </h2>
                        <ul className="space-y-6 mb-12">
                            <li className="flex items-start gap-4">
                                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm mt-1">
                                    <FaCheckCircle className="text-blue-200" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">Real-time Analytics</h4>
                                    <p className="text-blue-100/80 text-sm leading-relaxed">Monitor your performance with live dashboards and reports.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm mt-1">
                                    <FaCheckCircle className="text-blue-200" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">Inventory Management</h4>
                                    <p className="text-blue-100/80 text-sm leading-relaxed">Keep track of stock levels, sales, and orders in one place.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm mt-1">
                                    <FaCheckCircle className="text-blue-200" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">Secure & Scalable</h4>
                                    <p className="text-blue-100/80 text-sm leading-relaxed">Enterprise-grade security that grows with your business.</p>
                                </div>
                            </li>
                        </ul>

                        <div className="p-6 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                            <p className="italic text-blue-50 mb-4 h-full">
                                "This platform revolutionized how we handle our daily operations. Highly recommended!"
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center font-bold text-blue-900">
                                    JD
                                </div>
                                <div>
                                    <div className="font-bold">John Doe</div>
                                    <div className="text-xs text-blue-200">CEO, TechStart Inc.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OwnerRegister;
