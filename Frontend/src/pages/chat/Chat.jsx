import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import ProtectedHeader from "@/components/layout/ProtectedHeader";
import ChatSidebar from "@/features/chat/components/ChatSidebar";
import ChatWindow from "@/features/chat/components/ChatWindow";
import { useChatData } from "@/features/chat/hooks/useChatData";
import { useChatSocket } from "@/features/chat/hooks/useChatSocket";
import { tokenService } from "@/services/tokenService";

const CHAT_PAGE_STYLES = `
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
  }
  .animate-fade-in-up {
    animation: fadeInUp 0.3s ease-out forwards;
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const Chat = ({ otherUserId: propOtherUserId }) => {
  const { otherUserId: paramOtherUserId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [socketMessagesBuffer, setSocketMessagesBuffer] = useState([]);

  const currentUserId = Number(tokenService.getId());
  const token = tokenService.getAccessToken();
  const userIdFromUrl = searchParams.get("userId");
  const parseOptionalId = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

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
    setLoadingUsers,
    handleUserSelect,
    handleLoadMore,
    updateMessage,
    deleteMessage,
    uploadFile,
    uploading,
    uploadProgress,
    prevScrollHeightRef,
    isInitialLoadRef,
    deleteConversations,
    deleteConversation,
    deleteMessages,
    subscriptionBlocked,
  } = useChatData(socketMessagesBuffer, setSocketMessagesBuffer);

  const derivedOtherUserId =
    propOtherUserId ?? paramOtherUserId ?? userIdFromUrl ?? null;
  const effectiveOtherUserId = selectedUser?.id ?? parseOptionalId(derivedOtherUserId);

  const { typingUser, userStatus, socketMessages, sendMessage, sendTyping, setSocketMessages } =
    useChatSocket(conversationId, token, effectiveOtherUserId);

  const closeChatView = useCallback(() => {
    navigate("/chat");
    setMobileShowChat(false);
    setSelectedUser(null);
  }, [navigate]);

  const handleSelectUser = useCallback(
    async (user) => {
      if (!user || selectedUser?.id === user.id) return;

      navigate(`/chat/${user.id}`);
      setSelectedUser(user);
      setMobileShowChat(true);

      if (subscriptionBlocked) return;

      await handleUserSelect(user);
      setSearchQuery("");
      await fetchUsers();
    },
    [selectedUser?.id, navigate, subscriptionBlocked, handleUserSelect, fetchUsers],
  );

  const handleDeleteConversation = useCallback(
    async (conversationToDelete) => {
      if (!conversationToDelete) return false;
      const success = await deleteConversation(conversationToDelete);
      if (!success) return false;
      closeChatView();
      return true;
    },
    [deleteConversation, closeChatView],
  );

  const handleSendMessage = useCallback(
    async (text) => {
      if (subscriptionBlocked) {
        toast.error("Feature not in your plan");
        return false;
      }
      return sendMessage(text);
    },
    [subscriptionBlocked, sendMessage],
  );

  const handleFileUpload = useCallback(
    async (file) => {
      if (subscriptionBlocked) {
        toast.error("Feature not in your plan");
        return false;
      }
      if (!file) return false;
      return uploadFile(file, selectedUser?.id || null);
    },
    [subscriptionBlocked, uploadFile, selectedUser?.id],
  );

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (socketMessages.length === 0) return;
    setSocketMessagesBuffer((prev) => [...prev, ...socketMessages]);
    setSocketMessages([]);
  }, [socketMessages, setSocketMessages]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery) {
        setLoadingUsers(true);
        const results = await searchGlobalUsers(searchQuery);
        setFilteredUsers(results);
        setLoadingUsers(false);
        return;
      }
      setFilteredUsers(users);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, users, searchGlobalUsers, setFilteredUsers, setLoadingUsers]);

  useEffect(() => {
    if (!derivedOtherUserId || users.length === 0 || selectedUser) return;
    const nextUser = users.find((user) => user.id === Number(derivedOtherUserId));
    if (nextUser) {
      handleSelectUser(nextUser);
    }
  }, [derivedOtherUserId, users, selectedUser, handleSelectUser]);

  const showChatPane = useMemo(
    () => (mobileShowChat ? "flex" : "hidden md:flex"),
    [mobileShowChat],
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans relative">
      <ProtectedHeader />

      <div className="flex-1 flex overflow-hidden w-full max-w-[1600px] mx-auto p-0 md:p-4 lg:p-6 gap-6">
        <ChatSidebar
          filteredUsers={filteredUsers}
          selectedUser={selectedUser}
          onSelectUser={handleSelectUser}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          mobileShowChat={mobileShowChat}
          loading={loadingUsers}
          navigate={navigate}
          onDeleteConversations={deleteConversations}
        />

        <div
          className={`${showChatPane} flex-col flex-1 bg-white border border-slate-200 md:rounded-2xl overflow-hidden relative shadow-sm`}
        >
          <ChatWindow
            selectedUser={selectedUser}
            messages={messages}
            userStatus={userStatus}
            typingUser={typingUser}
            currentUserId={currentUserId}
            onBack={closeChatView}
            onSendMessage={handleSendMessage}
            onSendTyping={sendTyping}
            onFileUpload={handleFileUpload}
            onEditMessage={updateMessage}
            onDeleteMessage={deleteMessage}
            onDeleteConversations={deleteConversations}
            onDeleteMessages={deleteMessages}
            uploading={uploading}
            uploadProgress={uploadProgress}
            activeConversationId={conversationId}
            onDeleteConversation={handleDeleteConversation}
            loadingMore={paginationLoading || loadingMessages}
            onLoadMore={handleLoadMore}
            prevScrollHeightRef={prevScrollHeightRef}
            isInitialLoadRef={isInitialLoadRef}
          />
        </div>
      </div>

      <style>{CHAT_PAGE_STYLES}</style>
    </div>
  );
};

export default Chat;
