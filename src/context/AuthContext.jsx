// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ============================================================
// IDLE TIMEOUT CONFIG
// ============================================================
const IDLE_TIMEOUT_MS = 60 * 60 * 1000;        // 1 hour — full idle time
const IDLE_WARNING_MS = 55 * 60 * 1000;        // 55 min — show warning 5 min before
const ACTIVITY_THROTTLE_MS = 30 * 1000;        // Only record activity every 30s
const LAST_ACTIVITY_KEY = 'lastActivityAt';    // Persisted across page reloads

// ===== AI Device Detection Hook =====
const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    type: 'desktop',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    viewportWidth: 0,
    viewportHeight: 0,
    pixelRatio: 1,
    isTouchDevice: false,
    os: 'unknown',
    browser: 'unknown'
  });

  useEffect(() => {
    const detectDevice = () => {
      const ua = navigator.userAgent;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const pixelRatio = window.devicePixelRatio || 1;
      
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || width < 768;
      const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua) || (width >= 768 && width < 1024);
      const isDesktop = !isMobile && !isTablet;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      let os = 'unknown';
      if (/Windows/i.test(ua)) os = 'windows';
      else if (/Mac OS X/i.test(ua)) os = 'macos';
      else if (/Linux/i.test(ua)) os = 'linux';
      else if (/Android/i.test(ua)) os = 'android';
      else if (/iOS|iPhone|iPad/i.test(ua)) os = 'ios';
      
      let browser = 'unknown';
      if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) browser = 'chrome';
      else if (/Firefox/i.test(ua)) browser = 'firefox';
      else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'safari';
      else if (/Edge/i.test(ua)) browser = 'edge';
      else if (/Opera|OPR/i.test(ua)) browser = 'opera';
      
      let type = 'desktop';
      if (isMobile) type = 'mobile';
      else if (isTablet) type = 'tablet';
      
      setDeviceInfo({
        type,
        isMobile,
        isTablet,
        isDesktop,
        viewportWidth: width,
        viewportHeight: height,
        pixelRatio,
        isTouchDevice,
        os,
        browser
      });
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  return deviceInfo;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginStep, setLoginStep] = useState('credentials');
  const [tempLoginData, setTempLoginData] = useState(null);
  const [registrationStep, setRegistrationStep] = useState('form');
  const [tempRegistrationData, setTempRegistrationData] = useState(null);

  // AI Device Detection
  const deviceInfo = useDeviceDetection();

  // ============================================================
  // IDLE TIMEOUT — tracking state
  // ============================================================
  const idleTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const lastActivityWriteRef = useRef(0);
  const warningShownRef = useRef(false);

  // ============================================================
  // logout — stable reference via useCallback
  // ============================================================
  const logout = useCallback((reason = 'manual') => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setLoginStep('credentials');
    setTempLoginData(null);
    setRegistrationStep('form');
    setTempRegistrationData(null);

    if (reason === 'idle') {
      toast.error('You were logged out due to 1 hour of inactivity.', {
        duration: 8000,
        icon: '⏰',
      });
    } else {
      toast.success('Logged out successfully');
    }
  }, []);

  // ============================================================
  // Clear idle timers
  // ============================================================
  const clearIdleTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    warningShownRef.current = false;
  }, []);

  // ============================================================
  // Schedule the idle-warning and idle-logout timers
  // ============================================================
  const scheduleIdleTimers = useCallback((elapsedMs = 0) => {
    clearIdleTimers();

    const warningDelay = IDLE_WARNING_MS - elapsedMs;
    const logoutDelay = IDLE_TIMEOUT_MS - elapsedMs;

    // If already past the logout threshold, log out immediately
    if (logoutDelay <= 0) {
      logout('idle');
      return;
    }

    // Schedule the warning (if there's still time)
    if (warningDelay > 0) {
      warningTimerRef.current = setTimeout(() => {
        warningShownRef.current = true;
        toast(
          'You will be logged out in 5 minutes due to inactivity. Move your mouse or press a key to stay signed in.',
          {
            duration: 30000,
            icon: '⚠️',
            id: 'idle-warning',
          }
        );
      }, warningDelay);
    }

    // Schedule the actual logout
    idleTimerRef.current = setTimeout(() => {
      logout('idle');
    }, logoutDelay);
  }, [clearIdleTimers, logout]);

  // ============================================================
  // Record user activity — throttled so we don't re-schedule
  // timers on every mouse move.
  // ============================================================
  const recordActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityWriteRef.current < ACTIVITY_THROTTLE_MS) {
      return;
    }
    lastActivityWriteRef.current = now;

    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    } catch (e) {}

    // Dismiss any warning toast
    if (warningShownRef.current) {
      toast.dismiss('idle-warning');
      warningShownRef.current = false;
    }

    scheduleIdleTimers(0);
  }, [scheduleIdleTimers]);

  // ============================================================
  // Set up idle tracking whenever a user is logged in
  // ============================================================
  useEffect(() => {
    if (!user) {
      clearIdleTimers();
      return;
    }

    // Determine elapsed time since last activity (survives page reloads)
    let elapsed = 0;
    try {
      const stored = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10);
      if (stored > 0) elapsed = Date.now() - stored;
    } catch (e) {}

    // Fresh stamp if we just logged in
    if (elapsed < 0 || elapsed > IDLE_TIMEOUT_MS) {
      elapsed = 0;
      try { localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now())); } catch (e) {}
    }

    scheduleIdleTimers(elapsed);

    // Throttled event listener
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'];
    const handler = () => recordActivity();
    events.forEach(evt => window.addEventListener(evt, handler, { passive: true }));

    // Also listen for tab visibility — if user comes back to tab, check idle
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        let idleFor = 0;
        try {
          const stored = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10);
          if (stored > 0) idleFor = Date.now() - stored;
        } catch (e) {}

        if (idleFor >= IDLE_TIMEOUT_MS) {
          logout('idle');
        } else {
          scheduleIdleTimers(idleFor);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      events.forEach(evt => window.removeEventListener(evt, handler));
      document.removeEventListener('visibilitychange', onVisibility);
      clearIdleTimers();
    };
  }, [user, clearIdleTimers, scheduleIdleTimers, recordActivity, logout]);

  // ============================================================
  // Initial token validation
  // ============================================================
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        validateToken();
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const validateToken = async () => {
    try {
      const response = await api.get('/auth/validate');
      if (response.data.success) {
        const userData = response.data.user;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // ============ REGISTRATION FLOW ============

  const sendVerificationCode = async (email, schoolName) => {
    try {
      const response = await api.post('/auth/send-verification', { email, schoolName });
      
      if (response.data.success) {
        setTempRegistrationData({ email, schoolName });
        setRegistrationStep('verification');
        toast.success(response.data.message || 'Verification code sent!');
        return { success: true, message: response.data.message };
      }
      return { success: false, message: response.data.message || 'Failed to send code' };
    } catch (error) {
      console.error('Send verification error:', error);
      const message = error.response?.data?.message || 'Failed to send verification code';
      toast.error(message);
      return { success: false, message };
    }
  };

  const signup = async (signUpData, verificationCode) => {
    try {
      const requestData = {
        schoolName: signUpData.schoolName,
        schoolEmail: signUpData.schoolEmail,
        schoolCode: signUpData.schoolCode,
        adminName: signUpData.adminName,
        verificationCode: verificationCode,
        phoneNumber: signUpData.phoneNumber || '',
        address: signUpData.address || '',
        website: signUpData.website || '',
        adminPhone: signUpData.adminPhone || ''
      };
      
      const response = await api.post('/auth/signup', requestData);
      
      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(user);
        setRegistrationStep('form');
        setTempRegistrationData(null);
        toast.success('School registered successfully!');
        return { success: true, user };
      }
      
      const message = response.data.message || 'Registration failed';
      toast.error(message);
      return { success: false, message };
    } catch (error) {
      console.error('Signup error:', error);
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(message);
      return { success: false, message };
    }
  };

  // ============ LOGIN FLOW ============

  const login = async (email, password, role) => {
    try {
      if (role === 'admin') {
        const response = await api.post('/auth/admin/login', { email, password });
        
        if (response.data.success && response.data.requiresVerification) {
          setTempLoginData({ 
            email: response.data.email,
            userId: response.data.userId,
            role: 'admin'
          });
          setLoginStep('verification');
          toast.success(response.data.message || 'Verification code sent!');
          return { 
            success: true, 
            requiresVerification: true,
            message: response.data.message 
          };
        }
        
        const message = response.data.message || 'Login failed';
        toast.error(message);
        return { success: false, message };
      } else if (role === 'teacher') {
        const response = await api.post('/auth/teacher/login', {
          email,
          tscNumber: password
        });
        
        if (response.data.success) {
          const { token, user } = response.data;
          
          if (!user) {
            console.error('No user data in teacher login response');
            toast.error('Invalid response from server');
            return { 
              success: false, 
              message: 'Invalid response from server - missing user data' 
            };
          }
          
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          setUser(user);
          
          toast.success('Login successful!');
          return { 
            success: true, 
            user: user,
            requiresVerification: false
          };
        }
        
        const message = response.data.message || 'Login failed';
        toast.error(message);
        return { success: false, message };
      }
      
      toast.error('Invalid role selected');
      return { success: false, message: 'Invalid role selected' };
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(message);
      return { success: false, message };
    }
  };

  const completeLogin = async (verificationCode) => {
    if (!tempLoginData) {
      toast.error('Login session expired. Please try again.');
      return { success: false, message: 'Login session expired. Please try again.' };
    }
    
    try {
      if (tempLoginData.role === 'admin') {
        const response = await api.post('/auth/admin/verify', {
          email: tempLoginData.email,
          verificationCode: verificationCode
        });
        
        if (response.data.success) {
          const { token, user } = response.data;
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          setUser(user);
          setLoginStep('credentials');
          setTempLoginData(null);
          toast.success('Login successful!');
          return { success: true, user };
        }
        
        const message = response.data.message || 'Verification failed';
        toast.error(message);
        return { success: false, message };
      }
      
      toast.error('Invalid role');
      return { success: false, message: 'Invalid role' };
    } catch (error) {
      console.error('Verification error:', error);
      const message = error.response?.data?.message || 'Verification failed. Please try again.';
      toast.error(message);
      return { success: false, message };
    }
  };

  const resendAdminCode = async (email) => {
    if (!email) {
      toast.error('No email found. Please try logging in again.');
      return { success: false, message: 'No email provided' };
    }
    
    try {
      const response = await api.post('/auth/admin/resend-code', { email });
      
      if (response.data.success) {
        toast.success(response.data.message || 'New verification code sent to your email!');
        return { 
          success: true, 
          message: response.data.message,
          expiresIn: response.data.expiresIn
        };
      }
      
      toast.error(response.data.message || 'Failed to resend code');
      return { success: false, message: response.data.message };
      
    } catch (error) {
      console.error('Resend admin code error:', error);
      
      if (error.response?.status === 404) {
        toast.error('Admin user not found. Please check your email.');
        return { success: false, message: 'User not found' };
      }
      
      if (error.response?.status === 403) {
        toast.error('Account is deactivated. Please contact support.');
        return { success: false, message: 'Account deactivated' };
      }
      
      if (error.response?.status === 400) {
        toast.error(error.response?.data?.message || 'Invalid request. Please try again.');
        return { success: false, message: error.response?.data?.message };
      }
      
      const errorMessage = error.response?.data?.message || 'Failed to resend verification code. Please try again.';
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';

  const value = {
    user,
    loading,
    login,
    completeLogin,
    resendAdminCode,
    sendVerificationCode,
    signup,
    logout,
    isAuthenticated,
    isAdmin,
    isTeacher,
    loginStep,
    setLoginStep,
    registrationStep,
    setRegistrationStep,
    tempLoginData,
    tempRegistrationData,
    deviceInfo
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};