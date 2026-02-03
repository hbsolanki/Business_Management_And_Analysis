import React, { useState, useEffect } from 'react';
import { FaSearch, FaUserPlus } from 'react-icons/fa';
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
                    const response = await api.get(`/user/search/?search=${searchQuery}`);
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
        if (!title || (!assigneeId && !task)) return;

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
            <form className="space-y-5 mt-4">
                {/* Title */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Task Title</label>
                    <input
                        type="text"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-gray-800 placeholder-gray-400"
                        placeholder="E.g., Review Financial Report"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>

                {task && (
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-gray-800 bg-white"
                        >
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                        </select>
                    </div>
                )}

                {/* Assignee Search */}
                <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Assign To</label>
                    <div className="relative">
                        <FaSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-gray-800 placeholder-gray-400"
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
                                <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                            </div>
                        )}
                    </div>

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && !selectedUser && (
                        <div className="absolute z-10 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 max-h-48 overflow-y-auto custom-scrollbar">
                            {searchResults.map((user) => (
                                <div
                                    key={user.id}
                                    onClick={() => handleSelectUser(user)}
                                    className="px-4 py-3 hover:bg-indigo-50 cursor-pointer flex items-center gap-3 border-b border-gray-50 last:border-0"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                                        {user.username.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-gray-800">{user.first_name} {user.last_name}</div>
                                        <div className="text-xs text-gray-500">{user.email} • {user.role}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description <span className="text-gray-400 font-normal">(Optional)</span></label>
                    <textarea
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-gray-800 placeholder-gray-400 min-h-[100px] resize-none"
                        placeholder="Add detailed instructions..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>
            </form>
        </Modal>
    );
};

export default CreateTaskModal;
