import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { managerService } from "@/features/manager/services/managerService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import BackButton from "@/components/shared/BackButton";
import { FaUser, FaPhone, FaLock, FaMoneyBillWave, FaAlignLeft, FaUserPlus } from "react-icons/fa";
import toast from "react-hot-toast";

export default function AddManager() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    mobile_number: "",
    password: "",
    salary: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      await managerService.create(formData);
      toast.success("Manager added successfully");
      navigate(-1);
    } catch (err) {
      if (err.response?.data) {
        setErrors(err.response.data);
      } else {
        toast.error("Failed to add manager");
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
              <h2 className="form-title">Add New Manager</h2>
              <p className="form-subtitle">Create a manager account with the right access level.</p>
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
                    <input type="password" name="password" required onChange={handleChange} className={inputClass("password")} placeholder="Set password" />
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password[0]}</p>}
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
                  {loading ? "Creating..." : "Create Manager"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
