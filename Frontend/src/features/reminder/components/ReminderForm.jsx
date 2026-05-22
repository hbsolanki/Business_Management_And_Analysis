import { useState, useEffect } from "react";
import { FaClock, FaCalendarAlt, FaHistory, FaInfoCircle } from 'react-icons/fa';
import api from '@/services/api';

const ReminderForm = ({ 
    isEmbed = false, 
    initialData = null, 
    onComplete = null,
    id = null
}) => {
    const [title, setTitle] = useState(initialData?.title || '');
    const [content, setContent] = useState(initialData?.content || '');
    const [remindAt, setRemindAt] = useState('');
    const [recurrence, setRecurrence] = useState(initialData?.recurrence || 'NONE');
    
    // Error & Loading States
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [loadingReminder, setLoadingReminder] = useState(false);

    const isEditMode = Boolean(id);

    // Format local datetime string to match YYYY-MM-DDTHH:MM
    const formatLocalDateTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Fetch Reminder if ID is provided (for Edit mode)
    useEffect(() => {
        if (id && isEmbed) {
            const fetchReminder = async () => {
                setLoadingReminder(true);
                setFormError('');
                try {
                    const res = await api.get(`/notification/reminders/${id}/`);
                    const r = res.data;
                    setTitle(r.title || '');
                    setContent(r.content || '');
                    setRemindAt(formatLocalDateTime(r.remind_at));
                    setRecurrence(r.recurrence || 'NONE');
                } catch (e) {
                    console.error("Failed to fetch reminder details", e);
                    setFormError("Failed to load reminder details.");
                } finally {
                    setLoadingReminder(false);
                }
            };
            fetchReminder();
        }
    }, [id, isEmbed]);

    // Handle initialData pre-fills
    useEffect(() => {
        if (initialData && !id) {
            setTitle(initialData.title || '');
            setContent(initialData.content || '');
            setRecurrence(initialData.recurrence || 'NONE');
            if (initialData.remind_at) {
                setRemindAt(formatLocalDateTime(initialData.remind_at));
            }
        }
    }, [initialData, id]);

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        
        setErrors({});
        setFormError('');

        // Validate remindAt
        if (!remindAt) {
            setErrors(p => ({ ...p, remind_at: ["Reminder time is required."] }));
            return;
        }

        const reminderData = {
            title,
            content: content || null,
            remind_at: new Date(remindAt).toISOString(),
            recurrence
        };

        try {
            let response;
            if (isEditMode) {
                response = await api.patch(`/notification/reminders/${id}/`, reminderData);
            } else {
                response = await api.post(`/notification/reminders/`, reminderData);
            }
            
            if (onComplete) {
                onComplete(response.data);
            }
        } catch (err) {
            console.error("Failed to submit reminder", err);
            if (err.response && err.response.data) {
                const responseData = err.response.data;
                if (typeof responseData === 'object' && !Array.isArray(responseData)) {
                    setErrors(responseData);
                    if (responseData.non_field_errors) {
                        setFormError(responseData.non_field_errors[0]);
                    } else if (responseData.detail) {
                        setFormError(responseData.detail);
                    }
                } else {
                    setFormError("An unexpected validation error occurred.");
                }
            } else {
                setFormError("Failed to connect to the server. Please try again.");
            }
        }
    };

    if (loadingReminder) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 gap-3">
                <div className="animate-spin h-8 w-8 border-4 border-slate-950 border-t-transparent rounded-full"></div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Reminder Details...</p>
            </div>
        );
    }

    const inputClass = `w-full px-4 py-3 rounded-xl transition-all outline-none text-sm font-bold placeholder-slate-400 focus:ring-4 focus:ring-slate-900/5 bg-slate-50 border border-slate-200 focus:border-slate-800 focus:bg-white text-slate-900`;
    const errorInputClass = `w-full px-4 py-3 rounded-xl transition-all outline-none text-sm font-bold placeholder-slate-400 focus:ring-4 focus:ring-rose-500/5 bg-rose-50 border border-rose-400 focus:border-rose-500 text-rose-955`;

    const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";

    return (
        <form onSubmit={handleSubmit} className="space-y-6 mt-4 p-5">
            {formError && (
                <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
                    <FaInfoCircle className="text-rose-500 mt-0.5" size={14} />
                    <p className="text-xs font-bold text-rose-900">{formError}</p>
                </div>
            )}



            {/* Reminder Title */}
            <div>
                <label className={labelClass}>Reminder Title <span className="text-red-500">*</span></label>
                <input
                    type="text"
                    className={errors.title ? errorInputClass : inputClass}
                    placeholder="E.g., Check laptop inventory levels"
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value);
                        if (errors.title) setErrors(p => ({ ...p, title: null }));
                    }}
                    required
                />
                {errors.title && (
                    <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider animate-bounce">
                        {errors.title[0]}
                    </p>
                )}
            </div>

            {/* DateTime Picker */}
            <div>
                <label className={labelClass}>Schedule Time <span className="text-red-500">*</span></label>
                <div className="relative">
                    <input
                        type="datetime-local"
                        className={errors.remind_at ? errorInputClass : inputClass}
                        value={remindAt}
                        onChange={(e) => {
                            setRemindAt(e.target.value);
                            if (errors.remind_at) setErrors(p => ({ ...p, remind_at: null }));
                        }}
                        required
                    />
                </div>
                {errors.remind_at && (
                    <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">
                        {errors.remind_at[0]}
                    </p>
                )}
            </div>

            {/* Recurrence Selection */}
            <div>
                <label className={labelClass}>Recurrence Pattern</label>
                <select
                    className={errors.recurrence ? errorInputClass : inputClass}
                    value={recurrence}
                    onChange={(e) => {
                        setRecurrence(e.target.value);
                        if (errors.recurrence) setErrors(p => ({ ...p, recurrence: null }));
                    }}
                >
                    <option value="NONE">One-time Alert</option>
                    <option value="DAILY">Repeat Daily</option>
                    <option value="WEEKLY">Repeat Weekly</option>
                    <option value="MONTHLY">Repeat Monthly</option>
                </select>
                {errors.recurrence && (
                    <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">
                        {errors.recurrence[0]}
                    </p>
                )}
            </div>

            {/* Optional Description / Content */}
            <div>
                <label className={labelClass}>Extra Details</label>
                <textarea
                    className={`${errors.content ? errorInputClass : inputClass} min-h-[90px] resize-none font-semibold`}
                    placeholder="Add descriptive context for this alert (optional)..."
                    value={content}
                    onChange={(e) => {
                        setContent(e.target.value);
                        if (errors.content) setErrors(p => ({ ...p, content: null }));
                    }}
                />
                {errors.content && (
                    <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">
                        {errors.content[0]}
                    </p>
                )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 mt-6">
                <button
                    type="submit"
                    disabled={!title || !remindAt}
                    className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-850 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                    {isEditMode ? 'Update Alert Schedule' : 'Activate Reminder'}
                </button>
            </div>
        </form>
    );
};

export default ReminderForm;
