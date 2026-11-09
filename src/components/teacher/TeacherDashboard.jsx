// src/components/teacher/TeacherDashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import {
  FiUsers, FiBookOpen, FiCalendar, FiAward, FiTarget, FiTrendingUp,
  FiClock, FiCheckCircle, FiBarChart2, FiMonitor, FiSmartphone,
  FiTablet, FiAlertCircle, FiRefreshCw, FiAlertTriangle, FiUserCheck,
  FiInfo, FiPlus, FiLayers, FiUploadCloud, FiExternalLink, FiGlobe,
  FiMapPin, FiStar, FiMessageSquare, FiUser, FiChevronRight
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

// ===== AI Device Detection Hook =====
const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    type: 'desktop', isMobile: false, isTablet: false, isDesktop: true,
    viewportWidth: 0, viewportHeight: 0, pixelRatio: 1, isTouchDevice: false
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

      setDeviceInfo({ type, isMobile, isTablet, isDesktop, viewportWidth: width, viewportHeight: height, pixelRatio, isTouchDevice });
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
      days: 0, hours: 0, minutes: 0, totalSeconds: 0, isExpired: true,
      isUrgent: false, displayText: 'Expired'
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

// ===== Get time remaining until a future date =====
const getTimeRemainingDisplay = (targetDateTime) => {
  const timer = calculateTimeRemaining(targetDateTime);
  if (timer.isExpired) return { text: 'Now', color: 'text-red-600', isUrgent: false };
  return {
    text: timer.displayText,
    color: timer.isUrgent ? 'text-red-600 font-bold' : 'text-orange-600',
    isUrgent: timer.isUrgent
  };
};

// ===== Normalizer for strict matching =====
const norm = (v) => String(v || '').trim().toLowerCase();

// ===== Get active exam (running right now) =====
const getActiveExam = (examsData) => {
  const now = new Date();
  return examsData.find(e => {
    if (!e.startDateTime || !e.endDateTime || e.isActive === false) return false;
    const start = new Date(e.startDateTime);
    const end = new Date(e.endDateTime);
    return start <= now && end >= now;
  }) || null;
};

// ============================================================
// ✅ Show exam X while X.start <= now < nextExam.start
// ============================================================
const getCurrentDisplayExam = (examsData) => {
  const now = new Date();

  const sorted = [...examsData]
    .filter(e => e.startDateTime && e.isActive !== false)
    .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));

  if (sorted.length === 0) return { exam: null, nextExam: null, status: 'none' };

  for (let i = 0; i < sorted.length; i++) {
    const exam = sorted[i];
    const start = new Date(exam.startDateTime);
    const nextExam = sorted[i + 1] || null;

    if (start > now) {
      return { exam, nextExam, status: 'upcoming' };
    }

    if (nextExam) {
      const nextStart = new Date(nextExam.startDateTime);
      if (now < nextStart) {
        const end = exam.endDateTime ? new Date(exam.endDateTime) : null;
        const status = end && now <= end ? 'active' : 'completed';
        return { exam, nextExam, status };
      }
    } else {
      const end = exam.endDateTime ? new Date(exam.endDateTime) : null;
      const status = end && now <= end ? 'active' : 'completed';
      return { exam, nextExam: null, status };
    }
  }

  return { exam: null, nextExam: null, status: 'none' };
};

// ===== Get the next upcoming exam (strictly after now) =====
const getNextUpcomingExam = (examsData) => {
  const now = new Date();
  const upcoming = examsData
    .filter(e => {
      if (!e.startDateTime || e.isActive === false) return false;
      return new Date(e.startDateTime) > now;
    })
    .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
  return upcoming.length > 0 ? upcoming[0] : null;
};

// ============================================================
// ✅ STRICT exam match: name AND type AND term AND year must all match
// ============================================================
const resultBelongsToExam = (result, exam) => {
  if (!result || !exam) return false;
  const sameName = norm(result.examName) === norm(exam.title);
  const sameType = norm(result.examType) === norm(exam.type);
  const sameTerm = norm(result.term) === norm(exam.term);
  const sameYear = String(result.year || '') === String(exam.year || '');
  return sameName && sameType && sameTerm && sameYear;
};

