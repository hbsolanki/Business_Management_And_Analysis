import { useState, useEffect } from "react";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import api from "@/services/api";
import { 
  FaPlus, FaSearch, FaFilter, FaCalendarAlt, FaTrash, 
  FaChevronLeft, FaChevronRight, FaTag, FaFileInvoice, FaEye
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import BackButton from "@/components/shared/BackButton";

export default function ExpenseList() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchExpenses();
  }, [page, searchTerm]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/cost/expenses/?page=${page}&search=${searchTerm}`);
      setExpenses(res.data?.results || res.data || []);
      if (res.data?.count) {
        setTotalPages(Math.ceil(res.data.count / 10));
      } else {
        setTotalPages(1);
      }
    } catch (err) {
      setError("Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await api.delete(`/cost/expenses/${id}/`);
      toast.success("Expense record deleted");
      fetchExpenses();
    } catch (err) {
      toast.error("Failed to delete record");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <ProtectedHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <BackButton />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Shop Expenses</h1>
            <p className="text-slate-500 font-medium text-sm">Track non-product purchases and GST credits.</p>
          </div>
          <Link 
            to="/cost/expenses/add"
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg"
          >
            <FaPlus />
            New Purchase
          </Link>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by title or description..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border-none rounded-xl py-3 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Loading Records...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl text-center text-rose-600 font-bold">
            {error}
          </div>
        ) : expenses.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 p-12 rounded-3xl text-center">
            <h3 className="text-lg font-bold text-slate-900">No expenses found</h3>
            <p className="text-slate-500 mt-2">Record your first shop purchase to start tracking GST credits.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Purchase Info</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Tax (GST)</th>
                    <th className="px-6 py-4 text-right">Total Amount</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <p className="font-black text-slate-900">{e.title}</p>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                            <FaCalendarAlt size={10} />
                            {new Date(e.date).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm font-bold text-slate-600">
                        {e.category?.name || "Uncategorized"}
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-700">₹{e.tax_amount}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Rate: {e.tax_rate}%</p>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <p className="text-lg font-black text-slate-900">₹{e.total_amount}</p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleDelete(e.id)}
                            className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-30"
                >
                  <FaChevronLeft />
                </button>
                <span className="text-sm font-bold text-slate-600">Page {page} of {totalPages}</span>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-30"
                >
                  <FaChevronRight />
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
