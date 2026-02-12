import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { employeeService } from "@/features/employee/services/employeeService";
import BackButton from "@/components/shared/BackButton";
import { FaCamera, FaSave, FaUser, FaEnvelope, FaPhone, FaLock, FaIdCard, FaFileAlt } from "react-icons/fa";

export default function EditProfile() {
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
    description: "",
    profile_picture: null,
    profile_picture_preview: null,
  });

  const [initialData, setInitialData] = useState({});

  const navigate = useNavigate();
  const userId = localStorage.getItem("id");

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    employeeService
      .getById(userId)
      .then((res) => {
        const user = res.data;
        const initialUserData = {
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          email: user.email || "",
          username: user.username || "",
          mobile_number: user.mobile_number || "",
          password: "",
          description: user.description || "",
          profile_picture: user.profile_picture || null,
          profile_picture_preview: null,
        };
        setFormData(initialUserData);
        setInitialData(initialUserData);
      })
      .catch((err) => {
        console.error("Failed to load user data", err);
        toast.error("Failed to load profile");
      })
      .finally(() => setLoading(false));
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

    if (formData.email && !validateEmail(formData.email)) {
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
      const payload = new FormData();
      
      const fieldsToCheck = ['first_name', 'last_name', 'email', 'username', 'mobile_number', 'description'];
      let hasChanges = false;

      fieldsToCheck.forEach(field => {
        if (formData[field] !== initialData[field]) {
          payload.append(field, formData[field]);
          hasChanges = true;
        }
      });

      if (formData.password) {
        payload.append("password", formData.password);
        hasChanges = true;
      }

      if (formData.profile_picture instanceof File) {
        payload.append("profile_picture", formData.profile_picture);
        hasChanges = true;
      }

      if (!hasChanges) {
        toast.success("No changes to save");
        setIsSubmitting(false);
        return;
      }

      await employeeService.update(userId, payload);
      toast.success("Profile updated successfully");
      navigate(-1);
    } catch (err) {
      console.error("Profile update failed", err);
      toast.error("Failed to update profile");
      if (err.response?.data) {
        setErrors(err.response.data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 bg-transparent">
      <Toaster position="top-center" />

      <div className="form-shell max-w-3xl">
        <div className="mb-4">
          <BackButton />
        </div>
        <div className="form-card overflow-hidden">
          <div className="form-header">
            <div className="form-header-icon">
              <FaUser />
            </div>
            <div>
              <h2 className="form-title">Edit Profile</h2>
              <p className="form-subtitle">Update your personal information.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="form-section space-y-8">
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg ring-2 ring-slate-200">
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
                    <div className="w-full h-full bg-white/90 flex items-center justify-center">
                      <FaUser className="text-gray-400 text-4xl" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <FaCamera className="text-white text-2xl" />
                  </div>
                </div>
                <label
                  htmlFor="profile-upload"
                  className="absolute bottom-0 right-0 bg-slate-900 text-white p-2.5 rounded-full cursor-pointer hover:bg-slate-800 shadow-lg transform transition-transform hover:scale-105"
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
              <p className="text-sm text-gray-500">Click the camera icon to update your photo</p>
            </div>

            {/* Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {/* Personal Information */}
              <div className="col-span-1 md:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                  <FaUser className="text-slate-700" /> Personal Details
                </h3>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">First Name</label>
                <input
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl"
                  placeholder="Enter your first name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Last Name</label>
                <input
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl"
                  placeholder="Enter your last name"
                />
              </div>

              <div className="col-span-1 md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">Description / Bio</label>
                <div className="relative">
                  <div className="absolute top-3 left-4 text-gray-400">
                    <FaFileAlt />
                  </div>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                  className="w-full input-icon-left pr-4 py-2.5 rounded-xl resize-none"
                    placeholder="Tell us a bit about yourself..."
                  />
                </div>
              </div>

              {/* Contact & Account */}
              <div className="col-span-1 md:col-span-2 mt-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                  <FaIdCard className="text-slate-700" /> Account Information
                </h3>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FaUser />
                  </div>
                  <input
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full input-icon-left pr-4 py-2.5 rounded-xl"
                    placeholder="Choose a username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Mobile Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FaPhone />
                  </div>
                  <input
                    name="mobile_number"
                    value={formData.mobile_number}
                    onChange={handleChange}
                    className="w-full input-icon-left pr-4 py-2.5 rounded-xl"
                    placeholder="Your mobile number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FaEnvelope />
                  </div>
                  <input
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full input-icon-left pr-4 py-2.5 rounded-xl"
                    placeholder="name@example.com"
                  />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">New Password (Optional)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FaLock />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full input-icon-left input-icon-right pr-20 py-2.5 rounded-xl"
                    placeholder="Min 8 chars, 1 special"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 uppercase tracking-wide"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`btn-primary flex-1 ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {isSubmitting ? "Saving..." : <><FaSave /> Save Changes</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
