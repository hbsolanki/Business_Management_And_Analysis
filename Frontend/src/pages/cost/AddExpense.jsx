import { useState, useEffect } from "react";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import api from "@/services/api";
import { FaSave, FaFileInvoice, FaTag, FaCalendarAlt, FaStore, FaPercent, FaCheckCircle, FaSpinner } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import BackButton from "@/components/shared/BackButton";

export default function AddExpense({ isEmbed = false, initialData = null, onComplete = null, id: propsId = null }) {
  const { id: routeId } = useParams();
  const id = propsId || routeId;
  const isEdit = !!id;
  
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    gst_rate: "0.00",
    itc_type: "INPUTS",
    date: new Date().toISOString().split('T')[0],
    category_id: "",
    branch_id: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, branchRes] = await Promise.all([
          api.get("/cost/category/"),
          api.get("/business/branch/")
        ]);
        setCategories(catRes.data?.results || catRes.data || []);
        setBranches(branchRes.data?.results || branchRes.data || []);

        if (isEdit) {
          const expRes = await api.get(`/cost/expenses/${id}/`);
          const exp = expRes.data;
          setFormData({
            title: exp.title || "",
            description: exp.description || "",
            amount: exp.amount || "",
            gst_rate: exp.gst_rate || "0.00",
            itc_type: exp.itc_type || "INPUTS",
            date: exp.date || new Date().toISOString().split('T')[0],
            category_id: exp.category?.id || exp.category_id || "",
            branch_id: exp.branch?.id || exp.branch_id || "",
          });
        } else if (initialData) {
          setFormData(prev => ({
            ...prev,
            ...initialData,
            category_id: initialData.category_id || "",
            branch_id: initialData.branch_id || "",
          }));
        }
      } catch (err) {
        console.error("Failed to fetch metadata", err);
      }
    };
    fetchData();
  }, [id, isEdit, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      
      if (name === "category_id") {
        const selectedCat = categories.find(c => String(c.id) === String(value));
        if (selectedCat && selectedCat.gst_rate) {
          newData.gst_rate = selectedCat.gst_rate;
        }
      }
      
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        branch_id: formData.branch_id || null,
        category_id: formData.category_id || null,
      };

      let response;
      if (isEdit) {
        response = await api.patch(`/cost/expenses/${id}/`, payload);
        toast.success("Expense updated successfully!");
      } else {
        response = await api.post("/cost/expenses/", payload);
        toast.success("Purchase recorded successfully!");
      }
      
      if (isEmbed && onComplete) {
        onComplete(response.data || response);
      } else {
        navigate(-1);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to record purchase");
    } finally {
      setLoading(false);
    }
  };

  const amount = Number(formData.amount || 0);
  const taxRate = Number(formData.gst_rate || 0);
  const gstAmount = (amount * taxRate) / 100;
  const totalWithTax = (amount + gstAmount).toFixed(2);

  const ITC_OPTIONS = [
    { id: "INPUTS", label: "Inputs (Goods)", icon: <FaTag /> },
    { id: "INPUT_SERVICES", label: "Services", icon: <FaFileInvoice /> },
    { id: "CAPITAL_GOODS", label: "Capital Goods", icon: <FaStore /> },
  ];

  const formContent = (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      <div className="xl:col-span-8 space-y-5">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
           <div className="p-5 space-y-6">
              <div className="space-y-3">
                 <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-4 flex items-center gap-2">
                   <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-[11px]">01</span> Basic Configuration
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Asset Nomenclature</label>
                    <input
                      required name="title" value={formData.title} onChange={handleChange}
                      placeholder="e.g. Server Rack"
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 px-3.5 text-sm font-bold text-slate-900 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all placeholder:text-slate-300"
                    />
                  </div>
                   <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Purchase Epoch</label>
                    <div className="relative group">
                       <FaCalendarAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-800 transition" size={12} />
                       <input
                         required type="date" name="date" value={formData.date} onChange={handleChange}
                         className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 pl-9 pr-3.5 text-sm font-bold text-slate-900 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all"
                       />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                 <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-3 flex items-center gap-2">
                   <span className="w-5 h-5 rounded bg-slate-100 text-slate-400 flex items-center justify-center text-[10px]">02</span> Financial Analysis
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Base Valuation</label>
                    <div className="relative group">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xs group-focus-within:text-slate-800 transition">₹</span>
                      <input
                        required type="number" step="0.01" name="amount" value={formData.amount} onChange={handleChange}
                        placeholder="0.00"
                        className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 pl-8 pr-3.5 text-sm font-bold text-slate-900 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all tabular-nums"
                      />
                    </div>
                  </div>
                   <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tax Variable (%)</label>
                    <div className="relative group">
                       <FaPercent className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-800 transition" size={11} />
                       <input
                         type="number" step="0.01" name="gst_rate" value={formData.gst_rate} onChange={handleChange}
                         className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 pl-8 pr-3.5 text-sm font-bold text-slate-900 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all tabular-nums"
                       />
                    </div>
                  </div>
                   <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">GST Delta</label>
                    <div className="h-[38px] flex items-center justify-end px-3.5 bg-slate-800 rounded-lg border border-slate-700 shadow-inner">
                       <span className="text-white/30 font-black text-[10px] mr-1.5">₹</span>
                       <span className="text-white font-black text-sm tabular-nums">{gstAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                 <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-3 flex items-center gap-2">
                   <span className="w-5 h-5 rounded bg-slate-100 text-slate-400 flex items-center justify-center text-[10px]">03</span> ITC Categorization
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                   {ITC_OPTIONS.map((option) => (
                     <button
                       key={option.id}
                       type="button"
                       onClick={() => setFormData(prev => ({ ...prev, itc_type: option.id }))}
                       className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all ${
                         formData.itc_type === option.id 
                         ? "bg-slate-800 border-slate-800 text-white shadow-md" 
                         : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                       }`}
                     >
                        <span className={`text-xs ${formData.itc_type === option.id ? "text-white" : "text-slate-200"}`}>{option.icon}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest truncate">{option.label}</span>
                     </button>
                   ))}
                </div>
              </div>

               <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Audit Trail / Notes</label>
                <textarea
                  name="description" value={formData.description} onChange={handleChange}
                  placeholder="Enter supplemental details..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 px-3.5 text-sm font-medium text-slate-900 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all resize-none placeholder:text-slate-300"
                ></textarea>
              </div>
           </div>
        </section>
      </div>

      <aside className="xl:col-span-4 space-y-5">
         <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
             <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-3">Business Context</h3>
            
            <div className="space-y-4">
               <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Accounting Category</label>
                 <div className="relative group">
                    <FaTag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-800 transition" size={11} />
                   <select
                     name="category_id" value={formData.category_id} onChange={handleChange}
                     className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 pl-9 pr-3.5 text-sm font-bold text-slate-900 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all cursor-pointer appearance-none"
                   >
                     <option value="">One-time General Expense</option>
                     {categories.map(c => <option key={c.id} value={c.id}>{c.display_name || c.name}</option>)}
                   </select>
                </div>
              </div>

               <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cost Center (Branch)</label>
                <div className="relative group">
                   <FaStore className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-800 transition" size={11} />
                   <select
                     name="branch_id" value={formData.branch_id} onChange={handleChange}
                     className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 pl-9 pr-3.5 text-sm font-bold text-slate-900 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all cursor-pointer appearance-none"
                   >
                     <option value="">Corporate / General Expense</option>
                     {branches.map(b => (
                       <option key={b.id} value={b.id}>{b.name}</option>
                     ))}
                   </select>
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-50 space-y-2.5">
               <button 
                type="submit" disabled={loading}
                className="w-full bg-slate-800 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-700 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2.5"
              >
                {loading ? <FaSpinner className="animate-spin" /> : <><FaSave size={10} /> {isEdit ? "Update Expense" : "Commit Purchase"}</>}
              </button>
               {!isEmbed && (
                 <button 
                  type="button" onClick={() => navigate(-1)}
                  className="w-full py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all"
                >
                  Discard Transaction
                </button>
               )}
            </div>
         </section>

         <div className="bg-slate-800 rounded-2xl p-5 text-white shadow-xl shadow-slate-200">
             <div className="flex items-center gap-2.5 mb-3.5">
                <FaCheckCircle className="text-white/40" size={14} />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-white/50">Compliance Monitor</h4>
             </div>
             <p className="text-xs font-medium text-white/70 leading-relaxed">
                Categorizing as <span className="text-white font-black">Capital Goods</span> automates the fixed asset registry entry and ITC claim logic for the next filing period.
             </p>
         </div>
      </aside>
    </form>
  );

  if (isEmbed) return formContent;

  return (
    <div className="min-h-screen bg-slate-50/30 pb-12">
      <ProtectedHeader />
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-4">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
             <BackButton label="Back" />
             <div className="mt-2 flex items-center gap-2">
                 <div className="h-10 w-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-lg shadow-slate-200">
                    <FaFileInvoice size={16} />
                 </div>
                 <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">{isEdit ? "Modify Expense details" : "Record Asset Purchase"}</h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5">GSTR Compliance & ITC Integration</p>
                 </div>
             </div>
          </div>
          
          <div className="hidden md:flex items-center gap-4 bg-white px-5 py-3 rounded-xl border border-slate-100 shadow-sm">
             <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">Fiscal Impact</p>
                <p className="text-xl font-black text-slate-900 tabular-nums">₹{Number(totalWithTax).toLocaleString()}</p>
             </div>
          </div>
        </div>

        {formContent}
      </main>
    </div>
  );
}
