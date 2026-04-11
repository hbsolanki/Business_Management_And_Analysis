import { useState, useEffect, useCallback, useRef } from 'react';
import api, { API_BASE_URL } from '@/services/api';
import { toast } from 'react-hot-toast';
import { tokenService } from '@/services/tokenService';

const MAX_CHAT_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export const useChatData = (socketMessages, setSocketMessages) => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [conversationId, setConversationId] = useState(null);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [paginationLoading, setPaginationLoading] = useState(false);
    const [nextPageUrl, setNextPageUrl] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [subscriptionBlocked, setSubscriptionBlocked] = useState(false);

    const prevScrollHeightRef = useRef(null);
    const isInitialLoadRef = useRef(true);

    const currentUserId = parseInt(tokenService.getId());

    const toAbsoluteFileUrl = useCallback((value) => {
        if (!value || typeof value !== "string") return null;
        if (value.startsWith("blob:") || value.startsWith("data:")) return value;
        if (value.startsWith("http://") || value.startsWith("https://")) return value;
        if (value.startsWith("/")) return `${API_BASE_URL}${value}`;
        return `${API_BASE_URL}/${value}`;
    }, []);

    const handleSubscriptionError = useCallback((err) => {
        const detail = err?.response?.data?.detail || err?.response?.data?.message;
        if (err?.response?.status === 403 && typeof detail === "string") {
            const lowerDetail = detail.toLowerCase();
            if (lowerDetail.includes("subscription") || lowerDetail.includes("has_chat")) {
                setSubscriptionBlocked(true);
                return true;
            }
        }
        return false;
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            setLoadingUsers(true);
            const response = await api.get("/chat/conversation/");

            if (response.data && Array.isArray(response.data.results)) {
                const uniqueUsersMap = new Map();

                response.data.results.forEach(conv => {
                    let otherUser = null;
                    if (conv.user1 && conv.user1.id !== currentUserId) {
                        otherUser = conv.user1;
                    } else if (conv.user2 && conv.user2.id !== currentUserId) {
                        otherUser = conv.user2;
                    }

                    if (otherUser) {
                        uniqueUsersMap.set(otherUser.id, { ...otherUser, conversation_id: conv.id });
                    }
                });

                const usersList = Array.from(uniqueUsersMap.values());
                setUsers(usersList);
                setFilteredUsers(usersList);
            } else {
                setUsers([]);
                setFilteredUsers([]);
            }
        } catch (err) {
            if (handleSubscriptionError(err)) return;
            console.error("Failed to fetch conversations", err);
        } finally {
            setLoadingUsers(false);
        }
    }, [currentUserId, handleSubscriptionError]);

    const searchGlobalUsers = useCallback(async (query) => {
        if (!query) return [];
        try {
            const response = await api.get(`/user/?search=${query}`);
            if (response.data && Array.isArray(response.data.results)) {
                return response.data.results.filter(u => u.id !== currentUserId);
            } else if (Array.isArray(response.data)) {
                return response.data.filter(u => u.id !== currentUserId);
            }
            return [];
        } catch (err) {
            console.error("Search failed", err);
            return [];
        }
    }, [currentUserId]);

    const normalizeMessage = useCallback((m) => {
        const source =
            m && typeof m === "object" && !Array.isArray(m)
                ? (
                    (m.data && typeof m.data === "object" ? m.data : null) ||
                    (m.message && typeof m.message === "object" ? m.message : null) ||
                    m
                )
                : m;

        const fileCandidate =
            source?.media_url ??
            source?.file ??
            source?.file_url ??
            source?.attachment ??
            source?.media ??
            source?.document ??
            source?.image ??
            null;

        const textCandidate =
            source?.text ??
            (typeof source?.message === "string" ? source.message : null) ??
            source?.caption ??
            "";

        const fileUrl = toAbsoluteFileUrl(fileCandidate);
        const explicitType = String(
            source?.message_type ||
            source?.messageType ||
            source?.media_type ||
            "",
        ).toUpperCase();
        const allowedTypes = new Set(["TEXT", "IMAGE", "VIDEO", "FILE"]);

        const cleanUrl = typeof fileUrl === "string" ? fileUrl.split("?")[0].split("#")[0] : "";
        const extension = cleanUrl.includes(".") ? cleanUrl.split(".").pop().toLowerCase() : "";
        const imageExt = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"]);
        const videoExt = new Set(["mp4", "webm", "ogg", "mov", "mkv"]);

        let inferredType = "TEXT";
        if (fileUrl) {
            if (imageExt.has(extension)) inferredType = "IMAGE";
            else if (videoExt.has(extension)) inferredType = "VIDEO";
            else inferredType = "FILE";
        }

        const normalized = {
            id: source?.id ?? source?.temp_id ?? `${Date.now()}-${Math.random()}`,
            sender_id:
                source?.sender_id ??
                source?.sender?.id ??
                source?.sender ??
                source?.user_id ??
                null,
            text: typeof textCandidate === "string" ? textCandidate : null,
            created_at: source?.created_at ?? source?.timestamp ?? new Date().toISOString(),
            file: fileUrl,
            media_url: fileUrl,
            message_type: allowedTypes.has(explicitType) ? explicitType : inferredType,
            is_updated: Boolean(source?.is_updated),
        };
        return normalized;
    }, [toAbsoluteFileUrl]);

    const mergeMessages = useCallback((prev, incoming, { prepend = false } = {}) => {
        const existingIds = new Set(prev.map(m => m.id));
        const uniqueIncoming = incoming.filter(m => !existingIds.has(m.id));
        const merged = prepend ? [...uniqueIncoming, ...prev] : [...prev, ...uniqueIncoming];
        merged.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        return merged;
    }, []);

    const fetchMessages = useCallback(async (urlOrId, isPagination = false) => {
        try {
            let url;
            if (typeof urlOrId === 'string' && urlOrId.startsWith('http')) {
                url = urlOrId.replace(API_BASE_URL, '');
                if (!url.startsWith('/')) url = '/' + url;
            } else {
                url = `/chat/message/conversation/${urlOrId}/`;
            }

            if (isPagination) {
                setPaginationLoading(true);
            } else {
                setLoadingMessages(true);
            }

            const res = await api.get(url);

            if (res.data && Array.isArray(res.data.results)) {
                const normalized = res.data.results.map(normalizeMessage);
                const sortedMessages = [...normalized].sort((a, b) =>
                    new Date(a.created_at) - new Date(b.created_at)
                );

                if (isPagination) {
                    setMessages(prev => mergeMessages(prev, sortedMessages, { prepend: true }));
                } else {
                    setMessages(sortedMessages);
                    isInitialLoadRef.current = true;
                }
                setNextPageUrl(res.data.next);
                setHasMore(Boolean(res.data.next));
            }
        } catch (err) {
            if (handleSubscriptionError(err)) return;
            console.error("Failed to fetch messages", err);
            toast.error("Could not load messages.");
        } finally {
            setLoadingMessages(false);
            setPaginationLoading(false);
        }
    }, [mergeMessages, normalizeMessage, handleSubscriptionError]);

    useEffect(() => {
        if (socketMessages.length > 0) {
            const newMessages = socketMessages.map(normalizeMessage);
            setMessages(prev => mergeMessages(prev, newMessages, { prepend: false }));

            setSocketMessages([]);
        }
    }, [socketMessages, setSocketMessages, mergeMessages, normalizeMessage]);

    const handleUserSelect = useCallback(async (user) => {
        setMessages([]);
        setNextPageUrl(null);
        setHasMore(false);
        setConversationId(null);
        isInitialLoadRef.current = true;

        try {
            // Check if user already has a conversation_id from the conversations list
            if (user.conversation_id) {
                setConversationId(user.conversation_id);
                await fetchMessages(user.conversation_id);
                return user.conversation_id;
            }

            // Otherwise create a new conversation
            const res = await api.post("/chat/conversation/", { user_id: user.id });
            const convId = res.data.conversation_id;
            setConversationId(convId);
            await fetchMessages(convId);
            return convId;
        } catch (err) {
            if (handleSubscriptionError(err)) return null;
            console.error("Init conversation failed", err);
            toast.error("Failed to start chat");
            return null;
        }
    }, [fetchMessages, handleSubscriptionError]);

    const handleLoadMore = useCallback(() => {
        if (nextPageUrl && hasMore && !paginationLoading) {
            fetchMessages(nextPageUrl, true);
        }
    }, [nextPageUrl, hasMore, paginationLoading, fetchMessages]);

    const updateMessage = useCallback(async (msgId, text) => {
        try {
            await api.patch(`/chat/message/${msgId}/`, { text });
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text, is_updated: true } : m));
            return true;
        } catch (err) {
            console.error("Update message failed", err);
            return false;
        }
    }, []);

    const deleteMessage = useCallback(async (msgId) => {
        try {
            await api.delete(`/chat/message/${msgId}/`);
            setMessages(prev => prev.filter(m => m.id !== msgId));
            toast.success("Message deleted");
            return true;
        } catch (err) {
            console.error("Delete message failed", err);
            toast.error("Failed to delete message");
            return false;
        }
    }, []);

    const uploadFile = useCallback(async (file, targetUserId = null) => {
        if (!file) return false;
        if (file.size > MAX_CHAT_UPLOAD_SIZE_BYTES) {
            toast.error("File size must be 20 MB or less.");
            return false;
        }

        let effectiveConversationId = conversationId;

        try {
            setUploading(true);
            setUploadProgress(0);

            if (!effectiveConversationId && targetUserId) {
                const convRes = await api.post("/chat/conversation/", { user_id: targetUserId });
                effectiveConversationId = convRes?.data?.conversation_id || null;
                if (effectiveConversationId) {
                    setConversationId(effectiveConversationId);
                }
            }

            if (!effectiveConversationId) {
                toast.error("Select a chat first, then upload file.");
                return false;
            }

            const formData = new FormData();
            formData.append("media", file);
            formData.append("conversation_id", String(effectiveConversationId));
            const uploadConfig = {
                headers: { "Content-Type": "multipart/form-data" },
                timeout: 0,
                onUploadProgress: (progressEvent) => {
                    const total = progressEvent?.total || file.size || 0;
                    if (!total) return;
                    const nextProgress = Math.min(
                        100,
                        Math.max(0, Math.round((progressEvent.loaded * 100) / total)),
                    );
                    setUploadProgress(nextProgress);
                },
            };
            let res;
            try {
                res = await api.post(
                    `/chat/message/${effectiveConversationId}/upload/`,
                    formData,
                    uploadConfig,
                );
            } catch (routeErr) {
                if (routeErr?.response?.status !== 404) throw routeErr;
                res = await api.post(`/chat/message/conversation/${effectiveConversationId}/upload/`, formData, uploadConfig);
            }

            const payload = res?.data?.message || res?.data?.data || res?.data || null;
            if (payload) {
                setMessages((prev) => mergeMessages(prev, [normalizeMessage(payload)], { prepend: false }));
            } else {
                setMessages((prev) =>
                    mergeMessages(
                        prev,
                        [
                            normalizeMessage({
                                id: `tmp-upload-${Date.now()}`,
                                sender_id: currentUserId,
                                file: URL.createObjectURL(file),
                                message_type: file.type?.startsWith("image/")
                                    ? "IMAGE"
                                    : file.type?.startsWith("video/")
                                        ? "VIDEO"
                                        : "FILE",
                                created_at: new Date().toISOString(),
                            }),
                        ],
                        { prepend: false },
                    ),
                );
            }
            return true;
        } catch (err) {
            if (handleSubscriptionError(err)) return false;
            console.error("File upload failed", err);
            const detail =
                err?.response?.data?.detail ||
                err?.response?.data?.message ||
                (typeof err?.response?.data === "string" ? err.response.data : null);
            toast.error(detail || "Failed to upload file");
            return false;
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    }, [conversationId, mergeMessages, normalizeMessage, handleSubscriptionError, currentUserId]);

    const deleteConversations = useCallback(async (ids) => {
        if (!ids || !Array.isArray(ids) || ids.length === 0) return false;
        try {
            await api.post('/chat/conversation/bulk-delete/', { ids });

            setUsers(prev => prev.filter(u => !ids.includes(u.conversation_id)));
            setFilteredUsers(prev => prev.filter(u => !ids.includes(u.conversation_id)));

            if (ids.includes(conversationId)) {
                setConversationId(null);
                setMessages([]);
            }
            toast.success("Conversations deleted");
            return true;
        } catch (err) {
            if (handleSubscriptionError(err)) return false;
            console.error("Delete conversations failed", err);
            toast.error("Failed to delete conversations");
            return false;
        }
    }, [conversationId, handleSubscriptionError]);

    const deleteMessages = useCallback(async (ids) => {
        if (!ids || !Array.isArray(ids) || ids.length === 0) return false;
        try {
            await api.post('/chat/message/bulk-delete/', { ids });
            setMessages(prev => prev.filter(m => !ids.includes(m.id)));
            toast.success("Messages deleted");
            return true;
        } catch (err) {
            if (handleSubscriptionError(err)) return false;
            console.error("Delete messages failed", err);
            toast.error("Failed to delete messages");
            return false;
        }
    }, [handleSubscriptionError]);

    const deleteConversation = useCallback(async (id) => {
        if (!id) return false;
        try {
            await api.delete(`/chat/conversation/${id}/`);

            setUsers((prev) => prev.filter((u) => u.conversation_id !== id));
            setFilteredUsers((prev) => prev.filter((u) => u.conversation_id !== id));

            if (conversationId === id) {
                setConversationId(null);
                setMessages([]);
                setNextPageUrl(null);
                setHasMore(false);
                isInitialLoadRef.current = true;
            }

            toast.success("Conversation deleted");
            return true;
        } catch (err) {
            if (handleSubscriptionError(err)) return false;
            console.error("Delete conversation failed", err);
            toast.error("Failed to delete conversation");
            return false;
        }
    }, [conversationId, handleSubscriptionError]);

    return {
        users,
        filteredUsers,
        setFilteredUsers,
        messages,
        setMessages,
        conversationId,
        loadingUsers,
        loadingMessages,
        paginationLoading,
        fetchUsers,
        handleUserSelect,
        handleLoadMore,
        updateMessage,
        deleteMessage,
        uploadFile,
        uploading,
        uploadProgress,
        currentUserId,
        prevScrollHeightRef,
        isInitialLoadRef,
        searchGlobalUsers,
        deleteConversations,
        deleteConversation,
        deleteMessages,
        setLoadingUsers,
        hasMore,
        subscriptionBlocked
    };
};
