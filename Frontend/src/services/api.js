import axios from "axios";
import { tokenService } from "./tokenService";

export const API_BASE_URL = "http://0.0.0.0:8000";

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
});

api.interceptors.request.use(
    (config) => {
        const token = tokenService.getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) prom.reject(error);
        else prom.resolve(token);
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest = error.config;

        if (
            error.response?.status === 401 &&
            !originalRequest._retry
        ) {
            originalRequest._retry = true;

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                });
            }

            isRefreshing = true;

            try {
                const refreshToken = tokenService.getRefreshToken();
                // If no refresh token, logout
                if (!refreshToken) {
                    throw new Error("No refresh token");
                }

                const res = await axios.post(
                    `${API_BASE_URL}/api/token/refresh/`,
                    { refresh: refreshToken }
                );

                const newAccessToken = res.data.access;

                tokenService.setTokens({ access: newAccessToken });

                api.defaults.headers.Authorization = `Bearer ${newAccessToken}`;
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                processQueue(null, newAccessToken);

                return api(originalRequest);
            } catch (err) {
                processQueue(err, null);
                tokenService.clearTokens();
                // Redirect to login if needed, or let the app handle it via state
                // window.location.href = "/login";
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
