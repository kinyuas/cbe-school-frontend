// src/pages/parent/components/CommunicationTab.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FiMessageSquare, FiBell, FiSend, FiCalendar, FiBookOpen,
  FiAward, FiExternalLink, FiGlobe, FiMapPin, FiClock, FiStar,
  FiInbox, FiUsers
} from 'react-icons/fi';

const formatDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return ''; }
};
const isUpcoming = (dateVal) => {
  if (!dateVal) return false;
  return new Date(dateVal).getTime() >= Date.now() - 24 * 60 * 60 * 1000;
};
const upcomingSorted = (arr, dateField) =>
  (arr || []).filter((x) => isUpcoming(x[dateField])).sort((a, b) => new Date(a[dateField]) - new Date(b[dateField]));
const newestSorted = (arr, dateField = 'createdAt') =>
  (arr || []).sort((a, b) => new Date(b[dateField] || b.createdAt) - new Date(a[dateField] || a.createdAt));

const CommunicationTab = ({ pupil, initialSubTab = 'announcements', onReadMessages }) => {
  const [subTab, setSubTab] = useState(initialSubTab);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const lastSeenCountRef = useRef(0);
  const queryClient = useQueryClient();

  // -------- Content query --------
  const { data: content, isLoading } = useQuery({
    queryKey: ['parent', 'communication', pupil._id],
    queryFn: async () => {
      const [nRes, exRes, evRes, gRes] = await Promise.all([
        api.get('/events?audience=parents').catch(() => ({ data: { data: [] } })),
        api.get('/exams').catch(() => ({ data: { data: [] } })),
        api.get('/events?audience=parents').catch(() => ({ data: { data: [] } })),
        api.get('/public/scholarships-events').catch(() => ({ data: { data: [] } })),
      ]);
      return {
        notices: newestSorted(nRes.data?.data || (Array.isArray(nRes.data) ? nRes.data : [])),
        exams: exRes.data?.data || (Array.isArray(exRes.data) ? exRes.data : []),
        schoolEvents: evRes.data?.data || (Array.isArray(evRes.data) ? evRes.data : []),
        globalItems: gRes.data?.data || (Array.isArray(gRes.data) ? gRes.data : []),
      };
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!pupil._id,
    placeholderData: (prev) => prev, 
  });

  // -------- Messages query (poll 5s) --------
  const { data: messages = [] } = useQuery({
    queryKey: ['parent', 'messages', pupil._id],
    queryFn: async () => {
      const res = await api.get(`/parent/messages/${pupil._id}`).catch(() => ({ data: { data: [] } }));
      return res.data?.data || [];
    },
    refetchInterval: 5000,
    staleTime: 0,
    enabled: !!pupil._id,
    placeholderData: (prev) => prev, 
  });

  // -------- Send message mutation --------
  const sendMutation = useMutation({
    mutationFn: async (body) => {
      await api.post(`/parent/messages/${pupil._id}`, { body });
    },
    onSuccess: () => {
      toast.success('Message sent to class teacher!');
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['parent', 'messages', pupil._id] });
      queryClient.invalidateQueries({ queryKey: ['parent', 'unreadMessages', pupil._id] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to send message');
    },
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMutation.mutate(newMessage);
  };

  // Auto-scroll
  useEffect(() => {
    if (subTab === 'messages') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, subTab]);

  // Mark read + sync badge
  useEffect(() => {
    if (subTab !== 'messages' || messages.length === 0) return;
    const teacherMsgs = messages.filter((m) => m.senderRole !== 'parent');
    const unreadTeacherMsgs = teacherMsgs.filter((m) => !m.isRead);
    if (teacherMsgs.length !== lastSeenCountRef.current) {
      lastSeenCountRef.current = teacherMsgs.length;
      onReadMessages?.(teacherMsgs.length);
    }
    if (unreadTeacherMsgs.length > 0) {
      api.put(`/parent/messages/${pupil._id}/mark-read`)
        .then(() => {
          queryClient.setQueryData(['parent', 'messages', pupil._id], (old) =>
            (old || []).map(m => m.senderRole !== 'parent' ? { ...m, isRead: true } : m)
          );
          queryClient.invalidateQueries({ queryKey: ['parent', 'unreadMessages', pupil._id] });
        })
        .catch(err => console.warn('Failed to mark messages read:', err.message));
    }
  }, [messages, subTab, onReadMessages, pupil._id, queryClient]);

  // -------- Derived lists --------
  const notices = content?.notices || [];
  const exams = content?.exams || [];
  const schoolEvents = content?.schoolEvents || [];
  const globalItems = content?.globalItems || [];

  const upcomingExams = useMemo(() => upcomingSorted(exams, 'startDateTime').slice(0, 3), [exams]);
  const upcomingEvents = useMemo(() => upcomingSorted(schoolEvents, 'date').slice(0, 3), [schoolEvents]);
  const recentGlobal = useMemo(() => newestSorted(globalItems).slice(0, 3), [globalItems]);
  const recentNotices = notices.slice(0, 3);

  const examCount = upcomingSorted(exams, 'startDateTime').length;
  const eventCount = upcomingSorted(schoolEvents, 'date').length;
  const globalCount = globalItems.length;
  const noticeCount = notices.length;
  const teacherMsgCount = messages.filter((m) => m.senderRole !== 'parent').length;

  if (isLoading) {
    return <div className="text-center py-12 text-sm text-gray-500">Loading communications…</div>;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Sub-tab nav */}
      <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1 gap-1">
        <button
          onClick={() => setSubTab('announcements')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all touch-manipulation min-h-[44px] ${
            subTab === 'announcements' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
          }`}
        >
          <FiBell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="truncate">Announcements</span>
          {(examCount + eventCount + globalCount) > 0 && (
            <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${
              subTab === 'announcements' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
            }`}>
              {examCount + eventCount + globalCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setSubTab('messages')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all touch-manipulation min-h-[44px] ${
            subTab === 'messages' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
          }`}
        >
          <FiMessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="truncate">Messages</span>
          {teacherMsgCount > 0 && (
            <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${
              subTab === 'messages' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
            }`}>
              {teacherMsgCount}
            </span>
          )}
        </button>
      </div>

      {/* Announcements */}
      {subTab === 'announcements' && (
        <div className="space-y-3 sm:space-y-4">
          {noticeCount > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <h3 className="text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-2">
                  <FiUsers className="text-purple-600" /> Parent Announcements
                </h3>
                <span className="text-[9px] sm:text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                  {noticeCount}
                </span>
              </div>
              <ul className="space-y-2 sm:space-y-3">
                {recentNotices.map((n) => (
                  <li key={n._id} className="border-l-4 border-purple-400 pl-2 sm:pl-3 py-1">
                    <p className="font-semibold text-xs sm:text-sm text-gray-800">{n.title}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1 flex-wrap mt-0.5">
                      <FiCalendar className="w-3 h-3" /> {formatDate(n.date)}
                      {n.venue && <><FiMapPin className="w-3 h-3 ml-2" /> {n.venue}</>}
                    </p>
                    {n.description && <p className="text-[10px] sm:text-xs text-gray-600 mt-1 line-clamp-2">{n.description}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-2 mb-2 sm:mb-3">
              <FiBookOpen className="text-blue-600" /> Upcoming Exams
            </h3>
            {upcomingExams.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No exams scheduled.</p>
            ) : (
              <ul className="space-y-2">
                {upcomingExams.map((ex) => (
                  <li key={ex._id} className="border-l-4 border-blue-400 pl-2 sm:pl-3 py-1">
                    <p className="text-xs sm:text-sm font-semibold text-gray-800">{ex.title}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1 flex-wrap">
                      <FiClock className="w-3 h-3" /> {formatDate(ex.startDateTime)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-2 mb-2 sm:mb-3">
              <FiCalendar className="text-purple-600" /> School Events
            </h3>
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No upcoming events.</p>
            ) : (
              <ul className="space-y-2">
                {upcomingEvents.map((ev) => (
                  <li key={ev._id} className="border-l-4 border-purple-400 pl-2 sm:pl-3 py-1">
                    <p className="text-xs sm:text-sm font-semibold text-gray-800">{ev.title}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1 flex-wrap">
                      <FiCalendar className="w-3 h-3" /> {formatDate(ev.date)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-2 mb-2 sm:mb-3">
              <FiAward className="text-yellow-500" /> Scholarships & National Events
            </h3>
            {recentGlobal.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No opportunities published yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentGlobal.map((g) => (
                  <li key={g._id} className="border-l-4 border-yellow-400 pl-2 sm:pl-3 py-1">
                    <div className="flex items-start gap-1">
                      <p className="text-xs sm:text-sm font-semibold text-gray-800 flex-1">{g.title}</p>
                      {g.isFeatured && <FiStar className="w-3 h-3 text-yellow-500 flex-shrink-0 mt-1" />}
                    </div>
                    {g.linkUrl && (
                      <a
                        href={g.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] sm:text-xs text-indigo-600 font-semibold inline-flex items-center gap-1 hover:underline mt-1 touch-manipulation"
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

      {/* Messages */}
      {subTab === 'messages' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 flex flex-col" style={{ height: 'calc(100dvh - 320px)', minHeight: '400px' }}>
          <h3 className="text-xs sm:text-sm font-bold text-gray-800 mb-2 sm:mb-3 flex items-center gap-2 shrink-0">
            <FiMessageSquare className="text-blue-600" /> Direct Message to Class Teacher
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 sm:space-y-3 mb-3 sm:mb-4 pr-1">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <FiInbox className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-xs sm:text-sm text-gray-500 italic">No messages yet. Send one to start the conversation.</p>
              </div>
            ) : (
              messages.map((m) => {
                const isParentMessage = m.senderRole === 'parent';
                return (
                  <div key={m._id} className={`flex ${isParentMessage ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-2.5 sm:p-3 rounded-lg max-w-[85%] sm:max-w-[80%] ${
                      isParentMessage ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'
                    }`}>
                      <div className={`flex justify-between text-[9px] sm:text-[10px] mb-1 gap-3 ${isParentMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                        <span className="font-bold">{isParentMessage ? 'You' : m.senderName}</span>
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs sm:text-sm break-words">{m.body}</p>
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
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation min-h-[44px]"
            />
            <button
              type="submit"
              disabled={sendMutation.isPending}
              className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 flex items-center gap-1.5 text-xs sm:text-sm font-bold touch-manipulation min-w-[44px] min-h-[44px] justify-center"
            >
              <FiSend className="w-4 h-4" /> <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CommunicationTab;