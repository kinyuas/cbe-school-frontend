import React, { useState, useEffect } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import { 
  FiUsers, 
  FiBookOpen, 
  FiCalendar, 
  FiAward, 
  FiTarget, 
  FiTrendingUp, 
  FiClock,
  FiCheckCircle,
  FiBarChart2,
  FiMonitor,
  FiSmartphone,
  FiTablet,
  FiAlertCircle,
  FiRefreshCw,
  FiHourglass
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

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
    gridGap: deviceInfo.isMobile ? 'gap-3' : 'gap-5',
    statsGrid: deviceInfo.isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4',
    quickActionsGrid: deviceInfo.isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'
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

// ===== Get Time Remaining Display =====
const getTimeRemainingDisplay = (exam, examTimers) => {
  const timer = examTimers[exam._id];
  if (!timer) return null;
  
  if (timer.isExpired) {
    return { 
      text: 'Time Expired', 
      color: 'text-red-600', 
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      icon: FiAlertCircle,
      urgency: 'expired'
    };
  }
  
  if (timer.days > 0) {
    if (timer.days <= 2) {
      return { 
        text: `${timer.days}d ${timer.hours}h remaining`, 
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-300',
        icon: FiHourglass,
        urgency: 'urgent'
      };
    }
    return { 
      text: `${timer.days}d ${timer.hours}h remaining`, 
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
      icon: FiClock,
      urgency: 'normal'
    };
  }
  
  if (timer.hours > 0) {
    if (timer.hours <= 2) {
      return { 
        text: `${timer.hours}h ${timer.minutes}m remaining - CRITICAL!`, 
        color: 'text-red-600 font-bold',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-300',
        icon: FiAlertCircle,
        urgency: 'critical'
      };
    }
    return { 
      text: `${timer.hours}h ${timer.minutes}m remaining`, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
      icon: FiHourglass,
      urgency: 'urgent'
    };
  }
  
  return { 
    text: `${timer.minutes}m remaining - HURRY!`, 
    color: 'text-red-600 font-bold',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    icon: FiAlertCircle,
    urgency: 'critical'
  };
};

const TeacherDashboard = () => {
  // AI Device Detection
  const deviceInfo = useDeviceDetection();
  const responsive = useResponsiveClasses(deviceInfo);
  
  const { user } = useAuth();
  
  // Store all dashboard numbers
  const [stats, setStats] = useState({
    totalLearners: 0,
    competenciesRecorded: 0,
    classesTaught: 0,
    upcomingAssessments: 0,
    attendance: 0,
    events: 0
  });
  
  const [exams, setExams] = useState([]);
  const [examTimers, setExamTimers] = useState({});
  const [announcements, setAnnouncements] = useState([]);
  const [classPerformance, setClassPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pupils, setPupils] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState({ name: '', classes: [] });
  
  // Exam time alert state
  const [examTimeAlerts, setExamTimeAlerts] = useState([]);
  const [showTimeAlert, setShowTimeAlert] = useState(false);

  useEffect(() => {
    loadDashboardData();
    // Check for exam time alerts every 30 seconds for better accuracy
    const interval = setInterval(() => {
      checkExamTimeAlerts();
      updateExamTimers();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update timers when exams change
  useEffect(() => {
    if (exams.length > 0) {
      updateExamTimers();
    }
  }, [exams]);

  // Update exam timers
  const updateExamTimers = () => {
    if (exams.length === 0) return;
    
    const newTimers = {};
    exams.forEach(exam => {
      if (exam.endDateTime) {
        newTimers[exam._id] = calculateTimeRemaining(exam.endDateTime);
      } else if (exam.endDate) {
        // Fallback for older exam format
        const endDateTime = new Date(exam.endDate);
        if (!isNaN(endDateTime.getTime())) {
          newTimers[exam._id] = calculateTimeRemaining(endDateTime);
        }
      }
    });
    setExamTimers(newTimers);
  };

  // Check exam time alerts with enhanced logic
  const checkExamTimeAlerts = () => {
    const now = new Date();
    const alerts = [];
    
    exams.forEach(exam => {
      if (exam.startDateTime && exam.endDateTime) {
        const start = new Date(exam.startDateTime);
        const end = new Date(exam.endDateTime);
        
        // Check if exam is upcoming
        const timeToStart = start - now;
        const hoursToStart = timeToStart / (1000 * 60 * 60);
        
        if (hoursToStart > 0 && hoursToStart <= 24) {
          const daysToStart = Math.floor(hoursToStart / 24);
          const remainingHours = Math.floor(hoursToStart % 24);
          
          alerts.push({
            exam: exam,
            type: 'upcoming',
            days: daysToStart,
            hours: remainingHours,
            minutes: Math.floor((timeToStart % (1000 * 60 * 60)) / (1000 * 60)),
            urgency: daysToStart === 0 && remainingHours <= 2 ? 'high' : 'medium'
          });
        }
        
        // Check if exam is currently active
        if (start <= now && end >= now) {
          const timeToEnd = end - now;
          const daysRemaining = timeToEnd / (1000 * 60 * 60 * 24);
          const hoursRemaining = (timeToEnd % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60);
          
          // Always show alert for active exams
          alerts.push({
            exam: exam,
            type: 'active',
            days: Math.floor(daysRemaining),
            hours: Math.floor(hoursRemaining),
            minutes: Math.floor((timeToEnd % (1000 * 60 * 60)) / (1000 * 60)),
            urgency: daysRemaining < 1 && hoursRemaining < 2 ? 'critical' : 'high'
          });
        }
      }
    });
    
    // Sort alerts by urgency
    const sortedAlerts = alerts.sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2 };
      return (urgencyOrder[a.urgency] || 3) - (urgencyOrder[b.urgency] || 3);
    });
    
    setExamTimeAlerts(sortedAlerts);
    setShowTimeAlert(sortedAlerts.length > 0);
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load school info
      const schoolResponse = await api.get('/school/settings');
      if (schoolResponse.data.success && schoolResponse.data.data) {
        const school = schoolResponse.data.data;
        setSchoolInfo(school);
      }
      
      // Fetch all data from API
      const [pupilsRes, resultsRes, eventsRes, examsRes] = await Promise.all([
        api.get('/pupils'),
        api.get('/results'),
        api.get('/events'),
        api.get('/exams')
      ]);
      
      const learners = pupilsRes.data?.data || [];
      const results = resultsRes.data?.data || [];
      const events = eventsRes.data?.data || [];
      const examsData = examsRes.data?.data || [];
      
      setPupils(learners);
      setExams(examsData);
      
      // Find all unique classes
      const uniqueClasses = [...new Set(learners.map(l => l.class || l.grade).filter(Boolean))];
      
      // Calculate class performance
      const performanceByClass = {};
      learners.forEach(learner => {
        const learnerResults = results.filter(r => r.pupilId === learner._id);
        if (learnerResults.length > 0) {
          const avgScore = learnerResults.reduce((sum, r) => sum + (r.marks || 0), 0) / learnerResults.length;
          const className = learner.class || learner.grade;
          
          if (!performanceByClass[className]) {
            performanceByClass[className] = { total: 0, count: 0, scores: [] };
          }
          performanceByClass[className].total += avgScore;
          performanceByClass[className].count++;
          performanceByClass[className].scores.push(avgScore);
        }
      });
      
      const performanceData = Object.entries(performanceByClass).map(([className, data]) => ({
        class: className,
        average: data.count > 0 ? (data.total / data.count).toFixed(1) : 0,
        students: data.count,
        passing: data.scores.filter(s => s >= 60).length,
        failing: data.scores.filter(s => s < 60).length
      }));
      
      // Update stats
      setStats({
        totalLearners: learners.length,
        competenciesRecorded: results.length,
        classesTaught: uniqueClasses.length,
        upcomingAssessments: examsData.filter(e => e.isActive !== false).length,
        attendance: 92,
        events: events.length
      });
      
      setAnnouncements(events.slice(0, 3));
      setClassPerformance(performanceData);
      
      // Update timers and check alerts
      updateExamTimers();
      checkExamTimeAlerts();
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    toast.success('Dashboard refreshed');
  };

  const getBadgeColor = (score) => {
    if (score >= 80) return 'bg-purple-100 text-purple-800';
    if (score >= 60) return 'bg-green-100 text-green-800';
    if (score >= 40) return 'bg-blue-100 text-blue-800';
    if (score >= 20) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getPerformanceText = (score) => {
    if (score >= 80) return 'Exceeding Expectation (EE) - Excellent';
    if (score >= 60) return 'Meeting Expectation (ME) - Good';
    if (score >= 40) return 'Approaching Expectation (AE) - Getting There';
    if (score >= 20) return 'Below Expectation (BE) - Needs Improvement';
    return 'Well Below Expectation (WBE) - Needs Urgent Help';
  };

  const statCards = [
    { title: 'Total Students', value: stats.totalLearners, icon: FiUsers, color: 'from-blue-500 to-blue-600' },
    { title: 'CBC Competencies', value: stats.competenciesRecorded, icon: FiBookOpen, color: 'from-green-500 to-green-600' },
    { title: 'Classes Taught', value: stats.classesTaught, icon: FiTarget, color: 'from-purple-500 to-purple-600' },
    { title: 'Upcoming Assessments', value: stats.upcomingAssessments, icon: FiCalendar, color: 'from-orange-500 to-orange-600' },
  ];

  if (loading) {
    return (
      <Layout title="Teacher Dashboard" subtitle="CBC - Competency Based Education">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  const currentHour = new Date().getHours();
  let greeting = "Teacher";
  if (currentHour < 12) greeting = "Good Morning";
  else if (currentHour < 17) greeting = "Good Afternoon";
  else greeting = "Good Evening";

  // Count active exams with critical time
  const criticalExams = exams.filter(exam => {
    const timer = examTimers[exam._id];
    if (!timer || timer.isExpired) return false;
    const isActive = exam.startDateTime && new Date(exam.startDateTime) <= new Date() && new Date(exam.endDateTime) >= new Date();
    if (!isActive) return false;
    return timer.days === 0 && timer.hours < 2;
  });

  return (
    <Layout 
      title={`${greeting}, ${user?.name || 'Teacher'}`} 
      subtitle={`CBC Teacher - ${schoolInfo.name || user?.school || 'Competency Based Education'}`}
    >
      {/* Critical Exam Alert Banner */}
      {criticalExams.length > 0 && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-600 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="text-sm font-bold text-red-800">
                ⚠️ {criticalExams.length} Exam{criticalExams.length > 1 ? 's' : ''} Ending Soon!
              </p>
              <p className="text-sm text-red-700">
                {criticalExams.map((exam, idx) => {
                  const timer = examTimers[exam._id];
                  return `${idx + 1}. ${exam.title} - ${timer.hours}h ${timer.minutes}m remaining`;
                }).join(' | ')}
              </p>
              <p className="text-xs text-red-600 mt-1">
                Please ensure all results are submitted before the exam ends.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Exam Time Alerts - Enhanced */}
      {showTimeAlert && examTimeAlerts.length > 0 && (
        <div className="space-y-2 mb-4">
          {examTimeAlerts.slice(0, 5).map((alert, index) => {
            const isCritical = alert.urgency === 'critical';
            const isHigh = alert.urgency === 'high';
            
            return (
              <div 
                key={index} 
                className={`rounded-lg p-3 flex items-start gap-3 border ${
                  isCritical 
                    ? 'bg-red-50 border-red-300 animate-pulse' 
                    : isHigh 
                      ? 'bg-orange-50 border-orange-300' 
                      : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <FiAlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  isCritical ? 'text-red-600' : isHigh ? 'text-orange-600' : 'text-yellow-600'
                }`} />
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${
                    isCritical ? 'text-red-800' : isHigh ? 'text-orange-800' : 'text-yellow-800'
                  }`}>
                    {alert.type === 'active' ? '⏰ EXAM IN PROGRESS' : '📝 UPCOMING EXAM'}
                    {isCritical && ' - CRITICAL!'}
                  </p>
                  <p className={`text-sm ${
                    isCritical ? 'text-red-700' : isHigh ? 'text-orange-700' : 'text-yellow-700'
                  }`}>
                    <strong>{alert.exam.title}</strong>
                    {alert.type === 'active' 
                      ? ` - ${alert.days > 0 ? `${alert.days}d ` : ''}${alert.hours}h ${alert.minutes}m remaining!` 
                      : ` - Starts in ${alert.days > 0 ? `${alert.days}d ` : ''}${alert.hours}h ${alert.minutes}m`}
                  </p>
                  {alert.type === 'active' && alert.days === 0 && alert.hours < 1 && (
                    <p className="text-xs text-red-600 font-bold mt-1 animate-pulse">
                      ⚠️ Less than 1 hour remaining! Submit results immediately!
                    </p>
                  )}
                  {alert.type === 'active' && alert.days === 0 && alert.hours < 2 && alert.hours >= 1 && (
                    <p className="text-xs text-orange-600 font-semibold mt-1">
                      ⏰ Less than 2 hours remaining! Submit results quickly.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Device Detection Badge - Optional */}
      <div className="flex justify-between items-center mb-4">
        <div className={`flex items-center gap-2 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-500 bg-gray-100 px-3 py-1 rounded-full`}>
          {deviceInfo.isMobile ? (
            <>
              <FiSmartphone className="w-4 h-4" /> Mobile View
            </>
          ) : deviceInfo.isTablet ? (
            <>
              <FiTablet className="w-4 h-4" /> Tablet View
            </>
          ) : (
            <>
              <FiMonitor className="w-4 h-4" /> Desktop View
            </>
          )}
        </div>
        
        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 ${
            deviceInfo.isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-2 text-sm'
          }`}
        >
          <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Welcome Banner - AI Responsive */}
      <div className={`bg-gradient-to-r from-green-600 to-blue-600 rounded-xl ${deviceInfo.isMobile ? 'p-4' : 'p-5'} mb-6 text-white`}>
        <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-3' : 'justify-between items-center'} flex-wrap`}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FiAward className={`${deviceInfo.isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-yellow-300`} />
              <h2 className={`${deviceInfo.isMobile ? 'text-base' : 'text-xl'} font-bold`}>Welcome to Your Dashboard</h2>
            </div>
            <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} opacity-90`}>
              Track student progress, record test scores, and monitor CBC performance all in one place
            </p>
            <div className={`flex ${deviceInfo.isMobile ? 'flex-wrap gap-2' : 'items-center gap-4'} mt-3 text-xs`}>
              <span className="flex items-center gap-1">
                <FiCheckCircle className="w-3 h-3" /> TSC: {user?.tscNumber || 'Registered'}
              </span>
              <span className="flex items-center gap-1">
                <FiTarget className="w-3 h-3" /> CBC Certified
              </span>
              <span className="flex items-center gap-1">
                <FiBookOpen className="w-3 h-3" /> {stats.classesTaught} Classes
              </span>
            </div>
          </div>
          {!deviceInfo.isMobile && (
            <div className="text-right">
              <p className="text-2xl font-bold">{stats.totalLearners}</p>
              <p className="text-xs opacity-80">Total Students</p>
            </div>
          )}
        </div>
        {deviceInfo.isMobile && (
          <div className="mt-3 pt-3 border-t border-white/20 flex justify-between">
            <div>
              <p className="text-lg font-bold">{stats.totalLearners}</p>
              <p className="text-[10px] opacity-80">Total Students</p>
            </div>
            <div>
              <p className="text-lg font-bold">{stats.classesTaught}</p>
              <p className="text-[10px] opacity-80">Classes</p>
            </div>
            <div>
              <p className="text-lg font-bold">{stats.upcomingAssessments}</p>
              <p className="text-[10px] opacity-80">Upcoming Tests</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats Cards - AI Responsive */}
      <div className={`grid ${responsive.statsGrid} ${responsive.gridGap} mb-6`}>
        {statCards.map((stat, index) => (
          <div key={index} className={`bg-white rounded-xl shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-5'} hover:shadow-lg transition-shadow`}>
            <div className={`flex ${deviceInfo.isMobile ? 'items-center gap-3' : 'items-center justify-between'}`}>
              <div>
                <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-sm'} text-gray-500`}>{stat.title}</p>
                <p className={`${deviceInfo.isMobile ? 'text-xl' : 'text-3xl'} font-bold text-gray-800 mt-0.5`}>{stat.value}</p>
              </div>
              <div className={`bg-gradient-to-r ${stat.color} ${deviceInfo.isMobile ? 'p-2' : 'p-3'} rounded-full shadow-lg`}>
                <stat.icon className={`${deviceInfo.isMobile ? 'w-4 h-4' : 'w-6 h-6'} text-white`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-1' : 'lg:grid-cols-2'} gap-6 mb-6`}>
        
        {/* Class Performance Section - AI Responsive */}
        <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding}`}>
          <h2 className={`${responsive.headingSize} font-bold text-gray-800 mb-4 flex items-center gap-2`}>
            <FiBarChart2 className="text-green-600" /> Class Performance
          </h2>
          {classPerformance.length > 0 ? (
            <div className="space-y-3">
              {classPerformance.map((cls, index) => (
                <div key={index}>
                  <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'justify-between'} text-sm mb-1`}>
                    <span className="font-medium">{cls.class}</span>
                    <div className={`flex ${deviceInfo.isMobile ? 'flex-wrap gap-2' : 'gap-3'}`}>
                      <span className="text-green-600 text-xs">✓ {cls.passing}</span>
                      <span className="text-red-600 text-xs">✗ {cls.failing}</span>
                      <span className="font-bold text-xs">Avg: {cls.average}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`rounded-full h-2 transition-all ${
                        cls.average >= 80 ? 'bg-purple-500' :
                        cls.average >= 60 ? 'bg-green-500' :
                        cls.average >= 40 ? 'bg-blue-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(cls.average, 100)}%` }}
                    />
                  </div>
                  <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500 mt-1`}>
                    {cls.students} students
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No performance data available yet</p>
          )}
          <Link to="/teacher/performance" className={`block text-center ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-green-600 hover:text-green-800 mt-4`}>
            View Detailed Class Performance →
          </Link>
        </div>

        {/* Upcoming Tests Section - Enhanced with Time Remaining in Days and Hours */}
        <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding}`}>
          <h2 className={`${responsive.headingSize} font-bold text-gray-800 mb-4 flex items-center gap-2`}>
            <FiCalendar className="text-orange-600" /> Upcoming Assessments
          </h2>
          {exams.length > 0 ? (
            <div className="space-y-3">
              {exams.slice(0, 5).map((exam, index) => {
                const now = new Date();
                const startDate = exam.startDateTime ? new Date(exam.startDateTime) : null;
                const endDate = exam.endDateTime ? new Date(exam.endDateTime) : null;
                const isActive = startDate && endDate && startDate <= now && endDate >= now;
                const isUpcoming = startDate && startDate > now;
                const isExpired = endDate && endDate < now;
                
                const timeDisplay = endDate ? getTimeRemainingDisplay(exam, examTimers) : null;
                const timer = examTimers[exam._id];
                
                // Determine urgency level for visual feedback
                let urgencyLevel = 'normal';
                if (isActive && timer && !timer.isExpired) {
                  if (timer.days === 0 && timer.hours < 2) urgencyLevel = 'critical';
                  else if (timer.days === 0 && timer.hours < 6) urgencyLevel = 'urgent';
                }
                
                return (
                  <div 
                    key={index} 
                    className={`border-l-4 ${
                      isActive ? 'border-green-500' : 
                      isUpcoming ? 'border-blue-500' : 
                      isExpired ? 'border-gray-300' : 'border-gray-300'
                    } pl-3 py-2 ${urgencyLevel === 'critical' ? 'bg-red-50 rounded-r-lg' : ''} ${urgencyLevel === 'urgent' ? 'bg-orange-50 rounded-r-lg' : ''}`}
                  >
                    <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'justify-between items-start'}`}>
                      <h3 className={`${deviceInfo.isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-800`}>
                        {exam.title}
                        {isActive && (
                          <span className={`ml-2 text-xs ${urgencyLevel === 'critical' ? 'bg-red-500 text-white animate-pulse' : urgencyLevel === 'urgent' ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'} px-2 py-0.5 rounded-full`}>
                            {urgencyLevel === 'critical' ? '⚠️ CRITICAL' : urgencyLevel === 'urgent' ? '⚠️ URGENT' : 'LIVE'}
                          </span>
                        )}
                        {isUpcoming && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">UPCOMING</span>
                        )}
                        {isExpired && (
                          <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">EXPIRED</span>
                        )}
                      </h3>
                    </div>
                    <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600`}>
                      {exam.type || 'Competency Assessment'} • {exam.term || 'Current Term'}
                    </p>
                    <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'flex-wrap items-center gap-3'} mt-1`}>
                      <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500 flex items-center gap-1`}>
                        <FiCalendar className="w-3 h-3" />
                        {startDate ? startDate.toLocaleDateString() : 'Date TBA'}
                        {startDate && (
                          <span className="text-gray-400 ml-1">
                            {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </p>
                      {endDate && (
                        <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500 flex items-center gap-1`}>
                          <FiClock className="w-3 h-3" />
                          Ends: {endDate.toLocaleDateString()}
                          <span className="text-gray-400 ml-1">
                            {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                      )}
                    </div>
                    
                    {/* Enhanced Time Remaining Display */}
                    {timeDisplay && !isExpired && exam.isActive !== false && (
                      <div className={`mt-2 flex items-center gap-2 ${timeDisplay.color} ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} ${timeDisplay.bgColor} p-2 rounded-lg border ${timeDisplay.borderColor}`}>
                        <timeDisplay.icon className={`${deviceInfo.isMobile ? 'w-3 h-3' : 'w-4 h-4'} flex-shrink-0`} />
                        <span className="font-semibold">{timeDisplay.text}</span>
                        {isActive && (
                          <span className={`ml-auto text-xs font-bold ${timeDisplay.color} ${timeDisplay.urgency === 'critical' ? 'animate-pulse' : ''}`}>
                            {urgencyLevel === 'critical' ? '⏰ HURRY!' : urgencyLevel === 'urgent' ? '⏳ Time running out!' : '✓ In progress'}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Progress Bar for Active Exams */}
                    {isActive && endDate && timer && !timer.isExpired && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-1000 ${
                              urgencyLevel === 'critical' ? 'bg-red-500' : 
                              urgencyLevel === 'urgent' ? 'bg-orange-500' : 'bg-green-500'
                            }`}
                            style={{ 
                              width: `${Math.max(0, Math.min(100, 100 - ((timer.totalSeconds / ((new Date(exam.endDateTime) - new Date(exam.startDateTime)) / 1000)) * 100)))}%` 
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No upcoming assessments scheduled</p>
          )}
          <Link to="/teacher/exams" className={`block text-center ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-orange-600 hover:text-orange-800 mt-4`}>
            View All Assessments →
          </Link>
        </div>
      </div>

      <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-1' : 'lg:grid-cols-1'} gap-6 mb-6`}>
        
        {/* School Announcements Section - AI Responsive */}
        <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding}`}>
          <h2 className={`${responsive.headingSize} font-bold text-gray-800 mb-4 flex items-center gap-2`}>
            <FiTrendingUp className="text-blue-600" /> School Announcements
          </h2>
          {announcements.length > 0 ? (
            <div className="space-y-3">
              {announcements.map((announcement, index) => (
                <div key={index} className="border-b border-gray-100 pb-3 last:border-0">
                  <h3 className={`${deviceInfo.isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-800`}>
                    {announcement.title}
                  </h3>
                  <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500 mt-1`}>
                    📅 {announcement.date ? new Date(announcement.date).toLocaleDateString() : new Date(announcement.createdAt).toLocaleDateString()}
                  </p>
                  <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mt-1 line-clamp-2`}>
                    {announcement.description}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No announcements yet</p>
          )}
          <Link to="/teacher/announcements" className={`block text-center ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-blue-600 hover:text-blue-800 mt-4`}>
            View All Announcements →
          </Link>
        </div>
      </div>

      {/* Quick Actions - AI Responsive */}
      <div className={`grid ${responsive.quickActionsGrid} gap-3`}>
        <Link to="/teacher/results" className="bg-green-100 hover:bg-green-200 p-3 rounded-lg text-center transition-colors">
          <FiBookOpen className={`${deviceInfo.isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-green-600 mx-auto mb-1`} />
          <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-medium text-green-700`}>
            Record Competencies
          </p>
        </Link>
        <Link to="/teacher/students" className="bg-blue-100 hover:bg-blue-200 p-3 rounded-lg text-center transition-colors">
          <FiUsers className={`${deviceInfo.isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-blue-600 mx-auto mb-1`} />
          <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-medium text-blue-700`}>
            View All Students
          </p>
        </Link>
        <Link to="/teacher/performance" className="bg-purple-100 hover:bg-purple-200 p-3 rounded-lg text-center transition-colors">
          <FiBarChart2 className={`${deviceInfo.isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-purple-600 mx-auto mb-1`} />
          <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-medium text-purple-700`}>
            Performance Reports
          </p>
        </Link>
        <Link to="/teacher/exams" className="bg-orange-100 hover:bg-orange-200 p-3 rounded-lg text-center transition-colors">
          <FiCalendar className={`${deviceInfo.isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-orange-600 mx-auto mb-1`} />
          <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-medium text-orange-700`}>
            View Exams
          </p>
        </Link>
      </div>

      {/* AI Responsive CSS */}
      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-view .p-6 {
            padding: 16px !important;
          }
          .mobile-view .gap-6 {
            gap: 16px !important;
          }
          .mobile-view .text-xl {
            font-size: 1.125rem !important;
          }
          .mobile-view .text-3xl {
            font-size: 1.5rem !important;
          }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .tablet-view .grid-cols-2 {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        .responsive-wrapper {
          transition: all 0.3s ease;
        }
        .stat-card {
          transition: all 0.3s ease;
        }
        .stat-card:hover {
          transform: translateY(-2px);
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse {
          animation: pulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </Layout>
  );
};

export default TeacherDashboard;