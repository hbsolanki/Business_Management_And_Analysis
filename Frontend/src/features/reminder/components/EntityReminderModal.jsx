import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { FaClock, FaTag, FaAlignLeft, FaBolt, FaSyncAlt, FaHourglassHalf, FaSun, FaCalendarDay, FaBullseye, FaLink } from 'react-icons/fa';
import reminderService from '@/features/reminder/services/reminderService';
import { toast } from 'react-hot-toast';

// Map entity type → readable label + icon colour for the context badge
const ENTITY_META = {
    'tasks.task':                       { label: 'Task',                 colour: 'bg-slate-900 text-white' },
    'supplier.purchaseorder':           { label: 'Purchase Order',       colour: 'bg-indigo-600 text-white' },
    'supplier.salesorder':              { label: 'Sales Order',          colour: 'bg-emerald-600 text-white' },
    'cost.monthlycostcategory':         { label: 'Month Cost',           colour: 'bg-amber-500 text-white' },
    'cost.costcategory':                { label: 'Cost Category',        colour: 'bg-yellow-600 text-white' },
    'invoice.invoice':                  { label: 'Invoice',              colour: 'bg-violet-600 text-white' },
    'subscription.plan':                { label: 'Subscription',         colour: 'bg-rose-500 text-white' },
    'gst_management.monthlygstsummary': { label: 'GST Summary',          colour: 'bg-blue-600 text-white' },
    'cost.expense':                     { label: 'Expense',              colour: 'bg-orange-500 text-white' },
};

// Quick-preset options —————————————————————————————————————————————————————
const buildPresets = (entityDeadline) => {
    const now = new Date();

    const presets = [
        {
            key: '30min',
            label: '30 min',
            icon: <FaBolt />,
            getTime: () => new Date(now.getTime() + 30 * 60 * 1000),
        },
        {
            key: '1h',
            label: '1 Hour',
            icon: <FaHourglassHalf />,
            getTime: () => new Date(now.getTime() + 60 * 60 * 1000),
        },
        {
            key: 'tomorrow',
            label: 'Tomorrow 9AM',
            icon: <FaSun />,
            getTime: () => {
                const d = new Date(now);
                d.setDate(d.getDate() + 1);
                d.setHours(9, 0, 0, 0);
                return d;
            },
        },
        {
            key: '3days',
            label: '3 Days',
            icon: <FaCalendarDay />,
            getTime: () => new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        },
    ];

    // If the entity has a deadline add a smart "Before deadline" preset
    if (entityDeadline) {
        const dl = new Date(entityDeadline);
        const oneHourBefore = new Date(dl.getTime() - 60 * 60 * 1000);
        if (oneHourBefore > now) {
            presets.unshift({
                key: 'deadline',
                label: '1h Before Deadline',
                icon: <FaBullseye />,
                getTime: () => oneHourBefore,
            });
        }
    }

    return presets;
};

