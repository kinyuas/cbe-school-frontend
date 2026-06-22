// src/components/admin/Reports.jsx
import React, { useState, useEffect, useRef } from 'react';
import Layout from '../common/Layout';
import { 
  FiDownload, FiBarChart2, FiUsers, FiBookOpen, FiFilter, 
  FiFileText, FiAward, FiTrendingUp, FiPrinter, FiPercent, 
  FiCheck, FiX, FiRefreshCw, FiMonitor, FiSmartphone, FiTablet
} from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';
import api from '../../services/api';
import * as XLSX from 'xlsx';
// import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle } from "docx";
import ReportCard from './ReportCard';

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
    cardPadding: deviceInfo.isMobile ? 'p-3' : 'p-4',
    headingSize: deviceInfo.isMobile ? 'text-sm' : 'text-md',
    textSize: deviceInfo.isMobile ? 'text-xs' : 'text-sm',
    buttonSize: deviceInfo.isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
    gridGap: deviceInfo.isMobile ? 'gap-1.5' : 'gap-3',
    filterGrid: deviceInfo.isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    statsGrid: deviceInfo.isMobile ? 'grid-cols-3' : 'grid-cols-3 md:grid-cols-6'
  };
};

const Reports = () => {
  // AI Device Detection
  const deviceInfo = useDeviceDetection();
  const responsive = useResponsiveClasses(deviceInfo);
  
  const [pupils, setPupils] = useState([]);
  const [results, setResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState({});
  const [schoolClasses, setSchoolClasses] = useState([]);
  const [feesData, setFeesData] = useState({});
  
  // Filter states
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('');
  const [selectedExamName, setSelectedExamName] = useState('');
  
  // Combined exam states
  const [isCombinedReport, setIsCombinedReport] = useState(false);
  const [selectedCombinedExams, setSelectedCombinedExams] = useState([]);
  const [examWeights, setExamWeights] = useState({});
  
  // Available options
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableStreams, setAvailableStreams] = useState([]);
  const [availableExamNames, setAvailableExamNames] = useState([]);
  const [availableCombinedExams, setAvailableCombinedExams] = useState([]);
  
  // Loading and data states
  const [filteredData, setFilteredData] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysisStats, setAnalysisStats] = useState(null);
  const [subjectAverages, setSubjectAverages] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showReportCard, setShowReportCard] = useState(false);
  
  // Combined exam data for report cards
  const [combinedExamData, setCombinedExamData] = useState(null);
  const [examNamesList, setExamNamesList] = useState([]);

  const terms = ['Term 1', 'Term 2', 'Term 3'];
  const years = [2023, 2024, 2025, 2026, 2027];

  const examTypes = [
    'Opener Exam',
    'Mid Term',
    'End of Term Exam',
    'Competency Assessment',
    'Project Based Assessment',
    'Portfolio Review',
    'Practical Demonstration'
  ];

  const competencyLevels = [
    { level: 'EE', minScore: 80, maxScore: 100, color: '#9b59b6', description: 'Exceeding Expectation' },
    { level: 'ME', minScore: 60, maxScore: 79, color: '#27ae60', description: 'Meeting Expectation' },
    { level: 'AE', minScore: 40, maxScore: 59, color: '#3498db', description: 'Approaching Expectation' },
    { level: 'BE', minScore: 20, maxScore: 39, color: '#f1c40f', description: 'Below Expectation' },
    { level: 'WBE', minScore: 0, maxScore: 19, color: '#e74c3c', description: 'Well Below Expectation' }
  ];

  const getCompetencyLevel = (marks) => {
    for (let level of competencyLevels) {
      if (marks >= level.minScore && marks <= level.maxScore) {
        return level;
      }
    }
    return competencyLevels[4];
  };

  const getGrade = (marks) => {
    if (marks >= 80) return 'A';
    if (marks >= 75) return 'A-';
    if (marks >= 70) return 'B+';
    if (marks >= 65) return 'B';
    if (marks >= 60) return 'B-';
    if (marks >= 55) return 'C+';
    if (marks >= 50) return 'C';
    if (marks >= 45) return 'C-';
    if (marks >= 40) return 'D+';
    if (marks >= 35) return 'D';
    if (marks >= 30) return 'D-';
    return 'E';
  };

  const getRecommendation = (averageScore) => {
    if (averageScore >= 80) {
      return 'The student has demonstrated excellent understanding and mastery of the competencies. They consistently exceed expectations and show exceptional ability to apply knowledge. Continue to challenge the student with advanced tasks and encourage peer mentoring.';
    } else if (averageScore >= 60) {
      return 'The student shows good understanding of the competencies and consistently meets expectations. They demonstrate ability to apply knowledge effectively. Encourage the student to take on more challenging tasks and maintain their current performance level.';
    } else if (averageScore >= 40) {
      return 'The student is approaching the expected competency level. They show understanding of basic concepts but need additional support to fully achieve the learning outcomes. Consider providing extra practice and one-on-one support in areas of difficulty.';
    } else if (averageScore >= 20) {
      return 'The student is performing below expectations. They need significant support to achieve the learning outcomes. Consider implementing remedial programs, extra tutoring, and modified learning materials to address learning gaps.';
    } else {
      return 'The student is performing well below expectations and requires intensive intervention. Immediate support is needed to address learning gaps. Consider comprehensive assessment to identify specific learning needs and develop an individualized learning plan.';
    }
  };

  // Load school data from API on mount
  useEffect(() => {
    loadAllData();
  }, []);

  // Load streams when class changes
  useEffect(() => {
    if (selectedClass) {
      const classData = schoolClasses.find(c => c.name === selectedClass);
      setAvailableStreams(classData?.streams || []);
      setSelectedStream('');
    }
  }, [selectedClass, schoolClasses]);

  // Load exam names when exam type and term change
  useEffect(() => {
    if (selectedExamType && selectedTerm) {
      const filteredExams = exams.filter(e => e.type === selectedExamType && e.term === selectedTerm);
      const examNames = [...new Set(filteredExams.map(e => e.title))];
      setAvailableExamNames(examNames);
      setSelectedExamName('');
    }
  }, [selectedExamType, selectedTerm, exams]);

  // Load combined exams when term and year change
  useEffect(() => {
    if (selectedTerm && selectedYear) {
      const termExams = exams.filter(e => e.term === selectedTerm && e.year === selectedYear);
      const examNames = [...new Set(termExams.map(e => e.title))];
      setAvailableCombinedExams(examNames);
    }
  }, [selectedTerm, selectedYear, exams]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      console.log('Loading school data from API...');
      
      const schoolRes = await api.get('/school/settings');
      if (schoolRes.data?.success && schoolRes.data?.data) {
        const school = schoolRes.data.data;
        setSchoolInfo({
          name: school.schoolName || school.name || '',
          email: school.schoolEmail || school.email || '',
          phone: school.phoneNumber || school.phone || '',
          address: school.address || '',
          motto: school.motto || '',
          website: school.website || ''
        });
        
        const classes = school.classes || [];
        setSchoolClasses(classes);
        const activeClasses = classes
          .filter(c => c.isActive !== false)
          .map(c => c.name);
        setAvailableClasses(activeClasses);
      }
      
      const pupilsRes = await api.get('/pupils');
      if (pupilsRes.data?.success) {
        setPupils(pupilsRes.data.data || []);
      }
      
      const resultsRes = await api.get('/results');
      if (resultsRes.data?.success) {
        setResults(resultsRes.data.data || []);
      }
      
      const examsRes = await api.get('/exams');
      if (examsRes.data?.success) {
        setExams(examsRes.data.data || []);
      }
      
      toast.success('Data loaded from database');
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data from server');
    } finally {
      setLoading(false);
    }
  };

  const loadPerformanceData = async () => {
    if (!selectedClass) {
      toast.error('Please select a class');
      return;
    }
    
    if (!selectedTerm) {
      toast.error('Please select a term');
      return;
    }
    
    setLoading(true);
    
    try {
      let finalResults = [];
      let combinedExamData = null;
      let selectedExamNames = [];
      
      if (isCombinedReport) {
        // Handle combined exams
        if (selectedCombinedExams.length === 0) {
          toast.error('Please select at least one exam to combine');
          setLoading(false);
          return;
        }
        
        selectedExamNames = selectedCombinedExams;
        combinedExamData = {};
        
        // Get all results for selected exams
        const allResults = [];
        for (const examName of selectedCombinedExams) {
          const params = {
            class: selectedClass,
            examName: examName,
            term: selectedTerm,
            year: selectedYear,
            stream: selectedStream === 'all' ? undefined : selectedStream,
          };
          
          const response = await api.get('/results', { params });
          const examResults = response.data?.data || [];
          const weight = parseFloat(examWeights[examName] || 100 / selectedCombinedExams.length);
          
          // Store individual exam results for report card
          combinedExamData[examName] = {};
          examResults.forEach(r => {
            const pupilId = r.pupilId?._id || r.pupilId;
            const subject = r.subject;
            const marks = r.marks || r.score || 0;
            
            if (!combinedExamData[examName][pupilId]) {
              combinedExamData[examName][pupilId] = {};
            }
            combinedExamData[examName][pupilId][subject] = marks;
          });
          
          // Add weight to each result
          examResults.forEach(r => {
            allResults.push({
              ...r,
              weight: weight / 100,
              examName: examName
            });
          });
        }
        
        // Group and combine results by student and subject
        const combinedMap = new Map();
        allResults.forEach(r => {
          const pupilId = r.pupilId?._id || r.pupilId;
          const key = `${pupilId}-${r.subject}`;
          if (!combinedMap.has(key)) {
            combinedMap.set(key, {
              pupilId: r.pupilId,
              subject: r.subject,
              weightedMarks: 0,
              totalWeight: 0,
              studentName: r.pupilId?.name || r.pupilName || 'Unknown',
              admNo: r.pupilId?.admNo || r.admNo || 'N/A',
              stream: r.pupilId?.stream || r.stream || '',
              class: r.class || selectedClass
            });
          }
          const entry = combinedMap.get(key);
          const marks = r.marks || r.score || 0;
          entry.weightedMarks += marks * r.weight;
          entry.totalWeight += r.weight;
        });
        
        // Calculate final scores
        const combinedResults = Array.from(combinedMap.values()).map(entry => ({
          ...entry,
          marks: entry.totalWeight > 0 ? entry.weightedMarks / entry.totalWeight : 0
        }));
        
        finalResults = combinedResults;
        
      } else {
        // Single exam report
        if (!selectedExamType) {
          toast.error('Please select an exam type');
          setLoading(false);
          return;
        }
        
        if (!selectedExamName) {
          toast.error('Please select an exam name');
          setLoading(false);
          return;
        }
        
        selectedExamNames = [selectedExamName];
        
        const params = {
          class: selectedClass,
          examType: selectedExamType,
          examName: selectedExamName,
          term: selectedTerm,
          year: selectedYear,
          stream: selectedStream === 'all' ? undefined : selectedStream,
        };
        
        const response = await api.get('/results', { params });
        finalResults = response.data?.data || [];
      }
      
      if (finalResults.length === 0) {
        toast.error('No performance data found for the selected criteria');
        setShowResults(false);
        setLoading(false);
        return;
      }
      
      // Process results
      const subjects = [...new Set(finalResults.map(r => r.subject).filter(Boolean))];
      setAllSubjects(subjects);
      
      const studentMap = new Map();
      finalResults.forEach(r => {
        const pupilId = r.pupilId?._id || r.pupilId;
        const studentName = r.pupilId?.name || r.pupilName || 'Unknown';
        const admNo = r.pupilId?.admNo || r.admNo || 'N/A';
        const stream = r.pupilId?.stream || r.stream || '';
        
        if (!studentMap.has(pupilId)) {
          studentMap.set(pupilId, {
            id: pupilId,
            name: studentName,
            admNo: admNo,
            stream: stream,
            subjectMarks: {},
            totalMarks: 0,
            subjectsCount: 0
          });
        }
        
        const student = studentMap.get(pupilId);
        const subject = r.subject;
        const marks = r.marks || r.score || 0;
        
        student.subjectMarks[subject] = marks;
        student.totalMarks += marks;
        student.subjectsCount++;
      });
      
      // Calculate subject averages
      const subjectAvgMap = {};
      subjects.forEach(subject => {
        const allMarks = [];
        studentMap.forEach(student => {
          if (student.subjectMarks[subject] !== undefined) {
            allMarks.push(student.subjectMarks[subject]);
          }
        });
        if (allMarks.length > 0) {
          subjectAvgMap[subject] = allMarks.reduce((a, b) => a + b, 0) / allMarks.length;
        } else {
          subjectAvgMap[subject] = 0;
        }
      });
      setSubjectAverages(subjectAvgMap);
      
      // Create performance data
      let performanceData = Array.from(studentMap.values()).map((student) => {
        const averageScore = student.subjectsCount > 0 ? student.totalMarks / student.subjectsCount : 0;
        
        const subjectScores = {};
        subjects.forEach(subject => {
          subjectScores[subject] = student.subjectMarks[subject] || 0;
        });
        
        const competency = getCompetencyLevel(averageScore);
        
        return {
          id: student.id,
          name: student.name,
          admNo: student.admNo,
          stream: student.stream,
          ...subjectScores,
          totalMarks: student.totalMarks,
          averageScore: averageScore,
          subjectsCount: student.subjectsCount,
          grade: getGrade(averageScore),
          competency: competency,
          recommendation: getRecommendation(averageScore)
        };
      }).sort((a, b) => b.totalMarks - a.totalMarks);
      
      // Assign ranks
      let rank = 1;
      for (let i = 0; i < performanceData.length; i++) {
        if (i > 0 && performanceData[i].totalMarks === performanceData[i-1].totalMarks) {
          performanceData[i].rank = performanceData[i-1].rank;
        } else {
          performanceData[i].rank = rank;
        }
        rank++;
      }
      
      setFilteredData(performanceData);
      
      // Store combined exam data for report cards
      setCombinedExamData(combinedExamData);
      setExamNamesList(selectedExamNames);
      
      // Calculate analysis stats
      const classAvg = performanceData.reduce((sum, s) => sum + s.averageScore, 0) / performanceData.length;
      
      const subjectPerformance = {};
      subjects.forEach(subject => {
        const marks = performanceData.map(s => s[subject]).filter(m => m > 0);
        if (marks.length > 0) {
          subjectPerformance[subject] = {
            average: marks.reduce((a, b) => a + b, 0) / marks.length,
            highest: Math.max(...marks),
            lowest: Math.min(...marks)
          };
        }
      });
      
      const subjectAveragesList = Object.entries(subjectPerformance).map(([subject, data]) => ({
        subject: subject.substring(0, 3).toUpperCase(),
        fullSubject: subject,
        average: data.average,
        highest: data.highest,
        lowest: data.lowest
      })).sort((a, b) => b.average - a.average);
      
      const competencyDistribution = competencyLevels.map(level => ({
        name: level.level,
        count: performanceData.filter(s => s.averageScore >= level.minScore && s.averageScore <= level.maxScore).length,
        color: level.color
      }));
      
      const topPerformer = performanceData[0];
      
      const gradeDistribution = {
        'A': performanceData.filter(s => s.averageScore >= 80).length,
        'B': performanceData.filter(s => s.averageScore >= 60 && s.averageScore < 80).length,
        'C': performanceData.filter(s => s.averageScore >= 40 && s.averageScore < 60).length,
        'D': performanceData.filter(s => s.averageScore >= 30 && s.averageScore < 40).length,
        'E': performanceData.filter(s => s.averageScore < 30).length,
      };
      
      const passRate = (performanceData.filter(s => s.averageScore >= 40).length / performanceData.length * 100).toFixed(1);
      const meanDeviation = calculateMeanDeviation(performanceData.map(s => s.averageScore), classAvg);
      
      setAnalysisStats({
        classAverage: classAvg,
        totalStudents: performanceData.length,
        subjectAverages: subjectAveragesList,
        competencyDistribution,
        topPerformer,
        gradeDistribution,
        meanDeviation,
        passRate,
        highestTotal: Math.max(...performanceData.map(s => s.totalMarks)),
        lowestTotal: Math.min(...performanceData.map(s => s.totalMarks)),
        term: selectedTerm,
        year: selectedYear,
        class: selectedClass,
        stream: selectedStream,
        reportType: isCombinedReport ? 'Combined' : 'Single Exam'
      });
      
      setShowResults(true);
      toast.success(`Found ${performanceData.length} student records`);
      
    } catch (error) {
      console.error('Error loading performance data:', error);
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const calculateMeanDeviation = (scores, mean) => {
    const deviations = scores.map(score => Math.abs(score - mean));
    return deviations.reduce((a, b) => a + b, 0) / scores.length;
  };

  const resetFilters = () => {
    setSelectedClass('');
    setSelectedStream('');
    setSelectedTerm('');
    setSelectedExamType('');
    setSelectedExamName('');
    setSelectedYear(new Date().getFullYear());
    setIsCombinedReport(false);
    setSelectedCombinedExams([]);
    setExamWeights({});
    setFilteredData([]);
    setShowResults(false);
    setAnalysisStats(null);
    setCombinedExamData(null);
    setExamNamesList([]);
    toast.success('Filters reset');
  };

  const handleCombinedExamToggle = (examName) => {
    setSelectedCombinedExams(prev => {
      if (prev.includes(examName)) {
        const newSelected = prev.filter(e => e !== examName);
        const newWeights = { ...examWeights };
        delete newWeights[examName];
        setExamWeights(newWeights);
        return newSelected;
      } else {
        const newSelected = [...prev, examName];
        const weight = (100 / newSelected.length).toFixed(1);
        setExamWeights(prevWeights => ({
          ...prevWeights,
          [examName]: parseFloat(weight)
        }));
        return newSelected;
      }
    });
  };

  const handleWeightChange = (examName, value) => {
    const weight = parseFloat(value);
    if (!isNaN(weight) && weight >= 0 && weight <= 100) {
      setExamWeights(prev => ({
        ...prev,
        [examName]: weight
      }));
    }
  };

  const handlePrintReportCard = (student) => {
    setSelectedStudent(student);
    setShowReportCard(true);
  };

  const closeReportCard = () => {
    setShowReportCard(false);
    setSelectedStudent(null);
  };

  // ===== WORD DOCUMENT GENERATION =====
  const generateWordDocument = async () => {
    if (filteredData.length === 0) {
      toast.error('No data to download');
      return;
    }

    const reportTitle = isCombinedReport ? 'COMBINED RESULTS' : `${selectedExamName} RESULTS`;
    const schoolName = schoolInfo.name || 'School Name';
    const schoolMotto = schoolInfo.motto || 'Excellence in Education';

    const docChildren = [];

    // Header
    docChildren.push(new Paragraph({
      text: schoolName.toUpperCase(),
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }));

    docChildren.push(new Paragraph({
      text: schoolMotto,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }));

    docChildren.push(new Paragraph({
      text: reportTitle,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }));

    // Report Info
    docChildren.push(new Paragraph({
      children: [
        new TextRun({ text: 'Class: ', bold: true }),
        new TextRun(`${selectedClass}${selectedStream && selectedStream !== 'all' ? ` - ${selectedStream}` : ''}`),
      ],
    }));

    docChildren.push(new Paragraph({
      children: [
        new TextRun({ text: 'Term: ', bold: true }),
        new TextRun(`${selectedTerm}`),
        new TextRun({ text: ' | Year: ', bold: true }),
        new TextRun(`${selectedYear}`),
      ],
    }));

    if (isCombinedReport) {
      docChildren.push(new Paragraph({
        children: [
          new TextRun({ text: 'Combined Exams: ', bold: true }),
          new TextRun(selectedCombinedExams.join(', ')),
        ],
      }));
    } else {
      docChildren.push(new Paragraph({
        children: [
          new TextRun({ text: 'Exam: ', bold: true }),
          new TextRun(`${selectedExamName} (${selectedExamType})`),
        ],
      }));
    }

    docChildren.push(new Paragraph({
      children: [
        new TextRun({ text: 'Generated: ', bold: true }),
        new TextRun(new Date().toLocaleString()),
      ],
      spacing: { after: 200 },
    }));

    // ========== REMOVED: SUMMARY STATISTICS AND SUBJECT AVERAGES ==========
    // The following sections have been removed:
    // - SUMMARY STATISTICS table
    // - SUBJECT AVERAGES table

    // Student Performance Table
    docChildren.push(new Paragraph({
      text: 'STUDENT PERFORMANCE DETAILS',
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 100 },
    }));

    const headerCells = [
      new TableCell({ children: [new Paragraph({ text: 'Rank', bold: true, alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ text: 'Name', bold: true })] }),
      new TableCell({ children: [new Paragraph({ text: 'Adm', bold: true })] }),
      ...allSubjects.map(subject => new TableCell({ children: [new Paragraph({ text: subject.substring(0, 4).toUpperCase(), bold: true, alignment: AlignmentType.CENTER })] })),
      new TableCell({ children: [new Paragraph({ text: 'Total', bold: true, alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ text: 'Avg%', bold: true, alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ text: 'Grade', bold: true, alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ text: 'Competency', bold: true, alignment: AlignmentType.CENTER })] }),
    ];

    const studentRows = filteredData.map(student => {
      const subjectCells = allSubjects.map(subject => {
        const marks = student[subject];
        let markText = marks !== undefined && marks !== null ? marks.toString() : '-';
        return new TableCell({ 
          children: [new Paragraph({ text: markText, alignment: AlignmentType.CENTER })],
        });
      });

      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: student.rank.toString(), alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: student.name })] }),
          new TableCell({ children: [new Paragraph({ text: student.admNo })] }),
          ...subjectCells,
          new TableCell({ children: [new Paragraph({ text: student.totalMarks.toString(), alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: student.averageScore.toFixed(1), alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: student.grade, alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: student.competency?.level || 'N/A', alignment: AlignmentType.CENTER })] }),
        ],
      });
    });

    // Add average row
    const avgCells = [
      new TableCell({ children: [new Paragraph({ text: '', alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ text: 'AVERAGE', bold: true })] }),
      new TableCell({ children: [new Paragraph({ text: '', alignment: AlignmentType.CENTER })] }),
      ...allSubjects.map(subject => new TableCell({ 
        children: [new Paragraph({ text: (subjectAverages[subject] || 0).toFixed(1), alignment: AlignmentType.CENTER, bold: true })]
      })),
      new TableCell({ children: [new Paragraph({ text: (filteredData.reduce((sum, s) => sum + s.totalMarks, 0) / filteredData.length).toFixed(1), alignment: AlignmentType.CENTER, bold: true })] }),
      new TableCell({ children: [new Paragraph({ text: `${analysisStats?.classAverage?.toFixed(1)}%`, alignment: AlignmentType.CENTER, bold: true })] }),
      new TableCell({ children: [new Paragraph({ text: '', alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ text: '', alignment: AlignmentType.CENTER })] }),
    ];

    docChildren.push(new Table({
      rows: [
        new TableRow({ children: headerCells }),
        ...studentRows,
        new TableRow({ children: avgCells }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    }));

    // Footer
    docChildren.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    docChildren.push(new Paragraph({
      text: `Report generated on ${new Date().toLocaleString()}`,
      alignment: AlignmentType.CENTER,
    }));

    docChildren.push(new Paragraph({
      text: 'This is a computer-generated document.',
      alignment: AlignmentType.CENTER,
      spacing: { before: 100 },
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
    const fileName = `${schoolInfo.name || 'School'}_${selectedClass}_${selectedTerm}_${selectedYear}_Report.docx`;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Word document downloaded successfully');
  };

  // ===== EXCEL DOWNLOAD =====
  const downloadExcel = () => {
    if (filteredData.length === 0) {
      toast.error('No data to download');
      return;
    }
    
    const reportTitle = isCombinedReport ? 'COMBINED RESULTS' : `${selectedExamName} RESULTS`;
    
    const headers = ['#', 'Name', 'Adm', 'Stream', ...allSubjects.map(s => s.substring(0, 4).toUpperCase()), 'Tot', 'Avg%', 'Gr', 'Competency'];
    
    const rows = filteredData.map(student => [
      student.rank,
      student.name,
      student.admNo,
      student.stream || '-',
      ...allSubjects.map(subject => student[subject] || '-'),
      student.totalMarks,
      student.averageScore.toFixed(1),
      student.grade,
      student.competency?.level || 'N/A'
    ]);
    
    const avgTotal = filteredData.reduce((sum, s) => sum + s.totalMarks, 0) / filteredData.length;
    const averagesRow = [
      '', '', '', 'AVG',
      ...allSubjects.map(subject => (subjectAverages[subject] || 0).toFixed(1)),
      avgTotal.toFixed(1),
      analysisStats?.classAverage?.toFixed(1) || '0',
      '', ''
    ];
    
    const wsData = [
      [`${schoolInfo.name || 'School Name'}`],
      [`${reportTitle} - ${selectedClass}${selectedStream && selectedStream !== 'all' ? ` ${selectedStream}` : ''}`],
      [`Year: ${selectedYear} | Term: ${selectedTerm || 'All'}`],
      isCombinedReport ? [`Combined Exams: ${selectedCombinedExams.join(', ')}`] : [],
      [],
      headers,
      ...rows,
      averagesRow
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    
    ws['!cols'] = [
      { wch: 5 },  // Rank
      { wch: 20 }, // Name
      { wch: 8 },  // Adm
      { wch: 8 },  // Stream
      ...allSubjects.map(() => ({ wch: 6 })), // Subjects
      { wch: 6 },  // Total
      { wch: 6 },  // Avg%
      { wch: 5 },  // Grade
      { wch: 12 }  // Competency
    ];
    
    const fileName = `${schoolInfo.name}_${selectedClass}_${selectedYear}_${selectedTerm}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Report downloaded');
  };

  return (
    <Layout title="Reports" subtitle="Generate performance reports">
      {/* Header - AI Responsive */}
      <div className={`bg-gradient-to-r from-green-600 to-blue-600 rounded-xl ${deviceInfo.isMobile ? 'p-3' : 'p-4'} mb-4 text-white`}>
        <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'items-center gap-2'}`}>
          <FiBarChart2 className={`${deviceInfo.isMobile ? 'w-5 h-5' : 'w-6 h-6'}`} />
          <div>
            <h2 className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-bold`}>Performance Reports</h2>
            <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} opacity-90`}>
              Generate, combine, and print student results and report cards
            </p>
          </div>
        </div>
      </div>

      {/* Filter Section - AI Responsive */}
      <div className={`bg-white rounded-xl shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-4'} mb-4`}>
        <h2 className={`${deviceInfo.isMobile ? 'text-sm' : 'text-md'} font-bold text-gray-800 mb-3 flex items-center gap-2`}>
          <FiFilter className="text-green-600" /> Select Criteria
        </h2>
        
        <div className={`grid ${responsive.filterGrid} ${responsive.gridGap}`}>
          <div>
            <label className={`block text-gray-600 ${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} mb-1`}>Year</label>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className={`input-field w-full ${deviceInfo.isMobile ? 'text-sm py-1.5' : 'text-sm py-1.5'}`}>
              {years.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          
          <div>
            <label className={`block text-gray-600 ${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} mb-1`}>Term</label>
            <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className={`input-field w-full ${deviceInfo.isMobile ? 'text-sm py-1.5' : 'text-sm py-1.5'}`}>
              <option value="">Select</option>
              {terms.map(term => <option key={term} value={term}>{term}</option>)}
            </select>
          </div>
          
          <div>
            <label className={`block text-gray-600 ${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} mb-1`}>Class</label>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className={`input-field w-full ${deviceInfo.isMobile ? 'text-sm py-1.5' : 'text-sm py-1.5'}`}>
              <option value="">Select</option>
              {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
          </div>
          
          <div>
            <label className={`block text-gray-600 ${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} mb-1`}>Stream</label>
            <select value={selectedStream} onChange={(e) => setSelectedStream(e.target.value)} className={`input-field w-full ${deviceInfo.isMobile ? 'text-sm py-1.5' : 'text-sm py-1.5'}`} disabled={!selectedClass}>
              <option value="">Select</option>
              <option value="all">All Streams</option>
              {availableStreams.map(stream => <option key={stream} value={stream}>{stream}</option>)}
            </select>
          </div>
        </div>

        {/* Report Type Selection - AI Responsive */}
        <div className="mt-4 border-t pt-4">
          <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'items-center gap-4'} mb-3`}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!isCombinedReport}
                onChange={() => setIsCombinedReport(false)}
                className="w-4 h-4 text-green-600"
              />
              <span className={deviceInfo.isMobile ? 'text-xs' : 'text-sm'}>Single Exam Report</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={isCombinedReport}
                onChange={() => setIsCombinedReport(true)}
                className="w-4 h-4 text-blue-600"
              />
              <span className={deviceInfo.isMobile ? 'text-xs' : 'text-sm'}>Combined Exam Report</span>
            </label>
          </div>

          {!isCombinedReport ? (
            <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-2 md:grid-cols-3 gap-3'}`}>
              <div>
                <label className={`block text-gray-600 ${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} mb-1`}>Exam Type</label>
                <select value={selectedExamType} onChange={(e) => setSelectedExamType(e.target.value)} className={`input-field w-full ${deviceInfo.isMobile ? 'text-sm py-1.5' : 'text-sm py-1.5'}`}>
                  <option value="">Select</option>
                  {examTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-gray-600 ${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} mb-1`}>Exam Name</label>
                <select value={selectedExamName} onChange={(e) => setSelectedExamName(e.target.value)} className={`input-field w-full ${deviceInfo.isMobile ? 'text-sm py-1.5' : 'text-sm py-1.5'}`} disabled={!selectedExamType}>
                  <option value="">{!selectedExamType ? 'Select type' : 'Select exam'}</option>
                  {availableExamNames.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-2 md:grid-cols-3 gap-3'}`}>
                {availableCombinedExams.map(exam => (
                  <div key={exam} className={`flex ${deviceInfo.isMobile ? 'flex-wrap' : 'items-center'} gap-2 p-2 border rounded-lg`}>
                    <input
                      type="checkbox"
                      checked={selectedCombinedExams.includes(exam)}
                      onChange={() => handleCombinedExamToggle(exam)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} flex-1`}>{exam}</span>
                    {selectedCombinedExams.includes(exam) && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={examWeights[exam] || 0}
                          onChange={(e) => handleWeightChange(exam, e.target.value)}
                          className={`${deviceInfo.isMobile ? 'w-10 text-xs' : 'w-12 text-sm'} border rounded px-1 py-0.5`}
                          min="0"
                          max="100"
                          step="1"
                        />
                        <span className="text-xs text-gray-500">%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {selectedCombinedExams.length > 0 && (
                <div className="text-xs text-gray-500">
                  Total Weight: {Object.values(examWeights).reduce((a, b) => a + b, 0).toFixed(1)}% 
                  {Object.values(examWeights).reduce((a, b) => a + b, 0) !== 100 && ' (Should equal 100%)'}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'gap-2'} mt-4`}>
          <button onClick={loadPerformanceData} disabled={loading || !selectedClass || !selectedTerm} className={`btn-primary flex items-center justify-center gap-1 ${deviceInfo.isMobile ? 'text-sm py-2' : 'text-sm py-1.5 px-3'}`}>
            <FiBarChart2 className="w-4 h-4" /> {loading ? 'Loading...' : 'Generate Report'}
          </button>
          <button onClick={resetFilters} className={`bg-gray-500 hover:bg-gray-600 text-white rounded-lg ${deviceInfo.isMobile ? 'text-sm py-2 px-3' : 'text-sm py-1.5 px-3'}`}>Reset</button>
          <button onClick={loadAllData} className={`bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-1 ${deviceInfo.isMobile ? 'text-sm py-2 px-3' : 'text-sm py-1.5 px-3'}`}>
            <FiRefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>
      
      {/* Results Display Section */}
      {showResults && analysisStats && (
        <>
          {/* School Header - AI Responsive */}
          <div className={`bg-gradient-to-r from-green-600 to-blue-600 rounded-lg ${deviceInfo.isMobile ? 'p-2' : 'p-3'} mb-3 text-white`}>
            <h2 className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-bold`}>{schoolInfo.name || 'School Name'}</h2>
            <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-semibold`}>
              {isCombinedReport ? 'COMBINED' : selectedExamName} - {selectedClass}{selectedStream && selectedStream !== 'all' ? ` ${selectedStream}` : ''}
            </p>
            <p className={`${deviceInfo.isMobile ? 'text-[8px]' : 'text-[10px]'} opacity-90`}>Year: {selectedYear} | Term: {selectedTerm} | {new Date().toLocaleDateString()}</p>
            {isCombinedReport && (
              <p className={`${deviceInfo.isMobile ? 'text-[8px]' : 'text-[10px]'} opacity-80`}>Combined Exams: {selectedCombinedExams.join(', ')}</p>
            )}
          </div>
          
          {/* Stats Cards - AI Responsive */}
          <div className={`grid ${responsive.statsGrid} ${deviceInfo.isMobile ? 'gap-1' : 'gap-2'} mb-3`}>
            <div className={`bg-white rounded-lg shadow ${deviceInfo.isMobile ? 'p-1.5' : 'p-2'} text-center`}>
              <p className={`text-gray-500 ${deviceInfo.isMobile ? 'text-[8px]' : 'text-[10px]'}`}>Students</p>
              <p className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-bold text-blue-600`}>{analysisStats.totalStudents}</p>
            </div>
            <div className={`bg-white rounded-lg shadow ${deviceInfo.isMobile ? 'p-1.5' : 'p-2'} text-center`}>
              <p className={`text-gray-500 ${deviceInfo.isMobile ? 'text-[8px]' : 'text-[10px]'}`}>Class Avg</p>
              <p className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-bold text-green-600`}>{analysisStats.classAverage.toFixed(1)}%</p>
            </div>
            <div className={`bg-white rounded-lg shadow ${deviceInfo.isMobile ? 'p-1.5' : 'p-2'} text-center`}>
              <p className={`text-gray-500 ${deviceInfo.isMobile ? 'text-[8px]' : 'text-[10px]'}`}>Pass Rate</p>
              <p className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-bold text-yellow-600`}>{analysisStats.passRate}%</p>
            </div>
            <div className={`bg-white rounded-lg shadow ${deviceInfo.isMobile ? 'p-1.5' : 'p-2'} text-center`}>
              <p className={`text-gray-500 ${deviceInfo.isMobile ? 'text-[8px]' : 'text-[10px]'}`}>Mean Dev</p>
              <p className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-bold text-purple-600`}>{analysisStats.meanDeviation.toFixed(1)}</p>
            </div>
            <div className={`bg-white rounded-lg shadow ${deviceInfo.isMobile ? 'p-1.5' : 'p-2'} text-center`}>
              <p className={`text-gray-500 ${deviceInfo.isMobile ? 'text-[8px]' : 'text-[10px]'}`}>Highest</p>
              <p className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-bold text-green-600`}>{analysisStats.highestTotal}</p>
            </div>
            <div className={`bg-white rounded-lg shadow ${deviceInfo.isMobile ? 'p-1.5' : 'p-2'} text-center`}>
              <p className={`text-gray-500 ${deviceInfo.isMobile ? 'text-[8px]' : 'text-[10px]'}`}>Lowest</p>
              <p className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-bold text-red-600`}>{analysisStats.lowestTotal}</p>
            </div>
          </div>

          {/* Top Performers - AI Responsive */}
          <div className={`bg-yellow-50 rounded-lg ${deviceInfo.isMobile ? 'p-1.5' : 'p-2'} mb-3 border border-yellow-200`}>
            <h3 className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-bold text-gray-800 mb-2 flex items-center gap-1`}>
              <FiAward className="text-yellow-600" /> TOP 3 PERFORMERS
            </h3>
            <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'justify-around'} text-center ${deviceInfo.isMobile ? 'text-xs' : 'text-xs'}`}>
              {[0, 1, 2].map(idx => {
                const student = filteredData[idx];
                if (!student) return null;
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <div key={idx}>
                    <span className="text-lg">{medals[idx]}</span>
                    <p className="font-bold">{student.name}</p>
                    <p className="text-green-600 font-bold">{student.averageScore.toFixed(1)}%</p>
                    <p className="text-[8px] text-gray-500">{student.competency?.level || ''}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Results Table - AI Responsive */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-3">
            <div className={`${deviceInfo.isMobile ? 'px-1.5 py-1' : 'px-2 py-1.5'} border-b bg-gray-50 flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'justify-between items-center'} flex-wrap`}>
              <h3 className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-bold`}>RESULTS TABLE</h3>
              <div className={`flex ${deviceInfo.isMobile ? 'flex-wrap gap-1' : 'gap-1'} flex-wrap`}>
                <button onClick={downloadExcel} className="bg-green-600 text-white rounded ${deviceInfo.isMobile ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-0.5 text-[10px]'} flex items-center gap-0.5">
                  <FiDownload className="w-3 h-3" /> Excel
                </button>
                <button onClick={generateWordDocument} className="bg-blue-600 text-white rounded ${deviceInfo.isMobile ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-0.5 text-[10px]'} flex items-center gap-0.5">
                  <FiFileText className="w-3 h-3" /> Word
                </button>
              </div>
            </div>
            <div className={`overflow-x-auto ${deviceInfo.isMobile ? 'max-h-64' : 'max-h-96'}`}>
              <table className={`w-full ${deviceInfo.isMobile ? 'text-[9px]' : 'text-[11px]'} min-w-[900px]`}>
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-1 py-1 text-center">#</th>
                    <th className={`${deviceInfo.isMobile ? 'px-0.5' : 'px-1'} py-1 text-left`}>Name</th>
                    <th className={`${deviceInfo.isMobile ? 'px-0.5' : 'px-1'} py-1 text-left`}>Adm</th>
                    <th className={`${deviceInfo.isMobile ? 'px-0.5' : 'px-1'} py-1 text-left`}>Str</th>
                    {allSubjects.map(subject => (
                      <th key={subject} className="px-1 py-1 text-center" title={subject}>{subject.substring(0, 4)}</th>
                    ))}
                    <th className="px-1 py-1 text-center bg-blue-50">Tot</th>
                    <th className="px-1 py-1 text-center bg-green-50">Avg%</th>
                    <th className="px-1 py-1 text-center">Gr</th>
                    <th className="px-1 py-1 text-center">Comp</th>
                    <th className="px-1 py-1 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredData.map((student, idx) => {
                    let rankBg = student.rank === 1 ? 'bg-yellow-50' : student.rank === 2 ? 'bg-gray-50' : student.rank === 3 ? 'bg-orange-50' : '';
                    return (
                      <tr key={idx} className={`${rankBg} hover:bg-gray-50`}>
                        <td className="px-1 py-1 text-center font-bold text-gray-800">{student.rank}</td>
                        <td className={`${deviceInfo.isMobile ? 'px-0.5' : 'px-1'} py-1 font-medium text-gray-800 truncate max-w-[80px]`}>{student.name}</td>
                        <td className={`${deviceInfo.isMobile ? 'px-0.5' : 'px-1'} py-1 text-gray-600`}>{student.admNo}</td>
                        <td className={`${deviceInfo.isMobile ? 'px-0.5' : 'px-1'} py-1`}>{student.stream?.charAt(0) || '-'}</td>
                        {allSubjects.map(subject => {
                          const marks = student[subject];
                          let markClass = marks >= 80 ? 'text-purple-600 font-bold' : marks >= 60 ? 'text-green-600 font-bold' : marks >= 40 ? 'text-blue-600' : marks > 0 ? 'text-red-600' : '';
                          return (
                            <td key={subject} className={`px-1 py-1 text-center ${markClass}`}>
                              {marks || '-'}
                            </td>
                          );
                        })}
                        <td className="px-1 py-1 text-center font-bold text-blue-600 bg-blue-50">{student.totalMarks}</td>
                        <td className="px-1 py-1 text-center font-bold text-green-600 bg-green-50">{student.averageScore.toFixed(1)}</td>
                        <td className="px-1 py-1 text-center font-bold">{student.grade}</td>
                        <td className="px-1 py-1 text-center font-bold" style={{color: student.competency?.color || '#333'}}>
                          {student.competency?.level || 'N/A'}
                        </td>
                        <td className="px-1 py-1 text-center">
                          <button
                            onClick={() => handlePrintReportCard(student)}
                            className={`bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center mx-auto ${deviceInfo.isMobile ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-0.5 text-[9px]'}`}
                          >
                            <FiPrinter className="w-2.5 h-2.5" /> Print
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-100 font-semibold border-t">
                    <td colSpan="4" className={`${deviceInfo.isMobile ? 'px-0.5' : 'px-1'} py-1 text-center font-bold`}>AVERAGE</td>
                    {allSubjects.map(subject => (
                      <td key={subject} className="px-1 py-1 text-center text-blue-700 font-bold">
                        {(subjectAverages[subject] || 0).toFixed(1)}
                      </td>
                    ))}
                    <td className="px-1 py-1 text-center font-bold text-blue-700">
                      {(filteredData.reduce((sum, s) => sum + s.totalMarks, 0) / filteredData.length).toFixed(1)}
                    </td>
                    <td className="px-1 py-1 text-center font-bold text-green-700">
                      {analysisStats?.classAverage?.toFixed(1)}%
                    </td>
                    <td colSpan="3" className="px-1 py-1 text-center">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Download Buttons - AI Responsive */}
          <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'justify-center gap-3'} mb-4 flex-wrap`}>
            <button onClick={downloadExcel} className={`bg-green-600 text-white rounded-lg flex items-center justify-center gap-1 ${deviceInfo.isMobile ? 'w-full px-4 py-2 text-sm' : 'px-4 py-1.5 text-sm'}`}>
              <FiDownload /> EXCEL
            </button>
            <button onClick={generateWordDocument} className={`bg-blue-600 text-white rounded-lg flex items-center justify-center gap-1 ${deviceInfo.isMobile ? 'w-full px-4 py-2 text-sm' : 'px-4 py-1.5 text-sm'}`}>
              <FiFileText /> WORD
            </button>
          </div>
        </>
      )}
      
      {showResults && filteredData.length === 0 && !loading && (
        <div className="bg-yellow-50 rounded-lg p-6 text-center">
          <p className="text-gray-600 text-sm">No results found. Adjust your filters.</p>
        </div>
      )}

      {/* Report Card Modal */}
      {showReportCard && selectedStudent && (
        <ReportCard
          student={selectedStudent}
          schoolInfo={schoolInfo}
          selectedClass={selectedClass}
          selectedStream={selectedStream}
          selectedTerm={selectedTerm}
          selectedYear={selectedYear}
          allSubjects={allSubjects}
          subjectAverages={subjectAverages}
          competencyLevels={competencyLevels}
          getGrade={getGrade}
          getCompetencyLevel={getCompetencyLevel}
          getRecommendation={getRecommendation}
          onClose={closeReportCard}
          combinedExamResults={combinedExamData}
          examNames={examNamesList}
        />
      )}

      {/* AI Responsive CSS */}
      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-view .input-field {
            font-size: 16px !important;
          }
          .mobile-view input, .mobile-view select {
            font-size: 16px !important;
          }
          .mobile-view .p-4 {
            padding: 12px !important;
          }
          .mobile-view .gap-3 {
            gap: 8px !important;
          }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .tablet-view .grid-cols-3 {
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

export default Reports;
