import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaEllipsisV, FaTrash } from 'react-icons/fa';
import { getInitials } from '../utils/chatHelpers';

const ChatHeader = ({
    selectedUser,
    userStatus,
    onBack,
    canDeleteConversation,
    deletingConversation,
    onDeleteConversationClick,
    onDeleteMessagesClick,
    isSelectionMode,
    selectedCount,
    onToggleSelectionMode,
    onDeleteSelectedClick
}) => {
    if (isSelectionMode) {
        return (
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-brand-50/80 backdrop-blur-md z-30 shrink-0 sticky top-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)] animate-fade-in-up">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onToggleSelectionMode}
                        className="p-2 hover:bg-brand-100 rounded-full text-brand-600 transition-all"
                    >
                        <FaTimesCircle size={20} />
                    </button>
                    <span className="font-bold text-brand-900">{selectedCount} Selected</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onDeleteSelectedClick}
                        disabled={selectedCount === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${selectedCount > 0 ? 'bg-red-600 text-white hover:bg-red-700 shadow-sm' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                        <FaTrash size={14} />
                        Delete
                    </button>
                </div>
            </div>
        );
    }

    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const closeOnOutside = (event) => {
            if (!menuRef.current?.contains(event.target)) {
                setShowMenu(false);
            }
        };
        window.addEventListener("mousedown", closeOnOutside);
        return () => window.removeEventListener("mousedown", closeOnOutside);
    }, []);

    if (!selectedUser) return null;

    return (
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md z-30 shrink-0 sticky top-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-1">
                <button
                    onClick={onBack}
                    className="md:hidden p-2.5 -ml-2.5 hover:bg-slate-100 rounded-full text-slate-500 transition-all active:scale-90"
                >
                    <FaArrowLeft size={16} />
                </button>

                <div
                    className="flex items-center gap-3.5 p-1 -ml-1 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer group"
                    onClick={() => navigate(`/profile/${selectedUser.id}`)}
                >
                    <div className="relative shrink-0">
                        {selectedUser.profile_picture ? (
                            <img
                                src={selectedUser.profile_picture}
                                alt={selectedUser.username}
                                loading="lazy"
                                className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-sm border border-slate-100"
                            />
                        ) : (
                            <div className="w-11 h-11 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold shadow-md border-2 border-white">
                                {getInitials(selectedUser)}
                            </div>
                        )}
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white shadow-sm ${userStatus === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                    </div>

                    <div className="min-w-0">
                        <h3 className="text-[15px] font-bold text-slate-900 leading-tight truncate group-hover:text-brand-600 transition-colors">
                            {selectedUser.first_name ? `${selectedUser.first_name} ${selectedUser.last_name}` : selectedUser.username}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5 whitespace-nowrap overflow-hidden">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                {selectedUser.role || 'User'}
                            </span>
                            <span className="text-slate-300 scale-150 relative -top-px">·</span>
                            <span className="text-[12px] text-slate-500 font-medium capitalize">{userStatus}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1.5 relative" ref={menuRef}>
                <button
                    type="button"
                    onClick={() => setShowMenu((prev) => !prev)}
                    className={`p-2.5 rounded-full transition-all active:scale-95 ${showMenu ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                >
                    <FaEllipsisV size={15} />
                </button>

                {showMenu && (
                    <div className="absolute right-0 top-full mt-2 min-w-[190px] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-30">
                        <button
                            type="button"
                            onClick={() => {
                                setShowMenu(false);
                                onToggleSelectionMode?.();
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2 border-b border-slate-100"
                        >
                            <FaCheckCircle size={13} className="text-slate-400" />
                            Select Messages
                        </button>
                        <button
                            type="button"
                            disabled={!canDeleteConversation || deletingConversation}
                            onClick={() => {
                                setShowMenu(false);
                                onDeleteConversationClick?.();
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 disabled:text-slate-300 disabled:hover:bg-white inline-flex items-center gap-2 border-b border-slate-100"
                        >
                            <FaTrash size={13} />
                            {deletingConversation ? "Delete Conversation" : "Delete Conversation"}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowMenu(false);
                                onDeleteMessagesClick?.();
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-rose-600 hover:bg-rose-50 inline-flex items-center gap-2"
                        >
                            <FaTrash size={13} />
                            Delete All Messages
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

/* --- Add these helper components or icons if needed, but for now using standard icons --- */
const FaCheckCircle = (props) => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" {...props}><path d="M504 256c0 136.967-111.033 248-248 248S8 392.967 8 256 119.033 8 256 8s248 111.033 248 248zM227.314 387.314l184-184c6.248-6.248 6.248-16.379 0-22.627l-22.627-22.627c-6.248-6.248-16.379-6.249-22.628 0L216 308.118l-70.059-70.059c-6.248-6.248-16.379-6.248-22.628 0l-22.627 22.627c-6.248 6.248-6.248 16.379 0 22.627l104 104c6.249 6.249 16.379 6.249 22.628.001z"></path></svg>
);
const FaTimesCircle = (props) => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" {...props}><path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm121.6 313.1c4.7 4.7 4.7 12.3 0 17L338.3 377.4c-4.7 4.7-12.3 4.7-17 0L256 312.1l-65.3 65.3c-4.7 4.7-12.3 4.7-17 0l-39.3-39.3c-4.7-4.7-4.7-12.3 0-17l65.3-65.3-65.3-65.3c-4.7-4.7-4.7-12.3 0-17l39.3-39.3c4.7-4.7 12.3-4.7 17 0l65.3 65.3 65.3-65.3c4.7-4.7 12.3-4.7 17 0l39.3 39.3c4.7 4.7 4.7 12.3 0 17L312.1 256l65.5 65.1z"></path></svg>
);

export default ChatHeader;
