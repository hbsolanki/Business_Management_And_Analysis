import React, { useState } from 'react';
import { FaSearch, FaBullhorn, FaEllipsisV, FaTrash, FaCheckCircle, FaRegCircle, FaTimes } from 'react-icons/fa';
import { tokenService } from '@/services/tokenService';
import { getInitials } from '../utils/chatHelpers';
import Modal from '@/components/ui/Modal';

const ChatSidebar = ({
    users,
    filteredUsers,
    selectedUser,
    onSelectUser,
    searchQuery,
    setSearchQuery,
    mobileShowChat,
    loading,
    navigate, // passed from parent or use hook inside
    onDeleteConversations
}) => {

    const role = tokenService.getRole();
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [showMenu, setShowMenu] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedIds([]);
        setShowMenu(false);
    };

    const handleSelectConversation = (e, conversationId) => {
        e.stopPropagation();
        if (selectedIds.includes(conversationId)) {
            setSelectedIds(prev => prev.filter(id => id !== conversationId));
        } else {
            setSelectedIds(prev => [...prev, conversationId]);
        }
    };

    const handleDeleteClick = () => {
        if (selectedIds.length === 0) return;
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        const success = await onDeleteConversations(selectedIds);
        if (success) {
            setIsSelectionMode(false);
            setSelectedIds([]);
            setIsDeleteModalOpen(false);
        }
    };

    return (
        <div className={` ${mobileShowChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm `}>

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Conversations"
                message={`Are you sure you want to delete ${selectedIds.length} conversation(s)? This action cannot be undone.`}
                onConfirm={handleConfirmDelete}
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
            />

            {/* Sidebar Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center relative z-20">
                {isSelectionMode ? (
                    <div className="flex items-center justify-between w-full animate-fade-in-up">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleSelectionMode}
                                className="text-slate-500 hover:text-slate-700 p-1"
                            >
                                <FaTimes />
                            </button>
                            <span className="font-semibold text-slate-800">{selectedIds.length} Selected</span>
                        </div>
                        <button
                            onClick={handleDeleteClick}
                            disabled={selectedIds.length === 0}
                            className={`p-2 rounded-xl transition-colors ${selectedIds.length > 0 ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-slate-300 bg-white cursor-not-allowed'}`}
                            title="Delete Selected"
                        >
                            <FaTrash size={16} />
                        </button>
                    </div>
                ) : (
                    <>
                        <div>
                            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight mb-1">Messages</h2>
                            <p className="text-slate-400 text-sm font-medium">Your conversations</p>
                        </div>

                        <div className="flex items-center gap-2">
                            {(role === 'OWNER' || role === 'MANAGER') && (
                                <button
                                    onClick={() => navigate && navigate('/chat/broadcast')}
                                    className="p-2 text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                    title="Broadcast Message"
                                >
                                    <FaBullhorn size={18} />
                                </button>
                            )}

                            <div className="relative">
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    <FaEllipsisV size={16} />
                                </button>

                                {showMenu && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setShowMenu(false)}
                                        ></div>
                                        <div className="bg-white border border-slate-200 absolute right-0 top-full mt-2 w-48 rounded-xl z-30 py-1 shadow-lg animate-fade-in-up">
                                            <button
                                                onClick={toggleSelectionMode}
                                                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                            >
                                                <FaCheckCircle className="text-slate-400" />
                                                Select Conversations
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Search */}
            <div className="px-5 py-3 border-b border-slate-200 bg-white">
                <div className="relative group">
                    <FaSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search contacts..."
                        className="w-full input-icon-left pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all text-sm font-medium text-slate-700 placeholder-slate-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={isSelectionMode}
                    />
                </div>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        <p className="text-sm">No users found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredUsers.map((user) => (
                            <div
                                key={user.id}
                                onClick={() => {
                                    if (isSelectionMode) {
                                        if (user.conversation_id) {
                                            handleSelectConversation({ stopPropagation: () => { } }, user.conversation_id);
                                        }
                                    } else {
                                        onSelectUser(user);
                                    }
                                }}
                                className={`
                                        group flex items-center p-4 cursor-pointer hover:bg-slate-50 transition-all duration-200 relative overflow-hidden
                                        ${selectedUser?.id === user.id && !isSelectionMode ? 'bg-slate-100' : ''}
                                        ${isSelectionMode && selectedIds.includes(user.conversation_id) ? 'bg-slate-100/60' : ''}
                                    `}
                            >
                                {selectedUser?.id === user.id && !isSelectionMode && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-900 rounded-r-full"></div>
                                )}

                                {isSelectionMode && user.conversation_id && (
                                    <div className="mr-3 text-slate-700">
                                        {selectedIds.includes(user.conversation_id) ? (
                                            <FaCheckCircle size={20} />
                                        ) : (
                                            <FaRegCircle size={20} className="text-slate-300" />
                                        )}
                                    </div>
                                )}

                                <div className="relative shrink-0">
                                    {user.profile_picture ? (
                                        <img
                                            src={user.profile_picture}
                                            alt={user.username}
                                            loading="lazy"
                                            className={`w-12 h-12 rounded-full object-cover border ${selectedUser?.id === user.id && !isSelectionMode ? 'border-slate-300' : 'border-slate-200'}`}
                                        />
                                    ) : (
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm
                                                ${selectedUser?.id === user.id && !isSelectionMode ? 'bg-slate-900 text-white shadow-slate-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}
                                            `}>
                                            {getInitials(user)}
                                        </div>
                                    )}
                                </div>
                                <div className="ml-4 flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className={`text-sm font-semibold truncate ${selectedUser?.id === user.id && !isSelectionMode ? 'text-slate-900' : 'text-slate-800'}`}>
                                            {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
                                        </h3>
                                    </div>
                                    <p className={`text-xs truncate transition-colors ${selectedUser?.id === user.id && !isSelectionMode ? 'text-slate-600' : 'text-slate-500 group-hover:text-slate-600'}`}>
                                        {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : user.email}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatSidebar;
