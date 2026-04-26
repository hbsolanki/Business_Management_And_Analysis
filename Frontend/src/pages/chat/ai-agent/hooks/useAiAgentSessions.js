import { useState, useCallback, useEffect, useRef } from "react";
import { aiAgentService } from "@/services/aiAgentService";
import { toast } from "react-hot-toast";

export function useAiAgentSessions(routeSessionId, navigate, onNewChat) {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsNextCursor, setSessionsNextCursor] = useState(null);
  const [loadingMoreSessions, setLoadingMoreSessions] = useState(false);
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  const [sessionActionsMenu, setSessionActionsMenu] = useState(null);

  const fetchSessions = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) {
      if (!sessionsNextCursor || loadingMoreSessions) return;
      setLoadingMoreSessions(true);
    } else {
      setLoadingSessions(true);
    }

    try {
      const res = await aiAgentService.getSessions(isLoadMore ? sessionsNextCursor : null);
      const data = res.data;

      if (isLoadMore) {
        setSessions((prev) => [...prev, ...(data.results || [])]);
      } else {
        setSessions(data.results || []);
      }
      setSessionsNextCursor(data.next);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      toast.error("Failed to load chat history");
    } finally {
      setLoadingSessions(false);
      setLoadingMoreSessions(false);
    }
  }, [sessionsNextCursor, loadingMoreSessions]);

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleSelectSession = useCallback((sessionId) => {
    if (!sessionId) {
      onNewChat();
      return;
    }
    navigate(`/ai-agent/session/${sessionId}`);
  }, [navigate, onNewChat]);

  const handleUpdateSession = async (sessionId, title) => {
    if (!title.trim() || isActionProcessing) return;
    setIsActionProcessing(true);
    try {
      await aiAgentService.updateSession(sessionId, { title: title.trim() });
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: title.trim() } : s))
      );
      toast.success("Session updated");
      return true;
    } catch (error) {
      console.error("Failed to update session:", error);
      toast.error("Failed to update session");
      return false;
    } finally {
      setIsActionProcessing(false);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (isActionProcessing) return;
    setIsActionProcessing(true);
    try {
      await aiAgentService.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        onNewChat();
      }
      toast.success("Session deleted");
      return true;
    } catch (error) {
      console.error("Failed to delete session:", error);
      toast.error("Failed to delete session");
      return false;
    } finally {
      setIsActionProcessing(false);
    }
  };

  useEffect(() => {
    if (routeSessionId && routeSessionId !== "new") {
      setCurrentSessionId(routeSessionId);
    } else {
      setCurrentSessionId(null);
    }
  }, [routeSessionId]);

  return {
    sessions,
    currentSessionId,
    loadingSessions,
    loadingMoreSessions,
    sessionsNextCursor,
    fetchSessions,
    handleSelectSession,
    handleUpdateSession,
    handleDeleteSession,
    isActionProcessing,
    sessionActionsMenu,
    setSessionActionsMenu,
  };
}
