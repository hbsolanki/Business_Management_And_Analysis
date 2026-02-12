import { useEffect, useState, useCallback, useRef, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { invoiceService } from "@/features/invoice/services/invoiceService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import { FaFileInvoice, FaPlus, FaTimes, FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaCalendarAlt, FaCreditCard, FaBox } from "react-icons/fa";

// Lazy Load the Card Component
const InvoiceCard = lazy(() => import("./components/InvoiceCard"));
const PaymentModal = lazy(() => import("@/features/payment/components/PaymentModal"));

const today = new Date().toISOString().split("T")[0];

/* ---------------- Component ---------------- */

export default function InvoiceList() {
    const [invoices, setInvoices] = useState([]);
    const [nextUrl, setNextUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);

    /* -------- UI Inputs -------- */
    const [mobileInput, setMobileInput] = useState("");
    const [fromDateInput, setFromDateInput] = useState("");
    const [toDateInput, setToDateInput] = useState("");

    /* -------- Applied Filters (API) -------- */
    const [filters, setFilters] = useState({
        mobile_number: "",
        from_date: "",
        to_date: "",
    });

    /* -------- Lock -------- */
    const fetchingRef = useRef(false);

    /* ---------------- Build URL ---------------- */

    const buildInitialUrl = useCallback(() => {
        const params = new URLSearchParams();

        if (filters.mobile_number)
            params.append("mobile_number", filters.mobile_number);
        if (filters.from_date) params.append("from_date", filters.from_date);
        if (filters.to_date) params.append("to_date", filters.to_date);

        const q = params.toString();
        return q ? `?${q}` : "";
    }, [filters]);

    /* ---------------- Fetch ---------------- */

    const fetchInvoices = useCallback(async (url, reset = false) => {
        if (fetchingRef.current) return;

        fetchingRef.current = true;
        setLoading(true);
        setError(null);

        try {
            const res = url.startsWith("http") ? await invoiceService.getByUrl(url) : await invoiceService.getAll(url);
            const data = res.data;

            setInvoices((prev) =>
                reset ? data.results : [...prev, ...data.results]
            );

            setNextUrl(data.next);
            setHasMore(Boolean(data.next));
        } catch {
            setError("Failed to load invoices");
        } finally {
            fetchingRef.current = false;
            setLoading(false);
        }
    }, []);

    /* ---------------- Initial Load / Filter Apply ---------------- */

    useEffect(() => {
        const url = buildInitialUrl();

        setInvoices([]);
        setNextUrl(null);
        setHasMore(true);

        fetchInvoices(url, true);
    }, [filters, buildInitialUrl, fetchInvoices]);

    /* ---------------- Infinite Scroll ---------------- */

    useEffect(() => {
        const onScroll = () => {
            if (
                window.innerHeight + window.scrollY >=
                document.body.offsetHeight - 300 &&
                hasMore &&
                !loading &&
                nextUrl
            ) {
                fetchInvoices(nextUrl);
            }
        };

        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, [nextUrl, hasMore, loading, fetchInvoices]);

    /* ---------------- Apply Filters ---------------- */

    const handleGo = () => {
        setFilters({
            mobile_number: mobileInput,
            from_date: fromDateInput,
            to_date: toDateInput,
        });
    };

    /* ---------------- Payment Modal State ---------------- */
    const [paymentModal, setPaymentModal] = useState({
        isOpen: false,
        invoiceId: null,
        amount: 0,
    });

    const handlePayClick = (invoice) => {
        setPaymentModal({
            isOpen: true,
            invoiceId: invoice.id,
            amount: invoice.total_amount,
        });
    };

    /* ---------------- View Modal ---------------- */
    const [viewModal, setViewModal] = useState({
        isOpen: false,
        loading: false,
        error: null,
        data: null,
    });

    const openInvoiceView = async (invoice) => {
        if (!invoice?.id) return;
        setViewModal({ isOpen: true, loading: true, error: null, data: null });
        try {
            const res = await invoiceService.getById(invoice.id);
            setViewModal({ isOpen: true, loading: false, error: null, data: res.data });
        } catch {
            setViewModal({ isOpen: true, loading: false, error: "Failed to load invoice", data: null });
        }
    };

    const closeInvoiceView = () => {
        setViewModal({ isOpen: false, loading: false, error: null, data: null });
    };

    /* ---------------- UI ---------------- */

    return (
        <>
            <ProtectedHeader />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 min-h-screen bg-transparent">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-slate-900 rounded-xl shadow-sm text-white">
                            <FaFileInvoice className="text-2xl" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                                Invoice Management
                            </h2>
                            <p className="text-slate-500 font-medium">Track and manage your billing efficiently</p>
                        </div>
                    </div>

                    <Link
                        to="/invoice/new"
                        className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-sm transition-all"
                    >
                        <FaPlus className="h-4 w-4" />
                        Create New Invoice
                    </Link>
                </div>



                {/* Filters */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 uppercase tracking-wider">Search</label>
                        <input
                            type="text"
                            placeholder="Search by mobile number..."
                            value={mobileInput}
                            onChange={(e) => setMobileInput(e.target.value)}
                            className="w-full bg-white rounded-xl px-4 py-2.5 text-sm border border-slate-200 focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 uppercase tracking-wider">From Date</label>
                        <input
                            type="date"
                            max={today}
                            value={fromDateInput}
                            onChange={(e) => {
                                setFromDateInput(e.target.value);
                                setToDateInput("");
                            }}
                            className="bg-white rounded-xl px-4 py-2.5 text-sm border border-slate-200 focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 uppercase tracking-wider">To Date</label>
                        <input
                            type="date"
                            min={fromDateInput || undefined}
                            max={today}
                            disabled={!fromDateInput}
                            value={toDateInput}
                            onChange={(e) => setToDateInput(e.target.value)}
                            className="bg-white rounded-xl px-4 py-2.5 text-sm border border-slate-200 disabled:bg-slate-50 focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-none transition-all"
                        />
                    </div>

                    <button
                        onClick={handleGo}
                        className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"
                    >
                        Apply Filters
                    </button>
                </div>

                {/* Error */}
                {error && <div className="text-red-700 bg-red-50 border border-red-200 p-4 rounded-xl text-center font-medium">{error}</div>}

                {/* Invoices List */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {invoices.length === 0 && !loading && (
                        <div className="bg-white border border-dashed border-slate-200 text-center py-20 rounded-3xl">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                                <FaFileInvoice className="text-slate-400 text-2xl" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900">No invoices found</h3>
                            <p className="text-slate-500">Create a new invoice to get started</p>
                        </div>
                    )}

                    <Suspense fallback={
                        <div className="text-center py-10">
                            <div className="animate-pulse bg-slate-100 h-32 w-full rounded-2xl"></div>
                        </div>
                    }>
                        {invoices.map((invoice) => (
                            <InvoiceCard
                                key={invoice.id}
                                invoice={invoice}
                                onPayClick={handlePayClick}
                                onViewClick={openInvoiceView}
                            />
                        ))}
                    </Suspense>
                </div>

                {/* Footer Loading State */}
                {loading && (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                    </div>
                )}

                {!hasMore && invoices.length > 0 && (
                    <div className="flex justify-center py-8">
                        <span className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold text-slate-500 uppercase tracking-widest">End of list</span>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            <Suspense fallback={null}>
                <PaymentModal
                    isOpen={paymentModal.isOpen}
                    onClose={() => setPaymentModal(prev => ({ ...prev, isOpen: false }))}
                    invoiceId={paymentModal.invoiceId}
                    amount={paymentModal.amount}
                />
            </Suspense>

            {viewModal.isOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Invoice Details</h3>
                                <p className="text-xs text-slate-500">Full information from the invoice record</p>
                            </div>
                            <button
                                onClick={closeInvoiceView}
                                className="h-9 w-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="p-5 space-y-5">
                            {viewModal.loading && (
                                <div className="py-10 text-center text-slate-500">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-3"></div>
                                    Loading invoice...
                                </div>
                            )}

                            {viewModal.error && (
                                <div className="text-red-700 bg-red-50 border border-red-200 p-4 rounded-xl text-center font-medium">
                                    {viewModal.error}
                                </div>
                            )}

                            {viewModal.data && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="border border-slate-200 rounded-xl p-4">
                                            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                                <FaUser className="text-slate-500" /> Customer
                                            </h4>
                                            <div className="space-y-2 text-sm text-slate-700">
                                                <div className="font-semibold text-slate-900">{viewModal.data.customer?.name || "N/A"}</div>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <FaPhone size={10} /> {viewModal.data.customer?.mobile_number || "N/A"}
                                                </div>
                                                {viewModal.data.customer?.email && (
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <FaEnvelope size={10} /> {viewModal.data.customer?.email}
                                                    </div>
                                                )}
                                                {viewModal.data.customer?.address && (
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <FaMapMarkerAlt size={10} /> {viewModal.data.customer?.address}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="border border-slate-200 rounded-xl p-4">
                                            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                                <FaCalendarAlt className="text-slate-500" /> Invoice
                                            </h4>
                                            <div className="space-y-2 text-sm text-slate-700">
                                                <div className="text-xs text-slate-500">Invoice ID</div>
                                                <div className="font-mono font-semibold text-slate-900">#{viewModal.data.id}</div>
                                                <div className="text-xs text-slate-500">Created By</div>
                                                <div className="font-semibold text-slate-900">{viewModal.data.created_by || "N/A"}</div>
                                                <div className="text-xs text-slate-500">Created At</div>
                                                <div>{viewModal.data.created_at ? new Date(viewModal.data.created_at).toLocaleString() : "N/A"}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border border-slate-200 rounded-xl p-4">
                                        <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                            <FaBox className="text-slate-500" /> Items
                                        </h4>
                                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                            {(viewModal.data.invoice_items || []).map((item) => (
                                                <div key={item.id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2">
                                                    <div>
                                                        <div className="font-semibold text-slate-900">{item.product?.name || "Product"}</div>
                                                        <div className="text-xs text-slate-500">Qty: {item.quantity}</div>
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {item.total_price ? `₹${item.total_price}` : ""}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                                        <div>
                                            <div className="text-xs text-slate-500">Payment Mode</div>
                                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                                                <FaCreditCard className="text-slate-500" />
                                                {viewModal.data.payment_mode || "N/A"}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-slate-500">Total Amount</div>
                                            <div className="text-lg font-bold text-slate-900">
                                                {viewModal.data.total_amount ? `₹${viewModal.data.total_amount}` : "N/A"}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
