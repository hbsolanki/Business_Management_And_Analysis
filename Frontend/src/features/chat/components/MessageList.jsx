import React from 'react';
import { FaSpinner } from 'react-icons/fa';
import MessageBubble from './MessageBubble';

const MessageList = ({
    messages,
    loadingMore,
    chatContainerRef,
    topSentinelRef,
    messagesEndRef,
    typingUser,
    currentUserId,
    // Actions
    activeActionMessageId,
    setActiveActionMessageId,
    editingMessage,
    setEditingMessage,
    setNewMessage,
    handleDeleteMessage,
    messageMenu,
    setMessageMenu
}) => {


    const handleMessageDoubleClick = (e, msg) => {
        if (msg.sender_id !== currentUserId) return;
        e.preventDefault();
        e.stopPropagation();

        setActiveActionMessageId(activeActionMessageId === msg.id ? null : msg.id);
        setMessageMenu(null);
    };

    const handleEdit = (msg) => {
        setEditingMessage(msg);
        setNewMessage(msg.text);
        document.querySelector('textarea')?.focus();
    };


    return (
        <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#f8f9fc] custom-scrollbar"
        >
            {/* Pagination Loader / Sentinel */}
            <div ref={topSentinelRef} className="h-4 flex justify-center items-center shrink-0">
                {loadingMore && <FaSpinner className="animate-spin text-gray-400 text-xs" />}
            </div>

            {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-3xl">👋</div>
                    <p className="text-gray-500 font-medium">No messages yet.</p>
                    <p className="text-xs text-gray-400 mt-1">Start the conversation!</p>
                </div>
            ) : (
                messages.map((msg, index) => {
                    const isMe = msg.sender_id === currentUserId;
                    return (
                        <MessageBubble
                            key={msg.id || index}
                            msg={msg}
                            isMe={isMe}
                            onDoubleClick={handleMessageDoubleClick}
                            activeActionMessageId={activeActionMessageId}
                            onEdit={handleEdit}
                            onDelete={handleDeleteMessage}
                            messageMenu={messageMenu}
                            onCloseMenu={() => setMessageMenu(null)}
                            onMenuClick={(e, msg) => {
                                // Logic usually in container? We can pass simpler handler
                            }}
                        />
                    );
                })
            )}

            {typingUser && (
                <div className="flex justify-start animate-fade-in-up">
                    <div className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full flex items-center gap-1">
                        <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></span>
                        <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                        <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                        Typing...
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default MessageList;
