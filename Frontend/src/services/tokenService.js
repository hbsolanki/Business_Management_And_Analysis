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
        localStorage.clear();
    },

    getRole: () => localStorage.getItem("role"),
    setRole: (role) => localStorage.setItem("role", role),

    getId: () => localStorage.getItem("id"),
    setId: (id) => localStorage.setItem("id", id),

    getWork: () => localStorage.getItem("work"),
    setWork: (work) => localStorage.setItem("work", work || ""),
};
