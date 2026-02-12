import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

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
    uploading,
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
    const isAtBottomRef = useRef(true);
    const prevMessageCountRef = useRef(0);
    const prevLastMessageIdRef = useRef(null);
    const smoothScrollRef = useRef(null);

    // Scroll Logic
    const smoothScrollToBottom = () => {
        const container = chatContainerRef.current;
        if (!container) return;
        const start = container.scrollTop;
        const end = container.scrollHeight;
        const distance = end - start;
        const duration = 240;
        const startTime = performance.now();

        const step = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / duration);
            const eased = t * (2 - t);
            container.scrollTop = start + distance * eased;
            if (t < 1) {
                smoothScrollRef.current = requestAnimationFrame(step);
            }
        };

        if (smoothScrollRef.current) {
            cancelAnimationFrame(smoothScrollRef.current);
        }
        smoothScrollRef.current = requestAnimationFrame(step);
    };

    useLayoutEffect(() => {
        if (!loadingMore && messages.length > 0 && !prevScrollHeightRef.current) {
            const lastMessage = messages[messages.length - 1];
            const isNewMessage = prevMessageCountRef.current !== messages.length &&
                prevLastMessageIdRef.current !== (lastMessage?.id ?? null);
            const isMine = lastMessage?.sender_id === currentUserId;
            const shouldScroll =
                isInitialLoadRef.current || isAtBottomRef.current || (isNewMessage && isMine);

            if (shouldScroll) {
                if (isInitialLoadRef.current) {
                    if (chatContainerRef.current) {
                        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                    }
                } else {
                    smoothScrollToBottom();
                }
            }

            if (isInitialLoadRef.current) {
                isInitialLoadRef.current = false;
            }
        }
    }, [messages, loadingMore, isInitialLoadRef, prevScrollHeightRef, currentUserId]);

    useLayoutEffect(() => {
        if (prevScrollHeightRef.current && chatContainerRef.current) {
            const newScrollHeight = chatContainerRef.current.scrollHeight;
            const diff = newScrollHeight - prevScrollHeightRef.current;
            chatContainerRef.current.scrollTop = diff;
            prevScrollHeightRef.current = null;
        }
    }, [messages, prevScrollHeightRef]);

    useEffect(() => {
        prevMessageCountRef.current = messages.length;
        prevLastMessageIdRef.current = messages[messages.length - 1]?.id ?? null;
    }, [messages]);

    useEffect(() => {
        return () => {
            if (smoothScrollRef.current) {
                cancelAnimationFrame(smoothScrollRef.current);
            }
        };
    }, []);

    // Track whether user is near bottom to control auto-scroll
    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const threshold = 80;
            const distanceFromBottom =
                container.scrollHeight - container.scrollTop - container.clientHeight;
            isAtBottomRef.current = distanceFromBottom <= threshold;
        };

        handleScroll();
        container.addEventListener("scroll", handleScroll);
        return () => container.removeEventListener("scroll", handleScroll);
    }, []);

    // Intersection Observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loadingMore) {
                    if (chatContainerRef.current) {
                        prevScrollHeightRef.current = chatContainerRef.current.scrollHeight;
                    }
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
            <div className="hidden md:flex flex-col flex-1 md:rounded-2xl overflow-hidden relative bg-white border border-slate-200 shadow-sm">
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
                    <div className="w-32 h-32 rounded-full flex items-center justify-center mb-6 bg-slate-50 border border-slate-200">
                        <span className="text-6xl">💬</span>
                    </div>
                    <h2 className="text-2xl font-semibold text-slate-900 mb-3 tracking-tight">Welcome to Chat</h2>
                    <p className="text-slate-500 max-w-xs leading-relaxed">
                        Select a team member from the sidebar to start a conversation.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 md:rounded-2xl overflow-hidden relative bg-white">
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
                uploading={uploading}
                handleFileUpload={onFileUpload}
                editingMessage={editingMessage}
                setEditingMessage={setEditingMessage}
            />
        </div>
    );
};

export default ChatWindow;
