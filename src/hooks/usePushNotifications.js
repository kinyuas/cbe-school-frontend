// src/hooks/usePushNotifications.js
import { useEffect, useRef } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import api from '../services/api';

/**
 * Register FCM push token + attach listeners.
 * Takes `user` from the caller (AuthProvider) — DO NOT call useAuth() here,
 * because AuthProvider hasn't provided the context yet at that point.
 *
 * @param {Object|null} user         Logged-in user object { role, schoolCode, ... }
 * @param {Function}    onNavigate   Optional callback(link) to handle notification taps
 */
export default function usePushNotifications({ user = null, onNavigate = null } = {}) {
  const tokenRef = useRef(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;   // web — skip
    if (!user) return;                            // not logged in

    let cancelled = false;
    let listeners = [];

    const init = async () => {
      try {
        // 1. Request permission (Android 13+ shows an OS dialog)
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive !== 'granted') {
          perm = await PushNotifications.requestPermissions();
        }
        if (perm.receive !== 'granted') {
          console.warn('🔕 Push permission denied by user');
          return;
        }

        // 2. Create the notification channel (Android 8+)
        if (Capacitor.getPlatform() === 'android') {
          await PushNotifications.createChannel({
            id: 'cbe_default',
            name: 'CBE Notifications',
            description: 'Alerts for messages, exams, events, marks and fees',
            importance: 5,
            visibility: 1,
            sound: 'default',
            vibration: true,
            lights: true,
            lightColor: '#4F46E5',
          });
        }

        if (cancelled) return;

        // 3. Register with FCM — token comes back in the 'registration' event
        await PushNotifications.register();
      } catch (e) {
        console.warn('⚠️ usePushNotifications init error:', e?.message || e);
      }
    };

    const onRegistration = async (token) => {
      tokenRef.current = token.value;
      // Persist so AuthContext.logout() can unregister later
      try { localStorage.setItem('fcmToken', token.value); } catch (_) {}

      try {
        await api.post('/notifications/register-device', {
          token: token.value,
          platform: Capacitor.getPlatform(),
          deviceInfo: navigator.userAgent.slice(0, 150),
        });
        console.log('✅ Device token registered with backend for', user?.role);
      } catch (e) {
        console.warn('⚠️ Failed to register device token:', e.message);
      }
    };

    const onRegistrationError = (err) => {
      console.error('❌ FCM registration error:', err);
    };

    const onPushReceived = (notification) => {
      // Foreground push — banner won't show, but log it
      console.log('🔔 Push received (foreground):', notification);
    };

    const onPushActionPerformed = (action) => {
      // User tapped a notification (either from tray or lock screen)
      const link = action?.notification?.data?.link;
      if (link && onNavigate) onNavigate(link);
    };

    PushNotifications.addListener('registration', onRegistration).then(l => listeners.push(l));
    PushNotifications.addListener('registrationError', onRegistrationError).then(l => listeners.push(l));
    PushNotifications.addListener('pushNotificationReceived', onPushReceived).then(l => listeners.push(l));
    PushNotifications.addListener('pushNotificationActionPerformed', onPushActionPerformed).then(l => listeners.push(l));

    init();

    return () => {
      cancelled = true;
      // Remove only the listeners this hook added (not "all" — safe for React Strict Mode)
      listeners.forEach((l) => {
        try { l.remove(); } catch (_) {}
      });
    };
  }, [user, onNavigate]);
}