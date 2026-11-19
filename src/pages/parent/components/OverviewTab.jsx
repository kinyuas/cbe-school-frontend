// src/pages/parent/components/OverviewTab.jsx
import React, { useEffect, useMemo } from 'react';
import api from '../../../services/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FiBookOpen, FiAward, FiCalendar, FiDollarSign, FiMessageSquare,
  FiChevronRight, FiTrendingUp, FiExternalLink, FiGlobe,
  FiMapPin, FiStar, FiClock
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

const LAST_SEEN_KEY = (pupilId) => `parent_msg_lastseen_${pupilId}`;

// ----------------------------------------------------------------
// OverviewTab
// ----------------------------------------------------------------
const OverviewTab = ({ pupil, onNavigate, onReadMessages }) => {
  const queryClient = useQueryClient();

  // -------- Content query (cached 2 min) --------
  const { data: content, isLoading } = useQuery({
    queryKey: ['parent', 'overview', pupil._id],
    queryFn: async () => {
      const [summaryRes, examsRes, eventsRes, globalRes] = await Promise.all([
        api.get(`/parent/summary/${pupil._id}`).catch(() => ({ data: {} })),
        api.get('/exams').catch(() => ({ data: { data: [] } })),
        api.get('/events?audience=parents').catch(() => ({ data: { data: [] } })),
        api.get('/public/scholarships-events').catch(() => ({ data: { data: [] } })),
      ]);
      return {
        summary: summaryRes.data?.data || null,
        exams: examsRes.data?.data || (Array.isArray(examsRes.data) ? examsRes.data : []),
        events: eventsRes.data?.data || (Array.isArray(eventsRes.data) ? eventsRes.data : []),
        global: globalRes.data?.data || (Array.isArray(globalRes.data) ? globalRes.data : []),
      };
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev, 
  });

  // -------- Messages query (poll 5s) --------
  const { data: msgData } = useQuery({
    queryKey: ['parent', 'messages', pupil._id],
    queryFn: async () => {
      const res = await api.get(`/parent/messages/${pupil._id}`).catch(() => ({ data: { data: [] } }));
      return res.data?.data || [];
    },
    refetchInterval: 5000,
    staleTime: 0,
    placeholderData: (prev) => prev, 
  });

  // -------- Derived unread --------
  const { unreadCount, latestTeacherMsg } = useMemo(() => {
    const msgs = msgData || [];
    const teacherMsgs = msgs
      .filter((m) => m.senderRole !== 'parent')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    let lastSeen = 0;
    try {
      lastSeen = parseInt(localStorage.getItem(LAST_SEEN_KEY(pupil._id)) || '0', 10) || 0;
    } catch { lastSeen = 0; }
    const unread = lastSeen === Number.MAX_SAFE_INTEGER
      ? 0
      : Math.max(0, teacherMsgs.length - lastSeen);
    return {
      unreadCount: unread,
      latestTeacherMsg: unread > 0 ? teacherMsgs[0] : null,
    };
  }, [msgData, pupil._id]);

  const handleOpenMessages = () => {
    try { localStorage.setItem(LAST_SEEN_KEY(pupil._id), String(Number.MAX_SAFE_INTEGER)); } catch { /* ignore */ }
    queryClient.invalidateQueries({ queryKey: ['parent', 'unreadMessages', pupil._id] });
    onReadMessages?.();
    onNavigate?.('communication', { subTab: 'messages' });
  };

  // -------- Loading / empty --------
  if (isLoading) {
    return <div className="text-center py-12 text-gray-500 text-sm">Loading snapshot…</div>;
  }
  const summary = content?.summary;
  if (!summary) {
    return (
      <div className="bg-white rounded-xl shadow p-6 text-sm text-gray-500">
        No data available yet.
      </div>
    );
  }

  const exams = content?.exams || [];
  const events = content?.events || [];
  const globalItems = content?.global || [];

  // -------- Summary cards --------
  const cards = [
    {
      key: 'results',
      title: 'Latest Result',
      value: summary.latestExam ? `${summary.latestExam.average}%` : 'No exam yet',
      sub: summary.latestExam?.examName || 'Awaiting first assessment',
      color: 'from-blue-500 to-indigo-500',
      icon: FiBookOpen,
    },
    {
      key: 'results', // Skills now live under Results & Skills tab
      title: 'Skills & Talents',
      value: `${summary.skillCount || 0} recorded`,
      sub: summary.latestSkill
        ? `Latest: ${summary.latestSkill.skill} (${summary.latestSkill.proficiency})`
        : 'Nothing recorded yet',
      color: 'from-purple-500 to-pink-500',
      icon: FiAward,
    },
    {
      key: 'fees',
      title: 'Fee Balance',
      value: summary.feeBalance != null
        ? `KSh ${Number(summary.feeBalance).toLocaleString()}`
        : '—',
      sub: summary.feeBalance > 0
        ? 'Outstanding balance'
        : summary.feeBalance < 0
          ? 'Overpayment (Credit)'
          : 'Fully cleared',
      color: summary.feeBalance > 0
        ? 'from-red-500 to-orange-500'
        : 'from-green-500 to-emerald-500',
      icon: FiDollarSign,
    },
    {
      key: 'fees',
      title: 'Next Term Fee',
      value: summary.nextTermFee > 0
        ? `KSh ${Number(summary.nextTermFee).toLocaleString()}`
        : 'KSh 0',
      sub: summary.nextTermFee > 0
        ? 'Expected fee for the upcoming term'
        : 'Not updated by Bursar yet',
      color: 'from-cyan-500 to-blue-500',
      icon: FiTrendingUp,
    },
  ];

  const upcomingExams = upcomingSorted(exams, 'startDateTime').slice(0, 3);
  const upcomingEvents = upcomingSorted(events, 'date').slice(0, 3);
  const recentGlobal = newestSorted(globalItems).slice(0, 3);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* New message banner */}
      {unreadCount > 0 && (
        <button
          onClick={handleOpenMessages}
          className="w-full text-left bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl p-3 sm:p-4 shadow-md hover:shadow-lg active:shadow-sm transition-all touch-manipulation"
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="bg-white/20 p-2 rounded-full flex-shrink-0">
              <FiMessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-xs sm:text-sm">
                {unreadCount} new message{unreadCount > 1 ? 's' : ''} from class teacher
              </p>
              {latestTeacherMsg && (
                <p className="text-[11px] sm:text-xs opacity-90 line-clamp-1 mt-0.5">
                  <span className="font-semibold">
                    {latestTeacherMsg.senderName || 'Teacher'}:
                  </span>{' '}
                  {latestTeacherMsg.body}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold bg-white/20 px-2 sm:px-3 py-1.5 rounded-full flex-shrink-0">
              View <FiChevronRight className="w-3 h-3" />
            </div>
          </div>
        </button>
      )}

      {/* Hero */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 sm:p-5 text-white">
        <h2 className="text-base sm:text-lg font-bold truncate">{pupil.name}</h2>
        <p className="text-xs sm:text-sm opacity-90">
          {pupil.class}{pupil.stream ? ` / ${pupil.stream}` : ''} • Adm {pupil.admNo}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {cards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <button
              key={idx}
              onClick={() => onNavigate?.(c.key)}
              className={`bg-gradient-to-br ${c.color} rounded-xl p-3.5 sm:p-4 text-left text-white shadow hover:shadow-lg active:shadow-sm transition-all touch-manipulation min-h-[100px]`}
            >
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <Icon className="w-5 h-5 mb-1.5 opacity-90" />
                  <p className="text-[10px] sm:text-xs uppercase opacity-90">{c.title}</p>
                  <p className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1 truncate">{c.value}</p>
                  <p className="text-[10px] sm:text-xs opacity-80 mt-0.5 sm:mt-1 line-clamp-1">{c.sub}</p>
                </div>
                <FiChevronRight className="w-5 h-5 opacity-70 flex-shrink-0" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Updates grid — single column on mobile, 3 on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Upcoming Exams */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h3 className="font-bold text-gray-800 text-xs sm:text-sm flex items-center gap-2">
              <FiBookOpen className="text-blue-600" /> Upcoming Exams
            </h3>
            {upcomingExams.length > 0 && (
              <button
                onClick={() => onNavigate?.('communication', { subTab: 'announcements' })}
                className="text-[10px] sm:text-[11px] text-blue-600 font-semibold hover:underline touch-manipulation px-1 py-1"
              >
                View all
              </button>
            )}
          </div>
          {upcomingExams.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No scheduled exams.</p>
          ) : (
            <ul className="space-y-2">
              {upcomingExams.map((ex) => (
                <li key={ex._id} className="border-l-2 border-blue-400 pl-2">
                  <p className="text-sm font-semibold text-gray-800 line-clamp-1">{ex.title}</p>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1 flex-wrap">
                    <FiClock className="w-3 h-3" />
                    {formatDate(ex.startDateTime)}
                    {ex.endDateTime && <> → {formatDate(ex.endDateTime)}</>}
                  </p>
                  {ex.term && (
                    <p className="text-[11px] text-gray-400">{ex.term} • {ex.year}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* School Events */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h3 className="font-bold text-gray-800 text-xs sm:text-sm flex items-center gap-2">
              <FiCalendar className="text-purple-600" /> School Events
            </h3>
            {upcomingEvents.length > 0 && (
              <button
                onClick={() => onNavigate?.('communication', { subTab: 'announcements' })}
                className="text-[10px] sm:text-[11px] text-purple-600 font-semibold hover:underline touch-manipulation px-1 py-1"
              >
                View all
              </button>
            )}
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No upcoming events.</p>
          ) : (
            <ul className="space-y-2">
              {upcomingEvents.map((ev) => (
                <li key={ev._id} className="border-l-2 border-purple-400 pl-2">
                  <p className="text-sm font-semibold text-gray-800 line-clamp-1">{ev.title}</p>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1 flex-wrap">
                    <FiCalendar className="w-3 h-3" /> {formatDate(ev.date)}
                    {ev.venue && <><FiMapPin className="w-3 h-3 ml-1" /> {ev.venue}</>}
                  </p>
                  {ev.description && (
                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{ev.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Scholarships */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
          <h3 className="font-bold text-gray-800 text-xs sm:text-sm flex items-center gap-2 mb-2 sm:mb-3">
            <FiAward className="text-yellow-500" /> Scholarships & National Events
          </h3>
          {recentGlobal.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No opportunities published yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentGlobal.map((g) => (
                <li key={g._id} className="border-l-2 border-yellow-400 pl-2">
                  <div className="flex items-start gap-1">
                    <p className="text-sm font-semibold text-gray-800 line-clamp-1 flex-1">{g.title}</p>
                    {g.isFeatured && <FiStar className="w-3 h-3 text-yellow-500 flex-shrink-0 mt-1" />}
                  </div>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1 flex-wrap">
                    {g.scope === 'kenya'
                      ? <><FiMapPin className="w-3 h-3" /> Kenya</>
                      : <><FiGlobe className="w-3 h-3" /> International</>}
                    {g.deadline && <> • Deadline {formatDate(g.deadline)}</>}
                    {g.eventDate && <> • {formatDate(g.eventDate)}</>}
                  </p>
                  {g.linkUrl && (
                    <a
                      href={g.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-indigo-600 font-semibold inline-flex items-center gap-1 hover:underline mt-0.5 touch-manipulation"
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
    </div>
  );
};

export default OverviewTab;