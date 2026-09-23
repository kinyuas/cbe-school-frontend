// src/components/admin/Exams.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { FiPlus, FiTrash2, FiEdit2, FiCalendar, FiClock, FiAlertCircle, FiMonitor, FiSmartphone, FiTablet, FiRefreshCw, FiZap } from 'react-icons/fi';

// ===== AI Device Detection Hook =====
const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    type: 'desktop',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    viewportWidth: 0,
    viewportHeight: 0,
    pixelRatio: 1,
    isTouchDevice: false
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
      
      setDeviceInfo({
        type,
        isMobile,
        isTablet,
        isDesktop,
        viewportWidth: width,
        viewportHeight: height,
        pixelRatio,
        isTouchDevice
      });
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  return deviceInfo;
};

// ===== AI Responsive Helper =====
const useResponsiveClasses = (deviceInfo) => {
  return {
    cardPadding: deviceInfo.isMobile ? 'p-4' : 'p-6',
    headingSize: deviceInfo.isMobile ? 'text-lg' : 'text-xl',
    textSize: deviceInfo.isMobile ? 'text-sm' : 'text-base',
    buttonSize: deviceInfo.isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
    gridGap: deviceInfo.isMobile ? 'gap-3' : 'gap-4',
    modalWidth: deviceInfo.isMobile ? 'w-full max-w-sm' : 'w-full max-w-md',
  };
};

// ===== Time Remaining Calculator =====
const calculateTimeRemaining = (endDateTime) => {
  const now = new Date();
  const end = new Date(endDateTime);
  const diff = end - now;
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, totalSeconds: 0, isExpired: true };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const totalSeconds = Math.floor(diff / 1000);
  
  return { days, hours, minutes, totalSeconds, isExpired: false };
};

// ============================================================
// EXAM PRIORITY HELPERS
//   0 → Ongoing (currently live)
//   1 → Upcoming (starts in the future)
//   2 → Expired  (already ended)
//   3 → Inactive (disabled by admin)
// Lower number = higher priority = closer to the top
// ============================================================
const getExamPriority = (exam) => {
  if (!exam.isActive) return 3;
  const now = new Date();
  const start = new Date(exam.startDateTime);
  const end = new Date(exam.endDateTime);
  if (now >= start && now <= end) return 0; // ongoing
  if (now < start) return 1;                // upcoming
  return 2;                                 // expired
};

const sortExamsByPriority = (examsList) => {
  return [...examsList].sort((a, b) => {
    const pa = getExamPriority(a);
    const pb = getExamPriority(b);
    if (pa !== pb) return pa - pb;

    const startA = new Date(a.startDateTime).getTime();
    const startB = new Date(b.startDateTime).getTime();
    const endA = new Date(a.endDateTime).getTime();
    const endB = new Date(b.endDateTime).getTime();

    if (pa === 0) return endA - endB;   // ongoing: ends soonest first
    if (pa === 1) return startA - startB; // upcoming: starts soonest first
    if (pa === 2) return endB - endA;     // expired: most recent first
    return startB - startA;               // inactive: newest created first
  });
};

