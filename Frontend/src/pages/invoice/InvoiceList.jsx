import {
  useEffect,
  useState,
  useCallback,
  useRef,
  lazy,
  Suspense,
  useMemo,
} from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { invoiceService } from "@/features/invoice/services/invoiceService";
import { branchService } from "@/features/business/services/branchService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import {
  FaFileInvoice,
  FaPlus,
  FaTimes,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaCreditCard,
  FaBox,
  FaCodeBranch,
} from "react-icons/fa";

// Lazy Load the Card Component
const InvoiceCard = lazy(() => import("./components/InvoiceCard"));
const PaymentModal = lazy(
  () => import("@/features/payment/components/PaymentModal"),
);

const today = new Date().toISOString().split("T")[0];

const resolveBranchId = (branch) => {
  if (!branch && branch !== 0) return null;
  if (typeof branch === "object") {
    return branch.id ?? branch.branch_id ?? null;
  }
  return branch;
};

const resolveAssignedBranches = (profile) => {
  if (!profile) return [];

  const collected = [];

  const pushBranch = (value) => {
    const id = resolveBranchId(value);
    if (!id && id !== 0) return;

    const source = typeof value === "object" ? value : null;
    collected.push({
      id: String(id),
      name: source?.name || source?.branch_name || `Branch #${id}`,
      is_default: Boolean(source?.is_default),
    });
  };

  // Primary: assigned_branches (new API structure)
  if (
    Array.isArray(profile.assigned_branches) &&
    profile.assigned_branches.length > 0
  ) {
    profile.assigned_branches.forEach(pushBranch);
  } else {
    // Legacy fallbacks
    if (Array.isArray(profile.branches)) profile.branches.forEach(pushBranch);
    if (Array.isArray(profile.branch_ids))
      profile.branch_ids.forEach(pushBranch);
    if (profile.branch || profile.branch === 0) pushBranch(profile.branch);
    if (profile.branch_id || profile.branch_id === 0)
      pushBranch(profile.branch_id);
  }

  const seen = new Set();
  return collected.filter((branch) => {
    if (seen.has(branch.id)) return false;
    seen.add(branch.id);
    return true;
  });
};

/* ---------------- Component ---------------- */

