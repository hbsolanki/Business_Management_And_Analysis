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
    : "border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
  }`;

const getErrorText = (error) => {
  if (!error) return null;
  if (typeof error === 'string') return error;
  if (Array.isArray(error) && error.length > 0) {
    const res = getErrorText(error[0]);
    if (typeof res === 'string') return res;
  }
  if (typeof error === 'object' && error !== null) {
    const values = Object.values(error);
    if (values.length > 0) {
      const res = getErrorText(values[0]);
      if (typeof res === 'string') return res;
    }
    try { return JSON.stringify(error); } catch (e) { return String(error); }
  }
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

  /* ---------------- FETCH DATA ---------------- */
  const fetchBranches = useCallback(async (name = "") => {
    setFetchingBranches(true);
    try {
      const res = await branchService.list(name ? { name } : {});
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setBranches(list);
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

      // 1. Resolve Branches
      const branchSource = data.assigned_branches || data.branches || data.branch || [];
      const branchList = Array.isArray(branchSource) ? branchSource : [branchSource];
      const branchIds = branchList.map(b => (typeof b === 'object' ? (b.id || b.branch_id) : b)).filter(Boolean);
      const branchObjects = branchList.filter(b => typeof b === 'object').map(b => ({
        id: b.id || b.branch_id,
        name: b.name || b.branch_name || "Branch"
      }));

      // 2. Resolve Assigned Works
      let assignedWorks = [];
      if (Array.isArray(data.assigned_works)) {
        assignedWorks = data.assigned_works.map(w => ({
          branch_id: Number(w.branch_id),
          work_type: String(w.work_type).toUpperCase()
        }));
      } else if (data.work) {
        const legacyWorks = normalizeWorkList(data.work);
        const defaultBranchId = branchIds[0];
        if (defaultBranchId) {
          assignedWorks = legacyWorks.map(w => ({
            branch_id: Number(defaultBranchId),
            work_type: w.toUpperCase()
          }));
        }
      }

      const fetchedData = {
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        username: user.username || "",
        mobile_number: user.mobile_number || "",
        salary: details.salary !== undefined && details.salary !== null ? String(details.salary) : "",
        role: (typeof user.role === 'object' ? user.role.role : user.role) || "EMPLOYEE",
        description: details.bio || details.description || data.description || "",
        assigned_works: assignedWorks,
        branch_ids: branchIds,
        address_data: {
          address_line_1: addressSource.address_line_1 || "",
          address_line_2: addressSource.address_line_2 || "",
          city: addressSource.city_name || addressSource.city || "",
          state: addressSource.state_name || addressSource.state || "",
          country: addressSource.country_name || addressSource.country || "",
          pin_code: addressSource.pin_code || "",
        },
      };

      originalData.current = JSON.parse(JSON.stringify(fetchedData)); // Deep copy for comparison

      setFormData({
        ...fetchedData,
        password: "",
        image: null,
        imagePreview: user.profile_picture || user.image || data.profile_picture || "",
      });

      if (branchObjects.length > 0) {
        setSelectedBranchesData(branchObjects);
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

  /* ---------------- EVENT HANDLERS ---------------- */
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
          imagePreview: URL.createObjectURL(file),
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleRoleChange = (nextRole) => {
    const roleRank = { EMPLOYEE: 1, MANAGER: 2, OWNER: 3 };
    const currentRole = (typeof formData.role === 'object' ? formData.role.role : formData.role) || "EMPLOYEE";
    
    if ((roleRank[nextRole] || 0) > (roleRank[currentRole] || 0)) {
      setRoleConfirm({ open: true, nextRole });
    } else {
      setFormData((prev) => ({ ...prev, role: nextRole }));
    }
  };

  const toggleBranch = (branchId) => {
    setFormData(prev => {
      const isSelected = prev.branch_ids.includes(branchId);
      const nextBranchIds = isSelected 
        ? prev.branch_ids.filter(id => id !== branchId)
        : [...prev.branch_ids, branchId];
      
      // Cleanup works if branch removed
      const nextAssignedWorks = isSelected
        ? prev.assigned_works.filter(w => w.branch_id !== branchId)
        : prev.assigned_works;

      return { ...prev, branch_ids: nextBranchIds, assigned_works: nextAssignedWorks };
    });
  };

  const handleWorkTypeChange = (branchId, workType) => {
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
  };

  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const normalize = (value) => {
      if (Array.isArray(value)) {
        const sorted = [...value].sort((a, b) => {
          const keyA = typeof a === 'object' ? `${a.branch_id}-${a.work_type}` : String(a);
          const keyB = typeof b === 'object' ? `${b.branch_id}-${b.work_type}` : String(b);
          return keyA.localeCompare(keyB);
        });
        return JSON.stringify(sorted);
      }
      if (value && typeof value === "object") return JSON.stringify(value);
      return (value === null || value === undefined ? "" : String(value));
    };

    const updates = {};
    
    // User fields
    const userUpdates = {};
    ["first_name", "last_name", "email", "username", "mobile_number", "role"].forEach(field => {
      if (normalize(formData[field]) !== normalize(originalData.current[field])) {
        userUpdates[field] = formData[field];
      }
    });
    if (formData.password) userUpdates.password = formData.password;
    if (Object.keys(userUpdates).length > 0) updates.user = userUpdates;

    // Details fields
    const detailUpdates = {};
    if (normalize(formData.salary) !== normalize(originalData.current.salary)) {
      detailUpdates.salary = formData.salary ? Number(formData.salary) : null;
    }
    if (normalize(formData.description) !== normalize(originalData.current.description)) {
      detailUpdates.bio = formData.description;
    }
    if (normalize(formData.address_data) !== normalize(originalData.current.address_data)) {
      detailUpdates.address = formData.address_data;
    }
    if (Object.keys(detailUpdates).length > 0) updates.employee_details = detailUpdates;

    // Branches & Works (Full Sync)
    if (normalize(formData.branch_ids) !== normalize(originalData.current.branch_ids)) {
      updates.assigned_branches = formData.branch_ids.map(id => ({ id }));
    }
    if (normalize(formData.assigned_works) !== normalize(originalData.current.assigned_works)) {
      updates.assigned_works = formData.assigned_works;
    }

    const hasFile = formData.image instanceof File;
    if (!hasFile && Object.keys(updates).length === 0) {
      toast("No changes detected", { icon: "ℹ️" });
      setSaving(false);
      return;
    }

    try {
      let submitData = updates;
      if (hasFile) {
        submitData = new FormData();
        // If there are JSON updates, we often need to send them as individual fields 
        // or a nested structure depending on how the backend parses MultiPart
        Object.entries(updates).forEach(([key, value]) => {
          if (typeof value === 'object') {
            submitData.append(key, JSON.stringify(value));
          } else {
            submitData.append(key, value);
          }
        });
        submitData.append("profile_picture", formData.image);
      }

      await employeeService.update(id, submitData);
      toast.success("Employee updated");
      navigate(-1);
    } catch (err) {
      console.error("Update failed", err);
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        setErrors(data);
      }
      
      // Get a readable error message for the toast
      const mainError = data?.detail || data?.non_field_errors?.[0] || getErrorText(data) || "Failed to update employee";
      toast.error(mainError);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-slate-900"></div>
      </div>
    );
  }

  const allVisibleBranches = Array.from(new Map([
    ...selectedBranchesData.map(b => [b.id, b]),
    ...branches.map(b => [b.id, b])
  ]).values());

  return (
    <div className="min-h-screen pb-12 bg-transparent font-sans">
      <OwnerHeader />

      <main className="max-w-5xl mx-auto px-4 pt-8">
        <div className="mb-6">
          <BackButton label="Back to Employees" />
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <header className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex items-center gap-5">
            <div className="h-14 w-14 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg border border-slate-800">
              <FaUser size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Edit Employee Profile</h1>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest opacity-80 mt-1">Update permissions & personal info</p>
            </div>
          </header>

          <div className="p-8 space-y-8">
            {/* Profile Picture Section */}
            <section className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="relative h-24 w-24 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-white">
                <img
                  src={formData.imagePreview || "https://placehold.co/150"}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Profile Photo</h3>
                <label htmlFor="image-upload" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all cursor-pointer shadow-sm">
                  <FaCamera size={12} className="text-slate-900" />
                  Change Image
                  <input id="image-upload" type="file" name="image" accept="image/*" className="hidden" onChange={handleChange} />
                </label>
              </div>
            </section>

            <form onSubmit={handleSubmit} className="space-y-10">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InputField label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} icon={FaUser} error={errors.first_name} />
                <InputField label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} icon={FaUser} error={errors.last_name} />
                <InputField label="Username" name="username" value={formData.username} onChange={handleChange} icon={FaIdCard} error={errors.username} />
                <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} icon={FaEnvelope} error={errors.email} />
                <InputField label="Mobile Number" name="mobile_number" value={formData.mobile_number} onChange={handleChange} icon={FaPhone} error={errors.mobile_number} />
                <InputField label="Salary" name="salary" type="number" value={formData.salary} onChange={handleChange} icon={FaMoneyBillWave} error={detailErrors.salary || errors.salary} />
                
                <div>
                  <label className={labelClass}>User Role</label>
                  <div className="relative group">
                    <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <select
                      name="role"
                      value={formData.role}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      className={`${inputClass(Boolean(errors.role))} pl-11 appearance-none font-bold`}
                    >
                      <option value="OWNER">Owner (Full Business Access)</option>
                      <option value="MANAGER">Manager (Operational Controls)</option>
                      <option value="EMPLOYEE">Employee (Restricted Access)</option>
                    </select>
                  </div>
                  {errors.role && <p className="text-rose-600 text-xs mt-2 font-bold">{getErrorText(errors.role)}</p>}
                </div>

                <InputField label="New Password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Keep blank to remain unchanged" icon={FaIdCard} error={errors.password} />
              </div>

              {/* Branch Access Section */}
              <section className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200"><FaMapMarkerAlt size={14} /></div>
                    Branch Assignments
                  </h3>
                  <div className="relative w-full sm:w-64">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                    <input
                      type="text"
                      placeholder="Search branches..."
                      value={branchSearch}
                      onChange={(e) => setBranchSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                      className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-100 outline-none transition-all font-bold bg-slate-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 min-h-[160px]">
                  {fetchingBranches ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-10 opacity-50"><div className="animate-spin h-6 w-6 border-2 border-slate-400 border-t-slate-900 rounded-full mb-3"></div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Updating search...</p></div>
                  ) : allVisibleBranches.length > 0 ? (
                    allVisibleBranches.map(branch => {
                      const isSelected = formData.branch_ids.includes(branch.id);
                      return (
                        <button
                          key={branch.id}
                          type="button"
                          onClick={() => toggleBranch(branch.id)}
                          className={`flex items-center gap-4 p-3.5 rounded-xl border transition-all text-left group ${isSelected ? "bg-white border-slate-900 shadow-sm ring-4 ring-slate-100" : "bg-white border-slate-200 hover:border-slate-300"}`}
                        >
                          <div className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${isSelected ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-slate-200"}`}>
                            {isSelected && <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20"><path d="M0 11l2-2 5 5L18 3l2 2L7 18z"/></svg>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900 truncate tracking-tight">{branch.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate mt-0.5">{branch.contact_number || "No contact"}</p>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-10 text-slate-400">
                      <FaSearch className="mb-3 opacity-20" size={32} />
                      <p className="text-sm font-bold opacity-60">No branches found matching search</p>
                    </div>
                  )}
                </div>
                {(errors.branch_ids || errors.branch_id) && <p className="text-rose-600 text-xs font-bold text-center">{getErrorText(errors.branch_ids || errors.branch_id)}</p>}
              </section>

              {/* Work Modules Section */}
              <section className="space-y-6">
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-4">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200"><FaIdCard size={14} /></div>
                  Module Permissions
                </h3>
                
                {formData.branch_ids.length === 0 ? (
                  <div className="p-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 text-center">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Select branches above to configure permissions</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {formData.branch_ids.map(bid => {
                      const branch = allVisibleBranches.find(b => b.id === bid);
                      return (
                        <div key={bid} className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                          <header className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-900"></span>
                              {branch?.name || `Branch #${bid}`}
                            </h4>
                          </header>
                          <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                            {["PRODUCT", "INVENTORY", "ANALYTICS", "INVOICE", "SUPPLIER"].map(workType => {
                              const isChecked = formData.assigned_works.some(w => w.branch_id === bid && w.work_type === workType);
                              return (
                                <button
                                  key={workType}
                                  type="button"
                                  onClick={() => handleWorkTypeChange(bid, workType)}
                                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all group ${isChecked ? "bg-slate-900 border-slate-900 shadow-sm" : "hover:bg-slate-50 border-slate-100"}`}
                                >
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isChecked ? "bg-white/10 text-white" : "bg-slate-100 text-slate-400"}`}>
                                    <FaIdCard size={12} />
                                  </div>
                                  <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${isChecked ? "text-white" : "text-slate-500 group-hover:text-slate-900"}`}>
                                    {workType}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {errors.assigned_works && <p className="text-rose-600 text-xs font-bold text-center mt-4">{getErrorText(errors.assigned_works)}</p>}
              </section>

              {/* Address Section */}
              <section className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Residential Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 relative group">
                    <FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input
                      name="address_line_1"
                      value={formData.address_data.address_line_1}
                      onChange={(e) => setFormData(p => ({ ...p, address_data: { ...p.address_data, address_line_1: e.target.value } }))}
                      placeholder="Address Line 1"
                      className={`${inputClass(false)} pl-11 font-medium`}
                    />
                  </div>
                  <div className="md:col-span-2 relative group">
                    <FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input
                      name="address_line_2"
                      value={formData.address_data.address_line_2}
                      onChange={(e) => setFormData(p => ({ ...p, address_data: { ...p.address_data, address_line_2: e.target.value } }))}
                      placeholder="Address Line 2 (Optional)"
                      className={`${inputClass(false)} pl-11 font-medium`}
                    />
                  </div>
                  {["city", "state", "country", "pin_code"].map(key => (
                    <input
                      key={key}
                      name={key}
                      value={formData.address_data[key]}
                      onChange={(e) => setFormData(p => ({ ...p, address_data: { ...p.address_data, [key]: e.target.value } }))}
                      placeholder={key.replace('_', ' ').toUpperCase()}
                      className={`${inputClass(false, false)} font-medium`}
                    />
                  ))}
                </div>
              </section>

              {/* Description */}
              <section className="space-y-4">
                <label className={labelClass}>Bio / Notes</label>
                <textarea
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  className={`${inputClass(Boolean(errors.description), false)} resize-none font-medium leading-relaxed p-5`}
                  placeholder="Additional background, skills, or operational notes..."
                />
              </section>

              {/* Submit Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => navigate(-1)} className="w-full sm:w-auto px-8 py-3 rounded-xl text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-all">Cancel</button>
                <button type="submit" disabled={saving} className="w-full sm:w-auto px-12 py-3 rounded-xl bg-slate-900 text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? "Processing..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Role Confirmation Modal */}
      {roleConfirm.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-8 text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100"><FaIdCard size={20} /></div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Confirm Role Escalation</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">You are about to promote this user to <span className="text-slate-900 font-bold">{roleConfirm.nextRole}</span>. This will grant them significantly higher system permissions. Are you sure?</p>
            </div>
            <div className="p-5 bg-slate-50 flex items-center gap-3">
              <button onClick={() => setRoleConfirm({ open: false, nextRole: "" })} className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">Cancel</button>
              <button onClick={() => { setFormData(p => ({ ...p, role: roleConfirm.nextRole })); setRoleConfirm({ open: false, nextRole: "" }); }} className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all">Confirm Escalation</button>
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
          className={`${inputClass(Boolean(errorText))} pl-11 font-bold`}
        />
      </div>
      {errorText && <p className="text-rose-600 text-[10px] font-black uppercase tracking-widest">{errorText}</p>}
    </div>
  );
}
