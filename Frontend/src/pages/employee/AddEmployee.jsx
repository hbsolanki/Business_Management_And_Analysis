import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { employeeService } from "@/features/employee/services/employeeService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import BackButton from "@/components/shared/BackButton";
import { FaUser, FaPhone, FaLock, FaMoneyBillWave, FaBriefcase, FaAlignLeft, FaUserPlus, FaEye, FaEyeSlash } from "react-icons/fa";
import toast from "react-hot-toast";

export default function AddEmployee() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    mobile_number: "",
    password: "",
    salary: "",
    description: "",
    work: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({
      ...p,
      [name]: name === "work" && value === "" ? null : value,
    }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      await employeeService.create(formData);
      toast.success("Employee added successfully");
      navigate(-1);
    } catch (err) {
      if (err.response?.data) {
        setErrors(err.response.data);
      } else {
        toast.error("Failed to add employee");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (name) =>
    `w-full rounded-xl input-icon-left pr-4 py-3 text-sm ${errors[name]
      ? "border-red-500 focus:ring-2 focus:ring-red-200"
      : "border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
    }`;

  const Label = ({ children }) => (
    <label className="block text-sm font-semibold text-gray-700 mb-2">{children}</label>
  );

  return (
    <div className="min-h-screen bg-transparent">
      <ProtectedHeader />

      <div className="form-shell py-10 max-w-3xl">
        <div className="mb-4">
          <BackButton />
        </div>
        <div className="form-card overflow-hidden">
          <div className="form-header">
            <div className="form-header-icon">
              <FaUserPlus />
            </div>
            <div>
              <h2 className="form-title">Add New Employee</h2>
              <p className="form-subtitle">Create a new employee account with assigned permissions.</p>
            </div>
          </div>

          <div className="form-section">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div>
                  <Label>First Name</Label>
                  <div className="relative group">
                    <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition" />
                    <input name="first_name" required onChange={handleChange} className={inputClass("first_name")} placeholder="First name" />
                  </div>
                  {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name[0]}</p>}
                </div>

                {/* Last Name */}
                <div>
                  <Label>Last Name</Label>
                  <div className="relative group">
                    <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition" />
                    <input name="last_name" required onChange={handleChange} className={inputClass("last_name")} placeholder="Last name" />
                  </div>
                  {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name[0]}</p>}
                </div>

                {/* Username */}
                <div>
                  <Label>Username</Label>
                  <div className="relative group">
                    <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition" />
                    <input name="username" required onChange={handleChange} className={inputClass("username")} placeholder="Username" />
                  </div>
                  {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username[0]}</p>}
                </div>

                {/* Mobile */}
                <div>
                  <Label>Mobile Number</Label>
                  <div className="relative group">
                    <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition" />
                    <input name="mobile_number" onChange={handleChange} className={inputClass("mobile_number")} placeholder="Mobile number" />
                  </div>
                  {errors.mobile_number && <p className="text-red-500 text-xs mt-1">{errors.mobile_number[0]}</p>}
                </div>

                {/* Password */}
                <div className="md:col-span-2">
                  <Label>Password</Label>
                  <div className="relative group">
                    <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      required
                      onChange={handleChange}
                      className={inputClass("password") + " pr-10"}
                      placeholder="Set password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                    >
                      {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">
                      {Array.isArray(errors.password) ? errors.password[0] : errors.password}
                    </p>
                  )}
                </div>

                {/* Salary */}
                <div>
                  <Label>Salary</Label>
                  <div className="relative group">
                    <FaMoneyBillWave className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition" />
                    <input type="number" name="salary" required onChange={handleChange} className={inputClass("salary")} placeholder="Salary amount" />
                  </div>
                  {errors.salary && <p className="text-red-500 text-xs mt-1">{errors.salary[0]}</p>}
                </div>

                {/* Work/Role */}
                <div className="md:col-span-2">
                  <Label>Work Assignment</Label>
                  <div className="p-4 rounded-xl border border-slate-200 bg-white">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {["PRODUCT", "INVENTORY", "ANALYTICS", "INVOICE"].map((workType) => (
                        <label key={workType} className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative flex items-center">
                            <input
                              type="radio"
                              name="work"
                              value={workType}
                              checked={formData.work === workType}
                              onChange={handleChange}
                              className="peer h-5 w-5 rounded-full border-gray-300 text-brand-600 focus:ring-brand-500 transition-all cursor-pointer"
                            />
                            <div className="absolute inset-0 bg-brand-100 rounded-full scale-0 peer-checked:scale-100 -z-10 transition-transform duration-200"></div>
                          </div>
                          <span className="text-sm font-medium text-gray-700 group-hover:text-slate-900 transition-colors capitalize">
                            {workType.toLowerCase()}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <div className="relative group">
                    <FaAlignLeft className="absolute left-3 top-4 text-gray-400 group-focus-within:text-brand-600 transition" />
                    <textarea name="description" rows="3" onChange={handleChange} className={inputClass("description")} placeholder="Additional details..." />
                  </div>
                  {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description[0]}</p>}
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`btn-primary ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  {loading ? "Creating..." : "Create Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
