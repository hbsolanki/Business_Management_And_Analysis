import { useState, useEffect } from "react";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import api from "@/services/api";
import { 
  FaPlus, FaSearch, FaFilter, FaCalendarAlt, FaTrash, 
  FaTag, FaFileInvoice, FaPen, FaTimes, FaCodeBranch, FaRupeeSign, FaSpinner, FaBell
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import BackButton from "@/components/shared/BackButton";
import { lazy, Suspense } from "react";
const EntityReminderModal = lazy(() => import("@/features/reminder/components/EntityReminderModal"));

export default function ExpenseList() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [expenseToRemind, setExpenseToRemind] = useState(null);
  
  // Advanced Filter state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  
  // Filter variables (applied)
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  // Temporary filter variables (inputs)
  const [tempSearchTerm, setTempSearchTerm] = useState("");
  const [tempSelectedBranch, setTempSelectedBranch] = useState("");
  const [tempSelectedCategory, setTempSelectedCategory] = useState("");
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");
  const [tempMinAmount, setTempMinAmount] = useState("");
  const [tempMaxAmount, setTempMaxAmount] = useState("");

  // Pagination cursor state
  const [nextCursorUrl, setNextCursorUrl] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch metadata on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [catRes, branchRes] = await Promise.all([
          api.get("/cost/category/"),
          api.get("/business/branch/")
        ]);
        setCategories(catRes.data?.results || catRes.data || []);
        setBranches(branchRes.data?.results || branchRes.data || []);
      } catch (err) {
        console.error("Failed to load filter metadata", err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch expenses when applied filters change
  useEffect(() => {
    fetchExpenses();
  }, [searchTerm, selectedBranch, selectedCategory, startDate, endDate, minAmount, maxAmount]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      let query = `/cost/expenses/?search=${encodeURIComponent(searchTerm)}`;
      if (selectedBranch) query += `&branch=${selectedBranch}`;
      if (selectedCategory) query += `&category=${selectedCategory}`;
      if (startDate) query += `&start_date=${startDate}`;
      if (endDate) query += `&end_date=${endDate}`;
      if (minAmount) query += `&min_amount=${minAmount}`;
      if (maxAmount) query += `&max_amount=${maxAmount}`;

      const res = await api.get(query);
      setExpenses(res.data?.results || res.data || []);
      setNextCursorUrl(res.data?.next || null);
    } catch (err) {
      setError("Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    setSearchTerm(tempSearchTerm);
    setSelectedBranch(tempSelectedBranch);
    setSelectedCategory(tempSelectedCategory);
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setMinAmount(tempMinAmount);
    setMaxAmount(tempMaxAmount);
  };

  const handleLoadMore = async () => {
    if (!nextCursorUrl || loadingMore) return;
    setLoadingMore(true);
    try {
      // Get the relative URL path for the next page
      const relativeUrl = nextCursorUrl.replace(/^https?:\/\/[^\/]+(\/api)?/, "");
      const res = await api.get(relativeUrl);
      setExpenses(prev => [...prev, ...(res.data?.results || res.data || [])]);
      setNextCursorUrl(res.data?.next || null);
    } catch (err) {
      toast.error("Failed to load more records");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await api.delete(`/cost/expenses/${id}/`);
      toast.success("Expense record deleted");
      fetchExpenses();
    } catch (err) {
      toast.error("Failed to delete record");
    }
  };

  const resetFilters = () => {
    setTempSearchTerm("");
    setTempSelectedBranch("");
    setTempSelectedCategory("");
    setTempStartDate("");
    setTempEndDate("");
    setTempMinAmount("");
    setTempMaxAmount("");

    setSelectedBranch("");
    setSelectedCategory("");
    setStartDate("");
    setEndDate("");
    setMinAmount("");
    setMaxAmount("");
    setSearchTerm("");
  };

  const hasActiveFilters = selectedBranch || selectedCategory || startDate || endDate || minAmount || maxAmount || searchTerm;
  const hasTempFilters = tempSelectedBranch || tempSelectedCategory || tempStartDate || tempEndDate || tempMinAmount || tempMaxAmount || tempSearchTerm;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <ProtectedHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <BackButton />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <span className="p-2 bg-slate-900 rounded-lg text-white shadow-sm">
                <FaFileInvoice className="text-xl" />
              </span>
              Shop Expenses Registry
            </h1>
            <p className="text-slate-500 font-medium text-sm">Detailed ledger of non-product business expenditures and input credits.</p>
          </div>
          <Link 
            to="/cost/expenses/add"
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg"
          >
            <FaPlus />
            New Purchase
          </Link>
        </div>

        {/* Filters & Search Control Panel */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search nomenclature or description..."
                value={tempSearchTerm}
                onChange={(e) => setTempSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-slate-50 border-none rounded-xl py-3 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border transition-all ${
                  showAdvancedFilters 
                    ? "bg-slate-900 text-white border-slate-900" 
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <FaFilter size={12} />
                Advanced Filters
                {hasActiveFilters && (
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>
                )}
              </button>

              {(hasActiveFilters || hasTempFilters) && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 border border-transparent transition-all"
                >
                  <FaTimes size={10} />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Branch Filter */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Branch</label>
                  <div className="relative">
                    <select
                      value={tempSelectedBranch}
                      onChange={(e) => setTempSelectedBranch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/5 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">All Branches</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Category Filter */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cost Category</label>
                  <div className="relative">
                    <select
                      value={tempSelectedCategory}
                      onChange={(e) => setTempSelectedCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/5 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">All Categories</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.display_name || c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date Filters */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date Horizon</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={tempStartDate}
                      onChange={(e) => setTempStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                    />
                    <input
                      type="date"
                      value={tempEndDate}
                      onChange={(e) => setTempEndDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                    />
                  </div>
                </div>

                {/* Price Filters */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Base Price Range</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min (₹)"
                      value={tempMinAmount}
                      onChange={(e) => setTempMinAmount(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                    />
                    <input
                      type="number"
                      placeholder="Max (₹)"
                      value={tempMaxAmount}
                      onChange={(e) => setTempMaxAmount(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                    />
                  </div>
                </div>

              </div>

              {/* Advanced Actions Row */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={resetFilters}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all"
                >
                  Reset Filters
                </button>
                <button
                  onClick={applyFilters}
                  className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-md"
                >
                  Apply Filters
                </button>
              </div>

            </div>
          )}
        </div>

        {loading && expenses.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Gathering Ledger Transactions...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl text-center text-rose-600 font-bold">
            {error}
          </div>
        ) : expenses.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 p-12 rounded-3xl text-center">
            <h3 className="text-lg font-bold text-slate-900">No transactions recorded</h3>
            <p className="text-slate-500 mt-2">Adjust your parameters or record a new purchase.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Purchase Nomenclature</th>
                    <th className="px-6 py-4">Classification</th>
                    <th className="px-6 py-4">Gst Compliance</th>
                    <th className="px-6 py-4 text-right">Invoice Summation</th>
                    <th className="px-6 py-4 text-center">Operation Panel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <p className="font-black text-slate-900">{e.title}</p>
                          <div className="flex items-center gap-2.5 text-xs font-bold text-slate-400">
                            <span className="flex items-center gap-1">
                              <FaCalendarAlt size={10} />
                              {new Date(e.date).toLocaleDateString()}
                            </span>
                            {e.branch && (
                              <span className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                <FaCodeBranch size={8} />
                                {e.branch.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-slate-700">{e.category?.name || "Uncategorized"}</p>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{e.itc_type?.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-700">₹{e.gst_amount}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Rate: {e.gst_rate}%</p>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <p className="text-lg font-black text-slate-900">₹{e.total_amount}</p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setExpenseToRemind(e);
                              setShowReminderModal(true);
                            }}
                            className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                            title="Set Reminder"
                          >
                            <FaBell size={12} />
                          </button>
                          
                          <Link 
                            to={`/cost/expenses/${e.id}/edit`}
                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                            title="Edit Expense Record"
                          >
                            <FaPen size={12} />
                          </Link>

                          <button 
                            onClick={() => handleDelete(e.id)}
                            className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Delete Expense Record"
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Cards View */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
              {expenses.map((e) => (
                <div key={e.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="font-black text-slate-900 text-base">{e.title}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
                          <span className="flex items-center gap-1">
                            <FaCalendarAlt size={10} />
                            {new Date(e.date).toLocaleDateString()}
                          </span>
                          {e.branch && (
                            <span className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              <FaCodeBranch size={8} />
                              {e.branch.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xl font-black text-slate-900">₹{e.total_amount}</p>
                    </div>

                    <div className="h-px bg-slate-100"></div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">Classification</p>
                        <p className="text-slate-800">{e.category?.name || "Uncategorized"}</p>
                        <span className="inline-block mt-1 text-[9px] font-bold text-slate-500 uppercase bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">{e.itc_type?.replace('_', ' ')}</span>
                      </div>
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">Gst Compliance</p>
                        <p className="text-slate-800">₹{e.gst_amount}</p>
                        <p className="text-slate-400 text-[9px] mt-0.5">Rate: {e.gst_rate}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                    <button 
                      onClick={() => {
                        setExpenseToRemind(e);
                        setShowReminderModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg border border-transparent transition-all"
                    >
                      <FaBell size={10} />
                      Reminder
                    </button>
                    <Link 
                      to={`/cost/expenses/${e.id}/edit`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all"
                    >
                      <FaPen size={10} />
                      Edit
                    </Link>
                    <button 
                      onClick={() => handleDelete(e.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-transparent transition-all"
                    >
                      <FaTrash size={10} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>


            {/* Premium "Load More" Pagination */}
            {nextCursorUrl && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center justify-center gap-3 bg-slate-900 text-white font-bold text-sm px-8 py-3.5 rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <FaSpinner className="animate-spin text-sm" />
                      Loading Next Page...
                    </>
                  ) : (
                    "Load More Transactions"
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {showReminderModal && expenseToRemind && (
        <Suspense fallback={null}>
          <EntityReminderModal
            isOpen={showReminderModal}
            onClose={() => { setShowReminderModal(false); setExpenseToRemind(null); }}
            entityType="cost.expense"
            entityId={expenseToRemind.id}
            entityTitle={`Expense: ${expenseToRemind.title}`}
          />
        </Suspense>
      )}
    </div>
  );
}
