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
            "username",
            "email",
            "business_id",
            "work",
            "default_branch_id",
            "first_name",
            "last_name",
        ];
        keysToRemove.forEach(key => localStorage.removeItem(key));
    },

    getRole: () => localStorage.getItem("role"),
    setRole: (role) => localStorage.setItem("role", role),

    getBusinessId: () => localStorage.getItem("business_id"),
    setBusinessId: (id) => localStorage.setItem("business_id", id || ""),

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

    getUsername: () => localStorage.getItem("username"),
    setUsername: (username) => localStorage.setItem("username", username || ""),

    getEmail: () => localStorage.getItem("email"),
    setEmail: (email) => localStorage.setItem("email", email || ""),

    getBranches: () => {
        const raw = localStorage.getItem("branches");
        if (!raw) return [];
        try {
            return JSON.parse(raw);
        } catch (e) {
            return [];
        }
    },
    setBranches: (branches) => {
        if (Array.isArray(branches)) {
            localStorage.setItem("branches", JSON.stringify(branches));
        } else {
            localStorage.removeItem("branches");
        }
    },
};
