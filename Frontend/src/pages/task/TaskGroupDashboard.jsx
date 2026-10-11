import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import ProtectedHeader from '@/components/layout/ProtectedHeader';
import Modal from '@/components/ui/Modal';
import { FaUsers, FaPlus, FaLock, FaGlobe, FaTrash, FaUserShield, FaEdit, FaSearch, FaChevronDown, FaPlay, FaUndo } from 'react-icons/fa';
import { tokenService } from '@/services/tokenService';
import taskGroupService from '@/features/task/services/taskGroupService';
import api from '@/services/api';
import toast from 'react-hot-toast';
import UserSearchFilter from '@/components/shared/UserSearchFilter';

const TaskGroupDashboard = () => {
    const navigate = useNavigate();
    const role = tokenService.getRole();
    const canManageGroups = ['OWNER', 'MANAGER'].includes(role);

    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state for Delete
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Filters
    const EMPTY_FILTERS = {
        name: '',
        member_id: '',
        is_private: ''
    };
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);

    useEffect(() => {
        fetchGroups(filters);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchGroups = async (currentFilters = filters) => {
        setLoading(true);
        try {
            const params = {};
            if (currentFilters.name) params.name = currentFilters.name;
            if (currentFilters.member_id) params.member_id = currentFilters.member_id;
            if (currentFilters.is_private !== '') params.is_private = currentFilters.is_private;

            const data = await taskGroupService.getGroups(params);
            setGroups(data.results || data);
        } catch (error) {
            toast.error("Failed to fetch task groups");
        } finally {
            setLoading(false);
        }
    };



    const confirmDelete = async () => {
        if (!deleteId || deleting) return;
        setDeleting(true);
        try {
            await taskGroupService.deleteGroup(deleteId);
            toast.success("Group deleted successfully");
            setGroups(groups.filter(g => g.id !== deleteId));
            setIsDeleteModalOpen(false);
            setDeleteId(null);
        } catch (error) {
            toast.error("Failed to delete group");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="min-h-screen font-sans bg-transparent">
            <ProtectedHeader />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight flex items-center gap-3">
                            <span className="p-2 bg-slate-900 rounded-lg text-white">
                                <FaUsers size={24} />
                            </span>
                            Task Groups
                        </h1>
                        <p className="mt-2 text-slate-500 font-medium">
                            Manage team task assignments via groups
                        </p>
                    </div>

                    {canManageGroups && (
                        <button
                            onClick={() => navigate('/tasks/group/new')}
                            className="inline-flex items-center justify-center px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 shadow-sm transition-all"
                        >
                            <FaPlus className="mr-2" />
                            New Group
                        </button>
                    )}
                </div>

                {/* Tabs for Navigation */}
                <div className="flex space-x-1 bg-white border border-slate-200 p-1 rounded-xl w-fit mb-6">
                    <button
                        onClick={() => navigate('/tasks/my-tasks')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all text-slate-600 hover:text-slate-900`}>
                        My Tasks
                    </button>
                    {canManageGroups && (
                        <button
                            onClick={() => navigate('/tasks/created')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all text-slate-600 hover:text-slate-900`}>
                            Created Tasks
                        </button>
                    )}
                    <button
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-slate-900 text-white`}>
                        Task Groups
                    </button>
                </div>

                {/* GST Style Filters */}
                <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <button 
                        onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                        className="w-full flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-all duration-300"
                    >
                        <div className="flex items-center gap-3">
                            <FaSearch size={12} className={Object.values(filters).some(Boolean) ? "text-slate-900" : "text-slate-400"} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Task Group Filters</span>
                        </div>
                        <div className={`text-slate-400 transition-transform duration-300 ${isFiltersExpanded ? "rotate-180" : ""}`}>
                            <FaChevronDown size={10} />
                        </div>
                    </button>

                    {isFiltersExpanded && (
                        <div className="p-5 sm:p-6 border-t border-slate-50 space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Group Name</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 z-10 flex items-center pl-5 pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                                            <FaSearch size={12} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Type group name..."
                                            value={filters.name}
                                            onChange={(e) => setFilters(f => ({ ...f, name: e.target.value }))}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 py-2.5 text-sm font-medium leading-6 tracking-normal text-slate-900 caret-slate-900 outline-none transition-all placeholder:text-sm placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100"
                                        />
                                    </div>
                                </div>
                                <UserSearchFilter
                                    label="Member Name"
                                    placeholder="Search member..."
                                    value={filters.member_id}
                                    onChange={(val) => setFilters(f => ({ ...f, member_id: val }))}
                                />
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Privacy</label>
                                    <select
                                        value={filters.is_private}
                                        onChange={(e) => setFilters(f => ({ ...f, is_private: e.target.value }))}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm font-medium leading-6 tracking-normal text-slate-900 caret-slate-900 outline-none transition-all focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100 appearance-none cursor-pointer"
                                    >
                                        <option value="">All Types</option>
                                        <option value="true">Private Only</option>
                                        <option value="false">Public Only</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
                                <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
                                    <button 
                                        onClick={() => fetchGroups(filters)}
                                        className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
                                    >
                                        <FaPlay size={10} className="text-slate-400" />
                                        Apply Filters
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setFilters(EMPTY_FILTERS);
                                            fetchGroups(EMPTY_FILTERS);
                                        }}
                                        className="w-full sm:w-auto px-8 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95"
                                    >
                                        <FaUndo size={10} />
                                        Reset Parameters
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Groups List */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
                    </div>
                ) : groups.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                        <div className="mx-auto w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-200">
                            <FaUsers className="text-slate-300 text-4xl" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">No Task Groups</h3>
                        <p className="text-slate-500 mb-6">Create groups to easily assign tasks to multiple people at once.</p>
                        {canManageGroups && (
                            <button
                                onClick={() => navigate('/tasks/group/new')}
                                className="inline-flex items-center justify-center px-5 py-2.5 border-2 border-dashed border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                <FaPlus className="mr-2" />
                                Create First Group
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {groups.map(group => (
                            <div key={group.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                                            {group.is_private ? <FaLock size={16} /> : <FaGlobe size={16} />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 leading-tight">{group.name}</h3>
                                            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mt-0.5">
                                                {group.is_private ? "Private Group" : "Public Group"}
                                            </p>
                                        </div>
                                    </div>
                                    {canManageGroups && (
                                        <div className="flex items-center gap-1">
                                            <button 
                                                onClick={() => navigate(`/tasks/group/${group.id}/edit`)}
                                                className="text-slate-300 hover:text-slate-900 p-1.5 transition-colors rounded hover:bg-slate-50"
                                                title="Edit Group"
                                            >
                                                <FaEdit size={12} />
                                            </button>
                                            <button 
                                                onClick={() => { setDeleteId(group.id); setIsDeleteModalOpen(true); }}
                                                className="text-slate-300 hover:text-red-500 p-1.5 transition-colors rounded hover:bg-red-50"
                                                title="Delete Group"
                                            >
                                                <FaTrash size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FaUserShield className="text-slate-400" size={12}/>
                                        <span className="text-xs font-semibold text-slate-600">Members ({group.members?.length || 0})</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {group.members?.slice(0, 5).map(member => (
                                            <div key={member.id} className="w-6 h-6 rounded-full bg-slate-900 text-white text-[9px] font-bold flex items-center justify-center" title={member.user.username}>
                                                {member.user.first_name?.[0] || 'U'}
                                            </div>
                                        ))}
                                        {(group.members?.length || 0) > 5 && (
                                            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[9px] font-bold flex items-center justify-center">
                                                +{group.members.length - 5}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>



            {/* Delete Group Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => !deleting && setIsDeleteModalOpen(false)}
                title="Delete Group"
                message="Are you sure you want to delete this Task Group? Tasks assigned to it may be affected."
                onConfirm={confirmDelete}
                confirmText={deleting ? "Deleting..." : "Delete"}
                cancelText="Cancel"
                type="danger"
            />
        </div>
    );
};

export default TaskGroupDashboard;
