import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import { paymentService } from "@/services/paymentService";
import StripeConnectSetup from "@/features/payment/components/StripeConnectSetup";
import PaymentHistory from "@/features/payment/components/PaymentHistory";
import {
  FaWallet,
  FaCreditCard,
  FaFileInvoice,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";

// Icon constants for sidebar info are defined inline where needed.

export default function PaymentDashboard() {
  const { profile } = useSelector((state) => state.user);
  const isOwner =
    String(profile?.role?.role || profile?.role || "").toUpperCase() ===
    "OWNER";

  const [connectStatus, setConnectStatus] = useState(null);
  const [isOnlineSetupExpanded, setIsOnlineSetupExpanded] = useState(false);

  useEffect(() => {
    if (isOwner) {
      paymentService
        .getConnectStatus()
        .then(setConnectStatus)
        .catch(() => setConnectStatus(null));
    }
  }, [isOwner]);

  return (
    <>
      <ProtectedHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 min-h-screen bg-transparent">
        {/* ── Page Header ───────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-900 rounded-xl shadow-sm text-white">
              <FaWallet className="text-2xl" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                Payment Dashboard
              </h2>
              <p className="text-slate-500 font-medium">
                Invoice payment records & online payment setup
              </p>
            </div>
          </div>
          <Link
            to="/invoice"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <FaFileInvoice size={14} />
            View Invoices
          </Link>
        </div>

        {/* ── Full Width Single Column Layout ─────────────────── */}
        <div className="space-y-6">
          {/* Stripe Connect Setup — owner only, only show if not yet integrated */}
          {isOwner && !connectStatus?.can_accept_payments && (
            <div className="glass-panel rounded-3xl p-5 space-y-4">
              <button
                type="button"
                onClick={() =>
                  setIsOnlineSetupExpanded((expanded) => !expanded)
                }
                aria-expanded={isOnlineSetupExpanded}
                className="w-full flex items-center justify-between text-left focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#635BFF]/10 flex items-center justify-center flex-shrink-0">
                    <FaCreditCard className="text-[#635BFF] text-xl" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm">
                      Online Payment Setup
                    </p>
                    <p className="text-xs text-slate-400">
                      Enable Stripe for invoice payments
                    </p>
                  </div>
                </div>
                <div>
                  {isOnlineSetupExpanded ? (
                    <FaChevronUp
                      className="text-slate-400 transition-opacity duration-200"
                      size={12}
                    />
                  ) : (
                    <FaChevronDown
                      className="text-slate-400 transition-opacity duration-200"
                      size={12}
                    />
                  )}
                </div>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isOnlineSetupExpanded
                    ? "max-h-[900px] opacity-100 translate-y-0"
                    : "max-h-0 opacity-0 -translate-y-1"
                }`}
              >
                <div className="pt-2 border-t border-slate-100/60 mt-3">
                  <StripeConnectSetup onStatusChange={setConnectStatus} />
                </div>
              </div>
            </div>
          )}

          {/* High Fidelity Interactive History with Filters, Summaries, and Pagination */}
          <PaymentHistory
            filterType="INVOICE"
            title="Invoice Payment History"
          />
        </div>
      </div>
    </>
  );
}
