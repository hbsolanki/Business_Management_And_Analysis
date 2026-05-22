import { useState, useEffect } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { FaSave, FaInfoCircle } from 'react-icons/fa';
import taskService from '@/features/task/services/taskService';
import toast from 'react-hot-toast';
import ProtectedHeader from '@/components/layout/ProtectedHeader';
import BackButton from '@/components/shared/BackButton';
import { tokenService } from '@/services/tokenService';

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
        deadline: '',
    });
    const [isCreator, setIsCreator] = useState(false);

    // Errors
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState('');

    useEffect(() => {
        const fetchTask = async () => {
            try {
                const data = await taskService.getTaskById(id);
                
                let localDeadline = '';
                if (data.deadline) {
                    const d = new Date(data.deadline);
                    const pad = (num) => String(num).padStart(2, '0');
                    localDeadline = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                }

                setFormData({
                    title: data.title || '',
                    description: data.description || '',
                    remarks: data.remarks || '',
                    status: data.status || 'PENDING',
                    deadline: localDeadline,
                });

                const currentUserId = tokenService.getId();
                setIsCreator(data.assigned_by?.id == currentUserId);
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
        if (errors[name]) {
            setErrors(p => ({ ...p, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        setFormError('');
        const payload = {
            title: formData.title,
            description: formData.description,
            remarks: formData.remarks,
            status: formData.status,
        };
        if (isCreator) {
            payload.deadline = formData.deadline || null;
        }

        try {
            await taskService.updateTask(id, payload);
            toast.success("Task updated successfully");
            navigate(-1);
        } catch (error) {
            console.error("Failed to update task", error);
            if (error.response && error.response.data) {
                const responseData = error.response.data;
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

    const titleClass = `w-full px-4 py-2.5 rounded-xl transition-all outline-none text-sm font-medium placeholder-slate-400 focus:ring-4 focus:ring-slate-100 ${
        errors.title 
            ? "border border-rose-400 bg-rose-50 text-rose-955 focus:border-rose-500 focus:ring-rose-500/5" 
            : "bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white text-slate-900"
    }`;

    const statusClass = `w-full px-4 py-2.5 rounded-xl transition-all outline-none text-sm font-medium appearance-none cursor-pointer focus:ring-4 focus:ring-slate-100 ${
        errors.status 
            ? "border border-rose-400 bg-rose-50 text-rose-955 focus:border-rose-500 focus:ring-rose-500/5" 
            : "bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white text-slate-900"
    }`;

    const descriptionClass = `w-full px-4 py-3 rounded-xl transition-all outline-none text-sm font-medium placeholder-slate-400 resize-none leading-relaxed focus:ring-4 focus:ring-slate-100 ${
        errors.description 
            ? "border border-rose-400 bg-rose-50 text-rose-955 focus:border-rose-500 focus:ring-rose-500/5" 
            : "bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white text-slate-900"
    }`;

    const remarksClass = `w-full px-4 py-3 rounded-xl transition-all outline-none text-sm font-medium placeholder-slate-400 resize-none focus:ring-4 focus:ring-slate-100 ${
        errors.remarks 
            ? "border border-rose-400 bg-rose-50 text-rose-955 focus:border-rose-500 focus:ring-rose-500/5" 
            : "bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white text-slate-900"
    }`;

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

                    {formError && (
                        <div className="mx-6 mt-4 flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
                            <FaInfoCircle className="text-rose-500 mt-0.5" size={14} />
                            <p className="text-xs font-bold text-rose-900">{formError}</p>
                        </div>
                    )}

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
                                className={titleClass}
                                required
                            />
                            {errors.title && (
                                <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">
                                    {errors.title[0]}
                                </p>
                            )}
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
                                        className={statusClass}
                                    >
                                        <option value="PENDING">Pending</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="COMPLETED">Completed</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                                {errors.status && (
                                    <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">
                                        {errors.status[0]}
                                    </p>
                                )}
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
                                className={descriptionClass}
                            />
                            {errors.description && (
                                <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">
                                    {errors.description[0]}
                                </p>
                            )}
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
                                className={remarksClass}
                            />
                            {errors.remarks && (
                                <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">
                                    {errors.remarks[0]}
                                </p>
                            )}
                        </div>

                        {/* Deadline Section */}
                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                Deadline {!isCreator && <span className="text-[10px] text-slate-400 font-medium lowercase italic">(only creator can edit)</span>}
                            </label>
                            <input
                                type="datetime-local"
                                name="deadline"
                                value={formData.deadline}
                                onChange={handleChange}
                                disabled={!isCreator}
                                className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white text-slate-900 transition-all outline-none text-sm font-medium placeholder-slate-400 focus:ring-4 focus:ring-slate-100 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100`}
                            />
                            {errors.deadline && (
                                <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">
                                    {errors.deadline[0]}
                                </p>
                            )}
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
