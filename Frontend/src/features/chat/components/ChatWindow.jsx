import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { FaArrowLeft } from 'react-icons/fa';

const ChatWindow = ({
    selectedUser,
    messages,
    userStatus,
    typingUser,
    currentUserId,
    onBack,
    // Data Actions
    onSendMessage,
    onSendTyping,
    onFileUpload,
    onEditMessage,
    onDeleteMessage,
    // Pagination
    loadingMore,
    onLoadMore,
    prevScrollHeightRef,
    isInitialLoadRef
}) => {

    // UI State local to window
    const [newMessage, setNewMessage] = useState("");
    const [editingMessage, setEditingMessage] = useState(null);
    const [messageMenu, setMessageMenu] = useState(null);
    const [activeActionMessageId, setActiveActionMessageId] = useState(null);

    // Refs
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const topSentinelRef = useRef(null);

    // Scroll Logic
    useLayoutEffect(() => {
        if (!loadingMore && messages.length > 0 && !prevScrollHeightRef.current) {
            const behavior = isInitialLoadRef.current ? "auto" : "smooth";
            messagesEndRef.current?.scrollIntoView({ behavior });
            if (isInitialLoadRef.current) {
                isInitialLoadRef.current = false;
            }
        }
    }, [messages, loadingMore, isInitialLoadRef, prevScrollHeightRef]);

    useLayoutEffect(() => {
        if (prevScrollHeightRef.current && chatContainerRef.current) {
            const newScrollHeight = chatContainerRef.current.scrollHeight;
            const diff = newScrollHeight - prevScrollHeightRef.current;
            chatContainerRef.current.scrollTop = diff;
            prevScrollHeightRef.current = null;
        }
    }, [messages, prevScrollHeightRef]);

    // Intersection Observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loadingMore) {
                    onLoadMore();
                }
            },
            { threshold: 0.5, root: chatContainerRef.current }
        );

        if (topSentinelRef.current) {
            observer.observe(topSentinelRef.current);
        }

        return () => {
            if (topSentinelRef.current) observer.unobserve(topSentinelRef.current);
        };
    }, [loadingMore, onLoadMore]);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = () => {
            setMessageMenu(null);
            setActiveActionMessageId(null);
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const handleSendMessageWrapped = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !editingMessage) return;

        if (editingMessage) {
            const success = await onEditMessage(editingMessage.id, newMessage);
            if (success) {
                setEditingMessage(null);
                setNewMessage("");
            }
        } else {
            const success = await onSendMessage(newMessage);
            if (success) {
                setNewMessage("");
            }
        }
    };

    if (!selectedUser) {
        return (
            <div className="hidden md:flex flex-col flex-1 bg-white md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#f8f9fc]">
                    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                        <span className="text-6xl animate-bounce-slow">💬</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">Welcome to Chat</h2>
                    <p className="text-gray-500 max-w-xs leading-relaxed">
                        Select a team member from the sidebar to start a conversation.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 bg-white md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
            <ChatHeader
                selectedUser={selectedUser}
                userStatus={userStatus}
                onBack={onBack}
                onMenuClick={() => { }}
            />

            <MessageList
                messages={messages}
                loadingMore={loadingMore}
                chatContainerRef={chatContainerRef}
                topSentinelRef={topSentinelRef}
                messagesEndRef={messagesEndRef}
                typingUser={typingUser}
                currentUserId={currentUserId}
                activeActionMessageId={activeActionMessageId}
                setActiveActionMessageId={setActiveActionMessageId}
                editingMessage={editingMessage}
                setEditingMessage={setEditingMessage}
                setNewMessage={setNewMessage}
                handleDeleteMessage={onDeleteMessage}
                messageMenu={messageMenu}
                setMessageMenu={setMessageMenu}
            />

            <ChatInput
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                handleSendMessage={handleSendMessageWrapped}
                sendTyping={onSendTyping}
                uploading={false} // pass from parent if needed
                handleFileUpload={onFileUpload}
                editingMessage={editingMessage}
                setEditingMessage={setEditingMessage}
            />
        </div>
    );
};

export default ChatWindow;
