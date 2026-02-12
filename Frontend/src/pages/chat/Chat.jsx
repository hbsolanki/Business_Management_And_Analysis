import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import { tokenService } from "@/services/tokenService";
import toast from "react-hot-toast";

// Feature Imports
import ChatSidebar from "@/features/chat/components/ChatSidebar";
import ChatWindow from "@/features/chat/components/ChatWindow";
import { useChatData } from "@/features/chat/hooks/useChatData";
import { useChatSocket } from "@/features/chat/hooks/useChatSocket";

const Chat = ({ conversationId: propConversationId, otherUserId: propOtherUserId }) => {
    const { conversationId: paramConversationId, otherUserId: paramOtherUserId } = useParams();
    // Prioritize props (if used in modal) over params
    const initialConversationId = propConversationId || paramConversationId;

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [mobileShowChat, setMobileShowChat] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);

    const currentUserId = parseInt(tokenService.getId());
    const token = tokenService.getAccessToken();

    // 1. Initialize logic for socket messages buffer
    const [socketMessagesBuffer, setSocketMessagesBuffer] = useState([]);

    // 2. Data Hook
    const {
        users,
        filteredUsers,
        setFilteredUsers,
        messages,
        conversationId,
        loadingUsers,
        loadingMessages,
        paginationLoading,
        fetchUsers,
        searchGlobalUsers,
        // Expose setting loading state for search
        setLoadingUsers,
        handleUserSelect,
        handleLoadMore,
        updateMessage,
        deleteMessage,
        uploadFile,
        uploading,
        prevScrollHeightRef,
        isInitialLoadRef,
        deleteConversations,
        subscriptionBlocked,
        subscriptionMessage
    } = useChatData(socketMessagesBuffer, setSocketMessagesBuffer);

    // Determine otherUserId from props, params, or search query
    const userIdFromUrl = searchParams.get('userId');
    const derivedOtherUserId = propOtherUserId || paramOtherUserId || userIdFromUrl;

    // 3. Socket Hook
    const effectiveOtherUserId = selectedUser?.id || (derivedOtherUserId ? parseInt(derivedOtherUserId) : null);

    const {
        isConnected,
        typingUser,
        userStatus,
        socketMessages,
        sendMessage,
        sendTyping,
        setSocketMessages
    } = useChatSocket(conversationId, token, currentUserId, effectiveOtherUserId);

    // Sync socket messages to data hook buffer
    useEffect(() => {
        if (socketMessages.length > 0) {
            setSocketMessagesBuffer(prev => [...prev, ...socketMessages]);
            setSocketMessages([]); // Clear from socket hook
        }
    }, [socketMessages, setSocketMessages]);

    // -- EFFECTS --

    // Fetch users on mount
    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Search filtering
    // Search filtering (Global Search)
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery) {
                setLoadingUsers(true);
                const results = await searchGlobalUsers(searchQuery);
                setFilteredUsers(results);
                setLoadingUsers(false);
            } else {
                // If search is cleared, show existing conversation users
                setFilteredUsers(users);
            }
        }, 300); // Debounce search

        return () => clearTimeout(timer);
    }, [searchQuery, users, searchGlobalUsers, setFilteredUsers]);

    // Handle URL param user selection
    useEffect(() => {
        if (derivedOtherUserId && users.length > 0 && !selectedUser) {
            const user = users.find(u => u.id === parseInt(derivedOtherUserId));
            if (user) {
                handleSelectUserWrapper(user);
            }
        }
    }, [derivedOtherUserId, users, selectedUser]);

    // -- HANDLERS --

    const handleSelectUserWrapper = async (user) => {
        if (selectedUser?.id === user.id) return;

        // Update URL to reflect selected user
        navigate(`/chat/${user.id}`);

        setSelectedUser(user);
        setMobileShowChat(true);

        if (!subscriptionBlocked) {
            await handleUserSelect(user);
        }
    };

    const handleBackToSidebar = () => {
        navigate('/chat');
        setMobileShowChat(false);
        setSelectedUser(null);
    };

    const handleSendMessage = async (text) => {
        if (subscriptionBlocked) {
            toast.error("Feature not in your plan");
            return false;
        }
        const sent = sendMessage(text);
        if (!sent) {
            return false;
        }
        return true;
    };

    const handleFileUploadWrapper = async (e) => {
        if (subscriptionBlocked) {
            toast.error("Feature not in your plan");
            return;
        }
        const file = e.target.files[0];
        if (!file) return;
        await uploadFile(file);
    };



    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans relative">
            <ProtectedHeader />



            <div className={`flex-1 flex overflow-hidden w-full max-w-[1600px] mx-auto p-0 md:p-4 lg:p-6 gap-6`}>

                <ChatSidebar
                    users={users}
                    filteredUsers={filteredUsers}
                    selectedUser={selectedUser}
                    onSelectUser={handleSelectUserWrapper}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    mobileShowChat={mobileShowChat}
                    loading={loadingUsers}
                    navigate={navigate}
                    onDeleteConversations={deleteConversations}
                />

                <div className={` ${mobileShowChat ? 'flex' : 'hidden md:flex'} flex-col flex-1 bg-white border border-slate-200 md:rounded-2xl overflow-hidden relative shadow-sm `}>
                    <ChatWindow
                        selectedUser={selectedUser}
                        messages={messages}
                        userStatus={userStatus}
                        typingUser={typingUser}
                        currentUserId={currentUserId}
                        onBack={handleBackToSidebar}
                        onSendMessage={handleSendMessage}
                        onSendTyping={sendTyping}
                        onFileUpload={handleFileUploadWrapper}
                        onEditMessage={updateMessage}
                        onDeleteMessage={deleteMessage}
                        uploading={uploading}
                        loadingMore={paginationLoading || loadingMessages}
                        onLoadMore={handleLoadMore}
                        prevScrollHeightRef={prevScrollHeightRef}
                        isInitialLoadRef={isInitialLoadRef}
                    />
                </div>

            </div>

            {/* Global Styles for Scrollbar/Animations to ensure consistent look */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #e2e8f0;
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #cbd5e1;
                    border-radius: 20px;
                }                }
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(-5%); }
                    50% { transform: translateY(5%); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 3s infinite ease-in-out;
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.3s ease-out forwards;
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default Chat;
