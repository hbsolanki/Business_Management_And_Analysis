import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { employeeService } from "@/features/employee/services/employeeService";
import { branchService } from "@/features/business/services/branchService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import BackButton from "@/components/shared/BackButton";
import { FaUser, FaPhone, FaLock, FaMoneyBillWave, FaAlignLeft, FaUserPlus, FaEye, FaEyeSlash, FaCodeBranch, FaBriefcase, FaSearch, FaMapMarkerAlt } from "react-icons/fa";
import toast from "react-hot-toast";

export default function AddEmployee() {
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
    assigned_works: [],
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
  const [showPassword, setShowPassword] = useState(false);

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
    } else if (roleStr === "MANAGER" && profile?.branch) {
      // Auto-assign manager's branch
      const branchData = profile.branch;
      const firstBranch = Array.isArray(branchData) ? branchData[0] : branchData;

      let branchId;
      if (typeof firstBranch === 'object') {
        branchId = firstBranch.id;
      } else {
        branchId = firstBranch;
      }

      if (branchId !== undefined) {
        setFormData(prev => ({ ...prev, branch_ids: [branchId] }));
        if (typeof firstBranch === 'object') {
          setSelectedBranchesData([firstBranch]);
        }
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

    if (name.startsWith("addr_")) {
      const field = name.replace("addr_", "");
      setFormData((p) => ({ ...p, address_data: { ...p.address_data, [field]: value } }));
    } else {
      setFormData((p) => ({ ...p, [name]: value }));
    }
    if (errors[name]) setErrors((p) => ({ ...p, [name]: null }));
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

  const handleWorkChange = (branchId, workType) => {
    setFormData(prev => {
      const assigned_works = [...prev.assigned_works];
      const existingIdx = assigned_works.findIndex(
        w => w.branch_id === branchId && w.work_type === workType
      );

      if (existingIdx > -1) {
        assigned_works.splice(existingIdx, 1);
      } else {
        assigned_works.push({ branch_id: branchId, work_type: workType });
      }
      return { ...prev, assigned_works };
    });
    if (errors.assigned_works) setErrors(prev => ({ ...prev, assigned_works: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const salaryValue = formData.salary !== "" ? Number(formData.salary) : null;
      const addressPayload = formData.address_data || {};
      const hasAddress = Object.values(addressPayload).some((value) => String(value || "").trim() !== "");

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
          ...(hasAddress ? { address: addressPayload } : {}),
        },
        assigned_branches: formData.branch_ids.map(id => ({ id })),
        assigned_works: formData.assigned_works,
      };

      await employeeService.create(payload);
      toast.success("Employee added successfully");
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
          "Failed to add employee";
        toast.error(errorMsg);
      } else {
        toast.error("Failed to add employee");
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
              <h2 className="form-title">Add New Employee</h2>
              <p className="form-subtitle">Create a new employee account with assigned permissions.</p>
            </div>
          </div>

          <div className="form-section p-8">
            <form className="space-y-8" onSubmit={handleSubmit}>
              {(typeof profile?.role === 'object' ? profile.role.role : profile?.role) === "OWNER" && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Branch Access</p>
                    <p className="text-xs text-slate-500">Select branches this employee can access.</p>
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
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar rounded-xl border border-slate-200 bg-slate-50 p-2">
                    {fetchingBranches ? (
                      <div className="py-4 text-center text-slate-400 text-sm italic">Searching branches...</div>
                    ) : (
                      Array.from(new Map([
                        ...selectedBranchesData.filter(b => formData.branch_ids.includes(b.id)).map(b => [String(b.id), b]),
                        ...branches.map(b => [String(b.id), b]),
                      ].filter(x => x[1])).values()).map((b) => (
                        <label key={b.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white border border-slate-100 cursor-pointer transition-all group">
                          <input
                            type="checkbox"
                            checked={formData.branch_ids.includes(b.id)}
                            onChange={() => handleBranchChange(b)}
                            className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500 transition-all"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-700 truncate">{b.name}</p>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {b.is_default && <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">Main Branch</span>}
                              {formData.branch_ids.includes(b.id) && (
                                <span className="text-[9px] font-bold text-brand-600 uppercase tracking-tighter">Employee Branch</span>
                              )}
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                    {!fetchingBranches && branches.length === 0 && selectedBranchesData.filter(b => formData.branch_ids.includes(b.id)).length === 0 && (
                      <div className="py-4 text-center text-slate-400 text-sm italic">No branches found.</div>
                    )}
                  </div>
                  {errors.branch_ids && <p className="text-red-500 text-xs mt-2 font-medium">{errors.branch_ids[0]}</p>}
                  {errors.branch_id && <p className="text-red-500 text-xs mt-2 font-medium">{errors.branch_id[0]}</p>}
                </section>
              )}

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Employee Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label required>First Name</Label>
                    <div className="relative group">
                      <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                      <input name="first_name" required onChange={handleChange} className={inputClass("first_name") + " pl-11"} placeholder="Full name" />
                    </div>
                    {getFieldError("first_name") && <p className="text-red-500 text-xs mt-2 font-medium">{getFieldError("first_name")}</p>}
                  </div>

                  <div>
                    <Label required>Last Name</Label>
                    <div className="relative group">
                      <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                      <input name="last_name" required onChange={handleChange} className={inputClass("last_name") + " pl-11"} placeholder="Surname" />
                    </div>
                    {getFieldError("last_name") && <p className="text-red-500 text-xs mt-2 font-medium">{getFieldError("last_name")}</p>}
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
                    {getFieldError("mobile_number") && <p className="text-red-500 text-xs mt-2 font-medium">{getFieldError("mobile_number")}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <Label required>Password</Label>
                    <div className="relative group">
                      <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        required
                        onChange={handleChange}
                        className={inputClass("password") + " pl-11 pr-12"}
                        placeholder="Secure password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                      >
                        {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                      </button>
                    </div>
                    {getFieldError("password") && (
                      <p className="text-red-500 text-xs mt-2 font-medium">
                        {getFieldError("password")}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label required>Monthly Salary</Label>
                    <div className="relative group">
                      <FaMoneyBillWave className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                      <input type="number" name="salary" required onChange={handleChange} className={inputClass("salary") + " pl-11"} placeholder="e.g. 15000" />
                    </div>
                    {salaryError && <p className="text-red-500 text-xs mt-2 font-medium">{salaryError[0] || salaryError}</p>}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="space-y-1 mb-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Work Assignment</p>
                  <p className="text-xs text-slate-500">Assign work types for each selected branch.</p>
                </div>
                <div className="space-y-4">
                  {formData.branch_ids.length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-center">
                      <FaCodeBranch className="mx-auto text-slate-300 mb-2" size={24} />
                      <p className="text-sm text-slate-500 font-medium">Select branches above to assign work types</p>
                    </div>
                  ) : (
                    formData.branch_ids.map(bid => {
                      const branch = Array.from(new Map([
                        ...selectedBranchesData.map(b => [b.id, b]),
                        ...branches.map(b => [b.id, b]),
                      ]).values()).find(b => b.id === bid);

                      return (
                        <div key={bid} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                            {branch?.name || `Branch #${bid}`}
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {["PRODUCT", "INVENTORY", "ANALYTICS", "INVOICE", "SUPPLIER"].map((workType) => (
                              <label key={workType} className="flex items-center gap-2 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={formData.assigned_works.some(w => w.branch_id === bid && w.work_type === workType)}
                                  onChange={() => handleWorkChange(bid, workType)}
                                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 transition-all cursor-pointer"
                                />
                                <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors uppercase tracking-tight">
                                  {workType}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {errors.assigned_works && <p className="text-red-500 text-xs mt-2 font-medium">{errors.assigned_works[0]}</p>}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm space-y-5">
                <div>
                  <Label>Address</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 relative group">
                      <FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                      <input name="addr_address_line_1" value={formData.address_data.address_line_1} onChange={handleChange} className={inputClass("address_line_1") + " pl-11"} placeholder="Address Line 1" />
                    </div>
                    <div className="md:col-span-2 relative group">
                      <FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" />
                      <input name="addr_address_line_2" value={formData.address_data.address_line_2} onChange={handleChange} className={inputClass("address_line_2") + " pl-11"} placeholder="Address Line 2 (optional)" />
                    </div>
                    <div className="relative group">
                      <input name="addr_city" value={formData.address_data.city} onChange={handleChange} className={inputClass("city") + " pl-4"} placeholder="City" />
                    </div>
                    <div className="relative group">
                      <input name="addr_state" value={formData.address_data.state} onChange={handleChange} className={inputClass("state") + " pl-4"} placeholder="State" />
                    </div>
                    <div className="relative group">
                      <input name="addr_country" value={formData.address_data.country} onChange={handleChange} className={inputClass("country") + " pl-4"} placeholder="Country" />
                    </div>
                    <div className="relative group">
                      <input name="addr_pin_code" value={formData.address_data.pin_code} onChange={handleChange} className={inputClass("pin_code") + " pl-4"} placeholder="Pin Code" />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Additional Notes</Label>
                  <div className="relative group">
                    <FaAlignLeft className="absolute left-4 top-4 text-slate-400 group-focus-within:text-brand-600 transition" />
                    <textarea name="description" rows="3" onChange={handleChange} className={inputClass("description") + " pl-11"} placeholder="Any extra information about this employee..." />
                  </div>
                  {bioError && <p className="text-red-500 text-xs mt-2 font-medium">{bioError[0] || bioError}</p>}
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
