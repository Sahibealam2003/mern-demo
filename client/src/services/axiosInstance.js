import axios from 'axios';
import { logout, setAccessToken } from '../store/slices/authSlice.js';

// Keep localStorage + Redux in sync (so /auth/me always has a token)
const LS_ACCESS_TOKEN_KEY = 'accessToken';
const LS_REFRESH_TOKEN_KEY = 'refreshToken';

const REDUX_STORE_KEY = '__TODO_APP_REDUX_STORE__';

const getStore = () => {
  if (typeof globalThis !== 'undefined' && globalThis[REDUX_STORE_KEY]) {
    return globalThis[REDUX_STORE_KEY];
  }

  return null;
};

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ─── Public instance (no auth header) ────────────────────────────────────────
export const publicApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Private instance (attaches Bearer token) ────────────────────────────────
export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Track whether a token refresh is in progress to avoid duplicate calls
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Attach access token from Redux store (fallback to localStorage) to every request
api.interceptors.request.use(
  (config) => {
    const currentStore = getStore();
    const tokenFromRedux = currentStore?.getState?.().auth.accessToken;
    const tokenFromLS = (() => {
      try {
        return localStorage.getItem(LS_ACCESS_TOKEN_KEY);
      } catch {
        return null;
      }
    })();

    const token = tokenFromRedux || tokenFromLS;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        // Queue request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await publicApi.post('/auth/refresh');
        const { accessToken } = response.data.data;
        const currentStore = getStore();

        // Sync token to Redux + localStorage
        currentStore?.dispatch?.(setAccessToken(accessToken));
        try {
          localStorage.setItem(LS_ACCESS_TOKEN_KEY, accessToken);
        } catch {}

        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        getStore()?.dispatch?.(logout());
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
