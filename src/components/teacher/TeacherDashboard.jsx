import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  FiAlertTriangle
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
    return { 
      days: 0, 
      hours: 0, 
      minutes: 0, 
      totalSeconds: 0, 
      isExpired: true,
      isUrgent: false,
      displayText: 'Time Expired'
    };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const totalSeconds = Math.floor(diff / 1000);
  
  let displayText = '';
  let isUrgent = false;
  
  if (days > 0) {
    displayText = `${days}d ${hours}h remaining`;
    isUrgent = days <= 1;
  } else if (hours > 0) {
    displayText = `${hours}h ${minutes}m remaining`;
    isUrgent = hours <= 2;
  } else {
    displayText = `${minutes}m remaining`;
    isUrgent = minutes <= 30;
  }
  
  return { days, hours, minutes, totalSeconds, isExpired: false, isUrgent, displayText };
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
  const [announcements, setAnnouncements] = useState([]);
  const [classPerformance, setClassPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pupils, setPupils] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState({ name: '', classes: [] });
  const [examTimers, setExamTimers] = useState({});
  
  // Exam time alert state
  const [examTimeAlerts, setExamTimeAlerts] = useState([]);
  const [showTimeAlert, setShowTimeAlert] = useState(false);
  
  // Refs for cleanup
  const intervalRef = useRef(null);
  const alertIntervalRef = useRef(null);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
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
      
      setExams(examsData.slice(0, 5));
      setAnnouncements(events.slice(0, 3));
      setClassPerformance(performanceData);
      
      // Initialize exam timers
      const timers = {};
      examsData.forEach(exam => {
        if (exam.endDateTime) {
          timers[exam._id] = calculateTimeRemaining(exam.endDateTime);
        }
      });
      setExamTimers(timers);
      
      // Check exam alerts
      checkExamAlerts(examsData);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Check exam alerts
  const checkExamAlerts = useCallback((examsData) => {
    const now = new Date();
    const alerts = [];
    
    const examsToCheck = examsData || exams;
    
    examsToCheck.forEach(exam => {
      if (!exam.isActive) return;
      
      const startDateTime = exam.startDateTime ? new Date(exam.startDateTime) : null;
      const endDateTime = exam.endDateTime ? new Date(exam.endDateTime) : null;
      
      if (!startDateTime || !endDateTime) return;
      
      const timeToStart = startDateTime - now;
      const hoursToStart = timeToStart / (1000 * 60 * 60);
      
      // Check if exam is upcoming within 24 hours
      if (hoursToStart > 0 && hoursToStart <= 24) {
        const days = Math.floor(hoursToStart / 24);
        const hours = Math.floor(hoursToStart % 24);
        alerts.push({
          exam: exam,
          type: 'upcoming',
          days: days,
          hours: hours,
          minutes: Math.floor((timeToStart % (1000 * 60 * 60)) / (1000 * 60)),
          severity: hoursToStart <= 2 ? 'high' : 'medium'
        });
      }
      
      // Check if exam is currently active
      if (startDateTime <= now && endDateTime >= now) {
        const timeToEnd = endDateTime - now;
        const hoursRemaining = timeToEnd / (1000 * 60 * 60);
        const daysRemaining = Math.floor(hoursRemaining / 24);
        const hoursRemainingInDay = Math.floor(hoursRemaining % 24);
        
        // Alert if less than 24 hours remaining
        if (hoursRemaining <= 24) {
          alerts.push({
            exam: exam,
            type: 'active',
            days: daysRemaining,
            hours: hoursRemainingInDay,
            minutes: Math.floor((timeToEnd % (1000 * 60 * 60)) / (1000 * 60)),
            severity: hoursRemaining <= 2 ? 'critical' : 'high'
          });
        }
      }
    });
    
    // Sort alerts by severity and time
    alerts.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2 };
      return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
    });
    
    setExamTimeAlerts(alerts);
    setShowTimeAlert(alerts.length > 0);
  }, [exams]);

  // Update timers every minute
  useEffect(() => {
    const updateTimers = () => {
      if (exams.length > 0) {
        const newTimers = {};
        exams.forEach(exam => {
          if (exam.endDateTime) {
            newTimers[exam._id] = calculateTimeRemaining(exam.endDateTime);
          }
        });
        setExamTimers(newTimers);
      }
    };

    // Update timers immediately
    updateTimers();
    
    // Set interval for timer updates
    intervalRef.current = setInterval(updateTimers, 60000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [exams]);

  // Check alerts every minute
  useEffect(() => {
    const checkAlerts = () => {
      checkExamAlerts();
    };

    // Check alerts immediately
    checkAlerts();
    
    // Set interval for alert checks
    alertIntervalRef.current = setInterval(checkAlerts, 60000);
    
    return () => {
      if (alertIntervalRef.current) {
        clearInterval(alertIntervalRef.current);
      }
    };
  }, [checkExamAlerts]);

  // Initial load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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

  const getAlertIcon = (severity) => {
    switch(severity) {
      case 'critical': return FiAlertTriangle;
      case 'high': return FiAlertCircle;
      default: return FiClock;
    }
  };

  const getAlertColor = (severity) => {
    switch(severity) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-800';
      case 'high': return 'bg-orange-50 border-orange-200 text-orange-800';
      default: return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
  };

  const getTimeRemainingDisplay = (examId) => {
    const timer = examTimers[examId];
    if (!timer) return null;
    
    if (timer.isExpired) {
      return { text: '⏰ Time Expired', color: 'text-red-600', isUrgent: false };
    }
    
    return {
      text: timer.displayText,
      color: timer.isUrgent ? 'text-red-600 font-bold' : 'text-orange-600',
      isUrgent: timer.isUrgent
    };
  };

  const statCards = [
    { title: 'Total Students', value: stats.totalLearners, icon: FiUsers, color: 'from-blue-500 to-blue-600' },
    { title: 'CBE Competencies', value: stats.competenciesRecorded, icon: FiBookOpen, color: 'from-green-500 to-green-600' },
    { title: 'Classes Taught', value: stats.classesTaught, icon: FiTarget, color: 'from-purple-500 to-purple-600' },
    { title: 'Upcoming Assessments', value: stats.upcomingAssessments, icon: FiCalendar, color: 'from-orange-500 to-orange-600' },
  ];

  if (loading) {
    return (
      <Layout title="Teacher Dashboard" subtitle="CBE - Competency Based Education">
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

  return (
    <Layout 
      title={`${greeting}, ${user?.name || 'Teacher'}`} 
      subtitle={`CBE Teacher - ${schoolInfo.name || user?.school || 'Competency Based Education'}`}
    >
      {/* Header with Refresh Button - Aligned with Hamburger on mobile */}
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 ${
            deviceInfo.isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-2 text-sm'
          }`}
        >
          <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Dashboard'}
        </button>
      </div>

      {/* Exam Time Alerts - Enhanced with Days and Hours */}
      {showTimeAlert && examTimeAlerts.length > 0 && (
        <div className="space-y-2 mb-4">
          {examTimeAlerts.map((alert, index) => {
            const AlertIcon = getAlertIcon(alert.severity);
            const alertColor = getAlertColor(alert.severity);
            const isCritical = alert.severity === 'critical';
            const isHigh = alert.severity === 'high';
            
            let timeDisplay = '';
            if (alert.type === 'upcoming') {
              if (alert.days > 0) {
                timeDisplay = `Starts in ${alert.days}d ${alert.hours}h`;
              } else if (alert.hours > 0) {
                timeDisplay = `Starts in ${alert.hours}h ${alert.minutes}m`;
              } else {
                timeDisplay = `Starts in ${alert.minutes}m`;
              }
            } else {
              if (alert.days > 0) {
                timeDisplay = `${alert.days}d ${alert.hours}h ${alert.minutes}m remaining!`;
              } else if (alert.hours > 0) {
                timeDisplay = `${alert.hours}h ${alert.minutes}m remaining!`;
              } else {
                timeDisplay = `${alert.minutes}m remaining!`;
              }
            }
            
            return (
              <div 
                key={index} 
                className={`rounded-lg p-3 flex items-start gap-3 border ${alertColor}`}
              >
                <AlertIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isCritical ? 'text-red-600' : isHigh ? 'text-orange-600' : 'text-yellow-600'}`} />
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${isCritical ? 'text-red-800' : isHigh ? 'text-orange-800' : 'text-yellow-800'}`}>
                    {alert.type === 'active' ? '⚠️ EXAM IN PROGRESS' : '📝 UPCOMING EXAM'}
                    {isCritical && (
                      <span className="ml-2 text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full animate-pulse">
                        URGENT
                      </span>
                    )}
                  </p>
                  <p className={`text-sm ${isCritical ? 'text-red-700' : isHigh ? 'text-orange-700' : 'text-yellow-700'}`}>
                    <strong>{alert.exam.title}</strong> - {timeDisplay}
                  </p>
                  {isCritical && (
                    <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                      <FiAlertTriangle className="w-3 h-3" />
                      Less than 2 hours remaining! Submit results immediately.
                    </p>
                  )}
                  {isHigh && alert.type === 'active' && (
                    <p className="text-xs text-orange-600 font-semibold mt-1">
                      ⚠️ Less than 6 hours remaining. Please submit results soon.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Welcome Banner - AI Responsive */}
      <div className={`bg-gradient-to-r from-green-600 to-blue-600 rounded-xl ${deviceInfo.isMobile ? 'p-4' : 'p-5'} mb-6 text-white`}>
        <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-3' : 'justify-between items-center'} flex-wrap`}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FiAward className={`${deviceInfo.isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-yellow-300`} />
              <h2 className={`${deviceInfo.isMobile ? 'text-base' : 'text-xl'} font-bold`}>Welcome to Your Dashboard</h2>
            </div>
            <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} opacity-90`}>
              Track student progress, record test scores, and monitor CBE performance all in one place
            </p>
            <div className={`flex ${deviceInfo.isMobile ? 'flex-wrap gap-2' : 'items-center gap-4'} mt-3 text-xs`}>
              <span className="flex items-center gap-1">
                <FiCheckCircle className="w-3 h-3" /> TSC: {user?.tscNumber || 'Registered'}
              </span>
              <span className="flex items-center gap-1">
                <FiTarget className="w-3 h-3" /> CBE Certified
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

        {/* Upcoming Tests Section - Enhanced with Days and Hours */}
        <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding}`}>
          <h2 className={`${responsive.headingSize} font-bold text-gray-800 mb-4 flex items-center gap-2`}>
            <FiCalendar className="text-orange-600" /> Upcoming Assessments
          </h2>
          {exams.length > 0 ? (
            <div className="space-y-3">
              {exams.map((exam, index) => {
                const now = new Date();
                const startDateTime = exam.startDateTime ? new Date(exam.startDateTime) : null;
                const endDateTime = exam.endDateTime ? new Date(exam.endDateTime) : null;
                const isActive = startDateTime && endDateTime && startDateTime <= now && endDateTime >= now;
                const isUpcoming = startDateTime && startDateTime > now;
                const isExpired = endDateTime && endDateTime < now;
                const timeRemaining = exam.endDateTime ? getTimeRemainingDisplay(exam._id) : null;
                const timer = examTimers[exam._id];
                
                return (
                  <div key={index} className={`border-l-4 ${
                    isActive ? 'border-red-500' : 
                    isUpcoming ? 'border-orange-500' : 
                    isExpired ? 'border-gray-400' : 'border-gray-300'
                  } pl-3 py-2`}>
                    <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'justify-between items-start'}`}>
                      <h3 className={`${deviceInfo.isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-800`}>
                        {exam.title}
                        {isActive && (
                          <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full animate-pulse">🔴 LIVE</span>
                        )}
                        {isUpcoming && (
                          <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">UPCOMING</span>
                        )}
                        {isExpired && (
                          <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">EXPIRED</span>
                        )}
                      </h3>
                    </div>
                    <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600`}>
                      {exam.type || 'Competency Assessment'} • {exam.term || 'Current Term'}
                    </p>
                    <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'items-center gap-3'} mt-1`}>
                      <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500`}>
                        📅 {startDateTime ? startDateTime.toLocaleDateString() : 'Date TBA'}
                      </p>
                      {endDateTime && (
                        <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500`}>
                          Ends: {endDateTime.toLocaleDateString()} at {endDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                    
                    {/* Enhanced Time Remaining Display */}
                    {timeRemaining && timer && !timer.isExpired && exam.isActive !== false && (
                      <div className={`mt-2 flex items-center gap-2 ${timeRemaining.color} ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>
                        <FiClock className={deviceInfo.isMobile ? 'w-3 h-3' : 'w-4 h-4'} />
                        <span className="font-semibold">
                          ⏰ {timeRemaining.text}
                        </span>
                        {isActive && timer.days === 0 && timer.hours < 2 && timer.hours > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold animate-pulse">
                            CRITICAL
                          </span>
                        )}
                      </div>
                    )}
                    
                    {isExpired && (
                      <div className={`mt-2 flex items-center gap-2 text-red-600 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>
                        <FiAlertCircle className={deviceInfo.isMobile ? 'w-3 h-3' : 'w-4 h-4'} />
                        <span className="font-semibold">This exam has ended</span>
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
            Manage Exams
          </p>
        </Link>
      </div>

      {/* AI Responsive CSS - Vercel Compatible */}
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
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </Layout>
  );
};

export default TeacherDashboard;