// src/components/admin/EventsExams.jsx
import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import PublishEventModal from '../modals/PublishEventModal';
import ScholarshipsAndEventsWidget from '../ScholarshipsAndEventsWidget';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  FiCalendar, FiMapPin, FiTrash2, FiAlertCircle, FiPlus, FiEdit2,
  FiClock, FiRefreshCw, FiZap, FiAward, FiBookOpen, FiList
} from 'react-icons/fi';

// ===== AI Device Detection Hook =====
const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    type: 'desktop', isMobile: false, isTablet: false, isDesktop: true,
    viewportWidth: 0, viewportHeight: 0, pixelRatio: 1, isTouchDevice: false,
  });

  useEffect(() => {
    const detectDevice = () => {
      const ua = navigator.userAgent;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const pixelRatio = window.devicePixelRatio || 1;

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || width < 768;
      const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua) || (width >= 768 && width < 1024);
      const isDesktop = !isMobile && !isTablet;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      let type = 'desktop';
      if (isMobile) type = 'mobile';
      else if (isTablet) type = 'tablet';

      setDeviceInfo({ type, isMobile, isTablet, isDesktop, viewportWidth: width, viewportHeight: height, pixelRatio, isTouchDevice });
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  return deviceInfo;
};

// ===== Helpers =====
const calculateTimeRemaining = (endDateTime) => {
  const diff = new Date(endDateTime) - new Date();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, isExpired: true };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    isExpired: false,
  };
};

const getExamPriority = (exam) => {
  if (!exam.isActive) return 3;
  const now = new Date();
  const start = new Date(exam.startDateTime);
  const end = new Date(exam.endDateTime);
  if (now >= start && now <= end) return 0;
  if (now < start) return 1;
  return 2;
};

const sortExamsByPriority = (list) => {
  return [...list].sort((a, b) => {
    const pa = getExamPriority(a);
    const pb = getExamPriority(b);
    if (pa !== pb) return pa - pb;
    const startA = new Date(a.startDateTime).getTime();
    const startB = new Date(b.startDateTime).getTime();
    const endA = new Date(a.endDateTime).getTime();
    const endB = new Date(b.endDateTime).getTime();
    if (pa === 0) return endA - endB;
    if (pa === 1) return startA - startB;
    if (pa === 2) return endB - endA;
    return startB - startA;
  });
};

const formatDate = (d) => {
  if (!d) return 'Date TBA';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return d; }
};

const EMPTY_EXAM_FORM = {
  title: '', type: 'End of Term', startDate: '', startTime: '',
  endDate: '', endTime: '', term: 'Term 1',
  year: new Date().getFullYear(), isActive: true,
};

