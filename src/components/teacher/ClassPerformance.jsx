import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../common/Layout';
import { 
  FiFilter, FiDownload, FiBarChart2, FiCalendar, FiBookOpen, 
  FiFileText, FiUsers, FiAward, FiTrendingUp, FiTrendingDown, 
  FiMinus, FiAlertCircle, FiMonitor, FiSmartphone, FiTablet,
  FiRefreshCw, FiCheckCircle, FiXCircle
} from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import toast from 'react-hot-toast';
import api from '../../services/api';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';

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

const ClassPerformance = () => {
  // AI Device Detection
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

  useEffect(() => {
    loadData();
    getUserRole();
  }, []);

  const getUserRole = () => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUserRole(userData.role);
  };

  // Update available subjects when class changes
  useEffect(() => {
    if (selectedClass) {
      // Get subjects from results data instead of predefined list
      const classResults = teacherResults.filter(r => {
        const pupilId = r.pupilId?._id || r.pupilId;
        if (!pupilId) return false;
        const pupilIdStr = String(pupilId);
        const pupil = students.find(p => {
          const pId = p._id?._id || p._id || p.id;
          return String(pId) === pupilIdStr;
        });
        return pupil?.class === selectedClass || pupil?.grade === selectedClass;
      });
      const subjects = [...new Set(classResults.map(r => r.subject).filter(Boolean))];
      setAvailableSubjects(subjects);
      
      if (selectedSubject && !subjects.includes(selectedSubject)) {
        setSelectedSubject('');
      }
      
      // Update streams
      const classData = schoolInfo.classes?.find(c => c.name === selectedClass);
      const streams = classData?.streams || [];
      // Get unique streams from results
      const resultStreams = [...new Set(
        classResults.map(r => {
          const pupilId = r.pupilId?._id || r.pupilId;
          if (!pupilId) return null;
          const pupilIdStr = String(pupilId);
          const pupil = students.find(p => {
            const pId = p._id?._id || p._id || p.id;
            return String(pId) === pupilIdStr;
          });
          return pupil?.stream;
        }).filter(Boolean)
      )];
      const allStreams = [...new Set([...streams, ...resultStreams])];
      if (allStreams.length === 1) {
        setSelectedStream(allStreams[0]);
      } else {
        setSelectedStream('');
      }
    } else {
      setAvailableSubjects([]);
    }
  }, [selectedClass, schoolInfo, students, teacherResults]);

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
        setAvailableClasses(activeClasses);
        console.log('📋 Classes:', activeClasses);
      } else {
        // Fallback to localStorage
        const storedSchool = localStorage.getItem('schoolInfo');
        if (storedSchool) {
          const school = JSON.parse(storedSchool);
          setSchoolInfo(school);
          const activeClasses = (school.classes || [])
            .filter(c => c.isActive !== false)
            .map(c => c.name);
          setAvailableClasses(activeClasses);
        } else {
          setSchoolInfo({ name: 'School Name', classes: [] });
        }
      }
      
      const studentsRes = await api.get('/pupils');
      setStudents(studentsRes.data?.data || []);
      
      const resultsRes = await api.get('/results');
      const allResults = resultsRes.data?.data || [];
      setResults(allResults);
      
      // Filter results for this teacher using recordedBy field
      let teacherResultsData = [];
      if (teacherId) {
        teacherResultsData = allResults.filter(r => r.recordedBy === teacherId);
        console.log(`📚 Found ${teacherResultsData.length} results recorded by teacher: ${teacherName}`);
      }
      
      // If no results by recordedBy, try by teacher name
      if (teacherResultsData.length === 0 && teacherName) {
        teacherResultsData = allResults.filter(r => 
          r.submittedBy === teacherName || 
          r.updatedBy === teacherName ||
          r.createdBy === teacherName
        );
        console.log(`📚 Found ${teacherResultsData.length} results by teacher name`);
      }
      
      setTeacherResults(teacherResultsData);
      setTotalResults(teacherResultsData.length);
      
      // Extract unique classes and subjects from teacher's results
      const classes = new Set();
      const subjects = new Set();
      teacherResultsData.forEach(r => {
        const pupilId = r.pupilId?._id || r.pupilId;
        if (pupilId) {
          const pupilIdStr = String(pupilId);
          const pupil = students.find(p => {
            const pId = p._id?._id || p._id || p.id;
            return String(pId) === pupilIdStr;
          });
          if (pupil) {
            if (pupil.class) classes.add(pupil.class);
            if (pupil.grade) classes.add(pupil.grade);
          }
        }
        if (r.subject) subjects.add(r.subject);
      });
      setTeacherClasses([...classes]);
      setTeacherSubjects([...subjects]);
      
      // Calculate subject performance
      calculateSubjectPerformance(teacherResultsData);
      
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
    } finally {
      setLoading(false);
    }
  };

  const calculateSubjectPerformance = (resultsData) => {
    const performanceBySubject = {};
    
    resultsData.forEach(result => {
      const subject = result.subject || 'Unknown Subject';
      const marks = result.marks || result.score || 0;
      const examName = result.examName || 'Assessment';
      const pupilId = result.pupilId?._id || result.pupilId;
      
      // Get pupil info - FIXED: Handle both string and object IDs
      let pupil = null;
      if (pupilId) {
        const pupilIdStr = String(pupilId);
        pupil = students.find(p => {
          const pId = p._id?._id || p._id || p.id;
          return String(pId) === pupilIdStr;
        });
      }
      
      const className = pupil?.class || pupil?.grade || 'Unknown Class';
      const stream = pupil?.stream || 'Unknown Stream';
      
      if (!performanceBySubject[subject]) {
        performanceBySubject[subject] = {
          subject: subject,
          class: className,
          stream: stream,
          examName: examName,
          totalMarks: 0,
          count: 0,
          scores: [],
          passing: 0,
          failing: 0,
          students: new Set()
        };
      }
      
      performanceBySubject[subject].totalMarks += marks;
      performanceBySubject[subject].count++;
      performanceBySubject[subject].scores.push(marks);
      
      if (marks >= 60) {
        performanceBySubject[subject].passing++;
      } else {
        performanceBySubject[subject].failing++;
      }
      
      if (pupilId) {
        performanceBySubject[subject].students.add(pupilId);
      }
    });
    
    // Convert to array and calculate averages
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
    
    setSubjectPerformance(performanceData);
    console.log('📊 Subject Performance:', performanceData);
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
          subject: selectedSubject,
          recordedBy: teacherId
        }
      });
      
      const filteredResults = response.data?.data || [];
      
      if (filteredResults.length === 0) {
        toast.error(`No performance data found for ${selectedSubject} in ${selectedClass}`);
        setShowResults(false);
        setLoadingData(false);
        return;
      }
      
      // Calculate stats for the filtered data
      const totalScore = filteredResults.reduce((sum, r) => sum + (r.marks || 0), 0);
      const avgScore = totalScore / filteredResults.length;
      
      // Prepare student performance data
      const studentPerformance = classStudents.map(student => {
        const studentResult = filteredResults.find(r => {
          const pupilId = r.pupilId?._id || r.pupilId;
          if (!pupilId) return false;
          const pupilIdStr = String(pupilId);
          const pId = student._id?._id || student._id || student.id;
          return String(pId) === pupilIdStr;
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
      setClassAverage(avgScore);
      
      // Find top student
      let topStudentData = null;
      let highestScore = 0;
      filteredResults.forEach(r => {
        if ((r.marks || 0) > highestScore) {
          highestScore = r.marks || 0;
          const pupilId = r.pupilId?._id || r.pupilId;
          if (pupilId) {
            const pupilIdStr = String(pupilId);
            const student = classStudents.find(s => {
              const pId = s._id?._id || s._id || s.id;
              return String(pId) === pupilIdStr;
            });
            if (student) {
              topStudentData = {
                name: student.name,
                admNo: student.admNo,
                score: r.marks
              };
            }
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
    setPerformanceTrend(null);
    setComparisonStats(null);
    toast.success('Filters reset');
  };

  // State for detailed view
  const [performanceData, setPerformanceData] = useState([]);
  const [classAverage, setClassAverage] = useState(0);
  const [topStudent, setTopStudent] = useState(null);
  const [availableStreams, setAvailableStreams] = useState([]);

  // Download Excel - Vercel compatible
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
    }
    
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${selectedSubject}_${selectedStream}_Performance`);
    XLSX.writeFile(wb, `${schoolInfo.name}_${selectedClass}_${selectedStream}_${selectedSubject}_${selectedExamName}_${selectedYear}.xlsx`);
    
    toast.success('Excel report downloaded successfully');
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
                  ? `Welcome, ${teacherName} - Your uploaded results`
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

      {/* Teacher Results Summary - Shows all uploaded results */}
      {teacherResults.length > 0 && (
        <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding} mb-4`}>
          <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'justify-between items-center'}`}>
            <div>
              <h3 className={`${responsive.headingSize} font-bold text-gray-800 flex items-center gap-2`}>
                <FiBookOpen className="text-green-600" /> 
                Your Uploaded Results
                <span className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-2`}>
                  {totalResults} results
                </span>
              </h3>
              <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500 mt-1`}>
                Showing all results you've uploaded across all subjects and classes
              </p>
            </div>
            <div className={`flex ${deviceInfo.isMobile ? 'flex-wrap gap-1' : 'gap-2'}`}>
              {teacherSubjects.length > 0 && (
                <span className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} bg-blue-100 text-blue-700 px-2 py-1 rounded-full`}>
                  {teacherSubjects.length} Subjects
                </span>
              )}
              {teacherClasses.length > 0 && (
                <span className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} bg-purple-100 text-purple-700 px-2 py-1 rounded-full`}>
                  {teacherClasses.length} Classes
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subject Performance Cards - Shows all subjects with stats including Class & Stream */}
      {subjectPerformance.length > 0 && (
        <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding} mb-4`}>
          <h3 className={`${responsive.headingSize} font-bold text-gray-800 mb-3 flex items-center gap-2`}>
            <FiBarChart2 className="text-green-600" /> Subject Performance
            <span className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full ml-2`}>
              {subjectPerformance.length} subjects
            </span>
          </h3>
          
          <div className="space-y-4">
            {subjectPerformance.map((subject, index) => (
              <div key={index} className="border-b border-gray-100 pb-3 last:border-0">
                <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'justify-between'} text-sm mb-1`}>
                  <div>
                    <span className="font-medium text-gray-800">{subject.subject}</span>
                    <span className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500 ml-2`}>
                      ({subject.class} {subject.stream && subject.stream !== 'Unknown Stream' ? `- ${subject.stream}` : ''})
                    </span>
                    <span className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-400 ml-2`}>
                      - {subject.examName}
                    </span>
                  </div>
                  <div className={`flex ${deviceInfo.isMobile ? 'flex-wrap gap-2' : 'gap-3'} items-center`}>
                    <span className="text-green-600 text-xs flex items-center gap-1">
                      <FiCheckCircle className="w-3 h-3" /> {subject.passing}
                    </span>
                    <span className="text-red-600 text-xs flex items-center gap-1">
                      <FiXCircle className="w-3 h-3" /> {subject.failing}
                    </span>
                    <span className="font-bold text-xs text-blue-600">Avg: {subject.average}%</span>
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
          </div>
          
          <div className={`mt-3 text-xs text-gray-400 border-t pt-2`}>
            <p>Showing {totalResults} results uploaded by you</p>
            {teacherClasses.length > 0 && (
              <p className="text-gray-400">Classes: {teacherClasses.join(', ')}</p>
            )}
            {teacherSubjects.length > 0 && (
              <p className="text-gray-400">Subjects: {teacherSubjects.join(', ')}</p>
            )}
          </div>
        </div>
      )}

      {/* Filter Section - AI Responsive */}
      <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding} mb-4`}>
        <h2 className={`${responsive.headingSize} font-bold text-gray-800 mb-3 flex items-center gap-2`}>
          <FiFilter className="text-green-600" /> Detailed Performance Filters
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
              <option value="">All Classes</option>
              {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
          </div>
          
          <div>
            <label className={`block text-gray-700 font-medium mb-1 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>Subject</label>
            <select 
              value={selectedSubject} 
              onChange={(e) => setSelectedSubject(e.target.value)} 
              className={`input-field w-full ${deviceInfo.isMobile ? 'text-base' : ''}`}
            >
              <option value="">All Subjects</option>
              {availableSubjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className={`block text-gray-700 font-medium mb-1 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>Term</label>
            <select 
              value={selectedTerm} 
              onChange={(e) => setSelectedTerm(e.target.value)} 
              className={`input-field w-full ${deviceInfo.isMobile ? 'text-base' : ''}`}
            >
              <option value="">All Terms</option>
              {terms.map(term => <option key={term} value={term}>{term}</option>)}
            </select>
          </div>
          
          <div>
            <label className={`block text-gray-700 font-medium mb-1 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>Exam Type</label>
            <select 
              value={selectedExamType} 
              onChange={(e) => setSelectedExamType(e.target.value)} 
              className={`input-field w-full ${deviceInfo.isMobile ? 'text-base' : ''}`}
            >
              <option value="">All Exam Types</option>
              {availableExamTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
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
              <option value="">{!selectedExamType ? 'Select exam type first' : 'All Exam Names'}</option>
              {availableExamNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </div>
        
        <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'gap-3'} mt-4`}>
          <button 
            onClick={loadPerformanceData} 
            disabled={loadingData} 
            className={`btn-primary flex items-center justify-center gap-2 disabled:opacity-50 ${deviceInfo.isMobile ? 'w-full py-2.5 text-sm' : ''}`}
          >
            <FiBarChart2 /> {loadingData ? 'Loading...' : 'VIEW DETAILED PERFORMANCE'}
          </button>
          <button 
            onClick={resetFilters} 
            className={`bg-gray-500 hover:bg-gray-600 text-white rounded-lg ${deviceInfo.isMobile ? 'w-full px-4 py-2.5 text-sm' : 'px-4 py-2'}`}
          >
            RESET FILTERS
          </button>
        </div>
      </div>

      {/* Detailed Performance Results Section */}
      {showResults && performanceData.length > 0 && (
        <>
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
                >
                  <FiDownload className={deviceInfo.isMobile ? 'w-3 h-3' : 'w-4 h-4'} /> Excel
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
            >
              <FiDownload /> DOWNLOAD EXCEL
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

      {teacherResults.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <FiBookOpen className={`${deviceInfo.isMobile ? 'w-10 h-10' : 'w-12 h-12'} text-blue-500 mx-auto mb-3`} />
          <h3 className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-800 mb-2`}>No Results Uploaded Yet</h3>
          <p className={`${deviceInfo.isMobile ? 'text-sm' : 'text-base'} text-gray-600`}>
            You haven't uploaded any results yet. Click "Upload Results" in the quick actions to get started.
          </p>
          <Link to="/teacher/results" className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
            Upload Results →
          </Link>
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