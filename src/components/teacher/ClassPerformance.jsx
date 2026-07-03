import React, { useState, useEffect } from 'react';
import Layout from '../common/Layout';
import { 
  FiFilter, FiDownload, FiBarChart2, FiCalendar, FiBookOpen, 
  FiFileText, FiUsers, FiAward, FiTrendingUp, FiTrendingDown, 
  FiMinus, FiAlertCircle, FiMonitor, FiSmartphone, FiTablet,
  FiRefreshCw
} from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import toast from 'react-hot-toast';
import api from '../../services/api';
import * as XLSX from 'xlsx';
// import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle } from "docx";

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
    cardPadding: deviceInfo.isMobile ? 'p-3' : 'p-6',
    headingSize: deviceInfo.isMobile ? 'text-base' : 'text-lg',
    textSize: deviceInfo.isMobile ? 'text-xs' : 'text-sm',
    buttonSize: deviceInfo.isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
    gridGap: deviceInfo.isMobile ? 'gap-2' : 'gap-4',
    statsGrid: deviceInfo.isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4',
    filterGrid: deviceInfo.isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
  };
};

// ===== CLASS ORDER DEFINITION (Lowest to Highest) =====
const CLASS_ORDER = [
  'Play Group',
  'Pre-Primary 1',
  'Pre-Primary 2',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12'
];

// ===== COMPLETE CBE SUBJECT CONFIGURATION =====
const CBE_SUBJECTS_BY_GRADE = {
  'Play Group': [
    'Language Activities',
    'Mathematical Activities',
    'Environmental Activities',
    'Psychomotor and Creative Activities'
  ],
  'Pre-Primary 1': [
    'Language Activities',
    'Mathematical Activities',
    'Environmental Activities',
    'Psychomotor and Creative Activities'
  ],
  'Pre-Primary 2': [
    'Language Activities',
    'Mathematical Activities',
    'Environmental Activities',
    'Psychomotor and Creative Activities'
  ],
  'Grade 1': [
    'English',
    'Kiswahili',
    'Mathematics',
    'Environmental Activities',
    'Hygiene and Nutrition',
    'Religious Education',
    'Creative Arts'
  ],
  'Grade 2': [
    'English',
    'Kiswahili',
    'Mathematics',
    'Environmental Activities',
    'Hygiene and Nutrition',
    'Religious Education',
    'Creative Arts'
  ],
  'Grade 3': [
    'English',
    'Kiswahili',
    'Mathematics',
    'Environmental Activities',
    'Hygiene and Nutrition',
    'Religious Education',
    'Creative Arts'
  ],
  'Grade 4': [
    'English',
    'Kiswahili',
    'Mathematics',
    'Science and Technology',
    'Social Studies',
    'Religious Education',
    'Creative Arts',
    'Physical and Health Education'
  ],
  'Grade 5': [
    'English',
    'Kiswahili',
    'Mathematics',
    'Science and Technology',
    'Social Studies',
    'Religious Education',
    'Creative Arts',
    'Physical and Health Education',
    'Agriculture and Nutrition'
  ],
  'Grade 6': [
    'English',
    'Kiswahili',
    'Mathematics',
    'Science and Technology',
    'Social Studies',
    'Religious Education',
    'Creative Arts',
    'Physical and Health Education',
    'Agriculture and Nutrition'
  ],
  'Grade 7': [
    'English',
    'Kiswahili',
    'Mathematics',
    'Integrated Science',
    'Health Education',
    'Pre-Technical Studies',
    'Social Studies',
    'Religious Education',
    'Creative Arts and Sports',
    'Business Studies',
    'Agriculture',
    'Computer Science'
  ],
  'Grade 8': [
    'English',
    'Kiswahili',
    'Mathematics',
    'Integrated Science',
    'Health Education',
    'Pre-Technical Studies',
    'Social Studies',
    'Religious Education',
    'Creative Arts and Sports',
    'Business Studies',
    'Agriculture',
    'Computer Science'
  ],
  'Grade 9': [
    'English',
    'Kiswahili',
    'Mathematics',
    'Integrated Science',
    'Health Education',
    'Pre-Technical Studies',
    'Social Studies',
    'Religious Education',
    'Creative Arts and Sports',
    'Business Studies',
    'Agriculture',
    'Computer Science'
  ],
  'Grade 10': [
    'English',
    'Kiswahili',
    'Mathematics',
    'Biology',
    'Chemistry',
    'Physics',
    'History and Government',
    'Geography',
    'Religious Education',
    'Business Studies',
    'Agriculture',
    'Computer Science'
  ],
  'Grade 11': [
    'English',
    'Kiswahili',
    'Mathematics',
    'Biology',
    'Chemistry',
    'Physics',
    'History and Government',
    'Geography',
    'Religious Education',
    'Business Studies',
    'Agriculture',
    'Computer Science'
  ],
  'Grade 12': [
    'English',
    'Kiswahili',
    'Mathematics',
    'Biology',
    'Chemistry',
    'Physics',
    'History and Government',
    'Geography',
    'Religious Education',
    'Business Studies',
    'Agriculture',
    'Computer Science'
  ]
};

