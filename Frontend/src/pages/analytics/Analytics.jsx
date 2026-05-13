import { useEffect, useState, lazy, Suspense, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaChartPie, FaHome, FaTable, FaUserFriends } from "react-icons/fa";
import { useSelector } from "react-redux";
import api from "@/services/api";

import ProtectedHeader from "@/components/layout/ProtectedHeader";
import { getAssignedBranchesForWork, filterBranchesForRole } from "@/utils/branchFilter";

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
  const { profile } = useSelector((state) => state.user);
  const userRole = String(typeof profile?.role === "object" ? profile?.role?.role : profile?.role || "").toUpperCase();
  const isRestrictedRole = userRole === "MANAGER" || userRole === "EMPLOYEE";
  
  const assignedBranches = useMemo(
    () => getAssignedBranchesForWork(profile, 'ANALYTICS'),
    [profile]
  );

  const [view, setView] = useState(initialView);
  const [productStockData, setProductStockData] = useState([]);
  const [productDetailsData, setProductDetailsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const visualSection = searchParams.get("section");

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [fetchingBranches, setFetchingBranches] = useState(false);

  useEffect(() => {
    async function fetchBranches() {
      setFetchingBranches(true);
      try {
        const response = await api.get("/business/branch/");
        const list = Array.isArray(response.data) ? response.data : (response.data?.results || []);
        
        if (isRestrictedRole) {
          const visibleBranches = filterBranchesForRole(list, assignedBranches);
          const resolvedBranches = visibleBranches.length > 0 ? visibleBranches : assignedBranches;
            
          setBranches(resolvedBranches);
          if (resolvedBranches.length > 0) setSelectedBranch(String(resolvedBranches[0].id));
        } else {
          setBranches(list);
          setSelectedBranch(""); // Default to Global for Owners
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

        const params = selectedBranch ? { branch: selectedBranch } : {};
        const query = Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : "";

        if (needsDetails) {
          const detailsRes = await api.get(`/analytics/product/details/${query}`);
          detailsRows = detailsRes?.data?.results || detailsRes?.data || [];
        }

        if (needsStock) {
          const stockRes = await api.get(`/analytics/product/stock/${query}`);
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
  }, [view, visualSection, selectedBranch]);

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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all cursor-pointer shadow-sm disabled:bg-slate-50 disabled:text-slate-500"
              disabled={fetchingBranches || (isRestrictedRole && branches.length <= 1)}
            >
              {!isRestrictedRole && <option value="">Global (All Branches)</option>}
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} {b.is_default ? "(Main)" : ""}</option>
              ))}
            </select>

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
              <AnalyticsSummary stockData={productStockData} detailsData={productDetailsData} branchId={selectedBranch} />
            ) : view === "CHARTS" ? (
              <AnalyticsCharts stockData={productStockData} detailsData={productDetailsData} branchId={selectedBranch} />
            ) : (
              <CustomerAnalytics branchId={selectedBranch} />
            )}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
