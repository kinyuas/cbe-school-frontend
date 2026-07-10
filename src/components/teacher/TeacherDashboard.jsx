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
    cardPadding: deviceInfo.isMobile ? 'p-3' : 'p-5',
    headingSize: deviceInfo.isMobile ? 'text-base' : 'text-lg',
    textSize: deviceInfo.isMobile ? 'text-xs' : 'text-sm',
    buttonSize: deviceInfo.isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
    gridGap: deviceInfo.isMobile ? 'gap-2' : 'gap-4',
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
      displayText: 'Expired'
    };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const totalSeconds = Math.floor(diff / 1000);
  
  let displayText = '';
  let isUrgent = false;
  
  if (days > 0) {
    displayText = `${days}d ${hours}h left`;
    isUrgent = days <= 1;
  } else if (hours > 0) {
    displayText = `${hours}h ${minutes}m left`;
    isUrgent = hours <= 2;
  } else {
    displayText = `${minutes}m left`;
    isUrgent = minutes <= 30;
  }
  
  return { days, hours, minutes, totalSeconds, isExpired: false, isUrgent, displayText };
};

// ===== Get the next upcoming exam =====
const getNextUpcomingExam = (examsData) => {
  const now = new Date();
  const upcoming = examsData
    .filter(e => {
      if (!e.startDateTime || e.isActive === false) return false;
      const start = new Date(e.startDateTime);
      return start > now;
    })
    .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
  
  return upcoming.length > 0 ? upcoming[0] : null;
};

// ===== Get the most recent completed exam with results =====
const getMostRecentExamWithResults = (examsData, resultsData, teacherId, teacherName) => {
  const now = new Date();
  
  // Get all exams that have ended (completed)
  const completedExams = examsData
    .filter(e => {
      if (!e.endDateTime || e.isActive === false) return false;
      const end = new Date(e.endDateTime);
      return end < now;
    })
    .sort((a, b) => new Date(b.endDateTime) - new Date(a.endDateTime));
  
  // Find the first completed exam that has results from this teacher
  for (const exam of completedExams) {
    const hasResults = resultsData.some(r => {
      // Check if result matches this teacher
      const recordedBy = r.recordedBy || r.teacherId || r.createdBy;
      const matchesTeacher = recordedBy === teacherId;
      const matchesTeacherName = r.submittedBy === teacherName || r.updatedBy === teacherName || r.createdBy === teacherName;
      
      const matchesExamName = r.examName === exam.title;
      const matchesExamType = r.examType === exam.type;
      const matchesTerm = r.term === exam.term;
      const matchesYear = r.year === exam.year;
      const matchesExam = matchesExamName || (matchesExamType && matchesTerm && matchesYear);
      
      return (matchesTeacher || matchesTeacherName) && matchesExam;
    });
    
    if (hasResults) {
      return exam;
    }
  }
  
  return null;
};

// ===== Check if data should be displayed =====
const shouldDisplayData = (examsData, resultsData, teacherId, teacherName) => {
  const now = new Date();
  
  // Find the next upcoming exam
  const nextExam = getNextUpcomingExam(examsData);
  
  // If there's no upcoming exam, display data if there are results
  if (!nextExam) {
    // Check if there are any results from this teacher
    const hasResults = resultsData.some(r => {
      const recordedBy = r.recordedBy || r.teacherId || r.createdBy;
      return recordedBy === teacherId || r.submittedBy === teacherName || r.updatedBy === teacherName;
    });
    return hasResults;
  }
  
  // If there is a next exam, display data until its start date/time
  const nextExamStart = new Date(nextExam.startDateTime);
  return now < nextExamStart;
};

// ===== Get the current active exam =====
const getActiveExam = (examsData) => {
  const now = new Date();
  return examsData.find(e => {
    if (!e.startDateTime || !e.endDateTime) return false;
    const start = new Date(e.startDateTime);
    const end = new Date(e.endDateTime);
    return start <= now && end >= now && e.isActive !== false;
  }) || null;
};

