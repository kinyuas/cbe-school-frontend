// src/components/teacher/Announcements.jsx
import React, { useMemo } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDeviceDetection, useResponsiveClasses } from '../../hooks/useDeviceDetection';
import {
  FiCalendar, FiMapPin, FiRefreshCw, FiAlertCircle, FiBookOpen,
  FiAward, FiExternalLink, FiGlobe, FiClock, FiStar, FiInbox,
  FiUsers,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

/* ----------------------------------------------------------------
   Helpers (unchanged)
   ---------------------------------------------------------------- */
const formatDate = (d) => {
  if (!d) return 'Date TBA';
  try {
    return new Date(d).toLocaleDateString('en-KE', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return 'Date TBA'; }
};

const formatScholarshipDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-KE', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return ''; }
};

const newestSorted = (arr, dateField = 'createdAt') =>
  (arr || []).slice().sort(
    (a, b) => new Date(b[dateField] || b.createdAt) - new Date(a[dateField] || a.createdAt)
  );

const getExamStatus = (exam) => {
  const now = new Date();
  const start = new Date(exam.startDateTime);
  const end = new Date(exam.endDateTime);

  if (now < start) return { text: 'Upcoming', color: 'bg-blue-100 text-blue-700' };
  if (now >= start && now <= end) return { text: 'Ongoing', color: 'bg-green-100 text-green-700 animate-pulse' };
  return { text: 'Completed', color: 'bg-gray-100 text-gray-500' };
};

/* ----------------------------------------------------------------
   Fetchers
   ---------------------------------------------------------------- */
const parseList = (res) => {
  if (!res?.data) return [];
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data.data)) return res.data.data;
  return [];
};

const fetchTeacherEvents = async () => {
  const res = await api.get('/events?audience=teachers');
  return parseList(res);
};

const fetchExams = async () => {
  const res = await api.get('/exams');
  return parseList(res);
};

const fetchGlobalOpportunities = async () => {
  const res = await api.get('/public/scholarships-events');
  return parseList(res);
};

/* ----------------------------------------------------------------
   Component
   ---------------------------------------------------------------- */
