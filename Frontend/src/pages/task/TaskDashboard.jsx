import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Modal from '@/components/ui/Modal';
import ProtectedHeader from '@/components/layout/ProtectedHeader';
import { FaTasks, FaPlus } from 'react-icons/fa';
import { useTaskData } from '@/features/task/hooks/useTaskData';
import TaskCard from '@/features/task/components/TaskCard';
import CreateTaskModal from '@/features/task/components/CreateTaskModal';
import { tokenService } from '@/services/tokenService';

const TaskDashboard = () => {
    const { tasks, loading, creating, fetchTasks, createTask, updateTask, deleteTask } = useTaskData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editTask, setEditTask] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [activeTab, setActiveTab] = useState('assigned_to'); // 'assigned_to' or 'assigned_by'

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
        // Fetch tasks based on the determined active tab
        fetchTasks(activeTab);
    }, [fetchTasks, activeTab]);

    const handleCreateClick = () => {
        setEditTask(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (task) => {
        setEditTask(task);
        setIsModalOpen(true);
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
        <div className="min-h-screen bg-gray-50 font-sans">
            <ProtectedHeader />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Dashboard Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                            <span className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                                <FaTasks size={24} />
                            </span>
                            Task Management
                        </h1>
                        <p className="mt-2 text-gray-500 font-medium">
                            Manage and track team assignments efficiently
                        </p>
                    </div>

                    {canManageTasks && (
                        <button
                            onClick={handleCreateClick}
                            className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5"
                        >
                            <FaPlus className="mr-2" />
                            New Task
                        </button>
                    )}
                </div>

                {/* Tabs */}
                {canManageTasks && (
                    <div className="flex space-x-1 bg-gray-200 p-1 rounded-xl w-fit mb-6">
                        <button
                            onClick={() => navigate('/tasks/my-tasks')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'assigned_to' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                        >
                            My Tasks
                        </button>
                        <button
                            onClick={() => navigate('/tasks/created')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'assigned_by' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                        >
                            Created Tasks
                        </button>
                    </div>
                )}

                {/* Task List */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                        <div className="mx-auto w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <FaTasks className="text-gray-300 text-4xl" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">No tasks found</h3>
                        <p className="text-gray-500 mb-6">
                            {activeTab === 'assigned_by' ? "You haven't assigned any tasks yet." : "You have no tasks assigned to you."}
                        </p>
                        {canManageTasks && activeTab === 'assigned_by' && (
                            <button
                                onClick={handleCreateClick}
                                className="inline-flex items-center justify-center px-5 py-2.5 border-2 border-dashed border-indigo-200 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors"
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
                                onEdit={handleEditClick}
                                onDelete={handleDeleteClick}
                            />
                        ))}
                    </div>
                )}
            </main>

            <CreateTaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={createTask}
                onUpdate={updateTask}
                task={editTask}
            />

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
