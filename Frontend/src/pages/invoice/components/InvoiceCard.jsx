import {
  FaCalendarAlt,
  FaCreditCard,
  FaUser,
  FaPhone,
  FaBox,
} from "react-icons/fa";
import { Link } from "react-router-dom";

export default function InvoiceCard({ invoice, onPayClick, onViewClick }) {
  const items = Array.isArray(invoice.invoice_items)
    ? invoice.invoice_items
    : [];
  const shouldScrollItems = items.length > 2;

  const statusColor =
    invoice.payment_mode === "ONLINE"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : invoice.payment_mode === "CASH"
        ? "bg-slate-100 text-slate-700 border-slate-200"
        : "bg-amber-50 text-amber-700 border-amber-200";

  const formattedDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group h-full flex flex-col">
      {/* Header Section */}
      <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-[11px] shadow-sm">
            #{invoice.id?.toString().slice(-4) || "—"}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              {invoice.customer?.id ? (
                <Link
                  to={`/customer/${invoice.customer.id}`}
                  className="text-sky-700 hover:text-sky-800 underline underline-offset-2"
                >
                  {invoice.customer?.name || "Unknown Customer"}
                </Link>
              ) : (
                invoice.customer?.name || "Unknown Customer"
              )}
            </h3>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
              <span className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                <FaPhone size={8} /> {invoice.customer?.mobile_number || "N/A"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 text-right">
          <div className="text-[10px] font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
            <FaUser size={8} />
            <span>Created by:</span>
            <span className="font-bold text-slate-900">
              {invoice.created_by_name || "—"}
            </span>
          </div>
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <FaCalendarAlt className="text-slate-400" size={10} />
            <span className="hidden sm:inline">Created:</span>{" "}
            {formattedDate(invoice.created_at)}
          </div>
          {invoice.payment_date && (
            <div className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1 border border-emerald-200">
              <FaCreditCard size={8} />
              Paid: {formattedDate(invoice.payment_date)}
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="px-4 py-3 flex-1">
        <div className="bg-white rounded-lg p-3 border border-slate-200 h-full">
          <div
            className={`space-y-2 ${shouldScrollItems ? "max-h-[120px] overflow-y-auto pr-1" : ""}`}
          >
            {items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center text-xs group/item"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
                    <FaBox size={10} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-700 line-clamp-1">
                      {item.product?.name || "Unknown Product"}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Qty: {item.quantity}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusColor} flex items-center gap-1 uppercase tracking-wider`}
        >
          {invoice.payment_mode === "ONLINE" && <FaCreditCard size={8} />}
          {invoice.payment_mode || "PENDING"}
        </span>

        <button
          onClick={() => onViewClick?.(invoice)}
          className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg shadow-sm transition-all active:scale-95 text-xs font-semibold hover:bg-slate-100"
        >
          View
        </button>

        {!invoice.payment_date && (
          <button
            onClick={() => onPayClick(invoice)}
            className="ml-auto bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-1.5 text-xs font-semibold"
          >
            <FaCreditCard size={10} />
            Pay Online
          </button>
        )}
      </div>
    </div>
  );
}
