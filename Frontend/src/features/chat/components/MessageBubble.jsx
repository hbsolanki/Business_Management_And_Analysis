import React, { memo } from 'react';
import { FaBan, FaFilePdf, FaFileAlt, FaEdit, FaTrash } from 'react-icons/fa';
import { formatTime } from '../utils/chatHelpers';

const MessageBubble = memo(({
    msg,
    isMe,
    onDoubleClick,
    activeActionMessageId,
    onEdit,
    onDelete,
    messageMenu,
    onCloseMenu,
    onMenuClick
}) => {
    const isDeleted = !msg.file && !msg.text;

    const renderContent = () => {
        const fileUrl = msg.file || (typeof msg.text === 'string' && msg.text.startsWith('http') ? msg.text : null);
        const isFile = !!msg.file;

        if (isDeleted) {
            return (
                <div className="flex items-center gap-2 text-gray-400 italic">
                    <FaBan size={14} />
                    <span>This message was deleted</span>
                </div>
            );
        }

        if (!isFile && !fileUrl) {
            return <p className="whitespace-pre-wrap">{msg.text}</p>;
        }

        const url = fileUrl || msg.text;
        const extension = url.split('.').pop().toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension);
        const isVideo = ['mp4', 'webm', 'ogg'].includes(extension);
        const isPdf = ['pdf'].includes(extension);

        if (isImage) {
            return (
                <div className="max-w-xs sm:max-w-sm rounded-lg overflow-hidden">
                    <img src={url} alt="Attachment" className="w-full h-auto object-cover max-h-64 cursor-pointer" onClick={() => window.open(url, '_blank')} />
                </div>
            );
        } else if (isVideo) {
            return (
                <div className="max-w-xs sm:max-w-sm rounded-lg overflow-hidden">
                    <video controls className="w-full max-h-64">
                        <source src={url} />
                        Your browser does not support the video tag.
                    </video>
                </div>
            );
        } else if (isPdf) {
            return (
                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 bg-black/5 rounded-lg hover:bg-black/10 transition-colors">
                    <FaFilePdf size={24} className="text-red-500" />
                    <span className="underline break-all">View PDF</span>
                </a>
            );
        } else {
            return (
                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 bg-black/5 rounded-lg hover:bg-black/10 transition-colors">
                    <FaFileAlt size={24} className="text-gray-500" />
                    <span className="underline break-all">Download File</span>
                </a>
            );
        }
    };

    return (
        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group animate-fade-in-up relative`}>
            <div
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[70%]`}
                onDoubleClick={(e) => !isDeleted && onDoubleClick(e, msg)}
            >
                <div className={`
                    px-5 py-3.5 shadow-sm text-sm leading-6 relative cursor-pointer select-none group/bubble
                    ${isMe
                        ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm'
                        : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-sm'}
                `}>
                    {renderContent()}

                    {/* Direct Action Buttons */}
                    {isMe && !isDeleted && activeActionMessageId === msg.id && (
                        <div className={`
                                absolute -top-3 ${isMe ? '-left-4' : '-right-4'} 
                                flex items-center gap-1.5
                                z-20 animate-fade-in
                            `}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(msg);
                                }}
                                className="bg-white text-gray-500 hover:text-indigo-600 shadow-md border border-gray-100 rounded-full p-1.5 hover:bg-indigo-50 transition-all transform hover:scale-110"
                                title="Edit"
                            >
                                <FaEdit size={10} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(msg.id);
                                }}
                                className="bg-white text-gray-500 hover:text-red-500 shadow-md border border-gray-100 rounded-full p-1.5 hover:bg-red-50 transition-all transform hover:scale-110"
                                title="Delete"
                            >
                                <FaTrash size={10} />
                            </button>
                        </div>
                    )}
                </div>
                <div className={`
                    text-[10px] mt-1.5 font-medium px-1 flex items-center gap-1.5
                    ${isMe ? 'text-gray-400' : 'text-gray-400'}
                `}>
                    {formatTime(msg.created_at)}
                    {msg.is_updated && !isDeleted && (
                        <span className="flex items-center gap-0.5 italic opacity-70">
                            <FaEdit size={8} /> edited
                        </span>
                    )}
                </div>
            </div>

            {/* Context Menu */}
            {messageMenu?.id === msg.id && (
                <div
                    className="fixed z-[100] bg-white rounded-lg shadow-xl border border-gray-100 py-1 min-w-[120px] animate-fade-in"
                    style={{ top: messageMenu.y, left: messageMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => {
                            onEdit(msg);
                            onCloseMenu();
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-2"
                    >
                        <FaEdit size={12} /> Edit
                    </button>
                    <button
                        onClick={() => {
                            onDelete(msg.id);
                            onCloseMenu();
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600 flex items-center gap-2"
                    >
                        <FaTrash size={12} /> Delete
                    </button>
                </div>
            )}
        </div>
    );
});

export default MessageBubble;
