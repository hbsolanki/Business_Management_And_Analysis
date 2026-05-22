import { FaClock, FaEdit, FaTrash, FaArrowLeft, FaEllipsisV } from 'react-icons/fa';
import { Menu, Transition } from '@headlessui/react';
import { useEffect, useState, Fragment, useCallback } from "react";
import { useParams, useNavigate, Link } from 'react-router-dom';
import ProtectedHeader from '@/components/layout/ProtectedHeader';
import { format } from 'date-fns';
import taskService from '@/features/task/services/taskService';
import { tokenService } from '@/services/tokenService';
import Modal from '@/components/ui/Modal';
import { toast } from 'react-hot-toast';
import LinkedRemindersPanel from '@/features/reminder/components/LinkedRemindersPanel';

const TaskDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const currentUser = {
        id: tokenService.getId(),
    };

    const fetchTask = useCallback(async () => {
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
    }, [id, navigate]);

    useEffect(() => {
        fetchTask();
    }, [fetchTask]);

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
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    if (!task) return null;

    const isCreator = task.assigned_by?.id == currentUser.id;
    const isAssignee = task.assignee?.id == currentUser.id;

    const canDelete = isCreator;
    const canEdit = isCreator || isAssignee;

    return (
        <div className="min-h-screen font-sans bg-transparent">
            <ProtectedHeader />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <button
                    onClick={() => navigate(-1)}
                    className="mb-6 flex items-center text-slate-500 hover:text-slate-700 transition-colors font-medium"
                >
                    <FaArrowLeft className="mr-2" /> Back to Tasks
                </button>

                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    {/* Header Status Bar */}
                    <div className={`h-2 w-full ${task.status === 'COMPLETED' ? 'bg-emerald-500' :
                        task.status === 'IN_PROGRESS' ? 'bg-slate-900' :
                            'bg-amber-500'
                        }`} />

                    <div className="p-8">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${task.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                    task.status === 'IN_PROGRESS' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                                        'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}>
                                    {task.status}
                                </span>
                                <span className="text-slate-400 text-sm flex items-center gap-1">
                                    <FaClock size={12} />
                                    {task.created_at ? format(new Date(task.created_at), 'MMM d, yyyy h:mm a') : '-'}
                                </span>
                            </div>

                            <div className="flex gap-2 items-center">
                                {(canEdit || canDelete) && (
                                    <Menu as="div" className="relative inline-block text-left">
                                        <div>
                                            <Menu.Button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none">
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
                                            <Menu.Items className="bg-white border border-slate-200 absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-xl shadow-lg focus:outline-none overflow-hidden">
                                                <div className="p-1">
                                                    {canEdit && (
                                                        <Menu.Item>
                                                            {({ active }) => (
                                                                <button
                                                                    onClick={() => navigate(`/tasks/${task.id}/edit`)}
                                                                    className={`${active ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
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
                                                                    className={`${active ? 'bg-red-50 text-red-600' : 'text-slate-700'
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

                        <h1 className="text-3xl font-semibold text-slate-900 mb-6 leading-tight">{task.title}</h1>

                        <div className="prose prose-slate max-w-none text-slate-600 mb-8 bg-white p-6 rounded-2xl border border-slate-200">
                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2">Description</h3>
                            <p className="whitespace-pre-wrap">{task.description || "No description provided."}</p>
                        </div>

                        {task.remarks && (
                            <div className="prose prose-slate max-w-none text-slate-600 mb-8 bg-amber-50 p-6 rounded-2xl border border-amber-200">
                                <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wider mb-2">Remarks</h3>
                                <p className="whitespace-pre-wrap text-amber-900">{task.remarks}</p>
                            </div>
                        )}

                        {/* ── Linked Reminders Panel ── */}
                        <div className="mb-8">
                            <LinkedRemindersPanel
                                entityType="tasks.task"
                                entityId={task.id}
                                entityTitle={task.title}
                                entityDeadline={task.deadline}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-200 pt-8">
                            {/* Deadline Card */}
                            {task.deadline && (
                                <div className="bg-rose-50/30 border border-rose-100 flex items-center gap-4 p-4 rounded-xl shadow-sm md:col-span-2">
                                    <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 text-lg border border-rose-100 shadow-sm">
                                        <FaClock />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-0.5">Deadline</p>
                                        <p className="font-semibold text-slate-900">
                                            {format(new Date(task.deadline), 'MMM d, yyyy h:mm a')}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {new Date(task.deadline) < new Date() ? (
                                                <span className="text-rose-600 font-bold">Overdue</span>
                                            ) : (
                                                <span className="text-emerald-600 font-medium">Active</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Assignee Card */}
                            <Link
                                to={task.assignee?.id ? `/profile/${task.assignee.id}` : "#"}
                                className={`bg-white border border-slate-200 flex items-center gap-4 p-4 rounded-xl transition-all ${task.assignee?.id ? "hover:border-brand-200 hover:bg-brand-50/40 hover:shadow-sm" : "pointer-events-none"}`}
                            >
                                {task.assignee?.profile_picture ? (
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shadow-sm">
                                        <img src={task.assignee.profile_picture} alt={task.assignee.username} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 text-lg font-bold border border-slate-200 shadow-sm">
                                        {task.assignee?.username.substring(0, 1).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Assigned To</p>
                                    <p className="font-semibold text-slate-900">{task.assignee?.first_name} {task.assignee?.last_name}</p>
                                    <p className="text-xs text-slate-500">@{task.assignee?.username}</p>
                                </div>
                            </Link>

                            {/* Creator Card */}
                            <Link
                                to={task.assigned_by?.id ? `/profile/${task.assigned_by.id}` : "#"}
                                className={`bg-white border border-slate-200 flex items-center gap-4 p-4 rounded-xl transition-all ${task.assigned_by?.id ? "hover:border-brand-200 hover:bg-brand-50/40 hover:shadow-sm" : "pointer-events-none"}`}
                            >
                                {task.assigned_by?.profile_picture ? (
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shadow-sm">
                                        <img src={task.assigned_by.profile_picture} alt={task.assigned_by.username} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 text-lg font-bold border border-slate-200 shadow-sm">
                                        {task.assigned_by?.username.substring(0, 1).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Assigned By</p>
                                    <p className="font-semibold text-slate-900">{task.assigned_by?.first_name} {task.assigned_by?.last_name}</p>
                                    <p className="text-xs text-slate-500">{task.assigned_by?.email}</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

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
