import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaClock, 
    FaBell, 
    FaPlus, 
    FaTrashAlt, 
    FaEdit, 
    FaSearch, 
    FaCalendarAlt, 
    FaSyncAlt, 
    FaRegBellSlash,
    FaFilter,
    FaCaretDown,
    FaSortAmountDown
} from 'react-icons/fa';
import api from '@/services/api';
import { toast } from 'react-hot-toast';
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import Modal from "@/components/ui/Modal";

const Reminders = () => {
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRecurrence, setFilterRecurrence] = useState('ALL');
    const [filterDate, setFilterDate] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [nextPageUrl, setNextPageUrl] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [reminderToDelete, setReminderToDelete] = useState(null);
    const navigate = useNavigate();

    // Fetch Reminders
    const fetchReminders = async (isLoadMore = false, overrideSearch, overrideRecur, overrideDate, overrideStatus) => {
        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }
        try {
            const params = {};
            const q = overrideSearch !== undefined ? overrideSearch : searchQuery;
            const r = overrideRecur !== undefined ? overrideRecur : filterRecurrence;
            const d = overrideDate !== undefined ? overrideDate : filterDate;
            const s = overrideStatus !== undefined ? overrideStatus : filterStatus;

            if (q) params.search = q;
            if (r !== 'ALL') params.recurrence = r;
            if (d) params.date = d;
            if (s !== 'ALL') params.status = s;

            let url = '/notification/reminders/';
            let fetchParams = { params };
            
            if (isLoadMore && nextPageUrl) {
                try {
                    const parsedUrl = new URL(nextPageUrl);
                    url = parsedUrl.pathname + parsedUrl.search;
                    fetchParams = {};
                } catch {
                    url = nextPageUrl;
                    fetchParams = {};
                }
            }

            const res = await api.get(url, fetchParams);
            const results = res.data.results || res.data || [];
            const next = res.data.next || null;
            const count = res.data.count || results.length;

            if (isLoadMore) {
                setReminders(prev => [...prev, ...results]);
            } else {
                setReminders(results);
            }
            setNextPageUrl(next);
            setTotalCount(count);
        } catch (e) {
            console.error("Failed to load reminders", e);
            toast.error("Failed to fetch reminders.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchReminders(false);
    }, []);

    // Handle Delete
    const triggerDeleteConfirm = (id) => {
        setReminderToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        if (!reminderToDelete) return;
        try {
            await api.delete(`/notification/reminders/${reminderToDelete}/`);
            toast.success("Reminder deleted successfully.");
            setReminders(prev => prev.filter(r => r.id !== reminderToDelete));
        } catch (e) {
            console.error("Delete failed", e);
            toast.error("Failed to delete reminder.");
        } finally {
            setIsDeleteModalOpen(false);
            setReminderToDelete(null);
        }
    };

    const activeReminders = reminders.filter(r => !r.is_sent);
    const recurringCount = reminders.filter(r => r.recurrence && r.recurrence !== 'NONE').length;

    // Helper for beautiful datetime representation
    const formatDateTime = (dateStr) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return d.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const getRecurrenceBadge = (pattern) => {
        const styles = {
            NONE: 'bg-slate-100 text-slate-600 border-slate-200',
            DAILY: 'bg-emerald-50 text-emerald-700 border-emerald-100',
            WEEKLY: 'bg-indigo-50 text-indigo-700 border-indigo-100',
            MONTHLY: 'bg-amber-50 text-amber-700 border-amber-100'
        };
        const labels = {
            NONE: 'One-time',
            DAILY: 'Daily Repeat',
            WEEKLY: 'Weekly Repeat',
            MONTHLY: 'Monthly Repeat'
        };
        return (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${styles[pattern] || styles.NONE}`}>
                {labels[pattern] || pattern}
            </span>
        );
    };

    const getReminderIcon = (recurrence) => {
        if (recurrence === 'DAILY') return FaSyncAlt;
        if (recurrence === 'WEEKLY') return FaCalendarAlt;
        if (recurrence === 'MONTHLY') return FaClock;
        return FaBell;
    };

    const clearFilters = () => {
        setSearchQuery('');
        setFilterRecurrence('ALL');
        setFilterDate('');
        setFilterStatus('ALL');
        toast.success("Filters reset.");
        fetchReminders(false, '', 'ALL', '', 'ALL');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20 bg-slate-50 font-sans">
            <ProtectedHeader />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Header Controls */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                        <div className="space-y-1">
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                                <span className="p-2 bg-slate-900 rounded-lg text-white shadow-sm">
                                    <FaBell className="text-xl" />
                                </span>
                                Reminders
                            </h1>
                        </div>

                        <button
                            onClick={() => navigate('/reminders/new')}
                            className="group inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm transition-all self-start xl:self-auto"
                        >
                            <FaPlus size={12} className="group-hover:rotate-90 transition-transform" />
                            Add Reminder
                        </button>
                    </div>
                </div>

                {/* KPI Summary Rows */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex justify-between items-center">
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Schedules</p>
                            <h3 className="text-2xl font-bold text-slate-900">{activeReminders.length}</h3>
                        </div>
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                            <FaClock className="text-lg" />
                        </span>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex justify-between items-center">
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Recurring</p>
                            <h3 className="text-2xl font-bold text-slate-900">{recurringCount}</h3>
                        </div>
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                            <FaSyncAlt className="text-lg animate-spin-slow" />
                        </span>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex justify-between items-center">
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Completed Alerts</p>
                            <h3 className="text-2xl font-bold text-slate-900">{reminders.filter(r => r.is_sent).length}</h3>
                        </div>
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                            <FaRegBellSlash className="text-lg" />
                        </span>
                    </div>
                </div>

                {/* Advanced Filtering Block */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-slate-800 pb-3 border-b border-slate-100">
                        <FaFilter size={12} className="text-slate-400" />
                        <span className="text-xs font-bold uppercase tracking-wider">Advanced Filters</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* Title / Name Filter */}
                        <div className="relative">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Name</label>
                            <div className="relative">
                                <FaSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs" />
                                <input
                                    type="text"
                                    placeholder="Search by title..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-slate-400 transition-all"
                                />
                            </div>
                        </div>

                        {/* Date Filter */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Date</label>
                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-slate-400 transition-all cursor-pointer"
                            />
                        </div>

                        {/* Recurrence Pattern Filter */}
                        <div className="relative">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pattern</label>
                            <div className="relative">
                                <select
                                    value={filterRecurrence}
                                    onChange={(e) => setFilterRecurrence(e.target.value)}
                                    className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-slate-400 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="ALL">All Patterns</option>
                                    <option value="NONE">One-time</option>
                                    <option value="DAILY">Daily</option>
                                    <option value="WEEKLY">Weekly</option>
                                    <option value="MONTHLY">Monthly</option>
                                </select>
                                <FaCaretDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs" />
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div className="relative">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Status</label>
                            <div className="relative">
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-slate-400 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="ALL">All States</option>
                                    <option value="PENDING">Active / Pending</option>
                                    <option value="SENT">Sent / Dispatched</option>
                                </select>
                                <FaCaretDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs" />
                            </div>
                        </div>

                        {/* Apply Filters Button */}
                        <div className="flex items-end sm:col-span-2 lg:col-span-1 mt-2 sm:mt-0">
                            <button
                                onClick={() => fetchReminders(false)}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest py-2.5 rounded-xl border border-slate-950 shadow-sm transition-all h-[36px] flex items-center justify-center cursor-pointer"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>

                    {/* Clear Filters Helper Row */}
                    {(searchQuery || filterRecurrence !== 'ALL' || filterDate || filterStatus !== 'ALL') && (
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={clearFilters}
                                className="text-[10px] font-black uppercase tracking-wider text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 transition-all cursor-pointer"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    )}
                </div>

                {/* Logical Grid View of Reminders */}
                {reminders.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center max-w-xl mx-auto shadow-sm">
                        <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <FaBell size={24} />
                        </div>
                        <h3 className="text-base font-black text-slate-800">No Reminders Found</h3>
                        <p className="text-xs text-slate-500 mt-2 font-medium">
                            No scheduled notifications matching your filters or search keywords. Try clearing your filters to see all alerts.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {reminders.map((reminder) => (
                            <div 
                                key={reminder.id}
                                className={`bg-white border rounded-2xl p-5 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group ${
                                    reminder.is_sent 
                                        ? 'border-slate-200 bg-slate-100/40 opacity-40 hover:opacity-60 transition-opacity' 
                                        : 'border-slate-200 hover:border-slate-900'
                                }`}
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="w-8 h-8 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center border border-slate-200 shadow-sm flex-shrink-0">
                                            {(() => {
                                                const Icon = getReminderIcon(reminder.recurrence);
                                                return <Icon size={14} className="text-slate-600" />;
                                            })()}
                                        </div>

                                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => navigate(`/reminders/${reminder.id}/edit`)}
                                                className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
                                                title="Edit Alert"
                                            >
                                                <FaEdit size={13} />
                                            </button>
                                            <button
                                                onClick={() => triggerDeleteConfirm(reminder.id)}
                                                className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
                                                title="Delete Alert"
                                            >
                                                <FaTrashAlt size={13} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-1.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="text-sm font-bold text-slate-900 tracking-tight">{reminder.title}</h4>
                                            {reminder.is_sent && (
                                                <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                                    Dispatched
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-3">
                                            {reminder.content || "No details provided."}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                                    {getRecurrenceBadge(reminder.recurrence)}
                                    <div className="text-[11px] font-bold text-slate-700 tabular-nums">
                                        {formatDateTime(reminder.remind_at)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination / Load More Button */}
                {nextPageUrl && (
                    <div className="flex justify-center pt-8">
                        <button
                            onClick={() => fetchReminders(true)}
                            disabled={loadingMore}
                            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-slate-900 disabled:opacity-50 cursor-pointer"
                        >
                            {loadingMore ? (
                                <>
                                    <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-slate-900 border-t-transparent"></span>
                                    Loading...
                                </>
                            ) : (
                                "Load More Reminders"
                            )}
                        </button>
                    </div>
                )}
            </main>

            {/* Custom Premium Deletion Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Reminder"
                message="Are you sure you want to permanently delete this scheduled reminder? This action cannot be undone."
                onConfirm={executeDelete}
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
            />
        </div>
    );
};

export default Reminders;
