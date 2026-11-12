// src/components/common/NotificationBell.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCheck, FiX } from 'react-icons/fi';
import useNotifications from '../../hooks/useNotifications';

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { unread, items, loading, fetchList, markRead, markAllRead } = useNotifications();

  useEffect(() => {
    if (open) fetchList(30);
  }, [open, fetchList]);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // 🔑 Order matters: close synchronously → optimistic mark-read → navigate
  const goTo = (n) => {
    setOpen(false);                     // close immediately — always
    if (!n.read) markRead(n._id);        // fire-and-forget
    if (n.link) navigate(n.link);        // navigate last
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-gray-100"
        aria-label="Notifications"
      >
        <FiBell className="w-5 h-5 text-gray-700" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl z-50">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-2 flex justify-between items-center">
            <span className="text-sm font-bold text-gray-800">Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                  <FiCheck className="w-3 h-3" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                <FiX className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {loading && <p className="text-xs text-gray-500 text-center py-6">Loading…</p>}
          {!loading && items.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-6">No notifications yet.</p>
          )}

          {!loading && items.map((n) => (
            <button
              key={n._id}
              onClick={() => goTo(n)}
              className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${n.read ? 'opacity-70' : ''}`}
            >
              <div className="flex justify-between items-start gap-2">
                <p className="text-sm font-semibold text-gray-800 line-clamp-1">{n.title}</p>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
              </div>
              {n.body && <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.body}</p>}
              {!n.read && <span className="inline-block mt-1 w-2 h-2 rounded-full bg-red-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;