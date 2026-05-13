import { useEffect, useState, useCallback, lazy, Suspense, useMemo } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { FiLayers, FiPlus } from "react-icons/fi";

import { inventoryService } from "@/features/inventory/services/inventoryService";
import { branchService } from "@/features/business/services/branchService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import { FaCodeBranch } from "react-icons/fa";
import { getAssignedBranchesForWork, filterBranchesForRole } from "@/utils/branchFilter";

const StockSection = lazy(() => import("@/features/inventory/components/StockSection"));
const TransactionSection = lazy(() => import("@/features/inventory/components/TransactionSection"));

export default function InventoryList() {
  const { profile } = useSelector((state) => state.user);
  const userRole = String(typeof profile?.role === "object" ? profile?.role?.role : profile?.role || "").toUpperCase();
  const isRestrictedRole = userRole === "MANAGER" || userRole === "EMPLOYEE";
  
  const assignedBranches = useMemo(
    () => getAssignedBranchesForWork(profile, 'INVENTORY'),
    [profile]
  );

  const [stocks, setStocks] = useState([]);
  const [stockNext, setStockNext] = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [txNext, setTxNext] = useState(null);
  const [txLoading, setTxLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [fetchingBranches, setFetchingBranches] = useState(false);
  const [error, setError] = useState(null);

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
          setSelectedBranch((prev) => {
            if (prev && resolvedBranches.some((branch) => String(branch.id) === String(prev))) {
              return prev;
            }
            if (resolvedBranches.length > 0) return String(resolvedBranches[0].id);
            return "";
          });
          return;
        }

        setBranches(branchData);
        const mainBranch = branchData.find(b => b.is_default) || branchData[0];
        if (mainBranch) {
          setSelectedBranch(String(mainBranch.id));
        }
      } catch (err) {
        console.error("Failed to fetch branches", err);
      } finally {
        setFetchingBranches(false);
      }
    }
    fetchBranches();
  }, [isRestrictedRole, assignedBranches]);

  useEffect(() => {
    const loadInitial = async () => {
      if (!selectedBranch) {
        setLoading(false);
        setStocks([]);
        setTransactions([]);
        setStockNext(null);
        setTxNext(null);
        return;
      }

      setLoading(true);
      try {
        const params = { branch: selectedBranch };
        const query = `?${new URLSearchParams(params).toString()}`;

        const [stockRes, txRes] = await Promise.all([
          inventoryService.getStock(query),
          inventoryService.getTransactions(query),
        ]);

        setStocks(stockRes.data?.results || []);
        setStockNext(stockRes.data?.next || null);

        setTransactions(txRes.data?.results || []);
        setTxNext(txRes.data?.next || null);
      } catch {
        setError("Failed to load inventory data");
      } finally {
        setLoading(false);
      }
    };

    loadInitial();
  }, [selectedBranch]);

  const applyStockFilter = async ({ name, sku }) => {
    const params = new URLSearchParams();
    if (name) params.append("name", name);
    if (sku) params.append("sku", sku);
    if (selectedBranch) params.append("branch", selectedBranch);

    const res = await inventoryService.getStock(`?${params.toString()}`);
    setStocks(res.data?.results || []);
    setStockNext(res.data?.next || null);
  };

  const loadMoreStock = async () => {
    if (!stockNext) return;

    const res = await inventoryService.getStockByUrl(stockNext);
    setStocks((prev) => {
      const newItems = res.data?.results || [];
      const existingIds = new Set(prev.map((s) => s.id));
      const filtered = newItems.filter((s) => !existingIds.has(s.id));
      return [...prev, ...filtered];
    });
    setStockNext(res.data?.next || null);
  };

  const applyTransactionFilter = async ({ product_name, product_sku, action }) => {
    const params = new URLSearchParams();
    if (product_name) params.append("product_name", product_name);
    if (product_sku) params.append("product_sku", product_sku);
    if (action) params.append("action", action);
    if (selectedBranch) params.append("branch", selectedBranch);

    const res = await inventoryService.getTransactions(`?${params.toString()}`);
    setTransactions(res.data?.results || []);
    setTxNext(res.data?.next || null);
  };

  const loadMoreTransactions = useCallback(async () => {
    if (!txNext || txLoading) return;

    setTxLoading(true);
    try {
      const res = await inventoryService.getTransactionsByUrl(txNext);
      setTransactions((prev) => {
        const newItems = res.data?.results || [];
        const existingIds = new Set(prev.map((t) => t.id));
        const filtered = newItems.filter((t) => !existingIds.has(t.id));
        return [...prev, ...filtered];
      });
      setTxNext(res.data?.next || null);
    } finally {
      setTxLoading(false);
    }
  }, [txNext, txLoading]);

  useEffect(() => {
    const onScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 200
      ) {
        loadMoreTransactions();
      }
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [loadMoreTransactions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent">
        <ProtectedHeader />
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            <p className="text-slate-500 text-sm font-medium">Loading inventory...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent">
        <ProtectedHeader />
        <div className="p-10 text-center text-rose-600">{error}</div>
      </div>
    );
  }

  return (
    <>
      <ProtectedHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <FiLayers className="text-xl" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Inventory</h1>
              <p className="text-slate-500 mt-1">Track stock levels and transaction history.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {/* Branch Filter */}
            <div className="relative min-w-[200px]">
              <FaCodeBranch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all appearance-none cursor-pointer shadow-sm disabled:bg-slate-50 disabled:text-slate-500"
                disabled={fetchingBranches || (isRestrictedRole && branches.length <= 1)}
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} {b.is_default ? "(Main)" : ""}</option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>

            <Link
              to="/inventory/transaction/new"
              className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition shadow-lg shadow-slate-200"
            >
              <FiPlus className="h-5 w-5" />
              New Transaction
            </Link>
          </div>
        </div>

        {!selectedBranch && !fetchingBranches && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            No branch assigned for this account. Ask owner/manager to assign at least one branch.
          </div>
        )}

        <Suspense
          fallback={
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
          }
        >
          <StockSection
            stocks={stocks}
            hasMore={Boolean(stockNext)}
            onLoadMore={loadMoreStock}
            onFilter={applyStockFilter}
          />
        </Suspense>

        <Suspense
          fallback={
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
          }
        >
          <TransactionSection
            transactions={transactions}
            loading={txLoading}
            onFilter={applyTransactionFilter}
          />
        </Suspense>
      </main>
    </>
  );
}
