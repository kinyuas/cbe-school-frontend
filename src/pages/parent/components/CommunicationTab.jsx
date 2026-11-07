// src/pages/parent/components/CommunicationTab.jsx
import React, { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import {
  FiMessageSquare, FiBell, FiSend, FiCalendar, FiBookOpen,
  FiAward, FiExternalLink, FiGlobe, FiMapPin, FiClock, FiStar,
  FiInbox, FiUsers
} from 'react-icons/fi';

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
const formatDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-KE', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return ''; }
};

const isUpcoming = (dateVal) => {
  if (!dateVal) return false;
  return new Date(dateVal).getTime() >= Date.now() - 24 * 60 * 60 * 1000;
};

const upcomingSorted = (arr, dateField) =>
  (arr || [])
    .filter((x) => isUpcoming(x[dateField]))
    .sort((a, b) => new Date(a[dateField]) - new Date(b[dateField]));

const newestSorted = (arr, dateField = 'createdAt') =>
  (arr || []).sort(
    (a, b) => new Date(b[dateField] || b.createdAt) - new Date(a[dateField] || a.createdAt)
  );

// ----------------------------------------------------------------
// CommunicationTab
// ----------------------------------------------------------------
const CommunicationTab = ({ pupil, initialSubTab = 'announcements', onReadMessages }) => {
  // Sub-tab: 'announcements' | 'messages'
  const [subTab, setSubTab] = useState(initialSubTab);

  const [notices, setNotices] = useState([]);
  const [messages, setMessages] = useState([]);
  const [exams, setExams] = useState([]);
  const [schoolEvents, setSchoolEvents] = useState([]);
  const [globalItems, setGlobalItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const lastSeenCountRef = useRef(0);

  // ----------------------------------------------------------------
  // Data loader
  // ----------------------------------------------------------------
  const loadMessages = async () => {
    try {
      const [nRes, mRes, exRes, evRes, gRes] = await Promise.all([
        api.get('/events?audience=parents').catch(() => ({ data: { data: [] } })),
        api.get(`/parent/messages/${pupil._id}`).catch(() => ({ data: { data: [] } })),
        api.get('/exams').catch(() => ({ data: { data: [] } })),
        api.get('/events?audience=parents').catch(() => ({ data: { data: [] } })),
        api.get('/public/scholarships-events').catch(() => ({ data: { data: [] } })),
      ]);

      const noticesArr = nRes.data?.data || (Array.isArray(nRes.data) ? nRes.data : []);
      setNotices(newestSorted(noticesArr));

      setMessages(mRes.data?.data || []);

      const exData = exRes.data?.data || (Array.isArray(exRes.data) ? exRes.data : []);
      setExams(exData);

      const evData = evRes.data?.data || (Array.isArray(evRes.data) ? evRes.data : []);
      setSchoolEvents(evData);

      const gData = gRes.data?.data || (Array.isArray(gRes.data) ? gRes.data : []);
      setGlobalItems(gData);
    } finally {
      setLoading(false);
    }
  };

  // Poll every 5s for new messages
  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [pupil._id]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (subTab === 'messages') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, subTab]);

  // 🆕 Sync last-seen count + Mark as Read on backend
  useEffect(() => {
    if (subTab !== 'messages' || messages.length === 0) return;
    
    const teacherMsgs = messages.filter((m) => m.senderRole !== 'parent');
    const unreadTeacherMsgs = teacherMsgs.filter((m) => !m.isRead);

    if (teacherMsgs.length !== lastSeenCountRef.current) {
      lastSeenCountRef.current = teacherMsgs.length;
      onReadMessages?.(teacherMsgs.length);
    }

    // 🆕 Mark as read via API so notifications clear globally
    if (unreadTeacherMsgs.length > 0) {
      api.put(`/parent/messages/${pupil._id}/mark-read`)
        .then(() => {
          // Silently update local state
          setMessages(prev => prev.map(m => 
            m.senderRole !== 'parent' ? { ...m, isRead: true } : m
          ));
        })
        .catch(err => console.warn('Failed to mark messages read:', err.message));
    }
  }, [messages, subTab, onReadMessages, pupil._id]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      await api.post(`/parent/messages/${pupil._id}`, { body: newMessage });
      toast.success('Message sent to class teacher!');
      setNewMessage('');
      loadMessages();
    } catch (err) {
      console.error('Send message error:', err);
      toast.error(err.response?.data?.message || 'Failed to send message');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-sm text-gray-500">Loading communications…</div>;
  }

  // -------- Derived lists (each capped at 3) --------
  const upcomingExams = upcomingSorted(exams, 'startDateTime').slice(0, 3);
  const upcomingEvents = upcomingSorted(schoolEvents, 'date').slice(0, 3);
  const recentGlobal = newestSorted(globalItems).slice(0, 3);
  const recentNotices = notices.slice(0, 3);

  const examCount = upcomingSorted(exams, 'startDateTime').length;
  const eventCount = upcomingSorted(schoolEvents, 'date').length;
  const globalCount = globalItems.length;
  const noticeCount = notices.length;
  const teacherMsgCount = messages.filter((m) => m.senderRole !== 'parent').length;

  return (
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* Sub-tab Navigation                                           */}
      {/* ============================================================ */}
      <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1 gap-1">
        <button
          onClick={() => setSubTab('announcements')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            subTab === 'announcements'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <FiBell className="w-4 h-4" />
          Announcements
          {(examCount + eventCount + globalCount) > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                subTab === 'announcements'
                  ? 'bg-white/20 text-white'
                  : 'bg-purple-100 text-purple-700'
              }`}
            >
              {examCount + eventCount + globalCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setSubTab('messages')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            subTab === 'messages'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <FiMessageSquare className="w-4 h-4" />
          Direct Messages
          {teacherMsgCount > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                subTab === 'messages'
                  ? 'bg-white/20 text-white'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {teacherMsgCount}
            </span>
          )}
        </button>
      </div>

      {/* ============================================================ */}
      {/* ANNOUNCEMENTS SUB-TAB                                        */}
      {/* ============================================================ */}
      {subTab === 'announcements' && (
        <div className="space-y-4">
          {noticeCount > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <FiUsers className="text-purple-600" /> Parent Announcements
                </h3>
                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                  {noticeCount} {noticeCount === 1 ? 'announcement' : 'announcements'}
                </span>
              </div>
              <ul className="space-y-3">
                {recentNotices.map((n) => (
                  <li key={n._id} className="border-l-4 border-purple-400 pl-3 py-1">
                    <p className="font-semibold text-sm text-gray-800">{n.title}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 flex-wrap mt-0.5">
                      <FiCalendar className="w-3 h-3" /> {formatDate(n.date)}
                      {n.venue && (
                        <>
                          <FiMapPin className="w-3 h-3 ml-2" /> {n.venue}
                        </>
                      )}
                    </p>
                    {n.description && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{n.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <FiBookOpen className="text-blue-600" /> Upcoming Exams
              </h3>
            </div>
            {upcomingExams.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No exams scheduled.</p>
            ) : (
              <ul className="space-y-2">
                {upcomingExams.map((ex) => (
                  <li key={ex._id} className="border-l-4 border-blue-400 pl-3 py-1">
                    <p className="text-sm font-semibold text-gray-800">{ex.title}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 flex-wrap">
                      <FiClock className="w-3 h-3" />
                      {formatDate(ex.startDateTime)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <FiCalendar className="text-purple-600" /> School Events
              </h3>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No upcoming events.</p>
            ) : (
              <ul className="space-y-2">
                {upcomingEvents.map((ev) => (
                  <li key={ev._id} className="border-l-4 border-purple-400 pl-3 py-1">
                    <p className="text-sm font-semibold text-gray-800">{ev.title}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 flex-wrap">
                      <FiCalendar className="w-3 h-3" /> {formatDate(ev.date)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <FiAward className="text-yellow-500" /> Scholarships & National Events
              </h3>
            </div>
            {recentGlobal.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No opportunities published yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentGlobal.map((g) => (
                  <li key={g._id} className="border-l-4 border-yellow-400 pl-3 py-1">
                    <div className="flex items-start gap-1">
                      <p className="text-sm font-semibold text-gray-800 flex-1">{g.title}</p>
                      {g.isFeatured && <FiStar className="w-3 h-3 text-yellow-500 flex-shrink-0 mt-1" />}
                    </div>
                    {g.linkUrl && (
                      <a
                        href={g.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 font-semibold inline-flex items-center gap-1 hover:underline mt-1"
                      >
                        {g.linkLabel || 'Learn More'} <FiExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DIRECT MESSAGES SUB-TAB                                      */}
      {/* ============================================================ */}
      {subTab === 'messages' && (
        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col"
          style={{ height: '600px' }}
        >
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2 shrink-0">
            <FiMessageSquare className="text-blue-600" /> Direct Message to Class Teacher
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <FiInbox className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500 italic">
                  No messages yet. Send one to start the conversation.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isParentMessage = m.senderRole === 'parent';
                return (
                  <div
                    key={m._id}
                    className={`flex ${isParentMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`p-3 rounded-lg max-w-[80%] ${
                        isParentMessage
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-gray-100 text-gray-800 rounded-tl-none'
                      }`}
                    >
                      <div
                        className={`flex justify-between text-[10px] mb-1 gap-4 ${
                          isParentMessage ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        <span className="font-bold">
                          {isParentMessage ? 'You' : m.senderName}
                        </span>
                        <span>
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm">{m.body}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2 shrink-0">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-bold"
            >
              <FiSend /> Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CommunicationTab;