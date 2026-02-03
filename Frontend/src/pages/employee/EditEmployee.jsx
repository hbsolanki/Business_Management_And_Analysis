import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { employeeService } from "@/features/employee/services/employeeService";
import OwnerHeader from "@/components/layout/OwnerHeader";
import { FaUser, FaEnvelope, FaPhone, FaIdCard, FaCamera, FaSave, FaArrowLeft } from "react-icons/fa";
import { toast } from "react-hot-toast";

export default function EditEmployee() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    username: "",
    mobile_number: "",
    description: "",
    password: "",  // Add password field
    image: null,
    imagePreview: "",
  });

  const originalData = useRef({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ---------------- FETCH EMPLOYEE (EDIT MODE) ---------------- */
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const res = await employeeService.getById(id);
        const data = res.data;

        const fetchedData = {
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          username: data.username || "",
          mobile_number: data.mobile_number || "",
          description: data.description || "",
          work: data.work || [], // Fetch work
        };

        originalData.current = { ...fetchedData };

        setFormData({
          ...fetchedData,
          password: "",
          image: null,
          imagePreview: data.profile_picture || data.image || "",
        });
      } catch (err) {
        console.error("Failed to fetch employee", err);
        toast.error("Failed to load employee details");
        navigate("/employees/manage");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [id, navigate]);

  /* ---------------- HANDLE CHANGE ---------------- */
  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "image") {
      const file = files[0];
      if (file) {
        setFormData(prev => ({
          ...prev,
          image: file,
          imagePreview: URL.createObjectURL(file), // Provide immediate feedback
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  /* ---------------- SUBMIT UPDATE (ONLY CHANGED FIELDS) ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = new FormData();
    const fieldsToCheck = ["first_name", "last_name", "email", "username", "mobile_number", "description"];
    let hasChanges = false;

    // Only append fields that have changed
    fieldsToCheck.forEach((field) => {
      if (formData[field] !== originalData.current[field]) {
        payload.append(field, formData[field]);
        hasChanges = true;
      }
    });

    // Handle Work change manually (array comparison)
    const originalWork = originalData.current.work || [];
    const currentWork = formData.work || [];
    if (JSON.stringify(originalWork.sort()) !== JSON.stringify(currentWork.sort())) {
      // Append each work item individually for List[str] or as a JSON string depending on backend
      // Standard FormData for list: append multiple times
      currentWork.forEach(w => payload.append("work", w));
      hasChanges = true;
    }

    // Password is only sent if provided
    if (formData.password) {
      payload.append("password", formData.password);
      hasChanges = true;
    }

    // Image is sent if a new one is selected
    if (formData.image) {
      payload.append("profile_picture", formData.image); // Make sure backend expects 'profile_picture' or 'image'
      hasChanges = true;
    }

    if (!hasChanges) {
      toast("No changes to save", { icon: "ℹ️" });
      setSaving(false);
      return;
    }

    try {
      await employeeService.update(id, payload);
      toast.success("Employee updated successfully");
      navigate("/employees/manage");
    } catch (err) {
      console.error("Update failed", err);
      toast.error(err.response?.data?.detail || "Failed to update employee");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      <OwnerHeader />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-6 transition-colors"
        >
          <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Employees</span>
        </button>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          {/* Header / Banner */}
          <div className="relative h-32 bg-gradient-to-r from-blue-600 to-indigo-700">
            <div className="absolute -bottom-12 left-8">
              <div className="relative">
                <img
                  src={formData.imagePreview || "https://via.placeholder.com/150"}
                  alt="Profile"
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg bg-white"
                />
                <label
                  htmlFor="image-upload"
                  className="absolute -bottom-2 -right-2 p-2 bg-white text-blue-600 rounded-full shadow-md cursor-pointer hover:bg-gray-50 border border-gray-100 transition-all"
                >
                  <FaCamera size={14} />
                  <input
                    id="image-upload"
                    type="file"
                    name="image"
                    accept="image/*"
                    className="hidden"
                    onChange={handleChange}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="pt-16 pb-8 px-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {formData.first_name} {formData.last_name}
                </h1>
                <p className="text-gray-500 text-sm">Update employee details and permissions</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  label="First Name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  icon={FaUser}
                />
                <InputField
                  label="Last Name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  icon={FaUser}
                />
                <InputField
                  label="Username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  icon={FaIdCard}
                />
                <InputField
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  icon={FaEnvelope}
                />
                <InputField
                  label="Mobile Number"
                  name="mobile_number"
                  value={formData.mobile_number}
                  onChange={handleChange}
                  icon={FaPhone}
                />
                <InputField
                  label="New Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Leave blank to keep current"
                  icon={FaIdCard}
                />

                {/* Work Assignment */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Work Assignment</label>
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {["PRODUCT", "INVENTORY", "SALE", "ANALYTICS", "INVOICE"].map((workType) => (
                        <label key={workType} className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={Array.isArray(formData.work) ? formData.work.includes(workType) : formData.work === workType}
                            onChange={(e) => {
                              const { value, checked } = e.target;
                              setFormData(prev => {
                                const currentWork = Array.isArray(prev.work) ? prev.work : (prev.work ? [prev.work] : []);
                                if (checked) {
                                  return { ...prev, work: [...currentWork, workType] };
                                } else {
                                  return { ...prev, work: currentWork.filter(w => w !== workType) };
                                }
                              });
                            }}
                            className="h-5 w-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                          />
                          <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 transition-colors capitalize">
                            {workType.toLowerCase()}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description / Notes</label>
                  <textarea
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500 resize-none bg-gray-50 focus:bg-white transition-all"
                    placeholder="Additional details about this employee..."
                  />
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className={`flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg shadow-blue-200 transition-all ${saving ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
      </main>
    </div>
  );
}

function InputField({ label, name, type = "text", value, onChange, placeholder, icon: Icon }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
          {Icon && <Icon size={16} />}
        </div>
        <input
          type={type}
          name={name}
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder}
          className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-all shadow-sm"
        />
      </div>
    </div>
  );
}
