// src/services/api.js
import axios from 'axios';

// Use environment variable with fallback for production
const API_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://cbe-school-backend.vercel.app/api' 
    : 'http://localhost:5000/api');

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





// src/services/api.js
// import axios from 'axios';

// // ============================================================
// // API URL Configuration - Local Development Ready
// // ============================================================

// // Get the API URL based on environment
// const getApiUrl = () => {
//   // Check if running in production (Vercel)
//   if (process.env.NODE_ENV === 'production') {
//     // Use environment variable if set, otherwise use production URL
//     return process.env.REACT_APP_API_URL || 'https://cbe-school-backend.vercel.app/api';
//   }
  
//   // Development - Always use localhost
//   return 'http://localhost:5000/api';
// };

// const API_URL = getApiUrl();

// console.log('🔧 API URL:', API_URL);
// console.log('📦 Environment:', process.env.NODE_ENV);

// // ============================================================
// // Axios Instance Configuration
// // ============================================================

// const api = axios.create({
//   baseURL: API_URL,
//   headers: {
//     'Content-Type': 'application/json',
//     'Accept': 'application/json',
//   },
//   timeout: 30000, // 30 seconds
//   withCredentials: false, // Set to true if using cookies
// });

// // ============================================================
// // Request Interceptor - Add Auth Token
// // ============================================================

// api.interceptors.request.use(
//   (config) => {
//     // Get token from localStorage
//     const token = localStorage.getItem('token');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }

//     // Log requests in development
//     if (process.env.NODE_ENV === 'development') {
//       console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
//     }

//     return config;
//   },
//   (error) => {
//     console.error('❌ Request error:', error);
//     return Promise.reject(error);
//   }
// );

// // ============================================================
// // Response Interceptor - Handle Errors
// // ============================================================

// api.interceptors.response.use(
//   (response) => {
//     // Log responses in development
//     if (process.env.NODE_ENV === 'development') {
//       console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
//     }
//     return response;
//   },
//   (error) => {
//     // Handle timeout errors gracefully
//     if (error.code === 'ECONNABORTED') {
//       console.log('⏱️ Request timeout:', error.config?.url);
//       return Promise.reject({
//         ...error,
//         message: 'Request timed out. Please check your connection.'
//       });
//     }

//     // Handle network errors
//     if (!error.response) {
//       console.error('🌐 Network error:', error.message);
//       return Promise.reject({
//         ...error,
//         message: 'Network error. Please check your internet connection.'
//       });
//     }

//     // Handle 401 Unauthorized
//     if (error.response?.status === 401) {
//       const isLoginPage = window.location.pathname === '/login';
//       const isVerificationPage = window.location.pathname.includes('verify');
      
//       if (!isLoginPage && !isVerificationPage) {
//         console.warn('🔒 Session expired. Redirecting to login...');
//         localStorage.removeItem('token');
//         localStorage.removeItem('user');
//         window.location.href = '/login';
//       }
//     }

//     // Log other errors
//     console.error('❌ API Error:', {
//       status: error.response?.status,
//       message: error.response?.data?.message || error.message,
//       url: error.config?.url
//     });

//     return Promise.reject(error);
//   }
// );

// // ============================================================
// // Helper Methods
// // ============================================================

// // Check if API is connected
// api.isConnected = async () => {
//   try {
//     const response = await api.get('/health');
//     return response.data?.status === 'healthy' || response.data?.success === true;
//   } catch (error) {
//     console.error('❌ Health check failed:', error.message);
//     return false;
//   }
// };

// // Get current API URL
// api.getBaseUrl = () => API_URL;

// // Set auth token
// api.setAuthToken = (token) => {
//   if (token) {
//     localStorage.setItem('token', token);
//   } else {
//     localStorage.removeItem('token');
//   }
// };

// // Clear auth token
// api.clearAuthToken = () => {
//   localStorage.removeItem('token');
//   localStorage.removeItem('user');
// };

// export default api;