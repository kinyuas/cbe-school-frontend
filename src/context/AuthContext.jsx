// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// ============================================================
// CONFIGURATION
// ============================================================
const IDLE_TIMEOUT_MS = 60 * 60 * 1000;        // 1 hour
const IDLE_WARNING_MS = 55 * 60 * 1000;        // 55 min
const ACTIVITY_THROTTLE_MS = 30 * 1000;        // 30s
const LAST_ACTIVITY_KEY = 'lastActivityAt';

// ============================================================
// ROLE HOME ROUTES
// ============================================================
const ROLE_HOME = {
  admin: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  bursar: '/bursar/dashboard', // 👈 Routes to the new Modular Bursar Portal
  parent: '/parent/dashboard',
  pupil: '/pupil/dashboard',
  superadmin: '/sys-admin-dashboard',
};

// ============================================================
// HELPERS
// ============================================================
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const isNetworkError = (error) => {
  if (!error) return false;
  return (
    error.code === 'ERR_NETWORK' ||
    error.code === 'ECONNABORTED' ||
    error.message === 'Network Error' ||
    (error.request && !error.response)
  );
};

const isAuthError = (error) => {
  const status = error?.response?.status;
  return status === 401 || status === 403;
};

// ===== AI Device Detection Hook =====
const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    type: 'desktop', isMobile: false, isTablet: false, isDesktop: true,
    viewportWidth: 0, viewportHeight: 0, pixelRatio: 1, isTouchDevice: false,
    os: 'unknown', browser: 'unknown',
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

      setDeviceInfo({ type, isMobile, isTablet, isDesktop, viewportWidth: width, viewportHeight: height, pixelRatio, isTouchDevice, os, browser });
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  return deviceInfo;
};

