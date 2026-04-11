import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { employeeService } from "@/features/employee/services/employeeService";
import { branchService } from "@/features/business/services/branchService";
import OwnerHeader from "@/components/layout/OwnerHeader";
import BackButton from "@/components/shared/BackButton";
import { FaUser, FaEnvelope, FaPhone, FaIdCard, FaCamera, FaMoneyBillWave, FaSearch, FaMapMarkerAlt } from "react-icons/fa";
import { toast } from "react-hot-toast";

const normalizeWorkItem = (item) => {
  if (!item) return null;
  if (typeof item === "string") return item.toUpperCase();
  if (typeof item === "object") {
    const value = item.value || item.name || item.work || item.code || item.label;
    return value ? String(value).toUpperCase() : null;
  }
  return null;
};

const normalizeWorkList = (value) => {
  if (!value) return [];
  let list = [];
  if (Array.isArray(value)) {
    list = value;
  } else if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      list = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      list = [value];
    }
  } else {
    list = [value];
  }
  return list
    .map(normalizeWorkItem)
    .filter(Boolean);
};

const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2";
const inputClass = (hasError, withIcon = true) =>
  `block w-full ${withIcon ? "input-icon-left" : ""} pr-4 py-2.5 rounded-xl text-sm bg-white text-slate-700 placeholder-slate-400 border outline-none transition-all ${hasError
    ? "border-rose-400 focus:ring-2 focus:ring-rose-200"
    : "border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
  }`;
const getErrorText = (error) => {
  if (!error) return null;
  if (Array.isArray(error)) return error[0];
  return String(error);
};

