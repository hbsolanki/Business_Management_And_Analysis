import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaTasks, FaChevronRight } from 'react-icons/fa';
import taskService from '@/features/task/services/taskService';
import { format } from 'date-fns';

const TaskQuickView = ({ type = 'assigned_to', title = 'My Tasks' }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                let data;
                if (type === 'assigned_by') {
                    data = await taskService.getAssignedByTasks();
                } else {
                    data = await taskService.getAssigneeTasks();
                }

                if (Array.isArray(data)) {
                    setTasks(data.slice(0, 3)); // Only show top 3
                } else if (data && Array.isArray(data.results)) {
                    setTasks(data.results.slice(0, 3));
                }
            } catch (error) {
                console.error("Failed to fetch quick view tasks", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, [type]);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <div className="p-2 bg-pink-50 text-pink-500 rounded-lg">
                        <FaTasks size={16} />
                    </div>
                    {title}
                </h3>
                <Link
                    to="/tasks"
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                >
                    View All <FaChevronRight size={10} />
                </Link>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                </div>
            ) : tasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                        <FaTasks className="text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500">No tasks found</p>
                </div>
            ) : (
                <div className="space-y-3 flex-1">
                    {tasks.map(task => (
                        <div key={task.id} className="group relative p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Link
                                    to={`/tasks/${task.id}/edit`}
                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg shadow-sm"
                                    title="Edit Task"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                        <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                                    </svg>
                                </Link>
                            </div>
                            <Link to={`/tasks/${task.id}`} className="block">
                                <div className="flex justify-between items-start mb-1 pr-6">
                                    <h4 className="text-sm font-bold text-gray-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">{task.title}</h4>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                        task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {task.status}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 line-clamp-1 mb-2">{task.description}</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-gray-400">
                                        {task.created_at ? format(new Date(task.created_at), 'MMM d, h:mm a') : '-'}
                                    </span>
                                    <div className="flex -space-x-1.5">
                                        {(() => {
                                            const userToShow = type === 'assigned_to' ? task.assigned_by : task.assignee;
                                            return userToShow?.profile_picture ? (
                                                <img
                                                    src={userToShow.profile_picture}
                                                    alt={userToShow.username}
                                                    className="w-5 h-5 rounded-full object-cover border border-white"
                                                    title={type === 'assigned_to' ? `Assigned by: ${userToShow.username}` : `Assignee: ${userToShow.username}`}
                                                />
                                            ) : (
                                                <div
                                                    className="w-5 h-5 rounded-full bg-indigo-100 border border-white flex items-center justify-center text-[8px] font-bold text-indigo-600"
                                                    title={type === 'assigned_to' ? `Assigned by: ${userToShow?.username}` : `Assignee: ${userToShow?.username}`}
                                                >
                                                    {userToShow?.username?.substring(0, 1).toUpperCase()}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TaskQuickView;
