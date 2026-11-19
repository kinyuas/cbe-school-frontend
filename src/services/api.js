// src/services/api.js
import axios from 'axios';

const RAW_API_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://cbe-school-backend.vercel.app/api'
    : 'https://cbe-school-backend.vercel.app/api');

const API_URL = RAW_API_URL.replace(/\/+$/, '');

console.log('🔧 Active API URL:', API_URL);

const SLOW_ROUTES = [
  '/auth/admin/login',
  '/auth/admin/resend-code',
  '/auth/admin/verify',
  '/auth/send-verification',
  '/auth/signup',
  '/school/bursar/login',
  '/school/bursar/login-verify',
  '/administrator/login-request',
  '/administrator/login-verify',
  '/administrator/register-school',
];

const isSlowRoute = (url = '') => SLOW_ROUTES.some((r) => url.includes(r));

// 🆕 Matches backend messages that indicate the DB (not the user) is failing
const DB_ERROR_REGEX = /ECONNREFUSED|ENOTFOUND|MongoServerSelectionError|querySrv|MongoNetworkError/i;

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('token') || localStorage.getItem('superAdminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Strip a duplicate /api if a caller passes it manually
    if (config.url && config.url.startsWith('/api/')) {
      config.url = config.url.slice(4);
    }
    if (isSlowRoute(config.url)) {
      config.timeout = 75000;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let didBounceForAuth = false;

api.interceptors.response.use(
  (response) => {
    didBounceForAuth = false;
    return response;
  },
  (error) => {
    const url = error.config?.url || '';

    // ---- 1. Network-layer failures: never bounce -----------------
    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      error.code === 'ERR_FAILED' ||
      error.message === 'Network Error' ||
      (!error.response && error.request)
    ) {
      console.warn(
        `[api] Network issue on ${url} (${error.code || error.message}) — keeping session`
      );
      return Promise.reject(error);
    }

    const status  = error.response?.status;
    const data    = error.response?.data || {};
    const code    = data.code;
    const message = data.message || '';

    // ---- 2. Explicit offline guard --------------------------------
    // If the browser/OS says we're offline, a 401 here is meaningless —
    // it's almost certainly a stale response. Never log out.
    const isOffline =
      typeof navigator !== 'undefined' && navigator.onLine === false;

    // ---- 3. Server / DB failures: never bounce --------------------
    const isServerFailure = typeof status === 'number' && status >= 500;
    const isDbFailure =
      code === 'DB_ERROR' ||
      code === 'SERVER_ERROR' ||
      DB_ERROR_REGEX.test(message);

    if (isOffline || isServerFailure || isDbFailure) {
      console.warn(
        `[api] Suppressed auth bounce for ${url} ` +
          `(offline=${isOffline}, status=${status}, code=${code}) — keeping session`
      );
      return Promise.reject(error);
    }

    const isLoginPage =
      window.location.pathname === '/login' ||
      window.location.pathname === '/' ||
      window.location.pathname === '/sys-admin-login';
    const isVerificationPage = window.location.pathname.includes('verify');
    const isAuthRoute =
      url.includes('/auth/') ||
      url.includes('/school/bursar/login') ||
      url.includes('/administrator/login-');

    // ---- 4. Genuine 2-device revocation ---------------------------
    if (status === 401 && code === 'SESSION_REVOKED' && !isLoginPage) {
      if (!didBounceForAuth) {
        didBounceForAuth = true;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Let AuthContext show a toast + navigate (avoids hard reload)
        window.dispatchEvent(new CustomEvent('session-revoked'));
      }
      return Promise.reject(error);
    }

    // ---- 5. Normal 401 (expired token / bad credentials) ----------
    if (status === 401 && !isLoginPage && !isVerificationPage && !isAuthRoute) {
      if (!didBounceForAuth) {
        didBounceForAuth = true;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('superAdminToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;