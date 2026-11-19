// src/hooks/useDeviceDetection.js
import { useState, useEffect } from 'react';

/**
 * AI-powered device detection hook.
 * Detects mobile / tablet / desktop from UA + viewport + touch + DPR + connection.
 * Works across all Android phones (Samsung, Tecno, Infinix, Xiaomi, etc.)
 * and iOS devices. Re-runs on resize / orientation change / network change.
 *
 * Extra flags for "fast upload" behaviour:
 *   - isLowEnd  : small screen OR low DPR OR slow network -> use cache-first
 *   - networkType : '4g' | '3g' | '2g' | 'slow-2g' | 'unknown'
 *   - isAndroid / isIOS : for native-like sizing tweaks
 *   - orientation : 'portrait' | 'landscape'
 */

// ------------------------------------------------------------
// Synchronous initial guess (avoids one-frame desktop flash
// on slow Android cold start). Refined on mount in useEffect.
// ------------------------------------------------------------
const getInitialDeviceInfo = () => {
  if (typeof window === 'undefined') {
    return {
      type: 'desktop',
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isSmallPhone: false,
      isAndroid: false,
      isIOS: false,
      isTouchDevice: false,
      isLowEnd: false,
      networkType: 'unknown',
      orientation: 'portrait',
      viewportWidth: 0,
      viewportHeight: 0,
      pixelRatio: 1,
      os: 'unknown',
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTabletUA = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);

  const isMobile = isMobileUA || width < 768;
  const isTablet = !isMobile && (isTabletUA || (width >= 768 && width < 1024));
  const isDesktop = !isMobile && !isTablet;

  let type = 'desktop';
  if (isMobile) type = 'mobile';
  else if (isTablet) type = 'tablet';

  return {
    type,
    isMobile,
    isTablet,
    isDesktop,
    isSmallPhone: width < 360,
    isAndroid: /android/i.test(ua),
    isIOS: /iPad|iPhone|iPod/i.test(ua),
    isTouchDevice: 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0,
    isLowEnd: false,
    networkType: 'unknown',
    orientation: width >= height ? 'landscape' : 'portrait',
    viewportWidth: width,
    viewportHeight: height,
    pixelRatio: window.devicePixelRatio || 1,
    os: 'unknown',
  };
};

export const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState(getInitialDeviceInfo);

  useEffect(() => {
    const detectDevice = () => {
      const ua = navigator.userAgent || '';
      const width = window.innerWidth;
      const height = window.innerHeight;
      const pixelRatio = window.devicePixelRatio || 1;

      // ---- OS detection ----
      let os = 'unknown';
      if (/android/i.test(ua)) os = 'android';
      else if (/iPad|iPhone|iPod/i.test(ua)) os = 'ios';
      else if (/Windows/i.test(ua)) os = 'windows';
      else if (/Macintosh/i.test(ua)) os = 'mac';
      else if (/Linux/i.test(ua)) os = 'linux';

      // ---- Form factor (viewport-first, UA as hint) ----
      const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const isTabletUA = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);

      const isMobile = isMobileUA || width < 768;
      const isTablet = !isMobile && (isTabletUA || (width >= 768 && width < 1024));
      const isDesktop = !isMobile && !isTablet;
      const isSmallPhone = width < 360;
      const isTouchDevice =
        'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;

      let type = 'desktop';
      if (isMobile) type = 'mobile';
      else if (isTablet) type = 'tablet';

      // ---- Network awareness (fast-upload lever) ----
      const conn =
        navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection;
      const networkType = conn?.effectiveType || 'unknown';
      const slowNet = ['slow-2g', '2g', '3g'].includes(networkType);

      // Low-end heuristic: small screen / low DPR / slow network
      const isLowEnd =
        (isMobile && (isSmallPhone || pixelRatio <= 1.5)) || slowNet;

      setDeviceInfo({
        type,
        isMobile,
        isTablet,
        isDesktop,
        isSmallPhone,
        isAndroid: /android/i.test(ua),
        isIOS: /iPad|iPhone|iPod/i.test(ua),
        isTouchDevice,
        isLowEnd,
        networkType,
        orientation: width >= height ? 'landscape' : 'portrait',
        viewportWidth: width,
        viewportHeight: height,
        pixelRatio,
        os,
      });
    };

    // Run once on mount
    detectDevice();

    // RAF-throttled handler for resize / orientation
    let rafId = null;
    const onResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(detectDevice);
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    // Network change listener (so isLowEnd flips when user walks into 4G)
    const conn =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;
    if (conn?.addEventListener) {
      conn.addEventListener('change', onResize);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (conn?.removeEventListener) {
        conn.removeEventListener('change', onResize);
      }
    };
  }, []);

  return deviceInfo;
};

/**
 * Responsive Tailwind class helper shared by dashboards.
 * All existing class keys are preserved exactly as before, plus:
 *   - textDensity : apply on the outer wrapper for low-end phones
 *   - hoverable   : hover-only affordance gate for touch devices
 */
export const useResponsiveClasses = (deviceInfo) => {
  return {
    cardPadding: deviceInfo.isMobile ? 'p-3' : 'p-5',
    headingSize: deviceInfo.isMobile ? 'text-base' : 'text-lg',
    textSize: deviceInfo.isMobile ? 'text-xs' : 'text-sm',
    buttonSize: deviceInfo.isMobile
      ? 'px-3 py-1.5 text-xs'
      : 'px-4 py-2 text-sm',
    gridGap: deviceInfo.isSmallPhone
      ? 'gap-1.5'
      : deviceInfo.isMobile
      ? 'gap-2'
      : 'gap-4',
    statsGrid: deviceInfo.isSmallPhone
      ? 'grid-cols-2'
      : deviceInfo.isMobile
      ? 'grid-cols-2'
      : 'grid-cols-2 md:grid-cols-4',
    quickActionsGrid: deviceInfo.isSmallPhone
      ? 'grid-cols-2'
      : deviceInfo.isMobile
      ? 'grid-cols-2'
      : 'grid-cols-2 md:grid-cols-4',

    // --- NEW (optional usage, backward-compatible) ---
    textDensity: deviceInfo.isLowEnd ? 'text-[13px] leading-tight' : '',
    hoverable: deviceInfo.isTouchDevice ? '' : 'hover:shadow-md',
  };
};

export default useDeviceDetection;