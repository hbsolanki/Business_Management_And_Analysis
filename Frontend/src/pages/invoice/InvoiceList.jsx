import { useEffect, useState, useCallback, useRef, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { invoiceService } from "@/features/invoice/services/invoiceService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import {
    FaFileInvoice,
    FaPlus,
} from "react-icons/fa";

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

    /* ---------------- UI ---------------- */

    return (
        <>
            <ProtectedHeader />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 bg-gray-50/50 min-h-screen">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20 text-white">
                            <FaFileInvoice className="text-2xl" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                                Invoice Management
                            </h2>
                            <p className="text-gray-500 font-medium">Track and manage your billing efficiently</p>
                        </div>
                    </div>

                    <Link
                        to="/invoice/new"
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5"
                    >
                        <FaPlus className="h-4 w-4" />
                        Create New Invoice
                    </Link>
                </div>



                {/* Filters */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1 uppercase tracking-wider">Search</label>
                        <input
                            type="text"
                            placeholder="Search by mobile number..."
                            value={mobileInput}
                            onChange={(e) => setMobileInput(e.target.value)}
                            className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1 uppercase tracking-wider">From Date</label>
                        <input
                            type="date"
                            max={today}
                            value={fromDateInput}
                            onChange={(e) => {
                                setFromDateInput(e.target.value);
                                setToDateInput("");
                            }}
                            className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1 uppercase tracking-wider">To Date</label>
                        <input
                            type="date"
                            min={fromDateInput || undefined}
                            max={today}
                            disabled={!fromDateInput}
                            value={toDateInput}
                            onChange={(e) => setToDateInput(e.target.value)}
                            className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm disabled:bg-gray-100 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    <button
                        onClick={handleGo}
                        className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200"
                    >
                        Apply Filters
                    </button>
                </div>

                {/* Error */}
                {error && <div className="text-red-600 bg-red-50 p-4 rounded-xl text-center font-medium">{error}</div>}

                {/* Invoices List */}
                <div className="space-y-6">
                    {invoices.length === 0 && !loading && (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4">
                                <FaFileInvoice className="text-gray-400 text-2xl" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">No invoices found</h3>
                            <p className="text-gray-500">Create a new invoice to get started</p>
                        </div>
                    )}

                    <Suspense fallback={
                        <div className="text-center py-10">
                            <div className="animate-pulse bg-gray-200 h-32 w-full rounded-2xl"></div>
                        </div>
                    }>
                        {invoices.map((invoice) => (
                            <InvoiceCard
                                key={invoice.id}
                                invoice={invoice}
                                onPayClick={handlePayClick}
                            />
                        ))}
                    </Suspense>
                </div>

                {/* Footer Loading State */}
                {loading && (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                )}

                {!hasMore && invoices.length > 0 && (
                    <div className="flex justify-center py-8">
                        <span className="px-4 py-2 bg-gray-100 rounded-full text-xs font-bold text-gray-400 uppercase tracking-widest">End of list</span>
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
        </>
    );
}