const ClassPerformance = () => {
  // AI Device Detection
  const deviceInfo = useDeviceDetection();
  const responsive = useResponsiveClasses(deviceInfo);
  
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState([]);
  const [classAverage, setClassAverage] = useState(0);
  const [topStudent, setTopStudent] = useState(null);
  const [subjectAverages, setSubjectAverages] = useState([]);
  
  // User role
  const [userRole, setUserRole] = useState(null);
  
  // Filter states
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableExamNames, setAvailableExamNames] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableExamTypes, setAvailableExamTypes] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('');
  const [selectedExamName, setSelectedExamName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  
  // Historical comparison data
  const [historicalData, setHistoricalData] = useState([]);
  const [performanceTrend, setPerformanceTrend] = useState(null);
  const [comparisonStats, setComparisonStats] = useState(null);
  
  // School info
  const [schoolInfo, setSchoolInfo] = useState({
    name: '',
    classes: [],
    streams: []
  });

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

  // ===== SORTING FUNCTIONS =====
  const getClassOrder = (className) => {
    const index = CLASS_ORDER.indexOf(className);
    return index !== -1 ? index : 999;
  };

  const sortClassesByOrder = (classes) => {
    return [...classes].sort((a, b) => {
      const orderA = getClassOrder(a);
      const orderB = getClassOrder(b);
      return orderA - orderB;
    });
  };

  useEffect(() => {
    loadData();
    getUserRole();
  }, []);

  const getUserRole = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserRole(user.role);
  };

  // Update available subjects when class changes
  useEffect(() => {
    if (selectedClass) {
      const subjects = CBE_SUBJECTS_BY_GRADE[selectedClass] || [];
      setAvailableSubjects(subjects);
      
      if (selectedSubject && !subjects.includes(selectedSubject)) {
        setSelectedSubject('');
      }
      
      // Update streams
      const classData = schoolInfo.classes?.find(c => c.name === selectedClass);
      const streams = classData?.streams || [];
      setAvailableStreams(streams);
      if (streams.length === 1) {
        setSelectedStream(streams[0]);
      } else {
        setSelectedStream('');
      }
    } else {
      setAvailableSubjects([]);
      setAvailableStreams([]);
    }
  }, [selectedClass, schoolInfo]);

  useEffect(() => {
    if (selectedExamType && selectedTerm && selectedSubject) {
      const filteredExams = exams.filter(e => 
        e.type === selectedExamType && 
        e.term === selectedTerm &&
        e.year === selectedYear
      );
      const examNames = [...new Set(filteredExams.map(e => e.title))];
      setAvailableExamNames(examNames);
      setSelectedExamName('');
    }
  }, [selectedExamType, selectedTerm, selectedYear, exams, selectedSubject]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load school info from database
      const schoolResponse = await api.get('/school/settings');
      if (schoolResponse.data.success && schoolResponse.data.data) {
        const school = schoolResponse.data.data;
        setSchoolInfo(school);
        const activeClasses = (school.classes || [])
          .filter(c => c.isActive !== false)
          .map(c => c.name);
        // Sort classes from lowest to highest
        const sortedClasses = sortClassesByOrder(activeClasses);
        setAvailableClasses(sortedClasses);
        console.log('📋 Sorted classes:', sortedClasses);
      } else {
        // Fallback to localStorage
        const storedSchool = localStorage.getItem('schoolInfo');
        if (storedSchool) {
          const school = JSON.parse(storedSchool);
          setSchoolInfo(school);
          const activeClasses = (school.classes || [])
            .filter(c => c.isActive !== false)
            .map(c => c.name);
          setAvailableClasses(sortClassesByOrder(activeClasses));
        } else {
          const fallbackClasses = ['Play Group', 'Pre-Primary 1', 'Pre-Primary 2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'];
          setAvailableClasses(sortClassesByOrder(fallbackClasses));
          setSchoolInfo({ name: 'School Name', classes: [] });
        }
      }
      
      const studentsRes = await api.get('/pupils');
      setStudents(studentsRes.data?.data || []);
      
      const resultsRes = await api.get('/results');
      setResults(resultsRes.data?.data || []);
      
      const examsRes = await api.get('/exams');
      if (examsRes.data.success) {
        const examsData = examsRes.data.data || [];
        setExams(examsData);
        
        // Extract unique exam types from the exams data
        const examTypesFromDb = [...new Set(examsData.map(e => e.type).filter(Boolean))];
        setAvailableExamTypes(examTypesFromDb);
        console.log('📋 Exam types fetched from database:', examTypesFromDb);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data from database');
      
      // Fallback to localStorage if API fails
      try {
        const storedSchool = localStorage.getItem('schoolInfo');
        if (storedSchool) {
          const school = JSON.parse(storedSchool);
          setSchoolInfo(school);
          const activeClasses = (school.classes || [])
            .filter(c => c.isActive !== false)
            .map(c => c.name);
          if (activeClasses.length > 0) {
            setAvailableClasses(sortClassesByOrder(activeClasses));
          }
        }
      } catch (e) {
        console.error('Error loading from localStorage:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadHistoricalData = async () => {
    if (!selectedSubject) {
      return;
    }

    try {
      const previousExams = exams.filter(e => 
        e.type === selectedExamType &&
        e.term === selectedTerm &&
        e.year < selectedYear
      ).sort((a, b) => b.year - a.year);

      const historicalPerformance = [];
      
      for (const exam of previousExams.slice(0, 3)) {
        const response = await api.get('/results', {
          params: {
            class: selectedClass,
            examType: selectedExamType,
            examName: exam.title,
            term: selectedTerm,
            year: exam.year,
            stream: selectedStream,
            subject: selectedSubject
          }
        });
        
        const examResults = response.data?.data || [];
        if (examResults.length > 0) {
          const avgScore = examResults.reduce((sum, r) => sum + (r.marks || 0), 0) / examResults.length;
          historicalPerformance.push({
            year: exam.year,
            examName: exam.title,
            average: avgScore,
            studentCount: examResults.length
          });
        }
      }
      
      setHistoricalData(historicalPerformance);
      
      if (historicalPerformance.length >= 2) {
        const currentAvg = classAverage;
        const previousAvg = historicalPerformance[0]?.average || 0;
        const difference = currentAvg - previousAvg;
        
        setPerformanceTrend({
          direction: difference > 0 ? 'up' : difference < 0 ? 'down' : 'stable',
          percentage: Math.abs((difference / previousAvg) * 100).toFixed(1),
          difference: difference.toFixed(1)
        });
      }
      
      if (historicalPerformance.length > 0) {
        const bestYear = historicalPerformance.reduce((best, current) => 
          current.average > best.average ? current : best, historicalPerformance[0]);
        const worstYear = historicalPerformance.reduce((worst, current) => 
          current.average < worst.average ? current : worst, historicalPerformance[0]);
        
        setComparisonStats({
          bestYear,
          worstYear,
          averageOverYears: historicalPerformance.reduce((sum, h) => sum + h.average, 0) / historicalPerformance.length,
          yearOverYearChange: historicalPerformance.map((h, i) => ({
            year: h.year,
            change: i > 0 ? ((h.average - historicalPerformance[i-1].average) / historicalPerformance[i-1].average * 100).toFixed(1) : 0
          }))
        });
      }
      
    } catch (error) {
      console.error('Error loading historical data:', error);
    }
  };

  const loadPerformanceData = async () => {
    if (!selectedClass) {
      toast.error('Please select a class');
      return;
    }
    
    if (!selectedSubject) {
      toast.error('Please select a subject');
      return;
    }
    
    if (!selectedExamType) {
      toast.error('Please select an exam type');
      return;
    }
    
    if (!selectedExamName) {
      toast.error('Please select an exam name');
      return;
    }
    
    setLoadingData(true);
    
    try {
      let classStudents = students.filter(s => s.class === selectedClass);
      if (selectedStream && selectedStream !== 'all') {
        classStudents = classStudents.filter(s => s.stream === selectedStream);
      }
      
      if (classStudents.length === 0) {
        toast.error(`No students found in ${selectedClass}`);
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
          stream: selectedStream,
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
      setClassAverage(avgScore);
      
      let topStudentData = null;
      let highestScore = 0;
      filteredResults.forEach(r => {
        if ((r.marks || 0) > highestScore) {
          highestScore = r.marks || 0;
          const student = classStudents.find(s => s._id === (r.pupilId?._id || r.pupilId));
          if (student) {
            topStudentData = {
              name: student.name,
              admNo: student.admNo,
              score: r.marks
            };
          }
        }
      });
      setTopStudent(topStudentData);
      
      const studentPerformance = classStudents.map(student => {
        const studentResult = filteredResults.find(r => {
          const pupilId = r.pupilId?._id || r.pupilId;
          return pupilId === student._id;
        });
        
        const marks = studentResult?.marks || 0;
        const competency = getCompetencyFromMarks(marks);
        
        return {
          ...student,
          marks: marks,
          competencyLevel: competency ? competency.level : 'Not Assessed',
          grade: getGradeFromMarks(marks),
          remarks: getRemarksFromMarks(marks)
        };
      }).filter(s => s.marks > 0 || s.marks === 0).sort((a, b) => b.marks - a.marks);
      
      setPerformanceData(studentPerformance);
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
    setPerformanceTrend(null);
    setComparisonStats(null);
    toast.success('Filters reset');
  };

  // Check if a class has streams (more than 1 stream)
  const classHasMultipleStreams = (className) => {
    const classData = schoolInfo.classes?.find(c => c.name === className);
    return classData?.streams && classData.streams.length > 1;
  };

  // Generate Word Document
  const downloadWordDoc = async () => {
    if (performanceData.length === 0) {
      toast.error('No data to download');
      return;
    }

    if (userRole === 'teacher') {
      if (!selectedSubject) {
        toast.error('Please select a specific subject to download');
        return;
      }
      if (!selectedStream || selectedStream === 'all') {
        toast.error('Please select a specific stream to download');
        return;
      }
    }

    const docChildren = [];

    // Title
    docChildren.push(new Paragraph({
      text: schoolInfo.name || 'School Name',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }));

    docChildren.push(new Paragraph({
      text: `Subject Performance Report - ${selectedSubject}`,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }));

    // Report Info
    docChildren.push(new Paragraph({
      children: [
        new TextRun({ text: `Class: `, bold: true }),
        new TextRun(`${selectedClass}${selectedStream && selectedStream !== 'all' ? ` - ${selectedStream}` : ''}`),
      ],
    }));

    docChildren.push(new Paragraph({
      children: [
        new TextRun({ text: `Year: `, bold: true }),
        new TextRun(`${selectedYear}`),
        new TextRun({ text: ` | Term: `, bold: true }),
        new TextRun(`${selectedTerm || 'All Terms'}`),
      ],
    }));

    docChildren.push(new Paragraph({
      children: [
        new TextRun({ text: `Exam: `, bold: true }),
        new TextRun(`${selectedExamName} (${selectedExamType})`),
      ],
    }));

    docChildren.push(new Paragraph({
      children: [
        new TextRun({ text: `Subject: `, bold: true }),
        new TextRun(`${selectedSubject}`),
      ],
    }));

    docChildren.push(new Paragraph({
      children: [
        new TextRun({ text: `Stream: `, bold: true }),
        new TextRun(`${selectedStream}`),
      ],
    }));

    docChildren.push(new Paragraph({
      children: [
        new TextRun({ text: `Generated: `, bold: true }),
        new TextRun(`${new Date().toLocaleString()}`),
      ],
      spacing: { after: 200 },
    }));

    // Summary Statistics
    docChildren.push(new Paragraph({
      text: 'Summary Statistics',
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 100 },
    }));

    const statsTableRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Total Students', bold: true })], width: { size: 50, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ text: performanceData.length.toString() })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Class Average', bold: true })] }),
          new TableCell({ children: [new Paragraph({ text: `${classAverage.toFixed(1)}%` })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Highest Score', bold: true })] }),
          new TableCell({ children: [new Paragraph({ text: `${Math.max(...performanceData.map(s => s.marks))}%` })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Lowest Score', bold: true })] }),
          new TableCell({ children: [new Paragraph({ text: `${Math.min(...performanceData.map(s => s.marks))}%` })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Top Student', bold: true })] }),
          new TableCell({ children: [new Paragraph({ text: `${topStudent?.name || 'N/A'} (${topStudent?.score?.toFixed(1)}%)` })] }),
        ],
      }),
    ];

    docChildren.push(new Table({
      rows: statsTableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
    }));

    docChildren.push(new Paragraph({ text: '', spacing: { after: 200 } }));

    // Competency Distribution
    docChildren.push(new Paragraph({
      text: 'Competency Distribution',
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 100 },
    }));

    const competencyRows = competencyLevels.map(level => {
      const count = performanceData.filter(s => {
        const competency = getCompetencyFromMarks(s.marks);
        return competency?.level === level.level;
      }).length;
      const percentage = performanceData.length > 0 ? (count / performanceData.length * 100).toFixed(1) : 0;
      
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: level.level })] }),
          new TableCell({ children: [new Paragraph({ text: `${count} students` })] }),
          new TableCell({ children: [new Paragraph({ text: `${percentage}%` })] }),
        ],
      });
    });

    docChildren.push(new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'Level', bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: 'Count', bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: 'Percentage', bold: true })] }),
          ],
        }),
        ...competencyRows,
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    }));

    docChildren.push(new Paragraph({ text: '', spacing: { after: 200 } }));

    // Historical Performance Comparison
    if (historicalData.length > 0) {
      docChildren.push(new Paragraph({
        text: 'Historical Performance Comparison',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 },
      }));

      const historicalRows = historicalData.map(data => {
        return new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: data.year.toString() })] }),
            new TableCell({ children: [new Paragraph({ text: data.examName })] }),
            new TableCell({ children: [new Paragraph({ text: `${data.average.toFixed(1)}%` })] }),
            new TableCell({ children: [new Paragraph({ text: data.studentCount.toString() })] }),
          ],
        });
      });

      docChildren.push(new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: 'Year', bold: true })] }),
              new TableCell({ children: [new Paragraph({ text: 'Exam Name', bold: true })] }),
              new TableCell({ children: [new Paragraph({ text: 'Average Score', bold: true })] }),
              new TableCell({ children: [new Paragraph({ text: 'Students', bold: true })] }),
            ],
          }),
          ...historicalRows,
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }));

      if (performanceTrend) {
        docChildren.push(new Paragraph({ text: '', spacing: { after: 100 } }));
        docChildren.push(new Paragraph({
          children: [
            new TextRun({ text: `Trend: `, bold: true }),
            new TextRun(`${performanceTrend.direction === 'up' ? 'Improving 📈' : performanceTrend.direction === 'down' ? 'Declining 📉' : 'Stable ➡️'}`),
          ],
        }));
        docChildren.push(new Paragraph({
          children: [
            new TextRun({ text: `Change: `, bold: true }),
            new TextRun(`${performanceTrend.direction === 'up' ? '+' : ''}${performanceTrend.percentage}% (${performanceTrend.difference > 0 ? '+' : ''}${performanceTrend.difference} points)`),
          ],
        }));
      }

      docChildren.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    }

    // Student Performance Table
    docChildren.push(new Paragraph({
      text: 'Student Performance Details',
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 100 },
    }));

    const studentRows = performanceData.map(student => {
      const competency = getCompetencyFromMarks(student.marks);
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: student.name })] }),
          new TableCell({ children: [new Paragraph({ text: student.admNo || '-' })] }),
          new TableCell({ children: [new Paragraph({ text: student.stream || '-' })] }),
          new TableCell({ children: [new Paragraph({ text: `${student.marks.toFixed(1)}%`, alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: student.grade, alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: competency?.level || 'Not Assessed' })] }),
          new TableCell({ children: [new Paragraph({ text: student.remarks })] }),
        ],
      });
    });

    docChildren.push(new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'Student Name', bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: 'Admission No', bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: 'Stream', bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: 'Marks (%)', bold: true, alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ text: 'Grade', bold: true, alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ text: 'Competency Level', bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: 'Remarks', bold: true })] }),
          ],
        }),
        ...studentRows,
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    }));

    // Footer
    docChildren.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    docChildren.push(new Paragraph({
      text: `Report generated on ${new Date().toLocaleString()}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }));

    const doc = new Document({
      sections: [{
        properties: {},
        children: docChildren,
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schoolInfo.name}_${selectedClass}_${selectedStream}_${selectedSubject}_${selectedExamName}_${selectedYear}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Word document downloaded successfully');
  };

  // Download Excel
  const downloadResultsExcel = () => {
    if (performanceData.length === 0) {
      toast.error('No data to download');
      return;
    }

    if (userRole === 'teacher') {
      if (!selectedSubject) {
        toast.error('Please select a specific subject to download');
        return;
      }
      if (!selectedStream || selectedStream === 'all') {
        toast.error('Please select a specific stream to download');
        return;
      }
    }
    
    const worksheetData = [
      [`${schoolInfo.name || 'School Name'}`],
      [`Subject Performance Report - ${selectedSubject}`],
      [],
      [`Class: ${selectedClass}${selectedStream && selectedStream !== 'all' ? ` - ${selectedStream}` : ''}`],
      [`Year: ${selectedYear} | Term: ${selectedTerm || 'All Terms'}`],
      [`Exam: ${selectedExamName} (${selectedExamType})`],
      [`Subject: ${selectedSubject}`],
      [`Stream: ${selectedStream}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [`Report Type: Single Subject & Single Stream Analysis`],
      [],
      ['Student Name', 'Admission Number', 'Stream', 'Marks (%)', 'Grade', 'Competency Level', 'Remarks'],
      ...performanceData.map(student => [
        student.name,
        student.admNo || 'N/A',
        student.stream || 'N/A',
        student.marks.toFixed(1),
        student.grade,
        student.competencyLevel,
        student.remarks
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
        const count = performanceData.filter(s => {
          const competency = getCompetencyFromMarks(s.marks);
          return competency?.level === level.level;
        }).length;
        const percentage = (count / performanceData.length * 100).toFixed(1);
        return [`${level.level}: ${count} students (${percentage}%)`];
      })
    ];
    
    if (historicalData.length > 0) {
      worksheetData.push([], ['Historical Performance Comparison']);
      worksheetData.push(['Year', 'Exam Name', 'Average Score (%)', 'Student Count']);
      historicalData.forEach(data => {
        worksheetData.push([data.year, data.examName, data.average.toFixed(1), data.studentCount]);
      });
      
      if (performanceTrend) {
        worksheetData.push([], ['Performance Trend']);
        worksheetData.push([`Trend Direction: ${performanceTrend.direction === 'up' ? 'Improving 📈' : performanceTrend.direction === 'down' ? 'Declining 📉' : 'Stable ➡️'}`]);
        worksheetData.push([`Change: ${performanceTrend.direction === 'up' ? '+' : ''}${performanceTrend.percentage}%`]);
        worksheetData.push([`Point Difference: ${performanceTrend.difference}%`]);
      }
    }
    
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${selectedSubject}_${selectedStream}_Performance`);
    XLSX.writeFile(wb, `${schoolInfo.name}_${selectedClass}_${selectedStream}_${selectedSubject}_${selectedExamName}_${selectedYear}.xlsx`);
    
    toast.success('Excel report downloaded successfully');
  };

  const years = [2023, 2024, 2025, 2026];
  const [availableStreams, setAvailableStreams] = useState([]);

  if (loading) {
    return (
      <Layout title="Class Performance" subtitle="Track class performance metrics">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Subject Performance" subtitle="View and analyze subject-specific performance">
      
      {/* Header - AI Responsive */}
      <div className={`bg-gradient-to-r from-green-600 to-blue-600 rounded-xl ${deviceInfo.isMobile ? 'p-3' : 'p-5'} mb-4 text-white`}>
        <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'items-center gap-3'}`}>
          <div className="flex items-center gap-3">
            <FiBarChart2 className={`${deviceInfo.isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
            <div>
              <h2 className={`${deviceInfo.isMobile ? 'text-base' : 'text-xl'} font-bold`}>Subject Performance Analysis</h2>
              <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-sm'} opacity-90`}>
                {userRole === 'teacher' 
                  ? 'Teachers can view all subjects and streams, but can only download reports for ONE subject and ONE stream'
                  : 'Track and analyze student performance across subjects'}
              </p>
            </div>
          </div>
          <button 
            onClick={loadData} 
            className={`${deviceInfo.isMobile ? 'w-full mt-2' : 'ml-auto'} bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center justify-center gap-2 transition-colors ${deviceInfo.isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2 text-sm'}`}
          >
            <FiRefreshCw className="w-4 h-4" /> Refresh Data
          </button>
        </div>
      </div>

      {/* Filter Section - AI Responsive */}
      <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding} mb-4`}>
        <h2 className={`${responsive.headingSize} font-bold text-gray-800 mb-3 flex items-center gap-2`}>
          <FiFilter className="text-green-600" /> Select Performance Criteria
        </h2>
        
        <div className={`grid ${responsive.filterGrid} ${responsive.gridGap}`}>
          <div>
            <label className={`block text-gray-700 font-medium mb-1 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>Year</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))} 
              className={`input-field w-full ${deviceInfo.isMobile ? 'text-base' : ''}`}
            >
              {years.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          
          <div>
            <label className={`block text-gray-700 font-medium mb-1 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>Class</label>
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)} 
              className={`input-field w-full ${deviceInfo.isMobile ? 'text-base' : ''}`}
            >
              <option value="">Select Class</option>
              {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
          </div>
          
          {/* Only show Stream dropdown if class has MORE than 1 stream */}
          {selectedClass && classHasMultipleStreams(selectedClass) && (
            <div>
              <label className={`block text-gray-700 font-medium mb-1 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>Stream</label>
              <select 
                value={selectedStream} 
                onChange={(e) => setSelectedStream(e.target.value)} 
                className={`input-field w-full ${deviceInfo.isMobile ? 'text-base' : ''}`}
              >
                <option value="">Select Stream</option>
                {availableStreams.map(stream => <option key={stream} value={stream}>{stream}</option>)}
              </select>
            </div>
          )}
          
          <div>
            <label className={`block text-gray-700 font-medium mb-1 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>Term</label>
            <select 
              value={selectedTerm} 
              onChange={(e) => setSelectedTerm(e.target.value)} 
              className={`input-field w-full ${deviceInfo.isMobile ? 'text-base' : ''}`}
            >
              <option value="">Select Term</option>
              {terms.map(term => <option key={term} value={term}>{term}</option>)}
            </select>
          </div>
          
          <div>
            <label className={`block text-gray-700 font-medium mb-1 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>Subject</label>
            <select 
              value={selectedSubject} 
              onChange={(e) => setSelectedSubject(e.target.value)} 
              className={`input-field w-full ${deviceInfo.isMobile ? 'text-base' : ''}`}
            >
              <option value="">Select Subject</option>
              {availableSubjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
            {selectedClass && availableSubjects.length > 0 && (
              <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-400 mt-1`}>
                {availableSubjects.length} subjects available for {selectedClass}
              </p>
            )}
          </div>
          
          <div>
            <label className={`block text-gray-700 font-medium mb-1 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>Exam Type</label>
            <select 
              value={selectedExamType} 
              onChange={(e) => setSelectedExamType(e.target.value)} 
              className={`input-field w-full ${deviceInfo.isMobile ? 'text-base' : ''}`}
            >
              <option value="">Select Exam Type</option>
              {availableExamTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
              {availableExamTypes.length === 0 && (
                <option value="" disabled>No exam types scheduled</option>
              )}
            </select>
          </div>
          
          <div>
            <label className={`block text-gray-700 font-medium mb-1 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>Exam Name</label>
            <select 
              value={selectedExamName} 
              onChange={(e) => setSelectedExamName(e.target.value)} 
              className={`input-field w-full ${deviceInfo.isMobile ? 'text-base' : ''}`}
              disabled={!selectedExamType}
            >
              <option value="">{!selectedExamType ? 'Select exam type first' : 'Select Exam Name'}</option>
              {availableExamNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </div>
        
        <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'gap-3'} mt-4`}>
          <button 
            onClick={loadPerformanceData} 
            disabled={loadingData || !selectedClass || !selectedSubject || !selectedExamType || !selectedExamName} 
            className={`btn-primary flex items-center justify-center gap-2 disabled:opacity-50 ${deviceInfo.isMobile ? 'w-full py-2.5 text-sm' : ''}`}
          >
            <FiBarChart2 /> {loadingData ? 'Loading...' : 'LOAD PERFORMANCE DATA'}
          </button>
          <button 
            onClick={resetFilters} 
            className={`bg-gray-500 hover:bg-gray-600 text-white rounded-lg ${deviceInfo.isMobile ? 'w-full px-4 py-2.5 text-sm' : 'px-4 py-2'}`}
          >
            RESET
          </button>
        </div>
      </div>

      {/* Performance Results Section */}
      {showResults && (
        <>
          {/* Teacher Warning Message - AI Responsive */}
          {userRole === 'teacher' && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-3 mb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <FiAlertCircle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className={`ml-3 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>
                  <p className="text-yellow-700">
                    <strong>Teacher Download Restriction:</strong> You can only download reports for ONE subject and ONE stream at a time. 
                    The current download includes only <strong>{selectedSubject}</strong> for <strong>{selectedStream || 'selected stream'}</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Historical Comparison Section - AI Responsive */}
          {historicalData.length > 0 && (
            <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding} mb-4`}>
              <h3 className={`${responsive.headingSize} font-bold text-gray-800 mb-3 flex items-center gap-2`}>
                <FiTrendingUp className="text-green-600" /> Historical Performance Comparison - {selectedSubject}
              </h3>
              
              {performanceTrend && (
                <div className={`mb-4 p-3 bg-gray-50 rounded-lg ${deviceInfo.isMobile ? 'text-sm' : ''}`}>
                  <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'items-center justify-between'}`}>
                    <div>
                      <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Performance vs Previous Year</p>
                      <div className="flex items-center gap-2 mt-1">
                        {performanceTrend.direction === 'up' && <FiTrendingUp className="text-green-600 text-2xl" />}
                        {performanceTrend.direction === 'down' && <FiTrendingDown className="text-red-600 text-2xl" />}
                        {performanceTrend.direction === 'stable' && <FiMinus className="text-yellow-600 text-2xl" />}
                        <span className={`text-2xl font-bold ${performanceTrend.direction === 'up' ? 'text-green-600' : performanceTrend.direction === 'down' ? 'text-red-600' : 'text-yellow-600'}`}>
                          {performanceTrend.direction === 'up' ? '+' : ''}{performanceTrend.percentage}%
                        </span>
                        <span className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>
                          ({performanceTrend.difference > 0 ? '+' : ''}{performanceTrend.difference}% points)
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Current Average</p>
                      <p className={`${deviceInfo.isMobile ? 'text-xl' : 'text-2xl'} font-bold text-blue-600`}>{classAverage.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Historical Chart - AI Responsive */}
              {historicalData.length > 0 && (
                <ResponsiveContainer width="100%" height={deviceInfo.isMobile ? 200 : 300}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                    <Legend />
                    <Line type="monotone" dataKey="average" stroke="#3B82F6" name={`${selectedSubject} Average Score (%)`} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              
              {comparisonStats && (
                <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-1 md:grid-cols-3 gap-4'} mt-3`}>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600`}>Best Year</p>
                    <p className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-bold text-green-600`}>{comparisonStats.bestYear?.year}</p>
                    <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>{comparisonStats.bestYear?.average.toFixed(1)}%</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600`}>Needs Improvement Year</p>
                    <p className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-bold text-red-600`}>{comparisonStats.worstYear?.year}</p>
                    <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>{comparisonStats.worstYear?.average.toFixed(1)}%</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600`}>Average Over Years</p>
                    <p className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-bold text-blue-600`}>{comparisonStats.averageOverYears.toFixed(1)}%</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stats Cards - AI Responsive */}
          <div className={`grid ${responsive.statsGrid} ${responsive.gridGap} mb-4`}>
            <div className={`bg-white rounded-xl shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-4'} text-center`}>
              <FiUsers className={`${deviceInfo.isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-blue-500 mx-auto mb-1`} />
              <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-sm'} text-gray-500`}>Total Students</p>
              <p className={`${deviceInfo.isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-800`}>{performanceData.length}</p>
            </div>
            <div className={`bg-white rounded-xl shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-4'} text-center`}>
              <FiBarChart2 className={`${deviceInfo.isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-green-500 mx-auto mb-1`} />
              <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-sm'} text-gray-500`}>Class Average</p>
              <p className={`${deviceInfo.isMobile ? 'text-xl' : 'text-2xl'} font-bold text-green-600`}>{classAverage.toFixed(1)}%</p>
            </div>
            <div className={`bg-white rounded-xl shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-4'} text-center`}>
              <FiAward className={`${deviceInfo.isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-yellow-500 mx-auto mb-1`} />
              <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-sm'} text-gray-500`}>Highest Score</p>
              <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} font-bold text-gray-800 truncate`}>{topStudent?.name || 'N/A'}</p>
              <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500`}>{topStudent?.score?.toFixed(1)}%</p>
            </div>
            <div className={`bg-white rounded-xl shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-4'} text-center`}>
              <FiBookOpen className={`${deviceInfo.isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-purple-500 mx-auto mb-1`} />
              <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-sm'} text-gray-500`}>Subject</p>
              <p className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-bold text-purple-600 truncate`}>{selectedSubject}</p>
            </div>
          </div>

          <div className={`bg-gradient-to-r from-green-50 to-blue-50 rounded-xl ${deviceInfo.isMobile ? 'p-3' : 'p-4'} mb-4`}>
            <h3 className={`font-bold text-gray-800 ${deviceInfo.isMobile ? 'text-sm' : 'text-lg'}`}>{selectedSubject}</h3>
            <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-sm'} text-gray-600`}>
              Class: {selectedClass} {selectedStream && `- ${selectedStream}`} | 
              Year: {selectedYear} | Term: {selectedTerm || 'All Terms'} | 
              Exam: {selectedExamName} ({selectedExamType})
            </p>
          </div>

          {/* Competency Distribution - AI Responsive */}
          <div className={`bg-white rounded-xl shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-4'} mb-4`}>
            <h3 className={`font-bold text-gray-800 ${deviceInfo.isMobile ? 'text-sm' : 'text-lg'} mb-3`}>Competency Distribution - {selectedSubject}</h3>
            <div className="space-y-3">
              {competencyLevels.map(level => {
                const count = performanceData.filter(s => {
                  const competency = getCompetencyFromMarks(s.marks);
                  return competency?.level === level.level;
                }).length;
                const percentage = performanceData.length > 0 ? (count / performanceData.length) * 100 : 0;
                
                return (
                  <div key={level.level}>
                    <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-0.5' : 'justify-between'} text-sm mb-0.5`}>
                      <span className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} ${level.level.includes('Exceeding') ? 'text-purple-700' : level.level.includes('Meeting') ? 'text-green-700' : level.level.includes('Approaching') ? 'text-blue-700' : level.level.includes('Below') ? 'text-yellow-700' : 'text-red-700'}`}>
                        {deviceInfo.isMobile ? level.level.split(' ')[0] : level.level}
                      </span>
                      <span className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-bold`}>{count} students ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className={`rounded-full h-1.5 ${level.level.includes('Exceeding') ? 'bg-purple-500' : level.level.includes('Meeting') ? 'bg-green-500' : level.level.includes('Approaching') ? 'bg-blue-500' : level.level.includes('Below') ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Student Performance Table - AI Responsive */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-4">
            <div className={`${deviceInfo.isMobile ? 'px-3 py-2' : 'px-6 py-4'} border-b border-gray-200 flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'justify-between items-center'} flex-wrap`}>
              <h3 className={`${deviceInfo.isMobile ? 'text-sm' : 'text-lg'} font-bold text-gray-800`}>Student Performance Details - {selectedSubject}</h3>
              <div className={`flex ${deviceInfo.isMobile ? 'w-full gap-2' : 'gap-2'}`}>
                <button 
                  onClick={downloadResultsExcel} 
                  className={`bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-1 transition-colors disabled:opacity-50 ${deviceInfo.isMobile ? 'flex-1 px-2 py-1.5 text-xs' : 'px-4 py-2 text-sm'}`}
                  disabled={userRole === 'teacher' && (!selectedStream || selectedStream === 'all')}
                >
                  <FiDownload className={deviceInfo.isMobile ? 'w-3 h-3' : 'w-4 h-4'} /> Excel
                </button>
                <button 
                  onClick={downloadWordDoc} 
                  className={`bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-1 transition-colors disabled:opacity-50 ${deviceInfo.isMobile ? 'flex-1 px-2 py-1.5 text-xs' : 'px-4 py-2 text-sm'}`}
                  disabled={userRole === 'teacher' && (!selectedStream || selectedStream === 'all')}
                >
                  <FiFileText className={deviceInfo.isMobile ? 'w-3 h-3' : 'w-4 h-4'} /> Word
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={`${deviceInfo.isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-3 text-sm'} text-left font-semibold text-gray-700`}>Student</th>
                    {!deviceInfo.isMobile && (
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Admission No</th>
                    )}
                    <th className={`${deviceInfo.isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-3 text-sm'} text-left font-semibold text-gray-700`}>Stream</th>
                    <th className={`${deviceInfo.isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-3 text-sm'} text-center font-semibold text-gray-700`}>Marks</th>
                    <th className={`${deviceInfo.isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-3 text-sm'} text-center font-semibold text-gray-700`}>Grade</th>
                    <th className={`${deviceInfo.isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-3 text-sm'} text-left font-semibold text-gray-700`}>Competency</th>
                    {!deviceInfo.isMobile && (
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Remarks</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {performanceData.map((student, index) => {
                    const competency = getCompetencyFromMarks(student.marks);
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className={`${deviceInfo.isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-3 text-sm'} font-medium text-gray-800`}>
                          {student.name}
                        </td>
                        {!deviceInfo.isMobile && (
                          <td className="px-4 py-3 text-sm text-gray-600">{student.admNo || '-'}</td>
                        )}
                        <td className={`${deviceInfo.isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-3 text-sm'}`}>{student.stream || '-'}</td>
                        <td className={`${deviceInfo.isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-3 text-sm'} text-center font-semibold`}>
                          {student.marks.toFixed(1)}%
                        </td>
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
          
          {/* Download Buttons - AI Responsive */}
          <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'justify-end gap-3'}`}>
            <button 
              onClick={downloadResultsExcel} 
              className={`bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-md hover:from-green-700 hover:to-green-800 disabled:opacity-50 ${deviceInfo.isMobile ? 'w-full px-4 py-3 text-sm' : 'px-6 py-3'}`}
              disabled={userRole === 'teacher' && (!selectedStream || selectedStream === 'all')}
            >
              <FiDownload /> DOWNLOAD EXCEL
            </button>
            <button 
              onClick={downloadWordDoc} 
              className={`bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-md hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 ${deviceInfo.isMobile ? 'w-full px-4 py-3 text-sm' : 'px-6 py-3'}`}
              disabled={userRole === 'teacher' && (!selectedStream || selectedStream === 'all')}
            >
              <FiFileText /> DOWNLOAD WORD
            </button>
          </div>
        </>
      )}
      
      {showResults && performanceData.length === 0 && !loadingData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <FiBarChart2 className={`${deviceInfo.isMobile ? 'w-10 h-10' : 'w-12 h-12'} text-yellow-500 mx-auto mb-3`} />
          <h3 className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-800 mb-2`}>No Performance Data Found</h3>
          <p className={`${deviceInfo.isMobile ? 'text-sm' : 'text-base'} text-gray-600`}>No performance data found for the selected criteria. Please adjust your selections and try again.</p>
        </div>
      )}

      {/* Competency Guide - AI Responsive */}
      <div className={`mt-4 bg-white rounded-xl shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-4'}`}>
        <h3 className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} font-semibold text-gray-700 mb-2`}>CBE Competency Levels Guide</h3>
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

      {/* AI Responsive CSS */}
      <style jsx>{`
        @media (max-width: 768px) {
          .input-field {
            font-size: 16px !important;
          }
          input, select {
            font-size: 16px !important;
          }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .tablet-grid-3 {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        .responsive-wrapper {
          transition: all 0.3s ease;
        }
      `}</style>
    </Layout>
  );
};

export default ClassPerformance;