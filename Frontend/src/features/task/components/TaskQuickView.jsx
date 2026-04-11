import { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import { FaTasks, FaChevronRight, FaEdit } from 'react-icons/fa';
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
                    setTasks(data);
                } else if (data && Array.isArray(data.results)) {
                    setTasks(data.results);
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
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col h-full shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-sm">
                        <FaTasks size={14} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                        <p className="text-xs text-slate-500">
                            {loading ? "Loading tasks..." : `${tasks.length} items`}
                        </p>
                    </div>
                </div>
                <Link
                    to="/tasks"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                >
                    View All <FaChevronRight size={10} />
                </Link>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin h-5 w-5 border-2 border-slate-500 border-t-transparent rounded-full"></div>
                </div>
            ) : tasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-2 border border-slate-200">
                        <FaTasks className="text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-500">No tasks found</p>
                </div>
            ) : (
                <div className="space-y-7 flex-1 overflow-y-auto max-h-[360px] pr-3 custom-scrollbar">
                    {tasks.map(task => {
                        const statusStyle = task.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : task.status === 'IN_PROGRESS'
                                ? 'bg-slate-100 text-slate-700 border-slate-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200';

                        return (
                            <div key={task.id} className="group relative rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <Link to={`/tasks/${task.id}`} className="block">
                                                <h4 className="text-sm font-semibold text-slate-900 line-clamp-1">{task.title}</h4>
                                                <p className="text-xs text-slate-400 line-clamp-1 mt-1">{task.description || "No description"}</p>
                                            </Link>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusStyle}`}>
                                                {task.status}
                                            </span>
                                            <Link
                                                to={`/tasks/${task.id}/edit`}
                                                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border border-slate-200 text-slate-600 bg-white hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Edit Task"
                                            >
                                                <FaEdit className="text-[10px]" />
                                                Edit
                                            </Link>
                                        </div>
                                    </div>
                                    <Link to={`/tasks/${task.id}`} className="block">
                                        <div className="mt-3 flex items-center justify-between">
                                            <span className="text-[10px] text-slate-400">
                                                {task.created_at ? format(new Date(task.created_at), 'MMM d, h:mm a') : '-'}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-400">
                                                    {type === 'assigned_to' ? 'By' : 'To'}
                                                </span>
                                                {(() => {
                                                    const userToShow = type === 'assigned_to' ? task.assigned_by : task.assignee;
                                                    return (
                                                        <div className="flex items-center gap-2">
                                                            {userToShow?.profile_picture ? (
                                                                <img
                                                                    src={userToShow.profile_picture}
                                                                    alt={userToShow.username}
                                                                    className="w-6 h-6 rounded-full object-cover border border-slate-200"
                                                                    title={type === 'assigned_to' ? `Assigned by: ${userToShow.username}` : `Assignee: ${userToShow.username}`}
                                                                />
                                                            ) : (
                                                                <div
                                                                    className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700"
                                                                    title={type === 'assigned_to' ? `Assigned by: ${userToShow?.username}` : `Assignee: ${userToShow?.username}`}
                                                                >
                                                                    {userToShow?.username?.substring(0, 1).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <span className="text-[10px] font-semibold text-slate-600">
                                                                {userToShow?.username || "User"}
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TaskQuickView;
