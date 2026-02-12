import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Modal from '@/components/ui/Modal';
import ProtectedHeader from '@/components/layout/ProtectedHeader';
import { FaTasks, FaPlus } from 'react-icons/fa';
import { useTaskData } from '@/features/task/hooks/useTaskData';
import TaskCard from '@/features/task/components/TaskCard';
import { tokenService } from '@/services/tokenService';

const TaskDashboard = () => {
    const { tasks, loading, fetchTasks, deleteTask } = useTaskData();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [activeTab, setActiveTab] = useState('assigned_to'); // 'assigned_to' or 'assigned_by'

    const [filters, setFilters] = useState({
        title: '',
        from_date: '',
        to_date: '',
        remarks: ''
    });

    // Only Owners and Managers can create tasks
    const role = tokenService.getRole();
    const canManageTasks = ['OWNER', 'MANAGER'].includes(role);

    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        // Redirection logic for root /tasks
        if (location.pathname === '/tasks') {
            if (canManageTasks) {
                navigate('/tasks/created', { replace: true });
            } else {
                navigate('/tasks/my-tasks', { replace: true });
            }
        }

        // Set active tab based on path
        if (location.pathname.includes('created')) {
            setActiveTab('assigned_by');
        } else {
            setActiveTab('assigned_to');
        }
    }, [location.pathname, canManageTasks, navigate]);

    useEffect(() => {
        // Fetch tasks based on the determined active tab and filters
        const timer = setTimeout(() => {
            fetchTasks(activeTab, filters);
        }, 500);

        return () => clearTimeout(timer);
    }, [fetchTasks, activeTab]); // Removed filters from dependency to prevent auto-fetch

    const handleFilterClick = () => {
        fetchTasks(activeTab, filters);
    };

    const handleCreateClick = () => {
        navigate('/tasks/new');
    };

    const handleDeleteClick = (id) => {
        setDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (deleteId) {
            await deleteTask(deleteId);
            setIsDeleteModalOpen(false);
            setDeleteId(null);
        }
    };

    return (
        <div className="min-h-screen font-sans bg-transparent">
            <ProtectedHeader />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Dashboard Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight flex items-center gap-3">
                            <span className="p-2 bg-slate-900 rounded-lg text-white">
                                <FaTasks size={24} />
                            </span>
                            Task Management
                        </h1>
                        <p className="mt-2 text-slate-500 font-medium">
                            Manage and track team assignments efficiently
                        </p>
                    </div>

                    {canManageTasks && (
                        <button
                            onClick={handleCreateClick}
                            className="inline-flex items-center justify-center px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 shadow-sm transition-all"
                        >
                            <FaPlus className="mr-2" />
                            New Task
                        </button>
                    )}
                </div>

                {/* Tabs */}
                {canManageTasks && (
                    <div className="flex space-x-1 bg-white border border-slate-200 p-1 rounded-xl w-fit mb-6">
                        <button
                            onClick={() => navigate('/tasks/my-tasks')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'assigned_to' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                            My Tasks
                        </button>
                        <button
                            onClick={() => navigate('/tasks/created')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'assigned_by' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                            Created Tasks
                        </button>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white border border-slate-200 p-4 rounded-xl mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 shadow-sm">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Title</label>
                        <input
                            type="text"
                            placeholder="Filter by title..."
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none"
                            value={filters.title}
                            onChange={(e) => setFilters(prev => ({ ...prev, title: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">From Date</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none"
                            value={filters.from_date}
                            onChange={(e) => setFilters(prev => ({ ...prev, from_date: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">To Date</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none"
                            value={filters.to_date}
                            onChange={(e) => setFilters(prev => ({ ...prev, to_date: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Remarks</label>
                        <input
                            type="text"
                            placeholder="Filter by remarks..."
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none"
                            value={filters.remarks}
                            onChange={(e) => setFilters(prev => ({ ...prev, remarks: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="flex justify-end mb-6">
                    <button
                        onClick={handleFilterClick}
                        className="px-6 py-2 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                    >
                        Apply Filters
                    </button>
                </div>

                {/* Task List */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                        <div className="mx-auto w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-200">
                            <FaTasks className="text-slate-300 text-4xl" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">No tasks found</h3>
                        <p className="text-slate-500 mb-6">
                            {filters.title || filters.from_date || filters.to_date || filters.remarks
                                ? "No tasks match your filters."
                                : (activeTab === 'assigned_by' ? "You haven't assigned any tasks yet." : "You have no tasks assigned to you.")}
                        </p>
                        {canManageTasks && activeTab === 'assigned_by' && !filters.title && !filters.from_date && !filters.to_date && !filters.remarks && (
                            <button
                                onClick={handleCreateClick}
                                className="inline-flex items-center justify-center px-5 py-2.5 border-2 border-dashed border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                <FaPlus className="mr-2" />
                                Create First Task
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {tasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onDelete={handleDeleteClick}
                            />
                        ))}
                    </div>
                )}
            </main>

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Task"
                message="Are you sure you want to delete this task? This action cannot be undone."
                onConfirm={confirmDelete}
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
            />
        </div>
    );
};

export default TaskDashboard;
