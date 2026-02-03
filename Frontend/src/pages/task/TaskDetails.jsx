import { FaUser, FaClock, FaCheckCircle, FaExclamationCircle, FaEdit, FaTrash, FaArrowLeft, FaEllipsisV } from 'react-icons/fa';
import { Menu, Transition } from '@headlessui/react';
import React, { useEffect, useState, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProtectedHeader from '@/components/layout/ProtectedHeader';
import { format } from 'date-fns';
import taskService from '@/features/task/services/taskService';
import { tokenService } from '@/services/tokenService';
import Modal from '@/components/ui/Modal';
import CreateTaskModal from '@/features/task/components/CreateTaskModal';
import { toast } from 'react-hot-toast';

const TaskDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const currentUser = {
        id: tokenService.getId(),
        role: tokenService.getRole()
    };

    const fetchTask = async () => {
        try {
            const data = await taskService.getTaskById(id);
            setTask(data);
        } catch (error) {
            console.error("Failed to fetch task", error);
            toast.error("Failed to load task details");
            navigate('/tasks');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTask();
    }, [id]);

    const handleUpdate = async (taskId, updatedData) => {
        try {
            const updatedTask = await taskService.updateTask(taskId, updatedData);
            setTask(updatedTask);
            toast.success("Task updated successfully");
            setIsEditModalOpen(false);
            return true;
        } catch (error) {
            console.error("Failed to update task", error);
            toast.error("Failed to update task");
            return false;
        }
    };

    const handleDelete = async () => {
        try {
            await taskService.deleteTask(id);
            toast.success("Task deleted successfully");
            navigate('/tasks');
        } catch (error) {
            console.error("Failed to delete task", error);
            toast.error("Failed to delete task");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!task) return null;

    // Permission Logic
    const isOwner = currentUser.role === 'OWNER';
    const isManager = currentUser.role === 'MANAGER';

    // Check if user is the creator (assigned_by)

    const isCreator = task.assigned_by?.id == currentUser.id;
    // Check if user is the assignee
    const isAssignee = task.assignee?.id == currentUser.id;

    // Creators can delete
    const canDelete = isCreator;

    // Creators and Assignees can edit (Assignees might be limited by backend, but UI allows opening modal)
    const canEdit = isCreator || isAssignee;

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <ProtectedHeader />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <button
                    onClick={() => navigate(-1)}
                    className="mb-6 flex items-center text-gray-500 hover:text-gray-700 transition-colors font-medium"
                >
                    <FaArrowLeft className="mr-2" /> Back to Tasks
                </button>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Header Status Bar */}
                    <div className={`h-2 w-full ${task.status === 'COMPLETED' ? 'bg-green-500' :
                        task.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                            'bg-yellow-500'
                        }`} />

                    <div className="p-8">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                    task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                        'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    {task.status}
                                </span>
                                <span className="text-gray-400 text-sm flex items-center gap-1">
                                    <FaClock size={12} />
                                    {task.created_at ? format(new Date(task.created_at), 'MMM d, yyyy h:mm a') : '-'}
                                </span>
                            </div>

                            <div className="flex gap-2">
                                {(canEdit || canDelete) && (
                                    <Menu as="div" className="relative inline-block text-left">
                                        <div>
                                            <Menu.Button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none">
                                                <FaEllipsisV size={20} />
                                            </Menu.Button>
                                        </div>
                                        <Transition
                                            as={Fragment}
                                            enter="transition ease-out duration-100"
                                            enterFrom="transform opacity-0 scale-95"
                                            enterTo="transform opacity-100 scale-100"
                                            leave="transition ease-in duration-75"
                                            leaveFrom="transform opacity-100 scale-100"
                                            leaveTo="transform opacity-0 scale-95"
                                        >
                                            <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden">
                                                <div className="p-1">
                                                    {canEdit && (
                                                        <Menu.Item>
                                                            {({ active }) => (
                                                                <button
                                                                    onClick={() => navigate(`/tasks/${task.id}/edit`)}
                                                                    className={`${active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'
                                                                        } group flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors`}
                                                                >
                                                                    <FaEdit className="mr-3 h-4 w-4" aria-hidden="true" />
                                                                    Edit Task
                                                                </button>
                                                            )}
                                                        </Menu.Item>
                                                    )}
                                                    {canDelete && (
                                                        <Menu.Item>
                                                            {({ active }) => (
                                                                <button
                                                                    onClick={() => setIsDeleteModalOpen(true)}
                                                                    className={`${active ? 'bg-red-50 text-red-600' : 'text-gray-700'
                                                                        } group flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors`}
                                                                >
                                                                    <FaTrash className="mr-3 h-4 w-4" aria-hidden="true" />
                                                                    Delete Task
                                                                </button>
                                                            )}
                                                        </Menu.Item>
                                                    )}
                                                </div>
                                            </Menu.Items>
                                        </Transition>
                                    </Menu>
                                )}
                            </div>
                        </div>

                        <h1 className="text-3xl font-bold text-gray-900 mb-6 leading-tight">{task.title}</h1>

                        <div className="prose prose-indigo max-w-none text-gray-600 mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Description</h3>
                            <p className="whitespace-pre-wrap">{task.description || "No description provided."}</p>
                        </div>

                        {task.remarks && (
                            <div className="prose prose-indigo max-w-none text-gray-600 mb-8 bg-yellow-50 p-6 rounded-2xl border border-yellow-100">
                                <h3 className="text-sm font-bold text-yellow-800 uppercase tracking-wider mb-2">Remarks</h3>
                                <p className="whitespace-pre-wrap text-yellow-900">{task.remarks}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-100 pt-8">
                            {/* Assignee Card */}
                            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                {task.assignee?.profile_picture ? (
                                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm ring-2 ring-indigo-50">
                                        <img src={task.assignee.profile_picture} alt={task.assignee.username} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-lg font-bold border-2 border-white shadow-sm ring-2 ring-indigo-50">
                                        {task.assignee?.username.substring(0, 1).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Assigned To</p>
                                    <p className="font-bold text-gray-900">{task.assignee?.first_name} {task.assignee?.last_name}</p>
                                    <p className="text-xs text-gray-500">@{task.assignee?.username}</p>
                                </div>
                            </div>

                            {/* Creator Card */}
                            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                {task.assigned_by?.profile_picture ? (
                                    <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm ring-2 ring-pink-50">
                                        <img src={task.assigned_by.profile_picture} alt={task.assigned_by.username} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 text-lg font-bold border-2 border-white shadow-sm ring-2 ring-pink-50">
                                        {task.assigned_by?.username.substring(0, 1).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Assigned By</p>
                                    <p className="font-bold text-gray-900">{task.assigned_by?.first_name} {task.assigned_by?.last_name}</p>
                                    <p className="text-xs text-gray-500">{task.assigned_by?.email}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <CreateTaskModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onUpdate={handleUpdate}
                task={task}
            />

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Task"
                message="Are you sure you want to delete this task? This action cannot be undone."
                onConfirm={handleDelete}
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
            />
        </div>
    );
};

export default TaskDetails;
