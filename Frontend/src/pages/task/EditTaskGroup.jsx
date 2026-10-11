import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import { FaSave, FaUsers, FaTimes, FaSearch, FaInfoCircle, FaTrash, FaExclamationTriangle } from 'react-icons/fa';
import ProtectedHeader from '@/components/layout/ProtectedHeader';
import BackButton from '@/components/shared/BackButton';
import Modal from '@/components/ui/Modal';
import { tokenService } from '@/services/tokenService';
import taskGroupService from '@/features/task/services/taskGroupService';
import api from '@/services/api';
import toast from 'react-hot-toast';

const EditTaskGroup = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const role = tokenService.getRole();
    const currentUserId = parseInt(tokenService.getId(), 10);
    const searchRef = useRef(null);
    const canManageGroups = ['OWNER', 'MANAGER'].includes(role);

    const [loadingData, setLoadingData] = useState(true);

    const [newGroupName, setNewGroupName] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [saving, setSaving] = useState(false);

    // Member selection search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [loadingBulk, setLoadingBulk] = useState(false);

    // Errors
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState('');

    // Delete Modal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const getUserInitials = (user) => {
        if (!user) return "U";
        const first = user.first_name?.[0] || "";
        const last = user.last_name?.[0] || "";
        return `${first}${last}`.trim().toUpperCase() || user.username?.[0]?.toUpperCase() || "U";
    };

    useEffect(() => {
        if (!canManageGroups) {
            toast.error('You do not have permission to manage task groups.');
            navigate('/tasks/groups', { replace: true });
            return;
        }

        const fetchGroup = async () => {
            try {
                const data = await taskGroupService.getGroupById(id);
                setNewGroupName(data.name || '');
                setIsPrivate(data.is_private || false);
                // Extract users from nested members
                if (data.members) {
                    setSelectedMembers(data.members.map(m => m.user));
                }
            } catch (error) {
                toast.error("Failed to load group details");
                navigate('/tasks/groups', { replace: true });
            } finally {
                setLoadingData(false);
            }
        };

        fetchGroup();
    }, [id, canManageGroups, navigate]);

    // Click-outside handler to close search dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setSearchResults([]);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery) {
                setLoadingSearch(true);
                try {
                    const response = await api.get(`/user/?search=${searchQuery}`);
                    const results = response.data.results || response.data;
                    setSearchResults(results.filter(u => !selectedMembers.some(sm => sm.id === u.id)));
                } catch (error) {
                    console.error('Search failed', error);
                    setSearchResults([]);
                } finally {
                    setLoadingSearch(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, selectedMembers]);

    const handleSelectUser = (user) => {
        setSelectedMembers([...selectedMembers, user]);
        setSearchQuery('');
        setSearchResults([]);
        if (errors.member_ids) setErrors(p => ({ ...p, member_ids: null }));
    };

    const handleRemoveUser = (userId) => {
        setSelectedMembers(selectedMembers.filter(m => m.id !== userId));
    };

    const handleBulkSelect = async (filterRole) => {
        setLoadingBulk(true);
        try {
            // Loop through all pages to get every user
            let url = filterRole ? `/user/?role=${filterRole}` : `/user/`;
            let allResults = [];
            while (url) {
                const response = await api.get(url);
                const data = response.data;
                const pageResults = data.results || data;
                if (Array.isArray(pageResults)) allResults = [...allResults, ...pageResults];
                // Follow pagination
                url = data.next ? data.next.replace(/^https?:\/\/[^/]+/, '') : null;
            }
            
            // Filter out users already in selectedMembers
            const newUsers = allResults.filter(u => !selectedMembers.some(sm => sm.id === u.id));
            if (newUsers.length > 0) {
                setSelectedMembers(prev => [...prev, ...newUsers]);
                toast.success(`Added ${newUsers.length} user(s)`);
            } else {
                toast.success('All users already added');
            }
            if (errors.member_ids) setErrors(p => ({ ...p, member_ids: null }));
        } catch (error) {
            console.error('Bulk fetch failed', error);
            toast.error('Failed to fetch users');
        } finally {
            setLoadingBulk(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newGroupName) return;

        setSaving(true);
        setErrors({});
        setFormError('');
        try {
            await taskGroupService.updateGroup(id, {
                name: newGroupName,
                is_private: isPrivate,
                members: selectedMembers.map(m => ({ user_id: m.id }))
            });
            toast.success("Group updated successfully");
            navigate('/tasks/groups');
        } catch (error) {
            console.error('Failed to update group', error);
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
            toast.error('Failed to update task group');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await taskGroupService.deleteGroup(id);
            toast.success("Group deleted successfully");
            navigate('/tasks/groups');
        } catch (error) {
            toast.error("Failed to delete group");
            setIsDeleteModalOpen(false);
        } finally {
            setDeleting(false);
        }
    };

    const inputClass = `w-full px-4 py-2.5 rounded-xl transition-all outline-none text-sm font-medium placeholder-slate-400 focus:ring-4 focus:ring-slate-100 ${
        errors.name 
            ? "border border-rose-400 bg-rose-50 text-rose-955 focus:border-rose-500 focus:ring-rose-500/5" 
            : "bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white text-slate-900"
    }`;

    const searchClass = `w-full pl-10 pr-4 py-2.5 rounded-xl transition-all outline-none text-sm font-medium placeholder-slate-400 focus:ring-4 focus:ring-slate-100 ${
        errors.member_ids 
            ? "border border-rose-400 bg-rose-50 text-rose-955 focus:border-rose-500 focus:ring-rose-500/5" 
            : "bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white text-slate-900"
    }`;

    return (
        <div className="min-h-screen font-sans bg-transparent">
            <ProtectedHeader />

            <main className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
                <div className="mb-4 flex items-center justify-between">
                    <BackButton to="/tasks/groups" label="Back to Task Groups" />
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
                    {loadingData && (
                        <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center backdrop-blur-sm">
                            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                        </div>
                    )}
                    <div className="px-6 py-8 border-b border-slate-100 bg-white flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
                                <FaUsers className="text-lg" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 leading-none">Edit Task Group</h1>
                                <p className="text-xs text-slate-500 mt-1.5">Modify group details and manage members.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Group"
                        >
                            <FaTrash />
                        </button>
                    </div>

                    {formError && (
                        <div className="mx-6 mt-4 flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
                            <FaInfoCircle className="text-rose-500 mt-0.5" size={14} />
                            <p className="text-xs font-bold text-rose-900">{formError}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Group Name */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Group Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                className={inputClass}
                                placeholder="E.g. Design Team"
                                value={newGroupName}
                                onChange={(e) => {
                                    setNewGroupName(e.target.value);
                                    if (errors.name) setErrors(p => ({ ...p, name: null }));
                                }}
                                required
                            />
                            {errors.name && (
                                <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">
                                    {errors.name[0]}
                                </p>
                            )}
                        </div>
                        
                        {/* Privacy Toggle */}
                        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div className="flex items-center h-5">
                                <input 
                                    type="checkbox" 
                                    id="privateCheck" 
                                    checked={isPrivate} 
                                    onChange={(e) => setIsPrivate(e.target.checked)} 
                                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
                                />
                            </div>
                            <label htmlFor="privateCheck" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                                Private Group <span className="text-slate-400 font-normal ml-1">(Only members can view this group)</span>
                            </label>
                        </div>

                        {/* Members */}
                        <div className="relative">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Add Members</label>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => handleBulkSelect('EMPLOYEE')} disabled={loadingBulk} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50">
                                        All Employees
                                    </button>
                                    <button type="button" onClick={() => handleBulkSelect('MANAGER')} disabled={loadingBulk} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50">
                                        All Managers
                                    </button>
                                    <button type="button" onClick={() => handleBulkSelect()} disabled={loadingBulk} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50">
                                        Select All
                                    </button>
                                </div>
                            </div>
                            
                            <div className="relative group" ref={searchRef}>
                                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={12} />
                                <input
                                    type="text"
                                    className={searchClass}
                                    placeholder="Search user by name..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                    }}
                                />
                                {loadingSearch && (
                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                        <div className="animate-spin h-3.5 w-3.5 border-2 border-slate-300 border-t-slate-900 rounded-full" />
                                    </div>
                                )}
                            </div>
                            
                            {errors.member_ids && (
                                <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">
                                    {errors.member_ids[0]}
                                </p>
                            )}

                            {searchResults.length > 0 && (
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

                            {selectedMembers.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {selectedMembers.map(user => (
                                        <div key={user.id} className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 flex items-center gap-2 pr-3 animate-fade-in">
                                            <div className="w-6 h-6 rounded-md overflow-hidden bg-white">
                                                {user.profile_picture ? (
                                                    <img src={user.profile_picture} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500">
                                                        {getUserInitials(user)}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-900 leading-none">{user.first_name} {user.last_name}</p>
                                                <p className="text-[9px] text-slate-500 font-medium mt-0.5">{user.role || user.role_name || 'Member'}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveUser(user.id)}
                                                className="w-5 h-5 ml-1 flex items-center justify-center rounded-md hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-all"
                                            >
                                                <FaTimes size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Private group + empty members warning */}
                        {isPrivate && selectedMembers.length === 0 && (
                            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                                <FaExclamationTriangle className="text-amber-500 mt-0.5 shrink-0" size={13} />
                                <p className="text-xs font-semibold text-amber-800">This group is set to <strong>Private</strong> but has no members. Only you will be able to see it.</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="pt-4 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/tasks/groups')}
                                className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving || !newGroupName}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white bg-slate-900 hover:bg-black shadow-lg shadow-slate-200 transition-all disabled:opacity-50 disabled:shadow-none text-sm"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Creating...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaSave size={14} />
                                        <span>Save Changes</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Task Group"
                message="Are you sure you want to delete this task group? Tasks assigned to it may be affected."
                onConfirm={handleDelete}
                confirmText={deleting ? "Deleting..." : "Delete Group"}
                cancelText="Cancel"
                type="danger"
            />
        </div>
    );
};

export default EditTaskGroup;
