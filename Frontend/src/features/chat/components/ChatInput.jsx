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
        <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-md border-t border-gray-100 shrink-0 z-20 relative">
            <form onSubmit={handleSendMessage} className="flex items-end gap-3 max-w-4xl mx-auto relative">
                <div className="flex-1 bg-gray-100/60 hover:bg-gray-100 focus-within:bg-white focus-within:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.08)] transition-all duration-300 ease-out rounded-[28px] flex items-end p-2 border-none">
                    <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-2.5 text-gray-400 hover:text-indigo-500 transition-colors rounded-full hover:bg-gray-200/50 active:scale-95 shrink-0"
                    >
                        <FaSmile size={20} />
                    </button>

                    {showEmojiPicker && (
                        <div className="absolute bottom-16 left-0 z-50">
                            <div className="relative">
                                <button
                                    onClick={() => setShowEmojiPicker(false)}
                                    className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 z-50 shadow-md hover:bg-gray-700"
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
                        className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-gray-700 text-sm py-3 px-2 min-h-[44px] max-h-32 resize-none leading-relaxed placeholder-gray-400"
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
                            <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-2 flex flex-col gap-1 min-w-[150px]">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAttachMenu(false);
                                        docInputRef.current?.click();
                                    }}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg text-gray-700 text-sm font-medium transition-colors text-left"
                                >
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
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
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg text-gray-700 text-sm font-medium transition-colors text-left"
                                >
                                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
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
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg text-gray-700 text-sm font-medium transition-colors text-left"
                                >
                                    <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center">
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
                        className={`p-2.5 transition-colors rounded-full active:scale-95 shrink-0 ${showAttachMenu ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-indigo-500 hover:bg-gray-200/50'} ${editingMessage ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {uploading ? <FaSpinner className="animate-spin text-indigo-500" /> : <FaPaperclip size={18} />}
                    </button>
                </div>

                {editingMessage && (
                    <button
                        type="button"
                        onClick={() => {
                            setEditingMessage(null);
                            setNewMessage("");
                        }}
                        className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1 rounded-full shadow-md hover:bg-gray-700 transition-colors"
                    >
                        Cancel Editing
                    </button>
                )}

                <button
                    type="submit"
                    disabled={!newMessage.trim() || uploading}
                    className={`p-3.5 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center shrink-0
                            ${editingMessage ? 'bg-green-600 hover:bg-green-700 shadow-green-200 hover:shadow-green-300' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 hover:shadow-indigo-300'}
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
