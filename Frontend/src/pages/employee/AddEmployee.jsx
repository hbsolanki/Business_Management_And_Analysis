import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { employeeService } from "@/features/employee/services/employeeService";
import { branchService } from "@/features/business/services/branchService";
import OwnerHeader from "@/components/layout/OwnerHeader";
import BackButton from "@/components/shared/BackButton";
import { 
  FaUser, FaPhone, FaLock, FaMoneyBillWave, FaUserPlus, 
  FaEye, FaEyeSlash, FaSearch, FaMapMarkerAlt, 
  FaEnvelope, FaIdCard, FaShieldAlt, FaBoxOpen, 
  FaWarehouse, FaChartPie, FaFileInvoice, FaTruck, FaSpinner
} from "react-icons/fa";
import toast from "react-hot-toast";

const inputClass = (hasError) =>
  `block w-full pr-4 py-2 rounded-lg text-sm bg-slate-50 text-slate-900 placeholder-slate-300 border outline-none transition-all ${hasError
    ? "border-red-400 focus:ring-2 focus:ring-red-100"
    : "border-slate-100 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5"
  }`;

const getErrorText = (error) => {
  if (!error) return null;
  if (typeof error === 'string') return error;
  if (Array.isArray(error) && error.length > 0) return getErrorText(error[0]);
  if (typeof error === 'object' && error !== null) {
    const values = Object.values(error);
    if (values.length > 0) return getErrorText(values[0]);
  }
  return String(error);
};

function InputField({ label, name, type = "text", required, value, onChange, placeholder, icon: Icon, error }) {
  const errorText = getErrorText(error);
  return (
    <div className="space-y-1">
      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label} {required && <span className="text-red-500">*</span>}</label>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-slate-800 transition-colors">
          {Icon && <Icon size={11} />}
        </div>
        <input
          type={type}
          name={name}
          required={required}
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder}
          className={`${inputClass(Boolean(errorText))} pl-9 font-bold`}
        />
      </div>
      {errorText && <p className="text-red-500 text-[8px] font-bold mt-0.5 ml-1 uppercase tracking-tighter">{errorText}</p>}
    </div>
  );
}

