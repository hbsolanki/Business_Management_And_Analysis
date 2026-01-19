import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { managerService } from "@/features/manager/services/managerService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
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
    `w-full rounded-xl border pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition-all ${errors[name]
      ? "border-red-500 focus:ring-2 focus:ring-red-200"
      : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
    }`;

  const Label = ({ children }) => (
    <label className="block text-sm font-semibold text-gray-700 mb-2">{children}</label>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <ProtectedHeader />

      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <FaUserPlus /> Add New Manager
            </h2>
            <p className="text-blue-100 mt-2">Create a new manager account</p>
          </div>

          <div className="p-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div>
                  <Label>First Name</Label>
                  <div className="relative group">
                    <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition" />
                    <input name="first_name" required onChange={handleChange} className={inputClass("first_name")} placeholder="First name" />
                  </div>
                  {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name[0]}</p>}
                </div>

                {/* Last Name */}
                <div>
                  <Label>Last Name</Label>
                  <div className="relative group">
                    <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition" />
                    <input name="last_name" required onChange={handleChange} className={inputClass("last_name")} placeholder="Last name" />
                  </div>
                  {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name[0]}</p>}
                </div>

                {/* Username */}
                <div>
                  <Label>Username</Label>
                  <div className="relative group">
                    <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition" />
                    <input name="username" required onChange={handleChange} className={inputClass("username")} placeholder="Username" />
                  </div>
                  {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username[0]}</p>}
                </div>

                {/* Mobile */}
                <div>
                  <Label>Mobile Number</Label>
                  <div className="relative group">
                    <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition" />
                    <input name="mobile_number" onChange={handleChange} className={inputClass("mobile_number")} placeholder="Mobile number" />
                  </div>
                  {errors.mobile_number && <p className="text-red-500 text-xs mt-1">{errors.mobile_number[0]}</p>}
                </div>

                {/* Password */}
                <div className="md:col-span-2">
                  <Label>Password</Label>
                  <div className="relative group">
                    <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition" />
                    <input type="password" name="password" required onChange={handleChange} className={inputClass("password")} placeholder="Set password" />
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password[0]}</p>}
                </div>

                {/* Salary */}
                <div>
                  <Label>Salary</Label>
                  <div className="relative group">
                    <FaMoneyBillWave className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition" />
                    <input type="number" name="salary" required onChange={handleChange} className={inputClass("salary")} placeholder="Salary amount" />
                  </div>
                  {errors.salary && <p className="text-red-500 text-xs mt-1">{errors.salary[0]}</p>}
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <div className="relative group">
                    <FaAlignLeft className="absolute left-3 top-4 text-gray-400 group-focus-within:text-blue-600 transition" />
                    <textarea name="description" rows="3" onChange={handleChange} className={inputClass("description")} placeholder="Additional details..." />
                  </div>
                  {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description[0]}</p>}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-6 py-2.5 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-8 py-2.5 rounded-xl font-bold text-white shadow-lg shadow-blue-500/30 transition-all transform active:scale-95 ${loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    }`}
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


