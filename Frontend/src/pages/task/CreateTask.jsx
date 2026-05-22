import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { FaSave, FaSearch, FaTimes, FaUserPlus, FaClipboardList, FaInfoCircle } from 'react-icons/fa';
import ProtectedHeader from '@/components/layout/ProtectedHeader';
import BackButton from '@/components/shared/BackButton';
import { tokenService } from '@/services/tokenService';
import taskService from '@/features/task/services/taskService';
import api from '@/services/api';
import toast from 'react-hot-toast';

const CreateTask = () => {
    const navigate = useNavigate();
    const role = tokenService.getRole();
    const canManageTasks = ['OWNER', 'MANAGER'].includes(role);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [remarks, setRemarks] = useState('');
    const [status] = useState('PENDING');
    const [assigneeId, setAssigneeId] = useState(null);
    const [deadline, setDeadline] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [saving, setSaving] = useState(false);

    // Errors
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState('');

    const getUserInitials = (user) => {
        if (!user) return "U";
        const first = user.first_name?.[0] || "";
        const last = user.last_name?.[0] || "";
        return `${first}${last}`.trim().toUpperCase() || user.username?.[0]?.toUpperCase() || "U";
    };

    useEffect(() => {
        if (!canManageTasks) {
            toast.error('You do not have permission to create tasks.');
            navigate('/tasks', { replace: true });
        }
    }, [canManageTasks, navigate]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery && !selectedUser) {
                setLoadingSearch(true);
                try {
                    const response = await api.get(`/user/?search=${searchQuery}`);
                    if (response.data && Array.isArray(response.data.results)) {
                        setSearchResults(response.data.results);
                    } else if (Array.isArray(response.data)) {
                        setSearchResults(response.data);
                    } else {
                        setSearchResults([]);
                    }
                } catch (error) {
                    console.error('Search failed', error);
                    setSearchResults([]);
                } finally {
                    setLoadingSearch(false);
                }
            } else if (!searchQuery) {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, selectedUser]);

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setAssigneeId(user.id);
        setSearchQuery(`${user.first_name || ''} ${user.last_name || ''} (${user.username})`.trim());
        setSearchResults([]);
        if (errors.assignee_id) {
            setErrors(p => ({ ...p, assignee_id: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !description || !assigneeId) return;

        setSaving(true);
        setErrors({});
        setFormError('');
        try {
            await taskService.createTask({
                title,
                description,
                remarks: remarks || undefined,
                status,
                assignee_id: assigneeId,
                deadline: deadline || undefined,
            });
            toast.success('Task created successfully');
            navigate(-1);
        } catch (error) {
            console.error('Failed to create task', error);
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
            toast.error('Failed to create task');
        } finally {
            setSaving(false);
        }
    };

    const titleClass = `w-full px-4 py-2.5 rounded-xl transition-all outline-none text-sm font-medium placeholder-slate-400 focus:ring-4 focus:ring-slate-100 ${
        errors.title 
            ? "border border-rose-400 bg-rose-50 text-rose-955 focus:border-rose-500 focus:ring-rose-500/5" 
            : "bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white text-slate-900"
    }`;

    const assigneeClass = `w-full pl-10 pr-4 py-2.5 rounded-xl transition-all outline-none text-sm font-medium placeholder-slate-400 focus:ring-4 focus:ring-slate-100 ${
        errors.assignee_id 
            ? "border border-rose-400 bg-rose-50 text-rose-955 focus:border-rose-500 focus:ring-rose-500/5" 
            : "bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white text-slate-900"
    }`;

    const descriptionClass = `w-full px-4 py-3 rounded-xl transition-all outline-none text-sm font-medium placeholder-slate-400 min-h-[110px] resize-none focus:ring-4 focus:ring-slate-100 ${
        errors.description 
            ? "border border-rose-400 bg-rose-50 text-rose-955 focus:border-rose-500 focus:ring-rose-500/5" 
            : "bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white text-slate-900"
    }`;

    const remarksClass = `w-full px-4 py-3 rounded-xl transition-all outline-none text-sm font-medium placeholder-slate-400 min-h-[80px] resize-none focus:ring-4 focus:ring-slate-100 ${
        errors.remarks 
            ? "border border-rose-400 bg-rose-50 text-rose-955 focus:border-rose-500 focus:ring-rose-500/5" 
            : "bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white text-slate-900"
    }`;

    return (
        <div className="min-h-screen font-sans bg-transparent">
            <ProtectedHeader />

            <main className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
                <div className="mb-4">
                    <BackButton to="/tasks" label="Back to Tasks" />
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-8 border-b border-slate-100 bg-white">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
                                <FaClipboardList className="text-lg" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 leading-none">New Task</h1>
                                <p className="text-xs text-slate-500 mt-1.5">Assign work with clarity and context.</p>
                            </div>
                        </div>
                    </div>

                    {formError && (
                        <div className="mx-6 mt-4 flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
                            <FaInfoCircle className="text-rose-500 mt-0.5" size={14} />
                            <p className="text-xs font-bold text-rose-900">{formError}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Task Title */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Title <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                className={titleClass}
                                placeholder="Brief title of the task"
                                value={title}
                                onChange={(e) => {
                                    setTitle(e.target.value);
                                    if (errors.title) setErrors(p => ({ ...p, title: null }));
                                }}
                                required
                            />
                            {errors.title && (
                                <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">
                                    {errors.title[0]}
                                </p>
                            )}
                        </div>

                        {/* Assignee */}
                        <div className="relative">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Assignee <span className="text-red-500">*</span></label>
                            {selectedUser ? (
                                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 flex items-center justify-between gap-3 animate-fade-in">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white shadow-sm">
                                            {selectedUser.profile_picture ? (
                                                <img src={selectedUser.profile_picture} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                                    {getUserInitials(selectedUser)}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{selectedUser.first_name} {selectedUser.last_name}</p>
                                            <p className="text-[10px] text-slate-500 font-medium">@{selectedUser.username} • {selectedUser.role}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedUser(null);
                                            setAssigneeId(null);
                                            setSearchQuery('');
                                            if (errors.assignee_id) setErrors(p => ({ ...p, assignee_id: null }));
                                        }}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white text-slate-400 hover:text-red-500 transition-all shadow-sm"
                                    >
                                        <FaTimes size={10} />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative group">
                                    <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={12} />
                                    <input
                                        type="text"
                                        className={assigneeClass}
                                        placeholder="Search teammate by name..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            if (errors.assignee_id) setErrors(p => ({ ...p, assignee_id: null }));
                                        }}
                                        required={!selectedUser}
                                    />
                                    {loadingSearch && (
                                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                            <div className="animate-spin h-3.5 w-3.5 border-2 border-slate-300 border-t-slate-900 rounded-full" />
                                        </div>
                                    )}
                                </div>
                            )}
                            {errors.assignee_id && (
                                <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">
                                    {errors.assignee_id[0]}
                                </p>
                            )}

                            {searchResults.length > 0 && !selectedUser && (
                                <div className="bg-white border border-slate-100 absolute z-50 w-full mt-1.5 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar animate-fade-in-up border-slate-200">
                                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">Found {searchResults.length} users</div>
                                    {searchResults.map((user) => (
                                        <div
                                            key={user.id}
                                            onClick={() => handleSelectUser(user)}
                                            className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center gap-3 transition-colors group"
                                        >
                                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-100 grayscale hover:grayscale-0 transition-all">
                                                {user.profile_picture ? (
                                                    <img src={user.profile_picture} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                        {getUserInitials(user)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-[13px] font-bold text-slate-900 group-hover:text-slate-900">{user.first_name} {user.last_name}</div>
                                                <div className="text-[11px] text-slate-500">@{user.username} • {user.role}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Description <span className="text-red-500">*</span></label>
                            <textarea
                                className={descriptionClass}
                                placeholder="Details and instructions..."
                                value={description}
                                onChange={(e) => {
                                    setDescription(e.target.value);
                                    if (errors.description) setErrors(p => ({ ...p, description: null }));
                                }}
                                required
                            />
                            {errors.description && (
                                <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">
                                    {errors.description[0]}
                                </p>
                            )}
                        </div>

                        {/* Remarks */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Remarks</label>
                            <textarea
                                className={remarksClass}
                                placeholder="Additional notes (optional)"
                                value={remarks}
                                onChange={(e) => {
                                    setRemarks(e.target.value);
                                    if (errors.remarks) setErrors(p => ({ ...p, remarks: null }));
                                }}
                            />
                            {errors.remarks && (
                                <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">
                                    {errors.remarks[0]}
                                </p>
                            )}
                        </div>

                        {/* Deadline */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Deadline</label>
                            <input
                                type="datetime-local"
                                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white text-slate-900 transition-all outline-none text-sm font-medium placeholder-slate-400 focus:ring-4 focus:ring-slate-100"
                                value={deadline}
                                onChange={(e) => {
                                    setDeadline(e.target.value);
                                    if (errors.deadline) setErrors(p => ({ ...p, deadline: null }));
                                }}
                            />
                            {errors.deadline && (
                                <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">
                                    {errors.deadline[0]}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
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
                                disabled={saving || !title || !description || !assigneeId}
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
                                        <span>Create Task</span>
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

export default CreateTask;
