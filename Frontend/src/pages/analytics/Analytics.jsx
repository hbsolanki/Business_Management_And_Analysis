import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";

import ProtectedHeader from "@/components/layout/ProtectedHeader";
import { useRef, lazy, Suspense } from "react";
import { FaChartPie, FaTable } from "react-icons/fa";

const AnalyticsSummary = lazy(() => import("@/features/analytics/components/AnalyticsSummary"));
const AnalyticsCharts = lazy(() => import("@/features/analytics/components/AnalyticsCharts"));

/* ---------- helpers ---------- */
const normalizeProductDetails = (data) =>
  data.map((p) => ({
    ...p,
    cost_price: Number(p.cost_price),
    base_price: Number(p.base_price),
    net_profit: Number(p.net_profit),
  }));

export default function Analytics({ initialView = "SUMMARY" }) {
  const navigate = useNavigate();
  const [view, setView] = useState(initialView);
  const [productStockData, setProductStockData] = useState([]);
  const [productDetailsData, setProductDetailsData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sync view state with prop if it changes (e.g. browser back button)
  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    const getData = async () => {
      try {
        const [detailsRes, stockRes] = await Promise.all([
          api.get("/analytics/product/details/"),
          api.get("/analytics/product/stocks/"),
        ]);

        setProductDetailsData(normalizeProductDetails(detailsRes.data));
        setProductStockData(stockRes.data);
      } catch (err) {
        console.error("Analytics fetch failed", err);
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ProtectedHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* Header & Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Analytics Dashboard</h1>
            <p className="text-gray-500 mt-1">Real-time insights on your inventory and profitability</p>
          </div>

          <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex">
            <button
              onClick={() => navigate("/analytics/overview")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${view === "SUMMARY"
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50"
                }`}
            >
              <FaTable /> Overview
            </button>
            <button
              onClick={() => navigate("/analytics/visual")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${view === "CHARTS"
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50"
                }`}
            >
              <FaChartPie /> Visuals
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="min-h-[400px]">
          <Suspense fallback={
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          }>
            {view === "SUMMARY" ? (
              <AnalyticsSummary
                stockData={productStockData}
                detailsData={productDetailsData}
              />
            ) : (
              <AnalyticsCharts
                stockData={productStockData}
                detailsData={productDetailsData}
              />
            )}
          </Suspense>
        </div>

      </main>
    </div>
  );
}
