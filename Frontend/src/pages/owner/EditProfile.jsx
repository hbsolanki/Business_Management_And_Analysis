import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import api from "@/services/api";
import { tokenService } from "@/services/tokenService";
import BackButton from "@/components/shared/BackButton";
import { FaCamera, FaSave, FaUser, FaEnvelope, FaPhone, FaLock, FaIdCard } from "react-icons/fa";

function EditProfile() {
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        username: "",
        mobile_number: "",
        password: "",
        profile_picture: null,
        profile_picture_preview: null,
    });

    const [initialData, setInitialData] = useState({});

    const navigate = useNavigate();
    const userId = tokenService.getId();

    useEffect(() => {
        async function fetchUser() {
            try {
                const res = await api.get(`/user/${userId}/`);
                const user = res.data;

                const initialUserData = {
                    first_name: user.first_name || "",
                    last_name: user.last_name || "",
                    email: user.email || "",
                    username: user.username || "",
                    mobile_number: user.mobile_number || "",
                    password: "",
                    profile_picture: user.profile_picture || null,
                    profile_picture_preview: null,
                };
                setFormData(initialUserData);
                setInitialData(initialUserData);
            } catch (error) {
                toast.error("Failed to load user data");
            } finally {
                setLoading(false);
            }
        }

        if (userId) fetchUser();
        else setLoading(false);
    }, [userId]);

    const validateEmail = (email) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const validatePassword = (password) =>
        /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&]).{8,}$/.test(password);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData((prev) => ({
                ...prev,
                profile_picture: file,
                profile_picture_preview: URL.createObjectURL(file),
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        const validationErrors = {};

        if (!validateEmail(formData.email)) {
            validationErrors.email = "Invalid email address";
        }

        if (formData.password && !validatePassword(formData.password)) {
            validationErrors.password =
                "Password must be at least 8 characters, include a number and a special character";
        }

        if (Object.keys(validationErrors).length) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);

        try {
            const data = new FormData();

            const fieldsToCheck = ['first_name', 'last_name', 'email', 'username', 'mobile_number'];
            let hasChanges = false;

            fieldsToCheck.forEach(field => {
                if (formData[field] !== initialData[field]) {
                    data.append(field, formData[field]);
                    hasChanges = true;
                }
            });

            if (formData.password) {
                data.append("password", formData.password);
                hasChanges = true;
            }

            if (formData.profile_picture instanceof File) {
                data.append("profile_picture", formData.profile_picture);
                hasChanges = true;
            }

            if (!hasChanges) {
                toast.success("No changes to save");
                setIsSubmitting(false);
                return;
            }

            await api.patch(`/user/${userId}/`, data, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                timeout: 30000,
            });

            toast.success("Profile updated successfully");
            navigate(-1);
        } catch (error) {
            toast.error("Failed to update profile");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-transparent">
            <Toaster position="top-center" />

            <div className="max-w-3xl mx-auto">
                <div className="mb-4">
                    <BackButton />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-200">
                        <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                                <FaUser />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">Edit Profile</h2>
                                <p className="mt-1 text-sm text-slate-500">Update your personal information and account settings.</p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="px-8 py-8 space-y-8">
                        {/* Profile Picture Section */}
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md ring-2 ring-slate-100">
                                    {formData.profile_picture_preview || formData.profile_picture ? (
                                        <img
                                            src={
                                                formData.profile_picture_preview ||
                                                formData.profile_picture
                                            }
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                                            <FaUser className="text-slate-300 text-4xl" />
                                        </div>
                                    )}
                                </div>
                                <label
                                    htmlFor="profile-upload"
                                    className="absolute bottom-0 right-0 bg-slate-900 text-white p-2.5 rounded-full cursor-pointer hover:bg-slate-800 shadow-md transform transition-transform hover:scale-105"
                                >
                                    <FaCamera className="w-4 h-4" />
                                </label>
                                <input
                                    id="profile-upload"
                                    type="file"
                                    name="profile_picture"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>
                            <p className="text-sm text-slate-500">Click the camera icon to update your photo</p>
                        </div>

                        {/* Form Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {/* Personal Information */}
                            <div className="col-span-1 md:col-span-2">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                    Personal Details
                                </h3>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">First Name</label>
                                <div className="relative">
                                    <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        required
                                        className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
                                        placeholder="Enter your first name"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Name</label>
                                <div className="relative">
                                    <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        required
                                        className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
                                        placeholder="Enter your last name"
                                    />
                                </div>
                            </div>

                            {/* Contact & Account */}
                            <div className="col-span-1 md:col-span-2 mt-2">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                    Account Information
                                </h3>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Username</label>
                                <div className="relative">
                                    <FaIdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        required
                                        className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
                                        placeholder="Choose a username"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mobile Number</label>
                                <div className="relative">
                                    <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        name="mobile_number"
                                        value={formData.mobile_number}
                                        onChange={handleChange}
                                        required
                                        className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
                                        placeholder="Your mobile number"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</label>
                                <div className="relative">
                                    <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
                                        placeholder="name@example.com"
                                    />
                                </div>
                                {errors.email && <p className="text-rose-600 text-xs mt-1">{errors.email}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New Password (Optional)</label>
                                <div className="relative">
                                    <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-20 py-3 text-sm text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
                                        placeholder="Min 8 chars, 1 special"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 uppercase tracking-wide"
                                    >
                                        {showPassword ? "Hide" : "Show"}
                                    </button>
                                </div>
                                {errors.password && <p className="text-rose-600 text-xs mt-1">{errors.password}</p>}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="w-full sm:flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full sm:flex-1 flex items-center justify-center gap-2 py-3 px-4 text-white font-semibold rounded-xl transition-all ${isSubmitting
                                    ? "bg-slate-300 cursor-not-allowed"
                                    : "bg-slate-900 hover:bg-slate-800"
                                    }`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <FaSave /> Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default EditProfile;
