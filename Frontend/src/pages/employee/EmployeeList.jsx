import { lazy, Suspense, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { UserPlusIcon } from "@heroicons/react/24/outline";
import { FaIdCard, FaUsers, FaCodeBranch, FaSearch, FaUserTag, FaMoneyBillWave, FaBriefcase, FaFilter, FaTimes } from "react-icons/fa";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

import { employeeService } from "@/features/employee/services/employeeService";
import { branchService } from "@/features/business/services/branchService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "react-hot-toast";

const Modal = lazy(() => import("@/components/ui/Modal"));
const UserList = lazy(() => import("@/components/ui/UserList"));

function EmployeeManage() {
  const { profile } = useSelector((state) => state.user);
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchingBranches, setFetchingBranches] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    salary_min: "",
    salary_max: "",
    work_assignment: "",
  });

  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    salary_min: "",
    salary_max: "",
    work_assignment: "",
  });

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchBranches() {
      setFetchingBranches(true);
      try {
        const res = await branchService.list();
        let branchList = [];
        if (Array.isArray(res.data)) {
          branchList = res.data;
        } else if (res.data && Array.isArray(res.data.results)) {
          branchList = res.data.results;
        }

        if (branchList.length > 0) {
          setBranches(branchList);
          const mainBranch = branchList.find(b => b.is_default);
          const roleStr = typeof profile?.role === 'object' ? profile.role.role : profile?.role;
          const isManager = roleStr === "MANAGER";
          if (mainBranch && !isManager) {
            setSelectedBranch(String(mainBranch.id));
          } else if (!mainBranch && !isManager) {
            setSelectedBranch(String(branchList[0].id));
          }
        }
      } catch (err) {
        console.error("Failed to fetch branches", err);
      } finally {
        setFetchingBranches(false);
      }
    }
    fetchBranches();
  }, []);

  useEffect(() => {
    const roleStr = typeof profile?.role === 'object' ? profile.role.role : profile?.role;
    const isManager = roleStr === "MANAGER";
    if (isManager && (profile?.assigned_branches?.length > 0 || profile?.branch)) {
      const branchData = (profile?.assigned_branches?.length > 0) 
        ? profile.assigned_branches 
        : profile.branch;
      const firstBranch = Array.isArray(branchData) ? branchData[0] : branchData;
      const branchId = typeof firstBranch === 'object' ? firstBranch?.id : firstBranch;
      setSelectedBranch(String(branchId || ""));
    }
    else if (isManager && !(profile?.assigned_branches?.length > 0 || profile?.branch) && branches.length > 0) {
      // If manager has no assigned branch, but branches are loaded, select the first one
      setSelectedBranch(String(branches[0].id));
    }
  }, [profile, branches]); // Added branches to dependency array

  useEffect(() => {
    async function fetchEmployees() {
      setLoading(true);
      try {
        const params = {
          branch_id: selectedBranch || undefined,
          search: appliedFilters.search,
          salary_min: appliedFilters.salary_min,
          salary_max: appliedFilters.salary_max,
          work_assignment: appliedFilters.work_assignment,
        };

        const res = await employeeService.getAll(params);
        if (Array.isArray(res.data)) {
          setEmployees(res.data);
        } else if (res.data && Array.isArray(res.data.results)) {
          setEmployees(res.data.results);
        }
      } catch (err) {
        console.error("Failed to fetch employees", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEmployees();
  }, [selectedBranch, appliedFilters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const clearFilters = () => {
    const reset = {
      search: "",
      salary_min: "",
      salary_max: "",
      work_assignment: "",
    };
    setFilters(reset);
    setAppliedFilters(reset);
  };

  const activeFilterCount = Object.values(appliedFilters).filter(v => v !== "").length;

  const handleDelete = async () => {
    try {
      await employeeService.delete(deleteId);
      setEmployees((prev) => prev.filter((e) => e.id !== deleteId));
      setDeleteId(null);
      toast.success("Employee deleted successfully");
    } catch {
      toast.error("Failed to delete employee");
    }
  };

  const toggleEmployeeStatus = async (user) => {
    try {
      const newStatus = user.is_active === false ? true : false;
      const res = await employeeService.update(user.id, { is_active: newStatus });
      toast.success(`Employee marked as ${newStatus ? 'Active' : 'Inactive'}`);
      setEmployees((prev) =>
        prev.map((e) => e.id === user.id ? { ...e, is_active: newStatus, ...res.data } : e)
      );
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.detail
        || err.response?.data?.message
        || "Failed to update employee status";
      toast.error(errorMessage);
    }
  };

  const handleView = (id) => {
    navigate(`/user/${id}`);
  };

  const handleEdit = (id) => {
    navigate(`/employee/${id}/edit`);
  };

  const handleChat = (id) => {
    navigate(`/chat?userId=${id}`);
  };

  return (
    <>
      <ProtectedHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <FaUsers className="text-xl" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Employees</h1>
              <p className="text-slate-500 mt-1">
                Manage team members, contact details, and profiles.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all shadow-sm ${showFilters || activeFilterCount > 0 ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <FaFilter className={activeFilterCount > 0 ? "animate-pulse" : ""} />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 bg-white text-slate-900 text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <Link
              to="/employee/new"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-slate-200"
            >
              <UserPlusIcon className="h-5 w-5" />
              Add Employee
            </Link>
          </div>
        </div>

        {/* Improved Filter Bar */}
        {(showFilters || activeFilterCount > 0) && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                  <FaFilter size={14} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Advanced Filters</h3>
              </div>
              <button
                onClick={clearFilters}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-all"
              >
                <FaTimes size={10} />
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
              {/* Branch Filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Branch</label>
                <div className="relative">
                  <FaCodeBranch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-900 transition-all appearance-none cursor-pointer disabled:opacity-60"
                    disabled={fetchingBranches || (typeof profile?.role === 'object' ? profile.role.role : profile?.role) === "MANAGER"}
                  >
                    <option value="">All Branches</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} {b.is_default ? "(Main)" : ""}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search Filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Search</label>
                <div className="relative">
                  <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                  <input
                    type="text"
                    name="search"
                    placeholder="ID, Name, Mobile..."
                    value={filters.search}
                    onChange={handleFilterChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-900 transition-all"
                  />
                </div>
              </div>

              {/* Work Assignment Filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Work</label>
                <div className="relative">
                  <FaBriefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                  <select
                    name="work_assignment"
                    value={filters.work_assignment}
                    onChange={handleFilterChange}
                    className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-900 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">All Assignments</option>
                    <option value="PRODUCT">Product</option>
                    <option value="INVENTORY">Inventory</option>
                    <option value="ANALYTICS">Analytics</option>
                    <option value="INVOICE">Invoice</option>
                    <option value="SUPPLIER">Supplier</option>
                  </select>
                </div>
              </div>

              {/* Salary Min */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Min Salary</label>
                <div className="relative">
                  <FaMoneyBillWave className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                  <input
                    type="number"
                    name="salary_min"
                    placeholder="No min"
                    value={filters.salary_min}
                    onChange={handleFilterChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-900 transition-all"
                  />
                </div>
              </div>

              {/* Salary Max */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Max Salary</label>
                <div className="relative">
                  <FaMoneyBillWave className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                  <input
                    type="number"
                    name="salary_max"
                    placeholder="No max"
                    value={filters.salary_max}
                    onChange={handleFilterChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-900 transition-all"
                  />
                </div>
              </div>

              {/* Apply Button */}
              <div className="flex items-end">
                <button
                  onClick={handleApplyFilters}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-slate-100 flex items-center justify-center gap-2"
                >
                  <FaSearch size={12} />
                  Apply Filter
                </button>
              </div>
            </div>
          </div>
        )}

        <Suspense
          fallback={
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900"></div>
            </div>
          }
        >
          <UserList
            users={employees}
            type="EMPLOYEE"
            onView={handleView}
            onEdit={handleEdit}
            onChat={handleChat}
            onToggleStatus={toggleEmployeeStatus}
            onDelete={(id) => setDeleteId(id)}
            emptyText="No employees found. Start by adding a new team member."
          />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <Modal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          title="Delete Employee"
          message="Are you sure you want to delete this employee?"
          onConfirm={handleDelete}
          confirmText="Delete"
          cancelText="Cancel"
          icon={FaIdCard}
          type="danger"
        />
      </Suspense>
    </>
  );
}

export default EmployeeManage;
