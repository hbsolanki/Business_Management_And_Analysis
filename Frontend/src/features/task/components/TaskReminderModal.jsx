import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { FaClock, FaTag, FaAlignLeft } from 'react-icons/fa';
import taskService from '../services/taskService';
import { toast } from 'react-hot-toast';

const TaskReminderModal = ({ isOpen, onClose, task, onSuccess }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [remindAt, setRemindAt] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const formatLocalDateForInput = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    useEffect(() => {
        if (task && isOpen) {
            // Prefill title and description with task details as default suggestions
            setTitle(`Task Reminder: ${task.title}`);
            setContent(`Reminder to work on: ${task.description}`);
            
            // Set default remind_at to 1 hour from now or the deadline (whichever is sooner)
            const oneHourHence = new Date(Date.now() + 60 * 60 * 1000);
            if (task.deadline) {
                const deadlineDate = new Date(task.deadline);
                const defaultRemind = deadlineDate < oneHourHence ? deadlineDate : oneHourHence;
                setRemindAt(formatLocalDateForInput(defaultRemind));
            } else {
                setRemindAt(formatLocalDateForInput(oneHourHence));
            }
        }
    }, [task, isOpen]);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        
        if (!title.trim() || !remindAt) {
            toast.error("Title and reminder time are required");
            return;
        }

        const remindAtDate = new Date(remindAt);
        if (remindAtDate <= new Date()) {
            toast.error("Reminder time must be in the future");
            return;
        }

        try {
            setSubmitting(true);
            await taskService.createTaskReminder(task.id, {
                title: title.trim(),
                content: content.trim(),
                remind_at: remindAtDate.toISOString()
            });
            toast.success("Reminder created successfully!");
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to create task reminder", error);
            const errorMsg = error.response?.data?.remind_at || error.response?.data?.detail || "Failed to create reminder";
            toast.error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create Task Reminder"
            type="form"
            icon={FaClock}
            showFooter={true}
            confirmText={submitting ? "Creating..." : "Create"}
            cancelText="Cancel"
            onConfirm={handleSubmit}
        >
            <form onSubmit={handleSubmit} className="mt-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <FaTag size={10} className="text-slate-400" />
                        Reminder Title
                    </label>
                    <input
                        type="text"
                        required
                        placeholder="Enter reminder title..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all font-medium text-slate-800"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <FaAlignLeft size={10} className="text-slate-400" />
                        Reminder Description
                    </label>
                    <textarea
                        placeholder="Enter reminder description..."
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all resize-none font-medium text-slate-700"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <FaClock size={10} className="text-slate-400" />
                        Alert Time
                    </label>
                    <input
                        type="datetime-local"
                        required
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all cursor-pointer font-medium text-slate-800 bg-white"
                        value={remindAt}
                        onChange={(e) => setRemindAt(e.target.value)}
                    />
                </div>
            </form>
        </Modal>
    );
};

export default TaskReminderModal;
