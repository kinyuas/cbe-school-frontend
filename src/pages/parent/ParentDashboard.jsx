// src/pages/parent/ParentDashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  FiHome, FiBarChart2, FiAward, FiCalendar, FiDollarSign,
  FiMessageSquare, FiClock, FiUser, FiRefreshCw
} from 'react-icons/fi';

import OverviewTab from './components/OverviewTab';
import ResultsTab from './components/ResultsTab';
import SkillsTalentsTab from './components/SkillsTalentsTab';
import FeesTab from './components/FeesTab';
import CommunicationTab from './components/CommunicationTab';
import SbaTimelineTab from './components/SbaTimelineTab';

// 👇 Removed 'attendance' from TABS
const TABS = [
  { key: 'overview',      label: 'Overview',       icon: FiHome },
  { key: 'results',       label: 'Results',        icon: FiBarChart2 },
  { key: 'skills',        label: 'Skills & Talents', icon: FiAward },
  { key: 'fees',          label: 'Fees',           icon: FiDollarSign },
  { key: 'communication', label: 'Messages',       icon: FiMessageSquare },
  { key: 'sba',           label: 'SBA Timeline',   icon: FiClock },
];

const LAST_SEEN_KEY = (pupilId) => `parent_msg_lastseen_${pupilId}`;

const ParentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth() || {};

  const [activeTab, setActiveTab] = useState('overview');
  const [communicationSubTab, setCommunicationSubTab] = useState('announcements');
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [loading, setLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Prevent duplicate polling per pupil
  const pollRef = useRef(null);

  // ----------------------------------------------------------------
  // Load children
  // ----------------------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/parent/pupils');
        const list = res.data?.data || [];
        setChildren(list);
        if (list.length > 0) setSelectedChildId(list[0]._id);
        if (list.length === 0) {
          toast('No pupils linked to your account yet. Contact the school.', { icon: 'ℹ️' });
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load your children');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedChild = children.find((c) => c._id === selectedChildId);

  // ----------------------------------------------------------------
  // Poll unread teacher messages (for tab badge)
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!selectedChildId) {
      setUnreadMessages(0);
      return;
    }

    let alive = true;

    const readLastSeen = () => {
      try {
        return parseInt(localStorage.getItem(LAST_SEEN_KEY(selectedChildId)) || '0', 10) || 0;
      } catch {
        return 0;
      }
    };

    const fetchUnread = async () => {
      try {
        const res = await api
          .get(`/parent/messages/${selectedChildId}`)
          .catch(() => ({ data: { data: [] } }));
        if (!alive) return;
        const msgs = res.data?.data || [];
        const teacherMsgs = msgs.filter((m) => m.senderRole !== 'parent');
        const lastSeen = readLastSeen();

        // If parent has marked all read (MAX sentinel), unread = 0
        const unread =
          lastSeen === Number.MAX_SAFE_INTEGER
            ? 0
            : Math.max(0, teacherMsgs.length - lastSeen);

        setUnreadMessages(unread);
      } catch { /* silent */ }
    };

    fetchUnread();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(fetchUnread, 5000);

    return () => {
      alive = false;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [selectedChildId]);

  // ----------------------------------------------------------------
  // Central navigation — supports deep-link into Communication sub-tabs
  // ----------------------------------------------------------------
  const handleNavigate = (key, options = {}) => {
    if (key === 'communication') {
      setCommunicationSubTab(options.subTab || 'announcements');
      setActiveTab('communication');
      return;
    }
    // 'exams' → Communication → Announcements (exams live there)
    if (key === 'exams') {
      setCommunicationSubTab('announcements');
      setActiveTab('communication');
      return;
    }
    // 'results', 'skills', 'fees', 'sba', 'overview' — direct tab mapping
    setActiveTab(key);
  };

  // Called from OverviewTab banner → clear badge immediately
  const handleReadMessages = () => {
    setUnreadMessages(0);
  };

  // ----------------------------------------------------------------
  // Loading state
  // ----------------------------------------------------------------
  if (loading) {
    return (
      <Layout title="Parent Portal" subtitle="Track your child's CBC journey">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </Layout>
    );
  }

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <Layout title="Parent Portal" subtitle="Track your child's CBC journey">
      {/* Child selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <FiUser className="text-purple-600" />
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs text-gray-500 mb-1">Viewing</label>
          <select
            value={selectedChildId}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {children.length === 0 && <option>No pupils linked</option>}
            {children.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} — {c.class}{c.stream ? ` ${c.stream}` : ''} ({c.admNo})
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="text-gray-500 hover:text-purple-600 p-2"
          title="Refresh"
        >
          <FiRefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 overflow-x-auto">
        <div className="flex min-w-max">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const showBadge = tab.key === 'communication' && unreadMessages > 0;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  // If user clicks Messages tab directly, default to announcements
                  if (tab.key === 'communication') {
                    setCommunicationSubTab('announcements');
                  }
                  setActiveTab(tab.key);
                }}
                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-purple-600 text-purple-700 bg-purple-50'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {showBadge && (
                  <span className="ml-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {!selectedChild ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <FiUser className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">No pupil linked to this parent account.</p>
          <p className="text-xs text-gray-400 mt-1">
            Ask the school admin to add your Parent ID to the student's profile.
          </p>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <OverviewTab
              pupil={selectedChild}
              onNavigate={handleNavigate}
              onReadMessages={handleReadMessages}
            />
          )}
          {activeTab === 'results' && <ResultsTab pupil={selectedChild} />}
          {activeTab === 'skills' && <SkillsTalentsTab pupil={selectedChild} />}
          {activeTab === 'fees' && <FeesTab pupil={selectedChild} />}
          {activeTab === 'communication' && (
            <CommunicationTab
              pupil={selectedChild}
              initialSubTab={communicationSubTab}
              onReadMessages={handleReadMessages}
            />
          )}
          {activeTab === 'sba' && <SbaTimelineTab pupil={selectedChild} />}
        </>
      )}
    </Layout>
  );
};

export default ParentDashboard;