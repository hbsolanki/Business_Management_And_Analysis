import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    FaFileDownload,
    FaArrowLeft,
    FaCalendarAlt,
    FaCheckSquare,
    FaSquare,
    FaBox,
    FaMoneyBillWave,
    FaChartLine,
    FaExchangeAlt,
    FaShoppingCart,
    FaFileExport,
    FaTags,
    FaSearch,
    FaTimes,
    FaCheck,
    FaArrowLeft as ArrowLeftIcon,
    FaFileDownload as DownloadIcon,
    FaCalendarAlt as CalendarIcon,
    FaFileInvoiceDollar,
    FaSpinner
} from 'react-icons/fa';
import ProtectedHeader from '@/components/layout/ProtectedHeader';
import api from '@/services/api';
import { tokenService } from '@/services/tokenService';

const REPORT_TYPE_CHOICES = [
    { value: 'product', label: 'Product Performance', icon: FaBox },
    { value: 'inventory', label: 'Inventory', icon: FaBox },
    { value: 'cost', label: 'Costs', icon: FaMoneyBillWave },
    { value: 'gst', label: 'GST Compliance', icon: FaFileInvoiceDollar },
    { value: 'purchase_order', label: 'Purchase Orders', icon: FaShoppingCart }
];

const getTodayFormatted = () => new Date().toISOString().split('T')[0];

const getPresetDates = (preset) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
        case 'current_month':
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = today;
            break;
        case 'last_month':
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            end = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
        case 'last_3_months':
            start = new Date(today.getFullYear(), today.getMonth() - 3, 1);
            end = today;
            break;
        default:
            break;
    }

    const format = (d) => new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    return { start_date: format(start), end_date: format(end) };
};

