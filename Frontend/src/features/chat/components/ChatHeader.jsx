import React from 'react';
import { FaArrowLeft, FaEllipsisV } from 'react-icons/fa';
import { getInitials } from '../utils/chatHelpers';

const ChatHeader = ({ selectedUser, userStatus, onBack, onMenuClick }) => {
    if (!selectedUser) return null;

    return (
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white z-10 shrink-0 sticky top-0">
            <div className="flex items-center">
                <button
                    onClick={onBack}
                    className="md:hidden mr-3 p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
                >
                    <FaArrowLeft />
                </button>

                <div className="relative">
                    {selectedUser.profile_picture ? (
                        <img
                            src={selectedUser.profile_picture}
                            alt={selectedUser.username}
                            loading="lazy"
                            className="w-10 h-10 rounded-full object-cover border border-slate-200"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm">
                            {getInitials(selectedUser)}
                        </div>
                    )}
                </div>

                <div className="ml-4">
                    <h3 className="text-sm font-semibold text-slate-900 leading-tight">
                        {selectedUser.first_name ? `${selectedUser.first_name} ${selectedUser.last_name}` : selectedUser.username}
                        <span className={`ml-2 inline-block w-2 h-2 rounded-full ${userStatus === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-slate-500 font-medium">
                            {selectedUser.role ? selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1) : 'User'}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500 capitalize">{userStatus}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={onMenuClick}
                    className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-full transition-all hover:text-slate-700"
                >
                    <FaEllipsisV size={16} />
                </button>
            </div>
        </div>
    );
};

export default ChatHeader;
