import { useState, useEffect } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import Modal from '@/components/ui/Modal';
import ProtectedHeader from '@/components/layout/ProtectedHeader';
import { FaTasks, FaPlus, FaSearch, FaChevronDown, FaPlay, FaUndo } from 'react-icons/fa';
import { useTaskData } from '@/features/task/hooks/useTaskData';
import TaskCard from '@/features/task/components/TaskCard';
import { tokenService } from '@/services/tokenService';
import UserSearchFilter from '@/components/shared/UserSearchFilter';
import TaskGroupSearchFilter from '@/components/shared/TaskGroupSearchFilter';

const TaskDashboard = () => {
    const { tasks, loading, fetchTasks, deleteTask } = useTaskData();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [activeTab, setActiveTab] = useState('assigned_to'); // 'assigned_to' or 'assigned_by'

    const EMPTY_FILTERS = {
        title: '',
        from_deadline: '',
        to_deadline: '',
        assignee: '',
        taskgroup: ''
    };
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);

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
        // Intentionally skip `filters` to avoid auto-fetch on each keystroke.
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                <div className="flex space-x-1 bg-white border border-slate-200 p-1 rounded-xl w-fit mb-6">
                    <button
                        onClick={() => navigate('/tasks/my-tasks')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'assigned_to' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                        My Tasks
                    </button>
                    {canManageTasks && (
                        <button
                            onClick={() => navigate('/tasks/created')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'assigned_by' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                            Created Tasks
                        </button>
                    )}
                    <button
                        onClick={() => navigate('/tasks/groups')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all text-slate-600 hover:text-slate-900`}>
                        Task Groups
                    </button>
                </div>

                {/* GST Style Filters */}
                <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <button 
                        onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                        className="w-full flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-all duration-300"
                    >
                        <div className="flex items-center gap-3">
                            <FaSearch size={12} className={Object.values(filters).some(Boolean) ? "text-slate-900" : "text-slate-400"} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Task Filters</span>
                        </div>
                        <div className={`text-slate-400 transition-transform duration-300 ${isFiltersExpanded ? "rotate-180" : ""}`}>
                            <FaChevronDown size={10} />
                        </div>
                    </button>

                    {isFiltersExpanded && (
                        <div className="p-5 sm:p-6 border-t border-slate-50 space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Title</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 z-10 flex items-center pl-5 pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                                            <FaSearch size={12} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Filter by title..."
                                            value={filters.title}
                                            onChange={(e) => setFilters(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 py-2.5 text-sm font-medium leading-6 tracking-normal text-slate-900 caret-slate-900 outline-none transition-all placeholder:text-sm placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100"
                                        />
                                    </div>
                                </div>

                                <UserSearchFilter
                                    label="Assignee Name"
                                    placeholder="Search assignee..."
                                    value={filters.assignee}
                                    onChange={(val) => setFilters(prev => ({ ...prev, assignee: val }))}
                                />
                                <TaskGroupSearchFilter
                                    label="Task Group Name"
                                    placeholder="Search task group..."
                                    value={filters.taskgroup}
                                    onChange={(val) => setFilters(prev => ({ ...prev, taskgroup: val }))}
                                />

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">From Deadline</label>
                                    <input
                                        type="date"
                                        value={filters.from_deadline}
                                        onChange={(e) => setFilters(prev => ({ ...prev, from_deadline: e.target.value }))}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm font-medium leading-6 tracking-normal text-slate-900 caret-slate-900 outline-none transition-all focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">To Deadline</label>
                                    <input
                                        type="date"
                                        value={filters.to_deadline}
                                        onChange={(e) => setFilters(prev => ({ ...prev, to_deadline: e.target.value }))}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm font-medium leading-6 tracking-normal text-slate-900 caret-slate-900 outline-none transition-all focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
                                <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
                                    <button
                                        onClick={handleFilterClick}
                                        className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
                                    >
                                        <FaPlay size={10} className="text-slate-400" />
                                        Apply Filters
                                    </button>
                                    <button
                                        onClick={() => {
                                            setFilters(EMPTY_FILTERS);
                                            fetchTasks(activeTab, EMPTY_FILTERS);
                                        }}
                                        className="w-full sm:w-auto px-8 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95"
                                    >
                                        <FaUndo size={10} />
                                        Reset Parameters
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
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
                            {filters.title || filters.from_date || filters.to_date
                                ? "No tasks match your filters."
                                : (activeTab === 'assigned_by' ? "You haven't assigned any tasks yet." : "You have no tasks assigned to you.")}
                        </p>
                        {canManageTasks && activeTab === 'assigned_by' && !filters.title && !filters.from_date && !filters.to_date && (
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
