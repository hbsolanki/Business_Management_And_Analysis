import { useState, useMemo, useEffect } from "react";
import { FiSearch, FiHash } from "react-icons/fi";
import { FaFilter } from "react-icons/fa";
import { useSelector } from "react-redux";
import { FaCodeBranch } from "react-icons/fa";
import { branchService } from "@/features/business/services/branchService";
import { getAssignedBranchesForWork, filterBranchesForRole } from "@/utils/branchFilter";

export default function ProductFilters({ categories = [], onApply }) {
  const { profile } = useSelector((state) => state.user);
  const userRole = String(typeof profile?.role === "object" ? profile?.role?.role : profile?.role || "").toUpperCase();
  const isRestrictedRole = userRole === "MANAGER" || userRole === "EMPLOYEE";
  
  const assignedBranches = useMemo(
    () => getAssignedBranchesForWork(profile, 'PRODUCT'),
    [profile]
  );

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [branches, setBranches] = useState([]);
  const [fetchingBranches, setFetchingBranches] = useState(false);

  useEffect(() => {
    async function fetchBranches() {
      setFetchingBranches(true);
      try {
        const res = await branchService.list();
        const branchData = Array.isArray(res.data) ? res.data : (res.data?.results || []);

        if (isRestrictedRole) {
          const visibleBranches = filterBranchesForRole(branchData, assignedBranches);
          const resolvedBranches = visibleBranches.length > 0 ? visibleBranches : assignedBranches;
          setBranches(resolvedBranches);
          if (resolvedBranches.length > 0) setSelectedBranch(String(resolvedBranches[0].id));
        } else {
          setBranches(branchData);
        }
      } catch (err) {
        console.error("Failed to fetch branches", err);
      } finally {
        setFetchingBranches(false);
      }
    }
    fetchBranches();
  }, [isRestrictedRole, assignedBranches]);

  const handleApply = () => {
    onApply({
      name: name.trim(),
      sku: sku.trim(),
      product_category: category,
      branch: selectedBranch, // Note: Backend might not filter by this yet
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
          <FaFilter className="text-sm" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
          <p className="text-sm text-slate-500">Search by name, SKU, or category.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Product name
          </label>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search by name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-sm transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            SKU
          </label>
          <div className="relative">
            <FiHash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search by SKU"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-sm transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-sm transition-all cursor-pointer appearance-none"
          >
            <option value="">All categories</option>
            {Array.isArray(categories) && categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Branch
          </label>
          <div className="relative">
            <FaCodeBranch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-sm transition-all cursor-pointer appearance-none disabled:bg-slate-50 disabled:text-slate-500"
              disabled={fetchingBranches || (isRestrictedRole && branches.length <= 1)}
            >
              {!isRestrictedRole && <option value="">All Branches</option>}
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} {b.is_default ? "(Main)" : ""}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleApply}
          className="px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition shadow-lg shadow-slate-200"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
