import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FaArrowLeft,
  FaEdit,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaCalendarAlt,
  FaVenusMars,
  FaGlobe,
  FaBuilding,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaShoppingCart,
} from "react-icons/fa";
import toast from "react-hot-toast";

import ProtectedHeader from "@/components/layout/ProtectedHeader";
import { customerService } from "@/features/customer/services/customerService";
import { extractFirstError } from "@/features/supplier/utils/supplierHelpers";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

export default function ViewCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        const res = await customerService.getById(id);
        setCustomer(res.data);
      } catch (error) {
        toast.error(
          extractFirstError(error, "Failed to load customer details"),
        );
        navigate("/supplier/customer");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <ProtectedHeader />
        <div className="flex flex-col items-center justify-center py-32 text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent mb-4"></div>
          <p className="text-sm font-medium">Loading Customer Details...</p>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  const isSamePlatform = Boolean(customer.same_platform);
  const businessLabel =
    customer.customer_business_name || customer.customer_business || "N/A";

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      <ProtectedHeader />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Top Navigation & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => navigate("/supplier/customer")}
              className="flex items-center gap-2 text-slate-500 hover:text-brand-600 text-sm font-semibold transition-colors mb-2"
            >
              <FaArrowLeft size={12} />
              Back to Customers
            </button>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              {customer.name}
              <span className="text-[10px] px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-500 font-bold uppercase tracking-wider">
                Customer ID: {customer.id}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={`/supplier/customer/${customer.id}/edit`}
              className="h-10 px-6 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold text-sm flex items-center gap-2 transition-all shadow-sm"
            >
              <FaEdit size={14} />
              Edit Profile
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Primary Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Overview */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-8 flex flex-col sm:flex-row gap-8 items-start">
                <div className="h-24 w-24 rounded-3xl bg-brand-50 text-brand-600 flex items-center justify-center text-4xl shadow-inner border border-brand-100 flex-shrink-0">
                  <FaUser />
                </div>
                <div className="space-y-6 flex-1 w-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <FaVenusMars size={10} /> Gender
                      </p>
                      <p className="text-sm font-bold text-slate-900 capitalize">
                        {customer.gender?.toLowerCase() || "Not specified"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <FaCalendarAlt size={10} /> Age Group
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {customer.age
                          ? `${customer.age} Years`
                          : "Not specified"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <FaPhone size={10} /> Mobile Number
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {customer.mobile_number || "No mobile registered"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <FaEnvelope size={10} /> Email Address
                      </p>
                      <p className="text-sm font-bold text-slate-900 break-all">
                        {customer.email || "No email registered"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Integration & Business Details */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                  <FaGlobe className="text-slate-400" size={14} />
                  Platform & Association
                </h3>
                <div
                  className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                    customer.is_active
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-rose-50 text-rose-700 border-rose-100"
                  }`}
                >
                  {customer.is_active ? (
                    <FaCheckCircle size={10} />
                  ) : (
                    <FaTimesCircle size={10} />
                  )}
                  {customer.is_active ? "ACCOUNT ACTIVE" : "ACCOUNT INACTIVE"}
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Platform Type
                    </p>
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold mt-1 ${isSamePlatform ? "bg-brand-50 text-brand-700 border border-brand-100" : "bg-slate-100 text-slate-600 border border-slate-200"}`}
                    >
                      {isSamePlatform
                        ? "Same Platform Member"
                        : "External Account"}
                    </div>
                  </div>
                  <div className="space-y-1 pt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <FaBuilding size={10} /> Associated Business
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {businessLabel}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium italic">
                      Referenced internal business ID:{" "}
                      {customer.customer_business || "None"}
                    </p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                  <div className="flex items-center gap-2 text-slate-600">
                    <FaInfoCircle size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Sync Status
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">
                        Auto-Integration:
                      </span>
                      <span
                        className={`font-bold ${customer.integration_active ? "text-emerald-600" : "text-slate-400"}`}
                      >
                        {customer.integration_active ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/50">
                      <span className="text-slate-500 font-medium">
                        Record Updated:
                      </span>
                      <span className="text-slate-700 font-bold">
                        {formatDate(customer.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Metadata & Timeline */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] pb-4 border-b border-slate-100">
                Record History
              </h3>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="h-8 w-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center flex-shrink-0 text-xs font-bold border border-slate-100">
                    IN
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Registered
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {formatDate(customer.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-8 w-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center flex-shrink-0 text-xs font-bold border border-slate-100">
                    UP
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Last Profile Update
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {formatDate(customer.updated_at)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-slate-100">
                <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
                  <p className="text-[10px] font-black text-sky-800 uppercase tracking-widest mb-1">
                    Administrative Info
                  </p>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-sky-700 flex justify-between">
                      Created By ID:{" "}
                      <span className="font-bold">
                        {customer.created_by || "System"}
                      </span>
                    </p>
                    <p className="text-xs font-medium text-sky-700 flex justify-between">
                      Last Updated By:{" "}
                      <span className="font-bold">
                        {customer.updated_by || "System"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Navigation Card */}
            <div className="bg-slate-900 rounded-2xl p-6 shadow-lg shadow-slate-200 space-y-4">
              <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                Quick Access
              </h3>
              <button
                onClick={() =>
                  navigate("/supplier/purchase-order/new", {
                    state: { selectedCustomer: customer.id },
                  })
                }
                className="w-full h-11 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <FaShoppingCart size={12} />
                Create Order for Customer
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
