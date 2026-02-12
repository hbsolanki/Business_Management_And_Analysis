import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSave, FaInfoCircle } from 'react-icons/fa';
import taskService from '@/features/task/services/taskService';
import toast from 'react-hot-toast';
import ProtectedHeader from '@/components/layout/ProtectedHeader';
import BackButton from '@/components/shared/BackButton';

const EditTask = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        remarks: '',
        status: 'PENDING',
    });

    useEffect(() => {
        const fetchTask = async () => {
            try {
                const data = await taskService.getTaskById(id);
                setFormData({
                    title: data.title || '',
                    description: data.description || '',
                    remarks: data.remarks || '',
                    status: data.status || 'PENDING',
                });
            } catch (error) {
                console.error("Failed to fetch task", error);
                toast.error("Could not load task details");
                navigate(-1);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchTask();
        }
    }, [id, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await taskService.updateTask(id, formData);
            toast.success("Task updated successfully");
            navigate(-1);
        } catch (error) {
            console.error("Failed to update task", error);
            toast.error("Failed to update task");
        } finally {
            setSaving(false);
        }
    };

    const statusConfig = {
        PENDING: {
            label: "Pending",
            badge: "bg-slate-100 text-slate-700",
            ring: "bg-slate-500",
            desc: "Waiting to start.",
        },
        IN_PROGRESS: {
            label: "In Progress",
            badge: "bg-slate-100 text-slate-700",
            ring: "bg-slate-500",
            desc: "Actively being worked on.",
        },
        COMPLETED: {
            label: "Completed",
            badge: "bg-slate-100 text-slate-700",
            ring: "bg-slate-500",
            desc: "Marked as finished.",
        },
    };

    const statusMeta = statusConfig[formData.status] || statusConfig.PENDING;
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-transparent">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen font-sans bg-transparent">
            <ProtectedHeader />

            <main className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <BackButton to={`/tasks/${id}`} label="Back to Task Details" />
                </div>

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
                    {/* Header */}
                    <div className="bg-slate-50 px-8 py-10 text-slate-900 relative overflow-hidden border-b border-slate-200">

                        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 border border-slate-200">
                                    <span className="h-2 w-2 rounded-full bg-slate-500"></span>
                                    Task update
                                </div>
                                <h1 className="text-3xl font-semibold mt-3">Edit Task</h1>
                                <p className="text-slate-500 mt-2">Refine the details, status, and remarks with clarity.</p>
                            </div>
                            <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide ${statusMeta.badge}`}>
                                <span className={`h-2 w-2 rounded-full ${statusMeta.ring}`}></span>
                                {statusMeta.label}
                            </span>
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-4 relative z-10">
                            <div className="bg-white rounded-2xl p-4 border border-slate-200">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status insight</p>
                                <p className="text-sm font-semibold text-slate-800 mt-2">{statusMeta.desc}</p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        {/* Title Section */}
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                                Task Title
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="e.g. Redesign Landing Page"
                                className="w-full px-5 py-4 text-lg font-semibold rounded-2xl bg-white border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition-all outline-none text-slate-900 placeholder-slate-400"
                                required
                            />
                            <p className="text-xs text-gray-400">Use a short, actionable title for clarity.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Status */}
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                                    Current Status
                                </label>
                                <div className="relative">
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition-all outline-none text-slate-800 appearance-none cursor-pointer font-medium"
                                    >
                                        <option value="PENDING">Pending</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="COMPLETED">Completed</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400">Keep status accurate for better team visibility.</p>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="5"
                                placeholder="Describe the task requirements..."
                                className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition-all outline-none text-slate-700 placeholder-slate-400 resize-none leading-relaxed"
                            />
                            <p className="text-xs text-gray-400">Include success criteria, deliverables, and key deadlines.</p>
                        </div>

                        {/* Remarks */}
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                                Remarks <span className="text-gray-400 font-normal normal-case text-xs">(Optional notes)</span>
                            </label>
                            <div className="relative">
                                <textarea
                                    name="remarks"
                                    value={formData.remarks}
                                    onChange={handleChange}
                                    rows="3"
                                    placeholder="Add any final comments, blockers, or notes..."
                                    className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition-all outline-none text-slate-700 placeholder-slate-400 resize-none"
                                />
                            </div>
                        </div>

                        {/* Actions Divider */}
                        <div className="border-t border-slate-200 pt-6 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 items-center">
                            <div className="bg-white rounded-2xl p-4 border border-slate-200">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                                        <FaInfoCircle />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">Update checklist</p>
                                        <ul className="text-xs text-slate-500 mt-2 space-y-1">
                                            <li>Confirm the task title is clear and actionable.</li>
                                            <li>Update status so your team stays aligned.</li>
                                            <li>Add remarks for blockers or next steps.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => navigate(-1)}
                                    className="px-6 py-3 rounded-xl font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-3 px-8 py-3.5 rounded-xl font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaSave className="text-lg" />
                                            <span>Save Changes</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default EditTask;
