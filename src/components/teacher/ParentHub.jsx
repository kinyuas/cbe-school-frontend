// src/components/teacher/ParentHub.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  FiCheckCircle, FiMessageSquare, FiSend, FiUser,
  FiRefreshCw, FiSearch
} from 'react-icons/fi';

export default function ParentHub() {
  const [activeTab, setActiveTab] = useState('approvals');

  // Approvals
  const [pendingSkills, setPendingSkills] = useState([]);

  // Messaging Data
  const [messages, setMessages] = useState([]);
  const [parents, setParents] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null); // The active chat
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI State
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [replyText, setReplyText] = useState('');
  
  // Auto-scroll ref for chat
  const chatEndRef = useRef(null);

  // ── Fetch unread count globally ──
  const fetchUnread = useCallback(async () => {
    try {
      const r = await api.get('/teacher-hub/messages/unread-count');
      setUnreadCount(r.data?.count || 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchUnread();
    const t = setInterval(fetchUnread, 10000);
    return () => clearInterval(t);
  }, [fetchUnread]);

  // ── Load Approvals ──
  useEffect(() => {
    if (activeTab === 'approvals') {
      api.get('/teacher-hub/pending-skills')
        .then(r => setPendingSkills(r.data.data || []))
        .catch(() => {});
    }
  }, [activeTab]);

  // ── Load Messages & Parents ──
  useEffect(() => {
    if (activeTab !== 'messages') return;

    fetchMessagesAndParents();
    const interval = setInterval(fetchMessagesAndParents, 5000);

    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchMessagesAndParents = async () => {
    try {
      const [msgRes, parentRes] = await Promise.all([
        api.get('/teacher-hub/messages').catch(() => ({ data: { data: [] } })),
        api.get('/teacher-hub/my-students').catch(() => ({ data: { data: [] } }))
      ]);
      setMessages(msgRes.data.data || []);
      setParents(parentRes.data.data || []);
    } catch (e) {
      console.error('Failed to load chat', e);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchMessagesAndParents(), fetchUnread()]);
    toast.success('Refreshed');
    setRefreshing(false);
  };

  const handleApprove = async (id) => {
    try {
      await api.put(`/teacher-hub/approve-skill/${id}`);
      toast.success('Skill approved!');
      setPendingSkills(pendingSkills.filter(s => s._id !== id));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to approve');
    }
  };

  // ── Send a Reply ──
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedParent) return;

    // Use the first pupil of this parent as the anchor for the message
    const pupilId = selectedParent.pupils[0]?._id; 
    if (!pupilId) return toast.error('No pupil assigned to this parent');

    try {
      await api.post('/teacher-hub/messages', { pupilId, body: replyText });
      setReplyText('');
      fetchMessagesAndParents(); // Refresh chat
    } catch (e) {
      toast.error('Failed to send message');
    }
  };

  // ── Auto-Scroll to Bottom of Chat ──
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedParent]);

  // ============================================================
  // BULLETPROOF "MARK AS READ" ENGINE
  // ============================================================
  useEffect(() => {
    if (!selectedParent || activeTab !== 'messages') return;
    
    // Get all pupil IDs associated with this parent
    const pupilIds = selectedParent.pupils.map(p => String(p._id));

    // Find any UNREAD messages sent by the parent for these pupils
    const unreadMsgs = messages.filter(m => {
      if (m.senderRole !== 'parent' || m.isRead) return false;
      
      const msgPupilId = String(m.pupilId?._id || m.pupilId);
      return pupilIds.includes(msgPupilId);
    });

    // If there are unread messages, mark them as read
    if (unreadMsgs.length > 0) {
      
      // 1. Instantly update local state so the red dots disappear
      setMessages(prev => prev.map(m => 
        unreadMsgs.find(u => u._id === m._id) ? { ...m, isRead: true } : m
      ));

      // 2. Send read receipts to the backend
      Promise.all(unreadMsgs.map(m => api.put(`/teacher-hub/messages/${m._id}/read`)))
        .then(() => {
          // 3. Force update the global notification count in the sidebar/dashboard
          fetchUnread();
          
          // 4. Force a fresh fetch to ensure the database and UI are 100% in sync
          setTimeout(() => {
            fetchMessagesAndParents();
          }, 500);
        })
        .catch((err) => {
          console.error('Failed to mark messages as read:', err);
        });
    }
  }, [selectedParent, messages, activeTab, fetchUnread]);

  // ── Filter Parents for the Sidebar ──
  const filteredParents = parents.filter(p => 
    p.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.pupils.some(pupil => pupil.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ── Filter Messages for the Active Chat ──
  const activeChatMessages = useMemo(() => {
    if (!selectedParent) return [];
    
    const pupilIds = selectedParent.pupils.map(p => String(p._id));

    // Filter messages where the pupil ID matches any of this parent's children
    return messages.filter(m => {
      const msgPupilId = String(m.pupilId?._id || m.pupilId);
      return pupilIds.includes(msgPupilId);
    }).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [messages, selectedParent]);

  return (
    <Layout title="Parent Collaboration Hub" subtitle="Approve skills and communicate with parents">
      
      {/* Tabs */}
      <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-1">
        <button
          onClick={() => setActiveTab('approvals')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold ${activeTab === 'approvals' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          <FiCheckCircle /> Skill Approvals
          {pendingSkills.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {pendingSkills.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold ${activeTab === 'messages' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          <FiMessageSquare /> Messages
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="ml-auto flex items-center gap-1 px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
        >
          <FiRefreshCw className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* APPROVALS TAB */}
      {activeTab === 'approvals' && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h2 className="font-bold mb-4">Pending Parent Submissions</h2>
          {pendingSkills.length === 0 ? (
            <p className="text-gray-500 text-sm">No pending skills.</p>
          ) : (
            <div className="space-y-3">
              {pendingSkills.map(s => (
                <div key={s._id} className="border rounded-lg p-3 flex justify-between items-center bg-gray-50">
                  <div>
                    <p className="font-bold text-sm">
                      {s.pupilId?.name} ({s.pupilId?.class})
                    </p>
                    <p className="text-xs text-indigo-600 font-medium">
                      {s.category} - {s.skill}
                    </p>
                    <p className="text-xs text-gray-500 italic">"{s.evidence}"</p>
                  </div>
                  <button
                    onClick={() => handleApprove(s._id)}
                    className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-green-700"
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MESSAGES TAB (Split Pane Chat) */}
      {activeTab === 'messages' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex h-[70vh]">
          
          {/* LEFT PANE: Parent List */}
          <div className="w-1/3 border-r bg-gray-50 flex flex-col">
            <div className="p-3 border-b bg-white">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search parent or child..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {filteredParents.length === 0 ? (
                <p className="p-4 text-center text-sm text-gray-500">No parents found.</p>
              ) : (
                filteredParents.map((p) => {
                  const isSelected = selectedParent?.parentIdNumber === p.parentIdNumber;
                  
                  // Calculate if this parent has unread messages based on pupil IDs
                  const pupilIds = p.pupils.map(pupil => String(pupil._id));
                  
                  const hasUnread = messages.some(m => {
                    if (m.senderRole !== 'parent' || m.isRead) return false;
                    const msgPupilId = String(m.pupilId?._id || m.pupilId);
                    return pupilIds.includes(msgPupilId);
                  });

                  return (
                    <button
                      key={p.parentIdNumber || p.parentId}
                      onClick={() => setSelectedParent(p)}
                      className={`w-full text-left p-4 border-b transition-colors flex items-center gap-3 ${
                        isSelected ? 'bg-indigo-50 border-indigo-100' : 'hover:bg-gray-100 border-gray-100'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-600">
                        <FiUser className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-sm text-gray-800 truncate">{p.parentName}</p>
                          {hasUnread && (
                            <span className="w-2.5 h-2.5 bg-red-500 rounded-full flex-shrink-0 mt-1"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          Child: {p.pupils.map(pupil => pupil.name).join(', ')}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANE: Chat Window */}
          <div className="w-2/3 flex flex-col bg-white">
            {!selectedParent ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <FiMessageSquare className="w-12 h-12 mb-3 text-gray-300" />
                <p>Select a parent from the list to view messages</p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800">{selectedParent.parentName}</h3>
                    <p className="text-xs text-gray-500">
                      Regarding: {selectedParent.pupils.map(p => p.name).join(', ')} 
                      ({selectedParent.pupils[0]?.admNo})
                    </p>
                  </div>
                </div>

                {/* Chat History */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                  {activeChatMessages.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 mt-10">No messages yet. Say hello!</p>
                  ) : (
                    activeChatMessages.map((m) => {
                      const isMe = m.senderRole === 'teacher';
                      return (
                        <div key={m._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-xl p-3 shadow-sm ${
                            isMe 
                              ? 'bg-indigo-600 text-white rounded-tr-sm' 
                              : 'bg-white border text-gray-800 rounded-tl-sm'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                            <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-3 border-t bg-white">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      className="flex-1 border rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50"
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2.5 rounded-full flex-shrink-0 transition-colors"
                    >
                      <FiSend className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}