function MultiSelectAsync({ label, placeholder, fetchOptions, selectedIds, onChange, optionLabelKey = 'name', optionValueKey = 'id' }) {
    const [query, setQuery] = useState("");
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [selectedObjects, setSelectedObjects] = useState([]);

    useEffect(() => {
        loadOptions("");
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadOptions(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadOptions = async (searchQuery) => {
        setLoading(true);
        try {
            const data = await fetchOptions(searchQuery);
            setOptions(data || []);
        } catch (error) {
            console.error("Failed to fetch options for", label, error);
            setOptions([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (option) => {
        const id = option[optionValueKey];
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter(val => val !== id));
            setSelectedObjects(prev => prev.filter(o => o[optionValueKey] !== id));
        } else {
            onChange([...selectedIds, id]);
            setSelectedObjects(prev => [...prev, option]);
        }
    };

    const removeSelection = (id, e) => {
        e.stopPropagation();
        onChange(selectedIds.filter(val => val !== id));
        setSelectedObjects(prev => prev.filter(o => o[optionValueKey] !== id));
    };

    const displayLabels = useMemo(() => {
        return selectedIds.map(id => {
            const currentObj = selectedObjects.find(o => o[optionValueKey] === id);
            return currentObj ? currentObj[optionLabelKey] : `ID: ${id}`;
        });
    }, [selectedIds, selectedObjects]);

    return (
        <div className="relative" ref={dropdownRef}>
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ml-1 transition-colors duration-200 ${isOpen ? 'text-slate-900' : 'text-slate-500'}`}>
                {label}
            </label>

            <div
                onClick={() => setIsOpen(true)}
                className={`w-full min-h-[44px] px-3 py-2 bg-slate-50 border rounded-xl cursor-text flex flex-wrap gap-1.5 items-center transition-all duration-150 ${isOpen ? 'border-slate-900 ring-4 ring-slate-900/5 bg-white' : 'border-slate-200 hover:border-slate-300'}`}
            >
                {selectedIds.map((id, idx) => (
                    <span
                        key={id}
                        className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-1 rounded-lg border border-slate-200"
                    >
                        {displayLabels[idx]}
                        <button
                            type="button"
                            onClick={(e) => removeSelection(id, e)}
                            className="text-slate-400 hover:text-rose-600 transition-colors"
                        >
                            <FaTimes size={10} />
                        </button>
                    </span>
                ))}

                <input
                    type="text"
                    value={query}
                    placeholder={selectedIds.length === 0 ? placeholder : 'Search...'}
                    onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                    className="flex-1 min-w-[100px] bg-transparent text-sm text-slate-800 font-semibold placeholder:text-slate-400 py-0.5 outline-none border-none shadow-none"
                />

                <div className={`shrink-0 pointer-events-none transition-colors duration-150 ${isOpen ? 'text-slate-900' : 'text-slate-400'}`}>
                    {loading
                        ? <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                        : <FaSearch size={12} />
                    }
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/60 overflow-hidden">
                    <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                        {loading && options.length === 0 ? (
                            <div className="flex items-center justify-center gap-2.5 py-8">
                                <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                                <span className="text-xs text-slate-500 font-bold">Fetching results...</span>
                            </div>
                        ) : options.length > 0 ? (
                            options.map((option) => {
                                const id = option[optionValueKey];
                                const labelText = option[optionLabelKey];
                                const isSelected = selectedIds.includes(id);
                                return (
                                    <div
                                        key={id}
                                        onClick={() => toggleSelection(option)}
                                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer select-none transition-colors duration-100 ${isSelected
                                            ? 'bg-slate-900 text-white'
                                            : 'hover:bg-slate-50'
                                            }`}
                                    >
                                        <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                                            {labelText}
                                        </span>
                                        {isSelected && <FaCheck className="text-white shrink-0" size={10} />}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center gap-1 py-8">
                                <FaSearch size={16} className="text-slate-200 mb-1" />
                                <p className="text-sm font-bold text-slate-500">No results found</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AnalyticsReportGenerator({ isEmbed = false, onComplete }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isEmbed) {
            const role = tokenService.getRole();
            const normalizedRole = role ? role.toUpperCase() : "";
            if (normalizedRole !== "OWNER" && normalizedRole !== "MANAGER") {
                toast.error("Unauthorized access. This area is reserved for Management.");
                navigate('/analytics', { replace: true });
            }
        }
    }, [navigate, isEmbed]);

    const defaultDates = getPresetDates('last_month');
    const [reportTypes, setReportTypes] = useState([]);
    const [dates, setDates] = useState({
        start_date: defaultDates.start_date,
        end_date: defaultDates.end_date
    });
    const [activePreset, setActivePreset] = useState('last_month');

    const [filterIds, setFilterIds] = useState({
        product_ids: [],
        branch_ids: []
    });

    const fetchProducts = async (searchQuery) => {
        const params = searchQuery ? { name: searchQuery, limit: 10 } : { limit: 10 };
        const res = await api.get('/product/', { params });
        return Array.isArray(res.data?.results) ? res.data.results : res.data;
    };

    const fetchBranches = async (searchQuery) => {
        const params = searchQuery ? { name: searchQuery, limit: 10 } : { limit: 10 };
        const res = await api.get('/business/branch/', { params });
        return Array.isArray(res.data?.results) ? res.data.results : res.data;
    };

    const handleReportTypeToggle = (value) => {
        setReportTypes(prev =>
            prev.includes(value)
                ? prev.filter(t => t !== value)
                : [...prev, value]
        );
    };

    const handleSelectAll = () => {
        if (reportTypes.length === REPORT_TYPE_CHOICES.length) {
            setReportTypes([]);
        } else {
            setReportTypes(REPORT_TYPE_CHOICES.map(c => c.value));
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();

        if (reportTypes.length === 0) {
            toast.error("Please select at least one Report Type.");
            return;
        }

        if (!dates.start_date || !dates.end_date) {
            toast.error("Start and End Date are required.");
            return;
        }

        const payload = {
            report_type: reportTypes.length > 0 ? reportTypes : undefined,
            start_date: dates.start_date,
            end_date: dates.end_date,
        };

        if (filterIds.product_ids.length > 0) {
            payload.product_ids = filterIds.product_ids;
        }

        if (filterIds.branch_ids.length > 0) {
            payload.branch_ids = filterIds.branch_ids;
        }

        try {
            setLoading(true);
            await api.post('/analytics/report/generate/', payload);
            toast.success("Report generation started! It will be sent to your email in 5 to 10 minutes.");
            if (onComplete) onComplete({ success: true, message: "Report generation started." });
            const defaultDates = getPresetDates('last_month');
            setReportTypes([]);
            setDates({ start_date: defaultDates.start_date, end_date: defaultDates.end_date });
            setActivePreset('last_month');
            setFilterIds({ product_ids: [], branch_ids: [] });
        } catch (error) {
            console.error("Report generation failed:", error);
            const msg = error.response?.data?.message || error.response?.data?.detail || "Failed to generate report. Please check your inputs.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const innerContent = (
        <div className={`space-y-4 ${isEmbed ? 'p-6' : 'max-w-4xl mx-auto px-4 pt-6'}`}>
          {!isEmbed && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden relative">
              <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
              </div>
              
              <div className="relative z-10">
                <button
                    onClick={() => navigate('/analytics')}
                    className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all mb-3 group"
                >
                    <ArrowLeftIcon size={10} className="transition-transform group-hover:-translate-x-1" />
                    Return to Analytics
                </button>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-900 rounded-xl text-white flex items-center justify-center shadow-md">
                        <FaFileExport size={16} />
                    </div>
                    Report Dispatch Center
                </h1>
                <p className="text-slate-400 text-[11px] font-medium mt-1.5 ml-0.5">
                    Generate enterprise intelligence reports and automated data exports.
                </p>
              </div>
            </div>
          )}

          {isEmbed && (
              <div className="mb-6">
                <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <div className="h-8 w-8 bg-slate-900 rounded-xl text-white flex items-center justify-center shadow-md">
                        <FaFileExport size={12} />
                    </div>
                    Report Generator
                </h1>
                <p className="text-slate-400 text-[10px] font-medium mt-1.5 ml-0.5 uppercase tracking-widest">
                    Automated data exports
                </p>
              </div>
          )}

          <form onSubmit={handleGenerate} className="space-y-4">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-50 pb-3">
                  <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <CalendarIcon className="text-slate-400" size={12} />
                      Time Period <span className="text-rose-500">*</span>
                  </h2>
                  <div className="flex flex-wrap bg-slate-100 p-1 rounded-lg border border-slate-200/50 gap-1">
                      {['current_month', 'last_month', 'last_3_months', 'custom'].map(presetId => (
                          <button
                              key={presetId}
                              type="button"
                              onClick={() => {
                                  setActivePreset(presetId);
                                  if (presetId !== 'custom') setDates(getPresetDates(presetId));
                              }}
                              className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all whitespace-nowrap ${activePreset === presetId ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                              {presetId.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
                          </button>
                      ))}
                  </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Reporting From</label>
                      <input
                          type="date"
                          required
                          max={getTodayFormatted()}
                          value={dates.start_date}
                          onChange={(e) => { setActivePreset('custom'); setDates({ ...dates, start_date: e.target.value }); }}
                          className="w-full px-3 py-2 text-sm font-bold bg-slate-50 border border-slate-100 rounded-xl focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all outline-none"
                      />
                  </div>
                  <div className="space-y-1.5">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Reporting To</label>
                      <input
                          type="date"
                          required
                          max={getTodayFormatted()}
                          value={dates.end_date}
                          onChange={(e) => { setActivePreset('custom'); setDates({ ...dates, end_date: e.target.value }); }}
                          className="w-full px-3 py-2 text-sm font-bold bg-slate-50 border border-slate-100 rounded-xl focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all outline-none"
                      />
                  </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                  <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <FaTags className="text-slate-400" size={12} />
                      Report Types <span className="text-rose-500">*</span>
                  </h2>
                  <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors px-2.5 py-1 rounded-md bg-slate-50 border border-slate-100"
                  >
                      {reportTypes.length === REPORT_TYPE_CHOICES.length ? 'Clear Selection' : 'Select All'}
                  </button>
              </div>
              <div className={`grid grid-cols-1 ${isEmbed ? '' : 'sm:grid-cols-2 lg:grid-cols-3'} gap-2.5`}>
                  {REPORT_TYPE_CHOICES.map(choice => {
                      const isSelected = reportTypes.includes(choice.value);
                      return (
                          <button
                              key={choice.value}
                              type="button"
                              onClick={() => handleReportTypeToggle(choice.value)}
                              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${isSelected ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                          >
                              <div className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${isSelected ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-400'}`}>
                                  <choice.icon size={12} />
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-left truncate">{choice.label}</span>
                              {isSelected && <FaCheck className="ml-auto text-white" size={10} />}
                          </button>
                      );
                  })}
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 relative z-20">
              <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-50 pb-3">
                  <FaSearch className="text-slate-400" size={12} />
                  Filtering Scope <span className="text-[9px] font-bold text-slate-300 ml-auto">Optional</span>
              </h2>
              <div className={`grid grid-cols-1 ${isEmbed ? '' : 'md:grid-cols-2'} gap-5`}>
                  <MultiSelectAsync
                      label="Specific Products"
                      placeholder="All items included..."
                      fetchOptions={fetchProducts}
                      onChange={(ids) => setFilterIds({ ...filterIds, product_ids: ids })}
                      selectedIds={filterIds.product_ids}
                      optionLabelKey="name"
                      optionValueKey="id"
                  />
                  <MultiSelectAsync
                      label="Target Branches"
                      placeholder="All branches included..."
                      fetchOptions={fetchBranches}
                      onChange={(ids) => setFilterIds({ ...filterIds, branch_ids: ids })}
                      selectedIds={filterIds.branch_ids}
                      optionLabelKey="name"
                      optionValueKey="id"
                  />
              </div>
            </section>

            <div className="pt-2 pb-32 flex flex-col items-center gap-4">
              <button
                  type="submit"
                  disabled={loading}
                  className={`w-full ${isEmbed ? '' : 'sm:w-auto px-12'} py-3 rounded-xl bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2.5`}
              >
                  {loading ? <FaSpinner className="animate-spin" /> : <DownloadIcon size={12} />}
                  {loading ? "Generating Intelligent Report..." : "Generate & Dispatch Intelligence"}
              </button>

              <div className="w-full bg-white rounded-xl p-3.5 border border-slate-100 shadow-sm">
                  <div className="flex gap-3 items-start">
                      <div className="h-6 w-6 rounded-lg bg-slate-50 text-slate-300 flex items-center justify-center shrink-0 border border-slate-100">
                          <FaFileDownload size={10} />
                      </div>
                      <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                          <span className="text-slate-900 font-bold uppercase tracking-wider block mb-0.5">Automated Dispatch</span>
                          Processing usually completes in <span className="text-slate-800 font-bold">5-10 minutes</span>. Report link will be dispatched to your registered management email.
                      </p>
                  </div>
              </div>
            </div>
          </form>
        </div>
    );

    if (isEmbed) {
        return innerContent;
    }

    return (
        <div className="min-h-screen bg-slate-50/30 pb-12">
            <ProtectedHeader />
            {innerContent}
        </div>
    );
}