export default function EditEmployee() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    username: "",
    mobile_number: "",
    salary: "",
    role: "",
    description: "",
    password: "",
    image: null,
    imagePreview: "",
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
  const [fetchingBranches, setFetchingBranches] = useState(false);
  const [errors, setErrors] = useState({});

  const originalData = useRef({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roleConfirm, setRoleConfirm] = useState({ open: false, nextRole: "" });
  const detailErrors = errors.employee_details || {};

  /* ---------------- FETCH EMPLOYEE (EDIT MODE) ---------------- */
  const fetchBranches = useCallback(async (name = "") => {
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
  }, []);

  const fetchEmployee = useCallback(async () => {
    try {
      const res = await employeeService.getById(id);
      const data = res.data;

      const user = data.user || data || {};
      const details = data.employee_details || data.employee_detail || {};
      const addressSource = details.address || data.address || {};

      const fetchedData = {
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        username: user.username || "",
        mobile_number: user.mobile_number || "",
        salary: details.salary !== undefined && details.salary !== null
          ? String(details.salary)
          : (data.salary !== undefined && data.salary !== null ? String(data.salary) : ""),
        role: (typeof data.role === 'object' ? data.role.role : data.role) || "EMPLOYEE",
        description: details.bio || details.description || data.description || "",
        assigned_works: Array.isArray(data.assigned_works)
          ? data.assigned_works.map(w => ({
            branch_id: w.branch_id,
            branch_name: w.branch_name,
            work_type: w.work_type
          }))
          : (data.work ? normalizeWorkList(data.work).map(w => ({ branch_id: data.branch_id || data.branch_ids?.[0], work_type: w })) : []),
        branch_ids: Array.isArray(data.assigned_branches) && data.assigned_branches.length > 0
          ? data.assigned_branches.map(b => b.id)
          : (data.branch_ids || (Array.isArray(data.branches) ? (typeof data.branches[0] === 'object' ? data.branches.map(b => b.id) : data.branches) : (data.branch_id ? [data.branch_id] : (Array.isArray(data.branch) ? data.branch.map(b => typeof b === 'object' ? b.id : b) : [])))),
        address_data: {
          address_line_1: addressSource.address_line_1 || "",
          address_line_2: addressSource.address_line_2 || "",
          city: addressSource.city_name || "",
          state: addressSource.state_name || addressSource.state || "",
          country: addressSource.country_name || addressSource.country || "",
          pin_code: addressSource.pin_code || "",
        },
      };

      originalData.current = { ...fetchedData };

      setFormData({
        ...fetchedData,
        password: "",
        image: null,
        imagePreview: data.profile_picture || data.image || "",
      });

      // Store branch objects for display (prefer assigned_branches)
      const branchSource = data.assigned_branches || data.branches || data.branch;
      if (Array.isArray(branchSource) && typeof branchSource[0] === 'object') {
        setSelectedBranchesData(branchSource);
      }
    } catch (err) {
      console.error("Failed to fetch employee", err);
      toast.error("Failed to load employee details");
      navigate("/employees/manage");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchBranches();
    fetchEmployee();
  }, [fetchBranches, fetchEmployee]);

  const handleSearch = () => {
    fetchBranches(branchSearch);
  };

  /* ---------------- HANDLE CHANGE ---------------- */
  const handleChange = (e) => {
    let { name, value, files } = e.target;

    if (name === "mobile_number") {
      value = value.replace(/\D/g, "").slice(0, 10);
    }

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
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: null }));
      }
    }
  };

  const roleRank = { EMPLOYEE: 1, MANAGER: 2, OWNER: 3 };
  const shouldConfirmRoleChange = (nextRole) => {
    const currentRole = (typeof formData.role === 'object' ? formData.role.role : formData.role) || "EMPLOYEE";
    return (roleRank[nextRole] || 0) > (roleRank[currentRole] || 0);
  };

  const handleRoleChange = (nextRole) => {
    if (shouldConfirmRoleChange(nextRole)) {
      setRoleConfirm({ open: true, nextRole });
      return;
    }
    setFormData((prev) => ({ ...prev, role: nextRole }));
  };

  /* ---------------- SUBMIT UPDATE (ONLY CHANGED FIELDS) ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const normalize = (value) => {
      if (Array.isArray(value)) {
        // Deep sort and stringify for comparison
        const sorted = [...value].sort((a, b) => {
          const keyA = typeof a === 'object' ? `${a.branch_id}-${a.work_type}` : String(a);
          const keyB = typeof b === 'object' ? `${b.branch_id}-${b.work_type}` : String(b);
          return keyA.localeCompare(keyB);
        });
        return JSON.stringify(sorted);
      }
      if (value && typeof value === "object") {
        return JSON.stringify(value);
      }
      return (value === null || value === undefined ? "" : String(value));
    };

    const fieldsToCheck = ["first_name", "last_name", "email", "username", "mobile_number", "role"];
    const userUpdates = {};

    fieldsToCheck.forEach((field) => {
      if (normalize(formData[field]) !== normalize(originalData.current[field])) {
        userUpdates[field] = formData[field];
      }
    });

    const updates = {};
    if (Object.keys(userUpdates).length > 0) {
      updates.user = userUpdates;
    }

    const detailUpdates = {};
    if (normalize(formData.salary) !== normalize(originalData.current.salary)) {
      const salaryValue = formData.salary !== "" ? Number(formData.salary) : null;
      detailUpdates.salary = Number.isFinite(salaryValue) ? salaryValue : formData.salary;
    }
    if (normalize(formData.description) !== normalize(originalData.current.description)) {
      detailUpdates.bio = formData.description || "";
    }
    if (normalize(formData.address_data) !== normalize(originalData.current.address_data)) {
      detailUpdates.address = formData.address_data;
    }
    if (Object.keys(detailUpdates).length > 0) {
      updates.employee_details = detailUpdates;
    }

    // assigned_branches and assigned_works are root keys
    if (normalize(formData.branch_ids) !== normalize(originalData.current.branch_ids)) {
      updates.assigned_branches = formData.branch_ids.map(id => ({ id }));
    }
    if (normalize(formData.assigned_works) !== normalize(originalData.current.assigned_works)) {
      updates.assigned_works = formData.assigned_works;
    }

    // Password is only sent if provided
    if (formData.password) {
      if (!updates.user) updates.user = {};
      updates.user.password = formData.password;
    }

    const hasFile = Boolean(formData.image);
    const hasChanges = hasFile || Object.keys(updates).length > 0;

    if (!hasChanges) {
      toast("No changes to save", { icon: "ℹ️" });
      setSaving(false);
      return;
    }

    let payload = updates;
    if (hasFile) {
      payload = new FormData();
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined) return;
        if (Array.isArray(value) || (value && typeof value === "object")) {
          payload.append(key, JSON.stringify(value));
        } else {
          payload.append(key, value);
        }
      });
      if (formData.image) {
        // profile_picture is part of user object according to nested structure, 
        // but often flat in multipart/form-data. 
        // If it MUST be nested, we might need a different approach, 
        // but typically backend handles user.profile_picture if sent as file with that key or similar.
        // Let's stick to sending it in user object if possible or as direct field.
        payload.append("profile_picture", formData.image);
      }
    }

    try {
      await employeeService.update(id, payload);
      toast.success("Employee updated successfully");
      navigate(-1);
    } catch (err) {
      console.error("Update failed", err);
      if (err.response?.data && typeof err.response.data === 'object' && !Array.isArray(err.response.data)) {
        setErrors(err.response.data);
      }
      const errorMsg = err.response?.data?.non_field_errors?.[0]
        || err.response?.data?.detail
        || (err.response?.data?.branch_id?.[0])
        || (err.response?.data?.branch_ids?.[0])
        || "Failed to update employee";
      toast.error(errorMsg);
    } finally {
      setSaving(false);
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
    <div className="min-h-screen pb-12 bg-transparent">
      <OwnerHeader />

      <main className="form-shell pt-8">
        <div className="mb-6">
          <BackButton to="/employees/manage" label="Back to Employees" />
        </div>

        <div className="form-card overflow-hidden">
          <div className="form-header bg-slate-50">
            <div className="form-header-icon">
              <FaUser />
            </div>
            <div>
              <h1 className="form-title">Edit Employee</h1>
              <p className="form-subtitle">Update employee details, permissions, and access.</p>
            </div>
          </div>

          <div className="form-section p-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-8 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="relative h-20 w-20 rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden">
                <img
                  src={formData.imagePreview || "https://placehold.co/150"}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-900">Profile photo</p>
                <label
                  htmlFor="image-upload"
                  className="btn-secondary inline-flex items-center gap-2 cursor-pointer"
                >
                  <FaCamera size={14} />
                  Change photo
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

            <form onSubmit={handleSubmit} className="space-y-8">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Employee Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField
                    label="First Name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    icon={FaUser}
                    error={errors.first_name}
                  />
                  <InputField
                    label="Last Name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    icon={FaUser}
                    error={errors.last_name}
                  />
                  <InputField
                    label="Username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    icon={FaIdCard}
                    error={errors.username}
                  />
                  <InputField
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    icon={FaEnvelope}
                    error={errors.email}
                  />
                  <InputField
                    label="Mobile Number"
                    name="mobile_number"
                    value={formData.mobile_number}
                    onChange={handleChange}
                    icon={FaPhone}
                    error={errors.mobile_number}
                  />
                  <InputField
                    label="Salary"
                    name="salary"
                    type="number"
                    value={formData.salary}
                    onChange={handleChange}
                    icon={FaMoneyBillWave}
                    placeholder="Monthly salary"
                    error={detailErrors.salary || errors.salary}
                  />
                  <div>
                    <label className={labelClass}>Role</label>
                    <div className="relative">
                      <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select
                        name="role"
                        value={formData.role}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        className={`${inputClass(Boolean(getErrorText(errors.role)))} appearance-none`}
                      >
                        <option value="OWNER">Owner</option>
                        <option value="MANAGER">Manager</option>
                        <option value="EMPLOYEE">Employee</option>
                      </select>
                      <svg
                        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    {getErrorText(errors.role) && (
                      <p className="text-rose-600 text-xs mt-2 font-medium">{getErrorText(errors.role)}</p>
                    )}
                  </div>
                  <InputField
                    label="New Password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Leave blank to keep current"
                    icon={FaIdCard}
                    error={errors.password}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Branches</p>
                    <p className="text-xs text-slate-500 mt-1">Manage branch access for this employee.</p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition" size={12} />
                    <input
                      type="text"
                      placeholder="Search branches..."
                      value={branchSearch}
                      onChange={(e) => setBranchSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                      className="w-full pl-9 pr-12 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 outline-none transition-all bg-white"
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 min-h-[120px]">
                  {fetchingBranches ? (
                    <div className="col-span-full py-8 flex flex-col items-center justify-center gap-2">
                      <div className="animate-spin h-5 w-5 border-2 border-slate-300 border-t-slate-900 rounded-full"></div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Searching branches...</p>
                    </div>
                  ) : (branches.length > 0 || formData.branch_ids.length > 0) ? (
                    Array.from(new Map([
                      ...selectedBranchesData.filter(b => formData.branch_ids.includes(b.id)).map(b => [String(b.id), b]),
                      ...branches.map(b => [String(b.id), b]),
                    ].filter(x => x[1])).values()).map(b => (
                      <label key={b.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors group border border-transparent hover:border-slate-200">
                        <input
                          type="checkbox"
                          checked={formData.branch_ids.includes(b.id)}
                          onChange={() => {
                            setFormData(prev => ({
                              ...prev,
                              branch_ids: prev.branch_ids.includes(b.id)
                                ? prev.branch_ids.filter(id => id !== b.id)
                                : [...prev.branch_ids, b.id]
                            }));
                          }}
                          className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-700 truncate">{b.name}</p>
                          <div className="flex flex-wrap gap-1">
                            {b.is_default && <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">Main Branch</span>}
                            {formData.branch_ids.includes(b.id) && (
                              <span className="text-[9px] font-bold text-brand-600 uppercase tracking-tighter">Employee Branch</span>
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
                  )}
                </div>
                {errors.branch_ids && <p className="text-rose-600 text-xs font-medium">{errors.branch_ids[0]}</p>}
                {errors.branch_id && <p className="text-rose-600 text-xs font-medium">{errors.branch_id[0]}</p>}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <label className={labelClass}>Work Assignment (Per Branch)</label>
                <div className="space-y-4">
                  {formData.branch_ids.length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-center">
                      <FaSearch className="mx-auto text-slate-300 mb-2" size={24} />
                      <p className="text-sm text-slate-500 font-medium">Select branches above to assign work types</p>
                    </div>
                  ) : (
                    formData.branch_ids.map(bid => {
                      const branch = Array.from(new Map([
                        ...selectedBranchesData.map(b => [b.id, b]),
                        ...branches.map(b => [b.id, b]),
                      ]).values()).find(b => b.id === bid);

                      const handleWorkTypeChange = (wType) => {
                        setFormData(prev => {
                          const assigned_works = [...prev.assigned_works];
                          const existingIdx = assigned_works.findIndex(
                            w => w.branch_id === bid && w.work_type === wType
                          );

                          if (existingIdx > -1) {
                            assigned_works.splice(existingIdx, 1);
                          } else {
                            assigned_works.push({ branch_id: bid, work_type: wType });
                          }
                          return { ...prev, assigned_works };
                        });
                      };

                      return (
                        <div key={bid} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
                            {branch?.name || `Branch #${bid}`}
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {["PRODUCT", "INVENTORY", "ANALYTICS", "INVOICE", "SUPPLIER"].map((workType) => (
                              <label key={workType} className="flex items-center gap-2 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={formData.assigned_works.some(w => w.branch_id === bid && (w.work_type === workType || w.work === workType))}
                                  onChange={() => handleWorkTypeChange(workType)}
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
                {errors.assigned_works && <p className="text-rose-600 text-xs mt-2 font-medium">{errors.assigned_works[0]}</p>}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm space-y-5">
                <div>
                  <label className={labelClass}>Address</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 relative">
                      <FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        name="address_line_1"
                        value={formData.address_data.address_line_1}
                        onChange={(e) => setFormData(p => ({ ...p, address_data: { ...p.address_data, address_line_1: e.target.value } }))}
                        placeholder="Address Line 1"
                        className={inputClass(false)}
                      />
                    </div>
                    <div className="md:col-span-2 relative">
                      <FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        name="address_line_2"
                        value={formData.address_data.address_line_2}
                        onChange={(e) => setFormData(p => ({ ...p, address_data: { ...p.address_data, address_line_2: e.target.value } }))}
                        placeholder="Address Line 2 (optional)"
                        className={inputClass(false)}
                      />
                    </div>
                    {[
                      { key: "city", label: "City" },
                      { key: "state", label: "State" },
                      { key: "country", label: "Country" },
                      { key: "pin_code", label: "Pin Code" },
                    ].map(({ key, label }) => (
                      <input
                        key={key}
                        name={key}
                        value={formData.address_data[key]}
                        onChange={(e) => setFormData(p => ({ ...p, address_data: { ...p.address_data, [key]: e.target.value } }))}
                        placeholder={label}
                        className={inputClass(false, false)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Description / Notes</label>
                  <textarea
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    className={`${inputClass(Boolean(getErrorText(detailErrors.bio || errors.description)), false)} resize-none`}
                    placeholder="Additional details about this employee..."
                  />
                  {getErrorText(detailErrors.bio || errors.description) && (
                    <p className="text-rose-600 text-xs mt-2 font-medium">{getErrorText(detailErrors.bio || errors.description)}</p>
                  )}
                </div>
              </section>

              <div className="form-actions">
                <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {roleConfirm.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Confirm Role Change</h3>
              <p className="text-sm text-slate-500 mt-1">
                You are about to set role to <span className="font-semibold text-slate-900">{roleConfirm.nextRole}</span>.
              </p>
            </div>
            <div className="p-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setRoleConfirm({ open: false, nextRole: "" })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setFormData((prev) => ({ ...prev, role: roleConfirm.nextRole }));
                  setRoleConfirm({ open: false, nextRole: "" });
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InputField({ label, name, type = "text", value, onChange, placeholder, icon: Icon, error }) {
  const errorText = getErrorText(error);
  return (
    <div>
      <label className={labelClass}>{label}</label>
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
          className={inputClass(Boolean(errorText))}
        />
      </div>
      {errorText && <p className="text-rose-600 text-xs mt-2 font-medium">{errorText}</p>}
    </div>
  );
}
