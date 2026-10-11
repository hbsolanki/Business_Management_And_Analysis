import { useState, useEffect } from "react";
import { paymentService } from "@/services/paymentService";
import {
    FaCreditCard, FaMoneyBillWave, FaUniversity, FaQrcode,
    FaFileInvoice, FaCheckCircle, FaTimesCircle, FaClock,
    FaExclamationTriangle, FaUndoAlt, FaChevronDown, FaChevronUp,
    FaCcStripe, FaFilter, FaCaretDown, FaCalculator, FaChartLine, FaChartPie
} from "react-icons/fa";
import { toast } from "react-hot-toast";

const METHOD_ICONS = {
    CARD: { icon: FaCreditCard, color: "text-rose-500", bg: "bg-rose-50", label: "Card" },
    UPI: { icon: FaQrcode, color: "text-purple-500", bg: "bg-purple-50", label: "UPI" },
    NEFT: { icon: FaUniversity, color: "text-blue-500", bg: "bg-blue-50", label: "NEFT" },
    RTGS: { icon: FaUniversity, color: "text-indigo-500", bg: "bg-indigo-50", label: "RTGS" },
    IMPS: { icon: FaUniversity, color: "text-cyan-500", bg: "bg-cyan-50", label: "IMPS" },
    NET_BANKING: { icon: FaUniversity, color: "text-sky-500", bg: "bg-sky-50", label: "Net Banking" },
    CHEQUE: { icon: FaFileInvoice, color: "text-slate-500", bg: "bg-slate-50", label: "Cheque" },
    CASH: { icon: FaMoneyBillWave, color: "text-emerald-500", bg: "bg-emerald-50", label: "Cash" },
    OTHER: { icon: FaMoneyBillWave, color: "text-slate-400", bg: "bg-slate-50", label: "Other" },
};

const STATUS_CONFIG = {
    PENDING: { icon: FaClock, color: "text-amber-500", bg: "bg-amber-50", label: "Pending" },
    PROCESSING: { icon: FaClock, color: "text-blue-500", bg: "bg-blue-50", label: "Processing" },
    SUCCEEDED: { icon: FaCheckCircle, color: "text-emerald-500", bg: "bg-emerald-50", label: "Paid" },
    FAILED: { icon: FaTimesCircle, color: "text-red-500", bg: "bg-red-50", label: "Failed" },
    REFUNDED: { icon: FaUndoAlt, color: "text-orange-500", bg: "bg-orange-50", label: "Refunded" },
    PARTIALLY_REFUNDED: { icon: FaExclamationTriangle, color: "text-orange-400", bg: "bg-orange-50", label: "Partial Refund" },
    CANCELLED: { icon: FaTimesCircle, color: "text-slate-400", bg: "bg-slate-50", label: "Cancelled" },
};

const STATUS_OPTIONS = [
    { value: "SUCCEEDED", label: "Paid" },
    { value: "PENDING", label: "Pending" },
    { value: "FAILED", label: "Failed" },
    { value: "REFUNDED", label: "Refunded" },
];

const METHOD_OPTIONS = [
    { value: "CARD", label: "Card" },
    { value: "UPI", label: "UPI" },
    { value: "NEFT", label: "NEFT" },
    { value: "RTGS", label: "RTGS" },
    { value: "IMPS", label: "IMPS" },
    { value: "NET_BANKING", label: "Net Banking" },
    { value: "CHEQUE", label: "Cheque" },
    { value: "CASH", label: "Cash" },
];

