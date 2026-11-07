// src/pages/parent/components/OverviewTab.jsx
import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
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

// Keep only upcoming, sorted ascending by nearest date first
const upcomingSorted = (arr, dateField) =>
  (arr || [])
    .filter((x) => isUpcoming(x[dateField]))
    .sort((a, b) => new Date(a[dateField]) - new Date(b[dateField]));

// Newest-first (for scholarships uploaded by super admin)
const newestSorted = (arr, dateField = 'createdAt') =>
  (arr || []).sort(
    (a, b) => new Date(b[dateField] || b.createdAt) - new Date(a[dateField] || a.createdAt)
  );

// ----------------------------------------------------------------
// Last-seen key (per pupil) for the notification banner
// ----------------------------------------------------------------
const LAST_SEEN_KEY = (pupilId) => `parent_msg_lastseen_${pupilId}`;

// ----------------------------------------------------------------
// OverviewTab
// ----------------------------------------------------------------
const OverviewTab = ({ pupil, onNavigate, onReadMessages }) => {
  const [summary, setSummary] = useState(null);
  const [exams, setExams] = useState([]);
  const [schoolEvents, setSchoolEvents] = useState([]);
  const [globalItems, setGlobalItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Notification banner state
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestTeacherMsg, setLatestTeacherMsg] = useState(null);

  // ----------------------------------------------------------------
  // Read / write last-seen pointer (per pupil, persisted in localStorage)
  // ----------------------------------------------------------------
  const getLastSeen = () => {
    try {
      return parseInt(localStorage.getItem(LAST_SEEN_KEY(pupil._id)) || '0', 10) || 0;
    } catch {
      return 0;
    }
  };

  const persistLastSeen = (count) => {
    try {
      localStorage.setItem(LAST_SEEN_KEY(pupil._id), String(count));
    } catch { /* ignore */ }
  };

  // ----------------------------------------------------------------
  // Load content + poll messages for unread banner
  // ----------------------------------------------------------------
  useEffect(() => {
    let alive = true;

    const fetchContent = async () => {
      try {
        setLoading(true);
        const [summaryRes, examsRes, eventsRes, globalRes] = await Promise.all([
          api.get(`/parent/summary/${pupil._id}`).catch(() => ({ data: {} })),
          api.get('/exams').catch(() => ({ data: { data: [] } })),
          // 👇 UPDATED: Fetch ONLY parent-targeted announcements/events
          api.get('/events?audience=parents').catch(() => ({ data: { data: [] } })),
          api.get('/public/scholarships-events').catch(() => ({ data: { data: [] } })),
        ]);

        if (!alive) return;

        setSummary(summaryRes.data?.data || null);

        const examsData =
          examsRes.data?.data ||
          (Array.isArray(examsRes.data) ? examsRes.data : []);
        setExams(examsData);

        const eventsData =
          eventsRes.data?.data ||
          (Array.isArray(eventsRes.data) ? eventsRes.data : []);
        setSchoolEvents(eventsData);

        const globalData =
          globalRes.data?.data ||
          (Array.isArray(globalRes.data) ? globalRes.data : []);
        setGlobalItems(globalData);
      } catch (e) {
        console.error('Overview fetch error:', e);
      } finally {
        if (alive) setLoading(false);
      }
    };

    const fetchMessages = async () => {
      try {
        const res = await api
          .get(`/parent/messages/${pupil._id}`)
          .catch(() => ({ data: { data: [] } }));
        if (!alive) return;

        const msgs = res.data?.data || [];
        const teacherMsgs = msgs
          .filter((m) => m.senderRole !== 'parent')
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const lastSeen = getLastSeen();
        const unread =
          lastSeen === Number.MAX_SAFE_INTEGER
            ? 0
            : Math.max(0, teacherMsgs.length - lastSeen);

        setUnreadCount(unread);
        setLatestTeacherMsg(unread > 0 ? teacherMsgs[0] : null);
      } catch { /* silent */ }
    };

    fetchContent();
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [pupil._id]);

  // ----------------------------------------------------------------
  // Banner click → mark read + deep-link to Messages sub-tab
  // ----------------------------------------------------------------
  const handleOpenMessages = () => {
    persistLastSeen(Number.MAX_SAFE_INTEGER);
    setUnreadCount(0);
    setLatestTeacherMsg(null);
    onReadMessages?.();
    onNavigate?.('communication', { subTab: 'messages' });
  };

  // ----------------------------------------------------------------
  // Loading / empty states
  // ----------------------------------------------------------------
  if (loading) {
    return <div className="text-center py-12 text-gray-500 text-sm">Loading snapshot…</div>;
  }
  if (!summary) {
    return (
      <div className="bg-white rounded-xl shadow p-6 text-sm text-gray-500">
        No data available yet.
      </div>
    );
  }

  // -------- Summary Cards --------
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
      key: 'skills',
      title: 'Skills & Talents',
      value: `${summary.skillCount || 0} recorded`,
      sub: summary.latestSkill
        ? `Latest: ${summary.latestSkill.skill} (${summary.latestSkill.proficiency})`
        : 'Nothing recorded yet',
      color: 'from-purple-500 to-pink-500',
      icon: FiAward,
    },
    // 👇 REMOVED: 'attendance' card
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

  // -------- Upcoming content (max 3 per source) --------
  const upcomingExams = upcomingSorted(exams, 'startDateTime').slice(0, 3);
  const upcomingEvents = upcomingSorted(schoolEvents, 'date').slice(0, 3);
  const recentGlobal = newestSorted(globalItems).slice(0, 3);

  return (
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* NEW MESSAGE NOTIFICATION BANNER                              */}
      {/* ============================================================ */}
      {unreadCount > 0 && (
        <button
          onClick={handleOpenMessages}
          className="w-full text-left bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full flex-shrink-0">
              <FiMessageSquare className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">
                {unreadCount} new message{unreadCount > 1 ? 's' : ''} from class teacher
              </p>
              {latestTeacherMsg && (
                <p className="text-xs opacity-90 line-clamp-1 mt-0.5">
                  <span className="font-semibold">
                    {latestTeacherMsg.senderName || 'Teacher'}:
                  </span>{' '}
                  {latestTeacherMsg.body}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold bg-white/20 px-3 py-1.5 rounded-full flex-shrink-0">
              View <FiChevronRight className="w-3 h-3" />
            </div>
          </div>
        </button>
      )}

      {/* Hero */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-5 text-white">
        <h2 className="text-lg font-bold">{pupil.name}</h2>
        <p className="text-sm opacity-90">
          {pupil.class}{pupil.stream ? ` / ${pupil.stream}` : ''} • Adm {pupil.admNo}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              onClick={() => onNavigate?.(c.key)}
              className={`bg-gradient-to-br ${c.color} rounded-xl p-4 text-left text-white shadow hover:shadow-lg transition-all`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <Icon className="w-5 h-5 mb-2 opacity-90" />
                  <p className="text-xs uppercase opacity-90">{c.title}</p>
                  <p className="text-2xl font-bold mt-1">{c.value}</p>
                  <p className="text-xs opacity-80 mt-1">{c.sub}</p>
                </div>
                <FiChevronRight className="w-5 h-5 opacity-70" />
              </div>
            </button>
          );
        })}
      </div>

      {/* ============================================================= */}
      {/* UPDATES SECTION — Upcoming Exams / School Events / Scholarships */}
      {/* ============================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* ---- Upcoming Exams ---- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <FiBookOpen className="text-blue-600" /> Upcoming Exams
            </h3>
            {upcomingExams.length > 0 && (
              <button
                onClick={() => onNavigate?.('communication', { subTab: 'announcements' })}
                className="text-[11px] text-blue-600 font-semibold hover:underline"
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
                  <p className="text-[11px] text-gray-500 flex items-center gap-1">
                    <FiClock className="w-3 h-3" />
                    {formatDate(ex.startDateTime)}
                    {ex.endDateTime && (
                      <> → {formatDate(ex.endDateTime)}</>
                    )}
                  </p>
                  {ex.term && (
                    <p className="text-[11px] text-gray-400">
                      {ex.term} • {ex.year}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ---- School Events (Parent Target) ---- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <FiCalendar className="text-purple-600" /> School Events
            </h3>
            {upcomingEvents.length > 0 && (
              <button
                onClick={() => onNavigate?.('communication', { subTab: 'announcements' })}
                className="text-[11px] text-purple-600 font-semibold hover:underline"
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
                  <p className="text-[11px] text-gray-500 flex items-center gap-1">
                    <FiCalendar className="w-3 h-3" /> {formatDate(ev.date)}
                    {ev.venue && (
                      <>
                        <FiMapPin className="w-3 h-3 ml-1" /> {ev.venue}
                      </>
                    )}
                  </p>
                  {ev.description && (
                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{ev.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ---- Scholarships & National Events ---- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <FiAward className="text-yellow-500" /> Scholarships & National Events
            </h3>
          </div>
          {recentGlobal.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No opportunities published yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentGlobal.map((g) => (
                <li key={g._id} className="border-l-2 border-yellow-400 pl-2">
                  <div className="flex items-start gap-1">
                    <p className="text-sm font-semibold text-gray-800 line-clamp-1 flex-1">
                      {g.title}
                    </p>
                    {g.isFeatured && <FiStar className="w-3 h-3 text-yellow-500 flex-shrink-0 mt-1" />}
                  </div>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1">
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
                      className="text-[11px] text-indigo-600 font-semibold inline-flex items-center gap-1 hover:underline mt-0.5"
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

      {/* 👇 REMOVED: Recent School Notices section */}
    </div>
  );
};

export default OverviewTab;