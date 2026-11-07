// src/pages/pupil/PupilDashboard.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import api from '../../services/api';
import ScholarshipsAndEventsWidget from '../../components/ScholarshipsAndEventsWidget';
import toast from 'react-hot-toast';
import {
  FiHome, FiBookOpen, FiVideo, FiUser, FiCheckCircle,
  FiClock, FiStar, FiHeart, FiEdit3, FiAward, FiPlay, FiX,
  FiArrowRight, FiCalendar, FiMapPin, FiBell, FiRefreshCw,
  FiExternalLink, FiFileText, FiDownload, FiAlertCircle
} from 'react-icons/fi';

const INTEREST_OPTIONS = [
  'Working with computers', 'Helping others', 'Drawing & Art', 'Playing sports',
  'Reading books', 'Music & Dancing', 'Building things', 'Science experiments',
  'Animals & Nature', 'Solving math puzzles'
];

// ===== Date helpers =====
const formatDate = (d) => {
  if (!d) return 'Date TBA';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('en-KE', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return d; }
};

const isOverdue = (dateVal) => {
  if (!dateVal) return false;
  return new Date(dateVal).getTime() < Date.now() - (24 * 60 * 60 * 1000);
};

// Helper to determine if a URL is an external link or a local file
const isExternalLink = (url) => {
  if (!url) return false;
  return url.startsWith('http') && !url.includes('localhost') && !url.includes('127.0.0.1');
};

