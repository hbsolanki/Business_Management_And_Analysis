import api from "./api";

export const activityService = {
    /**
     * Fetches activity logs with optional cursor-based pagination and filters.
     * @param {string} cursor - The cursor for the next or previous page.
     * @param {Object} filters - Optional filters (module, action, actor).
     */
    getLogs: (params = {}) => {
        let url = "/activity-log/";
        const { cursor, ...filters } = params;

        // If we have a cursor, it usually comes as a full URL or a query param from the backend
        if (cursor) {
            // Extract query params from the cursor URL if it's a full URL
            try {
                const cursorUrl = new URL(cursor);
                const cursorParam = cursorUrl.searchParams.get("cursor");
                if (cursorParam) {
                    url += `?cursor=${cursorParam}`;
                }
            } catch {
                // If it's not a valid URL, it might be just the cursor string or a relative path
                if (cursor.includes("cursor=")) {
                    url = cursor;
                } else {
                    url += `?cursor=${cursor}`;
                }
            }
        }

        // Add other filters if present
        const searchParams = new URLSearchParams();
        if (filters.module && String(filters.module).trim()) {
            searchParams.append("module", String(filters.module).trim());
        }
        if (filters.action && String(filters.action).trim()) {
            searchParams.append("action", String(filters.action).trim());
        }
        if (filters.actor !== undefined && filters.actor !== null && String(filters.actor).trim()) {
            searchParams.append("actor", String(filters.actor).trim());
        }
        if (filters.branch && String(filters.branch).trim()) {
            searchParams.append("branch", String(filters.branch).trim());
        }

        const queryString = searchParams.toString();
        if (queryString) {
            url += (url.includes("?") ? "&" : "?") + queryString;
        }

        return api.get(url);
    },
};