const Announcements = () => {
  const deviceInfo = useDeviceDetection();
  const responsive = useResponsiveClasses(deviceInfo);
  const queryClient = useQueryClient();

  const { isLowEnd, networkType } = deviceInfo;
  const slowNet = isLowEnd && ['slow-2g', '2g'].includes(networkType);

  /* ---------- Queries ---------- */
  const {
    data: teacherEvents = [],
    isLoading: eventsLoading,
    isFetching: eventsFetching,
    isError: eventsError,
    error: eventsErrorObj,
  } = useQuery({
    queryKey: ['teacher', 'announcements-events'],
    queryFn: fetchTeacherEvents,
    staleTime: 60_000,
    enabled: !slowNet,
    placeholderData: (prev) => prev, 
  });

  const {
    data: exams = [],
    isLoading: examsLoading,
  } = useQuery({
    queryKey: ['teacher', 'announcements-exams'],
    queryFn: fetchExams,
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev, 
  });

  const {
    data: globalItems = [],
    isFetching: globalFetching,
    isError: globalError,
  } = useQuery({
    queryKey: ['public', 'scholarships-events'],
    queryFn: fetchGlobalOpportunities,
    staleTime: 5 * 60_000,
    enabled: !slowNet,
    placeholderData: (prev) => prev, 
  });

  const refreshing = eventsFetching || globalFetching;
  const loading = eventsLoading && examsLoading && !slowNet;
  const hasError = eventsError || globalError;
  const errorMsg = eventsErrorObj?.message || 'Failed to load data';

  /* ---------- Derived lists (unchanged shape) ---------- */
  // The teacher-events endpoint drives both notices and school-events sections
  const notices = useMemo(() => newestSorted(teacherEvents), [teacherEvents]);
  const schoolEvents = useMemo(() => teacherEvents, [teacherEvents]);

  const recentExams = useMemo(
    () => newestSorted(exams, 'startDateTime').slice(0, 3),
    [exams]
  );
  const recentEvents = useMemo(
    () => newestSorted(schoolEvents, 'date').slice(0, 3),
    [schoolEvents]
  );
  const recentGlobal = useMemo(
    () => newestSorted(globalItems).slice(0, 3),
    [globalItems]
  );
  const recentNotices = useMemo(() => notices.slice(0, 3), [notices]);

  const examCount = exams.length;
  const eventCount = schoolEvents.length;
  const globalCount = globalItems.length;
  const noticeCount = notices.length;

  const totalItems =
    recentExams.length + recentEvents.length + recentGlobal.length + recentNotices.length;

  /* ---------- Refresh ---------- */
  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['teacher', 'announcements-events'] }),
      queryClient.invalidateQueries({ queryKey: ['teacher', 'announcements-exams'] }),
      queryClient.invalidateQueries({ queryKey: ['public', 'scholarships-events'] }),
    ]);
    toast.success('Data refreshed');
  };

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['teacher', 'announcements-events'] });
    queryClient.invalidateQueries({ queryKey: ['public', 'scholarships-events'] });
  };

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <Layout title="Announcements" subtitle="Stay updated with school events and exams">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
          <p className="mt-4 text-gray-600">Loading announcements...</p>
        </div>
      </Layout>
    );
  }

  /* ---------- Render ---------- */
  return (
    <Layout title="Announcements" subtitle="Stay updated with school events and exams">
      <div className={responsive.textDensity}>

        {/* Header with Refresh */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Recent Updates</h2>
            <p className="text-sm text-gray-500">
              {totalItems} recent {totalItems === 1 ? 'item' : 'items'}
              {noticeCount > 0 && ` • ${noticeCount} teacher announcements`}
              {globalCount > 0 && ` • ${globalCount} scholarships/events`}
              {eventCount > 0 && ` • ${eventCount} events`}
              {examCount > 0 && ` • ${examCount} exams`}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 w-full md:w-auto"
          >
            <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Error Message */}
        {hasError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
            <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error loading data</p>
              <p className="text-sm text-red-600">{errorMsg}</p>
              <button onClick={handleRetry} className="mt-2 text-sm text-red-700 hover:text-red-900 font-medium">
                Try again
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">

          {/* 1. TEACHER ANNOUNCEMENTS */}
          {noticeCount > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 border-l-4 border-teal-500">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <FiUsers className="text-teal-600" /> Teacher Announcements
                </h3>
                <span className="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold">
                  {noticeCount} {noticeCount === 1 ? 'announcement' : 'announcements'}
                </span>
              </div>
              <ul className="space-y-3">
                {recentNotices.map((n) => (
                  <li key={n._id} className="border-l-4 border-teal-400 pl-3 py-1">
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
                    {n.organizer && (
                      <p className="text-[10px] text-gray-400 mt-1">Organizer: {n.organizer}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 2. SCHOLARSHIPS & NATIONAL EVENTS */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <FiAward className="text-yellow-500" /> Scholarships & National Events
              </h3>
              {globalCount > 0 && (
                <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">
                  {globalCount} available
                </span>
              )}
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
                    <p className="text-xs text-gray-500 flex items-center gap-1 flex-wrap mt-1">
                      {g.scope === 'kenya'
                        ? <><FiMapPin className="w-3 h-3" /> Kenya</>
                        : <><FiGlobe className="w-3 h-3" /> International</>}
                      {g.deadline && <> • Deadline {formatScholarshipDate(g.deadline)}</>}
                      {g.eventDate && <> • {formatScholarshipDate(g.eventDate)}</>}
                      {g.provider && <> • {g.provider}</>}
                    </p>
                    {g.description && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{g.description}</p>
                    )}
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

          {/* 3. RECENT EXAMS */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <FiBookOpen className="text-blue-600" /> Recent Exams
              </h3>
              {examCount > 0 && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                  {examCount} scheduled
                </span>
              )}
            </div>
            {recentExams.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No exams scheduled.</p>
            ) : (
              <ul className="space-y-2">
                {recentExams.map((ex) => {
                  const st = getExamStatus(ex);
                  return (
                    <li key={ex._id} className="border-l-4 border-blue-400 pl-3 py-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-800">{ex.title}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${st.color}`}>
                          {st.text}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 flex-wrap mt-1">
                        <FiClock className="w-3 h-3" />
                        {formatDate(ex.startDateTime)}
                        {ex.endDateTime && <> → {formatDate(ex.endDateTime)}</>}
                        {ex.term && <> • {ex.term} {ex.year}</>}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* 4. SCHOOL EVENTS */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <FiCalendar className="text-purple-600" /> School Events
              </h3>
              {eventCount > 0 && (
                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                  {eventCount} upcoming
                </span>
              )}
            </div>
            {recentEvents.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No upcoming events.</p>
            ) : (
              <ul className="space-y-2">
                {recentEvents.map((ev) => (
                  <li key={ev._id} className="border-l-4 border-purple-400 pl-3 py-1">
                    <p className="text-sm font-semibold text-gray-800">{ev.title}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 flex-wrap mt-1">
                      <FiCalendar className="w-3 h-3" /> {formatDate(ev.date)}
                      {ev.venue && (
                        <>
                          <FiMapPin className="w-3 h-3 ml-2" /> {ev.venue}
                        </>
                      )}
                    </p>
                    {ev.description && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{ev.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* No Items Fallback */}
          {totalItems === 0 && (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <div className="flex flex-col items-center">
                <div className="bg-gray-100 p-4 rounded-full mb-4">
                  <FiInbox className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No Updates Yet</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Check back later for upcoming events, exams, and scholarship opportunities.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer Stats */}
        {totalItems > 0 && (
          <div className="mt-4 text-sm text-gray-500 text-center border-t border-gray-200 pt-4">
            <p>
              Showing {totalItems} recent {totalItems === 1 ? 'item' : 'items'}
              {noticeCount > 0 && ` • ${noticeCount} teacher announcements`}
              {globalCount > 0 && ` • ${globalCount} scholarships/events`}
              {eventCount > 0 && ` • ${eventCount} events`}
              {examCount > 0 && ` • ${examCount} exams`}
            </p>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default Announcements;