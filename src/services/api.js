// src/services/api.js
import axios from 'axios';

// Priority: Explicit env variable -> Production Vercel URL -> Localhost fallback
const API_URL = 
  process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://cbe-school-backend.vercel.app/api' 
    : 'http://localhost:5000/api');

console.log('🔧 Active API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to attach JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth failures and timeouts
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.warn('Request timeout on server connection');
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401) {
      const isLoginPage = window.location.pathname === '/login';
      const isVerificationPage = window.location.pathname.includes('verify');
      
      if (!isLoginPage && !isVerificationPage) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;