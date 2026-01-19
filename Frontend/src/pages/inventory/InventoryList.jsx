import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { FiLayers, FiPlus } from "react-icons/fi";

import { inventoryService } from "@/features/inventory/services/inventoryService";
import StockSection from "@/features/inventory/components/StockSection";
import TransactionSection from "@/features/inventory/components/TransactionSection";
import ProtectedHeader from "@/components/layout/ProtectedHeader";

export default function InventoryList() {
  const [stocks, setStocks] = useState([]);
  const [stockNext, setStockNext] = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [txNext, setTxNext] = useState(null);
  const [txLoading, setTxLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ---------- INITIAL LOAD ---------- */
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

  /* ---------- STOCK FILTER ---------- */
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

  /* ---------- TRANSACTION FILTER ---------- */
  const applyTransactionFilter = async ({ name, sku, action }) => {
    const params = new URLSearchParams();
    if (name) params.append("name", name);
    if (sku) params.append("sku", sku);
    if (action) params.append("action", action);

    const res = await inventoryService.getTransactions(`?${params.toString()}`);

    setTransactions(res.data?.results || []);
    setTxNext(res.data?.next || null);
  };

  /* ---------- INFINITE SCROLL (TRANSACTIONS) ---------- */
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

  /* ---------- STATES ---------- */
  if (loading) {
    return (
      <div className="p-10 text-center text-gray-600">Loading inventory…</div>
    );
  }

  if (error) {
    return <div className="p-10 text-center text-red-600">{error}</div>;
  }

  /* ---------- UI ---------- */
  return (
    <>
      <ProtectedHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <FiLayers className="text-blue-600 text-2xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Inventory
              </h1>
              <p className="text-gray-500 mt-1">Track stocks and transactions</p>
            </div>
          </div>

          <Link
            to="/inventory/transaction/new"
            className="
            flex items-center gap-2
            bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800
            text-white font-medium
            px-5 py-2.5
            rounded-lg
            shadow-lg shadow-blue-500/30
            hover:scale-[1.02] transform transition-all
          "
          >
            <FiPlus className="h-5 w-5" />
            New Transaction
          </Link>
        </div>

        {/* Stock Section */}
        <StockSection
          stocks={stocks}
          hasMore={Boolean(stockNext)}
          onLoadMore={loadMoreStock}
          onFilter={applyStockFilter}
        />

        {/* Transaction Section */}
        <TransactionSection
          transactions={transactions}
          loading={txLoading}
          onFilter={applyTransactionFilter}
        />
      </div>
    </>
  );
}
