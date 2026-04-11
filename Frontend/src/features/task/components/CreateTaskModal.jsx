import { useState, useEffect } from "react";
import { FaSearch, FaUserPlus, FaClipboardList, FaTimes } from 'react-icons/fa';
import api from '@/services/api';
import Modal from '@/components/ui/Modal';

const CreateTaskModal = ({ isOpen, onClose, onCreate, task, onUpdate }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('PENDING');
    const [assigneeId, setAssigneeId] = useState(null);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const isEditMode = Boolean(task);

    const getUserInitials = (user) => {
        if (!user) return "U";
        const first = user.first_name?.[0] || "";
        const last = user.last_name?.[0] || "";
        return `${first}${last}`.trim().toUpperCase() || user.username?.[0]?.toUpperCase() || "U";
    };

    // Reset or Pre-fill form
    useEffect(() => {
        if (isOpen) {
            if (task) {
                // Edit Mode
                setTitle(task.title);
                setDescription(task.description);
                setStatus(task.status || 'PENDING');
                if (task.assignee) {
                    setAssigneeId(task.assignee.id);
                    setSearchQuery(`${task.assignee.first_name || ''} ${task.assignee.last_name || ''} (${task.assignee.username})`.trim());
                    setSelectedUser(task.assignee);
                }
            } else {
                // Create Mode (Reset)
                setTitle('');
                setDescription('');
                setStatus('PENDING');
                setAssigneeId(null);
                setSearchQuery('');
                setSearchResults([]);
                setSelectedUser(null);
            }
        }
    }, [isOpen, task]);

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
        setSearchQuery(`${user.first_name} ${user.last_name} (${user.username})`);
        setSearchResults([]);
    };

    const handleSubmit = async () => {
        // Validation handled by button state, but redundant check here
        if (!title || !description || (!assigneeId && !task)) return;

        const taskData = {
            title,
            description,
            status,
            assignee_id: assigneeId
        };

        let success;
        if (task) {
            success = await onUpdate(task.id, taskData);
        } else {
            success = await onCreate(taskData);
        }

        if (success) onClose();
    };

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
            <form className="space-y-6 mt-4">
                <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                        <FaClipboardList />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-900">Task basics</p>
                        <p className="text-xs text-slate-500 mt-1">Give a clear title and assign a teammate so nothing slips.</p>
                    </div>
                </div>

                {/* Title */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Task Title</label>
                    <input
                        type="text"
                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition-all outline-none text-slate-800 placeholder-slate-400"
                        placeholder="E.g., Review Financial Report"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                    <p className="text-xs text-slate-400 mt-1">Keep it short, action‑oriented, and specific.</p>
                </div>

                {isEditMode && (
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition-all outline-none text-slate-800"
                        >
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                        </select>
                        <p className="text-xs text-slate-400 mt-1">Update status to keep reporting accurate.</p>
                    </div>
                )}

                {/* Assignee Search */}
                <div className="relative">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Assign To</label>
                    {selectedUser && (
                        <div className="bg-white mb-3 rounded-xl p-3 border border-slate-200 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                {selectedUser.profile_picture ? (
                                    <img
                                        src={selectedUser.profile_picture}
                                        alt={selectedUser.username}
                                        className="w-9 h-9 rounded-full object-cover border border-slate-200"
                                    />
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
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
                            className="w-full input-icon-left pr-4 py-3 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition-all outline-none text-slate-800 placeholder-slate-400"
                            placeholder="Search employee by name..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (selectedUser) {
                                    setSelectedUser(null);
                                    setAssigneeId(null);
                                }
                            }}
                            required={!selectedUser}
                        />
                        {loadingSearch && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <div className="animate-spin h-4 w-4 border-2 border-slate-500 border-t-transparent rounded-full"></div>
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Search by name, username, or email.</p>

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && !selectedUser && (
                        <div className="bg-white border border-slate-200 absolute z-10 w-full mt-1 rounded-xl max-h-48 overflow-y-auto custom-scrollbar shadow-lg">
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

                {/* Description */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                    <textarea
                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition-all outline-none text-slate-800 placeholder-slate-400 min-h-[110px] resize-none"
                        placeholder="Add detailed instructions..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                    />
                    <p className="text-xs text-slate-400 mt-1">Required. Add context, dependencies, and expected outcomes.</p>
                </div>
            </form>
        </Modal>
    );
};

export default CreateTaskModal;