export default function InvoiceList() {
  const { profile } = useSelector((state) => state.user);
  const userRole = String(
    typeof profile?.role === "object"
      ? profile?.role?.role
      : profile?.role || "",
  ).toUpperCase();
  const isRestrictedRole = userRole === "MANAGER" || userRole === "EMPLOYEE";
  const assignedBranches = useMemo(
    () => resolveAssignedBranches(profile),
    [profile],
  );
  const [invoices, setInvoices] = useState([]);
  const [nextUrl, setNextUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  /* -------- UI Inputs -------- */
  const [mobileInput, setMobileInput] = useState("");
  const [fromDateInput, setFromDateInput] = useState("");
  const [toDateInput, setToDateInput] = useState("");
  const [branches, setBranches] = useState([]);
  const [selectedBranchInput, setSelectedBranchInput] = useState("");
  const [fetchingBranches, setFetchingBranches] = useState(false);

  /* -------- Applied Filters (API) -------- */
  const [filters, setFilters] = useState({
    mobile_number: "",
    from_date: "",
    to_date: "",
    branch: "",
  });

  /* -------- Lock -------- */
  const fetchingRef = useRef(false);

  /* ---------------- Build URL ---------------- */

  const buildInitialUrl = useCallback(() => {
    if (!filters.branch) return null;
    const params = new URLSearchParams();

    if (filters.mobile_number)
      params.append("mobile_number", filters.mobile_number);
    if (filters.from_date) params.append("from_date", filters.from_date);
    if (filters.to_date) params.append("to_date", filters.to_date);
    if (filters.branch) params.append("branch", filters.branch);

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
      const res = url.startsWith("http")
        ? await invoiceService.getByUrl(url)
        : await invoiceService.getAll(url);
      const data = res.data;

      setInvoices((prev) =>
        reset ? data.results : [...prev, ...data.results],
      );

      setNextUrl(data.next);
      setHasMore(Boolean(data.next));
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Failed to load invoices";
      setError(errorMsg);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  const refreshInvoiceList = useCallback(() => {
    const url = buildInitialUrl();
    if (url === null) return;
    setInvoices([]);
    setNextUrl(null);
    setHasMore(true);
    fetchInvoices(url, true);
  }, [buildInitialUrl, fetchInvoices]);

  /* ---------------- Initial Load / Filter Apply ---------------- */

  useEffect(() => {
    refreshInvoiceList();
  }, [filters, refreshInvoiceList]);

  /* ---------------- Branch Fetch ---------------- */

  useEffect(() => {
    async function fetchBranches() {
      setFetchingBranches(true);
      try {
        const res = await branchService.list();
        const branchData = Array.isArray(res.data)
          ? res.data
          : res.data?.results || [];

        if (isRestrictedRole) {
          const assignedIds = new Set(
            assignedBranches.map((branch) => String(branch.id)),
          );
          const visibleBranches =
            assignedIds.size > 0
              ? branchData.filter((branch) =>
                  assignedIds.has(String(branch.id)),
                )
              : branchData;

          const resolvedBranches =
            visibleBranches.length > 0 ? visibleBranches : assignedBranches;

          setBranches(resolvedBranches);

          const preferredBranch =
            resolvedBranches.find((branch) => branch.is_default) ||
            resolvedBranches[0];
          const branchValue = preferredBranch ? String(preferredBranch.id) : "";
          setSelectedBranchInput(branchValue);
          setFilters((prev) => ({ ...prev, branch: branchValue }));
          return;
        }

        setBranches(branchData);
        const mainBranch =
          branchData.find((branch) => branch.is_default) || branchData[0];
        const branchValue = mainBranch ? String(mainBranch.id) : "";
        setSelectedBranchInput(branchValue);
        setFilters((prev) => ({ ...prev, branch: branchValue }));
      } catch (err) {
        console.error("Failed to fetch branches", err);
      } finally {
        setFetchingBranches(false);
      }
    }
    fetchBranches();
  }, [isRestrictedRole, assignedBranches]);

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
      branch: selectedBranchInput,
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
      setViewModal({
        isOpen: true,
        loading: false,
        error: null,
        data: res.data,
      });
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Failed to load invoice";
      setViewModal({
        isOpen: true,
        loading: false,
        error: errorMsg,
        data: null,
      });
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
              <p className="text-slate-500 font-medium">
                Track and manage your billing efficiently
              </p>
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
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 uppercase tracking-wider">
              Search
            </label>
            <div className="relative">
              <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Mobile Number..."
                value={mobileInput}
                onChange={(e) => setMobileInput(e.target.value)}
                className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-sm border border-slate-200 focus:ring-2 focus:ring-slate-100 focus:border-slate-400 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 uppercase tracking-wider">
              Branch
            </label>
            <div className="relative">
              <FaCodeBranch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
              <select
                value={selectedBranchInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedBranchInput(val);
                }}
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 transition-all appearance-none cursor-pointer disabled:bg-slate-50 disabled:text-slate-500"
                disabled={
                  fetchingBranches || (isRestrictedRole && branches.length <= 1)
                }
              >
                <option value="">
                  {fetchingBranches ? "Loading branches..." : "Select Branch"}
                </option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.is_default ? "(Main)" : ""}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
            {isRestrictedRole && !fetchingBranches && branches.length === 0 && (
              <p className="mt-2 text-xs font-medium text-rose-600">
                No branch is assigned to your account.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 uppercase tracking-wider">
              From Date
            </label>
            <div className="relative">
              <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
              <input
                type="date"
                max={today}
                value={fromDateInput}
                onChange={(e) => {
                  setFromDateInput(e.target.value);
                  setToDateInput("");
                }}
                className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-sm border border-slate-200 focus:ring-2 focus:ring-slate-100 focus:border-slate-400 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 uppercase tracking-wider">
              To Date
            </label>
            <div className="relative">
              <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
              <input
                type="date"
                min={fromDateInput || undefined}
                max={today}
                disabled={!fromDateInput}
                value={toDateInput}
                onChange={(e) => setToDateInput(e.target.value)}
                className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-sm border border-slate-200 disabled:bg-slate-50 focus:ring-2 focus:ring-slate-100 focus:border-slate-400 outline-none transition-all"
              />
            </div>
          </div>

          <button
            onClick={handleGo}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-md shadow-slate-200 h-[42px]"
          >
            Apply Filters
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="text-red-700 bg-red-50 border border-red-200 p-4 rounded-xl text-center font-medium">
            {error}
          </div>
        )}

        {/* Invoices List */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {invoices.length === 0 && !loading && (
            <div className="bg-white border border-dashed border-slate-200 text-center py-20 rounded-3xl">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                <FaFileInvoice className="text-slate-400 text-2xl" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                No invoices found
              </h3>
              <p className="text-slate-500">
                Create a new invoice to get started
              </p>
            </div>
          )}

          <Suspense
            fallback={
              <div className="text-center py-10">
                <div className="animate-pulse bg-slate-100 h-32 w-full rounded-2xl"></div>
              </div>
            }
          >
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
            <span className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold text-slate-500 uppercase tracking-widest">
              End of list
            </span>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <Suspense fallback={null}>
        <PaymentModal
          isOpen={paymentModal.isOpen}
          onClose={() =>
            setPaymentModal((prev) => ({ ...prev, isOpen: false }))
          }
          invoiceId={paymentModal.invoiceId}
          amount={paymentModal.amount}
          onPaymentSuccess={() => {
            refreshInvoiceList();
          }}
        />
      </Suspense>

      {viewModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Invoice Details
                </h3>
                <p className="text-xs text-slate-500">
                  Full information from the invoice record
                </p>
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
                        <div className="font-semibold text-slate-900">
                          {viewModal.data.customer?.id ? (
                            <Link
                              to={`/customer/${viewModal.data.customer.id}`}
                              className="text-sky-700 hover:text-sky-800 underline underline-offset-2"
                            >
                              {viewModal.data.customer?.name || "N/A"}
                            </Link>
                          ) : (
                            viewModal.data.customer?.name || "N/A"
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <FaPhone size={10} />{" "}
                          {viewModal.data.customer?.mobile_number || "N/A"}
                        </div>
                        {viewModal.data.customer?.email && (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <FaEnvelope size={10} />{" "}
                            {viewModal.data.customer?.email}
                          </div>
                        )}
                        {viewModal.data.customer?.address && (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <FaMapMarkerAlt size={10} />{" "}
                            {viewModal.data.customer?.address}
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
                        <div className="font-mono font-semibold text-slate-900">
                          #{viewModal.data.id}
                        </div>
                        <div className="text-xs text-slate-500">Created By</div>
                        <div className="font-semibold text-slate-900">
                          {viewModal.data.created_by ? (
                            <Link
                              to={`/profile/${viewModal.data.created_by}`}
                              className="text-sky-700 hover:text-sky-800 underline underline-offset-2"
                            >
                              {viewModal.data.created_by_name || "View Profile"}
                            </Link>
                          ) : (
                            "N/A"
                          )}
                        </div>
                        <div className="text-xs text-slate-500">Created At</div>
                        <div>
                          {viewModal.data.created_at
                            ? new Date(
                                viewModal.data.created_at,
                              ).toLocaleString()
                            : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <FaBox className="text-slate-500" /> Items
                    </h4>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {(viewModal.data.invoice_items || []).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-sm border-b border-slate-100 pb-2"
                        >
                          <div>
                            <div className="font-semibold text-slate-900">
                              {item.product?.name || "Product"}
                            </div>
                            <div className="text-xs text-slate-500">
                              Qty: {item.quantity}
                            </div>
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
                        {viewModal.data.total_amount
                          ? `₹${viewModal.data.total_amount}`
                          : "N/A"}
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
