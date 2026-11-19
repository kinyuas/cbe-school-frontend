// src/pages/parent/ParentDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  FiHome, FiBarChart2, FiAward, FiCalendar, FiDollarSign,
  FiMessageSquare, FiClock, FiUser, FiRefreshCw, FiX
} from 'react-icons/fi';

import OverviewTab from './components/OverviewTab';
import ResultsTab from './components/ResultsTab';
import SkillsTalentsTab from './components/SkillsTalentsTab';
import FeesTab from './components/FeesTab';
import CommunicationTab from './components/CommunicationTab';

// 👇 Combined Results & Skills, removed SBA Timeline
const TABS = [
  { key: 'overview',      label: 'Overview',          icon: FiHome },
  { key: 'results',       label: 'Results & Skills',  icon: FiBarChart2 },
  { key: 'fees',          label: 'Fees',              icon: FiDollarSign },
  { key: 'communication', label: 'Messages',          icon: FiMessageSquare },
];

const LAST_SEEN_KEY = (pupilId) => `parent_msg_lastseen_${pupilId}`;

const ParentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth() || {};

  const [activeTab, setActiveTab] = useState('overview');
  const [communicationSubTab, setCommunicationSubTab] = useState('announcements');
  const [selectedChildId, setSelectedChildId] = useState('');

  // ----------------------------------------------------------------
  // Children query (cached 5 min)
  // ----------------------------------------------------------------
  const {
    data: children = [],
    isLoading: loadingChildren,
    refetch: refetchChildren,
  } = useQuery({
    queryKey: ['parent', 'pupils'],
    queryFn: async () => {
      const res = await api.get('/parent/pupils');
      return res.data?.data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    onSuccess: (list) => {
      if (list.length > 0 && !selectedChildId) setSelectedChildId(list[0]._id);
      if (list.length === 0) {
        toast('No pupils linked to your account yet. Contact the school.', { icon: 'ℹ️' });
      }
    },
    onError: () => toast.error('Failed to load your children'),
    placeholderData: (prev) => prev, 
  });

  // Sync selected child when list first loads
  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0]._id);
    }
  }, [children, selectedChildId]);

  // ----------------------------------------------------------------
  // Deep-link support (?tab= & ?subTab=)
  // ----------------------------------------------------------------
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      const subTab = params.get('subTab');
      if (tab && TABS.some((t) => t.key === tab)) setActiveTab(tab);
      if (subTab) setCommunicationSubTab(subTab);
    } catch { /* ignore */ }
  }, []);

  const selectedChild = children.find((c) => c._id === selectedChildId);

  // ----------------------------------------------------------------
  // Unread messages query (poll every 5s via refetchInterval)
  // ----------------------------------------------------------------
  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ['parent', 'unreadMessages', selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) return 0;
      const res = await api.get(`/parent/messages/${selectedChildId}`).catch(() => ({ data: { data: [] } }));
      const msgs = res.data?.data || [];
      const teacherMsgs = msgs.filter((m) => m.senderRole !== 'parent');
      let lastSeen = 0;
      try {
        lastSeen = parseInt(localStorage.getItem(LAST_SEEN_KEY(selectedChildId)) || '0', 10) || 0;
      } catch { lastSeen = 0; }
      return lastSeen === Number.MAX_SAFE_INTEGER
        ? 0
        : Math.max(0, teacherMsgs.length - lastSeen);
    },
    enabled: !!selectedChildId,
    refetchInterval: 5000,
    staleTime: 0,
    gcTime: 60 * 1000,
    placeholderData: (prev) => prev, 
  });

  // ----------------------------------------------------------------
  // Navigation
  // ----------------------------------------------------------------
  const handleNavigate = (key, options = {}) => {
    if (key === 'communication') {
      setCommunicationSubTab(options.subTab || 'announcements');
      setActiveTab('communication');
      return;
    }
    if (key === 'exams') {
      setCommunicationSubTab('announcements');
      setActiveTab('communication');
      return;
    }
    setActiveTab(key);
  };

  const handleReadMessages = () => {
    // Invalidate unread query so it refetches immediately
    // (parent's local lastSeen will be updated by child components)
  };

  // ----------------------------------------------------------------
  // Loading
  // ----------------------------------------------------------------
  if (loadingChildren) {
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
      {/* Child selector — mobile-friendly stacked layout */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-3 sm:mb-4">
        <div className="flex items-center gap-2 mb-2">
          <FiUser className="text-purple-600 flex-shrink-0" />
          <label className="text-xs text-gray-500 font-semibold uppercase">Viewing</label>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedChildId}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="flex-1 min-w-0 px-3 py-3 border border-gray-300 rounded-lg text-base sm:text-sm bg-white touch-manipulation"
          >
            {children.length === 0 && <option>No pupils linked</option>}
            {children.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} — {c.class}{c.stream ? ` ${c.stream}` : ''} ({c.admNo})
              </option>
            ))}
          </select>
          <button
            onClick={() => { refetchChildren(); toast.success('Refreshed'); }}
            className="text-gray-500 hover:text-purple-600 p-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Refresh"
          >
            <FiRefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs — horizontally scrollable on mobile */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-3 sm:mb-4 overflow-hidden">
        <div className="flex overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const showBadge = tab.key === 'communication' && unreadMessages > 0;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  if (tab.key === 'communication') setCommunicationSubTab('announcements');
                  setActiveTab(tab.key);
                }}
                className={`relative flex items-center justify-center gap-1.5 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 touch-manipulation min-h-[48px] ${
                  activeTab === tab.key
                    ? 'border-purple-600 text-purple-700 bg-purple-50'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50 active:bg-gray-100'
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
        <div className="bg-white rounded-xl shadow-md p-8 sm:p-12 text-center">
          <FiUser className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">No pupil linked to this parent account.</p>
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
          {activeTab === 'fees' && <FeesTab pupil={selectedChild} />}
          {activeTab === 'communication' && (
            <CommunicationTab
              pupil={selectedChild}
              initialSubTab={communicationSubTab}
              onReadMessages={handleReadMessages}
            />
          )}
        </>
      )}
    </Layout>
  );
};

export default ParentDashboard;