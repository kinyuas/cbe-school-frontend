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
import ReportCard from './ReportCard';
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
  PageBreak,
} from 'docx';
import { saveAs } from 'file-saver';

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

// ===== CLASS ORDER DEFINITION =====
const CLASS_ORDER = [
  'Play Group', 'Pre-Primary 1', 'Pre-Primary 2',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
];

// ===== TERM INDEX for fee calculations =====
const TERM_INDEX = { 'Term 1': 0, 'Term 2': 1, 'Term 3': 2 };
const termIdx = (t) => TERM_INDEX[t] ?? 0;

const Reports = () => {
  const deviceInfo = useDeviceDetection();
  const responsive = useResponsiveClasses(deviceInfo);
  
  const [pupils, setPupils] = useState([]);
  const [results, setResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState({});
  const [schoolClasses, setSchoolClasses] = useState([]);
  const [feesData, setFeesData] = useState({});
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('');
  const [selectedExamName, setSelectedExamName] = useState('');
  
  const [isCombinedReport, setIsCombinedReport] = useState(false);
  const [selectedCombinedExams, setSelectedCombinedExams] = useState([]);
  const [examWeights, setExamWeights] = useState({});
  
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableStreams, setAvailableStreams] = useState([]);
  const [availableExamNames, setAvailableExamNames] = useState([]);
  const [availableCombinedExams, setAvailableCombinedExams] = useState([]);
  const [availableExamTypes, setAvailableExamTypes] = useState([]);
  
  const [filteredData, setFilteredData] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [printingAll, setPrintingAll] = useState(false);
  const [analysisStats, setAnalysisStats] = useState(null);
  const [subjectAverages, setSubjectAverages] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showReportCard, setShowReportCard] = useState(false);
  
  const [combinedExamData, setCombinedExamData] = useState(null);
  const [examNamesList, setExamNamesList] = useState([]);

  const terms = ['Term 1', 'Term 2', 'Term 3'];
  const years = [2023, 2024, 2025, 2026, 2027];

  const competencyLevels = [
    { level: 'EE', minScore: 80, maxScore: 100, color: '#9b59b6', description: 'Exceeding Expectation' },
    { level: 'ME', minScore: 60, maxScore: 79, color: '#27ae60', description: 'Meeting Expectation' },
    { level: 'AE', minScore: 40, maxScore: 59, color: '#3498db', description: 'Approaching Expectation' },
    { level: 'BE', minScore: 20, maxScore: 39, color: '#f1c40f', description: 'Below Expectation' },
    { level: 'WBE', minScore: 0, maxScore: 19, color: '#e74c3c', description: 'Well Below Expectation' }
  ];

  const getCompetencyLevel = (marks) => {
    for (let level of competencyLevels) {
      if (marks >= level.minScore && marks <= level.maxScore) return level;
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
    if (averageScore >= 80) return 'The student has demonstrated excellent understanding and mastery of the competencies. They consistently exceed expectations and show exceptional ability to apply knowledge. Continue to challenge the student with advanced tasks and encourage peer mentoring.';
    if (averageScore >= 60) return 'The student shows good understanding of the competencies and consistently meets expectations. They demonstrate ability to apply knowledge effectively. Encourage the student to take on more challenging tasks and maintain their current performance level.';
    if (averageScore >= 40) return 'The student is approaching the expected competency level. They show understanding of basic concepts but need additional support to fully achieve the learning outcomes. Consider providing extra practice and one-on-one support in areas of difficulty.';
    if (averageScore >= 20) return 'The student is performing below expectations. They need significant support to achieve the learning outcomes. Consider implementing remedial programs, extra tutoring, and modified learning materials to address learning gaps.';
    return 'The student is performing well below expectations and requires intensive intervention. Immediate support is needed to address learning gaps. Consider comprehensive assessment to identify specific learning needs and develop an individualized learning plan.';
  };

  // ===== FEE COMPUTATION (for report cards only) =====
  const buildFeeSummaryForPupil = (feeDocs, focusYear) => {
    if (!feeDocs || feeDocs.length === 0) {
      return { totalFee: 0, paid: 0, balance: 0, isFullyPaid: false, hasCredit: false, credit: 0, termBreakdown: [] };
    }

    const seen = new Set();
    const allPayments = [];
    feeDocs.forEach(doc => {
      (doc.payments || []).forEach(p => {
        const key = `${p.receiptNumber || 'NO-R'}__${p.date || p.createdAt || ''}__${Number(p.amount) || 0}__${p.paymentMethod || 'Cash'}`;
        if (seen.has(key)) return;
        seen.add(key);
        allPayments.push(Number(p.amount) || 0);
      });
    });
    const pool = allPayments.reduce((s, a) => s + a, 0);

    const allRows = [];
    [...feeDocs].sort((a, b) => a.year - b.year).forEach(doc => {
      const startIdx = termIdx(doc.termJoined || 'Term 1');
      const amounts = [doc.feeStructure?.term1 || 0, doc.feeStructure?.term2 || 0, doc.feeStructure?.term3 || 0];
      ['Term 1', 'Term 2', 'Term 3'].forEach((term, idx) => {
        if (idx < startIdx || amounts[idx] <= 0) return;
        allRows.push({ year: doc.year, term, termIndex: idx, expected: amounts[idx] });
      });
    });

    let cumulativeExpected = 0;
    const enriched = allRows.map(row => {
      cumulativeExpected += row.expected;
      return { ...row, cleared: pool >= cumulativeExpected, outstanding: Math.max(0, cumulativeExpected - pool) };
    });

    const focusRows = enriched.filter(r => r.year === Number(focusYear));
    const focusTermFee = focusRows.reduce((s, r) => s + r.expected, 0);
    const priorYearsExpected = enriched.filter(r => r.year < Number(focusYear)).reduce((s, r) => s + r.expected, 0);
    const appliedToFocus = Math.min(Math.max(0, pool - priorYearsExpected), focusTermFee);
    const expectedThroughFocus = priorYearsExpected + focusTermFee;
    const surplusAfterFocus = Math.max(0, pool - expectedThroughFocus);
    const totalFee = focusTermFee + Math.max(0, priorYearsExpected - Math.min(pool, priorYearsExpected));
    const paid = appliedToFocus + surplusAfterFocus;
    const balance = totalFee - paid;

    return {
      totalFee, paid, balance,
      isFullyPaid: balance <= 0,
      hasCredit: balance < 0,
      credit: balance < 0 ? Math.abs(balance) : 0,
      termBreakdown: focusRows.map(r => ({ term: r.term, expected: r.expected, cleared: r.cleared, outstanding: r.outstanding })),
    };
  };

  const getClassOrder = (className) => {
    const index = CLASS_ORDER.indexOf(className);
    return index !== -1 ? index : 999;
  };

  const sortClassesByOrder = (classes) =>
    [...classes].sort((a, b) => getClassOrder(a) - getClassOrder(b));

  // Whether the currently selected class has streams
  const classHasStreams = (className) => {
    if (!className) return false;
    const classData = schoolClasses.find(c => c.name === className);
    return !!(classData?.streams && classData.streams.length > 0);
  };

  // Stream display helper — only show if streams exist
  const showStreamColumns = selectedClass && classHasStreams(selectedClass);

  useEffect(() => { loadAllData(); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    if (pupils.length > 0) loadFeeData(selectedYear);
    // eslint-disable-next-line
  }, [selectedYear]);

  useEffect(() => {
    if (selectedClass) {
      const classData = schoolClasses.find(c => c.name === selectedClass);
      setAvailableStreams(classData?.streams || []);
      setSelectedStream('');
    } else {
      setAvailableStreams([]);
      setSelectedStream('');
    }
  }, [selectedClass, schoolClasses]);

  useEffect(() => {
    if (selectedExamType && selectedTerm) {
      const filteredExams = exams.filter(e => e.type === selectedExamType && e.term === selectedTerm);
      setAvailableExamNames([...new Set(filteredExams.map(e => e.title))]);
      setSelectedExamName('');
    }
  }, [selectedExamType, selectedTerm, exams]);

  useEffect(() => {
    if (selectedTerm && selectedYear) {
      const termExams = exams.filter(e => e.term === selectedTerm && e.year === selectedYear);
      setAvailableCombinedExams([...new Set(termExams.map(e => e.title))]);
    }
  }, [selectedTerm, selectedYear, exams]);

  useEffect(() => {
    setSelectedExamType('');
    setSelectedExamName('');
    // eslint-disable-next-line
  }, [selectedTerm]);

  const loadFeeData = async (year) => {
    try {
      const yearsToFetch = [year - 2, year - 1, year, year + 1, year + 2];
      const allFees = [];
      for (const y of yearsToFetch) {
        const res = await api.get('/fees', { params: { year: y } });
        if (res.data?.success) (res.data.data || []).forEach(f => allFees.push(f));
      }
      const map = {};
      allFees.forEach(fee => {
        const sid = fee.studentId?._id || fee.studentId;
        if (!sid) return;
        if (!map[sid]) map[sid] = [];
        map[sid].push(fee);
      });
      setFeesData(map);
    } catch (err) {
      console.error('Error loading fee data:', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
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
        setAvailableClasses(sortClassesByOrder(
          classes.filter(c => c.isActive !== false).map(c => c.name)
        ));
      }
      const pupilsRes = await api.get('/pupils');
      if (pupilsRes.data?.success) setPupils(pupilsRes.data.data || []);
      const resultsRes = await api.get('/results');
      if (resultsRes.data?.success) setResults(resultsRes.data.data || []);
      const examsRes = await api.get('/exams');
      if (examsRes.data?.success) {
        const examsData = examsRes.data.data || [];
        setExams(examsData);
        setAvailableExamTypes([...new Set(examsData.map(e => e.type).filter(Boolean))]);
      }
      await loadFeeData(selectedYear);
      toast.success('Data loaded from database');
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data from server');
    } finally {
      setLoading(false);
    }
  };

  const loadPerformanceData = async () => {
    if (!selectedClass) return toast.error('Please select a class');
    if (!selectedTerm) return toast.error('Please select a term');
    
    setLoading(true);
    try {
      let finalResults = [];
      let combinedExamDataLocal = null;
      let selectedExamNames = [];
      
      if (isCombinedReport) {
        if (selectedCombinedExams.length === 0) {
          toast.error('Please select at least one exam to combine');
          setLoading(false);
          return;
        }
        selectedExamNames = selectedCombinedExams;
        combinedExamDataLocal = {};
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
          
          combinedExamDataLocal[examName] = {};
          examResults.forEach(r => {
            const pupilId = r.pupilId?._id || r.pupilId;
            if (!combinedExamDataLocal[examName][pupilId]) combinedExamDataLocal[examName][pupilId] = {};
            combinedExamDataLocal[examName][pupilId][r.subject] = r.marks || r.score || 0;
          });
          
          examResults.forEach(r => allResults.push({ ...r, weight: weight / 100, examName }));
        }
        
        const combinedMap = new Map();
        allResults.forEach(r => {
          const pupilId = r.pupilId?._id || r.pupilId;
          const key = `${pupilId}-${r.subject}`;
          if (!combinedMap.has(key)) {
            combinedMap.set(key, {
              pupilId: r.pupilId, subject: r.subject,
              weightedMarks: 0, totalWeight: 0,
              studentName: r.pupilId?.name || r.pupilName || 'Unknown',
              admNo: r.pupilId?.admNo || r.admNo || 'N/A',
              stream: r.pupilId?.stream || r.stream || '',
              class: r.class || selectedClass
            });
          }
          const entry = combinedMap.get(key);
          entry.weightedMarks += (r.marks || r.score || 0) * r.weight;
          entry.totalWeight += r.weight;
        });
        
        finalResults = Array.from(combinedMap.values()).map(entry => ({
          ...entry,
          marks: entry.totalWeight > 0 ? entry.weightedMarks / entry.totalWeight : 0
        }));
      } else {
        if (!selectedExamType) return toast.error('Please select an exam type');
        if (!selectedExamName) return toast.error('Please select an exam name');
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
      
      const subjects = [...new Set(finalResults.map(r => r.subject).filter(Boolean))];
      setAllSubjects(subjects);
      
      const studentMap = new Map();
      finalResults.forEach(r => {
        const pupilId = r.pupilId?._id || r.pupilId;
        if (!studentMap.has(pupilId)) {
          studentMap.set(pupilId, {
            id: pupilId,
            name: r.pupilId?.name || r.pupilName || 'Unknown',
            admNo: r.pupilId?.admNo || r.admNo || 'N/A',
            stream: r.pupilId?.stream || r.stream || '',
            subjectMarks: {}, totalMarks: 0, subjectsCount: 0
          });
        }
        const student = studentMap.get(pupilId);
        const marks = r.marks || r.score || 0;
        student.subjectMarks[r.subject] = marks;
        student.totalMarks += marks;
        student.subjectsCount++;
      });
      
      const subjectAvgMap = {};
      subjects.forEach(subject => {
        const allMarks = [];
        studentMap.forEach(student => {
          if (student.subjectMarks[subject] !== undefined) allMarks.push(student.subjectMarks[subject]);
        });
        subjectAvgMap[subject] = allMarks.length > 0 ? allMarks.reduce((a, b) => a + b, 0) / allMarks.length : 0;
      });
      setSubjectAverages(subjectAvgMap);
      
      let performanceData = Array.from(studentMap.values()).map((student) => {
        const averageScore = student.subjectsCount > 0 ? student.totalMarks / student.subjectsCount : 0;
        const subjectScores = {};
        subjects.forEach(subject => { subjectScores[subject] = student.subjectMarks[subject] || 0; });
        const competency = getCompetencyLevel(averageScore);
        const pupilFees = feesData[student.id] || [];
        const feeSummary = buildFeeSummaryForPupil(pupilFees, selectedYear);
        return {
          id: student.id, name: student.name, admNo: student.admNo, stream: student.stream,
          ...subjectScores, totalMarks: student.totalMarks, averageScore,
          subjectsCount: student.subjectsCount,
          grade: getGrade(averageScore), competency,
          recommendation: getRecommendation(averageScore),
          feeSummary,
        };
      }).sort((a, b) => b.totalMarks - a.totalMarks);
      
      let rank = 1;
      for (let i = 0; i < performanceData.length; i++) {
        if (i > 0 && performanceData[i].totalMarks === performanceData[i-1].totalMarks) {
          performanceData[i].rank = performanceData[i-1].rank;
        } else performanceData[i].rank = rank;
        rank++;
      }
      
      setFilteredData(performanceData);
      setCombinedExamData(combinedExamDataLocal);
      setExamNamesList(selectedExamNames);
      
      const classAvg = performanceData.reduce((sum, s) => sum + s.averageScore, 0) / performanceData.length;
      const passRate = (performanceData.filter(s => s.averageScore >= 40).length / performanceData.length * 100).toFixed(1);
      const meanDeviation = calculateMeanDeviation(performanceData.map(s => s.averageScore), classAvg);
      
      setAnalysisStats({
        classAverage: classAvg,
        totalStudents: performanceData.length,
        passRate,
        meanDeviation,
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
        setExamWeights(prevWeights => ({ ...prevWeights, [examName]: parseFloat(weight) }));
        return newSelected;
      }
    });
  };

  const handleWeightChange = (examName, value) => {
    const weight = parseFloat(value);
    if (!isNaN(weight) && weight >= 0 && weight <= 100) {
      setExamWeights(prev => ({ ...prev, [examName]: weight }));
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

  // ===== WORD: class results =====
  const generateWordDocument = async () => {
    if (filteredData.length === 0) return toast.error('No data to download');

    try {
      const reportTitle = isCombinedReport
        ? `COMBINED EXAM RESULTS — ${selectedCombinedExams.join(' + ')}`
        : `${selectedExamName || 'EXAM'} RESULTS`;

      const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
      const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

      const children = [];

      children.push(
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (schoolInfo.name || 'School Name').toUpperCase(), bold: true, size: 32 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: schoolInfo.address || '', size: 20 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${schoolInfo.phone || ''} | ${schoolInfo.email || ''}`, size: 20 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 100 }, children: [new TextRun({ text: reportTitle, bold: true, size: 26 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({
          text: `${selectedClass}${showStreamColumns && selectedStream && selectedStream !== 'all' ? ` ${selectedStream}` : ''} | Year: ${selectedYear} | Term: ${selectedTerm}`,
          size: 20,
        })] }),
      );

      const baseHeaders = [
        new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '#', bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ children: [new TextRun({ text: 'Name', bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Adm', bold: true, size: 18 })] })] }),
      ];
      if (showStreamColumns) {
        baseHeaders.push(new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Str', bold: true, size: 18 })] })] }));
      }

      const headerCells = [
        ...baseHeaders,
        ...allSubjects.map(subject => new TableCell({
          borders: cellBorders, shading: { fill: 'F0F0F0' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: subject.substring(0, 4).toUpperCase(), bold: true, size: 18 })] })]
        })),
        new TableCell({ borders: cellBorders, shading: { fill: 'E0EEFF' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tot', bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'E0FFE0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Avg%', bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Gr', bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Comp', bold: true, size: 18 })] })] }),
      ];

      const tableHeader = new TableRow({ children: headerCells });

      const bodyRows = filteredData.map((student) => {
        const cells = [
          new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(student.rank), size: 18 })] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: student.name, size: 18 })] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: student.admNo, size: 18 })] })] }),
        ];
        if (showStreamColumns) {
          cells.push(new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: student.stream?.charAt(0) || '-', size: 18 })] })] }));
        }
        allSubjects.forEach(subject => {
          const marks = student[subject];
          cells.push(new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: marks ? String(marks) : '-', size: 18 })] })] }));
        });
        cells.push(
          new TableCell({ borders: cellBorders, shading: { fill: 'E0EEFF' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(student.totalMarks), bold: true, size: 18 })] })] }),
          new TableCell({ borders: cellBorders, shading: { fill: 'E0FFE0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: student.averageScore.toFixed(1), bold: true, size: 18 })] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: student.grade, bold: true, size: 18 })] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: student.competency?.level || 'N/A', size: 18 })] })] }),
        );
        return new TableRow({ children: cells });
      });

      const avgTotal = filteredData.reduce((sum, s) => sum + s.totalMarks, 0) / filteredData.length;
      const averagesCells = [
        new TableCell({
          borders: cellBorders, shading: { fill: 'F5F5F5' },
          columnSpan: showStreamColumns ? 4 : 3,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'AVERAGE', bold: true, size: 18 })] })],
        }),
        ...allSubjects.map(subject => new TableCell({
          borders: cellBorders, shading: { fill: 'F5F5F5' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (subjectAverages[subject] || 0).toFixed(1), bold: true, size: 18 })] })],
        })),
        new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: avgTotal.toFixed(1), bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${analysisStats?.classAverage?.toFixed(1) || '0'}%`, bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, columnSpan: 2, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '-', size: 18 })] })] }),
      ];

      const resultsTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [tableHeader, ...bodyRows, new TableRow({ children: averagesCells })],
      });

      children.push(resultsTable);
      children.push(
        new Paragraph({ spacing: { before: 300 }, children: [] }),
        new Paragraph({ children: [new TextRun({ text: 'SUMMARY', bold: true, size: 22 })] }),
        new Paragraph({ children: [new TextRun({ text: `Total Students: ${analysisStats?.totalStudents || 0}`, size: 20 })] }),
        new Paragraph({ children: [new TextRun({ text: `Class Average: ${analysisStats?.classAverage?.toFixed(1) || 0}%`, size: 20 })] }),
        new Paragraph({ children: [new TextRun({ text: `Pass Rate: ${analysisStats?.passRate || 0}%`, size: 20 })] }),
        new Paragraph({ children: [new TextRun({ text: `Highest Total: ${analysisStats?.highestTotal || 0}`, size: 20 })] }),
        new Paragraph({ children: [new TextRun({ text: `Lowest Total: ${analysisStats?.lowestTotal || 0}`, size: 20 })] }),
        new Paragraph({ spacing: { before: 300 }, children: [] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Generated on ${new Date().toLocaleString()}`, size: 18, italics: true })] }),
      );

      const doc = new Document({ sections: [{ properties: {}, children }] });
      const blob = await Packer.toBlob(doc);
      const safeName = (schoolInfo.name || 'School').replace(/[^a-z0-9]/gi, '_');
      saveAs(blob, `${safeName}_${selectedClass}_${selectedYear}_${selectedTerm}.docx`);
      toast.success('Word document downloaded');
    } catch (error) {
      console.error('Error generating Word document:', error);
      toast.error('Failed to generate Word document: ' + error.message);
    }
  };

  // ===== WORD: bulk report cards for every student =====
  const generateAllReportCards = async () => {
    if (filteredData.length === 0) {
      toast.error('Generate a report first');
      return;
    }

    setPrintingAll(true);
    try {
      const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
      const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
      const children = [];

      filteredData.forEach((student, studentIdx) => {
        // Page break before every student except the first
        if (studentIdx > 0) {
          children.push(new Paragraph({ children: [new PageBreak()] }));
        }

        // School header
        children.push(
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (schoolInfo.name || 'School Name').toUpperCase(), bold: true, size: 28 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: schoolInfo.address || '', size: 18 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${schoolInfo.phone || ''} | ${schoolInfo.email || ''}`, size: 18 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: schoolInfo.motto || '', size: 16, italics: true })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 150, after: 150 }, children: [new TextRun({ text: 'STUDENT REPORT CARD', bold: true, size: 24 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `${selectedTerm} ${selectedYear} | ${selectedClass}${showStreamColumns && student.stream ? ` ${student.stream}` : ''}`, size: 18 })] }),
        );

        // Student info block
        children.push(
          new Paragraph({ spacing: { before: 100 }, children: [
            new TextRun({ text: 'Name: ', bold: true, size: 20 }),
            new TextRun({ text: student.name, size: 20 }),
            new TextRun({ text: '    Adm No: ', bold: true, size: 20 }),
            new TextRun({ text: student.admNo, size: 20 }),
          ] }),
          new Paragraph({ spacing: { after: 200 }, children: [
            new TextRun({ text: 'Rank: ', bold: true, size: 20 }),
            new TextRun({ text: String(student.rank), size: 20 }),
            new TextRun({ text: '    Class Average: ', bold: true, size: 20 }),
            new TextRun({ text: `${student.averageScore.toFixed(1)}%`, size: 20 }),
          ] }),
        );

        // Subject results table
        const subjectRows = [
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ children: [new TextRun({ text: 'Subject', bold: true, size: 18 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Score', bold: true, size: 18 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Grade', bold: true, size: 18 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Competency', bold: true, size: 18 })] })] }),
            ],
          }),
          ...allSubjects.map(subject => {
            const marks = student[subject] || 0;
            const subjGrade = getGrade(marks);
            const subjComp = getCompetencyLevel(marks);
            return new TableRow({
              children: [
                new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: subject, size: 18 })] })] }),
                new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(marks), size: 18 })] })] }),
                new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: subjGrade, size: 18 })] })] }),
                new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: subjComp.level, size: 18 })] })] }),
              ],
            });
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ children: [new TextRun({ text: 'Total', bold: true, size: 18 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(student.totalMarks), bold: true, size: 18 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: student.grade, bold: true, size: 18 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: student.competency.level, bold: true, size: 18 })] })] }),
            ],
          }),
        ];

        children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: subjectRows }));

        // Recommendation
        children.push(
          new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: 'Recommendation:', bold: true, size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: student.recommendation, size: 18 })] }),
        );

        // Fee statement
        const fee = student.feeSummary || { totalFee: 0, paid: 0, balance: 0 };
        children.push(
          new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: `Fee Statement — ${selectedYear}`, bold: true, size: 20 })] }),
        );

        if (fee.totalFee === 0 && fee.paid === 0) {
          children.push(new Paragraph({ children: [new TextRun({ text: 'No fee records found for this student.', size: 18, italics: true })] }));
        } else {
          const balanceText = fee.balance < 0
            ? `-KSh ${Math.abs(fee.balance).toLocaleString()} (credit)`
            : `KSh ${fee.balance.toLocaleString()}`;

          const feeRows = [
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: `Total Fee (${selectedYear})`, bold: true, size: 18 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `KSh ${fee.totalFee.toLocaleString()}`, size: 18 })] })] }),
            ] }),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Amount Paid', bold: true, size: 18 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `KSh ${fee.paid.toLocaleString()}`, size: 18 })] })] }),
            ] }),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ children: [new TextRun({ text: fee.balance < 0 ? 'Credit (Overpaid)' : 'Balance', bold: true, size: 18 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: balanceText, bold: true, size: 18 })] })] }),
            ] }),
          ];

          children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: feeRows }));
        }

        // Signature block
        children.push(
          new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: '____________________', size: 18 })] }),
          new Paragraph({ children: [new TextRun({ text: 'Class Teacher', size: 16 })] }),
          new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: '____________________', size: 18 })] }),
          new Paragraph({ children: [new TextRun({ text: 'Principal / Director', size: 16 })] }),
          new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: '____________________', size: 18 })] }),
          new Paragraph({ children: [new TextRun({ text: 'Parent / Guardian', size: 16 })] }),
        );
      });

      const doc = new Document({ sections: [{ properties: {}, children }] });
      const blob = await Packer.toBlob(doc);
      const safeName = (schoolInfo.name || 'School').replace(/[^a-z0-9]/gi, '_');
      saveAs(blob, `${safeName}_${selectedClass}_${selectedYear}_${selectedTerm}_ReportCards.docx`);
      toast.success(`Downloaded ${filteredData.length} report cards`);
    } catch (error) {
      console.error('Error generating report cards:', error);
      toast.error('Failed to generate report cards: ' + error.message);
    } finally {
      setPrintingAll(false);
    }
  };

  // ===== EXCEL =====
  const downloadExcel = () => {
    if (filteredData.length === 0) return toast.error('No data to download');
    const reportTitle = isCombinedReport
      ? `COMBINED EXAM RESULTS — ${selectedCombinedExams.join(' + ')}`
      : `${selectedExamName || 'EXAM'} RESULTS`;
    
    const headers = [
      '#', 'Name', 'Adm',
      ...(showStreamColumns ? ['Stream'] : []),
      ...allSubjects.map(s => s.substring(0, 4).toUpperCase()),
      'Tot', 'Avg%', 'Gr', 'Competency'
    ];
    
    const rows = filteredData.map(student => [
      student.rank,
      student.name,
      student.admNo,
      ...(showStreamColumns ? [student.stream || '-'] : []),
      ...allSubjects.map(subject => student[subject] || '-'),
      student.totalMarks,
      student.averageScore.toFixed(1),
      student.grade,
      student.competency?.level || 'N/A',
    ]);
    
    const avgTotal = filteredData.reduce((sum, s) => sum + s.totalMarks, 0) / filteredData.length;
    const avgRow = [
      '', '', '',
      ...(showStreamColumns ? ['AVG'] : ['AVG']),
      ...allSubjects.map(subject => (subjectAverages[subject] || 0).toFixed(1)),
      avgTotal.toFixed(1),
      analysisStats?.classAverage?.toFixed(1) || '0',
      '', ''
    ];
    
    const wsData = [
      [`${schoolInfo.name || 'School Name'}`],
      [`${reportTitle} - ${selectedClass}${showStreamColumns && selectedStream && selectedStream !== 'all' ? ` ${selectedStream}` : ''}`],
      [`Year: ${selectedYear} | Term: ${selectedTerm || 'All'}`],
      isCombinedReport ? [`Combined Exams: ${selectedCombinedExams.join(', ')}`] : [],
      [],
      headers,
      ...rows,
      avgRow
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    
    ws['!cols'] = [
      { wch: 5 }, { wch: 20 }, { wch: 8 },
      ...(showStreamColumns ? [{ wch: 8 }] : []),
      ...allSubjects.map(() => ({ wch: 6 })),
      { wch: 6 }, { wch: 6 }, { wch: 5 }, { wch: 12 }
    ];
    
    XLSX.writeFile(wb, `${schoolInfo.name}_${selectedClass}_${selectedYear}_${selectedTerm}.xlsx`);
    toast.success('Report downloaded');
  };

  return (
    <Layout title="Reports" subtitle="Generate performance reports">
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

      <div className={`bg-white rounded-xl shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-4'} mb-4`}>
        <h2 className={`${deviceInfo.isMobile ? 'text-sm' : 'text-md'} font-bold text-gray-800 mb-3 flex items-center gap-2`}>
          <FiFilter className="text-green-600" /> Select Criteria
        </h2>
        
        <div className={`grid ${responsive.filterGrid} ${responsive.gridGap}`}>
          <div>
            <label className={`block text-gray-600 ${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} mb-1`}>Year</label>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="input-field w-full text-sm py-1.5">
              {years.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-gray-600 ${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} mb-1`}>Term</label>
            <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className="input-field w-full text-sm py-1.5">
              <option value="">Select</option>
              {terms.map(term => <option key={term} value={term}>{term}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-gray-600 ${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} mb-1`}>Class</label>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="input-field w-full text-sm py-1.5">
              <option value="">Select</option>
              {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
          </div>
          {selectedClass && classHasStreams(selectedClass) && (
            <div>
              <label className={`block text-gray-600 ${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} mb-1`}>Stream</label>
              <select value={selectedStream} onChange={(e) => setSelectedStream(e.target.value)} className="input-field w-full text-sm py-1.5">
                <option value="">Select</option>
                <option value="all">All Streams</option>
                {availableStreams.map(stream => <option key={stream} value={stream}>{stream}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="mt-4 border-t pt-4">
          <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'items-center gap-4'} mb-3`}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={!isCombinedReport} onChange={() => setIsCombinedReport(false)} className="w-4 h-4 text-green-600" />
              <span className={deviceInfo.isMobile ? 'text-xs' : 'text-sm'}>Single Exam Report</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={isCombinedReport} onChange={() => setIsCombinedReport(true)} className="w-4 h-4 text-blue-600" />
              <span className={deviceInfo.isMobile ? 'text-xs' : 'text-sm'}>Combined Exam Report</span>
            </label>
          </div>

          {!isCombinedReport ? (
            <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-2 md:grid-cols-3 gap-3'}`}>
              <div>
                <label className={`block text-gray-600 ${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} mb-1`}>Exam Type</label>
                <select value={selectedExamType} onChange={(e) => setSelectedExamType(e.target.value)} className="input-field w-full text-sm py-1.5">
                  <option value="">Select Exam Type</option>
                  {availableExamTypes.map(type => <option key={type} value={type}>{type}</option>)}
                  {availableExamTypes.length === 0 && <option value="" disabled>No exam types found in database</option>}
                </select>
              </div>
              <div>
                <label className={`block text-gray-600 ${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} mb-1`}>Exam Name</label>
                <select value={selectedExamName} onChange={(e) => setSelectedExamName(e.target.value)} className="input-field w-full text-sm py-1.5" disabled={!selectedExamType}>
                  <option value="">{!selectedExamType ? 'Select exam type first' : 'Select exam'}</option>
                  {availableExamNames.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-2 md:grid-cols-3 gap-3'}`}>
                {availableCombinedExams.map(exam => (
                  <div key={exam} className={`flex ${deviceInfo.isMobile ? 'flex-wrap' : 'items-center'} gap-2 p-2 border rounded-lg`}>
                    <input type="checkbox" checked={selectedCombinedExams.includes(exam)} onChange={() => handleCombinedExamToggle(exam)} className="w-4 h-4 text-blue-600" />
                    <span className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} flex-1`}>{exam}</span>
                    {selectedCombinedExams.includes(exam) && (
                      <div className="flex items-center gap-1">
                        <input type="number" value={examWeights[exam] || 0} onChange={(e) => handleWeightChange(exam, e.target.value)} className={`${deviceInfo.isMobile ? 'w-10 text-xs' : 'w-12 text-sm'} border rounded px-1 py-0.5`} min="0" max="100" step="1" />
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
      
      {showResults && analysisStats && (
        <>
          <div className={`bg-gradient-to-r from-green-600 to-blue-600 rounded-lg ${deviceInfo.isMobile ? 'p-2' : 'p-3'} mb-3 text-white`}>
            <h2 className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-bold`}>{schoolInfo.name || 'School Name'}</h2>
            <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} font-semibold mt-1`}>
              Exam: {isCombinedReport ? `Combined (${selectedCombinedExams.join(' + ')})` : (selectedExamName || 'N/A')}
            </p>
            <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} opacity-90`}>
              {selectedClass}{showStreamColumns && selectedStream && selectedStream !== 'all' ? ` ${selectedStream}` : ''} | Year: {selectedYear} | Term: {selectedTerm}
            </p>
          </div>
          
          <div className={`grid ${responsive.statsGrid} ${deviceInfo.isMobile ? 'gap-1' : 'gap-2'} mb-3`}>
            {[
              { label: 'Students', value: analysisStats.totalStudents, color: 'text-blue-600' },
              { label: 'Class Avg', value: `${analysisStats.classAverage.toFixed(1)}%`, color: 'text-green-600' },
              { label: 'Pass Rate', value: `${analysisStats.passRate}%`, color: 'text-yellow-600' },
              { label: 'Mean Dev', value: analysisStats.meanDeviation.toFixed(1), color: 'text-purple-600' },
              { label: 'Highest', value: analysisStats.highestTotal, color: 'text-green-600' },
              { label: 'Lowest', value: analysisStats.lowestTotal, color: 'text-red-600' },
            ].map((stat, i) => (
              <div key={i} className={`bg-white rounded-lg shadow ${deviceInfo.isMobile ? 'p-1.5' : 'p-2'} text-center`}>
                <p className={`text-gray-500 ${deviceInfo.isMobile ? 'text-[8px]' : 'text-[10px]'}`}>{stat.label}</p>
                <p className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className={`bg-yellow-50 rounded-lg ${deviceInfo.isMobile ? 'p-1.5' : 'p-2'} mb-3 border border-yellow-200`}>
            <h3 className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-bold text-gray-800 mb-2 flex items-center gap-1`}>
              <FiAward className="text-yellow-600" /> TOP 3 PERFORMERS
            </h3>
            <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'justify-around'} text-center text-xs`}>
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

          <div className="bg-white rounded-lg shadow overflow-hidden mb-3">
            <div className={`${deviceInfo.isMobile ? 'px-1.5 py-1' : 'px-2 py-1.5'} border-b bg-gray-50 flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'justify-between items-center'} flex-wrap`}>
              <h3 className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-bold`}>RESULTS TABLE</h3>
              <div className="flex gap-1 flex-wrap">
                <button onClick={downloadExcel} className="bg-green-600 text-white rounded px-2 py-0.5 text-[10px] flex items-center gap-0.5">
                  <FiDownload className="w-3 h-3" /> Excel
                </button>
                <button onClick={generateWordDocument} className="bg-blue-600 text-white rounded px-2 py-0.5 text-[10px] flex items-center gap-0.5">
                  <FiFileText className="w-3 h-3" /> Word
                </button>
                <button
                  onClick={generateAllReportCards}
                  disabled={printingAll}
                  className={`bg-purple-600 text-white rounded px-2 py-0.5 text-[10px] flex items-center gap-0.5 ${printingAll ? 'opacity-60 cursor-not-allowed' : 'hover:bg-purple-700'}`}
                >
                  <FiPrinter className="w-3 h-3" /> {printingAll ? 'Printing...' : 'Print All Report Cards'}
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
                    {showStreamColumns && <th className={`${deviceInfo.isMobile ? 'px-0.5' : 'px-1'} py-1 text-left`}>Str</th>}
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
                    const rankBg = student.rank === 1 ? 'bg-yellow-50' : student.rank === 2 ? 'bg-gray-50' : student.rank === 3 ? 'bg-orange-50' : '';
                    return (
                      <tr key={idx} className={`${rankBg} hover:bg-gray-50`}>
                        <td className="px-1 py-1 text-center font-bold text-gray-800">{student.rank}</td>
                        <td className={`${deviceInfo.isMobile ? 'px-0.5' : 'px-1'} py-1 font-medium text-gray-800 truncate max-w-[80px]`}>{student.name}</td>
                        <td className={`${deviceInfo.isMobile ? 'px-0.5' : 'px-1'} py-1 text-gray-600`}>{student.admNo}</td>
                        {showStreamColumns && <td className={`${deviceInfo.isMobile ? 'px-0.5' : 'px-1'} py-1`}>{student.stream?.charAt(0) || '-'}</td>}
                        {allSubjects.map(subject => {
                          const marks = student[subject];
                          const markClass = marks >= 80 ? 'text-purple-600 font-bold' : marks >= 60 ? 'text-green-600 font-bold' : marks >= 40 ? 'text-blue-600' : marks > 0 ? 'text-red-600' : '';
                          return (
                            <td key={subject} className={`px-1 py-1 text-center ${markClass}`}>{marks || '-'}</td>
                          );
                        })}
                        <td className="px-1 py-1 text-center font-bold text-blue-600 bg-blue-50">{student.totalMarks}</td>
                        <td className="px-1 py-1 text-center font-bold text-green-600 bg-green-50">{student.averageScore.toFixed(1)}</td>
                        <td className="px-1 py-1 text-center font-bold">{student.grade}</td>
                        <td className="px-1 py-1 text-center font-bold" style={{color: student.competency?.color || '#333'}}>{student.competency?.level || 'N/A'}</td>
                        <td className="px-1 py-1 text-center">
                          <button onClick={() => handlePrintReportCard(student)} className="bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center mx-auto px-2 py-0.5 text-[9px]">
                            <FiPrinter className="w-2.5 h-2.5" /> Print
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-100 font-semibold border-t">
                    <td colSpan={showStreamColumns ? 4 : 3} className="px-1 py-1 text-center font-bold">AVERAGE</td>
                    {allSubjects.map(subject => (
                      <td key={subject} className="px-1 py-1 text-center text-blue-700 font-bold">{(subjectAverages[subject] || 0).toFixed(1)}</td>
                    ))}
                    <td className="px-1 py-1 text-center font-bold text-blue-700">{(filteredData.reduce((sum, s) => sum + s.totalMarks, 0) / filteredData.length).toFixed(1)}</td>
                    <td className="px-1 py-1 text-center font-bold text-green-700">{analysisStats?.classAverage?.toFixed(1)}%</td>
                    <td colSpan="3" className="px-1 py-1 text-center">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'justify-center gap-3'} mb-4 flex-wrap`}>
            <button onClick={downloadExcel} className={`bg-green-600 text-white rounded-lg flex items-center justify-center gap-1 ${deviceInfo.isMobile ? 'w-full px-4 py-2 text-sm' : 'px-4 py-1.5 text-sm'}`}>
              <FiDownload /> EXCEL
            </button>
            <button onClick={generateWordDocument} className={`bg-blue-600 text-white rounded-lg flex items-center justify-center gap-1 ${deviceInfo.isMobile ? 'w-full px-4 py-2 text-sm' : 'px-4 py-1.5 text-sm'}`}>
              <FiFileText /> WORD
            </button>
            <button
              onClick={generateAllReportCards}
              disabled={printingAll}
              className={`bg-purple-600 text-white rounded-lg flex items-center justify-center gap-1 ${deviceInfo.isMobile ? 'w-full px-4 py-2 text-sm' : 'px-4 py-1.5 text-sm'} ${printingAll ? 'opacity-60 cursor-not-allowed' : 'hover:bg-purple-700'}`}
            >
              <FiPrinter /> {printingAll ? 'PRINTING ALL...' : 'PRINT ALL REPORT CARDS'}
            </button>
          </div>
        </>
      )}
      
      {showResults && filteredData.length === 0 && !loading && (
        <div className="bg-yellow-50 rounded-lg p-6 text-center">
          <p className="text-gray-600 text-sm">No results found. Adjust your filters.</p>
        </div>
      )}

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
          feeSummary={selectedStudent.feeSummary}
          showStreamColumn={showStreamColumns}
        />
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-view .input-field { font-size: 16px !important; }
          .mobile-view input, .mobile-view select { font-size: 16px !important; }
          .mobile-view .p-4 { padding: 12px !important; }
          .mobile-view .gap-3 { gap: 8px !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .tablet-view .grid-cols-3 { grid-template-columns: repeat(3, 1fr) !important; }
        }
        .responsive-wrapper { transition: all 0.3s ease; }
      `}</style>
    </Layout>
  );
};

export default Reports;