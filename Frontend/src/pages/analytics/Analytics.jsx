import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaChartPie, FaHome, FaTable, FaUserFriends } from "react-icons/fa";
import api from "@/services/api";

import ProtectedHeader from "@/components/layout/ProtectedHeader";

const AnalyticsSummary = lazy(() => import("@/features/analytics/components/AnalyticsSummary"));
const AnalyticsCharts = lazy(() => import("@/features/analytics/components/AnalyticsCharts"));
const CustomerAnalytics = lazy(() => import("@/features/analytics/components/CustomerAnalytics"));

const normalizeProductDetails = (data) => {
  const rows = Array.isArray(data) ? data : [];
  return rows.map((p) => ({
    ...p,
    cost_price: Number(p.cost_price),
    base_price: Number(p.base_price),
    net_profit: Number(p.net_profit),
  }));
};

export default function Analytics({ initialView = "SUMMARY" }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState(initialView);
  const [productStockData, setProductStockData] = useState([]);
  const [productDetailsData, setProductDetailsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const visualSection = searchParams.get("section");

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    let isMounted = true;

    const getData = async () => {
      if (view === "CUSTOMERS") {
        if (isMounted) setLoading(false);
        return;
      }

      const needsDetails =
        view === "SUMMARY" || (view === "CHARTS" && visualSection === "cost-profit");
      const needsStock =
        view === "SUMMARY" || (view === "CHARTS" && visualSection === "inventory-category");

      if (!needsDetails && !needsStock) {
        if (!isMounted) return;
        setProductDetailsData([]);
        setProductStockData([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let detailsRows = [];
        let stockRows = [];

        if (needsDetails) {
          const detailsRes = await api.get("/analytics/product/details/");
          detailsRows = detailsRes?.data?.results || detailsRes?.data || [];
        }

        if (needsStock) {
          const stockRes = await api.get("/analytics/product/stock/");
          stockRows = stockRes?.data?.results || stockRes?.data || [];
        }

        if (!isMounted) return;
        setProductDetailsData(normalizeProductDetails(detailsRows));
        setProductStockData(Array.isArray(stockRows) ? stockRows : []);
      } catch (err) {
        console.error("Analytics fetch failed", err);
        if (!isMounted) return;
        setProductDetailsData([]);
        setProductStockData([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    getData();

    return () => {
      isMounted = false;
    };
  }, [view, visualSection]);

  if (loading && view !== "CUSTOMERS") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const navButtonClass = (isActive) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
      isActive ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
    }`;

  return (
    <div className="min-h-screen bg-transparent">
      <ProtectedHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Analytics</h1>
            <p className="text-slate-500 mt-1">Open insights by module and track financial + customer performance.</p>
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => navigate("/analytics")}
              className={navButtonClass(false)}
            >
              <FaHome /> Index
            </button>
            <button
              onClick={() => navigate("/analytics/overview")}
              className={navButtonClass(view === "SUMMARY")}
            >
              <FaTable /> Overview
            </button>
            <button
              onClick={() => navigate("/analytics/visual")}
              className={navButtonClass(view === "CHARTS")}
            >
              <FaChartPie /> Visuals
            </button>
            <button
              onClick={() => navigate("/analytics/customers")}
              className={navButtonClass(view === "CUSTOMERS")}
            >
              <FaUserFriends /> Customers
            </button>
          </div>
        </div>

        <div className="min-h-[400px]">
          <Suspense
            fallback={
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
              </div>
            }
          >
            {view === "SUMMARY" ? (
              <AnalyticsSummary stockData={productStockData} detailsData={productDetailsData} />
            ) : view === "CHARTS" ? (
              <AnalyticsCharts stockData={productStockData} detailsData={productDetailsData} />
            ) : (
              <CustomerAnalytics />
            )}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
