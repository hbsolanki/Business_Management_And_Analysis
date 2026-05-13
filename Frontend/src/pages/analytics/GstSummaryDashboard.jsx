import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FaBalanceScale,
  FaCalculator,
  FaCaretDown,
  FaChevronRight,
  FaPlus,
  FaReceipt,
  FaSearch,
  FaUndo,
  FaArrowRight,
  FaLayerGroup,
  FaPlay,
  FaBuilding,
  FaChevronDown,
  FaShieldAlt,
  FaFingerprint,
} from "react-icons/fa";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

import ProtectedHeader from "@/components/layout/ProtectedHeader";
import api from "@/services/api";
import { branchService } from "@/features/business/services/branchService";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatCompactMoney = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const getRole = (profile) =>
  String(
    typeof profile?.role === "object"
      ? profile?.role?.role
      : profile?.role || "",
  ).toUpperCase();

const groupLedger = (ledger = []) => ({
  invoices: ledger.filter((entry) => entry.type === "INVOICE"),
  salesOrders: ledger.filter((entry) => entry.type === "SALES_ORDER"),
  purchaseOrders: ledger.filter((entry) => entry.type === "PURCHASE_ORDER"),
  expenses: ledger.filter((entry) => entry.type === "EXPENSE"),
});

const EMPTY_ADVANCED_FILTERS = {
  product: "",
  category: "",
  supplier: "",
  supplierMobile: "",
  fromDateTime: "",
  toDateTime: "",
};

