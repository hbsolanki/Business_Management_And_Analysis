import { Fragment } from "react";
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { FaClock, FaEdit, FaTrash, FaEllipsisV } from 'react-icons/fa';
import { Menu, Transition } from '@headlessui/react';
import { tokenService } from '@/services/tokenService';

const TaskCard = ({ task, onDelete }) => {
    const currentUserId = tokenService.getId();
    const navigate = useNavigate();

    // Permission Logic
    const isCreator = task.assigned_by?.id === currentUserId;
    const isAssignee = task.assignee?.id === currentUserId || (task.assignee_group && task.assignee_group.members?.some(m => m.user?.id === currentUserId));

    // Creator can delete, Assignee cannot
    const canDelete = isCreator;

    // Both can edit (Creator: full, Assignee: limited - handled in modal/backend)
    const canEdit = isCreator || isAssignee;

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
            case 'PENDING': return 'text-amber-700 bg-amber-50 border-amber-200';
            case 'IN_PROGRESS': return 'text-slate-700 bg-slate-100 border-slate-200';
            default: return 'text-slate-600 bg-white border-slate-200';
        }
    };

    const statusStyle = getStatusColor(task.status);

    return (
        <div
            onClick={() => navigate(`/tasks/${task.id}`)}
            className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow duration-200 flex flex-col h-full relative overflow-visible group cursor-pointer"
        >
            <div className={`absolute top-0 left-0 w-1 h-full ${task.status === 'COMPLETED' ? 'bg-emerald-500' : task.status === 'PENDING' ? 'bg-amber-500' : 'bg-slate-900'}`}></div>

            <div className="flex justify-between items-start mb-3 pl-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusStyle}`}>
                    {task.status || 'PENDING'}
                </span>

                {(canEdit || canDelete) && (
                    <Menu as="div" className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                        <div>
                            <Menu.Button className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none">
                                <FaEllipsisV size={14} />
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
                            <Menu.Items className="bg-white border border-slate-200 absolute right-0 z-10 mt-2 w-36 origin-top-right rounded-xl shadow-lg focus:outline-none overflow-hidden">
                                <div className="p-1">
                                    {canEdit && (
                                        <Menu.Item>
                                            {({ active }) => (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Stop menu close from triggering card click immediately if needed, though usually handled
                                                        navigate(`/tasks/${task.id}/edit`);
                                                    }}
                                                    className={`${active ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
                                                        } group flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors`}
                                                >
                                                    <FaEdit className="mr-2 h-4 w-4" aria-hidden="true" />
                                                    Edit
                                                </button>
                                            )}
                                        </Menu.Item>
                                    )}
                                    {canDelete && (
                                        <Menu.Item>
                                            {({ active }) => (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete(task.id);
                                                    }}
                                                    className={`${active ? 'bg-red-50 text-red-600' : 'text-slate-700'
                                                        } group flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors`}
                                                >
                                                    <FaTrash className="mr-2 h-4 w-4" aria-hidden="true" />
                                                    Delete
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

            <h3 className="text-lg font-semibold text-slate-900 mb-2 pl-2 line-clamp-2 leading-tight group-hover:text-slate-900 transition-colors">
                {task.title}
            </h3>

            <p className="text-sm text-slate-500 mb-4 pl-2 line-clamp-3 flex-1">
                {task.description}
            </p>

            {task.deadline && (
                <div className="mb-4 pl-2 flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Deadline:</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        new Date(task.deadline) < new Date()
                            ? "bg-rose-50 text-rose-600 border border-rose-100"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}>
                        <FaClock size={8} className="text-current" />
                        {format(new Date(task.deadline), 'MMM d, h:mm a')}
                    </span>
                </div>
            )}

            <div className="mt-auto pl-2 pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <FaClock size={10} />
                    {task.created_at ? format(new Date(task.created_at), 'MMM d, yyyy h:mm a') : 'Date N/A'}
                </span>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                        {task.assignee_group ? (
                            <div className="flex items-center gap-1">
                                <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-sm" title={`Group: ${task.assignee_group.name}`}>
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>
                                </div>
                                <span className="text-[10px] font-bold text-slate-700 max-w-[80px] truncate">{task.assignee_group.name}</span>
                            </div>
                        ) : task.assignee?.profile_picture ? (
                            <img
                                src={task.assignee.profile_picture}
                                alt={task.assignee.username}
                                className="w-6 h-6 rounded-full object-cover shadow-sm border border-slate-200"
                            />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                                {task.assignee?.username?.substring(0, 2).toUpperCase() || 'NA'}
                            </div>
                        )}
                    </div>

                    {task.assigned_by && (
                        <div className="flex flex-col items-end text-right ml-2 border-l border-slate-200 pl-2">
                            <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">By</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-semibold text-slate-700">
                                    {task.assigned_by.first_name ? `${task.assigned_by.first_name}` : task.assigned_by.username}
                                </span>
                                {task.assigned_by.profile_picture && (
                                    <img
                                        src={task.assigned_by.profile_picture}
                                        alt={task.assigned_by.username}
                                        className="w-4 h-4 rounded-full object-cover shadow-sm border border-slate-200"
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskCard;
