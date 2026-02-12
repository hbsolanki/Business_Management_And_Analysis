import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSave, FaSearch, FaTimes, FaUserPlus, FaClipboardList } from 'react-icons/fa';
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

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [saving, setSaving] = useState(false);

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
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !description || !assigneeId) return;

        setSaving(true);
        try {
            await taskService.createTask({
                title,
                description,
                remarks: remarks || undefined,
                status,
                assignee_id: assigneeId,
            });
            toast.success('Task created successfully');
            navigate(-1);
        } catch (error) {
            console.error('Failed to create task', error);
            toast.error('Failed to create task');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen font-sans bg-transparent">
            <ProtectedHeader />

            <main className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <BackButton to="/tasks" label="Back to Tasks" />
                </div>

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
                    <div className="bg-slate-50 px-8 py-10 text-slate-900 border-b border-slate-200">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 border border-slate-200">
                                    <span className="h-2 w-2 rounded-full bg-slate-500"></span>
                                    New task
                                </div>
                                <h1 className="text-3xl font-semibold mt-3">Create Task</h1>
                                <p className="text-slate-500 mt-2">Assign the right owner and capture clear expectations.</p>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                <FaUserPlus className="text-slate-400 text-lg" />
                                Organize work with clarity.
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                                <FaClipboardList />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-900">Task basics</p>
                                <p className="text-xs text-slate-500 mt-1">Give a clear title, assign a teammate, and describe expectations.</p>
                            </div>
                        </div>

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
                                                {(selectedUser.username || 'U').substring(0, 2).toUpperCase()}
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
                                            setSearchQuery('');
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
                                                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                    {user.username.substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <div className="text-sm font-semibold text-slate-800">{user.first_name} {user.last_name}</div>
                                                <div className="text-xs text-slate-500">{user.email} • {user.role}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                            <textarea
                                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition-all outline-none text-slate-800 placeholder-slate-400 min-h-[130px] resize-none"
                                placeholder="Add detailed instructions..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />
                            <p className="text-xs text-slate-400 mt-1">Required. Add context, dependencies, and expected outcomes.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Remarks</label>
                            <textarea
                                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition-all outline-none text-slate-800 placeholder-slate-400 min-h-[90px] resize-none"
                                placeholder="Optional notes or blockers..."
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                            />
                            <p className="text-xs text-slate-400 mt-1">Optional. Add context that helps execution.</p>
                        </div>

                        <div className="border-t border-slate-200 pt-6 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="px-6 py-3 rounded-xl font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving || !title || !description || !assigneeId}
                                className="flex items-center gap-3 px-8 py-3.5 rounded-xl font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaSave className="text-lg" />
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
