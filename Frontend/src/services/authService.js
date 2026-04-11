import api from "./api";
import { tokenService } from "./tokenService";
import { getLandingPath } from "@/features/auth/utils/authUtils";

const normalizeWorkItem = (item) => {
    if (!item && item !== 0) return null;
    if (typeof item === "string") return item.trim().toUpperCase();
    if (typeof item === "object") {
        const value = item.work_type || item.value || item.name || item.work || item.code || item.label;
        return value ? String(value).trim().toUpperCase() : null;
    }
    return String(item).trim().toUpperCase();
};

const normalizeWorkList = (value) => {
    if (!value && value !== 0) return [];

    let list = [];
    if (Array.isArray(value)) {
        list = value;
    } else if (typeof value === "string") {
        const raw = value.trim();
        if (!raw) return [];

        if (raw.startsWith("[") && raw.endsWith("]")) {
            try {
                const parsed = JSON.parse(raw);
                list = Array.isArray(parsed) ? parsed : [parsed];
            } catch (_error) {
                list = raw.split(",");
            }
        } else if (raw.includes(",")) {
            list = raw.split(",");
        } else {
            list = [raw];
        }
    } else {
        list = [value];
    }

    return list.map(normalizeWorkItem).filter(Boolean);
};

const normalizeWork = (user) => {
    if (!user) return "";
    const assignedWorks = normalizeWorkList(user.assigned_works);
    const legacyWorks = normalizeWorkList(user.work);
    return [...new Set([...assignedWorks, ...legacyWorks])].join(",");
};

export const authService = {
    login: async (credentials) => {
        const response = await api.post("/user/login/", credentials);
        const { user: loginUser, access, refresh } = response.data;

        tokenService.setTokens({ access, refresh });
        tokenService.setId(loginUser.id);

        // If role is present in initial response, set it as fallback
        if (loginUser.role) {
            const roleStr = typeof loginUser.role === 'object' ? loginUser.role.role : loginUser.role;
            tokenService.setRole(roleStr);
        }

        // Fetch complete user profile for Redux
        let userProfile = loginUser;
        try {
            const profileResponse = await api.get(`/user/${loginUser.id}/`);
            userProfile = profileResponse.data;

            // Set role from complete profile
            if (userProfile.role) {
                const roleString = typeof userProfile.role === "object" ? userProfile.role.role : userProfile.role;
                tokenService.setRole(roleString);
            }

            tokenService.setWork(normalizeWork(userProfile));

            // Set default branch if applicable
            const { branchId } = getLandingPath(userProfile);
            if (branchId) {
                tokenService.setDefaultBranchId(branchId);
            }
        } catch (error) {
            console.error("Failed to fetch user profile", error);
            tokenService.setWork(normalizeWork(loginUser));
        }

        return { ...response.data, user: userProfile, userProfile };
    },

    googleLogin: async (code) => {
        const response = await api.post("/user/auth/google/", { code });
        const { user: loginUser, access, refresh } = response.data;

        tokenService.setTokens({ access, refresh });
        tokenService.setId(loginUser.id);

        if (loginUser.role) {
            const roleStr = typeof loginUser.role === 'object' ? loginUser.role.role : loginUser.role;
            tokenService.setRole(roleStr);
        }

        // Fetch complete user profile for Redux
        let userProfile = loginUser;
        try {
            const profileResponse = await api.get(`/user/${loginUser.id}/`);
            userProfile = profileResponse.data;

            if (userProfile.role) {
                const roleString = typeof userProfile.role === "object" ? userProfile.role.role : userProfile.role;
                tokenService.setRole(roleString);
            }

            tokenService.setWork(normalizeWork(userProfile));

            // Set default branch if applicable
            const { branchId } = getLandingPath(userProfile);
            if (branchId) {
                tokenService.setDefaultBranchId(branchId);
            }
        } catch (error) {
            console.error("Failed to fetch user profile", error);
            tokenService.setWork(normalizeWork(loginUser));
        }

        return { ...response.data, user: userProfile, userProfile };
    },

    registerBusiness: async (data) => {
        const response = await api.post("/business/", data);
        const { user, access, refresh } = response.data;

        tokenService.setTokens({ access, refresh });
        const roleStr = typeof user.role === 'object' ? user.role.role : user.role;
        tokenService.setRole(roleStr);
        tokenService.setId(user.id);
        tokenService.setWork(normalizeWork(user));

        return response.data;
    },

    registerOwner: async (data) => {
        const response = await api.post("/user/", data);

        // Backend returns a 201 with just the raw user object or inside { user: ... }
        const user = response.data.user || response.data;

        // We do NOT set tokens here anymore, because the API doesn't return them on register
        return { user, originalResponse: response.data };
    },


    validateUsername: (username) => api.post("/user/forget/password/validate-username/", { username }),
    verifyOtp: (username, otp) => api.post("/user/forget/password/validate-otp/", { username, otp }),
    resetPassword: (username, otp, password) => api.post("/user/forget/password/reset/", { username, otp, password }),
    forgetUsername: (email) => api.post("/user/forget/username/", { email }),
    deleteUser: (id) => api.delete(`/user/${id}/`),


    logout: async () => {
        const refresh = tokenService.getRefreshToken();
        if (refresh) {
            await api.post("/user/logout/", { refresh });
        }
        tokenService.clearTokens();
    },
};