const PupilDashboard = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [data, setData] = useState({
    profile: { interests: [], reflections: [] },
    feedback: [],
    resources: [],
    assignments: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState(null);
  const [testAnswers, setTestAnswers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ===== School events state =====
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsRefreshing, setEventsRefreshing] = useState(false);

  // ===== Loaders =====
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/pupil-portal/dashboard');
      const d = res.data.data || {};
      setData({
        profile: d.profile || { interests: [], reflections: [] },
        feedback: d.feedback || [],
        resources: d.resources || [],
        assignments: d.assignments || [],
      });
    } catch (e) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Load only student-targeted events
  const loadEvents = async () => {
    setEventsLoading(true);
    try {
      const res = await api.get('/events?audience=students');
      let list = [];
      if (res.data?.success) list = res.data.data || [];
      else if (Array.isArray(res.data)) list = res.data;
      else if (Array.isArray(res.data?.data)) list = res.data.data;

      list.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
      setEvents(list);
    } catch (e) {
      console.error('Error loading events:', e);
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadEvents();
  }, []);

  const handleRefreshEvents = async () => {
    setEventsRefreshing(true);
    await loadEvents();
    setEventsRefreshing(false);
    toast.success('Events refreshed');
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Loading your learning space...</div>;

  // ===== Handlers =====
  const handleInterestToggle = async (interest) => {
    const current = data.profile.interests || [];
    const updated = current.includes(interest)
      ? current.filter((i) => i !== interest)
      : [...current, interest];

    setData({ ...data, profile: { ...data.profile, interests: updated } });

    try {
      await api.post('/pupil-portal/profile', { interests: updated });
      toast.success('Interests updated!');
    } catch (e) {
      toast.error('Failed to save interest');
      loadData();
    }
  };

  const handleReflectionSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const proudOf = form.proudOf.value;
    const improve = form.improve.value;

    try {
      await api.post('/pupil-portal/profile', { reflection: { proudOf, improve } });
      toast.success('Reflection saved!');
      form.reset();
      loadData();
    } catch (e) {
      toast.error('Failed to save reflection');
    }
  };

  const handleStartTest = (assignment) => {
    setSelectedTest(assignment);
    setTestAnswers(new Array(assignment.questions.length).fill(''));
  };

  const handleSubmitTest = async () => {
    if (testAnswers.includes('')) {
      return toast.error('Please answer all questions');
    }
    setIsSubmitting(true);
    try {
      const res = await api.post(`/pupil-portal/submit-test/${selectedTest._id}`, {
        answers: testAnswers,
      });
      toast.success(`Test complete! You scored ${res.data.data.score}%`);
      setSelectedTest(null);
      loadData();
    } catch (e) {
      toast.error('Failed to submit test');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== Tab config =====
  const TABS = [
    { key: 'home', label: 'My Home', icon: FiHome },
    { key: 'assignments', label: 'Assignments & Tests', icon: FiCheckCircle },
    { key: 'resources', label: 'Learning Library', icon: FiBookOpen },
    { key: 'events', label: 'School Events', icon: FiCalendar, badge: events.length },
    { key: 'opportunities', label: 'Opportunities', icon: FiAward },
    { key: 'profile', label: 'My Profile & Feedback', icon: FiUser },
  ];

  return (
    <Layout title="My Learning Journey" subtitle="Learn, grow, and discover your potential">

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {typeof tab.badge === 'number' && tab.badge > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.key
                    ? 'bg-white/25 text-white'
                    : 'bg-indigo-100 text-indigo-700'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ================= HOME TAB ================= */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <h2 className="text-xl font-bold mb-1">Welcome back! 👋</h2>
            <p className="text-sm opacity-90">
              "Education is the most powerful weapon which you can use to change the world."
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                <FiCheckCircle className="text-indigo-600" /> Recent Teacher Feedback
              </h3>
              {(!data.feedback || data.feedback.length === 0) ? (
                <p className="text-sm text-gray-500 italic">No feedback yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.feedback.slice(0, 2).map((f, i) => (
                    <div
                      key={i}
                      className="bg-indigo-50 p-3 rounded-lg text-sm border-l-4 border-indigo-400"
                    >
                      <p className="italic text-gray-800">"{f.comment}"</p>
                      <p className="text-xs text-indigo-600 font-semibold mt-1">
                        - {f.teacherName} ({f.subject})
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                <FiClock className="text-orange-500" /> Upcoming Due Dates
              </h3>
              {(!data.assignments || data.assignments.length === 0) ? (
                <p className="text-sm text-gray-500 italic">You're all caught up!</p>
              ) : (
                <div className="space-y-2">
                  {data.assignments.slice(0, 3).map((a, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center bg-gray-50 p-2 rounded-lg text-sm"
                    >
                      <span className="font-medium truncate pr-2">{a.title}</span>
                      <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded whitespace-nowrap">
                        {formatDate(a.dueDate)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent events teaser on Home */}
          {events.length > 0 && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <FiBell className="text-blue-600" /> Latest School Events
                </h3>
                <button
                  onClick={() => setActiveTab('events')}
                  className="text-xs text-indigo-600 font-semibold hover:underline"
                >
                  View all →
                </button>
              </div>
              <div className="space-y-2">
                {events.slice(0, 2).map((ev) => (
                  <div
                    key={ev._id}
                    className="flex justify-between items-start gap-2 bg-blue-50 p-2 rounded-lg border-l-4 border-blue-400"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">{ev.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{ev.description}</p>
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded whitespace-nowrap">
                      {formatDate(ev.date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= ASSIGNMENTS TAB ================= */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800">Your Tasks</h2>
          {(!data.assignments || data.assignments.length === 0) ? (
            <div className="text-center py-10 bg-white rounded-xl shadow-sm text-gray-500">
              No assignments right now.
            </div>
          ) : (
            data.assignments.map((a) => {
              const submission = a.submissions?.find((s) => s.pupilId === data.profile.pupilId);
              const overdue = !submission && isOverdue(a.dueDate);

              return (
                <div
                  key={a._id}
                  className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          a.type === 'test'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {a.type}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">{a.subject}</span>
                      {overdue && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                          <FiAlertCircle className="w-3 h-3" /> Overdue
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-800 text-base">{a.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{a.description}</p>
                    
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-3">
                      <p className={`text-xs font-semibold ${overdue ? 'text-red-500' : 'text-orange-500'}`}>
                        Due: {formatDate(a.dueDate)}
                      </p>
                      
                      {/* 👇 DOWNLOAD ATTACHMENT BUTTON */}
                      {a.fileUrl && (
                        <a 
                          href={a.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-700 hover:text-blue-900 flex items-center gap-1 font-bold bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-md transition-colors w-fit"
                        >
                          <FiDownload className="w-3.5 h-3.5" /> Download Attached PDF
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="w-full md:w-auto">
                    {submission ? (
                      <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-center border border-green-200 w-full md:w-32">
                        <p className="text-xs font-bold uppercase">Completed</p>
                        {a.type === 'test' && (
                          <p className="text-lg font-black">{submission.score}%</p>
                        )}
                      </div>
                    ) : a.type === 'test' ? (
                      <button
                        onClick={() => handleStartTest(a)}
                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow hover:bg-indigo-700 flex items-center justify-center gap-2 w-full"
                      >
                        <FiPlay /> Start Test
                      </button>
                    ) : (
                      <div className="bg-yellow-50 text-yellow-700 px-4 py-2.5 rounded-lg text-xs border border-yellow-200 text-center font-medium w-full">
                        Do in exercise book
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ================= RESOURCES TAB ================= */}
      {activeTab === 'resources' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800">Learning Library</h2>
          {(!data.resources || data.resources.length === 0) ? (
            <div className="text-center py-10 bg-white rounded-xl shadow-sm text-gray-500">
              No learning resources have been shared yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.resources.map((r) => {
                const fileUrl = r.url || r.fileUrl;
                const external = isExternalLink(fileUrl);
                
                return (
                  <a
                    key={r._id}
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all block group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2.5 rounded-lg ${
                        r.type === 'Video' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {r.type === 'Video' ? (
                          <FiVideo className="w-5 h-5" />
                        ) : (
                          <FiBookOpen className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {r.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {r.subject} • {r.type}
                        </p>
                      </div>
                    </div>
                    
                    {/* 👇 SMART LINK/DOWNLOAD BUTTON */}
                    <div className="flex items-center justify-between text-xs text-blue-600 font-semibold mt-3 pt-3 border-t border-gray-100">
                      <span className="flex items-center gap-1">
                        {external ? (
                          <><FiExternalLink /> Open Link</>
                        ) : (
                          <><FiDownload /> Download File</>
                        )}
                      </span>
                      <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= SCHOOL EVENTS TAB ================= */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FiCalendar className="text-blue-600" /> School Events
              </h2>
              <p className="text-xs text-gray-500">
                Events published by the school for students
              </p>
            </div>
            <button
              onClick={handleRefreshEvents}
              disabled={eventsRefreshing}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 px-3 py-2 text-xs disabled:opacity-50"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${eventsRefreshing ? 'animate-spin' : ''}`} />
              {eventsRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {eventsLoading ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <FiCalendar className="w-14 h-14 text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-700 mb-1">No Upcoming Events</h3>
              <p className="text-sm text-gray-500">
                There are no school events published for students right now.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => (
                <div
                  key={ev._id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 border-l-4 border-blue-500"
                >
                  <div className="flex justify-between items-start flex-wrap gap-2 mb-1">
                    <h3 className="font-bold text-gray-800 text-base">{ev.title}</h3>
                    <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {formatDate(ev.date)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">{ev.description}</p>
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
                    {ev.venue && (
                      <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                        <FiMapPin className="w-3 h-3" /> {ev.venue}
                      </span>
                    )}
                    {ev.organizer && (
                      <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                        <FiUser className="w-3 h-3" /> {ev.organizer}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= OPPORTUNITIES TAB ================= */}
      {activeTab === 'opportunities' && (
        <ScholarshipsAndEventsWidget title="Scholarships & National Events (Kenya & Beyond)" />
      )}

      {/* ================= PROFILE & FEEDBACK TAB ================= */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Interests */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
              <FiHeart className="text-pink-500" /> My Interests
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Select what you enjoy doing. This helps us suggest the best career paths for you!
            </p>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((opt) => {
                const isSelected = data.profile.interests?.includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => handleInterestToggle(opt)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-pink-500 text-white border-pink-500 shadow-md'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-pink-300'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '} {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reflection */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
              <FiEdit3 className="text-blue-500" /> My Reflection
            </h3>
            <form onSubmit={handleReflectionSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  What are you most proud of this term?
                </label>
                <textarea
                  name="proudOf"
                  required
                  rows="2"
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. I improved my math score..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  What do you want to improve?
                </label>
                <textarea
                  name="improve"
                  required
                  rows="2"
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. I want to read more books..."
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Save Reflection
              </button>
            </form>

            {data.profile.reflections?.length > 0 && (
              <div className="mt-5 border-t pt-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                  Past Reflections
                </h4>
                <div className="space-y-2">
                  {data.profile.reflections.map((r, i) => (
                    <div key={i} className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 border border-gray-100">
                      <p className="mb-1"><strong className="text-gray-900">Proud:</strong> {r.proudOf}</p>
                      <p><strong className="text-gray-900">Improve:</strong> {r.improve}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Narrative Feedback */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
              <FiStar className="text-yellow-500" /> Teacher Feedback
            </h3>
            {(!data.feedback || data.feedback.length === 0) ? (
              <p className="text-sm text-gray-500 italic">No feedback yet.</p>
            ) : (
              <div className="space-y-3">
                {data.feedback.map((f, i) => (
                  <div
                    key={i}
                    className="bg-yellow-50 p-3 rounded-lg text-sm border-l-4 border-yellow-400"
                  >
                    <p className="italic text-gray-800">"{f.comment}"</p>
                    <p className="text-xs text-yellow-700 font-semibold mt-1">
                      - {f.teacherName} ({f.subject})
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= AI TEST MODAL ================= */}
      {selectedTest && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="bg-indigo-600 p-4 text-white flex justify-between items-center sticky top-0 z-10">
              <div>
                <h2 className="font-bold">{selectedTest.title}</h2>
                <p className="text-xs opacity-90">{selectedTest.subject} • Test</p>
              </div>
              <button
                onClick={() => setSelectedTest(null)}
                className="text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {selectedTest.questions.map((q, qIndex) => (
                <div
                  key={qIndex}
                  className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                >
                  <p className="font-semibold text-sm text-gray-800 mb-3">
                    {qIndex + 1}. {q.questionText}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, oIndex) => (
                      <label
                        key={oIndex}
                        className={`flex items-center gap-3 text-sm cursor-pointer p-3 rounded-lg border transition-all ${
                          testAnswers[qIndex] === opt 
                            ? 'bg-indigo-50 border-indigo-300' 
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${qIndex}`}
                          value={opt}
                          checked={testAnswers[qIndex] === opt}
                          onChange={(e) => {
                            const newAns = [...testAnswers];
                            newAns[qIndex] = e.target.value;
                            setTestAnswers(newAns);
                          }}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className={testAnswers[qIndex] === opt ? 'font-semibold text-indigo-900' : 'text-gray-700'}>
                          {opt}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={handleSubmitTest}
                disabled={isSubmitting}
                className="w-full bg-green-600 text-white py-3.5 rounded-lg font-bold hover:bg-green-700 shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <><div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> Submitting...</>
                ) : (
                  <><FiCheckCircle className="w-5 h-5" /> Submit Test</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
};

export default PupilDashboard;