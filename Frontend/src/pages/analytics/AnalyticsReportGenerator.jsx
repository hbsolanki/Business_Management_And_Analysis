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
    FaShoppingCart
} from 'react-icons/fa';
import { FaArrowLeft as ArrowLeftIcon, FaFileDownload as DownloadIcon, FaFileExport, FaTags, FaCalendarAlt as CalendarIcon, FaSearch, FaTimes, FaCheck } from 'react-icons/fa';
import ProtectedHeader from '@/components/layout/ProtectedHeader';
import api from '@/services/api';
import { tokenService } from '@/services/tokenService';

const shimmerStyles = ""; // Removed experimental shimmer

const REPORT_TYPE_CHOICES = [
    { value: 'product', label: 'Product Performance', icon: FaBox },
    { value: 'inventory', label: 'Inventory', icon: FaBox },
    { value: 'cost', label: 'Costs', icon: FaMoneyBillWave },
    { value: 'purchase_order', label: 'Purchase Orders', icon: FaShoppingCart }
];

// Function to get today's date formatted as YYYY-MM-DD
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

    // adjust for local timezone offset
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
        <div className="relative group/multi" ref={dropdownRef}>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 ml-1 transition-colors group-focus-within/multi:text-brand-600 font-sans">
                {label}
            </label>
            <div
                onClick={() => setIsOpen(true)}
                className="w-full min-h-[52px] px-2 py-3 border-b border-slate-200 focus-within:border-brand-500 transition-all bg-transparent cursor-text flex flex-wrap gap-x-3 gap-y-2 items-center relative pr-8"
            >
                {selectedIds.length === 0 && !query && (
                    <span className="text-slate-400 absolute left-2 pointer-events-none select-none font-medium text-sm">
                        {placeholder}
                    </span>
                )}

                {selectedIds.map((id, idx) => (
                    <div
                        key={id}
                        className="flex items-center gap-2 bg-brand-50 text-brand-700 px-3 py-1 rounded-lg text-[11px] font-bold border border-brand-100 animate-in fade-in zoom-in duration-200"
                    >
                        {displayLabels[idx]}
                        <button
                            type="button"
                            onClick={(e) => removeSelection(id, e)}
                            className="text-brand-400 hover:text-brand-600 transition-colors ml-1"
                        >
                            <FaTimes size={8} />
                        </button>
                    </div>
                ))}

                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-slate-900 z-10 font-bold placeholder:text-slate-300"
                />

                <div className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/multi:text-brand-500 transition-colors pointer-events-none">
                    <FaSearch size={12} />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-3 bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] max-h-72 overflow-y-auto animate-in slide-in-from-top-4 duration-500 ring-1 ring-black/5">
                    {loading && options.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500 flex flex-col items-center gap-4">
                            <div className="w-6 h-6 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
                            <span className="font-black uppercase tracking-widest text-[10px] text-slate-400">Syncing Data...</span>
                        </div>
                    ) : options.length > 0 ? (
                        <ul className="p-3 space-y-1">
                            {options.map((option) => {
                                const id = option[optionValueKey];
                                const labelText = option[optionLabelKey];
                                const isSelected = selectedIds.includes(id);
                                return (
                                    <li
                                        key={id}
                                        onClick={() => toggleSelection(option)}
                                        className={`px-4 py-3.5 text-sm cursor-pointer rounded-2xl transition-all flex items-center justify-between group/item ${isSelected
                                            ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-xl shadow-brand-200 scale-[1.02] z-10'
                                            : 'text-slate-700 hover:bg-brand-50 hover:text-brand-700 hover:translate-x-1'
                                            }`}
                                    >
                                        <div className="flex flex-col">
                                            <span className={`font-black ${isSelected ? 'text-white' : 'text-slate-900 group-hover/item:text-brand-900'}`}>{labelText}</span>
                                            {option.details && (
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-brand-100' : 'text-slate-400 group-hover/item:text-brand-400'}`}>
                                                    {option.details}
                                                </span>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <div className="bg-white/20 p-1 rounded-full">
                                                <FaCheck className="text-white" size={10} />
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className="p-10 text-center text-sm text-slate-500">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                                <FaSearch size={20} />
                            </div>
                            <p className="font-black text-slate-900 mb-1">No matches found</p>
                            <p className="text-xs font-medium text-slate-400">Try refining your search query</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function AnalyticsReportGenerator() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Security check: Only OWNER and MANAGER can access this center
    useEffect(() => {
        const role = tokenService.getRole();
        const normalizedRole = role ? role.toUpperCase() : "";
        if (normalizedRole !== "OWNER" && normalizedRole !== "MANAGER") {
            toast.error("Unauthorized access. This area is reserved for Management.");
            navigate('/analytics', { replace: true });
        }
    }, [navigate]);

    // Form State, defaults to 'last_month'
    const defaultDates = getPresetDates('last_month');
    const [reportTypes, setReportTypes] = useState([]);
    const [dates, setDates] = useState({
        start_date: defaultDates.start_date,
        end_date: defaultDates.end_date
    });
    const [activePreset, setActivePreset] = useState('last_month');

    // Array of IDs for multi-select
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
            // Reset optionally, defaulting back to last month
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

    return (
        <div className="min-h-screen" style={{
            background: `
                radial-gradient(1200px 600px at 85% -10%, rgba(20, 184, 166, 0.18), transparent 55%),
                radial-gradient(900px 500px at 0% 10%, rgba(56, 189, 248, 0.16), transparent 55%),
                linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)
            `
        }}>
            <style>{shimmerStyles}</style>

            <ProtectedHeader />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8 font-sans">
                {/* Enterprise Header Section */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-slate-900 shadow-2xl p-8 md:p-12 border border-brand-800/50">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0" style={{
                            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                            backgroundSize: '24px 24px'
                        }}></div>
                    </div>

                    <div className="relative z-10">
                        <button
                            onClick={() => navigate('/analytics')}
                            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-200/60 hover:text-white transition-all mb-8 group"
                        >
                            <ArrowLeftIcon className="transition-transform group-hover:-translate-x-1" />
                            Return to Analytics
                        </button>

                        <div className="flex flex-col md:flex-row md:items-center gap-8">
                            <div className="h-20 w-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-lg">
                                <FaFileExport className="text-white text-3xl" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-3 font-display">
                                    Report Center
                                </h1>
                                <p className="text-brand-50 text-lg font-medium leading-relaxed max-w-2xl opacity-90">
                                    Generate enterprise-grade intelligence reports. Verified data exports delivered securely to your business infrastructure.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleGenerate} className="space-y-6">
                    {/* Date Range Section */}
                    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 relative group font-sans">
                        <div className="relative z-10">
                            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3 font-display">
                                <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600 shadow-sm border border-brand-100">
                                    <CalendarIcon size={18} />
                                </div>
                                Select Time Period <span className="text-brand-500 text-sm">*</span>
                            </h2>

                            {/* Preset Buttons as Premium Segmented Control */}
                            <div className="flex bg-slate-100/80 p-1.5 rounded-2xl mb-8 shadow-inner border border-slate-200/40 w-full sm:max-w-fit overflow-x-auto">
                                {[
                                    { id: 'current_month', label: 'Current Month' },
                                    { id: 'last_month', label: 'Last Month' },
                                    { id: 'last_3_months', label: 'Last 3 Months' },
                                ].map(preset => (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => {
                                            setActivePreset(preset.id);
                                            setDates(getPresetDates(preset.id));
                                        }}
                                        className={`px-5 py-2.5 text-sm font-bold rounded-xl whitespace-nowrap transition-all duration-300 ${activePreset === preset.id
                                            ? 'bg-white text-brand-600 shadow-md border border-slate-200/40 ring-1 ring-brand-500/5'
                                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/40'
                                            }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setActivePreset('custom')}
                                    className={`px-5 py-2.5 text-sm font-bold rounded-xl whitespace-nowrap transition-all duration-300 ${activePreset === 'custom'
                                        ? 'bg-white text-brand-600 shadow-md border border-slate-200/40 ring-1 ring-brand-500/5'
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/40'
                                        }`}
                                >
                                    Custom Range
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-slate-700 ml-1">Start Date</label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <CalendarIcon className="text-slate-400 group-focus-within/input:text-brand-500 transition-colors" size={16} />
                                        </div>
                                        <input
                                            type="date"
                                            required
                                            max={getTodayFormatted()}
                                            value={dates.start_date}
                                            onChange={(e) => {
                                                setActivePreset('custom');
                                                setDates({ ...dates, start_date: e.target.value });
                                            }}
                                            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-brand-600/10 focus:border-brand-500 transition-all shadow-sm bg-slate-50/50 focus:bg-white text-slate-800 font-semibold"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-slate-700 ml-1">End Date</label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <CalendarIcon className="text-slate-400 group-focus-within/input:text-brand-500 transition-colors" size={16} />
                                        </div>
                                        <input
                                            type="date"
                                            required
                                            max={getTodayFormatted()}
                                            value={dates.end_date}
                                            onChange={(e) => {
                                                setActivePreset('custom');
                                                setDates({ ...dates, end_date: e.target.value });
                                            }}
                                            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-brand-600/10 focus:border-brand-500 transition-all shadow-sm bg-slate-50/50 focus:bg-white text-slate-800 font-semibold"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Report Types Section */}
                    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 font-sans">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3 font-display">
                                <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600 shadow-sm border border-brand-100">
                                    <FaTags size={18} />
                                </div>
                                Report Types <span className="text-brand-500 text-sm">*</span>
                            </h2>
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className="text-sm font-bold text-brand-600 hover:text-brand-700 transition-all px-4 py-2 rounded-xl border border-brand-100 bg-brand-50/30 hover:bg-brand-50 shadow-sm"
                            >
                                {reportTypes.length === REPORT_TYPE_CHOICES.length ? 'Deselect All' : 'Select All Categories'}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {REPORT_TYPE_CHOICES.map(choice => {
                                const isSelected = reportTypes.includes(choice.value);
                                return (
                                    <button
                                        key={choice.value}
                                        type="button"
                                        onClick={() => handleReportTypeToggle(choice.value)}
                                        className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-300 ${isSelected
                                            ? 'border-brand-600 bg-brand-50/40 shadow-md ring-4 ring-brand-600/5'
                                            : 'border-slate-100 hover:border-brand-300 hover:bg-white active:scale-[0.98]'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-xl transition-colors ${isSelected ? 'bg-brand-600 text-white shadow-lg shadow-brand-200' : 'bg-slate-100 text-slate-500'}`}>
                                                <choice.icon size={20} />
                                            </div>
                                            <span className={`font-bold text-base ${isSelected ? 'text-brand-900' : 'text-slate-700'}`}>
                                                {choice.label}
                                            </span>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isSelected ? 'bg-brand-600 border-brand-600 scale-110' : 'border-slate-300'
                                            }`}>
                                            {isSelected && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* Specific Filter Section */}
                    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 relative z-20 font-sans">
                        <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-4 font-display">
                            <div className="p-3 rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-200">
                                <FaSearch size={20} />
                            </div>
                            Fine-tune Scope <span className="text-sm font-bold text-slate-400 ml-2 uppercase tracking-widest">(Optional)</span>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-2 relative z-30">
                                <MultiSelectAsync
                                    label="Target Products"
                                    placeholder="All products selected by default..."
                                    fetchOptions={fetchProducts}
                                    onChange={(ids) => setFilterIds({ ...filterIds, product_ids: ids })}
                                    selectedIds={filterIds.product_ids}
                                    optionLabelKey="name"
                                    optionValueKey="id"
                                />
                            </div>

                            <div className="space-y-2 relative z-20">
                                <MultiSelectAsync
                                    label="Target Branches"
                                    placeholder="All branches selected by default..."
                                    fetchOptions={fetchBranches}
                                    onChange={(ids) => setFilterIds({ ...filterIds, branch_ids: ids })}
                                    selectedIds={filterIds.branch_ids}
                                    optionLabelKey="name"
                                    optionValueKey="id"
                                />
                            </div>
                        </div>
                    </section>

                    <div className="pt-8 flex flex-col items-center gap-8 relative z-0 font-sans">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`group relative flex items-center justify-center gap-4 px-12 py-5 rounded-2xl font-bold text-lg text-white transition-all duration-300 shadow-lg ${loading
                                ? 'bg-brand-400 cursor-not-allowed'
                                : 'bg-brand-600 hover:bg-brand-700 hover:shadow-brand-200 hover:-translate-y-1 active:scale-95'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span className="tracking-tight">Initializing Export...</span>
                                </>
                            ) : (
                                <>
                                    <DownloadIcon className="text-2xl transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12" />
                                    <span className="tracking-tight">Generate & Dispatch Report</span>
                                </>
                            )}
                        </button>

                        <div className="max-w-lg bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                            <div className="flex gap-4 items-start">
                                <div className="p-2 rounded-xl bg-brand-50 text-brand-600 shrink-0 border border-brand-100">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
                                </div>
                                <p className="text-sm text-slate-600 font-semibold leading-relaxed">
                                    <span className="text-slate-900 font-black uppercase tracking-wider block mb-1 text-xs">Processing Disclaimer</span>
                                    Our analytics engine processes reports in batches. Please anticipate delivery within <span className="text-brand-600 font-black">5-10 minutes</span>. To ensure system stability, a <span className="text-brand-600 font-black">10-minute interval</span> is required between sequential requests.
                                </p>
                            </div>
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
}
