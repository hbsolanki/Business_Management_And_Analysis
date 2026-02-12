import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { FiLayers, FiPlus } from "react-icons/fi";

import { inventoryService } from "@/features/inventory/services/inventoryService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";

const StockSection = lazy(() => import("@/features/inventory/components/StockSection"));
const TransactionSection = lazy(() => import("@/features/inventory/components/TransactionSection"));

export default function InventoryList() {
  const [stocks, setStocks] = useState([]);
  const [stockNext, setStockNext] = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [txNext, setTxNext] = useState(null);
  const [txLoading, setTxLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [stockRes, txRes] = await Promise.all([
          inventoryService.getStock(),
          inventoryService.getTransactions(),
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
  }, []);

  const applyStockFilter = async ({ name, sku }) => {
    const params = new URLSearchParams();
    if (name) params.append("name", name);
    if (sku) params.append("sku", sku);

    const res = await inventoryService.getStock(`?${params.toString()}`);
    setStocks(res.data?.results || []);
    setStockNext(res.data?.next || null);
  };

  const loadMoreStock = async () => {
    if (!stockNext) return;

    const res = await inventoryService.getStockByUrl(stockNext);
    setStocks((prev) => [...prev, ...(res.data?.results || [])]);
    setStockNext(res.data?.next || null);
  };

  const applyTransactionFilter = async ({ product_name, product_sku, action }) => {
    const params = new URLSearchParams();
    if (product_name) params.append("product_name", product_name);
    if (product_sku) params.append("product_sku", product_sku);
    if (action) params.append("action", action);

    const res = await inventoryService.getTransactions(`?${params.toString()}`);
    setTransactions(res.data?.results || []);
    setTxNext(res.data?.next || null);
  };

  const loadMoreTransactions = useCallback(async () => {
    if (!txNext || txLoading) return;

    setTxLoading(true);
    try {
      const res = await inventoryService.getTransactionsByUrl(txNext);
      setTransactions((prev) => [...prev, ...(res.data?.results || [])]);
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

          <Link
            to="/inventory/transaction/new"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
          >
            <FiPlus className="h-5 w-5" />
            New Transaction
          </Link>
        </div>

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
