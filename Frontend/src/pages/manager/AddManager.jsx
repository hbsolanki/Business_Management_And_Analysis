import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { managerService } from "@/features/manager/services/managerService";
import { branchService } from "@/features/business/services/branchService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import BackButton from "@/components/shared/BackButton";
import { FaUser, FaPhone, FaLock, FaMoneyBillWave, FaAlignLeft, FaUserPlus, FaCodeBranch, FaSearch, FaTimes } from "react-icons/fa";
import toast from "react-hot-toast";

export default function AddManager() {
  const navigate = useNavigate();
  const { profile } = useSelector((state) => state.user);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    username: "",
    mobile_number: "",
    password: "",
    salary: "",
    description: "",
    branch_ids: [],
    address_data: {
      address_line_1: "",
      address_line_2: "",
      city: "",
      state: "",
      country: "",
      pin_code: "",
    },
  });

  const [branchSearch, setBranchSearch] = useState("");
  const [branches, setBranches] = useState([]);
  const [selectedBranchesData, setSelectedBranchesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingBranches, setFetchingBranches] = useState(false);
  const [errors, setErrors] = useState({});

  const fetchBranches = useCallback(async (name = "") => {
    const roleStr = typeof profile?.role === 'object' ? profile.role.role : profile?.role;
    if (roleStr === "OWNER") {
      setFetchingBranches(true);
      try {
        const res = await branchService.list(name ? { name } : {});
        if (Array.isArray(res.data)) {
          setBranches(res.data);
        } else if (res.data?.results) {
          setBranches(res.data.results);
        }
      } catch (err) {
        console.error("Failed to fetch branches", err);
      } finally {
        setFetchingBranches(false);
      }
    }
  }, [profile]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleSearch = () => {
    fetchBranches(branchSearch);
  };

  const handleChange = (e) => {
    let { name, value } = e.target;

    if (name === "mobile_number") {
      value = value.replace(/\D/g, "").slice(0, 10);
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleBranchChange = (branch) => {
    const branchId = typeof branch === 'object' ? branch.id : branch;
    if (typeof branch === 'object' && !selectedBranchesData.find(b => b.id === branchId)) {
      setSelectedBranchesData(prev => [...prev, branch]);
    }

    setFormData(prev => {
      const branch_ids = prev.branch_ids.includes(branchId)
        ? prev.branch_ids.filter(id => id !== branchId)
        : [...prev.branch_ids, branchId];
      return { ...prev, branch_ids };
    });
    if (errors.branch_ids) setErrors(prev => ({ ...prev, branch_ids: null }));
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const salaryValue = formData.salary !== "" ? Number(formData.salary) : null;

      const hasAddress = Object.values(formData.address_data).some((value) => String(value || "").trim() !== "");

      const payload = {
        user: {
          is_active: true,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          username: formData.username,
          password: formData.password,
          mobile_number: formData.mobile_number,
        },
        employee_details: {
          is_active: true,
          salary: Number.isFinite(salaryValue) ? salaryValue : formData.salary,
          bio: formData.description || "",
          ...(hasAddress ? { address: formData.address_data } : {}),
        },
        assigned_branches: formData.branch_ids.map(id => ({ id })),
      };

      await managerService.create(payload);
      toast.success("Manager added successfully");
      navigate(-1);
    } catch (err) {
      if (err.response?.data) {
        setErrors(err.response.data);
        const userErrors = err.response.data.user || {};
        const employeeErrors = err.response.data.employee_details || {};
        const errorMsg = err.response.data.detail ||
          err.response.data.non_field_errors?.[0] ||
          userErrors.username?.[0] ||
          userErrors.email?.[0] ||
          userErrors.password?.[0] ||
          employeeErrors.salary?.[0] ||
          "Failed to add manager";
        toast.error(errorMsg);
      } else {
        toast.error("Failed to add manager");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (name) =>
    `w-full rounded-xl input-icon-left pr-4 py-3 text-sm bg-white text-slate-700 placeholder-slate-400 ${errors[name]
      ? "border-red-500 focus:ring-2 focus:ring-red-200 shadow-sm"
      : "border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 transition-all outline-none"
    }`;

  const Label = ({ children, required }) => (
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );

  const userErrors = errors.user || {};
  const detailErrors = errors.employee_details || {};
  const salaryError = detailErrors.salary || errors.salary;
  const bioError = detailErrors.bio || errors.description;

  const getFieldError = (name) => {
    if (userErrors[name]) return userErrors[name][0];
    if (errors[name]) return errors[name][0];
    return null;
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      address_data: {
        ...prev.address_data,
        [name]: value
      }
    }));
  };

  return (
    <div className="min-h-screen bg-transparent">
      <ProtectedHeader />

      <div className="form-shell py-10 max-w-4xl">
        <div className="mb-4">
          <BackButton />
        </div>
        <div className="form-card overflow-hidden">
          <div className="form-header bg-slate-50">
            <div className="form-header-icon bg-slate-900 text-white">
              <FaUserPlus />
            </div>
            <div>
              <h2 className="form-title">Add New Manager</h2>
              <p className="form-subtitle">Create a manager account with the right access level.</p>
            </div>
          </div>

          <div className="form-section p-8">
            <form className="space-y-8" onSubmit={handleSubmit}>
              {(typeof profile?.role === 'object' ? profile.role.role : profile?.role) === "OWNER" && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Branch Access</p>
                    <p className="text-xs text-slate-500">Select branches this manager can access.</p>
                  </div>
                  <div className="max-w-sm">
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Search Branches
                    </label>
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" size={12} />
                      <input
                        type="text"
                        placeholder="Search branches..."
                        value={branchSearch}
                        onChange={(e) => setBranchSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                        className="w-full pl-9 pr-12 py-2 text-xs rounded-lg border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 outline-none transition-all bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleSearch}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-600 hover:text-brand-700 text-[10px] font-bold uppercase"
                      >
                        Search
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 min-h-[120px]">
                    {fetchingBranches ? (
                      <div className="col-span-full py-8 flex flex-col items-center justify-center gap-2">
                        <div className="animate-spin h-5 w-5 border-2 border-slate-300 border-t-slate-900 rounded-full"></div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Searching branches...</p>
                      </div>
                    ) : (
                      Array.from(new Map([
                        ...selectedBranchesData.filter(b => formData.branch_ids.includes(b.id)).map(b => [String(b.id), b]),
                        ...branches.map(b => [String(b.id), b]),
                      ].filter(x => x[1])).values()).length > 0 ? (
                        Array.from(new Map([
                          ...selectedBranchesData.filter(b => formData.branch_ids.includes(b.id)).map(b => [String(b.id), b]),
                          ...branches.map(b => [String(b.id), b]),
                        ].filter(x => x[1])).values()).map((branch) => (
                          <label
                            key={branch.id}
                            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors group border border-transparent hover:border-slate-200"
                          >
                            <input
                              type="checkbox"
                              checked={formData.branch_ids.includes(branch.id)}
                              onChange={() => handleBranchChange(branch)}
                              className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500 cursor-pointer"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-700 truncate">{branch.name}</p>
                              <div className="flex flex-wrap gap-1">
                                {branch.is_default && <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">Main Branch</span>}
                                {formData.branch_ids.includes(branch.id) && (
                                  <span className="text-[9px] font-bold text-brand-600 uppercase tracking-tighter">Manager Branch</span>
                                )}
                              </div>
                            </div>
                          </label>
                        ))
                      ) : (
                        <div className="col-span-full py-8 flex flex-col items-center justify-center text-slate-400">
                          <FaSearch size={24} className="mb-2 opacity-20" />
                          <p className="text-sm font-medium">No branches found matching "{branchSearch}"</p>
                        </div>
                      )
                    )}
                  </div>
                  {errors.branch_ids && (
                    <p className="text-red-500 text-xs mt-2 font-medium">{errors.branch_ids[0]}</p>
                  )}
                  {errors.branch_id && <p className="text-red-500 text-xs mt-2 font-medium">{errors.branch_id[0]}</p>}
                </section>
              )}

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Manager Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label required>First Name</Label>
                    <div className="relative group">
                      <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                      <input name="first_name" required onChange={handleChange} className={inputClass("first_name") + " pl-11"} placeholder="Full name" />
                    </div>
                    {errors.first_name && <p className="text-red-500 text-xs mt-2 font-medium">{errors.first_name[0]}</p>}
                  </div>

                  <div>
                    <Label required>Last Name</Label>
                    <div className="relative group">
                      <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                      <input name="last_name" required onChange={handleChange} className={inputClass("last_name") + " pl-11"} placeholder="Surname" />
                    </div>
                    {errors.last_name && <p className="text-red-500 text-xs mt-2 font-medium">{errors.last_name[0]}</p>}
                  </div>

                  <div>
                    <Label required>Email Address</Label>
                    <div className="relative group">
                      <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                      <input name="email" type="email" required onChange={handleChange} className={inputClass("email") + " pl-11"} placeholder="Email address" />
                    </div>
                    {getFieldError("email") && <p className="text-red-500 text-xs mt-2 font-medium">{getFieldError("email")}</p>}
                  </div>

                  <div>
                    <Label required>Username</Label>
                    <div className="relative group">
                      <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                      <input name="username" required onChange={handleChange} className={inputClass("username") + " pl-11"} placeholder="Login username" />
                    </div>
                    {getFieldError("username") && <p className="text-red-500 text-xs mt-2 font-medium">{getFieldError("username")}</p>}
                  </div>

                  <div>
                    <Label required>Mobile Number</Label>
                    <div className="relative group">
                      <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                      <input name="mobile_number" required onChange={handleChange} className={inputClass("mobile_number") + " pl-11"} placeholder="e.g. 9876543210" />
                    </div>
                    {errors.mobile_number && <p className="text-red-500 text-xs mt-2 font-medium">{errors.mobile_number[0]}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <Label required>Password</Label>
                    <div className="relative group">
                      <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                      <input type="password" name="password" required onChange={handleChange} className={inputClass("password") + " pl-11"} placeholder="Secure password" />
                    </div>
                    {errors.password && <p className="text-red-500 text-xs mt-2 font-medium">{errors.password[0]}</p>}
                  </div>

                  <div>
                    <Label required>Monthly Salary</Label>
                    <div className="relative group">
                      <FaMoneyBillWave className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                      <input type="number" name="salary" required onChange={handleChange} className={inputClass("salary") + " pl-11"} placeholder="e.g. 25000" />
                    </div>
                    {salaryError && <p className="text-red-500 text-xs mt-2 font-medium">{salaryError[0]}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <Label>Bio / Description</Label>
                    <div className="relative group">
                      <FaAlignLeft className="absolute left-4 top-4 text-slate-400 group-focus-within:text-brand-600 transition" />
                      <textarea
                        name="description"
                        onChange={handleChange}
                        className={inputClass("description") + " pl-11 min-h-[100px]"}
                        placeholder="Brief bio about the manager..."
                      />
                    </div>
                    {bioError && <p className="text-red-500 text-xs mt-2 font-medium">{bioError[0]}</p>}
                  </div>

                  <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Manager Address</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Street Address</Label>
                        <input name="address_line_1" onChange={handleAddressChange} className={inputClass("address_line_1")} placeholder="House no, Building, Street" />
                      </div>
                      <div>
                        <Label>Area / Landmark</Label>
                        <input name="address_line_2" onChange={handleAddressChange} className={inputClass("address_line_2")} placeholder="Area, Landmark" />
                      </div>
                      <div>
                        <Label>City</Label>
                        <input name="city" onChange={handleAddressChange} className={inputClass("city")} placeholder="City" />
                      </div>
                      <div>
                        <Label>State</Label>
                        <input name="state" onChange={handleAddressChange} className={inputClass("state")} placeholder="State" />
                      </div>
                      <div>
                        <Label>Pin Code</Label>
                        <input name="pin_code" onChange={handleAddressChange} className={inputClass("pin_code")} placeholder="6-digit PIN" />
                      </div>
                      <div>
                        <Label>Country</Label>
                        <input name="country" onChange={handleAddressChange} className={inputClass("country")} placeholder="Country" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

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
