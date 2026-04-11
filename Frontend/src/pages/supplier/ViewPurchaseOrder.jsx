import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
    FaArrowLeft,
    FaEdit,
    FaPrint,
    FaBuilding,
    FaMapMarkerAlt,
    FaWallet,
    FaBoxOpen,
    FaArrowRight
} from "react-icons/fa";
import toast from "react-hot-toast";

import ProtectedHeader from "@/components/layout/ProtectedHeader";
import { supplierService } from "@/features/supplier/services/supplierService";
import { extractFirstError, normalizeListPayload } from "@/features/supplier/utils/supplierHelpers";

function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    return isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function formatDateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    
    const datePart = date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
    const timePart = date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
    
    return `${datePart} at ${timePart}`;
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(Number(value) || 0);
}

function statusBadgeClass(status) {
    const normalized = String(status || "PENDING").toUpperCase();
    switch (normalized) {
        case "PENDING":
            return "bg-amber-50 text-amber-700 border-amber-200";
        case "CONFIRMED":
            return "bg-sky-50 text-sky-700 border-sky-200";
        case "SHIPPED":
            return "bg-blue-50 text-blue-700 border-blue-200";
        case "DELIVERED":
            return "bg-emerald-50 text-emerald-700 border-emerald-200";
        case "FAILED":
            return "bg-rose-50 text-rose-700 border-rose-200";
        case "CANCELLED":
            return "bg-slate-50 text-slate-700 border-slate-200";
        default:
            return "bg-slate-50 text-slate-600 border-slate-200";
    }
}

export default function ViewPurchaseOrder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [relatedOrders, setRelatedOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadOrder = async () => {
            try {
                setLoading(true);
                const res = await supplierService.getPurchaseOrderById(id);
                setOrder(res.data);

                const supplierId = res.data?.supplier?.id || res.data?.supplier;
                if (supplierId) {
                    const relatedRes = await supplierService.getPurchaseOrders(`?supplier=${supplierId}`);
                    const data = normalizeListPayload(relatedRes.data);
                    setRelatedOrders(data.filter(o => String(o.id) !== String(id)).slice(0, 4));
                }
            } catch (error) {
                toast.error(extractFirstError(error, "Failed to load order"));
                navigate("/supplier/purchase-order");
            } finally {
                setLoading(false);
            }
        };
        loadOrder();
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50">
                <ProtectedHeader />
                <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent mb-4"></div>
                    <p className="text-sm font-medium">Loading Purchase Order...</p>
                </div>
            </div>
        );
    }

    if (!order) return null;

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans">
            <ProtectedHeader />

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                {/* Top Navigation & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <button
                            onClick={() => navigate("/supplier/purchase-order")}
                            className="flex items-center gap-2 text-slate-500 hover:text-brand-600 text-sm font-semibold transition-colors mb-2"
                        >
                            <FaArrowLeft size={12} />
                            Back to Purchase Orders
                        </button>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            Purchase Order #{order.id}
                            <span className={`text-[10px] px-2.5 py-1 rounded-md border font-bold uppercase tracking-wider ${statusBadgeClass(order.status)}`}>
                                {order.status || "PENDING"}
                            </span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.print()}
                            className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold text-sm flex items-center gap-2 transition-all shadow-sm"
                        >
                            <FaPrint size={14} />
                            Print
                        </button>
                        <Link
                            to={`/supplier/purchase-order/${order.id}/edit`}
                            className="h-10 px-6 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-semibold text-sm flex items-center gap-2 transition-all shadow-sm shadow-slate-200"
                        >
                            <FaEdit size={14} />
                            Edit Order
                        </Link>
                    </div>
                </div>

                {/* Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-400">
                            <FaBuilding size={14} />
                            <h2 className="text-[11px] font-bold uppercase tracking-widest">Vendor Information</h2>
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-slate-900">{order.supplier?.name || order.supplier_name || "N/A"}</p>
                            <Link
                                to={`/supplier/vendor/${order.supplier?.id || order.supplier}`}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors group/link"
                            >
                                Show Details
                                <FaArrowRight size={8} className="group-hover/link:translate-x-0.5 transition-transform" />
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-400">
                            <FaMapMarkerAlt size={14} />
                            <h2 className="text-[11px] font-bold uppercase tracking-widest">Delivery Details</h2>
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-slate-900">{order.branch?.name || order.branch_name || order.branch_details?.name || "N/A"}</p>
                            <p className="text-xs text-slate-500 font-medium">Destination Delivery Point</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm text-right">
                        <div className="flex items-center justify-end gap-2 text-slate-400">
                            <FaWallet size={14} />
                            <h2 className="text-[11px] font-bold uppercase tracking-widest">Financial Summary</h2>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xl font-bold text-slate-900">{formatCurrency(order.total_amount)}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Net Total Payable</p>
                        </div>
                        <div className="pt-2 border-t border-slate-50">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Order Created On</p>
                            <p className="text-xs font-bold text-slate-700">{formatDateTime(order.created_at)}</p>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Items Table */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Purchase Items</h3>
                                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{order.items?.length || 0} Products</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-3">Product Description</th>
                                            <th className="px-6 py-3 text-center">Qty</th>
                                            <th className="px-6 py-3 text-right">Unit Price</th>
                                            <th className="px-6 py-3 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {order.items?.map((item, idx) => {
                                            const product = item.product_details || item.product || {};
                                            return (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-slate-900">{product.name || `Item #${item.product_id || item.product}`}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{product.sku || "N/A"}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="font-bold text-slate-700">{item.quantity}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(item.unit_cost)}</td>
                                                    <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(item.subtotal)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-slate-900 text-white">
                                        <tr>
                                            <td colSpan="3" className="px-6 py-5 text-right font-bold text-[10px] uppercase tracking-widest text-slate-400">Grand Total</td>
                                            <td className="px-6 py-5 text-right text-lg font-bold">{formatCurrency(order.total_amount)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* Remarks Section */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-400">
                                <FaBoxOpen size={14} />
                                <h3 className="text-[11px] font-bold uppercase tracking-widest">Order Remarks</h3>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed italic">
                                {order.notes ? `"${order.notes}"` : "No special instructions or remarks provided for this purchase order."}
                            </p>
                        </div>
                    </div>

                    {/* Sidebar Area */}
                    <div className="space-y-6">
                        {/* Quick View Vendor History */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vendor History</h3>
                            </div>
                            <div className="p-4 space-y-3">
                                {relatedOrders.length > 0 ? (
                                    relatedOrders.map((ro) => (
                                        <Link
                                            key={ro.id}
                                            to={`/supplier/purchase-order/${ro.id}`}
                                            className="block p-3 rounded-lg border border-slate-50 hover:border-brand-100 hover:bg-brand-50/10 transition-all"
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold text-slate-900 text-xs">#{ro.id}</span>
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${statusBadgeClass(ro.status)}`}>
                                                    {ro.status || "PENDING"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] text-slate-400 font-medium">{formatDate(ro.order_date)}</span>
                                                <span className="text-[10px] font-bold text-slate-700">{formatCurrency(ro.total_amount)}</span>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <p className="text-[10px] text-slate-400 font-medium text-center py-4 italic">No other orders found</p>
                                )}
                            </div>
                            <Link
                                to={`/supplier/purchase-order?supplier=${order.supplier?.id || order.supplier}`}
                                className="block py-3 bg-slate-50 text-center text-[9px] font-bold text-slate-500 uppercase tracking-widest hover:text-brand-600 transition-colors border-t border-slate-100"
                            >
                                View full history <FaArrowRight className="inline ml-1" size={8} />
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