// ============================================================
// AUTH PROVIDER
// ============================================================
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginStep, setLoginStep] = useState('credentials');
  const [tempLoginData, setTempLoginData] = useState(null);

  const deviceInfo = useDeviceDetection();

  const idleTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const lastActivityWriteRef = useRef(0);
  const warningShownRef = useRef(false);
  const validatingRef = useRef(false);

  // ============================================================
  // LOGOUT
  // ============================================================
  const logout = useCallback((reason = 'manual') => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setLoginStep('credentials');
    setTempLoginData(null);

    if (reason === 'idle') {
      toast.error('You were logged out due to 1 hour of inactivity.', { duration: 8000, icon: '⏰' });
    } else if (reason === 'manual') {
      toast.success('Logged out successfully');
    }
  }, []);

  // ============================================================
  // IDLE TIMEOUTS
  // ============================================================
  const clearIdleTimers = useCallback(() => {
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
    if (warningTimerRef.current) { clearTimeout(warningTimerRef.current); warningTimerRef.current = null; }
    warningShownRef.current = false;
  }, []);

  const scheduleIdleTimers = useCallback((elapsedMs = 0) => {
    clearIdleTimers();
    const warningDelay = IDLE_WARNING_MS - elapsedMs;
    const logoutDelay = IDLE_TIMEOUT_MS - elapsedMs;

    if (logoutDelay <= 0) { logout('idle'); return; }

    if (warningDelay > 0) {
      warningTimerRef.current = setTimeout(() => {
        warningShownRef.current = true;
        toast('You will be logged out in 5 minutes due to inactivity.', { duration: 30000, icon: '⚠️', id: 'idle-warning' });
      }, warningDelay);
    }

    idleTimerRef.current = setTimeout(() => { logout('idle'); }, logoutDelay);
  }, [clearIdleTimers, logout]);

  const recordActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityWriteRef.current < ACTIVITY_THROTTLE_MS) return;
    lastActivityWriteRef.current = now;

    try { localStorage.setItem(LAST_ACTIVITY_KEY, String(now)); } catch (e) {}

    if (warningShownRef.current) {
      toast.dismiss('idle-warning');
      warningShownRef.current = false;
    }
    scheduleIdleTimers(0);
  }, [scheduleIdleTimers]);

  useEffect(() => {
    if (!user) { clearIdleTimers(); return; }

    let elapsed = 0;
    try {
      const stored = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10);
      if (stored > 0) elapsed = Date.now() - stored;
    } catch (e) {}

    if (elapsed < 0 || elapsed > IDLE_TIMEOUT_MS) {
      elapsed = 0;
      try { localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now())); } catch (e) {}
    }

    scheduleIdleTimers(elapsed);

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'];
    const handler = () => recordActivity();
    events.forEach((evt) => window.addEventListener(evt, handler, { passive: true }));

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        let idleFor = 0;
        try {
          const stored = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10);
          if (stored > 0) idleFor = Date.now() - stored;
        } catch (e) {}
        if (idleFor >= IDLE_TIMEOUT_MS) logout('idle');
        else scheduleIdleTimers(idleFor);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handler));
      document.removeEventListener('visibilitychange', onVisibility);
      clearIdleTimers();
    };
  }, [user, clearIdleTimers, scheduleIdleTimers, recordActivity, logout]);

  // ============================================================
  // VALIDATE TOKEN
  // ============================================================
  const validateToken = useCallback(async (attempt = 0) => {
    if (validatingRef.current) return;
    validatingRef.current = true;

    try {
      const response = await api.get('/auth/validate', { timeout: 15000 });
      if (response.data?.success && response.data?.user) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setLoading(false);
        return;
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setLoading(false);
    } catch (error) {
      if (isAuthError(error)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
        setLoading(false);
        return;
      }
      if (attempt < 2) {
        await sleep(1500 * (attempt + 1));
        validatingRef.current = false;
        return validateToken(attempt + 1);
      }
      setLoading(false);
    } finally {
      validatingRef.current = false;
    }
  }, []);

  // ============================================================
  // INITIAL BOOTSTRAP
  // ============================================================
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setTimeout(() => { validateToken(); }, 50);
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [validateToken]);

  // ============================================================
  // SET SESSION  👈 NEW
  // Used by parent/pupil direct-API login in Login.jsx to sync
  // token + user state + auth header + idle timers in one call.
  // ============================================================
  const setSession = useCallback((token, userObj) => {
    if (!token || !userObj) return;
    try {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userObj));
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    } catch (e) {
      console.warn('setSession: localStorage write failed', e);
    }
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    lastActivityWriteRef.current = Date.now();
    setUser(userObj);
  }, []);

  // ============================================================
  // LOGIN FLOW  (admin / teacher / bursar)
  // ============================================================
  const login = async (identifier, password, role) => {
    try {
      const [schoolCode, email] = identifier.split('-');

      let loginType = 'staff';
      if (role === 'teacher') loginType = 'teacher';
      else if (role === 'parent') loginType = 'parent';
      else if (role === 'pupil') loginType = 'pupil';

      const response = await api.post('/auth/login', {
        schoolCode,
        email,
        password,
        loginType
      });

      if (response.data?.requireCode) {
        // Store the correct role (admin vs bursar)
        // If the portal is 'admin', we store 'admin', the backend will resolve it to bursar if found.
        setTempLoginData({ schoolCode, email, role: role || 'admin' });
        setLoginStep('verification');
        toast.success(response.data.message || 'Verification code sent!');
        return { success: true, requiresVerification: true, message: response.data.message };
      }

      if (response.data?.token) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(user);
        toast.success('Login successful!');
        return { success: true, user, requiresVerification: false };
      }

      const message = response.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, message };

    } catch (error) {
      console.error('Login error:', error);
      if (isNetworkError(error) || error.code === 'ECONNABORTED') {
        const timeoutMsg = 'Server is taking too long. Please try again.';
        toast.error(timeoutMsg, { duration: 6000 });
        return { success: false, message: timeoutMsg, timeout: true };
      }
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(message);
      return { success: false, message };
    }
  };

  // ============================================================
  // VERIFY CODE FLOW
  // ============================================================
  const completeLogin = async (verificationCode) => {
    if (!tempLoginData) {
      toast.error('Login session expired. Please try again.');
      return { success: false, message: 'Login session expired.' };
    }

    try {
      // The backend expects 'staff' for both Admin and Bursar logins
      const backendLoginType = (tempLoginData.role === 'admin' || tempLoginData.role === 'bursar') ? 'staff' : tempLoginData.role;

      const response = await api.post('/auth/verify-code', {
        schoolCode: tempLoginData.schoolCode,
        email: tempLoginData.email,
        code: verificationCode,
        loginType: backendLoginType
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

    } catch (error) {
      console.error('Verification error:', error);
      const message = error.response?.data?.message || 'Verification failed. Please try again.';
      toast.error(message);
      return { success: false, message };
    }
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const isBursar = user?.role === 'bursar';
  const isParent = user?.role === 'parent';
  const isPupil = user?.role === 'pupil';

  const getHomeRoute = useCallback(() => {
    if (!user) return '/login';
    return ROLE_HOME[user.role] || '/login';
  }, [user]);

  const value = {
    user,
    loading,
    login,
    completeLogin,
    logout,
    setSession,              // 👈 NEW — used by parent/pupil login in Login.jsx
    isAuthenticated,
    isAdmin,
    isTeacher,
    isBursar,
    isParent,                // 👈 NEW (optional convenience)
    isPupil,                 // 👈 NEW (optional convenience)
    getHomeRoute,
    loginStep,
    setLoginStep,
    tempLoginData,
    deviceInfo,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};