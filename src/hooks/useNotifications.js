// src/hooks/useNotifications.js
import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../services/api';

const POLL_MS = 60000; // 60 s (was 30 s — reduces log spam)

export default function useNotifications({ enabled = true } = {}) {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const fetchCount = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await api.get('/notifications/count', { timeout: 10000 });
      if (res.data?.success) setUnread(res.data.unread || 0);
    } catch (_) {}
  }, [enabled]);

  const fetchList = useCallback(async (limit = 50) => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await api.get(`/notifications?limit=${limit}`, { timeout: 15000 });
      if (res.data?.success) setItems(res.data.data || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, [enabled]);

  const markRead = useCallback(async (id) => {
    try {
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
      await api.patch(`/notifications/${id}/read`);
    } catch (_) {
      fetchCount();
    }
  }, [fetchCount]);

  const markAllRead = useCallback(async () => {
    try {
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
      await api.patch('/notifications/read-all');
    } catch (_) {
      fetchCount();
    }
  }, [fetchCount]);

  useEffect(() => {
    if (!enabled) return;
    fetchCount();
    timerRef.current = setInterval(fetchCount, POLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, fetchCount]);

  return { unread, items, loading, fetchCount, fetchList, markRead, markAllRead };
}