const formatLocalDateForInput = (date) => {
    const year  = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day   = String(date.getDate()).padStart(2, '0');
    const h     = String(date.getHours()).padStart(2, '0');
    const m     = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${h}:${m}`;
};

// ——————————————————————————————————————————————————————————————————————————
// EntityReminderModal
// ——————————————————————————————————————————————————————————————————————————
const EntityReminderModal = ({
    isOpen,
    onClose,
    entityType,            // e.g. "tasks.task"
    entityId,              // numeric PK
    entityTitle = '',      // display name of the entity
    entityDeadline = null, // optional ISO datetime for smart preset
    onSuccess = null,
}) => {
    const [title, setTitle]         = useState('');
    const [content, setContent]     = useState('');
    const [remindAt, setRemindAt]   = useState('');
    const [recurrence, setRecurrence] = useState('NONE');
    const [submitting, setSubmitting] = useState(false);
    const [activePreset, setActivePreset] = useState(null);

    const meta    = ENTITY_META[entityType] || { label: 'Entity', colour: 'bg-slate-600 text-white' };
    const presets = buildPresets(entityDeadline);

    // Reset + prefill on open ------------------------------------------------
    useEffect(() => {
        if (isOpen) {
            setTitle(entityTitle ? `Reminder: ${entityTitle}` : '');
            setContent('');
            setRecurrence('NONE');
            setActivePreset(null);
            // Default to 1 hour from now
            setRemindAt(formatLocalDateForInput(new Date(Date.now() + 60 * 60 * 1000)));
        }
    }, [isOpen, entityTitle]);

    // Apply preset -------------------------------------------------------
    const applyPreset = (preset) => {
        setActivePreset(preset.key);
        setRemindAt(formatLocalDateForInput(preset.getTime()));
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        if (!title.trim() || !remindAt) {
            toast.error('Title and reminder time are required');
            return;
        }

        const remindAtDate = new Date(remindAt);
        if (remindAtDate <= new Date()) {
            toast.error('Reminder time must be in the future');
            return;
        }

        try {
            setSubmitting(true);
            await reminderService.createEntityReminder(entityType, entityId, {
                title:      title.trim(),
                content:    content.trim(),
                remind_at:  remindAtDate.toISOString(),
                recurrence,
            });
            toast.success('Reminder created!');
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to create reminder', error);
            const msg =
                error.response?.data?.remind_at?.[0] ||
                error.response?.data?.title?.[0] ||
                error.response?.data?.detail ||
                'Failed to create reminder';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const inputCls =
        'w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-slate-800 focus:ring-4 focus:ring-slate-100 outline-none transition-all font-semibold text-slate-900 bg-slate-50/50 hover:bg-slate-50 placeholder:text-slate-400 placeholder:font-medium';
    const labelCls =
        'block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 flex items-center gap-2';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Set Reminder"
            type="form"
            icon={FaClock}
            showFooter={true}
            confirmText={submitting ? 'Creating…' : 'Create Reminder'}
            cancelText="Cancel"
            onConfirm={handleSubmit}
        >
            <form onSubmit={handleSubmit} className="mt-3 space-y-4" onClick={(e) => e.stopPropagation()}>

                {/* Entity context badge */}
                <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm ${meta.colour}`}>
                        <FaLink size={10} /> {meta.label}
                    </span>
                    {entityTitle && (
                        <span className="text-xs text-slate-500 font-medium truncate max-w-[200px]" title={entityTitle}>
                            {entityTitle}
                        </span>
                    )}
                </div>

                {/* Quick Presets */}
                <div>
                    <label className={labelCls}>
                        <FaBolt size={9} className="text-amber-500" />
                        Quick Presets
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {presets.map((preset) => (
                            <button
                                key={preset.key}
                                type="button"
                                onClick={() => applyPreset(preset)}
                                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                                    activePreset === preset.key
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                                }`}
                            >
                                <span className={activePreset === preset.key ? "text-amber-400" : "text-slate-400"}>{preset.icon}</span>
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Title */}
                <div>
                    <label className={labelCls}>
                        <FaTag size={10} className="text-slate-400" />
                        Reminder Title <span className="text-rose-500 normal-case">*</span>
                    </label>
                    <input
                        type="text"
                        required
                        placeholder="E.g., Follow up on delivery…"
                        className={inputCls}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                {/* Alert Time */}
                <div>
                    <label className={labelCls}>
                        <FaClock size={10} className="text-slate-400" />
                        Alert Time <span className="text-rose-500 normal-case">*</span>
                    </label>
                    <input
                        type="datetime-local"
                        required
                        className={`${inputCls} cursor-pointer`}
                        value={remindAt}
                        onChange={(e) => {
                            setRemindAt(e.target.value);
                            setActivePreset(null);
                        }}
                    />
                </div>

                {/* Recurrence */}
                <div>
                    <label className={labelCls}>
                        <FaSyncAlt size={10} className="text-slate-400" />
                        Repeat
                    </label>
                    <div className="relative group">
                        <select
                            className={`${inputCls} appearance-none cursor-pointer`}
                            value={recurrence}
                            onChange={(e) => setRecurrence(e.target.value)}
                        >
                            <option value="NONE">One-time alert</option>
                            <option value="DAILY">Repeat daily</option>
                            <option value="WEEKLY">Repeat weekly</option>
                            <option value="MONTHLY">Repeat monthly</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 group-hover:text-slate-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className={labelCls}>
                        <FaAlignLeft size={10} className="text-slate-400" />
                        Notes <span className="text-slate-400 normal-case font-semibold tracking-normal">(optional)</span>
                    </label>
                    <textarea
                        placeholder="Add context or notes for this reminder…"
                        rows={2}
                        className={`${inputCls} resize-none`}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </div>
            </form>
        </Modal>
    );
};

export default EntityReminderModal;
