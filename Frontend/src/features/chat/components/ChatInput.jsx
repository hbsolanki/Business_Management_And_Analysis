import React, { useRef, useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { FaSmile, FaTimes, FaSpinner, FaPaperclip, FaFile, FaImage, FaVideo, FaEdit, FaPaperPlane } from 'react-icons/fa';

const ChatInput = ({
    newMessage,
    setNewMessage,
    handleSendMessage,
    sendTyping,
    uploading,
    handleFileUpload,
    editingMessage,
    setEditingMessage
}) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);

    const imageInputRef = useRef(null);
    const videoInputRef = useRef(null);
    const docInputRef = useRef(null);

    const handleEmojiClick = (emojiObject) => {
        setNewMessage(prev => prev + emojiObject.emoji);
    };

    return (
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 shrink-0 z-20 relative">
            <form onSubmit={handleSendMessage} className="flex items-end gap-3 max-w-4xl mx-auto relative">
                <div className="flex-1 bg-white border border-slate-200 hover:border-slate-300 focus-within:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.08)] transition-all duration-300 ease-out rounded-[28px] flex items-end p-2">
                    <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-2.5 text-slate-400 hover:text-slate-700 transition-colors rounded-full hover:bg-slate-100 active:scale-95 shrink-0"
                    >
                        <FaSmile size={20} />
                    </button>

                    {showEmojiPicker && (
                        <div className="absolute bottom-16 left-0 z-50">
                            <div className="relative">
                                <button
                                    onClick={() => setShowEmojiPicker(false)}
                                    className="absolute -top-2 -right-2 bg-slate-900 text-white rounded-full p-1 z-50 shadow-md hover:bg-slate-800"
                                >
                                    <FaTimes size={12} />
                                </button>
                                <EmojiPicker onEmojiClick={handleEmojiClick} width={300} height={400} />
                            </div>
                        </div>
                    )}

                    <textarea
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value);
                            e.target.style.height = 'auto'; // Reset height
                            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; // Set to scrollHeight but max 120
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
                            } else {
                                sendTyping();
                            }
                        }}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-slate-700 text-sm py-3 px-2 min-h-[44px] max-h-32 resize-none leading-relaxed placeholder-slate-400"
                        rows={1}
                        style={{ height: 'auto' }}
                    />

                    {/* Hidden Inputs for different types */}
                    <input
                        type="file"
                        ref={imageInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileUpload}
                    />
                    <input
                        type="file"
                        ref={videoInputRef}
                        className="hidden"
                        accept="video/*"
                        onChange={handleFileUpload}
                    />
                    <input
                        type="file"
                        ref={docInputRef}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleFileUpload}
                    />

                    {/* Attachment Menu */}
                    {showAttachMenu && (
                        <div className="absolute bottom-16 right-0 z-50 animate-fade-in-up">
                            <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-2 flex flex-col gap-1 min-w-[150px]">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAttachMenu(false);
                                        docInputRef.current?.click();
                                    }}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-lg text-slate-700 text-sm font-medium transition-colors text-left"
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
                                        <FaFile size={14} />
                                    </div>
                                    Document
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAttachMenu(false);
                                        imageInputRef.current?.click();
                                    }}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-lg text-slate-700 text-sm font-medium transition-colors text-left"
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
                                        <FaImage size={14} />
                                    </div>
                                    Image
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAttachMenu(false);
                                        videoInputRef.current?.click();
                                    }}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-lg text-slate-700 text-sm font-medium transition-colors text-left"
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
                                        <FaVideo size={14} />
                                    </div>
                                    Video
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => setShowAttachMenu(!showAttachMenu)}
                        disabled={uploading || !!editingMessage}
                        className={`p-2.5 transition-colors rounded-full active:scale-95 shrink-0 ${showAttachMenu ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'} ${editingMessage ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {uploading ? <FaSpinner className="animate-spin text-slate-500" /> : <FaPaperclip size={18} />}
                    </button>
                </div>

                {editingMessage && (
                    <button
                        type="button"
                    onClick={() => {
                        setEditingMessage(null);
                        setNewMessage("");
                    }}
                    className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1 rounded-full shadow-md hover:bg-slate-800 transition-colors"
                >
                    Cancel Editing
                </button>
                )}

                <button
                    type="submit"
                    disabled={!newMessage.trim() || uploading}
                    className={`p-3.5 text-white rounded-full shadow-sm transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center shrink-0
                            ${editingMessage ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'}
                            disabled:opacity-50 disabled:shadow-none
                        `}
                >
                    {editingMessage ? <FaEdit size={16} /> : <FaPaperPlane size={16} className={`${newMessage.trim() ? "translate-x-0.5" : ""} transition-transform`} />}
                </button>
            </form>
        </div>
    );
};

export default ChatInput;
