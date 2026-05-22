import { useState, useEffect, useCallback } from 'react';
import { format, isPast, isFuture } from 'date-fns';
import { FaBell, FaPlus, FaTrash, FaClock, FaSync, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import reminderService from '@/features/reminder/services/reminderService';
import EntityReminderModal from './EntityReminderModal';
import { toast } from 'react-hot-toast';

// Map recurrence values → readable badges
const RECURRENCE_LABELS = {
    NONE:    { label: 'Once',    cls: 'bg-slate-100 text-slate-600' },
    DAILY:   { label: 'Daily',   cls: 'bg-blue-50 text-blue-700' },
    WEEKLY:  { label: 'Weekly',  cls: 'bg-violet-50 text-violet-700' },
    MONTHLY: { label: 'Monthly', cls: 'bg-teal-50 text-teal-700' },
};

// ——————————————————————————————————————————————————————————————————————————
// ReminderCard
// ——————————————————————————————————————————————————————————————————————————
const ReminderCard = ({ reminder, onDelete }) => {
    const [deleting, setDeleting] = useState(false);
    const remindDate = new Date(reminder.remind_at);
    const overdue    = isPast(remindDate) && !reminder.is_sent;
    const sent       = reminder.is_sent;
    const recurrence = RECURRENCE_LABELS[reminder.recurrence] || RECURRENCE_LABELS.NONE;
    const linkId     = reminder.links?.[0]?.id;   // The ReminderLink ID for this entity

    const handleDelete = async () => {
        try {
            setDeleting(true);
            if (linkId) {
                await reminderService.deleteEntityReminderLink(reminder.id, linkId);
            } else {
                await reminderService.deleteReminder(reminder.id);
            }
            toast.success('Reminder removed');
            onDelete(reminder.id);
        } catch {
            toast.error('Failed to remove reminder');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className={`group relative flex items-start gap-3 p-4 rounded-xl border transition-all ${
            sent
                ? 'bg-emerald-50/50 border-emerald-100'
                : overdue
                    ? 'bg-rose-50/50 border-rose-200'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
        }`}>
            {/* Status icon */}
            <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                sent    ? 'bg-emerald-100 text-emerald-600'
                : overdue ? 'bg-rose-100 text-rose-500'
                : 'bg-slate-100 text-slate-500'
            }`}>
                {sent
                    ? <FaCheckCircle size={13} />
                    : overdue
                        ? <FaExclamationCircle size={13} />
                        : <FaBell size={12} />
                }
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800 leading-tight truncate">
                        {reminder.title}
                    </p>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Status badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            sent    ? 'bg-emerald-100 text-emerald-700'
                            : overdue ? 'bg-rose-100 text-rose-600'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                            {sent ? 'Sent' : overdue ? 'Overdue' : 'Pending'}
                        </span>

                        {/* Recurrence badge */}
                        {reminder.recurrence !== 'NONE' && (
                            <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${recurrence.cls}`}>
                                <FaSync size={7} className="inline" />
                                {recurrence.label}
                            </span>
                        )}
                    </div>
                </div>

                {/* Content / notes */}
                {reminder.content && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{reminder.content}</p>
                )}

                {/* Time */}
                <div className="flex items-center gap-1 mt-1.5">
                    <FaClock size={9} className={overdue && !sent ? 'text-rose-400' : 'text-slate-300'} />
                    <span className={`text-[11px] font-medium ${
                        overdue && !sent ? 'text-rose-500' : 'text-slate-400'
                    }`}>
                        {format(remindDate, 'MMM d, yyyy · h:mm a')}
                    </span>
                </div>
            </div>

            {/* Delete button — appears on hover */}
            <button
                onClick={handleDelete}
                disabled={deleting}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 disabled:opacity-50 disabled:pointer-events-none"
                title="Remove reminder"
            >
                {deleting
                    ? <div className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                    : <FaTrash size={10} />
                }
            </button>
        </div>
    );
};

// ——————————————————————————————————————————————————————————————————————————
// LinkedRemindersPanel
// ——————————————————————————————————————————————————————————————————————————
/**
 * Displays all reminders linked to any entity, plus an "Add Reminder" button.
 *
 * Props:
 *   entityType  — e.g. "tasks.task"
 *   entityId    — numeric PK
 *   entityTitle — display label used inside the modal
 *   entityDeadline — optional ISO datetime for smart presets
 */
const LinkedRemindersPanel = ({
    entityType,
    entityId,
    entityTitle = '',
    entityDeadline = null,
}) => {
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchReminders = useCallback(async () => {
        try {
            setLoading(true);
            const data = await reminderService.getEntityReminders(entityType, entityId);
            setReminders(Array.isArray(data) ? data : (data?.results ?? []));
        } catch (err) {
            console.error('Failed to fetch entity reminders', err);
        } finally {
            setLoading(false);
        }
    }, [entityType, entityId]);

    useEffect(() => {
        if (entityType && entityId) fetchReminders();
    }, [fetchReminders]);

    const handleDelete = (removedId) => {
        setReminders((prev) => prev.filter((r) => r.id !== removedId));
    };

    const pendingCount = reminders.filter((r) => !r.is_sent && isFuture(new Date(r.remind_at))).length;

    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-900 text-white rounded-xl">
                        <FaBell size={13} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Reminders</h3>
                        <p className="text-[11px] text-slate-400">
                            {loading
                                ? 'Loading…'
                                : pendingCount > 0
                                    ? `${pendingCount} pending · ${reminders.length} total`
                                    : `${reminders.length} reminder${reminders.length !== 1 ? 's' : ''}`
                            }
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors shadow-sm"
                >
                    <FaPlus size={9} />
                    Add Reminder
                </button>
            </div>

            {/* Body */}
            <div className="p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                    </div>
                ) : reminders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center mb-3">
                            <FaBell className="text-slate-300" size={18} />
                        </div>
                        <p className="text-sm font-semibold text-slate-500">No reminders yet</p>
                        <p className="text-xs text-slate-400 mt-1">
                            Click <strong>Add Reminder</strong> to schedule one for this item.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {reminders.map((reminder) => (
                            <ReminderCard
                                key={reminder.id}
                                reminder={reminder}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Entity Reminder Modal */}
            <EntityReminderModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                entityType={entityType}
                entityId={entityId}
                entityTitle={entityTitle}
                entityDeadline={entityDeadline}
                onSuccess={fetchReminders}
            />
        </div>
    );
};

export default LinkedRemindersPanel;
