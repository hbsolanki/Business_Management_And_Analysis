import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSave, FaArrowLeft, FaCheck } from 'react-icons/fa';
import taskService from '@/features/task/services/taskService';
import toast from 'react-hot-toast';

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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-3xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="mb-8 group flex items-center text-gray-500 hover:text-indigo-600 transition-colors font-medium"
                >
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-200 group-hover:border-indigo-200 flex items-center justify-center mr-3 shadow-sm group-hover:shadow-md transition-all">
                        <FaArrowLeft className="w-3 h-3" />
                    </div>
                    Back to Task Details
                </button>

                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                    {/* Header with Gradient */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-10 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-black/10 rounded-full blur-3xl"></div>

                        <h1 className="text-3xl font-bold relative z-10">Edit Task</h1>
                        <p className="text-indigo-100 mt-2 relative z-10">Update task details, status, and remarks.</p>
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
                                className="w-full px-5 py-4 text-lg font-semibold rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-gray-900 placeholder-gray-400"
                                required
                            />
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
                                        className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-gray-800 appearance-none cursor-pointer font-medium"
                                    >
                                        <option value="PENDING">Pending</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="COMPLETED">Completed</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
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
                                className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-gray-700 placeholder-gray-400 resize-none leading-relaxed"
                            />
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
                                    className="w-full px-5 py-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-gray-700 placeholder-indigo-300 resize-none"
                                />
                            </div>
                        </div>

                        {/* Actions Divider */}
                        <div className="border-t border-gray-100 pt-8 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-3 px-8 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
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
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditTask;
