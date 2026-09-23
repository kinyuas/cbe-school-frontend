// src/components/admin/ClassPerformance.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../common/Layout';
import { 
  FiFilter, FiDownload, FiBarChart2, FiCalendar, FiBookOpen, 
  FiFileText, FiUsers, FiAward, FiTrendingUp, FiTrendingDown, 
  FiMinus, FiAlertCircle, FiMonitor, FiSmartphone, FiTablet,
  FiRefreshCw, FiCheckCircle, FiXCircle, FiInfo
} from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import toast from 'react-hot-toast';
import api from '../../services/api';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
} from 'docx';
import { saveAs } from 'file-saver';

// ===== CLASS ORDER =====
const CLASS_ORDER = [
  'Play Group', 'Pre-Primary 1', 'Pre-Primary 2',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
];

// ===== CBE subjects per class (fallback reference) =====
const SUBJECTS_BY_CLASS = {
  'Play Group': ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Psychomotor and Creative Activities', 'Religious Education Activities', 'Social Skills'],
  'Pre-Primary 1': ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Psychomotor and Creative Activities', 'Religious Education Activities'],
  'Pre-Primary 2': ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Psychomotor and Creative Activities', 'Religious Education Activities'],
  'Grade 1': ['English', 'Kiswahili', 'Mathematics', 'Environmental Activities', 'Hygiene and Nutrition', 'Religious Education', 'Creative Arts'],
  'Grade 2': ['English', 'Kiswahili', 'Mathematics', 'Environmental Activities', 'Hygiene and Nutrition', 'Religious Education', 'Creative Arts'],
  'Grade 3': ['English', 'Kiswahili', 'Mathematics', 'Environmental Activities', 'Hygiene and Nutrition', 'Religious Education', 'Creative Arts'],
  'Grade 4': ['English', 'Kiswahili', 'Mathematics', 'Science and Technology', 'Social Studies', 'Religious Education', 'Creative Arts', 'Physical and Health Education'],
  'Grade 5': ['English', 'Kiswahili', 'Mathematics', 'Science and Technology', 'Social Studies', 'Religious Education', 'Creative Arts', 'Physical and Health Education', 'Agriculture and Nutrition'],
  'Grade 6': ['English', 'Kiswahili', 'Mathematics', 'Science and Technology', 'Social Studies', 'Religious Education', 'Creative Arts', 'Physical and Health Education', 'Agriculture and Nutrition'],
  'Grade 7': ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Health Education', 'Pre-Technical Studies', 'Social Studies', 'Religious Education', 'Creative Arts and Sports', 'Business Studies', 'Agriculture', 'Computer Science'],
  'Grade 8': ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Health Education', 'Pre-Technical Studies', 'Social Studies', 'Religious Education', 'Creative Arts and Sports', 'Business Studies', 'Agriculture', 'Computer Science'],
  'Grade 9': ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Health Education', 'Pre-Technical Studies', 'Social Studies', 'Religious Education', 'Creative Arts and Sports', 'Business Studies', 'Agriculture', 'Computer Science'],
  'Grade 10': ['English', 'Kiswahili', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Religious Education', 'Business Studies', 'Computer Studies', 'Agriculture'],
  'Grade 11': ['English', 'Kiswahili', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Religious Education', 'Business Studies', 'Computer Studies', 'Agriculture'],
  'Grade 12': ['English', 'Kiswahili', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Religious Education', 'Business Studies', 'Computer Studies', 'Agriculture']
};

// ===== AI Device Detection =====
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
const useResponsiveClasses = (deviceInfo) => ({
  cardPadding: deviceInfo.isMobile ? 'p-3' : 'p-5',
  headingSize: deviceInfo.isMobile ? 'text-base' : 'text-lg',
  textSize: deviceInfo.isMobile ? 'text-xs' : 'text-sm',
  buttonSize: deviceInfo.isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
  gridGap: deviceInfo.isMobile ? 'gap-2' : 'gap-4',
  statsGrid: deviceInfo.isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4',
  filterGrid: deviceInfo.isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
});

// ===== Sorting =====
const getClassOrder = (className) => {
  const i = CLASS_ORDER.indexOf(className);
  return i !== -1 ? i : 999;
};
const sortClassesByOrder = (classes) => [...classes].sort((a, b) => getClassOrder(a) - getClassOrder(b));

// ===== Normalizer =====
const norm = (v) => String(v || '').trim().toLowerCase();

// ===== Display exam rule =====
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
    if (start > now) return { exam, nextExam, status: 'upcoming' };
    if (nextExam) {
      const nextStart = new Date(nextExam.startDateTime);
      if (now < nextStart) {
        const end = exam.endDateTime ? new Date(exam.endDateTime) : null;
        return { exam, nextExam, status: end && now <= end ? 'active' : 'completed' };
      }
    } else {
      const end = exam.endDateTime ? new Date(exam.endDateTime) : null;
      return { exam, nextExam: null, status: end && now <= end ? 'active' : 'completed' };
    }
  }
  return { exam: null, nextExam: null, status: 'none' };
};

const getNextUpcomingExam = (examsData) => {
  const now = new Date();
  const upcoming = examsData
    .filter(e => e.startDateTime && e.isActive !== false && new Date(e.startDateTime) > now)
    .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
  return upcoming.length > 0 ? upcoming[0] : null;
};

const resultBelongsToExam = (result, exam) => {
  if (!result || !exam) return false;
  return (
    norm(result.examName) === norm(exam.title) &&
    norm(result.examType) === norm(exam.type) &&
    norm(result.term) === norm(exam.term) &&
    String(result.year || '') === String(exam.year || '')
  );
};

const ClassPerformance = () => {
  const deviceInfo = useDeviceDetection();
  const responsive = useResponsiveClasses(deviceInfo);
  
  const { user } = useAuth();
  const teacherId = user?._id || user?.id || user?.teacherId;
  const teacherName = user?.name || user?.username || '';
  
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teacherResults, setTeacherResults] = useState([]);
  const [subjectPerformance, setSubjectPerformance] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [displayExam, setDisplayExam] = useState(null);
  const [displayExamStatus, setDisplayExamStatus] = useState('none');
  const [nextExam, setNextExam] = useState(null);
  
  const [userRole, setUserRole] = useState(null);
  
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableExamNames, setAvailableExamNames] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableExamTypes, setAvailableExamTypes] = useState([]);
  const [availableStreams, setAvailableStreams] = useState([]);
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('');
  const [selectedExamName, setSelectedExamName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  
  const [historicalData, setHistoricalData] = useState([]);
  
  const [schoolInfo, setSchoolInfo] = useState({ name: '', classes: [], streams: [] });
  const [performanceData, setPerformanceData] = useState([]);
  const [classAverage, setClassAverage] = useState(0);
  const [topStudent, setTopStudent] = useState(null);

  const terms = ['Term 1', 'Term 2', 'Term 3'];

  const competencyLevels = [
    { level: 'Exceeding Expectation (EE)', minScore: 80, maxScore: 100, color: 'bg-purple-100 text-purple-800' },
    { level: 'Meeting Expectation (ME)', minScore: 60, maxScore: 79, color: 'bg-green-100 text-green-800' },
    { level: 'Approaching Expectation (AE)', minScore: 40, maxScore: 59, color: 'bg-blue-100 text-blue-800' },
    { level: 'Below Expectation (BE)', minScore: 20, maxScore: 39, color: 'bg-yellow-100 text-yellow-800' },
    { level: 'Well Below Expectation (WBE)', minScore: 0, maxScore: 19, color: 'bg-red-100 text-red-800' }
  ];

  const getCompetencyFromMarks = (marks) => {
    if (marks === null || marks === undefined) return null;
    const score = parseFloat(marks);
    if (isNaN(score)) return null;
    return competencyLevels.find(l => score >= l.minScore && score <= l.maxScore);
  };

  const findPupilById = (pupilId, learners) => {
    if (!pupilId || !learners || learners.length === 0) return null;
    const pupilIdStr = String(pupilId);
    return learners.find(p => {
      if (!p) return false;
      if (p._id) return String(p._id) === pupilIdStr;
      if (p.id) return String(p.id) === pupilIdStr;
      return false;
    }) || null;
  };

  useEffect(() => {
    loadData();
    getUserRole();
  }, []);

  const getUserRole = () => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUserRole(userData.role);
  };

  // ============================================================
  // SUBJECTS LIST
  // ============================================================
  useEffect(() => {
    if (selectedClass) {
      const classSubjectSet = new Set();
      
      results.forEach(r => {
        const pupilId = r.pupilId?._id || r.pupilId;
        if (!pupilId) return;
        const pupil = findPupilById(pupilId, students);
        if (!pupil) return;
        const pClass = pupil.class || pupil.grade;
        if (pClass === selectedClass && r.subject) {
          classSubjectSet.add(r.subject);
        }
      });
      
      const curriculum = SUBJECTS_BY_CLASS[selectedClass] || [];
      const allSubjects = [...new Set([...classSubjectSet, ...curriculum])];
      allSubjects.sort((a, b) => a.localeCompare(b));
      setAvailableSubjects(allSubjects);
      
      if (selectedSubject && !allSubjects.includes(selectedSubject)) {
        setSelectedSubject('');
      }
      
      const classData = schoolInfo.classes?.find(c => c.name === selectedClass);
      const schoolStreams = classData?.streams || [];
      const resultStreams = [...new Set(
        students
          .filter(s => (s.class === selectedClass || s.grade === selectedClass) && s.stream)
          .map(s => s.stream)
      )];
      const allStreams = [...new Set([...schoolStreams, ...resultStreams])];
      setAvailableStreams(allStreams);
      
      // Default to "All Streams" so teachers see the whole class by default
      setSelectedStream('');
    } else {
      setAvailableSubjects([]);
      setAvailableStreams([]);
      setSelectedStream('');
    }
  }, [selectedClass, schoolInfo, students, results]);

  // ============================================================
  // EXAM NAMES
  // ============================================================
  useEffect(() => {
    if (selectedExamType) {
      const filtered = exams.filter(e =>
        e.type === selectedExamType &&
        (!selectedTerm || e.term === selectedTerm) &&
        (!selectedYear || e.year === selectedYear)
      );
      const names = [...new Set(filtered.map(e => e.title))];
      setAvailableExamNames(names);
      setSelectedExamName('');
    } else {
      setAvailableExamNames([]);
      setSelectedExamName('');
    }
  }, [selectedExamType, selectedTerm, selectedYear, exams]);

  // ============================================================
  // Load data
  // ============================================================
  const loadData = async () => {
    setLoading(true);
    try {
      // ===== SCHOOL INFO =====
      let schoolFromApi = null;
      const schoolRes = await api.get('/school/settings');
      if (schoolRes.data.success && schoolRes.data.data) {
        schoolFromApi = schoolRes.data.data;
      } else {
        const stored = localStorage.getItem('schoolInfo');
        if (stored) schoolFromApi = JSON.parse(stored);
      }

      if (schoolFromApi) {
        const normalized = {
          ...schoolFromApi,
          name: schoolFromApi.schoolName || schoolFromApi.name || '',
          phone: schoolFromApi.phoneNumber || schoolFromApi.phone || '',
          email: schoolFromApi.schoolEmail || schoolFromApi.email || '',
          poBox: schoolFromApi.poBox || schoolFromApi.address || ''
        };
        setSchoolInfo(normalized);
        try { localStorage.setItem('schoolInfo', JSON.stringify(normalized)); } catch (e) {}

        const activeClasses = (normalized.classes || [])
          .filter(c => c.isActive !== false)
          .map(c => c.name);
        setAvailableClasses(sortClassesByOrder(activeClasses));
      }
      
      // Students
      const studentsRes = await api.get('/pupils');
      const studentsData = studentsRes.data?.data || [];
      setStudents(studentsData);
      
      // ALL results
      const resultsRes = await api.get('/results');
      const allResults = resultsRes.data?.data || [];
      setResults(allResults);
      
      // Exams
      const examsRes = await api.get('/exams');
      let examsData = [];
      if (examsRes.data.success) {
        examsData = examsRes.data.data || [];
        setExams(examsData);
        setAvailableExamTypes([...new Set(examsData.map(e => e.type).filter(Boolean))]);
      }
      
      // Teacher's own results
      let teacherResultsData = [];
      if (teacherId) {
        teacherResultsData = allResults.filter(r => {
          const recordedBy = r.recordedBy || r.teacherId || r.createdBy;
          return recordedBy === teacherId;
        });
      }
      if (teacherResultsData.length === 0 && teacherName) {
        teacherResultsData = allResults.filter(r => {
          const submittedBy = r.submittedBy || r.updatedBy || r.createdBy || '';
          return submittedBy === teacherName || submittedBy.includes(teacherName);
        });
      }
      
      // Display exam
      const { exam: examToDisplay, status: examStatus } = getCurrentDisplayExam(examsData);
      setDisplayExam(examToDisplay);
      setDisplayExamStatus(examStatus);
      setNextExam(getNextUpcomingExam(examsData));
      
      let summaryResults = [];
      let summaryClasses = [];
      let summarySubjects = [];
      let summaryTotalResults = 0;
      
      const showSummary = examToDisplay && (examStatus === 'active' || examStatus === 'completed');
      
      if (showSummary && examToDisplay) {
        summaryResults = teacherResultsData.filter(r => resultBelongsToExam(r, examToDisplay));
        setTeacherResults(summaryResults);
        summaryTotalResults = summaryResults.length;
        
        const classes = new Set();
        const subjects = new Set();
        summaryResults.forEach(r => {
          const pupilId = r.pupilId?._id || r.pupilId;
          if (pupilId) {
            const pupil = findPupilById(pupilId, studentsData);
            if (pupil) {
              if (pupil.class) classes.add(pupil.class);
              if (pupil.grade) classes.add(pupil.grade);
            }
          }
          if (r.subject) subjects.add(r.subject);
        });
        summaryClasses = [...classes];
        summarySubjects = [...subjects];
        calculateSubjectPerformance(summaryResults, studentsData, examToDisplay);
      } else {
        setTeacherResults([]);
        setSubjectPerformance([]);
        setTeacherClasses([]);
        setTeacherSubjects([]);
        summaryTotalResults = 0;
      }
      
      setTotalResults(summaryTotalResults);
      setTeacherClasses(summaryClasses);
      setTeacherSubjects(summarySubjects);
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data from database');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // Subject performance grouping
  // ============================================================
  const calculateSubjectPerformance = (resultsData, learners, examContext = null) => {
    const performanceBySubject = {};
    const studentList = learners || students;
    
    resultsData.forEach(result => {
      const subject = result.subject || 'Unknown Subject';
      const marks = parseFloat(result.marks || result.score || 0);
      if (isNaN(marks)) return;
      
      const pupilId = result.pupilId?._id || result.pupilId;
      const pupil = pupilId ? findPupilById(pupilId, studentList) : null;
      
      const className = pupil?.class || pupil?.grade || 'Unknown Class';
      const stream = pupil?.stream || '';
      const key = `${subject}_${className}_${stream || 'no-stream'}`;
      
      if (!performanceBySubject[key]) {
        performanceBySubject[key] = {
          subject, class: className, stream: stream || null,
          examName: examContext?.title || result.examName || 'Assessment',
          examType: examContext?.type || result.examType || '',
          term: examContext?.term || result.term || '',
          year: examContext?.year || result.year || new Date().getFullYear(),
          totalMarks: 0, count: 0, passing: 0, failing: 0,
          students: new Set()
        };
      }
      
      performanceBySubject[key].totalMarks += marks;
      performanceBySubject[key].count += 1;
      if (marks >= 60) performanceBySubject[key].passing += 1;
      else performanceBySubject[key].failing += 1;
      if (pupilId) performanceBySubject[key].students.add(String(pupilId));
    });
    
    const performanceDataOut = Object.values(performanceBySubject).map(d => ({
      subject: d.subject, class: d.class, stream: d.stream,
      examName: d.examName, examType: d.examType, term: d.term, year: d.year,
      average: (d.count > 0 ? d.totalMarks / d.count : 0).toFixed(1),
      students: d.students.size, totalResults: d.count,
      passing: d.passing, failing: d.failing
    }));
    
    performanceDataOut.sort((a, b) => {
      if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
      if (a.class !== b.class) return a.class.localeCompare(b.class);
      return (a.stream || '').localeCompare(b.stream || '');
    });
    
    setSubjectPerformance(performanceDataOut);
  };

  const loadHistoricalData = async () => {
    if (!selectedSubject || !selectedClass) return;
    try {
      const previousExams = exams.filter(e =>
        e.type === selectedExamType &&
        e.term === selectedTerm &&
        e.year < selectedYear
      ).sort((a, b) => b.year - a.year);

      const historical = [];
      for (const exam of previousExams.slice(0, 3)) {
        const response = await api.get('/results', {
          params: {
            class: selectedClass,
            examType: selectedExamType,
            examName: exam.title,
            term: selectedTerm,
            year: exam.year,
            stream: (selectedStream && selectedStream !== 'all') ? selectedStream : undefined,
            subject: selectedSubject
          }
        });
        const examResults = response.data?.data || [];
        if (examResults.length > 0) {
          const avg = examResults.reduce((s, r) => s + (r.marks || 0), 0) / examResults.length;
          historical.push({ year: exam.year, examName: exam.title, average: avg, studentCount: examResults.length });
        }
      }
      setHistoricalData(historical);
    } catch (e) {
      console.error('Historical load error:', e);
    }
  };

  // ============================================================
  // VIEW DETAILED — School-wide, allows "All Streams"
  // ============================================================
  const loadPerformanceData = async () => {
    if (!selectedClass) { toast.error('Please select a class'); return; }
    if (!selectedSubject) { toast.error('Please select a subject'); return; }
    if (!selectedExamType) { toast.error('Please select an exam type'); return; }
    if (!selectedExamName) { toast.error('Please select an exam name'); return; }
    
    setLoadingData(true);
    
    try {
      let classStudents = students.filter(s => (s.class === selectedClass || s.grade === selectedClass));
      // ✅ Only filter by stream if a specific stream was chosen (not "All Streams")
      if (selectedStream && selectedStream !== 'all' && selectedStream !== '') {
        classStudents = classStudents.filter(s => s.stream === selectedStream);
      }
      
      if (classStudents.length === 0) {
        toast.error(`No students found in ${selectedClass}${selectedStream ? ` - ${selectedStream}` : ''}`);
        setShowResults(false);
        setLoadingData(false);
        return;
      }
      
      const response = await api.get('/results', {
        params: {
          class: selectedClass,
          examType: selectedExamType,
          examName: selectedExamName,
          term: selectedTerm,
          year: selectedYear,
          stream: (selectedStream && selectedStream !== 'all') ? selectedStream : undefined,
          subject: selectedSubject
        }
      });
      
      const filteredResults = response.data?.data || [];
      
      if (filteredResults.length === 0) {
        toast.error(`No performance data found for ${selectedSubject} in ${selectedClass}`);
        setShowResults(false);
        setLoadingData(false);
        return;
      }
      
      const totalScore = filteredResults.reduce((sum, r) => sum + (r.marks || 0), 0);
      const avgScore = totalScore / filteredResults.length;
      
      const studentPerformance = classStudents.map(student => {
        const studentResult = filteredResults.find(r => {
          const pupilId = r.pupilId?._id || r.pupilId;
          if (!pupilId) return false;
          const pId = student._id?._id || student._id || student.id;
          return String(pId) === String(pupilId);
        });
        
        const marks = studentResult?.marks || 0;
        const competency = getCompetencyFromMarks(marks);
        
        return {
          ...student,
          marks,
          competencyLevel: competency ? competency.level : 'Not Assessed',
          grade: getGradeFromMarks(marks),
          remarks: getRemarksFromMarks(marks)
        };
      }).sort((a, b) => b.marks - a.marks);
      
      setPerformanceData(studentPerformance);
      setClassAverage(avgScore);
      
      let topStudentData = null;
      let highest = 0;
      filteredResults.forEach(r => {
        if ((r.marks || 0) > highest) {
          highest = r.marks || 0;
          const pupilId = r.pupilId?._id || r.pupilId;
          if (pupilId) {
            const student = classStudents.find(s => {
              const pId = s._id?._id || s._id || s.id;
              return String(pId) === String(pupilId);
            });
            if (student) topStudentData = { name: student.name, admNo: student.admNo, score: r.marks };
          }
        }
      });
      setTopStudent(topStudentData);
      
      setShowResults(true);
      await loadHistoricalData();
      
      toast.success(`Found ${studentPerformance.length} student records for ${selectedSubject}`);
      
    } catch (error) {
      console.error('Error loading performance data:', error);
      toast.error('Failed to load performance data');
    } finally {
      setLoadingData(false);
    }
  };

  const getGradeFromMarks = (marks) => {
    if (marks >= 80) return 'A';
    if (marks >= 70) return 'B+';
    if (marks >= 60) return 'B';
    if (marks >= 50) return 'C+';
    if (marks >= 40) return 'C';
    if (marks >= 30) return 'D';
    return 'E';
  };

  const getRemarksFromMarks = (marks) => {
    if (marks >= 80) return 'Excellent';
    if (marks >= 60) return 'Good';
    if (marks >= 40) return 'Satisfactory';
    return 'Needs Improvement';
  };

  const resetFilters = () => {
    setSelectedClass('');
    setSelectedStream('');
    setSelectedTerm('');
    setSelectedExamType('');
    setSelectedExamName('');
    setSelectedSubject('');
    setSelectedYear(new Date().getFullYear());
    setPerformanceData([]);
    setHistoricalData([]);
    setShowResults(false);
    toast.success('Filters reset');
  };

  // ============================================================
  // Excel Export
  // ============================================================
  const downloadResultsExcel = () => {
    if (performanceData.length === 0) {
      toast.error('No data to download');
      return;
    }

    const streamLabel = selectedStream && selectedStream !== 'all' ? selectedStream : 'All Streams';

    const worksheetData = [
      [`${schoolInfo.name || 'School Name'}`],
      [`Subject Performance Report - ${selectedSubject}`],
      [],
      [`Class: ${selectedClass}${selectedStream && selectedStream !== 'all' ? ` - ${selectedStream}` : ' - All Streams'}`],
      [`Year: ${selectedYear} | Term: ${selectedTerm || 'All Terms'}`],
      [`Exam: ${selectedExamName} (${selectedExamType})`],
      [`Subject: ${selectedSubject}`],
      [`Stream: ${streamLabel}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ['Student Name', 'Admission Number', 'Stream', 'Marks (%)', 'Grade', 'Competency Level', 'Remarks'],
      ...performanceData.map(s => [
        s.name, s.admNo || 'N/A', s.stream || 'N/A',
        s.marks.toFixed(1), s.grade, s.competencyLevel, s.remarks
      ]),
      [],
      ['Summary Statistics'],
      [`Total Students: ${performanceData.length}`],
      [`Class Average: ${classAverage.toFixed(1)}%`],
      [`Highest Score: ${Math.max(...performanceData.map(s => s.marks))}%`],
      [`Lowest Score: ${Math.min(...performanceData.map(s => s.marks))}%`],
      [],
      ['Competency Distribution'],
      ...competencyLevels.map(level => {
        const count = performanceData.filter(s => getCompetencyFromMarks(s.marks)?.level === level.level).length;
        const percentage = (count / performanceData.length * 100).toFixed(1);
        return [`${level.level}: ${count} students (${percentage}%)`];
      })
    ];
    
    if (historicalData.length > 0) {
      worksheetData.push([], ['Historical Performance Comparison']);
      worksheetData.push(['Year', 'Exam Name', 'Average Score (%)', 'Student Count']);
      historicalData.forEach(d => worksheetData.push([d.year, d.examName, d.average.toFixed(1), d.studentCount]));
    }
    
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${selectedSubject}_Performance`);
    XLSX.writeFile(wb, `${schoolInfo.name}_${selectedClass}_${streamLabel}_${selectedSubject}_${selectedExamName}_${selectedYear}.xlsx`);
    toast.success('Excel report downloaded successfully');
  };

  // ============================================================
  // Word Export
  // ============================================================
  const downloadResultsWord = async () => {
    if (performanceData.length === 0) {
      toast.error('No data to download');
      return;
    }

    try {
      const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
      const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
      const streamLabel = selectedStream && selectedStream !== 'all' ? selectedStream : 'All Streams';

      const children = [];

      children.push(
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (schoolInfo.name || 'School Name').toUpperCase(), bold: true, size: 30 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: schoolInfo.poBox || schoolInfo.address || '', size: 18 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${schoolInfo.phone || ''} | ${schoolInfo.email || ''}`, size: 18 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 150, after: 100 }, children: [new TextRun({ text: 'SUBJECT PERFORMANCE REPORT', bold: true, size: 24 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 150 }, children: [new TextRun({ text: selectedSubject, bold: true, size: 22 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `${selectedClass} — ${streamLabel} | Year: ${selectedYear} | Term: ${selectedTerm || 'All Terms'} | Exam: ${selectedExamName}`, size: 18 })] }),
      );

      const headerCells = [
        new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '#', bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ children: [new TextRun({ text: 'Student Name', bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Adm No', bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Stream', bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'E0EEFF' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Marks (%)', bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Grade', bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'E0FFE0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Competency', bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Remarks', bold: true, size: 18 })] })] }),
      ];

      const tableHeader = new TableRow({ children: headerCells });

      const bodyRows = performanceData.map((s, idx) => new TableRow({
        children: [
          new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(idx + 1), size: 18 })] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: s.name, size: 18 })] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.admNo || '-', size: 18 })] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.stream || '-', size: 18 })] })] }),
          new TableCell({ borders: cellBorders, shading: { fill: 'F8FBFF' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.marks.toFixed(1), bold: true, size: 18 })] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.grade, bold: true, size: 18 })] })] }),
          new TableCell({ borders: cellBorders, shading: { fill: 'F8FFF8' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.competencyLevel, size: 18 })] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: s.remarks, size: 18 })] })] }),
        ],
      }));

      const resultsTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [tableHeader, ...bodyRows],
      });

      children.push(resultsTable);

      children.push(
        new Paragraph({ spacing: { before: 300 }, children: [] }),
        new Paragraph({ children: [new TextRun({ text: 'SUMMARY', bold: true, size: 22 })] }),
        new Paragraph({ children: [new TextRun({ text: `Total Students: ${performanceData.length}`, size: 18 })] }),
        new Paragraph({ children: [new TextRun({ text: `Class Average: ${classAverage.toFixed(1)}%`, size: 18 })] }),
        new Paragraph({ children: [new TextRun({ text: `Highest Score: ${Math.max(...performanceData.map(s => s.marks)).toFixed(1)}%`, size: 18 })] }),
        new Paragraph({ children: [new TextRun({ text: `Lowest Score: ${Math.min(...performanceData.map(s => s.marks)).toFixed(1)}%`, size: 18 })] }),
      );

      children.push(
        new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: 'COMPETENCY DISTRIBUTION', bold: true, size: 20 })] }),
      );
      competencyLevels.forEach(level => {
        const count = performanceData.filter(s => getCompetencyFromMarks(s.marks)?.level === level.level).length;
        const percentage = performanceData.length > 0 ? (count / performanceData.length * 100).toFixed(1) : '0';
        children.push(new Paragraph({
          children: [new TextRun({ text: `${level.level}: ${count} student(s) (${percentage}%)`, size: 18 })]
        }));
      });

      if (historicalData.length > 0) {
        children.push(
          new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: 'HISTORICAL PERFORMANCE', bold: true, size: 20 })] }),
        );
        historicalData.forEach(d => {
          children.push(new Paragraph({
            children: [new TextRun({ text: `${d.year} — ${d.examName}: ${d.average.toFixed(1)}% (${d.studentCount} students)`, size: 18 })]
          }));
        });
      }

      children.push(
        new Paragraph({ spacing: { before: 300 }, children: [] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Generated on ${new Date().toLocaleString()}`, size: 16, italics: true })] }),
      );

      const doc = new Document({ sections: [{ properties: {}, children }] });
      const blob = await Packer.toBlob(doc);
      const safeName = (schoolInfo.name || 'School').replace(/[^a-z0-9]/gi, '_');
      const safeSubject = selectedSubject.replace(/[^a-z0-9]/gi, '_');
      saveAs(blob, `${safeName}_${selectedClass}_${streamLabel}_${safeSubject}_${selectedYear}.docx`);
      toast.success('Word report downloaded successfully');
    } catch (error) {
      console.error('Error generating Word document:', error);
      toast.error('Failed to generate Word document: ' + error.message);
    }
  };

  const years = [2023, 2024, 2025, 2026];

  if (loading) {
    return (
      <Layout title="Class Performance" subtitle="Track class performance metrics">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  const hasSummaryResults = totalResults > 0 && (displayExamStatus === 'active' || displayExamStatus === 'completed');
  const showData = displayExam && (displayExamStatus === 'active' || displayExamStatus === 'completed');

  const overallMean = subjectPerformance.length > 0
    ? (subjectPerformance.reduce((sum, s) => sum + parseFloat(s.average || 0), 0) / subjectPerformance.length).toFixed(1)
    : '0.0';
  const totalStudentsInExam = subjectPerformance.reduce((sum, s) => sum + s.students, 0);

  return (
    <Layout title="Subject Performance" subtitle="View and analyze subject-specific performance">
      
      {/* Header — includes school name */}
      <div className={`bg-gradient-to-r from-green-600 to-blue-600 rounded-xl ${deviceInfo.isMobile ? 'p-3' : 'p-5'} mb-4 text-white`}>
        <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'items-center gap-3'}`}>
          <div className="flex items-center gap-3">
            <FiBarChart2 className={`${deviceInfo.isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
            <div>
              <h2 className={`${deviceInfo.isMobile ? 'text-base' : 'text-xl'} font-bold`}>
                {schoolInfo.name || 'School Name'}
              </h2>
              <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-sm'} opacity-90`}>
                Subject Performance {userRole === 'teacher' ? `• ${teacherName}` : ''}
              </p>
            </div>
          </div>
          <button onClick={loadData} className={`${deviceInfo.isMobile ? 'w-full mt-2' : 'ml-auto'} bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center justify-center gap-2 px-3 py-2 text-sm`}>
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {displayExam ? (
        <div className={`rounded-lg p-3 mb-4 flex items-center gap-3 ${
          displayExamStatus === 'active' ? 'bg-green-50 border border-green-200'
          : displayExamStatus === 'completed' ? 'bg-blue-50 border border-blue-200'
          : 'bg-gray-50 border border-gray-200'
        }`}>
          {displayExamStatus === 'active' ? (
            <FiCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <FiInfo className={`w-5 h-5 flex-shrink-0 ${displayExamStatus === 'completed' ? 'text-blue-600' : 'text-gray-500'}`} />
          )}
          <div className={`text-sm ${displayExamStatus === 'active' ? 'text-green-700' : displayExamStatus === 'completed' ? 'text-blue-700' : 'text-gray-600'}`}>
            <span className="font-semibold">
              {displayExamStatus === 'active' ? '📝' : displayExamStatus === 'completed' ? '📊' : '📅'} {displayExam.title}
            </span>
            <span className="text-xs ml-2 opacity-70">
              {displayExamStatus === 'active' ? 'Active' : displayExamStatus === 'completed' ? 'Completed' : 'Upcoming'}
              {displayExam.endDateTime && ` • ${new Date(displayExam.endDateTime).toLocaleDateString()}`}
            </span>
            {displayExamStatus === 'upcoming' && (
              <span className="text-xs block mt-1 text-gray-500">Results will appear once this exam starts.</span>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 flex items-center gap-3">
          <FiInfo className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <div className="text-sm text-gray-600"><span className="font-semibold">📋 No exams available</span></div>
        </div>
      )}

      {/* Summary — Teacher's own results for the display exam */}
      {hasSummaryResults && displayExam && (
        <div className={`bg-white rounded-lg shadow-md ${responsive.cardPadding} mb-4`}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className={`${responsive.headingSize} font-bold text-gray-800 flex items-center gap-2`}>
              <FiBookOpen className="text-green-600" /> My Subject Performance
            </h3>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              Exam: <strong>{displayExam.title}</strong>
            </span>
          </div>

          {subjectPerformance.length > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Subjects</p>
                  <p className="text-lg font-bold text-blue-700">{subjectPerformance.length}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Mean Score</p>
                  <p className={`text-lg font-bold ${
                    parseFloat(overallMean) >= 80 ? 'text-purple-600' :
                    parseFloat(overallMean) >= 60 ? 'text-green-600' :
                    parseFloat(overallMean) >= 40 ? 'text-blue-600' : 'text-red-600'
                  }`}>{overallMean}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Students</p>
                  <p className="text-lg font-bold text-green-700">{totalStudentsInExam}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {subjectPerformance.map((subject, index) => {
              const mean = parseFloat(subject.average);
              const passRate = subject.totalResults > 0
                ? ((subject.passing / subject.totalResults) * 100).toFixed(0) : '0';

              return (
                <div key={index} className="border border-gray-100 rounded-lg p-3 hover:shadow-sm transition-shadow">
                  <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{subject.subject}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {subject.class}
                        {subject.stream && subject.stream !== '' ? ` • Stream ${subject.stream}` : ''}
                        {' • '}{subject.examName}
                      </p>
                    </div>
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold text-xs">
                      {subject.students} student{subject.students !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs mb-1">
                    <div className="flex items-center gap-3">
                      <span className="text-green-600">✓ {subject.passing} passed</span>
                      <span className="text-red-600">✗ {subject.failing} failed</span>
                      <span className="text-gray-500">({passRate}% pass)</span>
                    </div>
                    <span className={`font-bold ${
                      mean >= 80 ? 'text-purple-600' :
                      mean >= 60 ? 'text-green-600' :
                      mean >= 40 ? 'text-blue-600' : 'text-red-600'
                    }`}>Mean: {subject.average}%</span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`rounded-full h-2 transition-all ${
                      mean >= 80 ? 'bg-purple-500' :
                      mean >= 60 ? 'bg-green-500' :
                      mean >= 40 ? 'bg-blue-500' : 'bg-red-500'
                    }`} style={{ width: `${Math.min(mean, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FILTER SECTION */}
      <div className={`bg-white rounded-lg shadow-md ${responsive.cardPadding} mb-4`}>
        <h2 className={`${responsive.headingSize} font-bold text-gray-800 mb-3 flex items-center gap-2`}>
          <FiFilter className="text-green-600" /> Filters
          <span className="text-xs font-normal text-gray-400 ml-2">
            (View results for any class, any stream, or the full class)
          </span>
        </h2>
        
        <div className={`grid ${responsive.filterGrid} ${responsive.gridGap}`}>
          <div>
            <label className={`block text-gray-700 font-medium mb-1 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>Year</label>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className={`input-field w-full ${deviceInfo.isMobile ? 'text-base' : ''}`}>
              {years.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          
          <div>
            <label className={`block text-gray-700 font-medium mb-1 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>Class</label>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className={`input-field w-full ${deviceInfo.isMobile ? 'text-base' : ''}`}>
              <option value="">All Classes</option>
              {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
          </div>
          
          {selectedClass && availableStreams.length > 0 && (
            <div>
              <label className={`block text-gray-700 font-medium mb-1 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>Stream</label>
              <select value={selectedStream} onChange={(e) => setSelectedStream(e.target.value)} className={`input-field w-full ${deviceInfo.isMobile ? 'text-base' : ''}`}>
                <option value="">All Streams (Whole Class)</option>
                {availableStreams.map(stream => <option key={stream} value={stream}>{stream}</option>)}
              </select>
            </div>
          )}
          
          <div>
            <label className={`block text-gray-700 font-medium mb-1 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>Subject</label>
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className={`input-field w-full ${deviceInfo.isMobile ? 'text-base' : ''}`} disabled={!selectedClass}>
              <option value="">{!selectedClass ? 'Select class first' : 'All Subjects'}</option>
              {availableSubjects.map(subject => <option key={subject} value={subject}>{subject}</option>)}
            </select>
          </div>
          
          <div>
            <label className={`block text-gray-700 font-medium mb-1 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>Term</label>
            <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className={`input-field w-full ${deviceInfo.isMobile ? 'text-base' : ''}`}>
              <option value="">All Terms</option>
              {terms.map(term => <option key={term} value={term}>{term}</option>)}
            </select>
          </div>
          
          <div>
            <label className={`block text-gray-700 font-medium mb-1 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>Exam Type</label>
            <select value={selectedExamType} onChange={(e) => setSelectedExamType(e.target.value)} className={`input-field w-full ${deviceInfo.isMobile ? 'text-base' : ''}`}>
              <option value="">All Exam Types</option>
              {availableExamTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          
          <div>
            <label className={`block text-gray-700 font-medium mb-1 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>Exam Name</label>
            <select value={selectedExamName} onChange={(e) => setSelectedExamName(e.target.value)} className={`input-field w-full ${deviceInfo.isMobile ? 'text-base' : ''}`} disabled={!selectedExamType}>
              <option value="">{!selectedExamType ? 'Select exam type first' : 'All Exam Names'}</option>
              {availableExamNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </div>
        
        <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'gap-3'} mt-4`}>
          <button onClick={loadPerformanceData} disabled={loadingData} className={`btn-primary flex items-center justify-center gap-2 disabled:opacity-50 ${deviceInfo.isMobile ? 'w-full py-2.5 text-sm' : ''}`}>
            <FiBarChart2 /> {loadingData ? 'Loading...' : 'VIEW DETAILED'}
          </button>
          <button onClick={resetFilters} className={`bg-gray-500 hover:bg-gray-600 text-white rounded-lg ${deviceInfo.isMobile ? 'w-full px-4 py-2.5 text-sm' : 'px-4 py-2'}`}>
            RESET
          </button>
        </div>
      </div>

      {/* DETAILED RESULTS SECTION */}
      {showResults && performanceData.length > 0 && (
        <>
          <div className={`grid ${responsive.statsGrid} ${responsive.gridGap} mb-4`}>
            <div className={`bg-white rounded-lg shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-4'} text-center`}>
              <FiUsers className={`${deviceInfo.isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-blue-500 mx-auto mb-1`} />
              <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-sm'} text-gray-500`}>Students</p>
              <p className={`${deviceInfo.isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-800`}>{performanceData.length}</p>
            </div>
            <div className={`bg-white rounded-lg shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-4'} text-center`}>
              <FiBarChart2 className={`${deviceInfo.isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-green-500 mx-auto mb-1`} />
              <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-sm'} text-gray-500`}>Average</p>
              <p className={`${deviceInfo.isMobile ? 'text-xl' : 'text-2xl'} font-bold text-green-600`}>{classAverage.toFixed(1)}%</p>
            </div>
            <div className={`bg-white rounded-lg shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-4'} text-center`}>
              <FiAward className={`${deviceInfo.isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-yellow-500 mx-auto mb-1`} />
              <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-sm'} text-gray-500`}>Highest</p>
              <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} font-bold text-gray-800 truncate`}>{topStudent?.name || 'N/A'}</p>
              <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500`}>{topStudent?.score?.toFixed(1)}%</p>
            </div>
            <div className={`bg-white rounded-lg shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-4'} text-center`}>
              <FiBookOpen className={`${deviceInfo.isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-purple-500 mx-auto mb-1`} />
              <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-sm'} text-gray-500`}>Subject</p>
              <p className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-bold text-purple-600 truncate`}>{selectedSubject}</p>
            </div>
          </div>

          <div className={`bg-gradient-to-r from-green-50 to-blue-50 rounded-lg ${deviceInfo.isMobile ? 'p-3' : 'p-4'} mb-4`}>
            <h3 className={`font-bold text-gray-800 ${deviceInfo.isMobile ? 'text-sm' : 'text-lg'}`}>{selectedSubject}</h3>
            <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-sm'} text-gray-600`}>
              {selectedClass} {selectedStream && selectedStream !== 'all' ? `- ${selectedStream}` : '— All Streams'} • {selectedYear} • {selectedTerm || 'All Terms'} • {selectedExamName}
            </p>
          </div>

          {/* Competency Distribution */}
          <div className={`bg-white rounded-lg shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-4'} mb-4`}>
            <h3 className={`font-bold text-gray-800 ${deviceInfo.isMobile ? 'text-sm' : 'text-lg'} mb-3`}>Competency - {selectedSubject}</h3>
            <div className="space-y-3">
              {competencyLevels.map(level => {
                const count = performanceData.filter(s => getCompetencyFromMarks(s.marks)?.level === level.level).length;
                const percentage = performanceData.length > 0 ? (count / performanceData.length) * 100 : 0;
                return (
                  <div key={level.level}>
                    <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-0.5' : 'justify-between'} text-sm mb-0.5`}>
                      <span className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} ${level.level.includes('Exceeding') ? 'text-purple-700' : level.level.includes('Meeting') ? 'text-green-700' : level.level.includes('Approaching') ? 'text-blue-700' : level.level.includes('Below') ? 'text-yellow-700' : 'text-red-700'}`}>
                        {deviceInfo.isMobile ? level.level.split(' ')[0] : level.level}
                      </span>
                      <span className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-bold`}>{count} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className={`rounded-full h-1.5 ${level.level.includes('Exceeding') ? 'bg-purple-500' : level.level.includes('Meeting') ? 'bg-green-500' : level.level.includes('Approaching') ? 'bg-blue-500' : level.level.includes('Below') ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Student Performance Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
            <div className={`${deviceInfo.isMobile ? 'px-3 py-2' : 'px-6 py-4'} border-b border-gray-200 flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'justify-between items-center'} flex-wrap`}>
              <h3 className={`${deviceInfo.isMobile ? 'text-sm' : 'text-lg'} font-bold text-gray-800`}>{selectedSubject} - Students</h3>
              <div className="flex gap-2 flex-wrap">
                <button onClick={downloadResultsExcel} className={`bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-1 transition-colors ${deviceInfo.isMobile ? 'flex-1 px-2 py-1.5 text-xs' : 'px-4 py-2 text-sm'}`}>
                  <FiDownload className={deviceInfo.isMobile ? 'w-3 h-3' : 'w-4 h-4'} /> Excel
                </button>
                <button onClick={downloadResultsWord} className={`bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-1 transition-colors ${deviceInfo.isMobile ? 'flex-1 px-2 py-1.5 text-xs' : 'px-4 py-2 text-sm'}`}>
                  <FiFileText className={deviceInfo.isMobile ? 'w-3 h-3' : 'w-4 h-4'} /> Word
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={`${deviceInfo.isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-3 text-sm'} text-left font-semibold text-gray-700`}>Student</th>
                    {!deviceInfo.isMobile && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Adm No</th>}
                    <th className={`${deviceInfo.isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-3 text-sm'} text-left font-semibold text-gray-700`}>Stream</th>
                    <th className={`${deviceInfo.isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-3 text-sm'} text-center font-semibold text-gray-700`}>Marks</th>
                    <th className={`${deviceInfo.isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-3 text-sm'} text-center font-semibold text-gray-700`}>Grade</th>
                    <th className={`${deviceInfo.isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-3 text-sm'} text-left font-semibold text-gray-700`}>Competency</th>
                    {!deviceInfo.isMobile && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Remarks</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {performanceData.map((student, index) => {
                    const competency = getCompetencyFromMarks(student.marks);
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className={`${deviceInfo.isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-3 text-sm'} font-medium text-gray-800`}>{student.name}</td>
                        {!deviceInfo.isMobile && <td className="px-4 py-3 text-sm text-gray-600">{student.admNo || '-'}</td>}
                        <td className={`${deviceInfo.isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-3 text-sm'}`}>{student.stream || '-'}</td>
                        <td className={`${deviceInfo.isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-3 text-sm'} text-center font-semibold`}>{student.marks.toFixed(1)}%</td>
                        <td className={`${deviceInfo.isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-3 text-sm'} text-center font-bold`}>{student.grade}</td>
                        <td className={`${deviceInfo.isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-3 text-sm'}`}>
                          {competency ? <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${competency.color}`}>
                            {deviceInfo.isMobile ? competency.level.split(' ')[0] : competency.level}
                          </span> : '-'}
                        </td>
                        {!deviceInfo.isMobile && (
                          <td className={`px-4 py-3 text-sm font-semibold ${student.marks >= 80 ? 'text-purple-600' : student.marks >= 60 ? 'text-green-600' : student.marks >= 40 ? 'text-blue-600' : 'text-red-600'}`}>
                            {student.remarks}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'justify-end gap-3'} mb-4 flex-wrap`}>
            <button onClick={downloadResultsExcel} className={`bg-green-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-md hover:bg-green-700 ${deviceInfo.isMobile ? 'w-full px-4 py-3 text-sm' : 'px-6 py-3'}`}>
              <FiDownload /> DOWNLOAD EXCEL
            </button>
            <button onClick={downloadResultsWord} className={`bg-blue-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-md hover:bg-blue-700 ${deviceInfo.isMobile ? 'w-full px-4 py-3 text-sm' : 'px-6 py-3'}`}>
              <FiFileText /> DOWNLOAD WORD
            </button>
          </div>
        </>
      )}
      
      {showResults && performanceData.length === 0 && !loadingData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <FiBarChart2 className={`${deviceInfo.isMobile ? 'w-10 h-10' : 'w-12 h-12'} text-yellow-500 mx-auto mb-3`} />
          <h3 className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-800 mb-2`}>No Data Found</h3>
          <p className={`${deviceInfo.isMobile ? 'text-sm' : 'text-base'} text-gray-600`}>Adjust selections and try again</p>
        </div>
      )}

      {/* Competency Guide */}
      <div className={`mt-4 bg-white rounded-lg shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-4'}`}>
        <h3 className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} font-semibold text-gray-700 mb-2`}>CBE Competency Levels</h3>
        <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-2 gap-1' : 'grid-cols-2 md:grid-cols-5 gap-2'}`}>
          {competencyLevels.map(level => (
            <div key={level.level} className={`flex items-center gap-1 ${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'}`}>
              <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${level.color}`}>
                {deviceInfo.isMobile ? level.level.split(' ')[0] : level.level}
              </span>
              <span className="text-gray-500">{level.minScore}-{level.maxScore}%</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .input-field { font-size: 16px !important; }
          input, select { font-size: 16px !important; }
        }
      `}</style>
    </Layout>
  );
};

export default ClassPerformance;