import { useState, useEffect } from "react";
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

            <main className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
                <div className="mb-4">
                    <BackButton to={`/tasks/${id}`} label="Back to Task Details" />
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-8 border-b border-slate-100 bg-white">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
                                    <FaSave className="text-lg" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-slate-900 leading-none">Edit Task</h1>
                                    <p className="text-xs text-slate-500 mt-1.5">Update details and status.</p>
                                </div>
                            </div>
                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${statusMeta.badge} border border-slate-100`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.ring}`}></span>
                                {statusMeta.label}
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Title Section */}
                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                Task Title
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="e.g. Redesign Landing Page"
                                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white transition-all outline-none text-sm font-medium text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-slate-100"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                            {/* Status */}
                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    Status
                                </label>
                                <div className="relative group">
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white transition-all outline-none text-sm font-medium text-slate-900 appearance-none cursor-pointer focus:ring-4 focus:ring-slate-100"
                                    >
                                        <option value="PENDING">Pending</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="COMPLETED">Completed</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="4"
                                placeholder="Describe the task requirements..."
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white transition-all outline-none text-sm font-medium text-slate-900 placeholder-slate-400 resize-none leading-relaxed focus:ring-4 focus:ring-slate-100"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                Remarks
                            </label>
                            <textarea
                                name="remarks"
                                value={formData.remarks}
                                onChange={handleChange}
                                rows="3"
                                placeholder="Add optional notes or blockers..."
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white transition-all outline-none text-sm font-medium text-slate-900 placeholder-slate-400 resize-none focus:ring-4 focus:ring-slate-100"
                            />
                        </div>

                        <div className="pt-4 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white bg-slate-900 hover:bg-black shadow-lg shadow-slate-200 transition-all disabled:opacity-50 disabled:shadow-none text-sm"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Saving</span>
                                    </>
                                ) : (
                                    <>
                                        <FaSave size={14} />
                                        <span>Save Changes</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default EditTask;
