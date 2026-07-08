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
  FiAlertTriangle,
  FiUserCheck,
  FiInfo,
  FiPlus
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
  const teacherId = user?._id || user?.id || user?.teacherId;
  const teacherName = user?.name || user?.username || '';
  
  // Store all dashboard numbers
  const [stats, setStats] = useState({
    totalLearners: 0,
    uploadedResults: 0,
    competenciesRecorded: 0,
    classesTaught: 0,
    UpcomingExams: 0,
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
  const [teacherResults, setTeacherResults] = useState([]);
  const [activeExam, setActiveExam] = useState(null);
  const [teacherClass, setTeacherClass] = useState('');
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  
  // Exam time alert state
  const [examTimeAlerts, setExamTimeAlerts] = useState([]);
  const [showTimeAlert, setShowTimeAlert] = useState(false);
  
  // Refs for cleanup
  const intervalRef = useRef(null);
  const alertIntervalRef = useRef(null);

  // Helper function to find pupil by ID (handles both string and object IDs)
  const findPupilById = (pupilId, learners) => {
    if (!pupilId) return null;
    const pupilIdStr = String(pupilId);
    return learners.find(p => {
      const pId = p._id?._id || p._id || p.id;
      return String(pId) === pupilIdStr;
    });
  };

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      console.log('📊 Loading teacher dashboard data...');
      console.log('👤 User:', user);
      console.log('🆔 Teacher ID:', teacherId);
      console.log('📛 Teacher Name:', teacherName);
      
      // Load school info
      try {
        const schoolResponse = await api.get('/school/settings');
        if (schoolResponse.data?.success && schoolResponse.data?.data) {
          const school = schoolResponse.data.data;
          setSchoolInfo(school);
          console.log('✅ School info loaded');
        }
      } catch (err) {
        console.log('⚠️ Could not load school info:', err.message);
      }
      
      // Fetch all data from API
      let learners = [];
      let allResults = [];
      let events = [];
      let examsData = [];
      
      // Fetch pupils
      try {
        const pupilsRes = await api.get('/pupils');
        if (pupilsRes.data?.success) {
          learners = pupilsRes.data.data || [];
          console.log(`✅ Loaded ${learners.length} learners`);
        }
      } catch (err) {
        console.error('❌ Error loading pupils:', err);
      }
      
      // Fetch results
      try {
        const resultsRes = await api.get('/results');
        if (resultsRes.data?.success) {
          allResults = resultsRes.data.data || [];
          console.log(`✅ Loaded ${allResults.length} total results from database`);
          
          // Log sample results to see structure
          if (allResults.length > 0) {
            console.log('📋 Sample result structure:', JSON.stringify(allResults[0], null, 2));
          }
        }
      } catch (err) {
        console.error('❌ Error loading results:', err);
      }
      
      // Fetch events
      try {
        const eventsRes = await api.get('/events');
        if (eventsRes.data?.success) {
          events = eventsRes.data.data || [];
          console.log(`✅ Loaded ${events.length} events`);
        }
      } catch (err) {
        console.error('❌ Error loading events:', err);
      }
      
      // Fetch exams
      try {
        const examsRes = await api.get('/exams');
        if (examsRes.data?.success) {
          examsData = examsRes.data.data || [];
          console.log(`✅ Loaded ${examsData.length} exams`);
        }
      } catch (err) {
        console.error('❌ Error loading exams:', err);
      }
      
      setPupils(learners);
      
      // ============================================================
      // FILTER RESULTS FOR THIS TEACHER USING recordedBy FIELD
      // ============================================================
      let teacherResultsData = [];
      
      console.log('🔍 Filtering results by recordedBy:', teacherId);
      
      // Filter results where recordedBy matches the teacher's ID
      if (teacherId) {
        teacherResultsData = allResults.filter(result => {
          const recordedBy = result.recordedBy || result.teacherId || result.createdBy;
          return recordedBy === teacherId;
        });
        console.log(`📚 Found ${teacherResultsData.length} results recorded by teacher ID: ${teacherId}`);
      }
      
      // If no results found by recordedBy, try by teacher name
      if (teacherResultsData.length === 0 && teacherName) {
        console.log('🔄 Trying to filter by teacher name:', teacherName);
        teacherResultsData = allResults.filter(result => {
          const recordedByName = result.recordedByName || result.teacherName || result.submittedBy || '';
          return recordedByName === teacherName || recordedByName.includes(teacherName);
        });
        console.log(`📚 Found ${teacherResultsData.length} results by teacher name`);
      }
      
      // If still no results, try by createdBy or updatedBy
      if (teacherResultsData.length === 0 && teacherId) {
        console.log('🔄 Trying createdBy/updatedBy filter');
        teacherResultsData = allResults.filter(result => {
          return result.createdBy === teacherId || 
                 result.updatedBy === teacherId ||
                 result.submittedBy === teacherName;
        });
        console.log(`📚 Found ${teacherResultsData.length} results by createdBy/updatedBy`);
      }
      
      // If still no results, show all results for debugging
      if (teacherResultsData.length === 0 && allResults.length > 0) {
        console.log('⚠️ No results matched. Showing all results for debugging:');
        allResults.forEach((r, i) => {
          console.log(`  Result ${i+1}: recordedBy=${r.recordedBy}, subject=${r.subject}, examName=${r.examName}`);
        });
      }
      
      console.log(`📚 FINAL: Found ${teacherResultsData.length} results for this teacher`);
      setTeacherResults(teacherResultsData);
      
      // ============================================================
      // CALCULATE STATS
      // ============================================================
      
      // 1. UPLOADED RESULTS - Total number of result entries
      const uploadedResultsCount = teacherResultsData.length;
      
      // 2. CLASSES TAUGHT - Unique classes from results
      const uniqueClasses = new Set();
      
      teacherResultsData.forEach(r => {
        const pupilId = r.pupilId?._id || r.pupilId;
        if (pupilId) {
          const pupil = findPupilById(pupilId, learners);
          if (pupil) {
            const className = pupil.class || pupil.grade || pupil.className;
            if (className) {
              uniqueClasses.add(className);
            }
          }
        }
      });
      
      const classesTaughtCount = uniqueClasses.size;
      setTeacherClasses([...uniqueClasses]);
      console.log(`📚 Classes taught: ${classesTaughtCount} - ${[...uniqueClasses].join(', ')}`);
      
      // 3. SUBJECTS TAUGHT - Unique subjects from results
      const uniqueSubjects = new Set();
      teacherResultsData.forEach(r => {
        const subject = r.subject || r.subjectName || r.learningArea;
        if (subject) {
          uniqueSubjects.add(subject);
        }
      });
      setTeacherSubjects([...uniqueSubjects]);
      console.log(`📚 Subjects taught: ${[...uniqueSubjects].join(', ')}`);
      
      // Find active exam
      const now = new Date();
      const currentExam = examsData.find(e => {
        if (!e.startDateTime || !e.endDateTime) return false;
        const start = new Date(e.startDateTime);
        const end = new Date(e.endDateTime);
        return start <= now && end >= now && e.isActive !== false;
      });
      setActiveExam(currentExam || null);
      console.log(`📝 Active exam: ${currentExam?.title || 'None'}`);
      
      // 4. COMPETENCIES RECORDED - Results for active exam
      let competenciesCount = 0;
      if (currentExam && teacherResultsData.length > 0) {
        const examResults = teacherResultsData.filter(r => {
          const matchesExamName = r.examName === currentExam.title;
          const matchesTerm = r.term === currentExam.term;
          const matchesYear = r.year === currentExam.year || r.year === new Date().getFullYear();
          const matchesExamType = r.examType === currentExam.type;
          
          return (matchesExamName || matchesExamType) && matchesTerm && matchesYear;
        });
        competenciesCount = examResults.length;
        console.log(`📊 Competencies recorded for active exam: ${competenciesCount}`);
      }
      
      // ============================================================
      // CLASS PERFORMANCE BY SUBJECT - WITH STREAM
      // ============================================================
      const performanceBySubject = {};
      
      // Group results by subject
      teacherResultsData.forEach(result => {
        const subject = result.subject || result.subjectName || result.learningArea || 'Unknown Subject';
        const marks = result.marks || result.score || result.marksObtained || 0;
        const examName = result.examName || 'Assessment';
        const pupilId = result.pupilId?._id || result.pupilId;
        
        // Get class and stream from pupil
        let className = 'Unknown Class';
        let stream = 'Unknown Stream';
        if (pupilId) {
          const pupil = findPupilById(pupilId, learners);
          if (pupil) {
            className = pupil.class || pupil.grade || 'Unknown Class';
            stream = pupil.stream || 'Unknown Stream';
          }
        }
        
        if (!performanceBySubject[subject]) {
          performanceBySubject[subject] = {
            subject: subject,
            class: className,
            stream: stream,
            examName: examName,
            totalMarks: 0,
            count: 0,
            scores: [],
            students: new Set(),
            passing: 0,
            failing: 0
          };
        }
        
        performanceBySubject[subject].totalMarks += marks;
        performanceBySubject[subject].count++;
        performanceBySubject[subject].scores.push(marks);
        
        // Track passing/failing
        if (marks >= 60) {
          performanceBySubject[subject].passing++;
        } else {
          performanceBySubject[subject].failing++;
        }
        
        // Track unique students
        if (pupilId) {
          performanceBySubject[subject].students.add(pupilId);
        }
      });
      
      // Calculate averages
      const performanceData = Object.values(performanceBySubject).map(data => {
        const average = data.count > 0 ? (data.totalMarks / data.count) : 0;
        
        return {
          subject: data.subject,
          class: data.class,
          stream: data.stream,
          examName: data.examName,
          average: average.toFixed(1),
          students: data.students.size,
          totalResults: data.count,
          passing: data.passing,
          failing: data.failing,
          scores: data.scores
        };
      });
      
      // Sort by subject name
      performanceData.sort((a, b) => a.subject.localeCompare(b.subject));
      
      console.log(`📊 Performance data with stream:`, performanceData);
      setClassPerformance(performanceData);
      
      // ---- FILTER ACTIVE AND UPCOMING EXAMS ----
      const activeAndUpcomingExams = examsData.filter(e => {
        if (e.isActive === false) return false;
        if (!e.startDateTime) return false;
        const startDate = new Date(e.startDateTime);
        return startDate >= now || (e.endDateTime && new Date(e.endDateTime) >= now);
      });
      
      const sortedExams = [...activeAndUpcomingExams].sort((a, b) => {
        const dateA = a.startDateTime ? new Date(a.startDateTime) : new Date(0);
        const dateB = b.startDateTime ? new Date(b.startDateTime) : new Date(0);
        return dateA - dateB;
      });
      
      // ---- FILTER ACTIVE AND UPCOMING EVENTS ----
      const nowDate = new Date();
      nowDate.setHours(0, 0, 0, 0);
      
      const activeAndUpcomingEvents = events.filter(e => {
        if (!e.date) return false;
        const eventDate = new Date(e.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= nowDate && e.isActive !== false;
      }).sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        return dateA - dateB;
      });
      
      // ---- UPDATE STATS ----
      setStats({
        totalLearners: learners.length,
        uploadedResults: uploadedResultsCount,
        competenciesRecorded: competenciesCount,
        classesTaught: classesTaughtCount,
        UpcomingExams: activeAndUpcomingExams.length,
        attendance: 92,
        events: activeAndUpcomingEvents.length
      });
      
      setExams(sortedExams.slice(0, 5));
      setAnnouncements(activeAndUpcomingEvents.slice(0, 3));
      
      // Initialize exam timers
      const timers = {};
      sortedExams.forEach(exam => {
        if (exam.endDateTime) {
          timers[exam._id] = calculateTimeRemaining(exam.endDateTime);
        }
      });
      setExamTimers(timers);
      
      // Check exam alerts
      checkExamAlerts(sortedExams);
      
      console.log('✅ Dashboard data loaded successfully');
      console.log(`📊 FINAL STATS: Uploaded=${uploadedResultsCount}, Classes=${classesTaughtCount}, Subjects=${uniqueSubjects.size}, Competencies=${competenciesCount}`);
      
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, teacherId, teacherName]);

  // Check exam alerts
  const checkExamAlerts = useCallback((examsData) => {
    const now = new Date();
    const alerts = [];
    
    const examsToCheck = examsData || exams;
    
    examsToCheck.forEach(exam => {
      if (exam.isActive === false) return;
      
      const startDateTime = exam.startDateTime ? new Date(exam.startDateTime) : null;
      const endDateTime = exam.endDateTime ? new Date(exam.endDateTime) : null;
      
      if (!startDateTime || !endDateTime) return;
      
      const timeToStart = startDateTime - now;
      const hoursToStart = timeToStart / (1000 * 60 * 60);
      
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
      
      if (startDateTime <= now && endDateTime >= now) {
        const timeToEnd = endDateTime - now;
        const hoursRemaining = timeToEnd / (1000 * 60 * 60);
        const daysRemaining = Math.floor(hoursRemaining / 24);
        const hoursRemainingInDay = Math.floor(hoursRemaining % 24);
        
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

    updateTimers();
    
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

    checkAlerts();
    
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

  // Stat cards
  const statCards = [
    { 
      title: 'Uploaded Results', 
      value: stats.uploadedResults, 
      icon: FiBookOpen, 
      color: 'from-green-500 to-green-600',
      subtitle: `${stats.competenciesRecorded} for active exam`
    },
    { 
      title: 'Classes Taught', 
      value: stats.classesTaught, 
      icon: FiTarget, 
      color: 'from-purple-500 to-purple-600',
      subtitle: stats.classesTaught > 0 ? `${stats.classesTaught} class(es)` : 'No classes yet'
    },
    { 
      title: 'Upcoming Exams', 
      value: stats.UpcomingExams, 
      icon: FiCalendar, 
      color: 'from-orange-500 to-orange-600' 
    },
    { 
      title: 'School Events', 
      value: stats.events, 
      icon: FiTrendingUp, 
      color: 'from-blue-500 to-blue-600' 
    },
  ];

  if (loading) {
    return (
      <Layout title="Teacher Dashboard" subtitle="CBE - Competency Based Education">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </Layout>
    );
  }

  const currentHour = new Date().getHours();
  let greeting = "Teacher";
  if (currentHour < 12) greeting = "Good Morning";
  else if (currentHour < 17) greeting = "Good Afternoon";
  else greeting = "Good Evening";

  const hasTeacherResults = teacherResults.length > 0;

  return (
    <Layout 
      title={`${greeting}, ${user?.name || 'Teacher'}`} 
      subtitle={`CBE Teacher - ${schoolInfo.name || user?.school || 'Competency Based Education'}`}
    >
      {/* Active Exam Status Banner */}
      {activeExam && (
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-3 mb-4 text-white shadow-md">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <FiCheckCircle className="w-5 h-5" />
              <span className="font-semibold text-sm">Active Exam:</span>
              <span className="text-sm font-medium">{activeExam.title}</span>
              <span className="text-xs opacity-80">({activeExam.type})</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="bg-white/20 px-2 py-0.5 rounded-full">
                📅 {activeExam.startDateTime ? new Date(activeExam.startDateTime).toLocaleDateString() : 'Date TBA'}
              </span>
              {activeExam.endDateTime && (
                <span className="bg-white/20 px-2 py-0.5 rounded-full">
                  ⏰ {new Date(activeExam.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button */}
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

      {/* Exam Time Alerts */}
      {showTimeAlert && examTimeAlerts.length > 0 && (
        <div className="space-y-2 mb-4">
          {examTimeAlerts.slice(0, 3).map((alert, index) => {
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
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Welcome Banner */}
      <div className={`bg-gradient-to-r from-green-600 to-blue-600 rounded-xl ${deviceInfo.isMobile ? 'p-4' : 'p-5'} mb-4 text-white`}>
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
              {activeExam && (
                <span className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
                  <FiCheckCircle className="w-3 h-3" /> Exam Active
                </span>
              )}
            </div>
          </div>
          {!deviceInfo.isMobile && activeExam && (
            <div className="text-right bg-white/20 px-4 py-2 rounded-lg">
              <p className="text-sm font-semibold">{activeExam.title}</p>
              <p className="text-xs opacity-80">Active Assessment</p>
            </div>
          )}
        </div>
        {deviceInfo.isMobile && activeExam && (
          <div className="mt-3 pt-3 border-t border-white/20 flex justify-between">
            <div>
              <p className="text-xs opacity-80">Active Exam</p>
              <p className="text-sm font-semibold truncate max-w-[120px]">{activeExam.title}</p>
            </div>
            <div>
              <p className="text-xs opacity-80">Competencies</p>
              <p className="text-sm font-bold">{stats.competenciesRecorded}</p>
            </div>
            <div>
              <p className="text-xs opacity-80">Classes</p>
              <p className="text-sm font-bold">{stats.classesTaught}</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className={`grid ${responsive.quickActionsGrid} gap-3 mb-6`}>
        <Link to="/teacher/results" className="bg-green-100 hover:bg-green-200 p-3 rounded-lg text-center transition-colors shadow-sm hover:shadow-md">
          <FiPlus className={`${deviceInfo.isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-green-600 mx-auto mb-1`} />
          <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-medium text-green-700`}>
            Upload Results
          </p>
        </Link>
        <Link to="/teacher/students" className="bg-blue-100 hover:bg-blue-200 p-3 rounded-lg text-center transition-colors shadow-sm hover:shadow-md">
          <FiUsers className={`${deviceInfo.isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-blue-600 mx-auto mb-1`} />
          <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-medium text-blue-700`}>
            View All Students
          </p>
        </Link>
        <Link to="/teacher/performance" className="bg-purple-100 hover:bg-purple-200 p-3 rounded-lg text-center transition-colors shadow-sm hover:shadow-md">
          <FiBarChart2 className={`${deviceInfo.isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-purple-600 mx-auto mb-1`} />
          <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-medium text-purple-700`}>
            Performance Reports
          </p>
        </Link>
        <Link to="/teacher/announcements" className="bg-orange-100 hover:bg-orange-200 p-3 rounded-lg text-center transition-colors shadow-sm hover:shadow-md">
          <FiCalendar className={`${deviceInfo.isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-orange-600 mx-auto mb-1`} />
          <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-medium text-orange-700`}>
            View Exams/Events
          </p>
        </Link>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-start gap-2">
        <FiInfo className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700">
          <span className="font-semibold">📊 Results Summary:</span> 
          {teacherResults.length > 0 ? (
            <>
              You've uploaded <strong>{stats.uploadedResults}</strong> total results for <strong>{teacherSubjects.length}</strong> subject(s) across <strong>{stats.classesTaught}</strong> class(es).
              {activeExam && (
                <> <strong>{stats.competenciesRecorded}</strong> results for the active exam (<strong>{activeExam.title}</strong>).</>
              )}
            </>
          ) : (
            <> No results uploaded yet. Click "Upload Results" to get started.</>
          )}
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className={`grid ${responsive.statsGrid} ${responsive.gridGap} mb-6`}>
        {statCards.map((stat, index) => (
          <div key={index} className={`bg-white rounded-xl shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-5'} hover:shadow-lg transition-shadow`}>
            <div className={`flex ${deviceInfo.isMobile ? 'items-center gap-3' : 'items-center justify-between'}`}>
              <div>
                <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-sm'} text-gray-500`}>{stat.title}</p>
                <p className={`${deviceInfo.isMobile ? 'text-xl' : 'text-3xl'} font-bold text-gray-800 mt-0.5`}>{stat.value}</p>
                {stat.subtitle && (
                  <p className={`${deviceInfo.isMobile ? 'text-[8px]' : 'text-[10px]'} text-gray-400 mt-0.5`}>{stat.subtitle}</p>
                )}
              </div>
              <div className={`bg-gradient-to-r ${stat.color} ${deviceInfo.isMobile ? 'p-2' : 'p-3'} rounded-full shadow-lg`}>
                <stat.icon className={`${deviceInfo.isMobile ? 'w-4 h-4' : 'w-6 h-6'} text-white`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-1' : 'lg:grid-cols-2'} gap-6 mb-6`}>
        
        {/* Subject Performance Section - WITH STREAM DISPLAY */}
        <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding}`}>
          <h2 className={`${responsive.headingSize} font-bold text-gray-800 mb-4 flex items-center gap-2`}>
            <FiBarChart2 className="text-green-600" /> Subject Performance
            {hasTeacherResults && (
              <span className="text-xs font-normal text-gray-500 ml-2">
                ({teacherResults.length} results)
              </span>
            )}
          </h2>
          
          {!hasTeacherResults ? (
            <div className="text-center py-6">
              <FiBarChart2 className={`${deviceInfo.isMobile ? 'w-8 h-8' : 'w-10 h-10'} text-gray-300 mx-auto mb-2`} />
              <p className="text-gray-500 text-sm">No results uploaded yet</p>
              <p className="text-xs text-gray-400 mt-1">Upload results to see subject performance</p>
              <Link to="/teacher/results" className="mt-3 inline-block text-sm text-green-600 hover:text-green-800">
                Upload Results →
              </Link>
            </div>
          ) : classPerformance.length > 0 ? (
            <div className="space-y-4">
              {classPerformance.map((subject, index) => (
                <div key={index} className="border-b border-gray-100 pb-3 last:border-0">
                  <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'justify-between'} text-sm mb-1`}>
                    <div>
                      <span className="font-medium">{subject.subject}</span>
                      <span className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500 ml-2`}>
                        ({subject.class}{subject.stream && subject.stream !== 'Unknown Stream' ? ` - ${subject.stream}` : ''})
                      </span>
                      <span className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-400 ml-2`}>
                        - {subject.examName}
                      </span>
                    </div>
                    <div className={`flex ${deviceInfo.isMobile ? 'flex-wrap gap-2' : 'gap-3'}`}>
                      <span className="text-green-600 text-xs">✓ {subject.passing}</span>
                      <span className="text-red-600 text-xs">✗ {subject.failing}</span>
                      <span className="font-bold text-xs">Avg: {subject.average}%</span>
                      <span className="text-gray-400 text-xs">({subject.totalResults} results)</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`rounded-full h-2 transition-all ${
                        subject.average >= 80 ? 'bg-purple-500' :
                        subject.average >= 60 ? 'bg-green-500' :
                        subject.average >= 40 ? 'bg-blue-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(subject.average, 100)}%` }}
                    />
                  </div>
                  <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500 mt-1`}>
                    {subject.students} students • {subject.totalResults} total results
                  </p>
                </div>
              ))}
              <div className="mt-3 text-xs text-gray-400 border-t pt-2">
                <p>Showing {teacherResults.length} results uploaded by you</p>
                {teacherClasses.length > 0 && (
                  <p className="text-gray-400">Classes: {teacherClasses.join(', ')}</p>
                )}
                {teacherSubjects.length > 0 && (
                  <p className="text-gray-400">Subjects: {teacherSubjects.join(', ')}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <FiBarChart2 className={`${deviceInfo.isMobile ? 'w-8 h-8' : 'w-10 h-10'} text-gray-300 mx-auto mb-2`} />
              <p className="text-gray-500 text-sm">No subject data available</p>
            </div>
          )}
          <Link to="/teacher/performance" className={`block text-center ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-green-600 hover:text-green-800 mt-4`}>
            View Detailed Performance →
          </Link>
        </div>

        {/* Upcoming Exams - Now links to /teacher/announcements */}
        <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding}`}>
          <h2 className={`${responsive.headingSize} font-bold text-gray-800 mb-4 flex items-center gap-2`}>
            <FiCalendar className="text-orange-600" /> Active & Upcoming Exams
          </h2>
          {exams.length > 0 ? (
            <div className="space-y-3">
              {exams.map((exam, index) => {
                const now = new Date();
                const startDateTime = exam.startDateTime ? new Date(exam.startDateTime) : null;
                const endDateTime = exam.endDateTime ? new Date(exam.endDateTime) : null;
                const isActive = startDateTime && endDateTime && startDateTime <= now && endDateTime >= now;
                const isUpcoming = startDateTime && startDateTime > now;
                const timeRemaining = exam.endDateTime ? getTimeRemainingDisplay(exam._id) : null;
                const timer = examTimers[exam._id];
                
                return (
                  <div key={index} className={`border-l-4 ${
                    isActive ? 'border-red-500' : 
                    isUpcoming ? 'border-orange-500' : 
                    'border-gray-300'
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
                    
                    {timeRemaining && timer && !timer.isExpired && (
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
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <FiCalendar className={`${deviceInfo.isMobile ? 'w-8 h-8' : 'w-10 h-10'} text-gray-300 mx-auto mb-2`} />
              <p className="text-gray-500 text-sm">No active or upcoming exams</p>
              <p className="text-xs text-gray-400 mt-1">All exams are either completed or not scheduled</p>
            </div>
          )}
          {/* Updated to link to /teacher/announcements */}
          <Link to="/teacher/announcements" className={`block text-center ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-orange-600 hover:text-orange-800 mt-4`}>
            View All Exams/Events →
          </Link>
        </div>
      </div>

      <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-1' : 'lg:grid-cols-2'} gap-6 mb-6`}>
        
        {/* School Announcements */}
        <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding}`}>
          <h2 className={`${responsive.headingSize} font-bold text-gray-800 mb-4 flex items-center gap-2`}>
            <FiTrendingUp className="text-blue-600" /> Active & Upcoming Events
          </h2>
          {announcements.length > 0 ? (
            <div className="space-y-3">
              {announcements.map((announcement, index) => {
                const isPast = announcement.date ? new Date(announcement.date) < new Date() : false;
                return (
                  <div key={index} className={`border-b border-gray-100 pb-3 last:border-0 ${isPast ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between">
                      <h3 className={`${deviceInfo.isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-800`}>
                        {announcement.title}
                      </h3>
                      {!isPast && (
                        <span className="text-[8px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2">
                          UPCOMING
                        </span>
                      )}
                    </div>
                    <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500 mt-1`}>
                      📅 {announcement.date ? new Date(announcement.date).toLocaleDateString() : new Date(announcement.createdAt).toLocaleDateString()}
                    </p>
                    <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mt-1 line-clamp-2`}>
                      {announcement.description}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <FiTrendingUp className={`${deviceInfo.isMobile ? 'w-8 h-8' : 'w-10 h-10'} text-gray-300 mx-auto mb-2`} />
              <p className="text-gray-500 text-sm">No active or upcoming events</p>
            </div>
          )}
          <Link to="/teacher/announcements" className={`block text-center ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-blue-600 hover:text-blue-800 mt-4`}>
            View All Events/Exams →
          </Link>
        </div>

        {/* Teacher Summary */}
        <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding}`}>
          <h2 className={`${responsive.headingSize} font-bold text-gray-800 mb-4 flex items-center gap-2`}>
            <FiUserCheck className="text-green-600" /> Teacher Summary
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Teacher ID</span>
              <span className="font-semibold text-gray-800">{teacherId || 'Not Found'}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Active Exam</span>
              <span className="font-semibold text-green-600">{activeExam ? activeExam.title : 'No Active Exam'}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Total Students</span>
              <span className="font-semibold text-gray-800">{stats.totalLearners}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg border border-blue-100">
              <span className="text-sm text-blue-700">Uploaded Results</span>
              <span className="font-bold text-blue-700 text-lg">{stats.uploadedResults}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-purple-50 rounded-lg border border-purple-100">
              <span className="text-sm text-purple-700">Classes Taught</span>
              <span className="font-bold text-purple-700 text-lg">{stats.classesTaught}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-indigo-50 rounded-lg border border-indigo-100">
              <span className="text-sm text-indigo-700">Subjects Taught</span>
              <span className="font-bold text-indigo-700 text-lg">{teacherSubjects.length}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg border border-green-100">
              <span className="text-sm text-green-700">Active Exam Results</span>
              <span className="font-bold text-green-700 text-lg">{stats.competenciesRecorded}</span>
            </div>
            {teacherClasses.length > 0 && (
              <div className="flex flex-wrap gap-1 p-2 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Classes:</span>
                {teacherClasses.map((cls, i) => (
                  <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {cls}
                  </span>
                ))}
              </div>
            )}
            {teacherSubjects.length > 0 && (
              <div className="flex flex-wrap gap-1 p-2 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Subjects:</span>
                {teacherSubjects.map((subj, i) => (
                  <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    {subj}
                  </span>
                ))}
              </div>
            )}
            {activeExam && stats.competenciesRecorded === 0 && teacherResults.length > 0 && (
              <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-200 text-center">
                <p className="text-xs text-yellow-700">
                  <FiClock className="inline mr-1 w-3 h-3" />
                  You have {teacherResults.length} total results but none for {activeExam.title}. 
                  Upload results for this exam to track competencies.
                </p>
              </div>
            )}
            {activeExam && stats.competenciesRecorded > 0 && (
              <div className="bg-green-50 p-2 rounded-lg border border-green-200 text-center">
                <p className="text-xs text-green-700">
                  ✅ {stats.competenciesRecorded} results recorded for {activeExam.title}. Keep going!
                </p>
              </div>
            )}
            {teacherResults.length === 0 && (
              <div className="bg-gray-50 p-2 rounded-lg border border-gray-200 text-center">
                <p className="text-xs text-gray-600">
                  No results found. Click "Upload Results" to get started.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

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