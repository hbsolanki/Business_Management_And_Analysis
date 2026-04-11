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
    setEditingMessage,
    setNewMessage,
    handleDeleteMessage,
    messageMenu,
    setMessageMenu,
    isSelectionMode,
    selectedMessageIds,
    onToggleMessageSelection
}) => {
    const formatDayLabel = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        const sameDay = (d1, d2) =>
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();

        if (sameDay(date, today)) return "Today";
        if (sameDay(date, yesterday)) return "Yesterday";

        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    };

    const handleMessageDoubleClick = (e, msg) => {
        if (msg.sender_id !== currentUserId) return;
        e.preventDefault();
        e.stopPropagation();

        setActiveActionMessageId(activeActionMessageId === msg.id ? null : msg.id);
        setMessageMenu(null);
    };

    const handleEdit = (msg) => {
        if (msg.sender_id !== currentUserId) return;
        const messageType = String(msg.message_type || (msg.text ? "TEXT" : "")).toUpperCase();
        if (messageType !== "TEXT") return;
        setEditingMessage(msg);
        setNewMessage(msg.text || "");
        document.querySelector('textarea')?.focus({ preventScroll: true });
    };

    return (
        <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white custom-scrollbar"
        >
            <div ref={topSentinelRef} className="h-4 flex justify-center items-center shrink-0">
                {loadingMore && <FaSpinner className="animate-spin text-slate-400 text-xs" />}
            </div>

            {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-3xl border border-slate-200">👋</div>
                    <p className="text-slate-500 font-medium">No messages yet.</p>
                    <p className="text-xs text-slate-400 mt-1">Start the conversation!</p>
                </div>
            ) : (
                <>
                    {messages.map((msg, index) => {
                        const isMe = msg.sender_id === currentUserId;
                        const prevMsg = index > 0 ? messages[index - 1] : null;
                        const showDay =
                            !prevMsg ||
                            formatDayLabel(prevMsg.created_at) !== formatDayLabel(msg.created_at);

                        return (
                            <div key={msg.id || index} className="mb-6 last:mb-0">
                                {showDay && (
                                    <div className="flex justify-center mb-4">
                                        <span className="text-[11px] uppercase tracking-wider px-3 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                            {formatDayLabel(msg.created_at)}
                                        </span>
                                    </div>
                                )}
                                <MessageBubble
                                    msg={msg}
                                    isMe={isMe}
                                    onDoubleClick={handleMessageDoubleClick}
                                    activeActionMessageId={activeActionMessageId}
                                    onEdit={handleEdit}
                                    onDelete={handleDeleteMessage}
                                    messageMenu={messageMenu}
                                    onCloseMenu={() => setMessageMenu(null)}
                                    isSelectionMode={isSelectionMode}
                                    isSelected={selectedMessageIds.includes(msg.id)}
                                    onToggleSelection={() => onToggleMessageSelection(msg.id)}
                                />
                            </div>
                        );
                    })}
                </>
            )}

            {typingUser && (
                <div className="flex justify-start animate-fade-in-up">
                    <div className="bg-slate-50 text-slate-500 text-xs px-3 py-1 rounded-full flex items-center gap-1 border border-slate-200">
                        <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></span>
                        <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                        <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                        Typing...
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default MessageList;
