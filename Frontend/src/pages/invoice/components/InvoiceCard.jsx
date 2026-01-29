import { FaCalendarAlt, FaCreditCard, FaUser, FaPhone, FaBox } from "react-icons/fa";

const formatINR = (value) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);

export default function InvoiceCard({ invoice, onPayClick }) {
    const isPaid = invoice.payment_mode === "ONLINE" || invoice.payment_mode === "CASH";
    const statusColor =
        invoice.payment_mode === "ONLINE"
            ? "bg-green-100 text-green-700 border-green-200"
            : invoice.payment_mode === "CASH"
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : "bg-yellow-100 text-yellow-700 border-yellow-200";

    const formattedDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:border-blue-100 transition-all duration-300 group">
            {/* Header Section */}
            <div className="px-4 py-3 border-b border-gray-50 bg-gradient-to-r from-gray-50/30 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20">
                        #{invoice.id.toString().slice(-4)}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            {invoice.customer.name}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                            <span className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded">
                                <FaPhone size={8} /> {invoice.customer.mobile_number}
                            </span>
                            <span className="flex items-center gap-1 bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">
                                <FaUser size={8} /> {invoice.created_by}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-0.5 text-right">
                    <div className="text-xs font-medium text-gray-500 flex items-center gap-1">
                        <FaCalendarAlt className="text-gray-400" size={10} />
                        <span className="hidden sm:inline">Created:</span> {formattedDate(invoice.created_at)}
                    </div>
                    {invoice.payment_date && (
                        <div className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-1 border border-green-100">
                            <FaCreditCard size={8} />
                            Paid: {formattedDate(invoice.payment_date)}
                        </div>
                    )}
                </div>
            </div>

            {/* Content Section */}
            <div className="px-4 py-3">
                <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-100/50">
                    <div className="space-y-2">
                        {invoice.invoice_items.map((item) => (
                            <div key={item.id} className="flex justify-between items-center text-xs group/item">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-white border border-gray-100 flex items-center justify-center text-gray-400">
                                        <FaBox size={10} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-700">{item.product.name}</p>
                                        <p className="text-[10px] text-gray-400">{item.quantity} × {formatINR(item.base_price)}</p>
                                    </div>
                                </div>
                                <span className="font-bold text-gray-900">{formatINR(item.selling_price)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer Section */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusColor} flex items-center gap-1 uppercase tracking-wider`}>
                    {invoice.payment_mode === "ONLINE" && <FaCreditCard size={8} />}
                    {invoice.payment_mode || "PENDING"}
                </span>

                <div className="flex items-center gap-3 ml-auto">
                    <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Total</p>
                        <p className="text-lg font-black text-gray-900 leading-none">
                            {formatINR(invoice.total_amount)}
                        </p>
                    </div>

                    {(!invoice.payment_date) && (
                        <button
                            onClick={() => onPayClick(invoice)}
                            className="bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg shadow-md shadow-gray-200 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-1.5 text-xs font-bold"
                        >
                            <FaCreditCard size={10} />
                            Pay Online
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
