import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FaArrowLeft,
  FaEdit,
  FaShoppingCart,
  FaArrowRight,
  FaBuilding,
  FaPhone,
  FaMapMarkerAlt,
  FaKey,
  FaEye,
  FaEyeSlash,
  FaCopy,
  FaLink,
  FaCheckCircle,
  FaTimesCircle,
  FaSync,
} from "react-icons/fa";
import toast from "react-hot-toast";

import ProtectedHeader from "@/components/layout/ProtectedHeader";
import Modal from "@/components/ui/Modal";
import { supplierService } from "@/features/supplier/services/supplierService";
import {
  extractFirstError,
  normalizeListPayload,
} from "@/features/supplier/utils/supplierHelpers";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function getBusinessLabel(vendor) {
  if (!vendor) return "N/A";
  if (vendor.supplier_business_name) return vendor.supplier_business_name;
  if (vendor.business_name) return vendor.business_name;

  const candidate =
    vendor.supplier_business ?? vendor.vendor_business ?? vendor.business;
  if (candidate && typeof candidate === "object") {
    return candidate.name || (candidate.id ? `ID: ${candidate.id}` : "N/A");
  }
  if (candidate) return `ID: ${candidate}`;

  if (vendor.supplier_business_id) return `ID: ${vendor.supplier_business_id}`;
  if (vendor.business_id) return `ID: ${vendor.business_id}`;
  return "N/A";
}

export default function ViewVendor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        setLoading(true);
        const res = await supplierService.getVendorById(id);
        setVendor(res.data);
        loadRecentOrders();
      } catch (error) {
        toast.error(extractFirstError(error, "Failed to load vendor details"));
        navigate("/supplier/vendor");
      } finally {
        setLoading(false);
      }
    };

    const loadRecentOrders = async () => {
      try {
        setLoadingOrders(true);
        const res = await supplierService.getPurchaseOrders(`?supplier=${id}`);
        setOrders(normalizeListPayload(res.data).slice(0, 10));
      } catch (error) {
        console.error("Failed to load vendor orders", error);
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchVendor();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <ProtectedHeader />
        <div className="flex flex-col items-center justify-center py-32 text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent mb-4"></div>
          <p className="text-sm font-medium">Loading Vendor Details...</p>
        </div>
      </div>
    );
  }

  if (!vendor) return null;

  const businessLabel = getBusinessLabel(vendor);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      <ProtectedHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Top Navigation & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => navigate("/supplier/vendor")}
              className="flex items-center gap-2 text-slate-500 hover:text-brand-600 text-sm font-semibold transition-colors mb-2"
            >
              <FaArrowLeft size={12} />
              Back to Vendors
            </button>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              {vendor.name}
              <span className="text-[10px] px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-500 font-bold uppercase tracking-wider">
                Vendor ID: {vendor.id}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={`/supplier/vendor/${vendor.id}/edit`}
              className="h-10 px-6 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold text-sm flex items-center gap-2 transition-all shadow-sm"
            >
              <FaEdit size={14} />
              Edit Vendor
            </Link>
            <Link
              to="/supplier/purchase-order/new"
              state={{ selectedSupplier: vendor.id }}
              className="h-10 px-6 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-semibold text-sm flex items-center gap-2 transition-all shadow-sm shadow-slate-200"
            >
              <FaShoppingCart size={14} />
              Create Order
            </Link>
          </div>
        </div>

        {/* Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <FaBuilding size={14} />
              <h2 className="text-[11px] font-bold uppercase tracking-widest">
                Business Info
              </h2>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-slate-900">
                {vendor.contact_person || vendor.name}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Point of Contact
              </p>
              {vendor.gst_number && (
                <p className="text-[10px] text-brand-600 font-bold mt-2 uppercase tracking-tight bg-brand-50 inline-block px-1.5 py-0.5 rounded">
                  GST: {vendor.gst_number}
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <FaPhone size={14} />
              <h2 className="text-[11px] font-bold uppercase tracking-widest">
                Communication
              </h2>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-slate-900">
                {vendor.mobile_number || "N/A"}
              </p>
              <p className="text-xs text-slate-500 font-medium underline decoration-slate-200">
                {vendor.email || "No email registered"}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <FaMapMarkerAlt size={14} />
              <h2 className="text-[11px] font-bold uppercase tracking-widest">
                Official Address
              </h2>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-900 leading-snug">
                {vendor.address || "No address provided"}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Registered Business Site
              </p>
            </div>
          </div>
        </div>

        {/* Platform Mapping */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2 text-slate-400">
              <FaLink size={14} />
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                Platform Mapping
              </h3>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Same Platform
              </p>
              <p className="text-sm font-semibold text-slate-800 mt-1">
                {vendor.same_platform
                  ? "Yes - Same Platform"
                  : "No - External Platform"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Supplier Business
              </p>
              <p className="text-sm font-semibold text-slate-800 mt-1">
                {businessLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Procurement History */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
              Recent Procurement Orders
            </h3>
            <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {orders.length} History Items
            </span>
          </div>
          <div className="p-4">
            {orders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.map((ro) => (
                  <Link
                    key={ro.id}
                    to={`/supplier/purchase-order/${ro.id}`}
                    className="block p-4 rounded-lg border border-slate-100 hover:border-brand-200 hover:bg-brand-50/5 transition-all group"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-slate-900 text-sm group-hover:text-brand-600 transition-colors flex items-center gap-2">
                        Purchase Order #{ro.id}
                        <FaArrowRight
                          size={10}
                          className="text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                        />
                      </span>
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                          ro.status === "RECEIVED"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : ro.status === "CANCELLED"
                              ? "bg-rose-50 text-rose-600 border-rose-100"
                              : "bg-amber-50 text-amber-600 border-amber-100"
                        }`}
                      >
                        {ro.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400 font-medium">
                        {formatDate(ro.order_date || ro.created_at)}
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(ro.total_amount)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <FaShoppingCart size={24} className="mx-auto opacity-20" />
                <p className="text-sm font-medium">
                  No procurement history found for this vendor.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
