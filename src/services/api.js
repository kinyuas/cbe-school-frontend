import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Increased from 10000 to 30000 (30 seconds)
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