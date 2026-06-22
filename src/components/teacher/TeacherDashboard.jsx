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
  FiRefreshCw
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
  const [recentActivities, setRecentActivities] = useState([]);
  const [pupils, setPupils] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState({ name: '', classes: [] });
  
  // Exam time alert state
  const [examTimeAlerts, setExamTimeAlerts] = useState([]);
  const [showTimeAlert, setShowTimeAlert] = useState(false);

  useEffect(() => {
    loadDashboardData();
    // Check for exam time alerts every minute
    const interval = setInterval(checkExamTimeAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  // Check exam time alerts
  const checkExamTimeAlerts = () => {
    const now = new Date();
    const alerts = [];
    
    exams.forEach(exam => {
      if (exam.startDate && exam.endDate) {
        const start = new Date(exam.startDate);
        const end = new Date(exam.endDate);
        
        // Check if exam is upcoming within 24 hours
        const timeToStart = start - now;
        const hoursToStart = timeToStart / (1000 * 60 * 60);
        
        if (hoursToStart > 0 && hoursToStart <= 24) {
          alerts.push({
            exam: exam,
            type: 'upcoming',
            hours: Math.floor(hoursToStart),
            minutes: Math.floor((timeToStart % (1000 * 60 * 60)) / (1000 * 60))
          });
        }
        
        // Check if exam is currently active
        if (start <= now && end >= now) {
          const timeToEnd = end - now;
          const hoursRemaining = timeToEnd / (1000 * 60 * 60);
          
          // Alert if less than 2 hours remaining
          if (hoursRemaining <= 2) {
            alerts.push({
              exam: exam,
              type: 'active',
              hours: Math.floor(hoursRemaining),
              minutes: Math.floor((timeToEnd % (1000 * 60 * 60)) / (1000 * 60))
            });
          }
        }
      }
    });
    
    setExamTimeAlerts(alerts);
    setShowTimeAlert(alerts.length > 0);
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
      
      setExams(examsData.slice(0, 3));
      setAnnouncements(events.slice(0, 3));
      setClassPerformance(performanceData);
      
      // Get recent activities (last 5)
      const recent = [...results].sort((a, b) => 
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      ).slice(0, 5);
      
      setRecentActivities(recent);
      
      // Check exam alerts
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

  return (
    <Layout 
      title={`${greeting}, ${user?.name || 'Teacher'}`} 
      subtitle={`CBC Teacher - ${schoolInfo.name || user?.school || 'Competency Based Education'}`}
    >
      {/* Exam Time Alerts */}
      {showTimeAlert && examTimeAlerts.length > 0 && (
        <div className="space-y-2 mb-4">
          {examTimeAlerts.map((alert, index) => (
            <div 
              key={index} 
              className={`rounded-lg p-3 flex items-start gap-3 border ${
                alert.type === 'active' 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <FiAlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                alert.type === 'active' ? 'text-red-600' : 'text-yellow-600'
              }`} />
              <div className="flex-1">
                <p className={`text-sm font-semibold ${
                  alert.type === 'active' ? 'text-red-800' : 'text-yellow-800'
                }`}>
                  {alert.type === 'active' ? '⚠️ EXAM IN PROGRESS' : '📝 UPCOMING EXAM'}
                </p>
                <p className={`text-sm ${
                  alert.type === 'active' ? 'text-red-700' : 'text-yellow-700'
                }`}>
                  <strong>{alert.exam.title}</strong>
                  {alert.type === 'active' 
                    ? ` - ${alert.hours}h ${alert.minutes}m remaining!` 
                    : ` - Starts in ${alert.hours}h ${alert.minutes}m`}
                </p>
                {alert.type === 'active' && alert.hours < 1 && (
                  <p className="text-xs text-red-600 font-semibold mt-1">
                    ⚠️ Less than 1 hour remaining! Submit results quickly.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-end mb-4">
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

        {/* Upcoming Tests Section - AI Responsive */}
        <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding}`}>
          <h2 className={`${responsive.headingSize} font-bold text-gray-800 mb-4 flex items-center gap-2`}>
            <FiCalendar className="text-orange-600" /> Upcoming Assessments
          </h2>
          {exams.length > 0 ? (
            <div className="space-y-3">
              {exams.map((exam, index) => {
                const now = new Date();
                const startDate = exam.startDate ? new Date(exam.startDate) : null;
                const endDate = exam.endDate ? new Date(exam.endDate) : null;
                const isActive = startDate && endDate && startDate <= now && endDate >= now;
                const isUpcoming = startDate && startDate > now;
                
                return (
                  <div key={index} className={`border-l-4 ${isActive ? 'border-red-500' : isUpcoming ? 'border-orange-500' : 'border-gray-300'} pl-3 py-2`}>
                    <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'justify-between items-start'}`}>
                      <h3 className={`${deviceInfo.isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-800`}>
                        {exam.title}
                        {isActive && (
                          <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">ACTIVE</span>
                        )}
                        {isUpcoming && (
                          <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">UPCOMING</span>
                        )}
                      </h3>
                    </div>
                    <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600`}>
                      {exam.type || 'Competency Assessment'} • {exam.term || 'Current Term'}
                    </p>
                    <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'items-center gap-3'} mt-1`}>
                      <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500`}>
                        📅 {startDate ? startDate.toLocaleDateString() : 'Date TBA'}
                      </p>
                      {endDate && (
                        <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500`}>
                          Ends: {endDate.toLocaleDateString()}
                        </p>
                      )}
                      {isActive && endDate && (
                        <p className="text-xs text-red-600 font-semibold">
                          ⏰ {Math.max(0, Math.floor((endDate - now) / (1000 * 60 * 60)))}h remaining
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No upcoming assessments scheduled</p>
          )}
          <Link to="/teacher/results" className={`block text-center ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-orange-600 hover:text-orange-800 mt-4`}>
            Record New Test Results →
          </Link>
        </div>
      </div>

      <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-1' : 'lg:grid-cols-2'} gap-6 mb-6`}>
        
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

        {/* Recent Activities - AI Responsive */}
        <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding}`}>
          <h2 className={`${responsive.headingSize} font-bold text-gray-800 mb-4 flex items-center gap-2`}>
            <FiClock className="text-purple-600" /> Recent Competency Records
          </h2>
          {recentActivities.length > 0 ? (
            <div className="space-y-2">
              {recentActivities.map((activity, index) => {
                const student = pupils.find(l => l._id === activity.pupilId);
                return (
                  <div key={index} className={`flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'items-center justify-between'} p-2 bg-gray-50 rounded-lg`}>
                    <div>
                      <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-800`}>
                        {student?.name || 'Unknown Student'}
                      </p>
                      <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500`}>
                        {activity.subject || activity.learningArea}
                      </p>
                    </div>
                    <div className={`text-right ${deviceInfo.isMobile ? 'mt-1' : ''}`}>
                      <span className={`px-2 py-0.5 text-[10px] rounded-full ${getBadgeColor(activity.marks)}`}>
                        {getPerformanceText(activity.marks)}
                      </span>
                      <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-400 mt-0.5`}>
                        Score: {activity.marks}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No competency records yet</p>
          )}
          <Link to="/teacher/results" className={`block text-center ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-purple-600 hover:text-purple-800 mt-4`}>
            Record New Competencies →
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
        <Link to="/teacher/announcements" className="bg-orange-100 hover:bg-orange-200 p-3 rounded-lg text-center transition-colors">
          <FiCalendar className={`${deviceInfo.isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-orange-600 mx-auto mb-1`} />
          <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-medium text-orange-700`}>
            School Events
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
      `}</style>
    </Layout>
  );
};

export default TeacherDashboard;