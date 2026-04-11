import { useRef, useState, useLayoutEffect, useEffect, useMemo } from "react";
import Modal from '@/components/ui/Modal';
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
    onDeleteConversation,
    onDeleteMessages,
    uploading,
    uploadProgress,
    activeConversationId,
    // Pagination
    loadingMore,
    onLoadMore,
    prevScrollHeightRef,
    isInitialLoadRef
}) => {
    const revokePreviewUrl = (message) => {
        const previewUrl = message?.media_url || message?.file;
        if (typeof previewUrl === "string" && previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(previewUrl);
        }
    };

    // UI State local to window
    const [newMessage, setNewMessage] = useState("");
    const [editingMessage, setEditingMessage] = useState(null);
    const [messageMenu, setMessageMenu] = useState(null);
    const [activeActionMessageId, setActiveActionMessageId] = useState(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, messageId: null });
    const [deleteConversationConfirmation, setDeleteConversationConfirmation] = useState(false);
    const [deleteMessagesConfirmation, setDeleteMessagesConfirmation] = useState(false);
    const [deleteSelectedConfirmation, setDeleteSelectedConfirmation] = useState(false);
    const [deletingConversation, setDeletingConversation] = useState(false);
    const [deletingMessages, setDeletingMessages] = useState(false);
    const [isMessageSelectionMode, setIsMessageSelectionMode] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState([]);
    const [pendingUploads, setPendingUploads] = useState([]);
    const displayMessages = useMemo(() => {
        if (pendingUploads.length === 0) return messages;
        return [...messages, ...pendingUploads].sort(
            (a, b) => new Date(a.created_at) - new Date(b.created_at),
        );
    }, [messages, pendingUploads]);

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
        if (!loadingMore && displayMessages.length > 0 && !prevScrollHeightRef.current) {
            const lastMessage = displayMessages[displayMessages.length - 1];
            const isNewMessage = prevMessageCountRef.current !== displayMessages.length &&
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
    }, [displayMessages, loadingMore, isInitialLoadRef, prevScrollHeightRef, currentUserId]);

    useLayoutEffect(() => {
        if (prevScrollHeightRef.current && chatContainerRef.current) {
            const newScrollHeight = chatContainerRef.current.scrollHeight;
            const diff = newScrollHeight - prevScrollHeightRef.current;
            chatContainerRef.current.scrollTop = diff;
            prevScrollHeightRef.current = null;
        }
    }, [displayMessages, prevScrollHeightRef]);

    useEffect(() => {
        prevMessageCountRef.current = displayMessages.length;
        prevLastMessageIdRef.current = displayMessages[displayMessages.length - 1]?.id ?? null;
    }, [displayMessages]);

    useEffect(() => {
        return () => {
            if (smoothScrollRef.current) {
                cancelAnimationFrame(smoothScrollRef.current);
            }
        };
    }, []);

    useEffect(() => {
        setPendingUploads((prev) => {
            prev.forEach(revokePreviewUrl);
            return [];
        });
    }, [selectedUser?.id]);

    useEffect(() => {
        if (!uploading) return;
        setPendingUploads((prev) =>
            prev.map((item) => ({
                ...item,
                upload_progress: uploadProgress,
            })),
        );
    }, [uploadProgress, uploading]);

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
        const rootNode = chatContainerRef.current;
        const targetNode = topSentinelRef.current;
        if (!rootNode || !targetNode) return undefined;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loadingMore) {
                    if (chatContainerRef.current) {
                        prevScrollHeightRef.current = chatContainerRef.current.scrollHeight;
                    }
                    onLoadMore();
                }
            },
            { threshold: 0.5, root: rootNode }
        );

        observer.observe(targetNode);

        return () => {
            observer.unobserve(targetNode);
        };
    }, [loadingMore, onLoadMore, prevScrollHeightRef]);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = () => {
            setMessageMenu(null);
            setActiveActionMessageId(null);
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const confirmDeleteMessage = (msgId) => {
        setDeleteConfirmation({ isOpen: true, messageId: msgId });
    };

    const handleConfirmDelete = async () => {
        if (deleteConfirmation.messageId) {
            await onDeleteMessage(deleteConfirmation.messageId);
        }
        setDeleteConfirmation({ isOpen: false, messageId: null });
    };

    const handleConfirmDeleteConversation = async () => {
        if (!activeConversationId || !onDeleteConversation) return;
        try {
            setDeletingConversation(true);
            await onDeleteConversation(activeConversationId);
        } finally {
            setDeletingConversation(false);
            setDeleteConversationConfirmation(false);
        }
    };

    const handleConfirmDeleteMessages = async () => {
        if (!displayMessages.length || !onDeleteMessages) return;
        const ids = displayMessages.map(m => m.id).filter(id => !String(id).startsWith('pending-'));
        if (ids.length === 0) return;

        try {
            setDeletingMessages(true);
            await onDeleteMessages(ids);
        } finally {
            setDeletingMessages(false);
            setDeleteMessagesConfirmation(false);
        }
    };

    const handleConfirmDeleteSelected = async () => {
        if (selectedMessageIds.length === 0 || !onDeleteMessages) return;
        try {
            setDeletingMessages(true);
            await onDeleteMessages(selectedMessageIds);
            setIsMessageSelectionMode(false);
            setSelectedMessageIds([]);
        } finally {
            setDeletingMessages(false);
            setDeleteSelectedConfirmation(false);
        }
    };

    const toggleMessageSelection = (messageId) => {
        setSelectedMessageIds(prev =>
            prev.includes(messageId)
                ? prev.filter(id => id !== messageId)
                : [...prev, messageId]
        );
    };

    const handleSendMessageWrapped = async ({ text, attachment }) => {
        const safeText = typeof text === "string" ? text : "";
        let textSent = true;
        let attachmentSent = true;

        if (editingMessage) {
            const editingType = String(
                editingMessage.message_type || (editingMessage.text ? "TEXT" : ""),
            ).toUpperCase();
            if (editingType !== "TEXT") {
                setEditingMessage(null);
                return { textSent: false, attachmentSent: true };
            }
            if (!safeText.trim()) {
                return { textSent: false, attachmentSent: true };
            }
            const updated = await onEditMessage(editingMessage.id, safeText.trim());
            if (updated) {
                setEditingMessage(null);
            }
            return { textSent: updated, attachmentSent: true };
        }

        if (safeText.trim()) {
            textSent = await onSendMessage(safeText.trim());
        }

        if (attachment?.file) {
            const tempId = `pending-upload-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const uploadType = attachment.file.type?.startsWith("image/")
                ? "IMAGE"
                : attachment.file.type?.startsWith("video/")
                    ? "VIDEO"
                    : "FILE";
            const previewUrl = attachment.previewUrl || URL.createObjectURL(attachment.file);
            const shouldRevokePreview = !attachment.previewUrl;

            setPendingUploads((prev) => [
                ...prev,
                {
                    id: tempId,
                    sender_id: currentUserId,
                    text: attachment.file?.name || null,
                    created_at: new Date().toISOString(),
                    file: previewUrl,
                    media_url: previewUrl,
                    message_type: uploadType,
                    is_updated: false,
                    is_pending: true,
                    upload_progress: uploadProgress || 0,
                },
            ]);

            try {
                attachmentSent = await onFileUpload(attachment.file);
            } finally {
                setPendingUploads((prev) => prev.filter((item) => item.id !== tempId));
                if (shouldRevokePreview) {
                    revokePreviewUrl({ file: previewUrl });
                }
            }
        }

        return { textSent, attachmentSent };
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
                canDeleteConversation={Boolean(activeConversationId)}
                deletingConversation={deletingConversation}
                onDeleteConversationClick={() => setDeleteConversationConfirmation(true)}
                onDeleteMessagesClick={() => setDeleteMessagesConfirmation(true)}
                isSelectionMode={isMessageSelectionMode}
                selectedCount={selectedMessageIds.length}
                onToggleSelectionMode={() => {
                    setIsMessageSelectionMode(!isMessageSelectionMode);
                    setSelectedMessageIds([]);
                }}
                onDeleteSelectedClick={() => setDeleteSelectedConfirmation(true)}
            />

            <MessageList
                messages={displayMessages}
                loadingMore={loadingMore}
                chatContainerRef={chatContainerRef}
                topSentinelRef={topSentinelRef}
                messagesEndRef={messagesEndRef}
                typingUser={typingUser}
                currentUserId={currentUserId}
                activeActionMessageId={activeActionMessageId}
                setActiveActionMessageId={setActiveActionMessageId}
                setEditingMessage={setEditingMessage}
                setNewMessage={setNewMessage}
                handleDeleteMessage={confirmDeleteMessage}
                messageMenu={messageMenu}
                setMessageMenu={setMessageMenu}
                isSelectionMode={isMessageSelectionMode}
                selectedMessageIds={selectedMessageIds}
                onToggleMessageSelection={toggleMessageSelection}
            />

            <ChatInput
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                handleSendMessage={handleSendMessageWrapped}
                sendTyping={onSendTyping}
                uploading={uploading}
                uploadProgress={uploadProgress}
                editingMessage={editingMessage}
                setEditingMessage={setEditingMessage}
            />

            <Modal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, messageId: null })}
                title="Delete Message"
                message="Are you sure you want to delete this message? This action cannot be undone."
                onConfirm={handleConfirmDelete}
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
            />

            <Modal
                isOpen={deleteConversationConfirmation}
                onClose={() => setDeleteConversationConfirmation(false)}
                title="Delete Conversation"
                message="Delete this full conversation? This action cannot be undone."
                onConfirm={handleConfirmDeleteConversation}
                confirmText={deletingConversation ? "Deleting..." : "Delete"}
                cancelText="Cancel"
                type="danger"
            />

            <Modal
                isOpen={deleteMessagesConfirmation}
                onClose={() => setDeleteMessagesConfirmation(false)}
                title="Delete All Messages"
                message="Delete all messages in this conversation? This action cannot be undone."
                onConfirm={handleConfirmDeleteMessages}
                confirmText={deletingMessages ? "Deleting..." : "Delete"}
                cancelText="Cancel"
                type="danger"
            />

            <Modal
                isOpen={deleteSelectedConfirmation}
                onClose={() => setDeleteSelectedConfirmation(false)}
                title="Delete Selected Messages"
                message={`Are you sure you want to delete ${selectedMessageIds.length} selected message(s)? This action cannot be undone.`}
                onConfirm={handleConfirmDeleteSelected}
                confirmText={deletingMessages ? "Deleting..." : "Delete"}
                cancelText="Cancel"
                type="danger"
            />
        </div>
    );
};

export default ChatWindow;