// ============================================================
// ⭐ SCHOLARSHIPS & BIG EVENTS — inline helper
// ============================================================
const formatScholarshipDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-KE', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch { return ''; }
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
    attendance: 92,
    events: 0
  });

  const [exams, setExams] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [subjectPerformance, setSubjectPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pupils, setPupils] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState({ name: '', classes: [] });
  const [examTimers, setExamTimers] = useState({});
  const [displayExam, setDisplayExam] = useState(null);
  const [displayExamStatus, setDisplayExamStatus] = useState('none');
  const [nextExam, setNextExam] = useState(null);

  // ⭐ Scholarships & Big Events state
  const [scholarships, setScholarships] = useState([]);

  // 🆕 Parent Messages State (Only Count needed now)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  // Teacher specific data
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [allTeacherResults, setAllTeacherResults] = useState([]);

  // Skills Coverage Data
  const [skillsCoverage, setSkillsCoverage] = useState({
    totalStudents: 0,
    studentsWithSkills: 0,
    percentage: 0
  });

  const [examTimeAlerts, setExamTimeAlerts] = useState([]);
  const [showTimeAlert, setShowTimeAlert] = useState(false);

  const intervalRef = useRef(null);
  const alertIntervalRef = useRef(null);
  const messageIntervalRef = useRef(null);

  const findPupilById = (pupilId, learners) => {
    if (!pupilId) return null;
    const pupilIdStr = String(pupilId);
    return learners.find(p => {
      const pId = p._id?._id || p._id || p.id;
      return String(pId) === pupilIdStr;
    });
  };

  // 🆕 Load ONLY Unread Message Count for Notifications
  const loadUnreadMessages = useCallback(async () => {
    try {
      const res = await api.get('/teacher-hub/messages/unread-count').catch(() => ({ data: { count: 0 } }));
      setUnreadMessageCount(res.data?.count || 0);
    } catch (err) {
      console.warn('Could not load unread messages:', err.message);
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      console.log('📊 Loading teacher dashboard...');

      let learners = [];
      let allResults = [];
      let events = [];
      let examsData = [];
      let myProfile = null;
      let skillsData = [];
      let scholarshipsData = [];

      // Execute all API calls in parallel for maximum speed
      await Promise.all([
        api.get('/pupils').then(res => { if (res.data?.success) learners = res.data.data || []; }).catch(err => console.error('Pupils:', err)),
        api.get('/results').then(res => { if (res.data?.success) allResults = res.data.data || []; }).catch(err => console.error('Results:', err)),
        api.get('/events').then(res => { if (res.data?.success) events = res.data.data || []; }).catch(err => console.error('Events:', err)),
        api.get('/exams').then(res => { if (res.data?.success) examsData = res.data.data || []; }).catch(err => console.error('Exams:', err)),
        api.get('/teachers').then(res => {
          if (res.data?.success) {
            myProfile = (res.data.data || []).find(t => t.email === user?.email);
          }
        }).catch(err => console.error('Teacher Profile:', err)),
        // ⭐ Scholarships & Big Events
        api.get('/public/scholarships-events').then(res => {
          scholarshipsData = res.data?.data || [];
        }).catch(err => console.error('Scholarships:', err))
      ]);

      setPupils(learners);
      setTeacherProfile(myProfile);

      // ⭐ Store the last 3 scholarships, newest first
      const sortedScholarships = [...scholarshipsData].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setScholarships(sortedScholarships.slice(0, 3));

      // Fetch skills for the assigned class (silently in background)
      if (myProfile && myProfile.classAssigned) {
        try {
          const skillsRes = await api.get('/skills', {
            params: {
              class: myProfile.classAssigned,
              stream: myProfile.streamAssigned || undefined
            }
          });
          if (skillsRes.data?.success) {
            skillsData = skillsRes.data.data || [];
          }
        } catch (err) {
          console.error('Error fetching skills:', err);
        }
      }

      // Calculate Skills Coverage
      let totalAssignedStudents = 0;
      if (myProfile && myProfile.classAssigned) {
        const assignedPupils = learners.filter(p =>
          p.class === myProfile.classAssigned &&
          (!myProfile.streamAssigned || p.stream === myProfile.streamAssigned)
        );

        totalAssignedStudents = assignedPupils.length;
        const uniqueStudentsWithSkills = new Set(
          skillsData.map(s => s.pupilId?._id || s.pupilId).filter(Boolean)
        ).size;

        const percentage = totalAssignedStudents > 0 ? Math.round((uniqueStudentsWithSkills / totalAssignedStudents) * 100) : 0;

        setSkillsCoverage({
          totalStudents: totalAssignedStudents,
          studentsWithSkills: uniqueStudentsWithSkills,
          percentage
        });
      } else {
        setSkillsCoverage({ totalStudents: 0, studentsWithSkills: 0, percentage: 0 });
      }

      // ============================================================
      // TEACHER'S OWN RESULTS ONLY
      // ============================================================
      let teacherResultsData = [];
      if (teacherId) {
        teacherResultsData = allResults.filter(result => {
          const recordedBy = result.recordedBy || result.teacherId || result.createdBy;
          return recordedBy === teacherId;
        });
      }

      if (teacherResultsData.length === 0 && teacherName) {
        teacherResultsData = allResults.filter(result => {
          const submittedBy = result.submittedBy || result.updatedBy || result.createdBy || '';
          return submittedBy === teacherName || submittedBy.includes(teacherName);
        });
      }

      setAllTeacherResults(teacherResultsData);

      // ============================================================
      // WHICH EXAM TO SHOW
      // ============================================================
      const { exam: examToDisplay, status: examStatus, nextExam: nextScheduled } = getCurrentDisplayExam(examsData);

      setDisplayExam(examToDisplay);
      setDisplayExamStatus(examStatus);

      // ============================================================
      // ACTIVE + NEXT EXAM
      // ============================================================
      const currentActiveExam = getActiveExam(examsData);
      const nextUpcomingExam = getNextUpcomingExam(examsData);

      setNextExam(nextUpcomingExam);

      // ============================================================
      // FILTER RESULTS FOR THE DISPLAY EXAM
      // ============================================================
      let uploadedResultsCount = 0;
      let competenciesCount = 0;
      let classesTaughtCount = 0;
      let performanceData = [];
      let filteredResults = [];

      const showData = examToDisplay && (examStatus === 'active' || examStatus === 'completed');

      if (showData && examToDisplay) {
        filteredResults = teacherResultsData.filter(result =>
          resultBelongsToExam(result, examToDisplay)
        );

        const uniqueUploadKeys = new Set();
        filteredResults.forEach(r => {
          const pid = r.pupilId?._id || r.pupilId;
          if (pid) {
            uniqueUploadKeys.add(`${pid}-${r.subject}`);
          }
        });
        uploadedResultsCount = uniqueUploadKeys.size;

        // CLASSES
        const uniqueClasses = new Set();
        filteredResults.forEach(r => {
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

        // SUBJECTS
        const uniqueSubjects = new Set();
        filteredResults.forEach(r => {
          const subject = r.subject || r.subjectName || r.learningArea;
          if (subject) uniqueSubjects.add(subject);
        });
        setTeacherSubjects([...uniqueSubjects]);
        competenciesCount = filteredResults.length;

        // ============================================================
        // GROUP BY SUBJECT + CLASS + STREAM
        // ============================================================
        const grouped = {};

        filteredResults.forEach(result => {
          const subject = result.subject || result.subjectName || result.learningArea || 'Unknown Subject';
          const marks = parseFloat(result.marks || result.score || result.marksObtained || 0);
          if (isNaN(marks)) return;

          const pupilId = result.pupilId?._id || result.pupilId;
          let className = 'Unknown Class';
          let stream = '';

          if (pupilId) {
            const pupil = findPupilById(pupilId, learners);
            if (pupil) {
              className = pupil.class || pupil.grade || pupil.className || 'Unknown Class';
              stream = pupil.stream || '';
            }
          }

          const key = `${subject}|${className}|${stream || 'no-stream'}`;

          if (!grouped[key]) {
            grouped[key] = {
              subject,
              class: className,
              stream: stream || null,
              examName: examToDisplay.title,
              examType: examToDisplay.type,
              term: examToDisplay.term,
              year: examToDisplay.year,
              totalMarks: 0,
              count: 0,
              passing: 0,
              average: 0,
              belowAvg: 0,
              studentIds: new Set()
            };
          }

          grouped[key].totalMarks += marks;
          grouped[key].count += 1;

          if (marks >= 60) grouped[key].passing += 1;
          else if (marks >= 50) grouped[key].average += 1;
          else grouped[key].belowAvg += 1;

          if (pupilId) grouped[key].studentIds.add(String(pupilId));
        });

        performanceData = Object.values(grouped).map(g => ({
          subject: g.subject,
          class: g.class,
          stream: g.stream,
          examName: g.examName,
          examType: g.examType,
          term: g.term,
          year: g.year,
          averageScore: g.count > 0 ? (g.totalMarks / g.count).toFixed(1) : '0.0',
          students: g.studentIds.size,
          totalResults: g.count,
          passing: g.passing,
          average: g.average,
          belowAvg: g.belowAvg
        }));

        performanceData.sort((a, b) => {
          const subj = a.subject.localeCompare(b.subject);
          if (subj !== 0) return subj;
          const cls = a.class.localeCompare(b.class);
          if (cls !== 0) return cls;
          return (a.stream || '').localeCompare(b.stream || '');
        });

        setSubjectPerformance(performanceData);

      } else {
        setSubjectPerformance([]);
        setTeacherClasses([]);
        setTeacherSubjects([]);
      }

      // ---- FILTER ACTIVE AND UPCOMING EXAMS ----
      const now = new Date();
      const activeAndUpcomingExams = examsData.filter(e => {
        if (e.isActive === false || !e.startDateTime) return false;
        const start = new Date(e.startDateTime);
        return start >= now || (e.endDateTime && new Date(e.endDateTime) >= now);
      });
      const sortedExams = [...activeAndUpcomingExams].sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));

      // ---- FILTER ACTIVE AND UPCOMING EVENTS ----
      const nowDate = new Date();
      nowDate.setHours(0, 0, 0, 0);
      const activeAndUpcomingEvents = events.filter(e => {
        if (!e.date || e.isActive === false) return false;
        const eventDate = new Date(e.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= nowDate;
      }).sort((a, b) => new Date(a.date) - new Date(b.date));

      const strictlyUpcomingExams = activeAndUpcomingExams.filter(e => {
        const start = new Date(e.startDateTime);
        return start > now;
      });

      setStats({
        totalLearners: totalAssignedStudents,
        uploadedResults: uploadedResultsCount,
        competenciesRecorded: competenciesCount,
        classesTaught: classesTaughtCount,
        UpcomingExams: strictlyUpcomingExams.length,
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

  useEffect(() => {
    loadDashboardData();
    loadUnreadMessages();
  }, [loadDashboardData, loadUnreadMessages]);

  // 🆕 Poll for new unread messages every 30s
  useEffect(() => {
    messageIntervalRef.current = setInterval(loadUnreadMessages, 30000);
    return () => {
      if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
    };
  }, [loadUnreadMessages]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDashboardData(), loadUnreadMessages()]);
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

  const getTimeRemainingDisplayForExam = (examId) => {
    const timer = examTimers[examId];
    if (!timer) return null;
    if (timer.isExpired) return { text: '⏰ Expired', color: 'text-red-600', isUrgent: false };
    return {
      text: timer.displayText,
      color: timer.isUrgent ? 'text-red-600 font-bold' : 'text-orange-600',
      isUrgent: timer.isUrgent
    };
  };

  const ongoingExamCount = displayExam && displayExamStatus === 'active' ? 1 : 0;

  const statCards = [
    { title: 'Ongoing Exam', value: ongoingExamCount, icon: FiClock, color: 'from-green-500 to-green-600' },
    { title: 'My Students', value: stats.totalLearners, icon: FiUsers, color: 'from-purple-500 to-purple-600' },
    { title: 'Upcoming Exams', value: stats.UpcomingExams, icon: FiCalendar, color: 'from-orange-500 to-orange-600' },
    { title: 'Incoming Events', value: stats.events, icon: FiTrendingUp, color: 'from-blue-500 to-blue-600' },
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

  const hasTeacherResults = subjectPerformance.length > 0;
  const showData = displayExam && (displayExamStatus === 'active' || displayExamStatus === 'completed');

  let displayExamTimeRemaining = null;
  if (displayExam && displayExam.endDateTime) {
    displayExamTimeRemaining = getTimeRemainingDisplayForExam(displayExam._id);
  }

  let untilNextExamDisplay = null;
  if (nextExam && nextExam.startDateTime && showData) {
    untilNextExamDisplay = getTimeRemainingDisplay(nextExam.startDateTime);
  }

  const classDisplay = teacherProfile?.classAssigned
    ? ` · ${teacherProfile.classAssigned}${teacherProfile.streamAssigned ? ` (${teacherProfile.streamAssigned})` : ''}`
    : '';

  return (
    <Layout
      title={`${greeting}, ${user?.name || 'Teacher'}${classDisplay}`}
      subtitle={`${schoolInfo.name || 'School'} · Teacher Portal`}
    >
      {/* Status Banner */}
      {displayExam ? (
        <div className={`rounded-lg p-3 mb-3 text-white ${
          displayExamStatus === 'active'
            ? 'bg-gradient-to-r from-green-600 to-green-700'
            : displayExamStatus === 'completed'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600'
              : 'bg-gradient-to-r from-gray-600 to-gray-700'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {displayExamStatus === 'active' ? '📝' : displayExamStatus === 'completed' ? '📊' : '📅'}
                {' '}{displayExam.title}
              </span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                {displayExamStatus === 'active' ? 'Active' : displayExamStatus === 'completed' ? 'Completed' : 'Upcoming'}
              </span>
              {displayExam.type && (
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{displayExam.type}</span>
              )}
              {displayExam.term && (
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{displayExam.term}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {displayExamTimeRemaining && displayExamStatus === 'active' && (
                <span className={`text-xs font-semibold flex items-center gap-1 ${displayExamTimeRemaining.color}`}>
                  <FiClock className="w-3 h-3" />
                  {displayExamTimeRemaining.text}
                </span>
              )}
              {untilNextExamDisplay && displayExamStatus === 'completed' && (
                <span className="text-xs font-semibold flex items-center gap-1 text-yellow-200">
                  <FiClock className="w-3 h-3" />
                  Until next exam: {untilNextExamDisplay.text}
                </span>
              )}
              {displayExam.endDateTime && (
                <span className="text-xs opacity-80">
                  {displayExamStatus === 'active' ? 'Ends:' : 'Ended:'} {new Date(displayExam.endDateTime).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg p-3 mb-3 text-white">
          <span className="font-medium text-sm">📅 No exams available</span>
        </div>
      )}

      {/* Refresh */}
      <div className="flex justify-end mb-3">
        <button onClick={handleRefresh} disabled={refreshing} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-sm flex items-center gap-1 disabled:opacity-50">
          <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? '...' : 'Refresh'}
        </button>
      </div>

      {/* 🆕 PARENT MESSAGES NOTIFICATION CARD */}
      <div
        className={`rounded-lg p-4 mb-4 border-l-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          unreadMessageCount > 0
            ? 'bg-gradient-to-r from-pink-50 to-rose-50 border-pink-500 shadow-sm'
            : 'bg-white border-gray-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`rounded-full p-2.5 flex-shrink-0 ${unreadMessageCount > 0 ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-400'}`}>
            <FiMessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              Parent Messages
              {unreadMessageCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {unreadMessageCount} new
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {unreadMessageCount > 0 
                ? `You have ${unreadMessageCount} unread message${unreadMessageCount > 1 ? 's' : ''} from parents.`
                : 'No unread messages.'}
            </p>
          </div>
        </div>

        <Link
          to="/teacher/parent-hub"
          className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all w-full sm:w-auto justify-center ${
            unreadMessageCount > 0
              ? 'bg-pink-600 hover:bg-pink-700 text-white shadow-md'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}
        >
          <FiMessageSquare className="w-3.5 h-3.5" /> 
          {unreadMessageCount > 0 ? 'View Messages' : 'View All Messages'}
          <FiChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Status Message */}
      {displayExam && !showData && displayExamStatus === 'upcoming' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
          <p className="text-xs text-blue-700 text-center">
            📅 <strong>{displayExam.title}</strong> is upcoming. Results will appear once uploaded.
          </p>
        </div>
      )}

      {displayExam && displayExamStatus === 'completed' && !hasTeacherResults && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3">
          <p className="text-xs text-yellow-700 text-center">
            📋 No results uploaded yet for <strong>{displayExam.title}</strong>.
            <Link to="/teacher/results" className="underline ml-1">Upload now</Link>
          </p>
        </div>
      )}

      {!displayExam && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
          <p className="text-xs text-blue-700 text-center">
            📋 No exams available. Contact admin to schedule exams.
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
          <p className="text-[10px] font-medium text-orange-700">Events/Exams</p>
        </Link>
      </div>

      {/* Summary Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
        <div className="text-xs text-blue-700">
          {showData && hasTeacherResults ? (
            <>
              <strong>{stats.uploadedResults}</strong> uploads • <strong>{subjectPerformance.length}</strong> subject{subjectPerformance.length !== 1 ? 's' : ''} • <strong>{stats.classesTaught}</strong> classes
              {displayExam && <> • <strong>{displayExam.title}</strong></>}
            </>
          ) : displayExam && displayExamStatus === 'completed' && !hasTeacherResults ? (
            <>Waiting for results on <strong>{displayExam.title}</strong></>
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

      {/* Skills Coverage */}
      {teacherProfile?.classAssigned && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 flex flex-col md:flex-row items-center justify-between border-l-4 border-orange-500">
          <div className="mb-3 md:mb-0">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <FiLayers className="text-orange-500"/> Skills Coverage
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              For your assigned class: <strong>{teacherProfile.classAssigned} {teacherProfile.streamAssigned ? `(Stream ${teacherProfile.streamAssigned})` : ''}</strong>
            </p>
          </div>
          <div className="flex items-center gap-6 bg-orange-50 px-4 py-2 rounded-lg border border-orange-100">
            <div className="text-center">
              <p className={`text-2xl font-extrabold ${skillsCoverage.percentage >= 50 ? 'text-green-600' : 'text-orange-600'}`}>
                {skillsCoverage.percentage}%
              </p>
              <p className="text-[10px] text-gray-500 uppercase font-semibold mt-1">Coverage</p>
            </div>
            <div className="h-8 w-px bg-orange-200"></div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-800">{skillsCoverage.studentsWithSkills}</p>
              <p className="text-[10px] text-gray-500 mt-1">of {skillsCoverage.totalStudents} students</p>
            </div>
          </div>
        </div>
      )}

      {/* Combined Exams & Events */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <h2 className="text-base font-bold text-gray-800 mb-3">📋 Upcoming/Ongoing</h2>

        {exams.length > 0 || announcements.length > 0 ? (
          <div className="space-y-2">
            {exams.slice(0, 3).map((exam, index) => {
              const now = new Date();
              const startDateTime = exam.startDateTime ? new Date(exam.startDateTime) : null;
              const endDateTime = exam.endDateTime ? new Date(exam.endDateTime) : null;
              const isActive = startDateTime && endDateTime && startDateTime <= now && endDateTime >= now;
              const isUpcoming = startDateTime && startDateTime > now;
              const timer = examTimers[exam._id];
              const timeRemaining = timer && !timer.isExpired ? timer.displayText : null;

              return (
                <div key={`exam-${index}`} className={`border-l-4 ${isActive ? 'border-red-500' : isUpcoming ? 'border-orange-500' : 'border-gray-300'} pl-2 py-1`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{exam.title}</span>
                    <div className="flex items-center gap-1">
                      {isActive && <span className="text-[8px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Live</span>}
                      {isUpcoming && <span className="text-[8px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Soon</span>}
                      {timer && !timer.isExpired && <span className="text-[10px] text-gray-500">{timeRemaining}</span>}
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500">{exam.type} • {exam.term}</p>
                </div>
              );
            })}

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

      {/* ============================================================ */}
      {/* ⭐ SCHOLARSHIPS & BIG EVENTS — Recent (max 3, newest first)   */}
      {/* ============================================================ */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-yellow-500">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <FiAward className="text-yellow-500" /> Scholarships & National Events
          </h2>
          <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">
            Recent
          </span>
        </div>

        {scholarships.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4 italic">
            No scholarships or big events published yet.
          </p>
        ) : (
          <div className="space-y-2">
            {scholarships.map((s) => (
              <a
                key={s._id}
                href={s.linkUrl || '#'}
                target={s.linkUrl ? '_blank' : undefined}
                rel={s.linkUrl ? 'noopener noreferrer' : undefined}
                onClick={(e) => { if (!s.linkUrl) e.preventDefault(); }}
                className={`block border-l-4 ${
                  s.category === 'scholarship' ? 'border-blue-400' : 'border-purple-400'
                } pl-2 py-1 hover:bg-gray-50 rounded-r transition-colors ${s.linkUrl ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="flex items-start gap-1">
                  <p className="text-sm font-semibold text-gray-800 line-clamp-1 flex-1">
                    {s.title}
                  </p>
                  {s.isFeatured && <FiStar className="w-3 h-3 text-yellow-500 flex-shrink-0 mt-1" />}
                  {s.linkUrl && <FiExternalLink className="w-3 h-3 text-indigo-500 flex-shrink-0 mt-1" />}
                </div>
                <p className="text-[10px] text-gray-500 flex items-center gap-1 flex-wrap">
                  {s.scope === 'kenya'
                    ? <><FiMapPin className="w-3 h-3" /> Kenya</>
                    : <><FiGlobe className="w-3 h-3" /> International</>}
                  {s.deadline && <> • Deadline {formatScholarshipDate(s.deadline)}</>}
                  {s.eventDate && <> • {formatScholarshipDate(s.eventDate)}</>}
                  {s.provider && <> • {s.provider}</>}
                </p>
              </a>
            ))}
          </div>
        )}

        <Link to="/teacher/announcements" className="block text-center text-sm text-yellow-600 hover:text-yellow-800 mt-2">
          View All →
        </Link>
      </div>

      {/* ============================================================ */}
      {/* SUBJECT PERFORMANCE — Simplified Table Format                 */}
      {/* ============================================================ */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            📊 My Subject Performance
          </h2>
          {showData && displayExam && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              Exam: <strong>{displayExam.title}</strong>
            </span>
          )}
        </div>

        {!showData ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">
              {displayExam && displayExamStatus === 'completed'
                ? `No results for ${displayExam.title}`
                : displayExam && displayExamStatus === 'upcoming'
                  ? `${displayExam.title} hasn't started yet`
                  : 'No data available'}
            </p>
          </div>
        ) : !hasTeacherResults ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">You haven't uploaded any results for this exam</p>
            <Link to="/teacher/results" className="text-sm text-green-600 hover:underline mt-1 inline-block">Upload Results</Link>
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Class / Stream</th>
                  <th className="px-2 py-3 text-center">Students</th>
                  <th className="px-2 py-3 text-center text-green-600">Pass</th>
                  <th className="px-2 py-3 text-center text-yellow-600">Avg</th>
                  <th className="px-2 py-3 text-center text-red-600">Below</th>
                  <th className="px-4 py-3 text-center">Mean Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subjectPerformance.map((subject, index) => {
                  const mean = parseFloat(subject.averageScore);
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800">{subject.subject}</td>
                      <td className="px-4 py-2 text-gray-600">
                        {subject.class}
                        {subject.stream && subject.stream !== '' ? ` • ${subject.stream}` : ''}
                      </td>
                      <td className="px-2 py-2 text-center text-gray-600 font-semibold">{subject.students}</td>
                      <td className="px-2 py-2 text-center text-green-600 font-medium">{subject.passing}</td>
                      <td className="px-2 py-2 text-center text-yellow-600 font-medium">{subject.average}</td>
                      <td className="px-2 py-2 text-center text-red-600 font-medium">{subject.belowAvg}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          mean >= 80 ? 'bg-purple-100 text-purple-700' :
                          mean >= 60 ? 'bg-green-100 text-green-700' :
                          mean >= 40 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {subject.averageScore}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Link to="/teacher/performance" className="block text-center text-sm text-green-600 hover:text-green-800 mt-3">
          View Detailed Analysis →
        </Link>
      </div>

      <style>{`
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