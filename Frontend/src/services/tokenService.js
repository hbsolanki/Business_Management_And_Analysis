const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export const tokenService = {
    getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
    getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),

    setTokens: ({ access, refresh }) => {
        if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access);
        if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    },

    clearTokens: () => {
        const keysToRemove = [
            ACCESS_TOKEN_KEY,
            REFRESH_TOKEN_KEY,
            "role",
            "id",
            "work",
            "user_profile",
            "default_branch_id",
            "first_name",
            "last_name",
            "email"
        ];
        keysToRemove.forEach(key => localStorage.removeItem(key));
    },

    getRole: () => localStorage.getItem("role"),
    setRole: (role) => localStorage.setItem("role", role),

    getId: () => localStorage.getItem("id"),
    setId: (id) => localStorage.setItem("id", id),

    getWork: () => localStorage.getItem("work"),
    setWork: (work) => {
        if (Array.isArray(work)) {
            localStorage.setItem("work", work.filter(Boolean).join(","));
            return;
        }
        localStorage.setItem("work", work ? String(work) : "");
    },

    getDefaultBranchId: () => localStorage.getItem("default_branch_id"),
    setDefaultBranchId: (id) => {
        if (!id && id !== 0) {
            localStorage.removeItem("default_branch_id");
        } else {
            localStorage.setItem("default_branch_id", String(id));
        }
    },
};