// ============================================================
// MAIN COMPONENT
// ============================================================
const EventsExams = () => {
  const deviceInfo = useDeviceDetection();
  const { user, isAdmin: isAdminFromContext, isAuthenticated } = useAuth();

  const userRole = (() => {
    if (user?.role) return user.role;
    try { return JSON.parse(localStorage.getItem('user') || '{}').role || null; }
    catch { return null; }
  })();
  const userName = user?.name || 'User';
  const isAdmin = !!isAdminFromContext || userRole === 'admin';

  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'exams' | 'opportunities'

  // ---------- Events state ----------
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  // ---------- Exams state ----------
  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [examForm, setExamForm] = useState(EMPTY_EXAM_FORM);
  const [examTimers, setExamTimers] = useState({});

  const [refreshing, setRefreshing] = useState(false);

  // ============================================================
  // FETCHERS
  // ============================================================
  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const response = await api.get('/events');
      let data = [];
      if (response.data?.success) data = response.data.data || [];
      else if (Array.isArray(response.data)) data = response.data;
      else if (Array.isArray(response.data?.data)) data = response.data.data;
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
      if (error.response?.status === 403) toast.error('No permission to view events');
      else if (error.response?.status === 401) toast.error('Please login to view events');
      else toast.error('Error fetching events');
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const fetchExams = useCallback(async () => {
    setExamsLoading(true);
    try {
      const response = await api.get('/exams');
      if (response.data?.success) {
        const data = response.data.data || [];
        setExams(data);
        const timers = {};
        data.forEach((e) => {
          if (e.endDateTime) timers[e._id] = calculateTimeRemaining(e.endDateTime);
        });
        setExamTimers(timers);
      } else {
        setExams([]);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
      if (error.response?.status === 403) toast.error('No permission to view exams');
      else toast.error('Failed to load exams');
      setExams([]);
    } finally {
      setExamsLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchEvents(), fetchExams()]);
  }, [fetchEvents, fetchExams]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchAll();
    // eslint-disable-next-line
  }, [isAuthenticated, user?._id, user?.role]);

  // Update exam timers every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (exams.length > 0) {
        const next = {};
        exams.forEach((e) => {
          if (e.endDateTime) next[e._id] = calculateTimeRemaining(e.endDateTime);
        });
        setExamTimers(next);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [exams]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    toast.success('Refreshed');
    setRefreshing(false);
  };

  // ============================================================
  // EVENTS HANDLERS
  // ============================================================
  const handleAddEvent = async (eventData) => {
    if (!isAdmin) return toast.error('Only administrators can publish events');
    try {
      const payload = {
        title: eventData.title.trim(),
        description: eventData.description.trim(),
        date: eventData.date || new Date().toISOString().split('T')[0],
        venue: eventData.venue || '',
        organizer: eventData.organizer || userName || 'School Administration',
        isActive: true,
      };
      const response = await api.post('/events', payload);
      if (response.data.success) {
        toast.success('Event published successfully');
        setIsEventModalOpen(false);
        await fetchEvents();
      } else {
        toast.error(response.data.message || 'Error publishing event');
      }
    } catch (error) {
      console.error('Error publishing event:', error);
      if (error.response?.status === 403) toast.error('Admin access required');
      else if (error.response?.status === 401) toast.error('Please login again');
      else toast.error(error.response?.data?.message || 'Failed to publish event');
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!isAdmin) return toast.error('Only administrators can delete events');
    if (!window.confirm('Delete this event?')) return;
    try {
      const response = await api.delete(`/events/${id}`);
      if (response.data.success) {
        setEvents(events.filter((e) => e._id !== id));
        toast.success('Event deleted');
      } else {
        toast.error(response.data.message || 'Error deleting event');
      }
    } catch (error) {
      if (error.response?.status === 403) toast.error('Admin access required');
      else toast.error('Error deleting event');
    }
  };

  // ============================================================
  // EXAMS HANDLERS
  // ============================================================
  const handleExamSubmit = async () => {
    if (!isAdmin) return toast.error('Only administrators can schedule exams');
    if (!examForm.title || !examForm.startDate || !examForm.startTime || !examForm.endDate || !examForm.endTime) {
      return toast.error('Please fill in all required fields');
    }
    const startDateTime = new Date(`${examForm.startDate}T${examForm.startTime}`);
    const endDateTime = new Date(`${examForm.endDate}T${examForm.endTime}`);
    if (startDateTime >= endDateTime) return toast.error('End must be after start');

    const payload = {
      title: examForm.title.trim(),
      type: examForm.type,
      term: examForm.term,
      year: parseInt(examForm.year),
      startDate: examForm.startDate,
      startTime: examForm.startTime,
      endDate: examForm.endDate,
      endTime: examForm.endTime,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      isActive: examForm.isActive,
    };

    try {
      if (editingExam) {
        const r = await api.put(`/exams/${editingExam._id}`, payload);
        if (r.data.success) {
          toast.success('Exam updated');
          closeExamModal();
          fetchExams();
        }
      } else {
        const r = await api.post('/exams', payload);
        if (r.data.success) {
          toast.success('Exam scheduled');
          closeExamModal();
          fetchExams();
        }
      }
    } catch (error) {
      console.error('Error saving exam:', error);
      if (error.response?.status === 403) toast.error('Admin access required');
      else toast.error(error.response?.data?.message || 'Failed to save exam');
    }
  };

  const handleExamEdit = (exam) => {
    if (!isAdmin) return toast.error('Admin access required');
    const s = new Date(exam.startDateTime);
    const e = new Date(exam.endDateTime);
    setEditingExam(exam);
    setExamForm({
      title: exam.title,
      type: exam.type || 'End of Term',
      term: exam.term || 'Term 1',
      year: exam.year || new Date().getFullYear(),
      startDate: s.toISOString().split('T')[0],
      startTime: s.toTimeString().slice(0, 5),
      endDate: e.toISOString().split('T')[0],
      endTime: e.toTimeString().slice(0, 5),
      isActive: exam.isActive !== undefined ? exam.isActive : true,
    });
    setIsExamModalOpen(true);
  };

  const handleExamDelete = async (id) => {
    if (!isAdmin) return toast.error('Admin access required');
    if (!window.confirm('Delete this exam?')) return;
    try {
      const r = await api.delete(`/exams/${id}`);
      if (r.data.success) {
        toast.success('Exam deleted');
        fetchExams();
      } else {
        toast.error(r.data.message || 'Failed to delete exam');
      }
    } catch (error) {
      if (error.response?.status === 403) toast.error('Admin access required');
      else toast.error('Failed to delete exam');
    }
  };

  const toggleExamStatus = async (examId, currentStatus) => {
    if (!isAdmin) return toast.error('Admin access required');
    try {
      const r = await api.put(`/exams/${examId}`, { isActive: !currentStatus });
      if (r.data.success) {
        toast.success(`Exam ${!currentStatus ? 'enabled' : 'disabled'}`);
        fetchExams();
      }
    } catch (error) {
      if (error.response?.status === 403) toast.error('Admin access required');
      else toast.error('Failed to update exam status');
    }
  };

  const closeExamModal = () => {
    setIsExamModalOpen(false);
    setEditingExam(null);
    setExamForm(EMPTY_EXAM_FORM);
  };

  // ============================================================
  // DERIVED
  // ============================================================
  const sortedExams = sortExamsByPriority(exams);
  const currentExamId = sortedExams.length > 0 && getExamPriority(sortedExams[0]) === 0
    ? sortedExams[0]._id : null;

  const isExamOngoing = (exam) => {
    const now = new Date();
    return now >= new Date(exam.startDateTime) && now <= new Date(exam.endDateTime);
  };
  const isExamExpired = (exam) => new Date() > new Date(exam.endDateTime);

  const getExamStatus = (exam) => {
    if (!exam.isActive) return { text: 'Inactive', color: 'bg-gray-200 text-gray-600' };
    if (isExamExpired(exam)) return { text: 'Expired', color: 'bg-red-100 text-red-800' };
    if (isExamOngoing(exam)) return { text: 'Ongoing', color: 'bg-green-100 text-green-800' };
    return { text: 'Upcoming', color: 'bg-blue-100 text-blue-800' };
  };

  const getTimeRemainingDisplay = (exam) => {
    const t = examTimers[exam._id];
    if (!t) return null;
    if (t.isExpired) return { text: 'Time Expired', color: 'text-red-600' };
    if (t.days > 0) return { text: `${t.days}d ${t.hours}h left`, color: t.days <= 2 ? 'text-orange-600' : 'text-green-600' };
    if (t.hours > 0) return { text: `${t.hours}h ${t.minutes}m left`, color: t.hours <= 2 ? 'text-red-600' : 'text-orange-600' };
    return { text: `${t.minutes}m left`, color: 'text-red-600 font-bold' };
  };

  // ============================================================
  // RENDER
  // ============================================================
  const loading = eventsLoading && examsLoading;

  if (loading) {
    return (
      <Layout title="Events & Exams" subtitle="Manage school events, exams, and opportunities">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  const TABS = [
    { key: 'events', label: 'Events', icon: FiCalendar, count: events.length },
    { key: 'exams', label: 'Exams', icon: FiBookOpen, count: exams.length },
    { key: 'opportunities', label: 'Scholarships & Big Events', icon: FiAward, count: null },
  ];

  return (
    <Layout title="Events & Exams" subtitle="Manage school events, exams, and opportunities">
      {/* Permission Banner */}
      {!isAdmin && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-3 mb-4">
          <div className="flex items-start">
            <FiAlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="ml-3 text-sm text-yellow-700">
              <p>You are viewing as <strong>{userRole || 'user'}</strong>. Only administrators can publish or delete items.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.key ? 'bg-green-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count != null && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-white/20' : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Refresh */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
        >
          <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh All'}
        </button>
      </div>

      {/* ============ EVENTS TAB ============ */}
      {activeTab === 'events' && (
        <div>
          {isAdmin && (
            <div className="mb-4">
              <button
                onClick={() => setIsEventModalOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 px-4 py-2 text-sm"
              >
                <FiPlus className="w-4 h-4" /> Publish New Event
              </button>
            </div>
          )}

          {events.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <FiCalendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Events Yet</h3>
              <p className="text-gray-500">
                {isAdmin ? 'Click "Publish New Event" to create your first event' : 'No events published yet.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {events.map((event) => (
                <div key={event._id} className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800">{event.title}</h3>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <FiCalendar className="w-4 h-4" /> {formatDate(event.date)}
                        </span>
                        {event.venue && (
                          <span className="flex items-center gap-1"><FiMapPin className="w-4 h-4" /> {event.venue}</span>
                        )}
                        {event.organizer && <span className="text-gray-400">Organizer: {event.organizer}</span>}
                        {event.isActive === false && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Inactive</span>
                        )}
                      </div>
                      <p className="text-gray-700 mt-3">{event.description}</p>
                      {event.createdBy && (
                        <p className="text-xs text-gray-400 mt-2">Published by: {event.createdBy}</p>
                      )}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteEvent(event._id)}
                        className="text-red-600 hover:text-red-800 ml-4 p-2 hover:bg-red-50 rounded-lg"
                        title="Delete event"
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============ EXAMS TAB ============ */}
      {activeTab === 'exams' && (
        <div>
          {isAdmin && (
            <div className="mb-4">
              <button
                onClick={() => { setEditingExam(null); setExamForm(EMPTY_EXAM_FORM); setIsExamModalOpen(true); }}
                className="bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 px-4 py-2 text-sm"
              >
                <FiPlus className="w-4 h-4" /> Schedule Exam
              </button>
            </div>
          )}

          {exams.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <FiBookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Exams Scheduled</h3>
              <p className="text-gray-500">
                {isAdmin ? 'Click "Schedule Exam" to create your first exam' : 'No exams available.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {sortedExams.map((exam) => {
                const status = getExamStatus(exam);
                const start = new Date(exam.startDateTime);
                const end = new Date(exam.endDateTime);
                const timeLeft = getTimeRemainingDisplay(exam);
                const isCurrent = exam._id === currentExamId;

                return (
                  <div
                    key={exam._id}
                    className={`bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow ${
                      isCurrent ? 'border-2 border-green-500 ring-2 ring-green-100' : 'border border-transparent'
                    }`}
                  >
                    <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-3' : 'justify-between items-start'}`}>
                      <div className="flex-1 w-full">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-800">{exam.title}</h3>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-600 text-white font-bold">
                              <FiZap className="w-3 h-3" /> CURRENT
                            </span>
                          )}
                          <span className={`px-2 py-1 text-xs rounded-full ${status.color}`}>{status.text}</span>
                          {!exam.isActive && (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-600">Disabled</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {exam.type} • {exam.term} • {exam.year}
                        </p>
                        <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'flex-wrap items-center gap-4'} mt-2 text-sm`}>
                          <div className="flex items-center gap-2 text-gray-500">
                            <FiCalendar className="w-4 h-4" />
                            <span>Start: {start.toLocaleDateString()}</span>
                            <FiClock className="w-4 h-4 ml-2" />
                            <span>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-500">
                            <FiCalendar className="w-4 h-4" />
                            <span>End: {end.toLocaleDateString()}</span>
                            <FiClock className="w-4 h-4 ml-2" />
                            <span>{end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                        {timeLeft && exam.isActive && !isExamExpired(exam) && (
                          <div className={`mt-2 flex items-center gap-2 ${timeLeft.color} text-sm`}>
                            <FiClock className="w-4 h-4" />
                            <span className="font-semibold">{timeLeft.text}</span>
                            {isExamOngoing(exam) && (
                              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold animate-pulse">
                                LIVE
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {isAdmin && (
                        <div className={`flex ${deviceInfo.isMobile ? 'flex-wrap gap-2 mt-2' : 'gap-2 flex-shrink-0'}`}>
                          <button
                            onClick={() => toggleExamStatus(exam._id, exam.isActive)}
                            className={`px-3 py-1 rounded-lg text-xs ${
                              exam.isActive
                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {exam.isActive ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleExamEdit(exam)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Edit Exam"
                          >
                            <FiEdit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleExamDelete(exam._id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Delete Exam"
                          >
                            <FiTrash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============ SCHOLARSHIPS & BIG EVENTS TAB ============ */}
      {activeTab === 'opportunities' && (
        <div>
          <div className="mb-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <FiAward className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p>
                  These are <strong>globally managed</strong> scholarships and big events uploaded by the Super Admin.
                  They are visible to all schools and cannot be edited here.
                </p>
              </div>
            </div>
          </div>
          <ScholarshipsAndEventsWidget title="Scholarships & Big Events (Kenya & Beyond)" />
        </div>
      )}

      {/* ============ EVENT MODAL ============ */}
      <PublishEventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={handleAddEvent}
        userRole={userRole}
        userName={userName}
      />

      {/* ============ EXAM MODAL ============ */}
      {isExamModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {editingExam ? 'Edit Exam' : 'Schedule New Exam'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium text-sm mb-1">Exam Title *</label>
                <input
                  type="text"
                  value={examForm.title}
                  onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., End of Term Examination"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium text-sm mb-1">Exam Type</label>
                <select
                  value={examForm.type}
                  onChange={(e) => setExamForm({ ...examForm, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="End of Term">End of Term</option>
                  <option value="Opener">Opener</option>
                  <option value="Mid Term">Mid Term</option>
                  <option value="Random">Random</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium text-sm mb-1">Term</label>
                  <select
                    value={examForm.term}
                    onChange={(e) => setExamForm({ ...examForm, term: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium text-sm mb-1">Year</label>
                  <input
                    type="number"
                    value={examForm.year}
                    onChange={(e) => setExamForm({ ...examForm, year: parseInt(e.target.value) || '' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium text-sm mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={examForm.startDate}
                    onChange={(e) => setExamForm({ ...examForm, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium text-sm mb-1">Start Time *</label>
                  <input
                    type="time"
                    value={examForm.startTime}
                    onChange={(e) => setExamForm({ ...examForm, startTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium text-sm mb-1">End Date *</label>
                  <input
                    type="date"
                    value={examForm.endDate}
                    onChange={(e) => setExamForm({ ...examForm, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium text-sm mb-1">End Time *</label>
                  <input
                    type="time"
                    value={examForm.endTime}
                    onChange={(e) => setExamForm({ ...examForm, endTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <div className="flex items-start gap-2">
                  <FiAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-800">
                    Teachers can only upload results during the exam period. After the end time, results become read-only.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleExamSubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                {editingExam ? 'Update Exam' : 'Save Exam'}
              </button>
              <button
                onClick={closeExamModal}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default EventsExams;