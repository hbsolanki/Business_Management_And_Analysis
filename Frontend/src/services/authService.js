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

const normalizeWork = (input) => {
    if (!input) return "";
    
    // If input is already an array, normalize it directly
    if (Array.isArray(input)) {
        return [...new Set(normalizeWorkList(input))].join(",");
    }

    // If input is an object, try to find assigned_works or work fields
    const assignedWorks = normalizeWorkList(input.assigned_works);
    const legacyWorks = normalizeWorkList(input.work);
    return [...new Set([...assignedWorks, ...legacyWorks])].join(",");
};

export const authService = {
    getMe: async () => {
        const response = await api.get("/user/me/");
        const data = response.data;
        
        // Extract from nested structure: response.data.user and response.data.business
        const user = data.user || {};
        const business = data.business || {};

        // Store only relevant details as requested
        tokenService.setId(user.id);
        tokenService.setUsername(user.username);
        tokenService.setEmail(user.email);
        tokenService.setBusinessId(business.id);

        const roleValue = data.role || user.role;
        if (roleValue) {
            const roleString = typeof roleValue === "object" ? roleValue.role : roleValue;
            tokenService.setRole(roleString);
        }

        // Use top-level assigned_works or user.assigned_works
        tokenService.setWork(normalizeWork(data.assigned_works || user.assigned_works));

        const { branchId } = getLandingPath(data);
        if (branchId) {
            tokenService.setDefaultBranchId(branchId);
        }

        return data;
    },

    login: async (credentials) => {
        const response = await api.post("/user/login/", credentials);
        const { access, refresh } = response.data;

        tokenService.setTokens({ access, refresh });

        const userProfile = await authService.getMe();
        tokenService.setId(userProfile.id);
        return { ...response.data, user: userProfile, userProfile };
    },

    googleLogin: async (code) => {
        const response = await api.post("/user/auth/google/", { code });
        const { access, refresh } = response.data;

        tokenService.setTokens({ access, refresh });

        const userProfile = await authService.getMe();
        tokenService.setId(userProfile.id);
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


    sendOtp: (email) => api.post("/user/send-otp/", { email }),
    validateUsername: (username) => api.post("/user/forget/password/validate-username/", { username }),
    verifyOtp: (username, otp) => api.post("/user/forget/password/validate-otp/", { username, otp }),
    resetPassword: (username, otp, password) => api.post("/user/forget/password/reset/", { username, otp, password }),
    forgetUsername: (email) => api.post("/user/forget/username/", { email }),
    deleteUser: (id) => api.delete(`/user/${id}/`),


    logout: async () => {
        try {
            const refresh = tokenService.getRefreshToken();
            if (refresh) {
                await api.post("/user/logout/", { refresh });
            }
        } catch (error) {
            console.error("Logout API error:", error);
        } finally {
            tokenService.clearTokens();
        }
    },
};
