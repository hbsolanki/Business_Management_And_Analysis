import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import api from "@/services/api";
import { tokenService } from "@/services/tokenService";
import BackButton from "@/components/shared/BackButton";
import { FaCamera, FaSave, FaUser, FaEnvelope, FaPhone, FaLock, FaIdCard, FaExclamationTriangle, FaTrash, FaCheck } from "react-icons/fa";
import { authService } from "@/services/authService";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserProfile, setUserProfile } from "@/redux/slices/userSlice";
import { getProfileImageUrl } from "@/utils/imageUtils";

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
        bio: "",
        profile_picture: null,
        profile_picture_preview: null,
    });

    const [initialData, setInitialData] = useState({});
    const dispatch = useDispatch();
    const { profile: userProfile, loading: profileLoading } = useSelector((state) => state.user);

    const navigate = useNavigate();
    const userId = tokenService.getId();

    useEffect(() => {
        if (!userProfile && !profileLoading && userId) {
            dispatch(fetchUserProfile());
        }
    }, [userId, userProfile, profileLoading, dispatch]);

    useEffect(() => {
        if (userProfile && Object.keys(initialData).length === 0) {
            const baseUser = userProfile.user || userProfile;
            const initialUserData = {
                first_name: baseUser.first_name || "",
                last_name: baseUser.last_name || "",
                email: baseUser.email || "",
                username: baseUser.username || "",
                mobile_number: baseUser.mobile_number || "",
                password: "",
                bio: userProfile.employee_details?.bio || baseUser.bio || "",
                profile_picture: baseUser.profile_picture || null,
                profile_picture_preview: null,
            };
            setFormData(initialUserData);
            setInitialData(initialUserData);
            setLoading(false);
        } else if (!profileLoading && !userProfile && !userId) {
            setLoading(false);
        }
    }, [userProfile, profileLoading, userId, initialData]);

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
        if (!validateEmail(formData.email)) validationErrors.email = "Invalid email address";
        if (formData.password && !validatePassword(formData.password)) {
            validationErrors.password = "Password must be at least 8 characters, include a number and a special character";
        }

        if (Object.keys(validationErrors).length) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);

        try {
            const data = new FormData();
            const userPayload = {};
            const fieldsToCheck = ['first_name', 'last_name', 'email', 'username', 'mobile_number', 'bio'];
            let hasChanges = false;

            fieldsToCheck.forEach(field => {
                if (formData[field] !== initialData[field]) {
                    userPayload[field] = formData[field];
                    hasChanges = true;
                }
            });

            if (formData.password) {
                userPayload.password = formData.password;
                hasChanges = true;
            }

            Object.keys(userPayload).forEach(key => {
                data.append(key, userPayload[key]);
            });

            if (formData.profile_picture instanceof File) {
                data.append("profile_picture", formData.profile_picture);
                hasChanges = true;
            }

            if (!hasChanges) {
                toast.success("No changes to save");
                setIsSubmitting(false);
                return;
            }

            const response = await api.patch(`/user/${userId}/`, data, {
                timeout: 120000,
            });

            toast.success("Profile updated successfully");
            if (response.data) {
                dispatch(setUserProfile(response.data));
            } else {
                dispatch(fetchUserProfile());
            }
            navigate(-1);
        } catch (error) {
            toast.error("Failed to update profile");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("CRITICAL: This will permanently delete your entire owner account and all associated data. \n\nAre you absolutely sure you want to proceed?")) return;

        setIsSubmitting(true);
        try {
            await api.delete(`/user/${userId}/`);
            toast.success("Account deleted successfully");
            await authService.logout();
            navigate("/");
        } catch (error) {
            console.error("Failed to delete account", error);
            toast.error("Failed to delete account");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent font-sans pb-20">
            <Toaster position="top-center" />
            
            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
                <div className="flex justify-start">
                    <BackButton />
                </div>

                {/* Professional White Header Section */}
                <div className="relative overflow-hidden rounded-[2rem] bg-white p-8 md:p-10 shadow-xl border border-slate-200">
                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center gap-6">
                            <div className="h-14 w-14 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 shadow-lg text-white border border-slate-800">
                                <FaUser size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Edit Your Profile</h1>
                                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest opacity-80 mt-1">Update your identity & account details</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Profile Picture Section */}
                <div className="flex flex-col items-center py-4">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl ring-1 ring-slate-200">
                            {formData.profile_picture_preview || getProfileImageUrl(formData.profile_picture) ? (
                                <img
                                    src={formData.profile_picture_preview || getProfileImageUrl(formData.profile_picture)}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                                    <FaUser className="text-slate-200 text-5xl" />
                                </div>
                            )}
                        </div>
                        <label
                            htmlFor="profile-upload"
                            className="absolute -bottom-2 -right-2 h-10 w-10 bg-slate-900 text-white flex items-center justify-center rounded-xl cursor-pointer hover:bg-slate-800 shadow-xl transition-all hover:-translate-y-1"
                        >
                            <FaCamera className="text-xs" />
                        </label>
                        <input
                            id="profile-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Form Section */}
                    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* First Name */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">First Name</label>
                                <div className="relative group">
                                    <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                                    <input
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        required
                                        className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm text-slate-700 font-bold focus:border-slate-900 focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                                        placeholder="First Name"
                                    />
                                </div>
                            </div>

                            {/* Last Name */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Last Name</label>
                                <div className="relative group">
                                    <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                                    <input
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        required
                                        className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm text-slate-700 font-bold focus:border-slate-900 focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                                        placeholder="Last Name"
                                    />
                                </div>
                            </div>

                            {/* Username */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Username</label>
                                <div className="relative group">
                                    <FaIdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                                    <input
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        required
                                        className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm text-slate-700 font-bold focus:border-slate-900 focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                                        placeholder="Username"
                                    />
                                </div>
                            </div>

                            {/* Mobile Number */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Mobile Number</label>
                                <div className="relative group">
                                    <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                                    <input
                                        name="mobile_number"
                                        value={formData.mobile_number}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm text-slate-700 font-bold focus:border-slate-900 focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                                        placeholder="Mobile Number"
                                    />
                                </div>
                            </div>

                            {/* Email Address */}
                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                                <div className="relative group">
                                    <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                                    <input
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm text-slate-700 font-bold focus:border-slate-900 focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                                        placeholder="Email Address"
                                    />
                                </div>
                                {errors.email && <p className="text-rose-600 text-[10px] font-bold uppercase mt-1 ml-1 tracking-widest">{errors.email}</p>}
                            </div>

                            {/* Bio / Description */}
                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Bio / Description</label>
                                <div className="relative group">
                                    <textarea
                                        name="bio"
                                        value={formData.bio}
                                        onChange={handleChange}
                                        rows="3"
                                        className="w-full rounded-xl border border-slate-200 bg-white pl-4 pr-4 py-3 text-sm text-slate-700 font-medium focus:border-slate-900 focus:ring-4 focus:ring-slate-100 outline-none transition-all resize-none"
                                        placeholder="A short bio about yourself..."
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">New Password (Optional)</label>
                                <div className="relative group">
                                    <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-20 py-3 text-sm text-slate-700 font-bold focus:border-slate-900 focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                                        placeholder="Assign a secure password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
                                    >
                                        {showPassword ? "Hide" : "Show"}
                                    </button>
                                </div>
                                {errors.password && <p className="text-rose-600 text-[10px] font-bold uppercase mt-1 ml-1 tracking-widest">{errors.password}</p>}
                            </div>
                        </div>
                    </section>

                    {/* Action Buttons */}
                    <div className="flex flex-col items-center gap-6 pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`group relative flex items-center justify-center gap-3 px-12 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest text-white transition-all duration-300 shadow-lg ${
                                isSubmitting
                                    ? "bg-slate-300 cursor-not-allowed"
                                    : "bg-slate-900 hover:bg-slate-800 hover:shadow-slate-200 hover:-translate-y-1 active:translate-y-0 active:scale-95"
                            }`}
                        >
                            {isSubmitting ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <FaCheck className="text-xs transition-transform duration-500 group-hover:scale-125" />
                            )}
                            <span>
                                {isSubmitting ? "Saving Changes..." : "Save Profile Details"}
                            </span>
                        </button>
                    </div>
                </form>

                {/* Danger Zone */}
                <div className="pt-10">
                    <div className="bg-red-50/30 rounded-3xl border border-red-100 p-8 space-y-6">
                        <div className="flex items-center gap-3 text-red-600">
                            <FaExclamationTriangle className="text-xl" />
                            <h3 className="text-sm font-black uppercase tracking-[0.2em]">Danger Zone</h3>
                        </div>
                        
                        <div className="bg-white rounded-2xl border border-red-100 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="text-center md:text-left space-y-1">
                                <h4 className="text-lg font-bold text-slate-900">Delete Account</h4>
                                <p className="text-sm text-slate-500 font-medium">Permanently remove your account and all data. This cannot be undone.</p>
                            </div>
                            <button
                                onClick={handleDeleteAccount}
                                className="px-6 py-3 bg-white border-2 border-red-100 text-red-600 rounded-xl font-bold hover:bg-red-600 hover:text-white hover:border-red-600 transition-all duration-300 shadow-sm"
                            >
                                Delete Account
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default EditProfile;
