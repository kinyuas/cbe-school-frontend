// src/hooks/useOnlineStatus.js
import { useState, useEffect } from 'react';

export default function useOnlineStatus() {
  // Seed from browser API so the first paint is correct
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    let listenerHandle = null;
    let usingBrowserEvents = false;

    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const checkStatus = async () => {
      try {
        const { Network } = await import('@capacitor/network');
        const status = await Network.getStatus();
        setIsOnline(status.connected);
      } catch {
        // Fallback to browser API
        setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
      }
    };

    // Foreground re-check (works in browser + native WebView).
    // Replaces @capacitor/app's appStateChange listener.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkStatus();
    };

    const init = async () => {
      await checkStatus();

      // Try the native Capacitor network listener first
      try {
        const { Network } = await import('@capacitor/network');
        listenerHandle = await Network.addListener('networkStatusChange', (status) => {
          setIsOnline(status.connected);
        });
      } catch {
        // Fallback: browser events
        usingBrowserEvents = true;
        window.addEventListener('online',  handleOnline);
        window.addEventListener('offline', handleOffline);
      }

      document.addEventListener('visibilitychange', handleVisibility);
    };

    init();

    return () => {
      if (listenerHandle && typeof listenerHandle.remove === 'function') {
        listenerHandle.remove();
      }
      if (usingBrowserEvents) {
        window.removeEventListener('online',  handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return isOnline;
}