export default function AddEmployee() {
  const navigate = useNavigate();
  const { profile } = useSelector((state) => state.user);

  const [formData, setFormData] = useState({
    first_name: "", last_name: "", email: "", username: "",
    mobile_number: "", password: "", salary: "", description: "",
    role: "EMPLOYEE", assigned_works: [], branch_ids: [],
    address_data: { address_line_1: "", city: "", state: "", country: "", pin_code: "" },
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
        setBranches(Array.isArray(res.data) ? res.data : (res.data?.results || []));
      } catch (err) { console.error(err); } finally { setFetchingBranches(false); }
    }
  }, [profile]);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === "mobile_number") value = value.replace(/\D/g, "").slice(0, 10);
    setFormData((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: null }));
  };

  const toggleBranch = (branch) => {
    const branchId = typeof branch === 'object' ? branch.id : branch;
    setFormData(prev => {
      const isSelected = prev.branch_ids.includes(branchId);
      const nextBranchIds = isSelected ? prev.branch_ids.filter(id => id !== branchId) : [...prev.branch_ids, branchId];
      if (!isSelected && typeof branch === 'object' && !selectedBranchesData.find(b => b.id === branchId)) {
        setSelectedBranchesData(s => [...s, branch]);
      }
      return { ...prev, branch_ids: nextBranchIds };
    });
  };

  const handleWorkChange = (branchId, workType) => {
    setFormData(prev => {
      const assigned_works = [...prev.assigned_works];
      const existingIdx = assigned_works.findIndex(w => w.branch_id === branchId && w.work_type === workType);
      if (existingIdx > -1) assigned_works.splice(existingIdx, 1);
      else assigned_works.push({ branch_id: branchId, work_type: workType });
      return { ...prev, assigned_works };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErrors({});
    try {
      const payload = {
        user: { ...formData, role: formData.role },
        employee_details: { salary: formData.salary ? Number(formData.salary) : null, bio: formData.description || "", address: formData.address_data },
        assigned_branches: formData.branch_ids.map(id => ({ id })),
        assigned_works: formData.assigned_works,
      };
      await employeeService.create(payload);
      toast.success("Staff profile established");
      navigate(-1);
    } catch (err) {
      const data = err.response?.data;
      if (data) setErrors(data);
      toast.error(data?.detail || "Validation failed");
    } finally { setLoading(false); }
  };

  const allVisibleBranches = Array.from(new Map([...selectedBranchesData.map(b => [b.id, b]), ...branches.map(b => [b.id, b])]).values());

  const PERMISSION_ICONS = {
    PRODUCT: FaBoxOpen, INVENTORY: FaWarehouse, ANALYTICS: FaChartPie, INVOICE: FaFileInvoice, SUPPLIER: FaTruck
  };

  return (
    <div className="min-h-screen pb-12 bg-slate-50/30">
      <OwnerHeader />
      <main className="max-w-3xl mx-auto px-4 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <BackButton label="Back" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">Staff Management</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <header className="px-5 py-4 bg-white border-b border-slate-100 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-md">
              <FaUserPlus size={14} />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 tracking-tight leading-tight">Create Staff Account</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Enterprise Access Control</p>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="p-5 space-y-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3 border-b border-slate-50 pb-2">
                <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <FaMapMarkerAlt className="text-slate-400" size={11} /> Branch Access
                </h3>
                <div className="relative">
                  <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" size={9} />
                  <input
                    type="text" placeholder="Filter..." value={branchSearch}
                    onChange={(e) => setBranchSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), fetchBranches(branchSearch))}
                    className="pl-7 pr-3 py-1 text-[10px] rounded-lg border border-slate-100 focus:border-slate-800 outline-none transition-all font-bold bg-slate-50 w-32"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 rounded-xl bg-slate-50/50 border border-slate-100">
                {fetchingBranches ? (
                  <div className="col-span-full py-4 flex justify-center"><FaSpinner className="animate-spin text-slate-300" /></div>
                ) : allVisibleBranches.map(branch => {
                  const isSelected = formData.branch_ids.includes(branch.id);
                  return (
                    <button
                      key={branch.id} type="button" onClick={() => toggleBranch(branch)}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-left ${isSelected ? "bg-white border-slate-800 shadow-sm" : "bg-white border-slate-50 hover:border-slate-200"}`}
                    >
                      <div className={`h-3 w-3 rounded border flex items-center justify-center ${isSelected ? "bg-slate-800 border-slate-800 text-white" : "bg-slate-100 border-slate-200"}`}>
                        {isSelected && <svg className="w-2 h-2 fill-current" viewBox="0 0 20 20"><path d="M0 11l2-2 5 5L18 3l2 2L7 18z"/></svg>}
                      </div>
                      <span className="text-[10px] font-bold text-slate-900 truncate">{branch.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InputField label="First Name" name="first_name" required value={formData.first_name} onChange={handleChange} icon={FaUser} error={errors.user?.first_name} />
              <InputField label="Last Name" name="last_name" required value={formData.last_name} onChange={handleChange} icon={FaUser} error={errors.user?.last_name} />
              <InputField label="ID / Username" name="username" required value={formData.username} onChange={handleChange} icon={FaIdCard} error={errors.user?.username} />
              <InputField label="Email" name="email" type="email" required value={formData.email} onChange={handleChange} icon={FaEnvelope} error={errors.user?.email} />
              <InputField label="Mobile" name="mobile_number" required value={formData.mobile_number} onChange={handleChange} icon={FaPhone} error={errors.user?.mobile_number} />
              <InputField label="Salary (₹)" name="salary" type="number" required value={formData.salary} onChange={handleChange} icon={FaMoneyBillWave} error={errors.employee_details?.salary} />
              
              <div className="relative group col-span-2 sm:col-span-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Login Password</label>
                <div className="relative">
                  <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-800 transition" size={11} />
                  <input
                    type={showPassword ? "text" : "password"} name="password" required value={formData.password} onChange={handleChange}
                    className={`${inputClass(Boolean(errors.user?.password))} pl-9 pr-9 font-bold`} placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-800">
                    {showPassword ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                  </button>
                </div>
              </div>
            </div>

            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 pb-2">
                <FaShieldAlt className="text-slate-400" size={11} /> Operation Permissions
              </h3>
              
              {formData.branch_ids.length === 0 ? (
                <div className="py-6 border border-dashed border-slate-100 rounded-xl bg-slate-50/50 text-center text-[9px] font-bold text-slate-300 uppercase tracking-widest">Assign branches to configure access</div>
              ) : (
                <div className="space-y-2">
                  {formData.branch_ids.map(bid => {
                    const branch = allVisibleBranches.find(b => b.id === bid);
                    return (
                      <div key={bid} className="rounded-xl border border-slate-100 bg-white overflow-hidden">
                        <div className="px-3 py-1.5 bg-slate-50/50 border-b border-slate-50 text-[9px] font-black text-slate-500 uppercase tracking-widest">{branch?.name || bid}</div>
                        <div className="p-2 flex flex-wrap gap-1.5">
                          {Object.keys(PERMISSION_ICONS).map(workType => {
                            const Icon = PERMISSION_ICONS[workType];
                            const isChecked = formData.assigned_works.some(w => w.branch_id === bid && w.work_type === workType);
                            return (
                              <button
                                key={workType} type="button" onClick={() => handleWorkChange(bid, workType)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${isChecked ? "bg-slate-800 border-slate-800 text-white shadow-sm" : "bg-slate-50 border-transparent text-slate-400 hover:border-slate-200"}`}
                              >
                                <Icon size={10} />
                                <span className="text-[8px] font-bold uppercase tracking-widest">{workType}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-50">
              <button type="button" onClick={() => navigate(-1)} className="px-5 py-2 text-slate-400 font-bold uppercase tracking-widest text-[9px] hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all">Cancel</button>
              <button type="submit" disabled={loading} className="px-8 py-2.5 rounded-xl bg-slate-800 text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200 hover:bg-slate-700 transition-all disabled:opacity-50 active:scale-95">
                {loading ? "Processing..." : "Establish Profile"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
