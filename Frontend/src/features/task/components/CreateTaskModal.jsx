import { useState, useEffect } from "react";
import { FaSearch, FaUserPlus, FaClipboardList, FaTimes, FaInfoCircle } from 'react-icons/fa';
import api from '@/services/api';
import Modal from '@/components/ui/Modal';

const CreateTaskModal = ({ 
    isOpen, 
    onClose, 
    onCreate, 
    task, 
    onUpdate, 
    isEmbed = false, 
    initialData = null, 
    onComplete = null,
    id = null
}) => {
    const [title, setTitle] = useState(initialData?.title || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [remarks, setRemarks] = useState(initialData?.remarks || '');
    const [status, setStatus] = useState(initialData?.status || 'PENDING');
    const [assigneeId, setAssigneeId] = useState(initialData?.assignee_id || null);
    const [branchId, setBranchId] = useState(initialData?.branch_id || '');

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    
    // Error & Loading States
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [loadingTask, setLoadingTask] = useState(false);

    const isEditMode = Boolean(task || id);

    const getUserInitials = (user) => {
        if (!user) return "U";
        const first = user.first_name?.[0] || "";
        const last = user.last_name?.[0] || "";
        return `${first}${last}`.trim().toUpperCase() || user.username?.[0]?.toUpperCase() || "U";
    };

    // Fetch Task if ID is provided (for Edit mode in AI SidePanel)
    useEffect(() => {
        if (id && isEmbed) {
            const fetchTask = async () => {
                setLoadingTask(true);
                setFormError('');
                try {
                    const res = await api.get(`/task/${id}/`);
                    const t = res.data;
                    setTitle(t.title || '');
                    setDescription(t.description || '');
                    setRemarks(t.remarks || '');
                    setStatus(t.status || 'PENDING');
                    setBranchId(t.branch || '');
                    if (t.assignee) {
                        setAssigneeId(t.assignee.id);
                        setSearchQuery(`${t.assignee.first_name || ''} ${t.assignee.last_name || ''} (${t.assignee.username})`.trim());
                        setSelectedUser(t.assignee);
                    }
                } catch (e) {
                    console.error("Failed to fetch task details", e);
                    setFormError("Failed to load task details.");
                } finally {
                    setLoadingTask(false);
                }
            };
            fetchTask();
        }
    }, [id, isEmbed]);

    // Reset or Pre-fill form
    useEffect(() => {
        if (isOpen || isEmbed) {
            if (task) {
                // Edit Mode
                setTitle(task.title);
                setDescription(task.description);
                setRemarks(task.remarks || '');
                setStatus(task.status || 'PENDING');
                setBranchId(task.branch || '');
                if (task.assignee) {
                    setAssigneeId(task.assignee.id);
                    setSearchQuery(`${task.assignee.first_name || ''} ${task.assignee.last_name || ''} (${task.assignee.username})`.trim());
                    setSelectedUser(task.assignee);
                }
            } else if (!id) {
                // Create Mode (Reset or pre-fill with initialData)
                setTitle(initialData?.title || '');
                setDescription(initialData?.description || '');
                setRemarks(initialData?.remarks || '');
                setStatus(initialData?.status || 'PENDING');
                setAssigneeId(initialData?.assignee_id || null);
                setBranchId(initialData?.branch_id || '');
                setSearchQuery('');
                setSearchResults([]);
                setSelectedUser(null);
            }
        }
    }, [isOpen, task, isEmbed, initialData, id]);

    // Search logic (Debounced)
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
                    console.error("Search failed", error);
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
        if (e && e.preventDefault) e.preventDefault();
        
        setErrors({});
        setFormError('');

        const taskData = {
            title,
            description,
            remarks: remarks || null,
            status,
            branch: branchId || null,
            assignee_id: assigneeId
        };

        try {
            if (isEmbed) {
                let response;
                if (task || id) {
                    const targetId = id || task?.id;
                    response = await api.patch(`/task/${targetId}/`, taskData);
                } else {
                    response = await api.post(`/task/`, taskData);
                }
                if (onComplete) {
                    onComplete(response.data);
                }
            } else {
                let success;
                if (task) {
                    success = await onUpdate(task.id, taskData);
                } else {
                    success = await onCreate(taskData);
                }
                if (success) onClose();
            }
        } catch (err) {
            console.error("Failed to submit task", err);
            if (err.response && err.response.data) {
                const responseData = err.response.data;
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
        }
    };

    if (loadingTask) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 gap-3">
                <div className="animate-spin h-8 w-8 border-4 border-slate-950 border-t-transparent rounded-full"></div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Task Details...</p>
            </div>
        );
    }

    const titleClass = `w-full px-4 py-3 rounded-xl transition-all outline-none text-sm font-bold placeholder-slate-400 focus:ring-4 focus:ring-slate-900/5 ${
        errors.title 
            ? "border border-rose-400 bg-rose-50 text-rose-955 focus:border-rose-500 focus:ring-rose-500/5" 
            : "bg-slate-50 border border-slate-200 focus:border-slate-800 focus:bg-white text-slate-900"
    }`;

    const assigneeClass = `w-full pl-10 pr-4 py-3 rounded-xl transition-all outline-none text-sm font-bold placeholder-slate-400 ${
        errors.assignee_id 
            ? "border border-rose-400 bg-rose-50 text-rose-955 focus:border-rose-500 focus:ring-rose-500/5" 
            : "bg-slate-50 border border-slate-200 focus:border-slate-800 focus:bg-white text-slate-900"
    }`;

    const statusClass = `w-full px-4 py-3 rounded-xl transition-all outline-none text-sm font-bold focus:ring-4 focus:ring-slate-900/5 ${
        errors.status 
            ? "border border-rose-400 bg-rose-50 text-rose-955 focus:border-rose-500 focus:ring-rose-500/5" 
            : "bg-slate-50 border border-slate-200 focus:border-slate-805 focus:bg-white text-slate-900"
    }`;

    const descriptionClass = `w-full px-4 py-3 rounded-xl transition-all outline-none text-sm font-semibold placeholder-slate-400 min-h-[110px] resize-none ${
        errors.description 
            ? "border border-rose-400 bg-rose-50 text-rose-955 focus:border-rose-500 focus:ring-rose-500/5" 
            : "bg-slate-50 border border-slate-800 focus:bg-white text-slate-900"
    }`;

    const remarksClass = `w-full px-4 py-3 rounded-xl transition-all outline-none text-sm font-semibold placeholder-slate-400 min-h-[80px] resize-none ${
        errors.remarks 
            ? "border border-rose-400 bg-rose-50 text-rose-955 focus:border-rose-500 focus:ring-rose-500/5" 
            : "bg-slate-50 border border-slate-800 focus:bg-white text-slate-900"
    }`;

    const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";

    const formContent = (
        <form onSubmit={handleSubmit} className="space-y-6 mt-4 p-5">
            {formError && (
                <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
                    <FaInfoCircle className="text-rose-500 mt-0.5" size={14} />
                    <p className="text-xs font-bold text-rose-900">{formError}</p>
                </div>
            )}

            <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                    <FaClipboardList />
                </div>
                <div>
                    <p className="text-sm font-semibold text-slate-900">{isEditMode ? 'Task Modification' : 'Task Assignment'}</p>
                    <p className="text-xs text-slate-500 mt-1">
                        {isEditMode 
                            ? 'Update task title, current completion status, description, and remarks.' 
                            : 'Specify task details, assign to a teammate and add optional notes.'}
                    </p>
                </div>
            </div>

            {/* Task Title */}
            <div>
                <label className={labelClass}>Task Title <span className="text-red-500">*</span></label>
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

            {/* Status (Only in Edit Mode) */}
            {isEditMode && (
                <div>
                    <label className={labelClass}>Status <span className="text-red-500">*</span></label>
                    <div className="relative group">
                        <select
                            value={status}
                            onChange={(e) => {
                                setStatus(e.target.value);
                                if (errors.status) setErrors(p => ({ ...p, status: null }));
                            }}
                            className={statusClass}
                        >
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                        </select>
                    </div>
                    {errors.status && (
                        <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">
                            {errors.status[0]}
                        </p>
                    )}
                </div>
            )}

            {/* Assignee Search (Only in Create Mode) */}
            {!isEditMode && (
                <div className="relative">
                    <label className={labelClass}>Assignee <span className="text-red-500">*</span></label>
                    {selectedUser && (
                        <div className="bg-slate-50 mb-3 rounded-xl p-3 border border-slate-200 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                {selectedUser.profile_picture ? (
                                    <img
                                        src={selectedUser.profile_picture}
                                        alt={selectedUser.username}
                                        className="w-9 h-9 rounded-full object-cover border border-slate-200"
                                    />
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-600">
                                        {getUserInitials(selectedUser)}
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                        {selectedUser.first_name} {selectedUser.last_name}
                                    </p>
                                    <p className="text-xs text-slate-500">@{selectedUser.username} • {selectedUser.role}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedUser(null);
                                    setAssigneeId(null);
                                    setSearchQuery("");
                                    if (errors.assignee_id) setErrors(p => ({ ...p, assignee_id: null }));
                                }}
                                className="text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                            >
                                <FaTimes /> Clear
                            </button>
                        </div>
                    )}
                    <div className="relative">
                        <FaSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            className={assigneeClass}
                            placeholder="Search teammate by name..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (selectedUser) {
                                    setSelectedUser(null);
                                    setAssigneeId(null);
                                }
                                if (errors.assignee_id) setErrors(p => ({ ...p, assignee_id: null }));
                            }}
                            required={!selectedUser}
                        />
                        {loadingSearch && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <div className="animate-spin h-4 w-4 border-2 border-slate-500 border-t-transparent rounded-full"></div>
                            </div>
                        )}
                    </div>
                    {errors.assignee_id && (
                        <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">
                            {errors.assignee_id[0]}
                        </p>
                    )}

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && !selectedUser && (
                        <div className="bg-white border border-slate-200 absolute z-50 w-full mt-1 rounded-xl max-h-48 overflow-y-auto custom-scrollbar shadow-lg">
                            {searchResults.map((user) => (
                                <div
                                    key={user.id}
                                    onClick={() => handleSelectUser(user)}
                                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3 border-b border-slate-100 last:border-0"
                                >
                                    {user.profile_picture ? (
                                        <img
                                            src={user.profile_picture}
                                            alt={user.username}
                                            className="w-9 h-9 rounded-full object-cover border border-slate-200"
                                        />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                            {getUserInitials(user)}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-slate-800 truncate">{user.first_name} {user.last_name}</div>
                                        <div className="text-xs text-slate-500 truncate">@{user.username} • {user.role}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Description */}
            <div>
                <label className={labelClass}>Description <span className="text-red-500">*</span></label>
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
                <label className={labelClass}>Remarks</label>
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

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 mt-6">
                <button
                    type="submit"
                    disabled={!title || !description}
                    className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-850 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                    {isEditMode ? 'Update Task' : 'Confirm Assignment'}
                </button>
            </div>
        </form>
    );

    if (isEmbed) {
        return formContent;
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={task ? 'Edit Task' : 'Create New Task'}
            type="form"
            icon={FaUserPlus}
            confirmText={task ? 'Update Task' : 'Create Task'}
            cancelText="Cancel"
            onConfirm={handleSubmit}
            showFooter={true} // Use Generic Modal Footer
        >
            {formContent}
        </Modal>
    );
};

export default CreateTaskModal;
