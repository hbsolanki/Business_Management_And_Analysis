import api from "./api";

export const aiAgentService = {
    getSessions: (cursorUrl = null) => {
        if (!cursorUrl) {
            return api.get("/ai-agent/sessions/");
        }

        if (cursorUrl.startsWith("http")) {
            const parsed = new URL(cursorUrl);
            return api.get(`${parsed.pathname}${parsed.search}`);
        }

        return api.get(cursorUrl);
    },
    getSessionMessages: (sessionId, cursorUrl = null) => {
        if (!cursorUrl) {
            return api.get(`/ai-agent/sessions/${sessionId}/messages/`);
        }

        if (cursorUrl.startsWith("http")) {
            const parsed = new URL(cursorUrl);
            return api.get(`${parsed.pathname}${parsed.search}`);
        }

        return api.get(cursorUrl);
    },
    updateSession: (sessionId, data) => api.patch(`/ai-agent/sessions/${sessionId}/`, data),
    deleteSession: (sessionId) => api.delete(`/ai-agent/sessions/${sessionId}/`),
};