const TeacherDashboard = () => {
  const deviceInfo = useDeviceDetection();
  const responsive = useResponsiveClasses(deviceInfo);
  
  const { user } = useAuth();
  const teacherId = user?._id || user?.id || user?.teacherId;
  const teacherName = user?.name || user?.username || '';
  
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
  const [displayExam, setDisplayExam] = useState(null);
  const [activeExam, setActiveExam] = useState(null);
  const [nextExam, setNextExam] = useState(null);
  const [teacherClass, setTeacherClass] = useState('');
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [shouldShowData, setShouldShowData] = useState(false);
  
  const [examTimeAlerts, setExamTimeAlerts] = useState([]);
  const [showTimeAlert, setShowTimeAlert] = useState(false);
  
  const intervalRef = useRef(null);
  const alertIntervalRef = useRef(null);

  const findPupilById = (pupilId, learners) => {
    if (!pupilId) return null;
    const pupilIdStr = String(pupilId);
    return learners.find(p => {
      const pId = p._id?._id || p._id || p.id;
      return String(pId) === pupilIdStr;
    });
  };

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      console.log('📊 Loading teacher dashboard...');
      
      let learners = [];
      let allResults = [];
      let events = [];
      let examsData = [];
      
      try {
        const pupilsRes = await api.get('/pupils');
        if (pupilsRes.data?.success) learners = pupilsRes.data.data || [];
      } catch (err) { console.error('Error loading pupils:', err); }
      
      try {
        const resultsRes = await api.get('/results');
        if (resultsRes.data?.success) allResults = resultsRes.data.data || [];
      } catch (err) { console.error('Error loading results:', err); }
      
      try {
        const eventsRes = await api.get('/events');
        if (eventsRes.data?.success) events = eventsRes.data.data || [];
      } catch (err) { console.error('Error loading events:', err); }
      
      try {
        const examsRes = await api.get('/exams');
        if (examsRes.data?.success) examsData = examsRes.data.data || [];
      } catch (err) { console.error('Error loading exams:', err); }
      
      setPupils(learners);
      
      // ============================================================
      // GET ALL TEACHER RESULTS
      // ============================================================
      let allTeacherResults = [];
      if (teacherId) {
        allTeacherResults = allResults.filter(result => {
          const recordedBy = result.recordedBy || result.teacherId || result.createdBy;
          return recordedBy === teacherId;
        });
      }
      
      if (allTeacherResults.length === 0 && teacherName) {
        allTeacherResults = allResults.filter(result => {
          const submittedBy = result.submittedBy || result.updatedBy || result.createdBy || '';
          return submittedBy === teacherName || submittedBy.includes(teacherName);
        });
      }
      
      // ============================================================
      // CHECK IF DATA SHOULD BE DISPLAYED
      // ============================================================
      const showData = shouldDisplayData(examsData, allTeacherResults, teacherId, teacherName);
      const currentActiveExam = getActiveExam(examsData);
      const nextUpcomingExam = getNextUpcomingExam(examsData);
      
      setShouldShowData(showData);
      setActiveExam(currentActiveExam);
      setNextExam(nextUpcomingExam);
      
      console.log(`📝 Show data: ${showData}`);
      console.log(`📝 Active exam: ${currentActiveExam?.title || 'None'}`);
      console.log(`📝 Next exam: ${nextUpcomingExam?.title || 'None'}`);
      
      let uploadedResultsCount = 0;
      let competenciesCount = 0;
      let classesTaughtCount = 0;
      let performanceData = [];
      let displayExamData = null;
      let teacherResultsData = [];
      
      // ============================================================
      // FIND THE EXAM TO DISPLAY (Most recent completed exam with results)
      // ============================================================
      if (showData) {
        // Find the most recent completed exam with results
        displayExamData = getMostRecentExamWithResults(examsData, allTeacherResults, teacherId, teacherName);
        setDisplayExam(displayExamData);
        
        console.log(`📚 Display exam: ${displayExamData?.title || 'None'}`);
        
        if (displayExamData) {
          // Filter results for the display exam
          if (teacherId) {
            teacherResultsData = allResults.filter(result => {
              const recordedBy = result.recordedBy || result.teacherId || result.createdBy;
              const matchesTeacher = recordedBy === teacherId;
              
              const matchesExamName = result.examName === displayExamData.title;
              const matchesExamType = result.examType === displayExamData.type;
              const matchesTerm = result.term === displayExamData.term;
              const matchesYear = result.year === displayExamData.year;
              const matchesExam = matchesExamName || (matchesExamType && matchesTerm && matchesYear);
              
              return matchesTeacher && matchesExam;
            });
          }
          
          if (teacherResultsData.length === 0 && teacherName) {
            teacherResultsData = allResults.filter(result => {
              const submittedBy = result.submittedBy || result.updatedBy || result.createdBy || '';
              const matchesTeacher = submittedBy === teacherName || submittedBy.includes(teacherName);
              
              const matchesExamName = result.examName === displayExamData.title;
              const matchesExamType = result.examType === displayExamData.type;
              const matchesTerm = result.term === displayExamData.term;
              const matchesYear = result.year === displayExamData.year;
              const matchesExam = matchesExamName || (matchesExamType && matchesTerm && matchesYear);
              
              return matchesTeacher && matchesExam;
            });
          }
          
          setTeacherResults(teacherResultsData);
          uploadedResultsCount = teacherResultsData.length;
          
          // CLASSES TAUGHT
          const uniqueClasses = new Set();
          teacherResultsData.forEach(r => {
            const pupilId = r.pupilId?._id || r.pupilId;
            if (pupilId) {
              const pupil = findPupilById(pupilId, learners);
              if (pupil) {
                const className = pupil.class || pupil.grade || pupil.className;
                if (className) uniqueClasses.add(className);
              }
            }
          });
          classesTaughtCount = uniqueClasses.size;
          setTeacherClasses([...uniqueClasses]);
          
          // SUBJECTS TAUGHT
          const uniqueSubjects = new Set();
          teacherResultsData.forEach(r => {
            const subject = r.subject || r.subjectName || r.learningArea;
            if (subject) uniqueSubjects.add(subject);
          });
          setTeacherSubjects([...uniqueSubjects]);
          competenciesCount = teacherResultsData.length;
          
          // PERFORMANCE BY SUBJECT
          const performanceBySubject = {};
          teacherResultsData.forEach(result => {
            const subject = result.subject || result.subjectName || result.learningArea || 'Unknown Subject';
            const marks = result.marks || result.score || result.marksObtained || 0;
            const examName = result.examName || 'Assessment';
            const pupilId = result.pupilId?._id || result.pupilId;
            
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
            if (marks >= 60) performanceBySubject[subject].passing++;
            else performanceBySubject[subject].failing++;
            if (pupilId) performanceBySubject[subject].students.add(pupilId);
          });
          
          performanceData = Object.values(performanceBySubject).map(data => {
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
          performanceData.sort((a, b) => a.subject.localeCompare(b.subject));
          setClassPerformance(performanceData);
        } else {
          // No completed exam with results found
          setTeacherResults([]);
          setClassPerformance([]);
          setTeacherClasses([]);
          setTeacherSubjects([]);
        }
      } else {
        // CLEAR DATA - results hidden until next exam starts
        console.log('📚 Results hidden until next exam starts. Clearing data...');
        setTeacherResults([]);
        setClassPerformance([]);
        setTeacherClasses([]);
        setTeacherSubjects([]);
        setDisplayExam(null);
      }
      
      // ---- FILTER ACTIVE AND UPCOMING EXAMS ----
      const now = new Date();
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
      
      const timers = {};
      sortedExams.forEach(exam => {
        if (exam.endDateTime) timers[exam._id] = calculateTimeRemaining(exam.endDateTime);
      });
      setExamTimers(timers);
      checkExamAlerts(sortedExams);
      
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, teacherId, teacherName]);

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

  useEffect(() => {
    const updateTimers = () => {
      if (exams.length > 0) {
        const newTimers = {};
        exams.forEach(exam => {
          if (exam.endDateTime) newTimers[exam._id] = calculateTimeRemaining(exam.endDateTime);
        });
        setExamTimers(newTimers);
      }
    };
    updateTimers();
    intervalRef.current = setInterval(updateTimers, 60000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [exams]);

  useEffect(() => {
    const checkAlerts = () => { checkExamAlerts(); };
    checkAlerts();
    alertIntervalRef.current = setInterval(checkAlerts, 60000);
    return () => { if (alertIntervalRef.current) clearInterval(alertIntervalRef.current); };
  }, [checkExamAlerts]);

  useEffect(() => { loadDashboardData(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    toast.success('Refreshed');
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
    if (timer.isExpired) return { text: '⏰ Expired', color: 'text-red-600', isUrgent: false };
    return {
      text: timer.displayText,
      color: timer.isUrgent ? 'text-red-600 font-bold' : 'text-orange-600',
      isUrgent: timer.isUrgent
    };
  };

  const statCards = [
    { title: 'Results', value: stats.uploadedResults, icon: FiBookOpen, color: 'from-green-500 to-green-600' },
    { title: 'Classes', value: stats.classesTaught, icon: FiTarget, color: 'from-purple-500 to-purple-600' },
    { title: 'Upcoming Exams', value: stats.UpcomingExams, icon: FiCalendar, color: 'from-orange-500 to-orange-600' },
    { title: 'Events', value: stats.events, icon: FiTrendingUp, color: 'from-blue-500 to-blue-600' },
  ];

  if (loading) {
    return (
      <Layout title="Dashboard" subtitle="CBE - Competency Based Education">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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
      subtitle={schoolInfo.name || user?.school || 'CBE Education'}
    >
      {/* Status Banner */}
      {activeExam ? (
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-3 mb-3 text-white">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-medium text-sm">📝 {activeExam.title}</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Active</span>
          </div>
        </div>
      ) : displayExam && shouldShowData ? (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-3 mb-3 text-white">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-medium text-sm">📊 {displayExam.title}</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Current Data</span>
          </div>
          <div className="text-xs opacity-80 mt-1">
            Completed: {new Date(displayExam.endDateTime).toLocaleDateString()}
          </div>
        </div>
      ) : nextExam && !shouldShowData ? (
        <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg p-3 mb-3 text-white">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-medium text-sm">⏳ {nextExam.title}</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Starting Soon</span>
          </div>
          <div className="text-xs opacity-80 mt-1">
            Results hidden until exam begins
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg p-3 mb-3 text-white">
          <span className="font-medium text-sm">📅 No data available</span>
        </div>
      )}

      {/* Refresh */}
      <div className="flex justify-end mb-3">
        <button onClick={handleRefresh} disabled={refreshing} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-sm flex items-center gap-1 disabled:opacity-50">
          <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? '...' : 'Refresh'}
        </button>
      </div>

      {/* Status Message for Hidden Data */}
      {!shouldShowData && nextExam && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3">
          <p className="text-xs text-yellow-700 text-center">
            ⏳ Results are hidden until <strong>{nextExam.title}</strong> starts on {new Date(nextExam.startDateTime).toLocaleDateString()} at {new Date(nextExam.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )}

      {!shouldShowData && !nextExam && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
          <p className="text-xs text-blue-700 text-center">
            📋 No results available. Upload results to see data.
          </p>
        </div>
      )}

      {/* Alerts */}
      {showTimeAlert && examTimeAlerts.length > 0 && (
        <div className="space-y-1 mb-3">
          {examTimeAlerts.slice(0, 2).map((alert, index) => {
            const AlertIcon = getAlertIcon(alert.severity);
            const alertColor = getAlertColor(alert.severity);
            const isCritical = alert.severity === 'critical';
            
            let timeDisplay = alert.type === 'upcoming' ? `Starts in ${alert.days}d ${alert.hours}h` : `${alert.days}d ${alert.hours}h left`;
            
            return (
              <div key={index} className={`rounded-lg p-2 flex items-center gap-2 border ${alertColor}`}>
                <AlertIcon className={`w-4 h-4 flex-shrink-0 ${isCritical ? 'text-red-600' : 'text-orange-600'}`} />
                <span className="text-xs font-medium">{alert.exam.title}</span>
                <span className="text-xs ml-auto">{timeDisplay}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Actions */}
      <div className={`grid ${responsive.quickActionsGrid} gap-2 mb-4`}>
        <Link to="/teacher/results" className="bg-green-100 hover:bg-green-200 p-2 rounded-lg text-center transition-colors shadow-sm">
          <FiPlus className="w-5 h-5 text-green-600 mx-auto" />
          <p className="text-[10px] font-medium text-green-700">Upload</p>
        </Link>
        <Link to="/teacher/students" className="bg-blue-100 hover:bg-blue-200 p-2 rounded-lg text-center transition-colors shadow-sm">
          <FiUsers className="w-5 h-5 text-blue-600 mx-auto" />
          <p className="text-[10px] font-medium text-blue-700">Students</p>
        </Link>
        <Link to="/teacher/performance" className="bg-purple-100 hover:bg-purple-200 p-2 rounded-lg text-center transition-colors shadow-sm">
          <FiBarChart2 className="w-5 h-5 text-purple-600 mx-auto" />
          <p className="text-[10px] font-medium text-purple-700">Reports</p>
        </Link>
        <Link to="/teacher/announcements" className="bg-orange-100 hover:bg-orange-200 p-2 rounded-lg text-center transition-colors shadow-sm">
          <FiCalendar className="w-5 h-5 text-orange-600 mx-auto" />
          <p className="text-[10px] font-medium text-orange-700">Events</p>
        </Link>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
        <div className="text-xs text-blue-700">
          {shouldShowData && displayExam && hasTeacherResults ? (
            <>{stats.uploadedResults} results • {teacherSubjects.length} subjects • {stats.classesTaught} classes</>
          ) : shouldShowData && displayExam && !hasTeacherResults ? (
            <>No results for {displayExam.title}. <Link to="/teacher/results" className="underline">Upload now</Link></>
          ) : nextExam && !shouldShowData ? (
            <>⏳ Waiting for <strong>{nextExam.title}</strong> to start</>
          ) : (
            <>No results available</>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className={`grid ${responsive.statsGrid} gap-3 mb-4`}>
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-3">
            <p className="text-[10px] text-gray-500">{stat.title}</p>
            <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Combined Exams & Events */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <h2 className="text-base font-bold text-gray-800 mb-3">📋 Upcoming</h2>
        
        {exams.length > 0 || announcements.length > 0 ? (
          <div className="space-y-2">
            {/* Exams */}
            {exams.slice(0, 3).map((exam, index) => {
              const now = new Date();
              const startDateTime = exam.startDateTime ? new Date(exam.startDateTime) : null;
              const endDateTime = exam.endDateTime ? new Date(exam.endDateTime) : null;
              const isActive = startDateTime && endDateTime && startDateTime <= now && endDateTime >= now;
              const isUpcoming = startDateTime && startDateTime > now;
              const timer = examTimers[exam._id];
              
              return (
                <div key={`exam-${index}`} className={`border-l-4 ${isActive ? 'border-red-500' : isUpcoming ? 'border-orange-500' : 'border-gray-300'} pl-2 py-1`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{exam.title}</span>
                    <div className="flex items-center gap-1">
                      {isActive && <span className="text-[8px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Live</span>}
                      {isUpcoming && <span className="text-[8px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Soon</span>}
                      {timer && !timer.isExpired && <span className="text-[10px] text-gray-500">{timer.displayText}</span>}
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500">{exam.type} • {exam.term}</p>
                </div>
              );
            })}
            
            {/* Events */}
            {announcements.slice(0, 2).map((event, index) => (
              <div key={`event-${index}`} className="border-l-4 border-blue-500 pl-2 py-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{event.title}</span>
                  <span className="text-[10px] text-gray-400">{event.date ? new Date(event.date).toLocaleDateString() : ''}</span>
                </div>
                <p className="text-[10px] text-gray-500 truncate">{event.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">No upcoming events or exams</p>
        )}
        
        <Link to="/teacher/announcements" className="block text-center text-sm text-orange-600 hover:text-orange-800 mt-2">
          View All →
        </Link>
      </div>

      {/* Subject Performance */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-base font-bold text-gray-800 mb-3">📊 Subjects</h2>
        
        {!shouldShowData ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">⏳ Results hidden until next exam</p>
            {nextExam && (
              <p className="text-xs text-gray-400 mt-1">{nextExam.title} starts {new Date(nextExam.startDateTime).toLocaleDateString()}</p>
            )}
          </div>
        ) : !displayExam ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">No completed exam with results</p>
            <Link to="/teacher/results" className="text-sm text-green-600 hover:underline">Upload</Link>
          </div>
        ) : !hasTeacherResults ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">No results for {displayExam.title}</p>
            <Link to="/teacher/results" className="text-sm text-green-600 hover:underline">Upload now</Link>
          </div>
        ) : classPerformance.length > 0 ? (
          <div className="space-y-3">
            {classPerformance.slice(0, 3).map((subject, index) => (
              <div key={index} className="border-b border-gray-100 pb-2 last:border-0">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{subject.subject}</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-green-600">✓{subject.passing}</span>
                    <span className="text-red-600">✗{subject.failing}</span>
                    <span className="font-bold text-blue-600">{subject.average}%</span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-500">
                  {subject.class}{subject.stream && subject.stream !== 'Unknown Stream' ? ` - ${subject.stream}` : ''}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div className={`rounded-full h-1.5 ${
                    subject.average >= 80 ? 'bg-purple-500' :
                    subject.average >= 60 ? 'bg-green-500' :
                    subject.average >= 40 ? 'bg-blue-500' : 'bg-red-500'
                  }`} style={{ width: `${Math.min(subject.average, 100)}%` }} />
                </div>
              </div>
            ))}
            {classPerformance.length > 3 && (
              <p className="text-[10px] text-gray-400 text-center">+{classPerformance.length - 3} more</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">No data</p>
        )}
        
        <Link to="/teacher/performance" className="block text-center text-sm text-green-600 hover:text-green-800 mt-2">
          View All →
        </Link>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-view .p-6 { padding: 16px !important; }
          .mobile-view .gap-6 { gap: 16px !important; }
          .mobile-view .text-xl { font-size: 1.125rem !important; }
          .mobile-view .text-3xl { font-size: 1.5rem !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .tablet-view .grid-cols-2 { grid-template-columns: repeat(2, 1fr) !important; }
        }
        .stat-card:hover { transform: translateY(-2px); }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </Layout>
  );
};

export default TeacherDashboard;