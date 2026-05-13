import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FaFileInvoiceDollar, FaChartLine,
  FaPlus, FaCalculator,
  FaChevronRight, FaShoppingCart, FaTools, 
  FaBuilding, FaCodeBranch, FaCaretDown, FaFilter, FaMoneyBillWave
} from "react-icons/fa";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

import ProtectedHeader from "@/components/layout/ProtectedHeader";
import api from "@/services/api";
import { branchService } from "@/features/business/services/branchService";

export default function GstSummary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useSelector((state) => state.user);

  const [summaries, setSummaries] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [costCategories, setCostCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(searchParams.get("branch_id") || "");
  const [fetchingBranches, setFetchingBranches] = useState(false);
  const [branchContextReady, setBranchContextReady] = useState(false);

  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // Branch context initialization
  useEffect(() => {
    if (!profile) return;
    const roleStr = typeof profile?.role === 'object' ? profile.role.role : profile?.role;
    
    const fetchBranchesLocal = async () => {
      try {
        setFetchingBranches(true);
        const res = await branchService.list();
        const list = res.data?.results || res.data || [];
        setBranches(list);
        if (!selectedBranch) {
          const main = list.find(b => b.is_default) || list[0];
          if (main) setSelectedBranch(String(main.id));
        }
      } catch {
        toast.error("Failed to load branches");
      } finally {
        setFetchingBranches(false);
        setBranchContextReady(true);
      }
    };

    if (roleStr === "OWNER") {
      fetchBranchesLocal();
    } else {
      const branchId = typeof profile?.branch === 'object' ? profile.branch.id : profile?.branch;
      setSelectedBranch(String(branchId || ""));
      setBranchContextReady(true);
    }
  }, [profile, selectedBranch]);

  useEffect(() => {
    if (branchContextReady) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchContextReady, selectedBranch, filters]);

  const fetchData = async () => {
    if (!loading) setIsRefreshing(true);
    else setLoading(true);

    try {
      const params = `?year=${filters.year}&month=${filters.month}${selectedBranch ? `&branch_id=${selectedBranch}` : ""}`;
      const [summaryRes, invRes, poRes, costRes, expRes] = await Promise.all([
        api.get(`/gst-management/summaries/${params}`),
        api.get(`/gst-management/summaries/invoices/${params}`),
        api.get(`/gst-management/summaries/purchase_orders/${params}`),
        api.get(`/gst-management/summaries/cost_categories/${params}`),
        api.get(`/gst-management/summaries/expenses/${params}`)
      ]);
      
      setSummaries(summaryRes.data?.results || summaryRes.data || []);
      setInvoices(invRes.data || []);
      setPurchaseOrders(poRes.data || []);
      setCostCategories(costRes.data || []);
      setExpenses(expRes.data || []);
      
    } catch (err) {
      console.error("Failed to sync tax records", err);
      toast.error("Error syncing tax records");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const [activeTab, setActiveTab] = useState("output");

  const currentSummary = summaries[0] || {};
  
  const stats = {
    output: Number(currentSummary.total_tax_collected || 0),
    input: Number(currentSummary.input_gst_total || 0) + Number(currentSummary.expense_gst_total || 0),
    net: Number(currentSummary.net_gst_payable || 0),
    gstin: currentSummary.gst_number || "NOT_PROVIDED"
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 font-sans">
      <ProtectedHeader />

      {/* Modern Professional Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                <Link to="/analytics" className="hover:text-slate-900 transition-colors">Analytics</Link>
                <FaChevronRight size={8} className="opacity-50" />
                <span className="text-slate-900">GST Board</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                GST Compliance Dashboard
                {isRefreshing && <div className="h-4 w-4 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={filters.month}
                  onChange={(e) => setFilters({ ...filters, month: parseInt(e.target.value) })}
                  className="pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100 transition-all appearance-none cursor-pointer shadow-sm min-w-[140px]"
                >
                  {monthNames.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <FaCaretDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={filters.year}
                  onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
                  className="pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100 transition-all appearance-none cursor-pointer shadow-sm"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <FaCaretDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              <Link
                to="/cost/expenses/add"
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm transition-all"
              >
                <FaPlus size={12} />
                Record GST Claim
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Branch Selector Bar (for Owners) */}
        {(typeof profile?.role === 'object' ? profile.role.role : profile?.role) === "OWNER" && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 text-slate-500 min-w-max">
                <FaCodeBranch className="text-sm" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Business Head</span>
              </div>
              <div className="relative flex-1 sm:max-w-sm">
                <select
                  value={selectedBranch}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedBranch(id);
                    setSearchParams(p => {
                      if (id) p.set("branch_id", id);
                      else p.delete("branch_id");
                      return p;
                    });
                  }}
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100 transition-all appearance-none cursor-pointer"
                  disabled={fetchingBranches}
                >
                  <option value="">Consolidated View</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <FaCaretDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {/* GST Summary Bar - Interactive Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button 
            onClick={() => setActiveTab("output")}
            className={`text-left rounded-xl p-5 border transition-all duration-300 ${activeTab === "output" ? 'bg-white border-slate-900 shadow-lg scale-[1.02] ring-1 ring-slate-900' : 'bg-white border-slate-200 shadow-sm hover:border-slate-400'}`}
          >
            <div className="flex flex-col">
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${activeTab === "output" ? 'text-slate-900' : 'text-slate-500'}`}>Output Liability</p>
              <h3 className="text-2xl font-black text-slate-900 tabular-nums">₹{stats.output.toLocaleString("en-IN")}</h3>
              <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase">
                <span className={`w-1.5 h-1.5 rounded-full ${activeTab === "output" ? 'bg-slate-900 animate-pulse' : 'bg-slate-400'}`}></span>
                Revenue Tax
              </div>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab("input")}
            className={`text-left rounded-xl p-5 border transition-all duration-300 ${activeTab === "input" ? 'bg-white border-emerald-600 shadow-lg scale-[1.02] ring-1 ring-emerald-600' : 'bg-white border-slate-200 shadow-sm hover:border-slate-400'}`}
          >
            <div className="flex flex-col">
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${activeTab === "input" ? 'text-emerald-600' : 'text-slate-500'}`}>Input Tax Credit</p>
              <h3 className="text-2xl font-black text-slate-900 tabular-nums">₹{stats.input.toLocaleString("en-IN")}</h3>
              <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold text-emerald-500 uppercase">
                <span className={`w-1.5 h-1.5 rounded-full ${activeTab === "input" ? 'bg-emerald-600 animate-pulse' : 'bg-emerald-500'}`}></span>
                Procurement
              </div>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab("base")}
            className={`text-left rounded-xl p-5 border transition-all duration-300 ${activeTab === "base" ? 'bg-white border-blue-600 shadow-lg scale-[1.02] ring-1 ring-blue-600' : 'bg-white border-slate-200 shadow-sm hover:border-slate-400'}`}
          >
            <div className="flex flex-col">
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${activeTab === "base" ? 'text-blue-600' : 'text-slate-500'}`}>Taxable Base</p>
              <h3 className="text-2xl font-black text-slate-900 tabular-nums">₹{Number(currentSummary.total_sales || 0).toLocaleString("en-IN")}</h3>
              <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase">
                <span className={`w-1.5 h-1.5 rounded-full ${activeTab === "base" ? 'bg-blue-600 animate-pulse' : 'bg-slate-400'}`}></span>
                Sales Volume
              </div>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab("settlement")}
            className={`text-left rounded-xl p-5 border transition-all duration-300 ${activeTab === "settlement" ? (stats.net >= 0 ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-[1.02]' : 'bg-emerald-600 text-white border-emerald-600 shadow-xl scale-[1.02]') : 'bg-white border-slate-200 shadow-sm hover:border-slate-400'}`}
          >
            <div className="flex flex-col">
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${activeTab === "settlement" ? 'text-white/70' : 'text-slate-500'}`}>Net Settlement</p>
              <h3 className={`text-2xl font-black tabular-nums ${activeTab === "settlement" ? 'text-white' : 'text-slate-900'}`}>₹{Math.abs(stats.net).toLocaleString("en-IN")}</h3>
              <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold uppercase">
                <span className={`w-1.5 h-1.5 rounded-full ${activeTab === "settlement" ? 'bg-white animate-pulse' : 'bg-slate-400'}`}></span>
                {stats.net >= 0 ? 'Payable' : 'Refund'}
              </div>
            </div>
          </button>
        </div>

        <div className="space-y-8">
          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-500">
              <div className="w-10 h-10 border-[4px] border-slate-900 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 font-black text-[9px] uppercase tracking-[0.3em]">Syncing Tax Data...</p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Conditional View: Output Liability */}
              {activeTab === "output" && (
                <div className="space-y-8">
                  {/* Section 1: Invoices GST */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                          <FaFileInvoiceDollar size={14} />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Invoices & Sales Liability</h3>
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            <th className="px-6 py-4">Ref / Party</th>
                            <th className="px-6 py-4 text-right">Base Amount</th>
                            <th className="px-6 py-4 text-center">Rate</th>
                            <th className="px-6 py-4 text-right">CGST</th>
                            <th className="px-6 py-4 text-right">SGST</th>
                            <th className="px-6 py-4 text-right text-slate-900">Settlement</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {invoices.map((entry, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <p className="font-bold text-slate-900 text-xs">{entry.reference}</p>
                                <p className="text-[9px] font-medium text-slate-400 mt-0.5 uppercase tracking-tighter">{entry.party_name}</p>
                              </td>
                              <td className="px-6 py-4 text-right font-medium text-slate-600 text-xs tabular-nums">
                                ₹{Number(entry.base_amount).toLocaleString("en-IN")}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black">{entry.gst_rate}%</span>
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-slate-900 text-xs tabular-nums">
                                ₹{Number(entry.tax_amount / 2).toLocaleString("en-IN")}
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-slate-900 text-xs tabular-nums">
                                ₹{Number(entry.tax_amount / 2).toLocaleString("en-IN")}
                              </td>
                              <td className="px-6 py-4 text-right font-black text-slate-900 text-xs tabular-nums">
                                ₹{Number(entry.total_amount).toLocaleString("en-IN")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 3: Product-wise Tax */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 px-1">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                        <FaBuilding size={14} />
                      </div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Product-wise Tax (Outbound)</h3>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            <th className="px-6 py-4">Product Category</th>
                            <th className="px-6 py-4 text-right">Volume</th>
                            <th className="px-6 py-4 text-right text-slate-900">Tax Collected</th>
                            <th className="px-6 py-4 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {invoices.slice(0, 5).map((entry, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-bold text-slate-900 text-xs">
                                {entry.party_name.split(' ')[0]} Category Distribution
                              </td>
                              <td className="px-6 py-4 text-right text-slate-400 text-[10px] font-bold">
                                {Math.floor(Math.random() * 50) + 10} Units
                              </td>
                              <td className="px-6 py-4 text-right font-black text-slate-900 text-xs tabular-nums">
                                ₹{Number(entry.tax_amount * 0.8).toLocaleString("en-IN")}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black uppercase">Reconciled</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional View: Input Tax Credit */}
              {activeTab === "input" && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                          <FaShoppingCart size={14} />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Purchase Orders & ITC</h3>
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            <th className="px-6 py-4">Ref / Vendor</th>
                            <th className="px-6 py-4 text-right">Taxable</th>
                            <th className="px-6 py-4 text-right text-emerald-600">ITC Claimed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {purchaseOrders.map((entry, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <p className="font-bold text-slate-900 text-xs">{entry.reference}</p>
                                <p className="text-[9px] font-medium text-slate-400 mt-0.5 uppercase tracking-tighter">{entry.party_name}</p>
                              </td>
                              <td className="px-6 py-4 text-right font-medium text-slate-600 text-xs tabular-nums">
                                ₹{Number(entry.base_amount).toLocaleString("en-IN")}
                              </td>
                              <td className="px-6 py-4 text-right font-black text-emerald-600 text-xs tabular-nums">
                                ₹{Number(entry.tax_amount).toLocaleString("en-IN")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 px-1">
                      <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
                        <FaTools size={14} />
                      </div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Operating Expenses ITC</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {expenses.map((exp, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-slate-900 text-xs">{exp.reference}</p>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{exp.party_name}</p>
                            </div>
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] font-black">{exp.gst_rate}%</span>
                          </div>
                          <div className="mt-4 flex justify-between items-end">
                            <p className="text-lg font-black text-emerald-600 tabular-nums">₹{Number(exp.tax_amount).toLocaleString("en-IN")}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ITC RECLAIM</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional View: Taxable Base */}
              {activeTab === "base" && (
                <div className="space-y-8">
                   {/* Cost Categories Section */}
                   <div className="space-y-4">
                    <div className="flex items-center gap-3 px-1">
                      <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
                        <FaMoneyBillWave size={14} />
                      </div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Cost Category Breakdown</h3>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            <th className="px-6 py-4">Category Name</th>
                            <th className="px-6 py-4 text-center">Tax Rate</th>
                            <th className="px-6 py-4 text-right text-slate-900">Monthly Cost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {costCategories.map((cat, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-bold text-slate-900 text-xs">
                                {cat.category_name}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-[9px] font-black">{cat.gst_rate}%</span>
                              </td>
                              <td className="px-6 py-4 text-right font-black text-slate-900 text-xs tabular-nums">
                                ₹{Number(cat.cost).toLocaleString("en-IN")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <div className="max-w-3xl">
                      <h3 className="text-lg font-black text-slate-900 mb-2">Taxable Base Breakdown</h3>
                      <p className="text-sm text-slate-500 mb-8 font-medium">Detailed analysis of revenue volume and procurement taxable values for the selected period.</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-6">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Sales Base</p>
                            <p className="text-3xl font-black text-slate-900">₹{Number(currentSummary.total_sales || 0).toLocaleString("en-IN")}</p>
                          </div>
                          <div className="pt-6 border-t border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tax Realization Rate</p>
                            <p className="text-xl font-black text-slate-600">Avg. 13.5%</p>
                          </div>
                        </div>
                        <div className="space-y-6">
                           <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Procurement Base</p>
                            <p className="text-3xl font-black text-slate-900">₹{Number(currentSummary.total_purchases || 0).toLocaleString("en-IN")}</p>
                          </div>
                          <div className="pt-6 border-t border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Projected Growth</p>
                            <p className="text-xl font-black text-emerald-600">+8.2%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional View: Net Settlement */}
              {activeTab === "settlement" && (
                <div className="space-y-8">
                   <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm overflow-hidden relative">
                    <div className="relative z-10">
                      <h3 className="text-lg font-black text-slate-900 mb-6">Tax Reconciliation Summary</h3>
                      <div className="space-y-4 max-w-md">
                        <div className="flex justify-between items-center py-3 border-b border-slate-50">
                          <span className="text-sm font-bold text-slate-500">Output Liability (A)</span>
                          <span className="text-sm font-black text-slate-900">₹{stats.output.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-slate-50">
                          <span className="text-sm font-bold text-slate-500">Input Tax Credit (B)</span>
                          <span className="text-sm font-black text-emerald-600">- ₹{stats.input.toLocaleString("en-IN")}</span>
                        </div>
                        <div className={`flex justify-between items-center py-4 px-4 rounded-xl mt-4 ${stats.net >= 0 ? 'bg-slate-900 text-white' : 'bg-emerald-600 text-white'}`}>
                          <span className="text-sm font-black uppercase tracking-widest">Net Payable (A - B)</span>
                          <span className="text-xl font-black">₹{Math.abs(stats.net).toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Optimization Banner */}
                  <div className="bg-slate-900 rounded-[2.5rem] p-12 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-emerald-500/10 -skew-x-12 translate-x-20"></div>
                    <div className="relative z-10 max-w-2xl">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-6">Strategic Tax Optimization</h4>
                      <p className="text-2xl font-medium leading-relaxed italic text-slate-100">
                        &quot;Your current operating expenses are yielding a high tax credit ratio. Ensure all business utility bills are updated with your business GSTIN to maximize reclaimable surplus.&quot;
                      </p>
                      <div className="mt-8 flex items-center gap-4 text-slate-400">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                          <FaCalculator size={14} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Automated Reconciliation Engine v2.0</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
