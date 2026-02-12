import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaChartPie, FaTable, FaUserFriends, FaFilter } from "react-icons/fa";
import api from "@/services/api";

import ProtectedHeader from "@/components/layout/ProtectedHeader";
import AnalyticsFilters from "@/features/analytics/components/customer/AnalyticsFilters";

const AnalyticsSummary = lazy(() => import("@/features/analytics/components/AnalyticsSummary"));
const AnalyticsCharts = lazy(() => import("@/features/analytics/components/AnalyticsCharts"));
const CustomerAnalytics = lazy(() => import("@/features/analytics/components/CustomerAnalytics"));

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState(initialView);
  const [productStockData, setProductStockData] = useState([]);
  const [productDetailsData, setProductDetailsData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter State - Init from URL or Default to Previous Month
  const [filters, setFilters] = useState(() => {
    // Check URL params first
    const urlStart = searchParams.get("start_date");
    const urlEnd = searchParams.get("end_date");
    const urlSearch = searchParams.get("search");
    const urlProduct = searchParams.get("product_id");

    if (urlStart || urlEnd || urlSearch || urlProduct) {
      return {
        startDate: urlStart || "",
        endDate: urlEnd || "",
        searchQuery: urlSearch || "",
        productId: urlProduct || "",
      };
    }

    // Fallback to Previous Month
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);

    // Helper to format YYYY-MM-DD
    const fmt = (date) => {
      const offsetMs = date.getTimezoneOffset() * 60 * 1000;
      return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
    };

    return {
      startDate: fmt(start),
      endDate: fmt(end),
      searchQuery: "",
      productId: "",
    };
  });

  const [showFilters, setShowFilters] = useState(false);

  // Update URL when filters change
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    const params = {};
    if (newFilters.startDate) params.start_date = newFilters.startDate;
    if (newFilters.endDate) params.end_date = newFilters.endDate;
    if (newFilters.searchQuery) params.search = newFilters.searchQuery;
    if (newFilters.productId) params.product_id = newFilters.productId;
    setSearchParams(params, { replace: true }); // Using replace to avoid building huge history stack
  };

  // Sync view state with prop if it changes (e.g. browser back button)
  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.startDate) params.append("start_date", filters.startDate);
        if (filters.endDate) params.append("end_date", filters.endDate);
        // Note: Global search/product filters might not apply to overview endpoints depending on backend,
        // but adding them here consistent with the request "all feature".
        if (filters.searchQuery) params.append("search", filters.searchQuery);
        if (filters.productId) params.append("product_id", filters.productId);

        const queryString = params.toString();
        const query = queryString ? `?${queryString}` : "";

        const [detailsRes, stockRes] = await Promise.all([
          api.get(`/analytics/product/details/${query}`),
          api.get(`/analytics/product/stocks/${query}`),
        ]);

        setProductDetailsData(normalizeProductDetails(detailsRes.data));
        setProductStockData(stockRes.data);
      } catch (err) {
        console.error("Analytics fetch failed", err);
      } finally {
        setLoading(false);
      }
    };

    if (view !== "CUSTOMERS") {
      getData();
    }
  }, [view, filters]); // Re-fetch when view (if switching back to summary) or filters change

  if (loading && view !== "CUSTOMERS") { // Only show full loader for non-customer views, as CustomerAnalytics handles its own loading
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
    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${isActive
      ? "bg-slate-900 text-white shadow-sm"
      : "text-slate-600 hover:bg-slate-50"
    }`;

  const filterSummary = () => {
    const parts = [];
    if (filters.startDate || filters.endDate) {
      const fromLabel = filters.startDate ? filters.startDate : "Start";
      const toLabel = filters.endDate ? filters.endDate : "Today";
      parts.push(`Date: ${fromLabel} → ${toLabel}`);
    }
    return parts.length > 0 ? parts.join(" · ") : "All-time view";
  };

  return (
    <div className="min-h-screen bg-transparent">
      <ProtectedHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header & Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Analytics</h1>
            <p className="text-slate-500 mt-1">
              Clear, actionable insights across inventory, performance, and customers.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {view !== "CUSTOMERS" && (
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 hidden sm:block">
                  {filterSummary()}
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center gap-2 ${showFilters
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                >
                  <FaFilter className={showFilters ? "text-slate-300" : "text-slate-500"} />
                  Filters
                </button>
              </div>
            )}

            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
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
        </div>

        {/* Filters Area for Summary/Visuals */}
        {view !== "CUSTOMERS" && showFilters && (
          <div className="animate-fade-up">
            <AnalyticsFilters currentFilters={filters} onFilterChange={handleFilterChange} />
          </div>
        )}

        {/* Content Area */}
        <div className="min-h-[400px]">
          <Suspense
            fallback={
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
              </div>
            }
          >
            {view === "SUMMARY" ? (
              <AnalyticsSummary
                stockData={productStockData}
                detailsData={productDetailsData}
              />
            ) : view === "CHARTS" ? (
              <AnalyticsCharts
                stockData={productStockData}
                detailsData={productDetailsData}
              />
            ) : (
              <CustomerAnalytics />
            )}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
