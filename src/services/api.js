// src/services/api.js
import axios from 'axios';

// Use environment variable with fallback for production
const API_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://cbe-school-backend.vercel.app/api' 
    : 'https://cbe-school-backend.vercel.app/apii');
    // : 'http://localhost:5000/api');

console.log('🔧 API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle timeout errors gracefully
    if (error.code === 'ECONNABORTED') {
      console.log('Request timeout - but email may still be sent');
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



// // src/services/api.js
// import axios from 'axios';

// // ============================================================
// // API URL - Use Vercel backend for production
// // ============================================================
// const API_URL = process.env.REACT_APP_API_URL || 'https://cbe-school-backend.vercel.app/api';

// console.log('🔧 API URL:', API_URL);

// const api = axios.create({
//   baseURL: API_URL,
//   headers: {
//     'Content-Type': 'application/json',
//   },
//   timeout: 30000,
// });

// // Request interceptor
// api.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem('token');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// // Response interceptor
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       const isLoginPage = window.location.pathname === '/login';
//       if (!isLoginPage) {
//         localStorage.removeItem('token');
//         localStorage.removeItem('user');
//         window.location.href = '/login';
//       }
//     }
//     return Promise.reject(error);
//   }
// );

// export default api;