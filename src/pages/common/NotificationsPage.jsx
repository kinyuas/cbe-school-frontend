// src/pages/common/NotificationsPage.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiBell, FiCheck, FiCheckCircle } from 'react-icons/fi';
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

const TYPE_ICONS = {
  message: '💬',
  event: '📅',
  exam: '📝',
  skill_approval: '⭐',
  mark_uploaded: '📊',
  fee_schedule: '💰',
  assignment: '📚',
  resource: '🎥',
  payment: '✅',
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { items, loading, fetchList, markRead, markAllRead } = useNotifications();

  useEffect(() => {
    fetchList(100);
  }, [fetchList]);

  const handleClick = async (n) => {
    if (!n.read) await markRead(n._id);
    if (n.link) navigate(n.link);
  };

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 p-2"
          >
            <FiArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FiBell className="text-indigo-600" /> Notifications
          </h1>
          <button
            onClick={markAllRead}
            className="text-xs text-indigo-600 hover:underline flex items-center gap-1 p-2"
          >
            <FiCheck className="w-3 h-3" /> Mark all read
          </button>
        </div>

        {loading && (
          <div className="text-center py-10 text-gray-500">Loading notifications...</div>
        )}

        {!loading && items.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
            <FiCheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">You're all caught up</p>
            <p className="text-xs text-gray-500 mt-1">No notifications right now.</p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
            {items.map((n) => (
              <button
                key={n._id}
                onClick={() => handleClick(n)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                  n.read ? 'opacity-70' : ''
                }`}
              >
                <span className="text-xl flex-shrink-0 mt-0.5">
                  {TYPE_ICONS[n.type] || '🔔'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm font-semibold text-gray-800 line-clamp-2">{n.title}</p>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  {n.body && (
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.body}</p>
                  )}
                  {!n.read && (
                    <span className="inline-block mt-1 w-2 h-2 rounded-full bg-red-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}