const Exams = () => {
  // AI Device Detection
  const deviceInfo = useDeviceDetection();
  const responsive = useResponsiveClasses(deviceInfo);

  // Auth state from context (kept in sync with the current token)
  const { user, isAdmin: isAdminFromContext, isAuthenticated } = useAuth();

  const userRole = (() => {
    if (user?.role) return user.role;
    try {
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      return stored.role || null;
    } catch (e) {
      return null;
    }
  })();

  const isAdmin = !!isAdminFromContext || userRole === 'admin';

  const [exams, setExams] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [examTimers, setExamTimers] = useState({});
  
  const [formData, setFormData] = useState({
    title: '',
    type: 'End of Term',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    term: 'Term 1',
    year: new Date().getFullYear(),
    isActive: true
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    loadExams();
    // eslint-disable-next-line
  }, [isAuthenticated, user?._id, user?.role]);

  useEffect(() => {
    if (!isAdmin && isModalOpen) {
      setIsModalOpen(false);
      setEditingExam(null);
      resetForm();
    }
    // eslint-disable-next-line
  }, [isAdmin]);

  // Update timers every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (exams.length > 0) {
        const newTimers = {};
        exams.forEach(exam => {
          if (exam.endDateTime) {
            newTimers[exam._id] = calculateTimeRemaining(exam.endDateTime);
          }
        });
        setExamTimers(newTimers);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [exams]);

  const loadExams = async () => {
    setLoading(true);
    try {
      const response = await api.get('/exams');
      if (response.data.success) {
        const examsData = response.data.data || [];
        setExams(examsData);
        
        const timers = {};
        examsData.forEach(exam => {
          if (exam.endDateTime) {
            timers[exam._id] = calculateTimeRemaining(exam.endDateTime);
          }
        });
        setExamTimers(timers);
      } else {
        setExams([]);
      }
    } catch (error) {
      console.error('Error loading exams:', error);
      if (error.response?.status === 403) {
        toast.error('You do not have permission to view exams');
      } else {
        toast.error('Failed to load exams');
      }
      setExams([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadExams();
    toast.success('Exams refreshed');
  };

  const handleSubmit = async () => {
    if (!isAdmin) {
      toast.error('Only administrators can schedule exams');
      return;
    }

    if (!formData.title || !formData.startDate || !formData.endDate || !formData.startTime || !formData.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
    
    if (startDateTime >= endDateTime) {
      toast.error('End date/time must be after start date/time');
      return;
    }

    const examData = {
      title: formData.title.trim(),
      type: formData.type,
      term: formData.term,
      year: parseInt(formData.year),
      startDate: formData.startDate,
      startTime: formData.startTime,
      endDate: formData.endDate,
      endTime: formData.endTime,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      isActive: formData.isActive
    };

    try {
      let response;
      if (editingExam) {
        response = await api.put(`/exams/${editingExam._id}`, examData);
        if (response.data.success) {
          toast.success('Exam updated successfully');
          setIsModalOpen(false);
          setEditingExam(null);
          resetForm();
          loadExams();
        }
      } else {
        response = await api.post('/exams', examData);
        if (response.data.success) {
          toast.success('Exam added successfully');
          setIsModalOpen(false);
          resetForm();
          loadExams();
        }
      }
    } catch (error) {
      console.error('Error saving exam:', error);
      if (error.response?.status === 403) {
        toast.error('You do not have permission to perform this action. Admin access required.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to save exam');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'End of Term',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      term: 'Term 1',
      year: new Date().getFullYear(),
      isActive: true
    });
  };

  const handleDelete = async (id) => {
    if (!isAdmin) {
      toast.error('Only administrators can delete exams');
      return;
    }

    if (window.confirm('Are you sure you want to delete this exam? This action cannot be undone.')) {
      try {
        const response = await api.delete(`/exams/${id}`);
        if (response.data.success) {
          toast.success('Exam deleted successfully');
          loadExams();
        } else {
          toast.error(response.data.message || 'Failed to delete exam');
        }
      } catch (error) {
        console.error('Error deleting exam:', error);
        if (error.response?.status === 403) {
          toast.error('You do not have permission to delete exams. Admin access required.');
        } else {
          toast.error('Failed to delete exam');
        }
      }
    }
  };

  const handleEdit = (exam) => {
    if (!isAdmin) {
      toast.error('Only administrators can edit exams');
      return;
    }

    const startDateTime = new Date(exam.startDateTime);
    const endDateTime = new Date(exam.endDateTime);
    
    setEditingExam(exam);
    setFormData({
      title: exam.title,
      type: exam.type || 'End of Term',
      term: exam.term || 'Term 1',
      year: exam.year || new Date().getFullYear(),
      startDate: startDateTime.toISOString().split('T')[0],
      startTime: startDateTime.toTimeString().slice(0, 5),
      endDate: endDateTime.toISOString().split('T')[0],
      endTime: endDateTime.toTimeString().slice(0, 5),
      isActive: exam.isActive !== undefined ? exam.isActive : true
    });
    setIsModalOpen(true);
  };

  const toggleExamStatus = async (examId, currentStatus) => {
    if (!isAdmin) {
      toast.error('Only administrators can change exam status');
      return;
    }

    try {
      const response = await api.put(`/exams/${examId}`, { isActive: !currentStatus });
      if (response.data.success) {
        toast.success(`Exam ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
        loadExams();
      } else {
        toast.error(response.data.message || 'Failed to update exam status');
      }
    } catch (error) {
      console.error('Error updating exam status:', error);
      if (error.response?.status === 403) {
        toast.error('You do not have permission to change exam status. Admin access required.');
      } else {
        toast.error('Failed to update exam status');
      }
    }
  };

  const isExamOngoing = (exam) => {
    const now = new Date();
    const start = new Date(exam.startDateTime);
    const end = new Date(exam.endDateTime);
    return now >= start && now <= end;
  };

  const isExamExpired = (exam) => {
    const now = new Date();
    const end = new Date(exam.endDateTime);
    return now > end;
  };

  const getExamStatus = (exam) => {
    if (!exam.isActive) return { text: 'Inactive', color: 'bg-gray-200 text-gray-600' };
    if (isExamExpired(exam)) return { text: 'Expired', color: 'bg-red-100 text-red-800' };
    if (isExamOngoing(exam)) return { text: 'Ongoing', color: 'bg-green-100 text-green-800' };
    return { text: 'Upcoming', color: 'bg-blue-100 text-blue-800' };
  };

  const getTimeRemainingDisplay = (exam) => {
    const timer = examTimers[exam._id];
    if (!timer) return null;
    
    if (timer.isExpired) {
      return { text: 'Time Expired', color: 'text-red-600', icon: FiAlertCircle };
    }
    
    if (timer.days > 0) {
      return { 
        text: `${timer.days}d ${timer.hours}h left`, 
        color: timer.days <= 2 ? 'text-orange-600' : 'text-green-600',
        icon: FiClock
      };
    }
    
    if (timer.hours > 0) {
      return { 
        text: `${timer.hours}h ${timer.minutes}m left`, 
        color: timer.hours <= 2 ? 'text-red-600' : 'text-orange-600',
        icon: FiClock
      };
    }
    
    return { 
      text: `${timer.minutes}m left`, 
      color: 'text-red-600 font-bold',
      icon: FiClock
    };
  };

  if (loading) {
    return (
      <Layout title="Exam Management" subtitle="Schedule and manage school exams">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  // ✅ Sort exams so the CURRENT one is always at the top
  const sortedExams = sortExamsByPriority(exams);
  const currentExamId = sortedExams.length > 0 && getExamPriority(sortedExams[0]) === 0
    ? sortedExams[0]._id
    : null;

  return (
    <Layout 
      title="Exam Management" 
      subtitle="Schedule and manage school exams"
    >
      {/* Header with Actions */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 px-4 py-2 text-sm transition-colors"
          >
            <FiPlus className="w-4 h-4" /> 
            {deviceInfo.isMobile ? 'Add' : 'Schedule Exam'}
          </button>
        )}
        <button 
          onClick={handleRefresh} 
          disabled={refreshing}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 px-4 py-2 text-sm transition-colors disabled:opacity-50"
        >
          <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? '...' : 'Refresh'}
        </button>
      </div>

      {exams.length === 0 ? (
        <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding} text-center`}>
          <div className="flex flex-col items-center">
            <FiCalendar className={`${deviceInfo.isMobile ? 'w-12 h-12' : 'w-16 h-16'} text-gray-400 mb-4`} />
            <h3 className={`${deviceInfo.isMobile ? 'text-lg' : 'text-xl'} font-semibold text-gray-800 mb-2`}>No Exams Scheduled</h3>
            <p className={`${deviceInfo.isMobile ? 'text-sm' : 'text-base'} text-gray-500`}>
              {isAdmin ? 'Click "Schedule Exam" to create your first exam' : 'No exams available'}
            </p>
          </div>
        </div>
      ) : (
        <div className={`grid ${deviceInfo.isMobile ? 'gap-3' : 'gap-4'}`}>
          {sortedExams.map((exam) => {
            const status = getExamStatus(exam);
            const startDateTime = new Date(exam.startDateTime);
            const endDateTime = new Date(exam.endDateTime);
            const timeRemaining = getTimeRemainingDisplay(exam);
            const isCurrent = exam._id === currentExamId;
            
            return (
              <div
                key={exam._id}
                className={`bg-white rounded-xl shadow-md ${deviceInfo.isMobile ? 'p-4' : 'p-6'} hover:shadow-lg transition-shadow ${
                  isCurrent
                    ? 'border-2 border-green-500 ring-2 ring-green-100'
                    : 'border border-transparent'
                }`}
              >
                <div className={`flex ${deviceInfo.isMobile ? 'flex-col' : 'flex-row'} ${deviceInfo.isMobile ? 'gap-3' : 'justify-between items-start'}`}>
                  <div className="flex-1 w-full">
                    <div className={`flex ${deviceInfo.isMobile ? 'flex-col' : 'flex-row'} ${deviceInfo.isMobile ? 'gap-2' : 'items-center gap-3'} flex-wrap`}>
                      <h3 className={`${deviceInfo.isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-800`}>
                        {exam.title}
                      </h3>
                      <div className={`flex ${deviceInfo.isMobile ? 'flex-wrap' : 'flex-row'} gap-2 items-center`}>
                        {/* ✅ CURRENT badge for the ongoing exam */}
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-600 text-white font-bold shadow">
                            <FiZap className="w-3 h-3" />
                            CURRENT
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full ${status.color}`}>
                          {status.text}
                        </span>
                        {!exam.isActive && (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-600">
                            Disabled
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mt-1`}>
                      {exam.type} • {exam.term} • {exam.year}
                    </p>
                    
                    <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'flex-wrap items-center gap-4'} mt-2 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>
                      <div className="flex items-center gap-2 text-gray-500">
                        <FiCalendar className={`${deviceInfo.isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                        <span>Start: {startDateTime.toLocaleDateString()}</span>
                        <FiClock className={`${deviceInfo.isMobile ? 'w-3 h-3 ml-1' : 'w-4 h-4 ml-2'}`} />
                        <span>{startDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <FiCalendar className={`${deviceInfo.isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                        <span>End: {endDateTime.toLocaleDateString()}</span>
                        <FiClock className={`${deviceInfo.isMobile ? 'w-3 h-3 ml-1' : 'w-4 h-4 ml-2'}`} />
                        <span>{endDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    
                    {/* Time Remaining Display */}
                    {timeRemaining && exam.isActive && !isExamExpired(exam) && (
                      <div className={`mt-2 flex items-center gap-2 ${timeRemaining.color} ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>
                        <FiClock className={deviceInfo.isMobile ? 'w-3 h-3' : 'w-4 h-4'} />
                        <span className="font-semibold">{timeRemaining.text}</span>
                        {isExamOngoing(exam) && (
                          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold animate-pulse">
                            LIVE
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  {isAdmin && (
                    <div className={`flex ${deviceInfo.isMobile ? 'flex-wrap gap-2 mt-2' : 'gap-2 flex-shrink-0'}`}>
                      <button 
                        onClick={() => toggleExamStatus(exam._id, exam.isActive)} 
                        className={`px-3 py-1 rounded-lg text-xs ${exam.isActive ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'} transition-colors`}
                        title={exam.isActive ? 'Disable Exam' : 'Enable Exam'}
                      >
                        {exam.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button 
                        onClick={() => handleEdit(exam)} 
                        className="text-blue-600 hover:text-blue-800 p-1 transition-colors"
                        title="Edit Exam"
                      >
                        <FiEdit2 className={deviceInfo.isMobile ? 'w-4 h-4' : 'w-5 h-5'} />
                      </button>
                      <button 
                        onClick={() => handleDelete(exam._id)} 
                        className="text-red-600 hover:text-red-800 p-1 transition-colors"
                        title="Delete Exam"
                      >
                        <FiTrash2 className={deviceInfo.isMobile ? 'w-4 h-4' : 'w-5 h-5'} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal - Responsive */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-xl p-6 ${responsive.modalWidth} max-h-[90vh] overflow-y-auto`}>
            <h2 className={`${deviceInfo.isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-800 mb-4`}>
              {editingExam ? 'Edit Exam' : 'Schedule New Exam'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-gray-700 font-medium ${deviceInfo.isMobile ? 'text-sm' : 'text-base'} mb-1`}>
                  Exam Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${deviceInfo.isMobile ? 'text-sm' : 'text-base'}`}
                  placeholder="e.g., End of Term Examination"
                />
              </div>
              
              <div>
                <label className={`block text-gray-700 font-medium ${deviceInfo.isMobile ? 'text-sm' : 'text-base'} mb-1`}>
                  Exam Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${deviceInfo.isMobile ? 'text-sm' : 'text-base'}`}
                >
                  <option value="End of Term">End of Term</option>
                  <option value="Opener">Opener</option>
                  <option value="Mid Term">Mid Term</option>
                  <option value="Random">Random</option>
                </select>
              </div>
              
              <div>
                <label className={`block text-gray-700 font-medium ${deviceInfo.isMobile ? 'text-sm' : 'text-base'} mb-1`}>
                  Term
                </label>
                <select
                  value={formData.term}
                  onChange={(e) => setFormData({...formData, term: e.target.value})}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${deviceInfo.isMobile ? 'text-sm' : 'text-base'}`}
                >
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </div>
              
              <div>
                <label className={`block text-gray-700 font-medium ${deviceInfo.isMobile ? 'text-sm' : 'text-base'} mb-1`}>
                  Year
                </label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${deviceInfo.isMobile ? 'text-sm' : 'text-base'}`}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-gray-700 font-medium ${deviceInfo.isMobile ? 'text-sm' : 'text-base'} mb-1`}>
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${deviceInfo.isMobile ? 'text-sm' : 'text-base'}`}
                  />
                </div>
                <div>
                  <label className={`block text-gray-700 font-medium ${deviceInfo.isMobile ? 'text-sm' : 'text-base'} mb-1`}>
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${deviceInfo.isMobile ? 'text-sm' : 'text-base'}`}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-gray-700 font-medium ${deviceInfo.isMobile ? 'text-sm' : 'text-base'} mb-1`}>
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${deviceInfo.isMobile ? 'text-sm' : 'text-base'}`}
                  />
                </div>
                <div>
                  <label className={`block text-gray-700 font-medium ${deviceInfo.isMobile ? 'text-sm' : 'text-base'} mb-1`}>
                    End Time *
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${deviceInfo.isMobile ? 'text-sm' : 'text-base'}`}
                  />
                </div>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <div className="flex items-start gap-2">
                  <FiAlertCircle className={`${deviceInfo.isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-yellow-600 mt-0.5 flex-shrink-0`} />
                  <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-yellow-800`}>
                    Teachers can only upload results during the exam period. 
                    After the end time, results become read-only.
                  </p>
                </div>
              </div>
            </div>
            
            <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'space-x-3'} mt-6`}>
              <button 
                onClick={handleSubmit} 
                className={`${deviceInfo.isMobile ? 'w-full' : 'flex-1'} bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors ${deviceInfo.isMobile ? 'text-sm py-3' : ''}`}
              >
                {editingExam ? 'Update Exam' : 'Save Exam'}
              </button>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingExam(null);
                  resetForm();
                }} 
                className={`${deviceInfo.isMobile ? 'w-full' : 'flex-1'} bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors ${deviceInfo.isMobile ? 'text-sm py-3' : ''}`}
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

export default Exams;