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
    const isRefreshRequest = config.url?.includes("/api/token/refresh/");
    if (token && !isRefreshRequest) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let refreshPromise = null;

const refreshAccessToken = async () => {
  const refreshToken = tokenService.getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await axios.post(`${API_BASE_URL}/api/token/refresh/`, {
    refresh: refreshToken,
  });

  const nextAccessToken = response.data?.access;
  const nextRefreshToken = response.data?.refresh;
  if (!nextAccessToken) {
    throw new Error("No access token returned from refresh endpoint");
  }

  tokenService.setTokens({
    access: nextAccessToken,
    refresh: nextRefreshToken,
  });
  api.defaults.headers.common["Authorization"] = `Bearer ${nextAccessToken}`;

  return nextAccessToken;
};

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isRefreshRequest = originalRequest?.url?.includes(
      "/api/token/refresh/",
    );

    if (
      status !== 401 ||
      !originalRequest ||
      isRefreshRequest ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    const authHeader =
      originalRequest.headers?.Authorization ||
      originalRequest.headers?.authorization ||
      "";
    const failedRequestToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    const currentAccessToken = tokenService.getAccessToken();

    // If this 401 came from an older in-flight token, retry once with latest access token.
    if (
      failedRequestToken &&
      currentAccessToken &&
      failedRequestToken !== currentAccessToken
    ) {
      originalRequest._retry = true;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers["Authorization"] = `Bearer ${currentAccessToken}`;
      return api(originalRequest);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const nextAccessToken = await refreshPromise;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers["Authorization"] = `Bearer ${nextAccessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      tokenService.clearTokens();
      return Promise.reject(refreshError);
    }
  },
);

export default api;
