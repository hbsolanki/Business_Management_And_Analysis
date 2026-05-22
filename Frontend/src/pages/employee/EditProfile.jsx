import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { employeeService } from "@/features/employee/services/employeeService";
import BackButton from "@/components/shared/BackButton";
import { FaCamera, FaSave, FaUser, FaEnvelope, FaPhone, FaLock, FaIdCard, FaFileAlt } from "react-icons/fa";
import { useDispatch } from "react-redux";
import { fetchUserProfile } from "@/redux/slices/userSlice";

const labelClass = "block text-xs font-black text-slate-500 uppercase tracking-[0.1em] mb-2";
const inputClass = (hasError) =>
  `block w-full input-icon-left pr-4 py-3 rounded-xl text-sm bg-white text-slate-700 placeholder-slate-400 border outline-none transition-all ${hasError
    ? "border-rose-400 focus:ring-2 focus:ring-rose-200 shadow-sm"
    : "border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
  }`;

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
    bio: "",
    profile_picture: null,
    profile_picture_preview: null,
  });

  const [initialData, setInitialData] = useState({});

  const navigate = useNavigate();
  const dispatch = useDispatch();
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
          bio: user.employee_details?.bio || user.bio || "",
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
    setIsSubmitting(true);

    try {
      const payload = new FormData();
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

      // Nesting Fix: Wrap user fields in a JSON string as expected by Serializers
      if (Object.keys(userPayload).length > 0) {
        payload.append("user", JSON.stringify(userPayload));
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
      dispatch(fetchUserProfile());
      navigate(-1);
    } catch (err) {
      console.error("Profile update failed", err);
      const data = err.response?.data;
      if (data) setErrors(data);
      toast.error(data?.detail || "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 bg-transparent font-sans">
      <Toaster position="top-center" />

      <main className="max-w-4xl mx-auto px-4 pt-10">
        <div className="mb-6">
          <BackButton label="Back to Dashboard" />
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
          <header className="px-10 py-8 bg-slate-50 border-b border-slate-200 flex items-center gap-6">
            <div className="h-14 w-14 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
              <FaUser size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Edit Your Profile</h1>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest opacity-80 mt-1">Update your identity & account details</p>
            </div>
          </header>

          <div className="p-10 space-y-10">
            {/* Avatar Section */}
            <section className="flex flex-col sm:flex-row items-center gap-8 p-6 rounded-3xl bg-slate-50 border border-slate-200/60">
              <div className="relative group">
                <div className="w-28 h-28 rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-white">
                  <img
                    src={formData.profile_picture_preview || formData.profile_picture || "https://placehold.co/150"}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <FaCamera className="text-white text-2xl" />
                  </div>
                </div>
                <label
                  htmlFor="profile-upload"
                  className="absolute -bottom-2 -right-2 bg-slate-900 text-white p-2.5 rounded-xl cursor-pointer hover:bg-slate-800 shadow-xl transition-all hover:-translate-y-1"
                >
                  <FaCamera size={12} />
                </label>
                <input id="profile-upload" type="file" name="profile_picture" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Profile Photo</h3>
                <p className="text-xs text-slate-500 font-bold opacity-70">JPG, PNG or WEBP. Max 2MB.</p>
              </div>
            </section>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InputField label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} icon={FaUser} error={errors.first_name} />
                <InputField label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} icon={FaUser} error={errors.last_name} />
                
                <div className="md:col-span-2">
                  <label className={labelClass}>Description / Bio</label>
                  <div className="relative group">
                    <FaFileAlt className="absolute left-4 top-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      rows="3"
                      className={`${inputClass(Boolean(errors.description))} pl-11 resize-none font-medium p-4`}
                      placeholder="Share a bit about your role or background..."
                    />
                  </div>
                </div>

                <InputField label="Username" name="username" value={formData.username} onChange={handleChange} icon={FaIdCard} error={errors.username} />
                <InputField label="Mobile Number" name="mobile_number" value={formData.mobile_number} onChange={handleChange} icon={FaPhone} error={errors.mobile_number} />
                <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} icon={FaEnvelope} error={errors.email} />
                
                <div className="relative group">
                  <label className={labelClass}>New Password (Optional)</label>
                  <div className="relative">
                    <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`${inputClass(Boolean(errors.password))} pl-11 pr-20 font-bold`}
                      placeholder="Leave blank to keep current"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase text-slate-400 hover:text-slate-900 tracking-widest transition-colors"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {errors.password && <p className="text-rose-600 text-[10px] font-black uppercase tracking-widest mt-2">{errors.password[0] || errors.password}</p>}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-8 border-t border-slate-100">
                <button type="button" onClick={() => navigate(-1)} className="w-full sm:w-auto px-8 py-3 rounded-xl text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-12 py-3 rounded-xl bg-slate-900 text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all disabled:opacity-50">
                  {isSubmitting ? "Saving Changes..." : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

function InputField({ label, name, type = "text", value, onChange, placeholder, icon: Icon, error }) {
  const errText = Array.isArray(error) ? error[0] : error;
  return (
    <div className="space-y-2">
      <label className={labelClass}>{label}</label>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
          {Icon && <Icon size={14} />}
        </div>
        <input
          type={type}
          name={name}
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder}
          className={`${inputClass(Boolean(errText))} pl-11 font-bold`}
        />
      </div>
      {errText && <p className="text-rose-600 text-[10px] font-black uppercase tracking-widest mt-2">{errText}</p>}
    </div>
  );
}
