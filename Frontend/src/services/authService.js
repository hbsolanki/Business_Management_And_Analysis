import api from "./api";
import { tokenService } from "./tokenService";

export const authService = {
    login: async (credentials) => {
        const response = await api.post("/user/login/", credentials);
        const { user: loginUser, access, refresh } = response.data;

        tokenService.setTokens({ access, refresh });
        tokenService.setRole(loginUser.role);
        tokenService.setId(loginUser.id);

        let work = loginUser.work;
        if (!work && loginUser.role === "EMPLOYEE") {
            try {
                const userDetails = await api.get(`/user/${loginUser.id}/`);
                work = userDetails.data.work;
            } catch (error) {
                console.error("Failed to fetch user work details", error);
            }
        }
        tokenService.setWork(work);

        return response.data;
    },

    googleLogin: async (code) => {
        const response = await api.post("/user/auth/google/", { code });
        const { user: loginUser, access, refresh } = response.data;

        tokenService.setTokens({ access, refresh });
        tokenService.setRole(loginUser.role);
        tokenService.setId(loginUser.id);

        let work = loginUser.work;
        if (!work && loginUser.role === "EMPLOYEE") {
            try {
                const userDetails = await api.get(`/user/${loginUser.id}/`);
                work = userDetails.data.work;
            } catch (error) {
                console.error("Failed to fetch user work details", error);
            }
        }
        tokenService.setWork(work);

        return response.data;
    },

    registerBusiness: async (data) => {
        const response = await api.post("/business/", data);
        const { user, access, refresh } = response.data;

        tokenService.setTokens({ access, refresh });
        tokenService.setRole(user.role);
        tokenService.setId(user.id);
        tokenService.setWork(user.work);

        return response.data;
    },

    validateUsername: (username) => api.post("/user/forget/password/validate-username/", { username }),
    verifyOtp: (username, otp) => api.post("/user/forget/password/validate-otp/", { username, otp }),
    resetPassword: (username, otp, password) => api.post("/user/forget/password/reset/", { username, otp, password }),
    forgetUsername: (email) => api.post("/user/forget/username/", { email }),


    logout: () => {
        tokenService.clearTokens();
    },
};
