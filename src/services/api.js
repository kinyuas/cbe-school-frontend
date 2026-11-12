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

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || localStorage.getItem('superAdminToken');
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
    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      error.code === 'ERR_FAILED' ||
      error.message === 'Network Error'
    ) {
      console.warn(
        `[api] Network issue on ${error.config?.url || 'unknown'} (${error.code})`
      );
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const code = error.response?.data?.code;
    const url = error.config?.url || '';

    const isLoginPage =
      window.location.pathname === '/login' ||
      window.location.pathname === '/' ||
      window.location.pathname === '/sys-admin-login';
    const isVerificationPage = window.location.pathname.includes('verify');
    const isAuthRoute =
      url.includes('/auth/') ||
      url.includes('/school/bursar/login') ||
      url.includes('/administrator/login-');

    // 🆕 2-device limit: server returned SESSION_REVOKED
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

    // Normal 401 (expired token / invalid credentials)
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