function MultiSelect({ label, options, selectedValues, onChange, placeholder }) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const handleOutsideClick = (e) => {
            if (!e.target.closest(".multiselect-container")) {
                setIsOpen(false);
            }
        };
        document.addEventListener("click", handleOutsideClick);
        return () => document.removeEventListener("click", handleOutsideClick);
    }, [isOpen]);

    const toggleValue = (val) => {
        if (selectedValues.includes(val)) {
            onChange(selectedValues.filter(v => v !== val));
        } else {
            onChange([...selectedValues, val]);
        }
    };

    const displayText = selectedValues.length === 0
        ? placeholder
        : selectedValues.length === 1
            ? options.find(o => o.value === selectedValues[0])?.label
            : `${selectedValues.length} Selected`;

    return (
        <div className="space-y-1 multiselect-container relative">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{label}</span>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100 transition-all cursor-pointer shadow-sm min-w-[155px] text-left"
            >
                <span className="truncate pr-2">{displayText}</span>
                <FaCaretDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]" />
            </button>

            {isOpen && (
                <div className="absolute z-50 left-0 mt-1 w-full min-w-[200px] bg-white border border-slate-200 rounded-xl shadow-lg p-2 max-h-60 overflow-y-auto space-y-1 animate-in fade-in slide-in-from-top-1 duration-100">
                    <button
                        type="button"
                        onClick={() => onChange([])}
                        className="w-full text-left px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    >
                        Clear All
                    </button>
                    <div className="border-t border-slate-100/80 my-1" />
                    {options.map((opt) => {
                        const isChecked = selectedValues.includes(opt.value);
                        return (
                            <label
                                key={opt.value}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-xs text-slate-700 font-medium select-none transition-all w-full"
                            >
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleValue(opt.value)}
                                    className="w-3.5 h-3.5 rounded text-slate-900 border-slate-300 focus:ring-slate-900 cursor-pointer"
                                />
                                <span>{opt.label}</span>
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function PaymentRow({ payment, onRefundSuccess }) {
    const [expanded, setExpanded] = useState(false);
    const [refunding, setRefunding] = useState(false);
    const [refundAmount, setRefundAmount] = useState("");
    const [refundReason, setRefundReason] = useState("");
    const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

    const method = METHOD_ICONS[payment.method] || METHOD_ICONS.OTHER;
    const stat = STATUS_CONFIG[payment.status] || STATUS_CONFIG.PENDING;
    const MethodIcon = method.icon;
    const StatusIcon = stat.icon;
    const hasGateway = !!payment.gateway_detail;

    const formattedAmount = parseFloat(payment.amount || 0).toLocaleString("en-IN", {
        style: "currency",
        currency: payment.currency || "INR",
    });

    const formattedDate = payment.paid_at || payment.created_at
        ? new Date(payment.paid_at || payment.created_at).toLocaleString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        })
        : "—";

    const refundableBalance = parseFloat(payment.amount || 0) - parseFloat(payment.refunded_amount || 0);
    const isRefundable = payment.status === "SUCCEEDED" && payment.payment_type === "INVOICE" && refundableBalance > 0;

    return (
        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white hover:shadow-sm transition-all duration-300">
            <button
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/50 transition-all text-left"
                onClick={() => setExpanded(e => !e)}
            >
                {/* Method Icon */}
                <div className={`w-9 h-9 rounded-xl ${method.bg} flex items-center justify-center flex-shrink-0`}>
                    <MethodIcon className={`${method.color}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800 capitalize">
                            {payment.method_display || payment.method}
                        </p>
                        {payment.payment_type === "INVOICE" && hasGateway && (
                            <FaCcStripe className="text-[#635BFF] text-xs" title="Stripe" />
                        )}
                    </div>
                    <p className="text-xs text-slate-400">{formattedDate}</p>
                </div>

                {/* Amount */}
                <p className="text-sm font-bold text-slate-800 flex-shrink-0 mr-2">{formattedAmount}</p>

                {/* Status badge */}
                <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${stat.bg} ${stat.color} flex-shrink-0`}>
                    <StatusIcon size={10} />
                    {stat.label}
                </span>

                <div className="ml-2">
                    {expanded ? <FaChevronUp size={10} className="text-slate-400" /> : <FaChevronDown size={10} className="text-slate-400" />}
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-4 pt-2 bg-slate-50/40 border-t border-slate-100 space-y-2.5">
                    <Grid>
                        <Field label="Type" value={payment.payment_type_display || payment.payment_type} />
                        <Field label="Status" value={payment.status_display || payment.status} />
                        <Field label="Currency" value={payment.currency} />
                        {payment.reference_number && (
                            <Field label="Reference / UTR" value={payment.reference_number} mono />
                        )}
                        {payment.refunded_amount && parseFloat(payment.refunded_amount) > 0 && (
                            <Field label="Refunded" value={`₹${parseFloat(payment.refunded_amount).toLocaleString("en-IN")}`} />
                        )}
                        {payment.failure_reason && (
                            <Field label="Reason" value={payment.failure_reason} full />
                        )}
                        {payment.notes && (
                            <Field label="Notes" value={payment.notes} full />
                        )}
                    </Grid>

                    {hasGateway && (
                        <>
                            <div className="border-t border-slate-100/60 my-2 pt-2" />
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gateway Details</p>
                            <Grid>
                                {payment.gateway_detail.stripe_payment_intent_id && (
                                    <Field label="Payment Intent" value={payment.gateway_detail.stripe_payment_intent_id} mono />
                                )}
                                {payment.gateway_detail.stripe_charge_id && (
                                    <Field label="Charge ID" value={payment.gateway_detail.stripe_charge_id} mono />
                                )}
                                {payment.gateway_detail.stripe_connected_account_id && (
                                    <Field label="Connected Account" value={payment.gateway_detail.stripe_connected_account_id} mono />
                                )}
                                {payment.gateway_detail.platform_fee && (
                                    <Field label="Platform Fee" value={`₹${parseFloat(payment.gateway_detail.platform_fee).toLocaleString("en-IN")}`} />
                                )}
                                {payment.gateway_detail.checkout_session_id && (
                                    <Field label="Session ID" value={payment.gateway_detail.checkout_session_id} mono />
                                )}
                                {payment.gateway_detail.stripe_subscription_id && (
                                    <Field label="Subscription ID" value={payment.gateway_detail.stripe_subscription_id} mono />
                                )}
                                {payment.gateway_detail.stripe_invoice_id && (
                                    <Field label="Stripe Invoice" value={payment.gateway_detail.stripe_invoice_id} mono />
                                )}
                                {payment.gateway_detail.payment_link && (
                                    <Field label="Payment Link" full>
                                        <a href={payment.gateway_detail.payment_link} target="_blank" rel="noreferrer"
                                            className="text-[#635BFF] hover:underline text-xs font-mono break-all inline-flex items-center gap-1">
                                            Open Link ↗
                                        </a>
                                    </Field>
                                )}
                            </Grid>
                        </>
                    )}

                    {isRefundable && (
                        <div className="border-t border-slate-100/60 my-2 pt-2 flex justify-end">
                            {!refunding ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setRefundAmount(refundableBalance.toFixed(2));
                                        setRefundReason("Customer request");
                                        setRefunding(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100/80 text-rose-600 font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                                >
                                    <FaUndoAlt size={10} />
                                    Refund Payment
                                </button>
                            ) : (
                                <form
                                    onClick={(e) => e.stopPropagation()}
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        if (isSubmittingRefund) return;
                                        if (!refundAmount || parseFloat(refundAmount) <= 0) {
                                            toast.error("Please enter a valid refund amount.");
                                            return;
                                        }
                                        if (parseFloat(refundAmount) > refundableBalance) {
                                            toast.error(`Refund amount cannot exceed remaining balance (₹${refundableBalance.toLocaleString("en-IN")})`);
                                            return;
                                        }
                                        setIsSubmittingRefund(true);
                                        try {
                                            await paymentService.refundPayment({
                                                paymentId: payment.id,
                                                amount: parseFloat(refundAmount),
                                                reason: refundReason
                                            });
                                            toast.success("Refund initiated successfully!");
                                            setRefunding(false);
                                            if (onRefundSuccess) onRefundSuccess();
                                        } catch (err) {
                                            const detail = err.response?.data?.stripe_error || err.response?.data?.amount || err.message || "Failed to process refund.";
                                            toast.error(`Refund failed: ${detail}`);
                                        } finally {
                                            setIsSubmittingRefund(false);
                                        }
                                    }}
                                    className="w-full bg-rose-50/30 border border-rose-100/70 p-3 rounded-xl mt-1 space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider flex items-center gap-1">
                                            <FaUndoAlt size={10} />
                                            Initiate Refund
                                        </p>
                                        <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                                            Max ₹{refundableBalance.toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Refund Amount (₹)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                max={refundableBalance}
                                                value={refundAmount}
                                                onChange={(e) => setRefundAmount(e.target.value)}
                                                disabled={isSubmittingRefund}
                                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all shadow-sm"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Reason</label>
                                            <input
                                                type="text"
                                                value={refundReason}
                                                onChange={(e) => setRefundReason(e.target.value)}
                                                disabled={isSubmittingRefund}
                                                placeholder="e.g. Customer request, duplicate payment"
                                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setRefunding(false)}
                                            disabled={isSubmittingRefund}
                                            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmittingRefund}
                                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] rounded-lg transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                                        >
                                            {isSubmittingRefund ? (
                                                <>
                                                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                "Confirm Refund"
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function Grid({ children }) {
    return <div className="grid grid-cols-2 gap-x-4 gap-y-2">{children}</div>;
}

function Field({ label, value, mono, full, children }) {
    return (
        <div className={full ? "col-span-2" : ""}>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">{label}</p>
            {children || (
                <p className={`text-xs text-slate-700 break-all ${mono ? "font-mono" : "font-medium"}`}>{value || "—"}</p>
            )}
        </div>
    );
}

export default function PaymentHistory({ filterType, title = "Payment History" }) {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Compute today's start and end boundaries for datetime-local
    const getTodayStrings = () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return {
            start: `${y}-${m}-${day}T00:00`,
            end: `${y}-${m}-${day}T23:59`
        };
    };

    const todayRange = getTodayStrings();

    // GST Dashboard inspired filter controller states (draft states)
    const [draftStatuses, setDraftStatuses] = useState([]);
    const [draftMethods, setDraftMethods] = useState([]);
    const [draftFromDate, setDraftFromDate] = useState(todayRange.start);
    const [draftToDate, setDraftToDate] = useState(todayRange.end);

    // Active filters which trigger API calls
    const [activeFilters, setActiveFilters] = useState({
        statuses: [],
        methods: [],
        fromDate: todayRange.start,
        toDate: todayRange.end
    });

    // Expand collapse state
    const [isMethodBreakdownExpanded, setIsMethodBreakdownExpanded] = useState(true);
    const [isFilterExpanded, setIsFilterExpanded] = useState(true);
    const [isStatsExpanded, setIsStatsExpanded] = useState(true);

    // Global backend computed aggregates state
    const [summary, setSummary] = useState({
        total: 0, totalCount: 0,
        paid: 0, paidCount: 0,
        pending: 0, pendingCount: 0,
        refunded_failed: 0, refunded_failed_count: 0,
        methods: {}
    });

    const getDateParams = () => {
        return {
            from_date: activeFilters.fromDate || undefined,
            to_date: activeFilters.toDate || undefined,
        };
    };

    const fetchInitial = async () => {
        setLoading(true);
        setError(null);
        try {
            const dateParams = getDateParams();
            const params = {
                ...dateParams,
                status: activeFilters.statuses.length > 0 ? activeFilters.statuses.join(",") : undefined,
                method: activeFilters.methods.length > 0 ? activeFilters.methods.join(",") : undefined,
            };

            const data = filterType === "INVOICE"
                ? await paymentService.listInvoicePayments(params)
                : await paymentService.listPayments(params);
            
            const results = data?.results || data || [];
            
            // Normalize: InvoicePayment has nested payment or flat Payment
            const normalized = results.map(item => item.payment || item);
            
            setPayments(filterType ? normalized.filter(p => p.payment_type === filterType) : normalized);

            // Sync global backend-computed aggregates
            if (data?.summary) {
                setSummary(data.summary);
            } else {
                // Safe fallback to locally computed totals if backend isn't present
                const localStats = normalized.reduce((acc, p) => {
                    const amt = parseFloat(p.amount || 0);
                    acc.total += amt;
                    acc.totalCount += 1;
                    if (p.status === "SUCCEEDED") {
                        acc.paid += amt;
                        acc.paidCount += 1;
                    } else if (p.status === "PENDING" || p.status === "PROCESSING") {
                        acc.pending += amt;
                        acc.pendingCount += 1;
                    } else {
                        acc.refunded_failed += amt;
                        acc.refunded_failed_count += 1;
                    }
                    const m = p.method || "OTHER";
                    acc.methods[m] = (acc.methods[m] || 0) + amt;
                    return acc;
                }, { total: 0, totalCount: 0, paid: 0, paidCount: 0, pending: 0, pendingCount: 0, refunded_failed: 0, refunded_failed_count: 0, methods: {} });
                setSummary(localStats);
            }
        } catch (err) {
            setError("Failed to load payment history.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitial();
    }, [filterType, activeFilters]);

    // Apply Filter Button Handler
    const handleApplyFilters = () => {
        if (draftFromDate && draftToDate && draftToDate < draftFromDate) {
            toast.error("To Date & Time cannot be earlier than From Date & Time.");
            return;
        }
        setActiveFilters({
            statuses: draftStatuses,
            methods: draftMethods,
            fromDate: draftFromDate,
            toDate: draftToDate
        });
    };

    // Reset Filters Button Handler
    const handleResetFilters = () => {
        setDraftStatuses([]);
        setDraftMethods([]);
        setDraftFromDate("");
        setDraftToDate("");
        setActiveFilters({
            statuses: [],
            methods: [],
            fromDate: "",
            toDate: ""
        });
    };

    return (
        <div className="space-y-6">
            {/* GST Dashboard Styling Top Filter Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex flex-col gap-4">
                    {/* Header line Toggler */}
                    <button
                        onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                        className="w-full flex items-center justify-between text-left focus:outline-none"
                        type="button"
                    >
                        <div className="flex items-center gap-2 text-slate-500">
                            <FaFilter size={12} className="text-slate-400" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-sans">Interactive Controls</span>
                        </div>
                        <div>
                            {isFilterExpanded ? (
                                <FaChevronUp size={10} className="text-slate-400" />
                            ) : (
                                <FaChevronDown size={10} className="text-slate-400" />
                            )}
                        </div>
                    </button>

                    {/* Filter Inputs Grid */}
                    {isFilterExpanded && (
                        <div className="flex flex-wrap items-end gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                            {/* Status dropdown */}
                            <MultiSelect
                                label="Payment Status"
                                options={STATUS_OPTIONS}
                                selectedValues={draftStatuses}
                                onChange={setDraftStatuses}
                                placeholder="All Statuses"
                            />

                            {/* Method dropdown */}
                            <MultiSelect
                                label="Payment Method"
                                options={METHOD_OPTIONS}
                                selectedValues={draftMethods}
                                onChange={setDraftMethods}
                                placeholder="All Methods"
                            />

                            {/* Calendar visual datetime-local fields (Date and Time both showing!) */}
                            <div className="flex items-center gap-2">
                                <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">From Date & Time</span>
                                    <input
                                        type="datetime-local"
                                        value={draftFromDate}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setDraftFromDate(val);
                                            if (draftToDate && val > draftToDate) {
                                                setDraftToDate(val);
                                            }
                                        }}
                                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100 transition-all cursor-pointer shadow-sm min-h-[38px]"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">To Date & Time</span>
                                    <input
                                        type="datetime-local"
                                        value={draftToDate}
                                        min={draftFromDate}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (draftFromDate && val < draftFromDate) {
                                                toast.error("To Date & Time cannot be earlier than From Date & Time.");
                                                setDraftToDate(draftFromDate);
                                            } else {
                                                setDraftToDate(val);
                                            }
                                        }}
                                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100 transition-all cursor-pointer shadow-sm min-h-[38px]"
                                    />
                                </div>
                            </div>

                            {/* Apply & Reset Buttons */}
                            <div className="flex items-center gap-2 h-[38px]">
                                <button
                                    type="button"
                                    onClick={handleApplyFilters}
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 h-full flex items-center justify-center min-w-[110px]"
                                >
                                    Apply Filters
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-all active:scale-95 h-full flex items-center justify-center min-w-[80px]"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* GST Dashboard Style Stats Cards (dynamic global totals from backend!) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <button
                    onClick={() => setIsStatsExpanded(!isStatsExpanded)}
                    className="w-full flex items-center justify-between text-left focus:outline-none"
                    type="button"
                >
                    <div className="flex items-center gap-2 text-slate-500">
                        <FaChartLine className="text-slate-400 text-xs" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-sans">Realization Summary</span>
                    </div>
                    <div>
                        {isStatsExpanded ? (
                            <FaChevronUp size={10} className="text-slate-400" />
                        ) : (
                            <FaChevronDown size={10} className="text-slate-400" />
                        )}
                    </div>
                </button>

                {isStatsExpanded && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Total Booked Volume</p>
                                <h3 className="text-xl font-black text-slate-900 tabular-nums">₹{summary.total.toLocaleString("en-IN")}</h3>
                            </div>
                            <div className="mt-3 flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse"></span>
                                {summary.totalCount} Payments
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">Paid & Realized</p>
                                <h3 className="text-xl font-black text-slate-900 tabular-nums">₹{summary.paid.toLocaleString("en-IN")}</h3>
                            </div>
                            <div className="mt-3 flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                {summary.paidCount} Cleared
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1">Outstanding / Pending</p>
                                <h3 className="text-xl font-black text-slate-900 tabular-nums">₹{summary.pending.toLocaleString("en-IN")}</h3>
                            </div>
                            <div className="mt-3 flex items-center gap-1.5 text-[9px] font-bold text-amber-500 uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                {summary.pendingCount} Awaiting
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600 mb-1">Refunded / Failed</p>
                                <h3 className="text-xl font-black text-slate-900 tabular-nums">₹{summary.refunded_failed.toLocaleString("en-IN")}</h3>
                            </div>
                            <div className="mt-3 flex items-center gap-1.5 text-[9px] font-bold text-rose-500 uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                {summary.refunded_failed_count} Unresolved
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Method Amount Summary Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <button
                    onClick={() => setIsMethodBreakdownExpanded(!isMethodBreakdownExpanded)}
                    className="w-full flex items-center justify-between text-left focus:outline-none"
                    type="button"
                >
                    <div className="flex items-center gap-2">
                        <FaChartPie className="text-slate-400 text-xs" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Method Realization breakdown</p>
                    </div>
                    <div>
                        {isMethodBreakdownExpanded ? (
                            <FaChevronUp size={10} className="text-slate-400" />
                        ) : (
                            <FaChevronDown size={10} className="text-slate-400" />
                        )}
                    </div>
                </button>
                
                {isMethodBreakdownExpanded && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        {Object.entries(METHOD_ICONS).map(([key, config]) => {
                            if (key === "OTHER") return null;
                            const val = summary.methods[key] || 0;
                            const IconComp = config.icon;
                            return (
                                <div key={key} className="flex items-center gap-2 px-3 py-2 bg-slate-50/70 rounded-xl border border-slate-100 hover:border-slate-300 transition-all duration-300">
                                    <div className={`w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                                        <IconComp className={`${config.color} text-xs`} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight truncate" title={config.label}>{config.label}</p>
                                        <p className="text-xs font-black text-slate-800 tabular-nums">₹{val.toLocaleString("en-IN")}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Payments List Section */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between pb-1">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{title}</h3>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{payments.length} Record(s)</span>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center gap-2 text-slate-400 text-sm py-12 bg-white rounded-2xl border border-slate-100">
                        <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                        <span className="font-semibold text-xs uppercase tracking-widest text-slate-400">Loading payments...</span>
                    </div>
                ) : error ? (
                    <p className="text-xs text-red-500 py-4">{error}</p>
                ) : payments.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 text-slate-400">
                        <FaMoneyBillWave className="mx-auto text-3xl mb-3 opacity-30 text-slate-400" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No payment records found.</p>
                        <p className="text-[10px] text-slate-400 mt-1">Try adjusting your filters above.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="space-y-2.5">
                            {payments.map((item, idx) => (
                                <PaymentRow key={item.id || idx} payment={item} onRefundSuccess={fetchInitial} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