export default function GstSummaryDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useSelector((state) => state.user);

  const [summaries, setSummaries] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(
    searchParams.get("branch_id") || "",
  );
  const [fetchingBranches, setFetchingBranches] = useState(false);
  const [branchContextReady, setBranchContextReady] = useState(false);

  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [advancedFilters, setAdvancedFilters] = useState({
    ...EMPTY_ADVANCED_FILTERS,
  });
  const [activeTab, setActiveTab] = useState("invoices");
  const [costCategories, setCostCategories] = useState([]);
  const [isGstRegistered, setIsGstRegistered] = useState(null);
  const [gstProfile, setGstProfile] = useState(null);
  const [showRegForm, setShowRegForm] = useState(false);
  const [registrationForm, setRegistrationForm] = useState({ gstin: "", registration_type: "REGULAR" });
  const [isRegistering, setIsRegistering] = useState(false);
  const [isComplianceChecking, setIsComplianceChecking] = useState(true);
  const [isAdvancedFiltersExpanded, setIsAdvancedFiltersExpanded] = useState(true);

  const years = Array.from(
    { length: 5 },
    (_, index) => new Date().getFullYear() - index,
  );
  const role = getRole(profile);
  const selectedBranchRef = useRef(selectedBranch);
  const currentSummary = useMemo(() => summaries[0] || {}, [summaries]);

  useEffect(() => {
    selectedBranchRef.current = selectedBranch;
  }, [selectedBranch]);

  const stats = useMemo(
    () => ({
      output: Number(currentSummary.total_tax_collected || 0),
      input:
        Number(currentSummary.input_gst_total || 0) +
        Number(currentSummary.expense_gst_total || 0),
      net: Number(currentSummary.net_gst_payable || 0),
      salesBase: Number(currentSummary.total_sales || 0),
      purchasesBase: Number(currentSummary.total_purchases || 0),
      expensesBase: Number(currentSummary.total_expenses || 0),
      gstin: currentSummary.gst_number || gstProfile?.gstin || "NOT_PROVIDED",
    }),
    [currentSummary, gstProfile],
  );
  const ledgerGroups = useMemo(() => groupLedger(ledger), [ledger]);

  const summaryCards = [
    {
      title: "Output GST",
      value: formatCompactMoney(stats.output),
      caption: "Revenue liability",
      tone: "slate",
    },
    {
      title: "Input GST",
      value: formatCompactMoney(stats.input),
      caption: "Reclaimable credit",
      tone: "emerald",
    },
    {
      title: "Net Position",
      value: formatCompactMoney(Math.abs(stats.net)),
      caption: stats.net >= 0 ? "Payable to department" : "Refund position",
      tone: stats.net >= 0 ? "slate" : "emerald",
    },
    {
      title: "GSTIN",
      value: stats.gstin,
      caption: "Business registration",
      tone: "blue",
    },
  ];

  const tabMeta = {
    invoices: { label: "Sales Invoices" },
    purchase_orders: { label: "Purchase Orders" },
    cost_categories: { label: "Cost Categories" },
    expenses: { label: "Operational Expenses" },
  };

  useEffect(() => {
    if (!profile) return;

    const fetchBranchesLocal = async () => {
      try {
        setFetchingBranches(true);
        const res = await branchService.list();
        const list = res.data?.results || res.data || [];
        setBranches(list);
        if (!selectedBranchRef.current) {
          const main = list.find((branch) => branch.is_default) || list[0];
          if (main) setSelectedBranch(String(main.id));
        }
      } catch {
        toast.error("Failed to load branches");
      } finally {
        setFetchingBranches(false);
        setBranchContextReady(true);
      }
    };

    if (role === "OWNER") {
      fetchBranchesLocal();
    } else {
      const branchId =
        typeof profile?.branch === "object"
          ? profile.branch.id
          : profile?.branch;
      setSelectedBranch(String(branchId || ""));
      setBranchContextReady(true);
    }
  }, [profile, role]);

  const [nextPages, setNextPages] = useState({
    invoices: null,
    purchase_orders: null,
    expenses: null,
    cost_categories: null,
  });
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!branchContextReady) return;
    
    const verifyCompliance = async () => {
      setIsComplianceChecking(true);
      try {
        const res = await api.get("/business/gst-profile/");
        const data = res.data?.results || res.data || null;
        
        // Handle both paginated results and single object/list responses
        const profile = Array.isArray(data) ? data[0] : data;
        
        if (profile && profile.gstin) {
          setGstProfile(profile);
          setIsGstRegistered(true);
        } else {
          setIsGstRegistered(false);
        }
      } catch (err) {
        console.error("Compliance check failed", err);
        setIsGstRegistered(false);
      } finally {
        setIsComplianceChecking(false);
      }
    };

    verifyCompliance();
  }, [branchContextReady, profile?.business_id]);

  useEffect(() => {
    if (branchContextReady && isGstRegistered) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchContextReady, isGstRegistered, selectedBranch, filters]);

  const fetchData = async (overrideAdvancedFilters = advancedFilters) => {
    if (!loading) setIsRefreshing(true);

    try {
      const queryParams = new URLSearchParams();

      queryParams.append("year", filters.year);
      queryParams.append("month", filters.month);

      if (selectedBranch) queryParams.append("branch_id", selectedBranch);
      
      // Override or add Advanced Date/Time Filters
      if (overrideAdvancedFilters.fromDateTime) {
        queryParams.set("start_date", overrideAdvancedFilters.fromDateTime.split('T')[0]);
      }
      if (overrideAdvancedFilters.toDateTime) {
        queryParams.set("end_date", overrideAdvancedFilters.toDateTime.split('T')[0]);
      }

      // Add Text Filters
      if (overrideAdvancedFilters.product) {
        // Map to correct backend key based on context
        const key = activeTab === "expenses" ? "title" : "product_name";
        queryParams.append(key, overrideAdvancedFilters.product);
      }
      if (overrideAdvancedFilters.category) queryParams.append("category_name", overrideAdvancedFilters.category);
      if (overrideAdvancedFilters.supplier) queryParams.append("supplier_name", overrideAdvancedFilters.supplier);
      if (overrideAdvancedFilters.supplierMobile) queryParams.append("supplier_mobile", overrideAdvancedFilters.supplierMobile);

      const params = `?${queryParams.toString()}`;

      const [summaryRes, invRes, poRes, costRes, expRes] = await Promise.all([
        api.get(`/gst-management/summaries/${params}`),
        api.get(`/gst-management/summaries/invoices/${params}`),
        api.get(`/gst-management/summaries/purchase_orders/${params}`),
        api.get(`/gst-management/summaries/cost_categories/${params}`),
        api.get(`/gst-management/summaries/expenses/${params}`)
      ]);

      const summaryData = summaryRes.data?.results || summaryRes.data || [];
      setSummaries(summaryData);
      
      const invoiceData = invRes.data?.results || invRes.data || [];
      const poData = poRes.data?.results || poRes.data || [];
      const expData = expRes.data?.results || expRes.data || [];
      const costData = costRes.data?.results || costRes.data || [];

      setNextPages({
        invoices: invRes.data?.next || null,
        purchase_orders: poRes.data?.next || null,
        expenses: expRes.data?.next || null,
        cost_categories: costRes.data?.next || null
      });

      const combinedLedger = [
        ...invoiceData.map(i => ({ ...i, type: 'INVOICE' })),
        ...poData.map(p => ({ ...p, type: 'PURCHASE_ORDER' })),
        ...expData.map(e => ({ ...e, type: 'EXPENSE' }))
      ];
      setLedger(combinedLedger);
      setCostCategories(costData);
      
    } catch (error) {
      console.error("Failed to sync tax records", error);
      toast.error("Error syncing tax records");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleLoadMore = async (category) => {
    const nextUrl = nextPages[category];
    if (!nextUrl || loadingMore) return;

    setLoadingMore(true);
    try {
      const urlParams = `&year=${filters.year}&month=${filters.month}${selectedBranch ? `&branch_id=${selectedBranch}` : ""}`;
        
      const url = nextUrl.includes('/api/') ? nextUrl.split('/api/')[1].replace(/^v\d+\//, '/') : nextUrl;
      const res = await api.get(`${url}${urlParams.replace('?', '&')}`);
      const newData = res.data?.results || res.data || [];
      const newNext = res.data?.next || null;

      setNextPages(prev => ({ ...prev, [category]: newNext }));

      if (category === 'cost_categories') {
        setCostCategories(prev => [...prev, ...newData]);
      } else {
        const typeMap = {
          invoices: 'INVOICE',
          purchase_orders: 'PURCHASE_ORDER',
          expenses: 'EXPENSE'
        };
        const typedData = newData.map(item => ({ ...item, type: typeMap[category] }));
        setLedger(prev => [...prev, ...typedData]);
      }
    } catch {
      toast.error("Failed to load more records");
    } finally {
      setLoadingMore(false);
    }
  };

  const AdvancedFilterBar = () => {
    const isInvoice = activeTab === "invoices";
    const isPO = activeTab === "purchase_orders";
    const isExpense = activeTab === "expenses";
    const isCost = activeTab === "cost_categories";
    const updateAdvancedFilter = (key, value) => {
      setAdvancedFilters((prev) => ({ ...prev, [key]: value }));
    };
    const fieldClass =
      "w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 py-2.5 text-sm font-medium leading-6 tracking-normal text-slate-900 caret-slate-900 outline-none transition-all placeholder:text-sm placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100";
    const dateFieldClass =
      "w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm font-medium leading-6 tracking-normal text-slate-900 caret-slate-900 outline-none transition-all focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100";
    const hasAnyAdvancedFilter = Object.values(advancedFilters).some(Boolean);

    return (
      <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white overflow-hidden shadow-sm">
        <button 
          onClick={() => setIsAdvancedFiltersExpanded(!isAdvancedFiltersExpanded)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className={`h-8 w-8 rounded-xl flex items-center justify-center transition-colors ${hasAnyAdvancedFilter ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "bg-slate-50 text-slate-400 border border-slate-100"}`}>
              <FaSearch size={12} />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Audit Filters</p>
              <p className="text-[9px] font-medium text-slate-500 mt-0.5">
                {hasAnyAdvancedFilter ? "Refining ledger results..." : "Apply deep search across compliance pillars"}
              </p>
            </div>
          </div>
          <div className={`h-7 w-7 rounded-full flex items-center justify-center border border-slate-100 text-slate-400 transition-transform duration-300 ${isAdvancedFiltersExpanded ? "rotate-180" : ""}`}>
            <FaChevronDown size={9} />
          </div>
        </button>

        {isAdvancedFiltersExpanded && (
          <div className="p-5 sm:p-6 border-t border-slate-50 space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {/* Section Specific Filters */}
          {isInvoice && (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Product</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 z-10 flex items-center pl-5 pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                    <FaSearch size={12} />
                  </div>
                  <input
                    type="text"
                    placeholder="Type product name..."
                    value={advancedFilters.product}
                    onChange={(e) => updateAdvancedFilter("product", e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Category</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 z-10 flex items-center pl-5 pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                    <FaSearch size={12} />
                  </div>
                  <input
                    type="text"
                    placeholder="Type category name..."
                    value={advancedFilters.category}
                    onChange={(e) => updateAdvancedFilter("category", e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>
            </>
          )}

          {isPO && (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Supplier Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 z-10 flex items-center pl-5 pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                    <FaSearch size={12} />
                  </div>
                  <input
                    type="text"
                    placeholder="Type supplier name..."
                    value={advancedFilters.supplier}
                    onChange={(e) => updateAdvancedFilter("supplier", e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Supplier Mobile</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 z-10 flex items-center pl-5 pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                    <FaBuilding size={12} />
                  </div>
                  <input
                    type="text"
                    placeholder="Mobile number..."
                    value={advancedFilters.supplierMobile}
                    inputMode="numeric"
                    onChange={(e) => updateAdvancedFilter("supplierMobile", e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>
            </>
          )}

          {isExpense && (
            <div className="space-y-2 lg:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Expense Title</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 z-10 flex items-center pl-5 pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                  <FaSearch size={12} />
                </div>
                <input
                  type="text"
                  placeholder="Search by expense title..."
                  value={advancedFilters.product}
                  onChange={(e) => updateAdvancedFilter("product", e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
          )}

          {/* From Date Filter */}
          <div className={`space-y-2 ${isCost ? 'lg:col-span-2' : ''}`}>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">From Date & Time</label>
            <div className="relative group">
              <input
                type="datetime-local"
                value={advancedFilters.fromDateTime}
                onChange={(e) => updateAdvancedFilter("fromDateTime", e.target.value)}
                className={dateFieldClass}
              />
            </div>
          </div>

          {/* To Date Filter */}
          <div className={`space-y-2 ${isCost ? 'lg:col-span-2' : ''}`}>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">To Date & Time</label>
            <div className="relative group">
              <input
                type="datetime-local"
                value={advancedFilters.toDateTime}
                onChange={(e) => updateAdvancedFilter("toDateTime", e.target.value)}
                className={dateFieldClass}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              {hasAnyAdvancedFilter ? (
                <div className="flex flex-wrap gap-2">
                  {advancedFilters.product ? (
                    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                      Product: <span className="ml-1 text-slate-900">{advancedFilters.product}</span>
                    </div>
                  ) : null}
                  {advancedFilters.category ? (
                    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                      Category: <span className="ml-1 text-slate-900">{advancedFilters.category}</span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs font-medium text-slate-400">
                  Add section filters, then apply them to refine the ledger results.
                </p>
              )}

              <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
                <button 
                  onClick={() => fetchData(advancedFilters)}
                  className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
                >
                  <FaPlay size={10} className="text-slate-400" />
                  Apply Filters
                </button>
                <button 
                  onClick={() => {
                    setAdvancedFilters(EMPTY_ADVANCED_FILTERS);
                    fetchData(EMPTY_ADVANCED_FILTERS);
                  }}
                  className="w-full sm:w-auto px-8 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95"
                >
                  <FaUndo size={10} />
                  Reset Parameters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  const LoadMoreButton = ({ category }) => {
    if (!nextPages[category]) return null;
    return (
      <div className="p-4 border-t border-slate-100 flex justify-center bg-slate-50/50">
        <button
          onClick={() => handleLoadMore(category)}
          disabled={loadingMore}
          className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm flex items-center gap-2"
        >
          {loadingMore ? (
            <span className="h-3 w-3 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
          ) : (
            <FaPlus size={10} />
          )}
          {loadingMore ? "Loading..." : "Load More"}
        </button>
      </div>
    );
  };

  const costCategorySection = (
    <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
          <FaReceipt size={14} />
        </div>
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">
            Monthly Cost Categories
          </h3>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">
            Summarized cost and tax rates per category
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-widest">
              <th className="px-6 py-4">Category Name</th>
              <th className="px-6 py-4 text-center">Tax Rate</th>
              <th className="px-6 py-4 text-right text-slate-900">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {costCategories.map((cat, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900 text-xs">
                  {cat.category_name}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-[9px] font-black">
                    {cat.gst_rate}%
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-black text-slate-900 text-xs tabular-nums">
                  {formatMoney(cat.cost)}
                </td>
              </tr>
            ))}
            {costCategories.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                  No category data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <LoadMoreButton category="cost_categories" />
    </section>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 font-sans">
      <ProtectedHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {isComplianceChecking ? (
          <div className="flex flex-col items-center justify-center min-h-[500px] space-y-6">
            <div className="h-14 w-14 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin shadow-inner" />
            <div className="text-center space-y-1">
              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Security Check</p>
              <p className="text-sm font-medium text-slate-500">Verifying business compliance status...</p>
            </div>
          </div>
        ) : !isGstRegistered ? (
          <section className="bg-white border border-slate-200 rounded-[3rem] p-16 text-center space-y-10 max-w-3xl mx-auto my-12 shadow-xl shadow-slate-100/50">
            <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto text-slate-700 shadow-sm border border-slate-100">
              <FaShieldAlt size={44} />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">GST Compliance Required</h2>
              <p className="text-slate-500 font-medium leading-relaxed max-w-xl mx-auto text-lg">
                To activate tax reconciliation and automated audit ledgers, please provide your business compliance details.
              </p>
            </div>

            {!showRegForm ? (
              <button 
                onClick={() => setShowRegForm(true)}
                className="inline-flex items-center gap-3 px-12 py-5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 hover:-translate-y-1 active:scale-95 transition-all shadow-2xl shadow-slate-200"
              >
                Register Compliance Identity <FaArrowRight size={12} />
              </button>
            ) : (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsRegistering(true);
                try {
                  await api.post("/business/gst-profile/", registrationForm);
                  toast.success("Compliance profile linked successfully");
                  setIsGstRegistered(true);
                  fetchData();
                } catch (err) {
                  toast.error(err.response?.data?.gstin?.[0] || "Failed to register profile");
                } finally {
                  setIsRegistering(false);
                }
              }} className="bg-slate-50/50 p-10 rounded-[2.5rem] border border-slate-100 space-y-8 text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Official GSTIN Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400">
                      <FaFingerprint size={16} />
                    </div>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. 27AAAAA0000A1Z5"
                      value={registrationForm.gstin}
                      onChange={(e) => setRegistrationForm({...registrationForm, gstin: e.target.value.toUpperCase()})}
                      className="w-full pl-14 pr-6 py-5 bg-white border-b-2 border-slate-200 focus:border-slate-900 text-base font-bold text-slate-900 font-mono tracking-[0.1em] outline-none transition-all placeholder:text-slate-300 placeholder:font-sans"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Registration Type</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400">
                      <FaLayerGroup size={16} />
                    </div>
                    <select
                      value={registrationForm.registration_type}
                      onChange={(e) => setRegistrationForm({...registrationForm, registration_type: e.target.value})}
                      className="w-full pl-14 pr-6 py-5 bg-white border-b-2 border-slate-200 focus:border-slate-900 text-sm font-bold text-slate-900 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="REGULAR">Regular</option>
                      <option value="COMPOSITION">Composition</option>
                      <option value="UNREGISTERED">Unregistered</option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isRegistering}
                  className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
                >
                  {isRegistering ? "Authenticating Profile..." : "Finalize Activation"}
                </button>
              </form>
            )}
            
            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-4">
              <FaShieldAlt className="text-emerald-500" />
              Secure Enterprise Compliance
            </div>
          </section>
        ) : (
          <>
        <section className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
          <div className="px-6 sm:px-8 py-6 sm:py-7 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/70">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">
                  <Link
                    to="/analytics"
                    className="hover:text-slate-900 transition-colors"
                  >
                    Analytics
                  </Link>
                  <FaChevronRight size={8} className="opacity-50" />
                  <span className="text-slate-900">GST Board</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200">
                    <FaCalculator size={16} />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                      GST Reconciliation & Ledger
                      {isRefreshing && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-full">
                           <span className="h-2 w-2 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
                           <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Syncing</span>
                        </div>
                      )}
                    </h1>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                {/* Unified Month & Branch Filters */}
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5">
                      <p className="px-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Month
                      </p>
                      <div className="relative mt-1">
                        <select
                          value={filters.month}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              month: parseInt(e.target.value, 10),
                            })
                          }
                          className="min-w-[140px] rounded-lg bg-transparent py-1.5 pl-2 pr-8 text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer transition-colors"
                        >
                          {monthNames.map((month, index) => (
                            <option key={month} value={index + 1}>
                              {month}
                            </option>
                        ))}
                      </select>
                      <FaCaretDown
                        size={10}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                    </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5">
                      <p className="px-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Year
                      </p>
                      <div className="relative mt-1">
                      <select
                        value={filters.year}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            year: parseInt(e.target.value, 10),
                          })
                        }
                          className="min-w-[110px] rounded-lg bg-transparent py-1.5 pl-2 pr-8 text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer transition-colors"
                      >
                        {years.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                      <FaCaretDown
                        size={10}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                    </div>
                    </div>
                  </div>
                </div>

                {role === "OWNER" && (
                  <div className="relative">
                    <select
                      value={selectedBranch}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedBranch(id);
                        setSearchParams((params) => {
                          if (id) params.set("branch_id", id);
                          else params.delete("branch_id");
                          return params;
                        });
                      }}
                      className="pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100 transition-all appearance-none cursor-pointer shadow-sm"
                      disabled={fetchingBranches}
                    >
                      <option value="">Global Overview</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                    <FaCaretDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 sm:px-8 py-6 sm:py-8 space-y-6 bg-[#F8FAFC]">

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {summaryCards.map((card) => (
                <div
                  key={card.title}
                  className={`rounded-xl border p-4 shadow-sm bg-white transition-all ${card.tone === "emerald" ? "border-emerald-100" : card.tone === "blue" ? "border-blue-100" : "border-slate-200"}`}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    {card.title}
                  </p>
                  <div className="flex items-end justify-between gap-3">
                    <h3 className="text-2xl font-black text-slate-900 tabular-nums break-all">
                      {card.value}
                    </h3>
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center ${card.tone === "emerald" ? "bg-emerald-50 text-emerald-600" : card.tone === "blue" ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-700"}`}
                    >
                      <FaBalanceScale size={14} />
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-medium text-slate-500">
                    {card.caption}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm flex flex-wrap gap-2">
              {Object.entries(tabMeta).map(([key, meta]) => {
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex-1 min-w-[120px] text-center rounded-xl px-4 py-3 transition-all border-2 ${
                      isActive
                        ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200 active:scale-95"
                        : "bg-white text-slate-500 border-slate-100 hover:border-slate-200 hover:bg-slate-50 active:scale-95"
                    }`}
                  >
                    <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${isActive ? "text-white" : "text-slate-400"}`}>
                      {meta.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-8">
              {loading ? (
                <div className="h-96 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-500 bg-white rounded-3xl border border-slate-200">
                  <div className="w-10 h-10 border-[4px] border-slate-900 border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-500 font-black text-[9px] uppercase tracking-[0.3em]">
                    Syncing Tax Data...
                  </p>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                  {activeTab === "invoices" && (
                    <div className="space-y-6">
                      <AdvancedFilterBar />
                      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[720px]">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                <th className="px-6 py-4">Ref / Party</th>
                                <th className="px-6 py-4 text-right">Base Amount</th>
                                <th className="px-6 py-4 text-center">Rate</th>
                                <th className="px-6 py-4 text-right">Tax</th>
                                <th className="px-6 py-4 text-right">Settlement</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {ledgerGroups.invoices.map((entry) => (
                                <tr key={`invoice-${entry.id}`} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4">
                                    <p className="font-bold text-slate-900 text-xs">{entry.reference}</p>
                                    <p className="text-[9px] font-medium text-slate-400 mt-0.5 uppercase tracking-tighter">{entry.party_name}</p>
                                  </td>
                                  <td className="px-6 py-4 text-right font-medium text-slate-600 text-xs tabular-nums">{formatMoney(entry.base_amount)}</td>
                                  <td className="px-6 py-4 text-center">
                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black">{entry.gst_rate}%</span>
                                  </td>
                                  <td className="px-6 py-4 text-right font-bold text-slate-900 text-xs tabular-nums">{formatMoney(entry.tax_amount)}</td>
                                  <td className="px-6 py-4 text-right font-black text-slate-900 text-xs tabular-nums">{formatMoney(entry.total_amount)}</td>
                                </tr>
                              ))}
                              {ledgerGroups.invoices.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No invoices found</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        <LoadMoreButton category="invoices" />
                      </section>
                    </div>
                  )}

                  {activeTab === "purchase_orders" && (
                    <div className="space-y-6">
                      <AdvancedFilterBar />
                      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[620px]">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                              <th className="px-6 py-4">Ref / Vendor</th>
                              <th className="px-6 py-4 text-right">Taxable</th>
                              <th className="px-6 py-4 text-right text-emerald-600">ITC Claimed</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {ledgerGroups.purchaseOrders.map((entry) => (
                              <tr key={`purchase-order-${entry.id}`} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                  <p className="font-bold text-slate-900 text-xs">{entry.reference}</p>
                                  <p className="text-[9px] font-medium text-slate-400 mt-0.5 uppercase tracking-tighter">{entry.party_name}</p>
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-slate-600 text-xs tabular-nums">{formatMoney(entry.base_amount)}</td>
                                <td className="px-6 py-4 text-right font-black text-emerald-600 text-xs tabular-nums">{formatMoney(entry.tax_amount)}</td>
                              </tr>
                            ))}
                            {ledgerGroups.purchaseOrders.length === 0 && (
                              <tr>
                                <td colSpan={3} className="px-6 py-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No purchase orders found</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <LoadMoreButton category="purchase_orders" />
                    </section>
                  </div>
                )}

                  {activeTab === "cost_categories" && costCategorySection}

                  {activeTab === "expenses" && (
                    <div className="space-y-6">
                      <AdvancedFilterBar />
                      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {ledgerGroups.expenses.map((expense) => (
                          <div key={`expense-${expense.id}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <p className="font-bold text-slate-900 text-xs">{expense.reference}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{expense.party_name}</p>
                              </div>
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] font-black">{expense.gst_rate}%</span>
                            </div>
                            <div className="mt-4 flex items-end justify-between">
                              <p className="text-lg font-black text-emerald-600 tabular-nums">{formatMoney(expense.tax_amount)}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ITC reclaim</p>
                            </div>
                          </div>
                        ))}
                        {ledgerGroups.expenses.length === 0 && (
                          <div className="col-span-full text-center py-10 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-bold uppercase tracking-widest bg-slate-50/60">
                            No expense credits found
                          </div>
                        )}
                      </div>
                      <LoadMoreButton category="expenses" />
                    </section>
                  </div>
                )}
                </div>
              )}
            </div>
          </div>
        </section>
          </>
        )}
      </main>
    </div>
  );
}
