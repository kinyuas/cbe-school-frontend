// src/context/AuthContext.jsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import usePushNotifications from '../hooks/usePushNotifications';

// 🆕 Import query client
import queryClient from '../lib/queryClient';

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
const FCM_TOKEN_KEY = 'fcmToken';

// Roles that keep the original 1h idle logout
const IDLE_ENFORCED_ROLES = ['admin', 'bursar', 'superadmin'];

// ============================================================
// ROLE HOME ROUTES
// ============================================================
const ROLE_HOME = {
  admin: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  bursar: '/bursar/dashboard',
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

// 🆕 Classifies failures that must NOT cause a logout.
// Any of these keep the user's session intact so cached data
// continues to render (WhatsApp-style offline behaviour).
const isNonAuthFailure = (error) => {
  const status = error?.response?.status;
  const code = error?.response?.data?.code;
  const message = error?.response?.data?.message || '';

  const isOffline =
    typeof navigator !== 'undefined' && navigator.onLine === false;

  // Any 5xx (including 503 DB_UNAVAILABLE from middleware) is a
  // server-side/infrastructure problem — NOT an auth failure.
  const isServerFailure = typeof status === 'number' && status >= 500;

  const isDbFailure =
    code === 'DB_ERROR' ||
    code === 'DB_UNAVAILABLE' ||
    code === 'SERVER_ERROR' ||
    /ECONNREFUSED|ENOTFOUND|MongoServerSelectionError|MongoNetworkError|querySrv|TopologyDescription/i.test(
      message
    );

  return isOffline || isServerFailure || isDbFailure || isNetworkError(error);
};

// 🆕 Best-effort unregister of this device's FCM token
const unregisterPushToken = () => {
  try {
    const token = localStorage.getItem(FCM_TOKEN_KEY);
    if (!token) return;
    // fire-and-forget; backend removes it from DeviceToken for this user
    api.delete('/notifications/unregister-device', { data: { token } }).catch(() => {});
    localStorage.removeItem(FCM_TOKEN_KEY);
  } catch (_) {}
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

  usePushNotifications({
    user,
    onNavigate: (link) => {
      try { window.location.href = link; } catch (_) {}
    },
  });

  const idleTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const lastActivityWriteRef = useRef(0);
  const warningShownRef = useRef(false);
  const validatingRef = useRef(false);

  // ============================================================
  // LOGOUT (manual / idle / revoked only)
  // ============================================================
  const logout = useCallback((reason = 'manual') => {
    unregisterPushToken();
    api.post('/auth/logout').catch(() => {});

    // 🆕 CRITICAL: Clear TanStack Query cache to prevent cross-user data leaks
    queryClient.clear();

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
  // SESSION REVOKED LISTENER (2-device enforcement)
  // ============================================================
  useEffect(() => {
    const handler = () => {
      // 🆕 Defense-in-depth: ignore stale/queued events while offline.
      // The `online` re-validation below will catch a genuine revocation
      // the moment we reconnect.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        console.warn('[auth] Ignored session-revoked while offline — keeping session');
        return;
      }

      unregisterPushToken();

      // 🆕 CRITICAL: Clear cache on session revocation too
      queryClient.clear();

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      setLoginStep('credentials');
      setTempLoginData(null);
      toast.error(
        'You were signed out because your account logged in on another device.',
        { duration: 8000, icon: '🔒' }
      );
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    };
    window.addEventListener('session-revoked', handler);
    return () => window.removeEventListener('session-revoked', handler);
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

    // Teacher / parent / pupil → no idle auto-logout.
    // Admin / bursar / superadmin keep the 1h idle policy.
    if (!IDLE_ENFORCED_ROLES.includes(user.role)) {
      clearIdleTimers();
      return;
    }

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
      const response = await api.get('/auth/validate', { timeout: 8000 });
      if (response.data?.success && response.data?.user) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setLoading(false);
        return;
      }
      // Server replied but said "no user" → treat as normal auth loss
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setLoading(false);
    } catch (error) {
      const code = error?.response?.data?.code;

      // Explicit server-side revocation → the session-revoked listener owns cleanup
      if (code === 'SESSION_REVOKED') {
        setLoading(false);
        return;
      }

      // 🆕 Offline / network / DB / 5xx → NEVER log the user out.
      // Keep the localStorage session intact so the parent stays logged in
      // and resumes seamlessly when connectivity returns.
      if (isNonAuthFailure(error)) {
        console.warn(
          '[auth] validateToken: non-auth failure, keeping session',
          error?.response?.status,
          code
        );
        setLoading(false);
        return;
      }

      // Real 401/403 while genuinely online → session is dead
      if (isAuthError(error)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
        setLoading(false);
        return;
      }

      // Last resort: transient error we didn't classify — retry a couple of times
      if (attempt < 2) {
        await sleep(1500 * (attempt + 1));
        validatingRef.current = false;
        return validateToken(attempt + 1);
      }

      // Still not a real auth error → keep session
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
        // Skip network validation entirely while offline — trust the
        // cached session and let the `online` listener below revalidate.
        if (typeof navigator === 'undefined' || navigator.onLine !== false) {
          setTimeout(() => { validateToken(); }, 50);
        } else {
          setLoading(false);
        }
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
  // 🆕 RE-VALIDATE WHEN CONNECTIVITY RETURNS
  // ============================================================
  useEffect(() => {
    if (!user) return;

    const handleOnline = () => {
      console.log('[auth] Back online — revalidating token');
      validateToken();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user, validateToken]);

  // ============================================================
  // SET SESSION
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
  // LOGIN FLOW
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
        loginType,
      });

      if (response.data?.requireCode) {
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
      const backendLoginType = (tempLoginData.role === 'admin' || tempLoginData.role === 'bursar') ? 'staff' : tempLoginData.role;

      const response = await api.post('/auth/verify-code', {
        schoolCode: tempLoginData.schoolCode,
        email: tempLoginData.email,
        code: verificationCode,
        loginType: backendLoginType,
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
    setSession,
    isAuthenticated,
    isAdmin,
    isTeacher,
    isBursar,
    isParent,
    isPupil,
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