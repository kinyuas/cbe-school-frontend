// src/components/admin/Reports.jsx
import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../common/Layout';
import {
  FiDownload, FiBarChart2, FiUsers, FiBookOpen, FiFilter,
  FiFileText, FiAward, FiTrendingUp, FiPrinter, FiPercent,
  FiCheck, FiX, FiRefreshCw, FiMonitor, FiSmartphone, FiTablet,
  FiTarget, FiStar
} from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';
import api from '../../services/api';
import * as XLSX from 'xlsx';
import ReportCard from './ReportCard';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, PageBreak,
  ImageRun, VerticalAlign,
} from 'docx';
import { saveAs } from 'file-saver';

/* ============================================================
   AI DEVICE DETECTION
   ============================================================ */
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
      let type = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
      setDeviceInfo({ type, isMobile, isTablet, isDesktop, viewportWidth: width, viewportHeight: height, pixelRatio, isTouchDevice });
    };
    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);
  return deviceInfo;
};

const useResponsiveClasses = (deviceInfo) => ({
  cardPadding: deviceInfo.isMobile ? 'p-3' : 'p-4',
  headingSize: deviceInfo.isMobile ? 'text-sm' : 'text-md',
  textSize: deviceInfo.isMobile ? 'text-xs' : 'text-sm',
  buttonSize: deviceInfo.isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
  gridGap: deviceInfo.isMobile ? 'gap-1.5' : 'gap-3',
  filterGrid: deviceInfo.isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  statsGrid: deviceInfo.isMobile ? 'grid-cols-3' : 'grid-cols-3 md:grid-cols-6'
});

/* ============================================================
   CONSTANTS
   ============================================================ */
const CLASS_ORDER = [
  'Play Group', 'Pre-Primary 1', 'Pre-Primary 2',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
];
const TERM_INDEX = { 'Term 1': 0, 'Term 2': 1, 'Term 3': 2 };
const termIdx = (t) => TERM_INDEX[t] ?? 0;

/* ============================================================
   ✅ SKILL → CAREER-FIELD BOOST
   ============================================================ */
const SKILL_BOOST = {
  'Sports':              { field: 'Sports & Recreation',         boost: 12 },
  'Music':               { field: 'Creative Arts',               boost: 12 },
  'Drama':               { field: 'Creative Arts',               boost: 10 },
  'Art & Design':        { field: 'Creative Arts',               boost: 10 },
  'Leadership':          { field: 'Business & Economics',        boost: 10 },
  'ICT':                 { field: 'ICT & Engineering',           boost: 15 },
  'Agriculture':         { field: 'Agriculture & Environment',   boost: 10 },
  'Home Science':        { field: 'Creative Arts',               boost: 8  },
  'Debate':              { field: 'Law & Humanities',            boost: 10 },
  'Community Service':   { field: 'Education & Social Sciences', boost: 8  },
  'Technical/Practical': { field: 'ICT & Engineering',           boost: 12 }
};

/* ============================================================
   ✅ CAREER DATABASE
   ============================================================ */
const CAREER_DB = [
  { name: 'Medicine & Surgery (MBChB)', field: 'Medicine & Health Sciences', icon: '🩺', subjects: ['Biology', 'Chemistry'], minAvg: 75 },
  { name: 'Pharmacy', field: 'Medicine & Health Sciences', icon: '💊', subjects: ['Biology', 'Chemistry'], minAvg: 70 },
  { name: 'Nursing', field: 'Medicine & Health Sciences', icon: '🏥', subjects: ['Biology', 'Chemistry'], minAvg: 65 },
  { name: 'Computer Science', field: 'ICT & Engineering', icon: '💻', subjects: ['Mathematics', 'Physics'], minAvg: 65 },
  { name: 'Software Engineering', field: 'ICT & Engineering', icon: '🖥️', subjects: ['Mathematics', 'Physics'], minAvg: 65 },
  { name: 'Electrical Engineering', field: 'ICT & Engineering', icon: '⚡', subjects: ['Mathematics', 'Physics'], minAvg: 68 },
  { name: 'Civil Engineering', field: 'ICT & Engineering', icon: '🏗️', subjects: ['Mathematics', 'Physics'], minAvg: 68 },
  { name: 'Mechanical Engineering', field: 'ICT & Engineering', icon: '⚙️', subjects: ['Mathematics', 'Physics'], minAvg: 68 },
  { name: 'Agriculture', field: 'Agriculture & Environment', icon: '🌾', subjects: ['Biology', 'Agriculture'], minAvg: 58 },
  { name: 'Environmental Science', field: 'Agriculture & Environment', icon: '🌍', subjects: ['Biology', 'Geography'], minAvg: 58 },
  { name: 'Statistics', field: 'Business & Economics', icon: '📉', subjects: ['Mathematics'], minAvg: 65 },
  { name: 'Actuarial Science', field: 'Business & Economics', icon: '📈', subjects: ['Mathematics'], minAvg: 70 },
  { name: 'Architecture', field: 'Built Environment', icon: '🏛️', subjects: ['Mathematics', 'Art & Design'], minAvg: 65 },
  { name: 'Law (LLB)', field: 'Law & Humanities', icon: '⚖️', subjects: ['English', 'Kiswahili', 'History'], minAvg: 70 },
  { name: 'Commerce (BCom)', field: 'Business & Economics', icon: '📊', subjects: ['Mathematics', 'Business Studies'], minAvg: 60 },
  { name: 'Business Administration', field: 'Business & Economics', icon: '💼', subjects: ['Mathematics', 'Business Studies'], minAvg: 60 },
  { name: 'Education (B.Ed)', field: 'Education & Social Sciences', icon: '👩‍🏫', subjects: ['English', 'Mathematics'], minAvg: 55 },
  { name: 'Journalism & Media', field: 'Media & Communication', icon: '🎙️', subjects: ['English', 'Kiswahili'], minAvg: 60 },
  { name: 'Psychology', field: 'Education & Social Sciences', icon: '🧠', subjects: ['Biology', 'English'], minAvg: 60 },
  { name: 'Fine Art & Design', field: 'Creative Arts', icon: '🎨', subjects: ['Art & Design', 'English'], minAvg: 55 },
  { name: 'Music & Performing Arts', field: 'Creative Arts', icon: '🎼', subjects: ['Music', 'English'], minAvg: 55 },
  { name: 'Theatre Arts & Film', field: 'Creative Arts', icon: '🎬', subjects: ['English', 'Literature'], minAvg: 55 },
  { name: 'Sports Science', field: 'Sports & Recreation', icon: '🏅', subjects: ['Physical Education', 'Biology'], minAvg: 55 },
  { name: 'Fashion & Textile Design', field: 'Creative Arts', icon: '👗', subjects: ['Art & Design', 'Home Science'], minAvg: 55 }
];

const PROFICIENCY_MULTIPLIER = {
  'Beginner': 0.3,
  'Developing': 0.5,
  'Proficient': 0.7,
  'Advanced': 1.0,
  'Exceptional': 1.3,
};

/* ============================================================
   🔤 Helpers
   ============================================================ */
const normalizeSubjectName = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '').trim();
const getSkillName = (s) => (s?.skill || s?.skillName || '').trim();

/* ============================================================
   📐 A4 PAGE DIMENSIONS
   ============================================================ */
const A4_PAGE = {
  size: { width: 11906, height: 16838 },
  margin: { top: 720, right: 720, bottom: 720, left: 720 },
};

/* ============================================================
   🔢 ROUNDING HELPERS
   ============================================================ */
const roundWhole = (value) => {
  if (value === null || value === undefined || isNaN(value)) return 0;
  return Math.round(Number(value));
};

/* ============================================================
   🤖 AI DENSITY ESTIMATOR
   ============================================================ */
const estimateCardDensity = (student, opts = {}) => {
  const {
    subjectsCount = 0, skillsCount = 0, careersCount = 0,
    showSkills = true, showCareer = true,
    showFees = false, hasFeeRecord = false, isCombined = false,
  } = opts;

  let units = 0;
  units += 6;
  units += 2;
  units += 4;
  units += 2 + subjectsCount * (isCombined ? 1.5 : 1.1);
  units += 1;
  units += 1;
  if (showSkills) units += 2 + Math.max(skillsCount, 1) * 1.1;
  if (showCareer && careersCount > 0) units += 2 + careersCount * 1.2;
  if (showFees && hasFeeRecord) units += 4;
  units += 4;

  return units;
};

const pickCardScale = (units) => {
  if (units <= 45) return { nameSize: 26, subjectSize: 20, contactSize: 16, tableSize: 18, spacingMul: 1.0, logoSize: 80 };
  if (units <= 60) return { nameSize: 22, subjectSize: 18, contactSize: 14, tableSize: 16, spacingMul: 0.85, logoSize: 70 };
  if (units <= 75) return { nameSize: 20, subjectSize: 16, contactSize: 13, tableSize: 14, spacingMul: 0.7, logoSize: 60 };
  if (units <= 90) return { nameSize: 18, subjectSize: 15, contactSize: 12, tableSize: 12, spacingMul: 0.6, logoSize: 55 };
  return { nameSize: 16, subjectSize: 14, contactSize: 11, tableSize: 11, spacingMul: 0.5, logoSize: 50 };
};

/* ============================================================
   🔧 SKILL NORMALIZER
   ============================================================ */
const normalizeSkill = (s = {}) => ({
  category: s.category || '',
  skill: s.skill || s.skillName || '',
  proficiency: s.proficiency || '',
  evidence: s.evidence || s.notes || '',
  recordedBy: s.recordedBy || s.recordedByName || 'Teacher',
  date: s.date || s.recordedAt || s.createdAt || null,
});

/* ============================================================
   🖼️ WORD DOCUMENT HEADER
   ============================================================ */
const buildWordLogoParagraph = (schoolInfo = {}, opts = {}) => {
  const {
    schoolNameSize = 28, contactSize = 16, mottoSize = 18,
    logoWidth = 80, logoHeight = 80,
  } = opts;

  const logoBase64 = schoolInfo?.schoolLogo || schoolInfo?.logo || '';
  const schoolName = (schoolInfo?.name || schoolInfo?.schoolName || 'School').toUpperCase();
  const motto = schoolInfo?.motto || '';
  const address = schoolInfo?.address || '';
  const phone = schoolInfo?.phone || schoolInfo?.phoneNumber || '';
  const email = schoolInfo?.email || schoolInfo?.schoolEmail || '';

  let imageType = 'png';
  if (typeof logoBase64 === 'string' && logoBase64.startsWith('data:image/')) {
    const m = logoBase64.match(/^data:image\/([a-zA-Z0-9+]+)/);
    if (m) {
      let t = m[1].toLowerCase();
      if (t === 'jpeg') t = 'jpg';
      if (['png', 'jpg', 'gif', 'bmp', 'svg'].includes(t)) imageType = t;
    }
  }

  const logoChildren = [];
  if (logoBase64 && typeof logoBase64 === 'string' && logoBase64.startsWith('data:image/')) {
    try {
      const base64Data = logoBase64.split(',')[1];
      const bin = atob(base64Data);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

      logoChildren.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 0 },
        children: [new ImageRun({
          type: imageType, data: bytes,
          transformation: { width: logoWidth, height: logoHeight },
        })],
      }));
    } catch (e) {
      console.warn('⚠️ Logo embed failed:', e.message);
    }
  }
  if (logoChildren.length === 0) {
    logoChildren.push(new Paragraph({ children: [new TextRun({ text: '', size: 2 })] }));
  }

  const infoChildren = [];
  infoChildren.push(new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 0, after: 40 },
    children: [new TextRun({ text: schoolName, bold: true, size: schoolNameSize, color: '1a365d' })],
  }));
  if (motto) {
    infoChildren.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 40 },
      children: [new TextRun({ text: `"${motto}"`, italics: true, size: mottoSize, color: '6b7280' })],
    }));
  }
  if (address) {
    infoChildren.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: address, size: contactSize, color: '4b5563' })],
    }));
  }
  const contactLine = [phone, email].filter(Boolean).join(' · ');
  if (contactLine) {
    infoChildren.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: contactLine, size: contactSize, color: '4b5563' })],
    }));
  }

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const noBorders = {
    top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
    insideHorizontal: noBorder, insideVertical: noBorder,
  };

  const innerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    alignment: AlignmentType.CENTER,
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: noBorders, verticalAlign: VerticalAlign.CENTER,
          margins: { top: 0, bottom: 0, left: 0, right: 200 },
          children: logoChildren,
        }),
        new TableCell({
          width: { size: 75, type: WidthType.PERCENTAGE },
          borders: noBorders, verticalAlign: VerticalAlign.CENTER,
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          children: infoChildren,
        }),
      ],
    })],
  });

  const outerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    alignment: AlignmentType.CENTER,
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          borders: noBorders,
          children: [new Paragraph({ children: [new TextRun({ text: '', size: 2 })] })],
        }),
        new TableCell({
          width: { size: 64, type: WidthType.PERCENTAGE },
          borders: noBorders, verticalAlign: VerticalAlign.CENTER,
          children: [innerTable],
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          borders: noBorders,
          children: [new Paragraph({ children: [new TextRun({ text: '', size: 2 })] })],
        }),
      ],
    })],
  });

  return [outerTable];
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
const Reports = () => {
  const deviceInfo = useDeviceDetection();
  const responsive = useResponsiveClasses(deviceInfo);

  /* ---------- State ---------- */
  const [pupils, setPupils] = useState([]);
  const [results, setResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState({});
  const [schoolClasses, setSchoolClasses] = useState([]);
  const [feesData, setFeesData] = useState({});
  const [reportCardConfig, setReportCardConfig] = useState({
    showFeesOnReportCard: false,
    showFeesOnClassReport: false,
    showFeesOnStreamReport: false,
    showFeesOnCombinedReport: false,
    whoCanEnableFees: 'admin'
  });

  // 🆕 Next-term fees per pupil: { [pupilId]: { nextTerm, nextYear, nextTermFee, ... } }
  const [nextTermFees, setNextTermFees] = useState({});

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('');
  const [selectedExamName, setSelectedExamName] = useState('');

  const [reportType, setReportType] = useState('single');
  const [isCombinedReport, setIsCombinedReport] = useState(false);
  const [selectedCombinedExams, setSelectedCombinedExams] = useState([]);
  const [examWeights, setExamWeights] = useState({});

  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableStreams, setAvailableStreams] = useState([]);
  const [availableExamNames, setAvailableExamNames] = useState([]);
  const [availableCombinedExams, setAvailableCombinedExams] = useState([]);
  const [availableExamTypes, setAvailableExamTypes] = useState([]);

  const [loading, setLoading] = useState(false);
  const [printingAll, setPrintingAll] = useState(false);
  
  // Computed Data
  const [allSubjects, setAllSubjects] = useState([]);
  const [subjectAverages, setSubjectAverages] = useState({});
  const [analysisStats, setAnalysisStats] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showReportCard, setShowReportCard] = useState(false);
  const [combinedExamData, setCombinedExamData] = useState(null);
  const [examNamesList, setExamNamesList] = useState([]);

  // Skills & talents
  const [skillsSummary, setSkillsSummary] = useState({});
  const [skillsReportRows, setSkillsReportRows] = useState([]);
  const [careerInsights, setCareerInsights] = useState({});
  const [showSkillsOnReport, setShowSkillsOnReport] = useState(true);
  const [showCareerOnReport, setShowCareerOnReport] = useState(true);

  const terms = ['Term 1', 'Term 2', 'Term 3'];
  const years = [2023, 2024, 2025, 2026, 2027];

  const competencyLevels = [
    { level: 'EE', minScore: 80, maxScore: 100, color: '#9b59b6', description: 'Exceeding Expectation' },
    { level: 'ME', minScore: 60, maxScore: 79, color: '#27ae60', description: 'Meeting Expectation' },
    { level: 'AE', minScore: 40, maxScore: 59, color: '#3498db', description: 'Approaching Expectation' },
    { level: 'BE', minScore: 20, maxScore: 39, color: '#f1c40f', description: 'Below Expectation' },
    { level: 'WBE', minScore: 0, maxScore: 19, color: '#e74c3c', description: 'Well Below Expectation' }
  ];

  /* ---------- Helpers ---------- */
  const getCompetencyLevel = (marks) => {
    for (let l of competencyLevels) if (marks >= l.minScore && marks <= l.maxScore) return l;
    return competencyLevels[4];
  };
  const getGrade = (marks) => {
    if (marks >= 80) return 'A'; if (marks >= 75) return 'A-';
    if (marks >= 70) return 'B+'; if (marks >= 65) return 'B';
    if (marks >= 60) return 'B-'; if (marks >= 55) return 'C+';
    if (marks >= 50) return 'C'; if (marks >= 45) return 'C-';
    if (marks >= 40) return 'D+'; if (marks >= 35) return 'D';
    if (marks >= 30) return 'D-'; return 'E';
  };
  const getRecommendation = (avg) => {
    if (avg >= 80) return 'Excellent mastery. Continue challenging with advanced tasks.';
    if (avg >= 60) return 'Good understanding. Maintain and encourage more challenging tasks.';
    if (avg >= 40) return 'Approaching expectation. Provide extra practice and support.';
    if (avg >= 20) return 'Below expectation. Implement remedial support.';
    return 'Well below expectation. Immediate intensive intervention needed.';
  };
  const getClassOrder = (name) => CLASS_ORDER.indexOf(name) === -1 ? 999 : CLASS_ORDER.indexOf(name);
  const sortClassesByOrder = (arr) => [...arr].sort((a, b) => getClassOrder(a) - getClassOrder(b));
  const classHasStreams = (name) => {
    if (!name) return false;
    const c = schoolClasses.find(x => x.name === name);
    return !!(c?.streams && c.streams.length > 0);
  };
  const showStreamColumns = selectedClass && classHasStreams(selectedClass) && reportType !== 'skills';

  /* ---------- Fee summary ---------- */
  const buildFeeSummaryForPupil = (feeDocs, focusYear) => {
    if (!feeDocs || feeDocs.length === 0) {
      return { totalFee: 0, paid: 0, balance: 0, isFullyPaid: false, hasCredit: false, credit: 0, termBreakdown: [] };
    }
    const seen = new Set();
    const allPayments = [];
    feeDocs.forEach(doc => (doc.payments || []).forEach(p => {
      const key = `${p.receiptNumber || 'NO-R'}__${p.date || p.createdAt || ''}__${Number(p.amount) || 0}__${p.paymentMethod || 'Cash'}`;
      if (seen.has(key)) return;
      seen.add(key);
      allPayments.push(Number(p.amount) || 0);
    }));
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
    let cumulative = 0;
    const enriched = allRows.map(r => {
      cumulative += r.expected;
      return { ...r, cleared: pool >= cumulative, outstanding: Math.max(0, cumulative - pool) };
    });
    const focusRows = enriched.filter(r => r.year === Number(focusYear));
    const focusTermFee = focusRows.reduce((s, r) => s + r.expected, 0);
    const priorExpected = enriched.filter(r => r.year < Number(focusYear)).reduce((s, r) => s + r.expected, 0);
    const applied = Math.min(Math.max(0, pool - priorExpected), focusTermFee);
    const expectedThrough = priorExpected + focusTermFee;
    const surplus = Math.max(0, pool - expectedThrough);
    const totalFee = focusTermFee + Math.max(0, priorExpected - Math.min(pool, priorExpected));
    const paid = applied + surplus;
    const balance = totalFee - paid;
    return {
      totalFee, paid, balance, isFullyPaid: balance <= 0,
      hasCredit: balance < 0, credit: balance < 0 ? Math.abs(balance) : 0,
      termBreakdown: focusRows.map(r => ({ term: r.term, expected: r.expected, cleared: r.cleared, outstanding: r.outstanding })),
    };
  };

  /* ---------- Data loading ---------- */
  useEffect(() => { loadAllData(); }, []); // eslint-disable-line
  useEffect(() => { if (pupils.length > 0) loadFeeData(selectedYear); }, [selectedYear]); // eslint-disable-line

  useEffect(() => {
    if (selectedClass) {
      const c = schoolClasses.find(x => x.name === selectedClass);
      setAvailableStreams(c?.streams || []);
      setSelectedStream('');
    } else {
      setAvailableStreams([]); setSelectedStream('');
    }
  }, [selectedClass, schoolClasses]);

  useEffect(() => {
    if (selectedExamType && selectedTerm) {
      const f = exams.filter(e => e.type === selectedExamType && e.term === selectedTerm);
      setAvailableExamNames([...new Set(f.map(e => e.title))]);
      setSelectedExamName('');
    }
  }, [selectedExamType, selectedTerm, exams]);

  useEffect(() => {
    if (selectedTerm && selectedYear) {
      const termExams = exams.filter(e => e.term === selectedTerm && e.year === selectedYear);
      const names = [...new Set(termExams.map(e => e.title))];
      setAvailableCombinedExams(names);
      setSelectedCombinedExams(prev => prev.filter(n => names.includes(n)));
    } else {
      setAvailableCombinedExams([]);
    }
  }, [selectedTerm, selectedYear, exams]);

  useEffect(() => { setSelectedExamType(''); setSelectedExamName(''); }, [selectedTerm]); // eslint-disable-line

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
    } catch (err) { console.error('Fee load error:', err); }
  };

  const loadNextTermFeesForAll = async (pupilList) => {
    const now = new Date();
    const cm = now.getMonth() + 1;
    const cy = now.getFullYear();

    let currentTerm = 'Term 1';
    if (cm >= 5 && cm <= 8) currentTerm = 'Term 2';
    else if (cm >= 9 && cm <= 12) currentTerm = 'Term 3';

    let nextTerm = 'Term 2';
    let nextYear = cy;
    if (currentTerm === 'Term 1') { nextTerm = 'Term 2'; nextYear = cy; }
    else if (currentTerm === 'Term 2') { nextTerm = 'Term 3'; nextYear = cy; }
    else { nextTerm = 'Term 1'; nextYear = cy + 1; }

    const termProp = nextTerm === 'Term 1' ? 'term1'
                   : nextTerm === 'Term 2' ? 'term2'
                   : 'term3';

    const feeByYear = {};

    await Promise.all([nextYear, cy].map(async (y) => {
      try {
        const res = await api.get(`/fees/class-fee?year=${y}`);
        const rows = res.data?.data || [];
        const map = {};
        rows.forEach(row => {
          if (!row?.class) return;
          map[row.class] = {
            term1: Number(row.term1) || 0,
            term2: Number(row.term2) || 0,
            term3: Number(row.term3) || 0,
          };
        });
        feeByYear[y] = map;
      } catch (err) {
        feeByYear[y] = {};
      }
    }));

    const map = {};
    pupilList.forEach(p => {
      const nextDoc = feeByYear[nextYear]?.[p.class];
      const curDoc = feeByYear[cy]?.[p.class];

      let amount = 0;
      let source = 'unset';

      if (nextDoc && nextDoc[termProp] > 0) {
        amount = nextDoc[termProp];
        source = `class-fee ${nextYear}`;
      } else if (curDoc && curDoc[termProp] > 0) {
        amount = curDoc[termProp];
        source = `class-fee ${cy} (fallback)`;
      }

      map[p._id] = {
        nextTerm,
        nextYear,
        nextTermFee: amount,
        currentTerm,
        currentYear: cy,
        pupilClass: p.class,
        source,
      };
    });

    setNextTermFees(map);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const schoolRes = await api.get('/school/settings');
      if (schoolRes.data?.success && schoolRes.data?.data) {
        const s = schoolRes.data.data;
        setSchoolInfo({
          name: s.schoolName || s.name || '',
          email: s.schoolEmail || s.email || '',
          phone: s.phoneNumber || s.phone || '',
          address: s.address || '',
          motto: s.motto || '',
          website: s.website || '',
          schoolLogo: s.schoolLogo || s.logo || '',
        });
        if (s.reportCardConfig) {
          setReportCardConfig(prev => ({ ...prev, ...s.reportCardConfig }));
        }
        const classes = s.classes || [];
        setSchoolClasses(classes);
        setAvailableClasses(sortClassesByOrder(
          classes.filter(c => c.isActive !== false).map(c => c.name)
        ));
      }
      const pupilsRes = await api.get('/pupils');
      if (pupilsRes.data?.success) {
        const list = pupilsRes.data.data || [];
        setPupils(list);
        loadNextTermFeesForAll(list);
      }
      const resultsRes = await api.get('/results');
      if (resultsRes.data?.success) setResults(resultsRes.data.data || []);
      const examsRes = await api.get('/exams');
      if (examsRes.data?.success) {
        const d = examsRes.data.data || [];
        setExams(d);
        setAvailableExamTypes([...new Set(d.map(e => e.type).filter(Boolean))]);
      }
      await loadFeeData(selectedYear);
      toast.success('Data loaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data');
    } finally { setLoading(false); }
  };

  /* ============================================================
     🆕 INSTANT DATA COMPUTATION (Replaces Load Button)
     ============================================================ */
  const filteredData = useMemo(() => {
    if (!selectedClass || !selectedTerm || reportType === 'skills') return [];
    if (!isCombinedReport && (!selectedExamType || !selectedExamName)) return [];
    if (isCombinedReport && selectedCombinedExams.length === 0) return [];

    let combinedExamDataLocal = null;
    let currentExamNamesList = [];

    // 1. Gather raw results
    let rawResults = [];
    if (isCombinedReport) {
      currentExamNamesList = selectedCombinedExams;
      combinedExamDataLocal = {};
      const allExamResults = [];

      for (const examName of selectedCombinedExams) {
        const matched = results.filter(r => 
          (r.pupilId?.class === selectedClass || r.class === selectedClass) &&
          r.examName === examName && r.term === selectedTerm && Number(r.year) === Number(selectedYear)
        );
        
        combinedExamDataLocal[examName] = {};
        matched.forEach(r => {
          const pid = r.pupilId?._id || r.pupilId;
          if (!combinedExamDataLocal[examName][pid]) combinedExamDataLocal[examName][pid] = {};
          combinedExamDataLocal[examName][pid][r.subject] = roundWhole(r.marks || r.score || 0);
        });
        matched.forEach(r => allExamResults.push({ ...r, examName }));
      }

      const studentSubjectMap = new Map();
      allExamResults.forEach(r => {
        const pid = r.pupilId?._id || r.pupilId;
        const key = `${pid}-${r.subject}`;
        if (!studentSubjectMap.has(key)) {
          studentSubjectMap.set(key, {
            pupilId: r.pupilId, subject: r.subject,
            studentName: r.pupilId?.name || r.pupilName || 'Unknown',
            admNo: r.pupilId?.admNo || r.admNo || 'N/A',
            stream: r.pupilId?.stream || r.stream || '',
            class: r.class || selectedClass, examMarks: {}
          });
        }
        const entry = studentSubjectMap.get(key);
        const newMarks = r.marks || r.score || 0;
        const curMarks = entry.examMarks[r.examName];
        if (curMarks === undefined || newMarks > curMarks) entry.examMarks[r.examName] = newMarks;
      });

      rawResults = Array.from(studentSubjectMap.values()).map(entry => {
        let weightedSum = 0;
        let studentTotalWeight = 0;
        selectedCombinedExams.forEach(examName => {
          const weight = parseFloat(examWeights[examName] || 0);
          const marks = entry.examMarks[examName];
          if (marks !== undefined && marks !== null) {
            weightedSum += (marks * weight);
            studentTotalWeight += weight;
          }
        });
        const finalAverage = studentTotalWeight === 0 ? 0 : weightedSum / studentTotalWeight;
        return { ...entry, marks: roundWhole(finalAverage) };
      });

    } else {
      currentExamNamesList = [selectedExamName];
      rawResults = results.filter(r => 
        (r.pupilId?.class === selectedClass || r.class === selectedClass) &&
        r.examName === selectedExamName && r.examType === selectedExamType && 
        r.term === selectedTerm && Number(r.year) === Number(selectedYear)
      ).map(r => ({ ...r, marks: roundWhole(r.marks || r.score || 0) }));
    }

    // 2. Filter by Stream if needed
    if (selectedStream && selectedStream !== 'all' && classHasStreams(selectedClass)) {
      rawResults = rawResults.filter(r => (r.pupilId?.stream || r.stream) === selectedStream);
    }

    if (rawResults.length === 0) return [];

    // 3. Build columns and student maps
    const subjects = [...new Set(rawResults.map(r => r.subject).filter(Boolean))];
    setAllSubjects(subjects); // Side-effect but necessary for render
    setCombinedExamData(combinedExamDataLocal);
    setExamNamesList(currentExamNamesList);

    const studentMap = new Map();
    rawResults.forEach(r => {
      const pid = r.pupilId?._id || r.pupilId;
      if (!studentMap.has(pid)) {
        studentMap.set(pid, {
          id: pid,
          name: r.pupilId?.name || r.pupilName || 'Unknown',
          admNo: r.pupilId?.admNo || r.admNo || 'N/A',
          stream: r.pupilId?.stream || r.stream || '',
          subjectMarks: {}, totalMarks: 0, subjectsWithMarks: 0
        });
      }
      const s = studentMap.get(pid);
      s.subjectMarks[r.subject] = r.marks;
      s.totalMarks += r.marks;
      s.subjectsWithMarks++;
    });

    const subjectAvgMap = {};
    subjects.forEach(subj => {
      const marksArr = [];
      studentMap.forEach(s => {
        if (s.subjectMarks[subj] !== undefined) marksArr.push(s.subjectMarks[subj]);
      });
      subjectAvgMap[subj] = marksArr.length > 0 ? roundWhole(marksArr.reduce((a, b) => a + b, 0) / marksArr.length) : 0;
    });
    setSubjectAverages(subjectAvgMap);

    const totalSubjectsInClass = subjects.length;

    // 4. Build performance array
    let performanceData = Array.from(studentMap.values()).map(s => {
      const hasMissing = s.subjectsWithMarks < totalSubjectsInClass;
      const rawAvg = totalSubjectsInClass > 0 ? s.totalMarks / totalSubjectsInClass : 0;
      const averageScore = roundWhole(rawAvg);
      const subjectScores = {};
      subjects.forEach(subj => { subjectScores[subj] = s.subjectMarks[subj]; });
      const comp = getCompetencyLevel(averageScore);
      const pupilFees = feesData[s.id] || [];
      const feeSummary = buildFeeSummaryForPupil(pupilFees, selectedYear);
      
      return {
        id: s.id, name: s.name, admNo: s.admNo, stream: s.stream,
        ...subjectScores, totalMarks: s.totalMarks, averageScore,
        subjectsWithMarks: s.subjectsWithMarks, totalSubjectsInClass,
        hasMissingMarks: hasMissing,
        grade: hasMissing ? 'X' : getGrade(averageScore),
        competency: comp, recommendation: getRecommendation(averageScore),
        feeSummary,
      };
    });

    // 5. Calculate Positions
    const complete = performanceData.filter(s => !s.hasMissingMarks);
    const sortedClassComplete = [...complete].sort((a, b) => b.totalMarks - a.totalMarks);
    const streamGroups = {};
    sortedClassComplete.forEach(s => {
      const st = s.stream || 'No Stream';
      if (!streamGroups[st]) streamGroups[st] = [];
      streamGroups[st].push(s);
    });

    let classRank = 1;
    sortedClassComplete.forEach((student, idx) => {
      if (idx > 0 && student.totalMarks === sortedClassComplete[idx - 1].totalMarks) {
        student.classPosition = sortedClassComplete[idx - 1].classPosition;
      } else {
        student.classPosition = classRank;
      }
      classRank++;
    });

    Object.keys(streamGroups).forEach(streamName => {
      let streamRank = 1;
      streamGroups[streamName].forEach((student, idx) => {
        if (idx > 0 && student.totalMarks === streamGroups[streamName][idx - 1].totalMarks) {
          student.streamPosition = streamGroups[streamName][idx - 1].streamPosition;
        } else {
          student.streamPosition = streamRank;
        }
        streamRank++;
      });
    });

    const incomplete = performanceData.filter(s => s.hasMissingMarks).sort((a, b) => b.totalMarks - a.totalMarks);
    incomplete.forEach(s => { s.classPosition = 'X'; s.streamPosition = 'X'; });

    performanceData = [...sortedClassComplete, ...incomplete];

    // 6. Analysis Stats
    const classAvg = complete.length > 0 ? roundWhole(complete.reduce((sum, s) => sum + s.averageScore, 0) / complete.length) : 0;
    const passRate = complete.length > 0 ? roundWhole(complete.filter(s => s.averageScore >= 40).length / complete.length * 100) : 0;
    const meanDeviation = complete.length > 0 ? roundWhole(complete.map(s => Math.abs(s.averageScore - classAvg)).reduce((a, b) => a + b, 0) / complete.length) : 0;

    setAnalysisStats({
      classAverage: classAvg,
      totalStudents: performanceData.length,
      completeCount: complete.length,
      incompleteCount: incomplete.length,
      passRate, meanDeviation,
      highestTotal: complete.length ? Math.max(...complete.map(s => s.totalMarks)) : 0,
      lowestTotal: complete.length ? Math.min(...complete.map(s => s.totalMarks)) : 0,
      term: selectedTerm, year: selectedYear, class: selectedClass, stream: selectedStream,
      reportType: isCombinedReport ? 'Combined' : 'Single Exam'
    });

    return performanceData;
  }, [selectedClass, selectedTerm, selectedExamType, selectedExamName, selectedYear, selectedStream, reportType, isCombinedReport, selectedCombinedExams, examWeights, results, feesData]);


  /* ============================================================
     STREAM-LEVEL ANALYSIS
     ============================================================ */
  const streamAnalysis = useMemo(() => {
    if (!filteredData.length || !showStreamColumns) return [];
    const streams = {};
    filteredData.forEach(s => {
      const st = s.stream || 'No Stream';
      if (!streams[st]) streams[st] = { stream: st, students: [] };
      streams[st].students.push(s);
    });

    const subjectAvgForStream = (students, subject) => {
      const arr = students.map(s => s[subject]).filter(v => typeof v === 'number');
      return arr.length ? roundWhole(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    };

    const result = Object.values(streams).map(({ stream, students }) => {
      const validAverages = students.map(s => s.averageScore).filter(v => typeof v === 'number' && !isNaN(v));
      const mean = validAverages.length ? roundWhole(validAverages.reduce((a, b) => a + b, 0) / validAverages.length) : 0;
      const subjectMeans = {};
      allSubjects.forEach(subj => { subjectMeans[subj] = subjectAvgForStream(students, subj); });

      return {
        stream, count: students.length,
        completeCount: students.filter(s => !s.hasMissingMarks).length,
        mean, grade: getGrade(mean), competency: getCompetencyLevel(mean), subjectMeans,
      };
    });

    result.sort((a, b) => b.mean - a.mean);
    return result;
  }, [filteredData, showStreamColumns, allSubjects]);

  /* ============================================================
     🧠 AI CAREER INSIGHTS
     ============================================================ */
  const buildCareerInsights = (student, studentSkills = []) => {
    const subjectEntries = allSubjects
      .map(subj => ({ name: subj, score: student[subj] }))
      .filter(e => e.score !== undefined && e.score !== null && !isNaN(e.score));

    if (subjectEntries.length === 0) return [];

    const getScore = (target) => {
      const t = normalizeSubjectName(target);
      for (const entry of subjectEntries) {
        const n = normalizeSubjectName(entry.name);
        if (n === t || n.includes(t) || t.includes(n)) return entry.score;
      }
      return null;
    };

    const skillBoosts = (studentSkills || []).map(sk => {
      const b = SKILL_BOOST[sk.category];
      if (!b) return null;
      const mult = PROFICIENCY_MULTIPLIER[sk.proficiency] || 0.5;
      return { field: b.field, boost: b.boost * mult, skill: sk };
    }).filter(Boolean);

    const scored = CAREER_DB.map(career => {
      let subjScore = 0, subjCount = 0;
      const matchedSubjects = [];
      career.subjects.forEach(req => {
        const sc = getScore(req);
        if (sc !== null) {
          subjScore += sc;
          subjCount++;
          matchedSubjects.push({ name: req, score: sc });
        }
      });

      const rawAcademic = subjCount > 0 ? subjScore / subjCount : 0;
      const requiredCount = career.subjects.length;
      const coverageFactor = requiredCount > 0 ? (subjCount / requiredCount) : 0;
      const academicScore = rawAcademic * coverageFactor;

      let skillBoost = 0;
      const matchedSkillsForField = [];
      skillBoosts.forEach(sb => {
        if (sb.field === career.field) {
          skillBoost += sb.boost;
          matchedSkillsForField.push(sb.skill);
        }
      });

      const finalScore = Math.min(100, academicScore + skillBoost);

      return {
        career: career.name, field: career.field, icon: career.icon,
        match: Math.round(finalScore * 10) / 10, academicScore: Math.round(academicScore),
        skillBoost: Math.round(skillBoost), matchedSubjects, matchedSkillsForField,
        coveragePercent: Math.round(coverageFactor * 100),
      };
    });

    return scored.sort((a, b) => b.match - a.match).slice(0, 3).map(c => {
      const parts = [];
      if (c.matchedSubjects.length > 0) {
        const subjList = c.matchedSubjects.slice(0, 2).map(m => `${m.name} (${Math.round(m.score)}%)`).join(', ');
        parts.push(`Strong in ${subjList}`);
      }
      if (c.matchedSkillsForField.length > 0) {
        const names = c.matchedSkillsForField.slice(0, 2).map(sk => getSkillName(sk)).filter(Boolean);
        if (names.length > 0) parts.push(`Talent in ${names.join(' & ')}`);
      }
      if (c.coveragePercent < 100 && c.matchedSubjects.length > 0) parts.push(`(${c.coveragePercent}% subjects)`);

      const rationale = parts.length > 0 ? parts.join(' • ') : 'Matches overall performance';
      return { ...c, rationale };
    });
  };

  useEffect(() => {
    if (!filteredData.length) { setCareerInsights({}); return; }
    const map = {};
    filteredData.forEach(s => {
      const studentSkills = skillsSummary[String(s.id)] || [];
      map[s.id] = buildCareerInsights(s, studentSkills);
    });
    setCareerInsights(map);
  }, [filteredData, allSubjects, skillsSummary]); // eslint-disable-line

  /* ============================================================
     LOAD SKILLS
     ============================================================ */
  const loadSkillsData = async () => {
    if (!selectedClass || !selectedTerm) return;
    try {
      const baseParams = { class: selectedClass, stream: selectedStream === 'all' ? undefined : selectedStream, year: selectedYear };
      let res = await api.get('/reports/skills-summary', { params: { ...baseParams, term: selectedTerm } });
      let rows = res.data?.data || [];
      let totalSkills = rows.reduce((sum, r) => sum + (r.skills?.length || 0), 0);

      if (totalSkills === 0) {
        const fbRes = await api.get('/reports/skills-summary', { params: baseParams });
        const fbRows = fbRes.data?.data || [];
        const fbTotal = fbRows.reduce((sum, r) => sum + (r.skills?.length || 0), 0);
        if (fbTotal > 0) { rows = fbRows; totalSkills = fbTotal; }
      }

      const map = {};
      rows.forEach(row => {
        const key = String(row.pupilId);
        map[key] = Array.isArray(row.skills) ? row.skills.map(normalizeSkill) : [];
      });
      setSkillsSummary(map);
    } catch (err) { console.error('Skills load error:', err); }
  };

  useEffect(() => {
    if (filteredData.length > 0 && selectedClass && selectedTerm && reportType !== 'skills') {
      loadSkillsData();
    }
  }, [filteredData.length, selectedClass, selectedStream, selectedTerm, selectedYear]); // eslint-disable-line

  /* ============================================================
     SKILLS REPORT (flat)
     ============================================================ */
  const loadSkillsReport = async () => {
    if (!selectedClass || !selectedTerm) return toast.error('Select class and term');
    setLoading(true);
    try {
      const baseParams = { class: selectedClass, stream: selectedStream === 'all' ? undefined : selectedStream, year: selectedYear };
      let res = await api.get('/reports/skills', { params: { ...baseParams, term: selectedTerm } });
      let rows = res.data?.data || [];
      if (rows.length === 0) {
        const fb = await api.get('/reports/skills', { params: baseParams });
        rows = fb.data?.data || [];
      }
      const normalized = rows.map(r => ({
        student: r.student, admNo: r.admNo, class: r.class, stream: r.stream,
        category: r.category || '', skill: r.skill || r.skillName || '', proficiency: r.proficiency || '',
        evidence: r.evidence || r.notes || '', recordedBy: r.recordedBy || r.recordedByName || 'Teacher',
        date: r.date || r.recordedAt || r.createdAt || null,
      }));
      setSkillsReportRows(normalized);
      toast.success(`Found ${normalized.length} skill records`);
    } catch (err) {
      toast.error('Failed to load skills report');
    } finally { setLoading(false); }
  };

  const downloadSkillsExcel = () => {
    if (!skillsReportRows.length) return toast.error('No data');
    const headers = ['Student', 'Adm No', 'Class', 'Stream', 'Category', 'Skill', 'Proficiency', 'Evidence', 'Recorded By', 'Date'];
    const rows = skillsReportRows.map(r => [
      r.student, r.admNo, r.class, r.stream, r.category, r.skill,
      r.proficiency, r.evidence, r.recordedBy,
      r.date ? new Date(r.date).toLocaleDateString() : ''
    ]);
    const wsData = [
      [schoolInfo.name || 'School'],
      [`Skills & Talents Report — ${selectedClass}${selectedStream ? ` / ${selectedStream}` : ''}`],
      [`Term: ${selectedTerm} | Year: ${selectedYear}`],
      [],
      headers, ...rows
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = headers.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Skills');
    XLSX.writeFile(wb, `Skills_${selectedClass}_${selectedYear}_${selectedTerm}.xlsx`);
    toast.success('Skills Excel downloaded');
  };

  const downloadSkillsWord = async () => {
    if (!skillsReportRows.length) return toast.error('No data');
    try {
      const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
      const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
      const children = [];

      children.push(...buildWordLogoParagraph(schoolInfo, { schoolNameSize: 26 }));

      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 150 },
          children: [new TextRun({ text: 'SKILLS & TALENTS REPORT', bold: true, size: 24 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: `${selectedClass}${selectedStream && selectedStream !== 'all' ? ` / ${selectedStream}` : ''} | ${selectedTerm} | ${selectedYear}`, size: 18 })],
        }),
      );

      const headers = ['Student', 'Category', 'Skill', 'Proficiency', 'Evidence', 'Recorded By', 'Date'];
      const headerRow = new TableRow({
        children: headers.map(h => new TableCell({
          borders: cellBorders, shading: { fill: 'F0F0F0' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, size: 18 })] })]
        }))
      });

      const bodyRows = skillsReportRows.map(r => new TableRow({
        children: [
          r.student, r.category, r.skill, r.proficiency, r.evidence, r.recordedBy,
          r.date ? new Date(r.date).toLocaleDateString() : ''
        ].map(v => new TableCell({
          borders: cellBorders,
          children: [new Paragraph({ children: [new TextRun({ text: String(v || ''), size: 18 })] })]
        }))
      }));

      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...bodyRows] }));

      const doc = new Document({
        sections: [{ properties: { page: { size: A4_PAGE.size, margin: A4_PAGE.margin } }, children }],
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Skills_${selectedClass}_${selectedYear}_${selectedTerm}.docx`);
      toast.success('Skills Word downloaded');
    } catch (err) { toast.error('Failed to generate Word'); }
  };

  /* ============================================================
     EXCEL — class results
     ============================================================ */
  const downloadExcel = () => {
    if (!filteredData.length) return toast.error('No data');
    const reportTitle = isCombinedReport ? `COMBINED — ${selectedCombinedExams.join(' + ')}` : `${selectedExamName || 'EXAM'} RESULTS`;

    const headers = [
      '#', 'Name', 'Adm', ...(showStreamColumns ? ['Stream'] : []),
      ...allSubjects.map(s => s.substring(0, 4).toUpperCase()), 'Tot', 'Avg%', 'Gr', 'Comp'
    ];

    const rows = filteredData.map(s => [
      s.classPosition, s.name, s.admNo,
      ...(showStreamColumns ? [s.stream || '-'] : []),
      ...allSubjects.map(subj => s[subj] !== undefined ? s[subj] : 'X'),
      s.totalMarks, s.averageScore, s.grade, s.competency?.level || 'N/A',
    ]);

    const wsData = [
      [schoolInfo.name || 'School'],
      [`${reportTitle} - ${selectedClass}${showStreamColumns && selectedStream && selectedStream !== 'all' ? ` ${selectedStream}` : ''}`],
      [`Year: ${selectedYear} | Term: ${selectedTerm}`],
      [], headers, ...rows
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    ws['!cols'] = [
      { wch: 5 }, { wch: 20 }, { wch: 8 }, ...(showStreamColumns ? [{ wch: 8 }] : []),
      ...allSubjects.map(() => ({ wch: 6 })), { wch: 6 }, { wch: 6 }, { wch: 5 }, { wch: 12 }
    ];
    XLSX.writeFile(wb, `${schoolInfo.name}_${selectedClass}_${selectedYear}_${selectedTerm}.xlsx`);
    toast.success('Report downloaded');
  };

  /* ============================================================
     WORD — class results
     ============================================================ */
  const generateWordDocument = async () => {
    if (!filteredData.length) return toast.error('No data');
    try {
      const reportTitle = isCombinedReport ? `COMBINED EXAM RESULTS — ${selectedCombinedExams.join(' + ')}` : `${selectedExamName || 'EXAM'} RESULTS`;
      const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
      const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
      const children = [];

      children.push(...buildWordLogoParagraph(schoolInfo, { schoolNameSize: 30 }));

      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 100 },
          children: [new TextRun({ text: reportTitle, bold: true, size: 26 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: `${selectedClass}${showStreamColumns && selectedStream && selectedStream !== 'all' ? ` ${selectedStream}` : ''} | Year: ${selectedYear} | Term: ${selectedTerm}`, size: 20 })],
        }),
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
        ...allSubjects.map(subj => new TableCell({
          borders: cellBorders, shading: { fill: 'F0F0F0' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: subj.substring(0, 4).toUpperCase(), bold: true, size: 18 })] })]
        })),
        new TableCell({ borders: cellBorders, shading: { fill: 'E0EEFF' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tot', bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'E0FFE0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Avg%', bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Gr', bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Comp', bold: true, size: 18 })] })] }),
      ];
      const tableHeader = new TableRow({ children: headerCells });

      const bodyRows = filteredData.map(s => {
        const cells = [
          new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(s.classPosition), size: 18 })] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: s.name, size: 18 })] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.admNo, size: 18 })] })] }),
        ];
        if (showStreamColumns) {
          cells.push(new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.stream?.charAt(0) || '-', size: 18 })] })] }));
        }
        allSubjects.forEach(subj => {
          const m = s[subj];
          cells.push(new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: m !== undefined ? String(m) : 'X', size: 18 })] })] }));
        });
        cells.push(
          new TableCell({ borders: cellBorders, shading: { fill: 'E0EEFF' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(s.totalMarks), bold: true, size: 18 })] })] }),
          new TableCell({ borders: cellBorders, shading: { fill: 'E0FFE0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(s.averageScore), bold: true, size: 18 })] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.grade, bold: true, size: 18 })] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.competency?.level || 'N/A', size: 18 })] })] }),
        );
        return new TableRow({ children: cells });
      });

      const avgTotal = roundWhole(filteredData.reduce((sum, s) => sum + s.totalMarks, 0) / filteredData.length);
      const averagesCells = [
        new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, columnSpan: showStreamColumns ? 4 : 3, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'AVERAGE', bold: true, size: 18 })] })] }),
        ...allSubjects.map(subj => new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(subjectAverages[subj] || 0), bold: true, size: 18 })] })] })),
        new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(avgTotal), bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${analysisStats?.classAverage || 0}%`, bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, columnSpan: 2, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '-', size: 18 })] })] }),
      ];

      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [tableHeader, ...bodyRows, new TableRow({ children: averagesCells })] }));

      if (showStreamColumns && streamAnalysis.length > 0) {
        children.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
        children.push(new Paragraph({ children: [new TextRun({ text: 'STREAM ANALYSIS (Best → Lowest)', bold: true, size: 22 })] }));

        const sHeaders = ['Stream', 'Students', 'Mean', 'Grade', ...allSubjects.map(s => s.substring(0, 4).toUpperCase())];
        const sHeaderRow = new TableRow({ children: sHeaders.map(h => new TableCell({ borders: cellBorders, shading: { fill: 'E0EEFF' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, size: 18 })] })] })) });
        const sBodyRows = streamAnalysis.map(sa => new TableRow({
          children: [
            new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: sa.stream, size: 18 })] })] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(sa.count), size: 18 })] })] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(sa.mean), bold: true, size: 18 })] })] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: sa.grade, bold: true, size: 18 })] })] }),
            ...allSubjects.map(subj => new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(sa.subjectMeans[subj] || 0), size: 18 })] })] }))
          ]
        }));
        children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [sHeaderRow, ...sBodyRows] }));
      }

      children.push(
        new Paragraph({ spacing: { before: 300 }, children: [] }),
        new Paragraph({ children: [new TextRun({ text: 'SUMMARY', bold: true, size: 22 })] }),
        new Paragraph({ children: [new TextRun({ text: `Total Students: ${analysisStats?.totalStudents || 0} (Complete: ${analysisStats?.completeCount || 0}, Missing: ${analysisStats?.incompleteCount || 0})`, size: 20 })] }),
        new Paragraph({ children: [new TextRun({ text: `Class Average: ${analysisStats?.classAverage || 0}%`, size: 20 })] }),
        new Paragraph({ children: [new TextRun({ text: `Pass Rate: ${analysisStats?.passRate || 0}%`, size: 20 })] }),
        new Paragraph({ spacing: { before: 300 }, children: [] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Generated on ${new Date().toLocaleString()}`, size: 18, italics: true })] }),
      );

      const doc = new Document({ sections: [{ properties: { page: { size: A4_PAGE.size, margin: A4_PAGE.margin } }, children }] });
      const blob = await Packer.toBlob(doc);
      const safeName = (schoolInfo.name || 'School').replace(/[^a-z0-9]/gi, '_');
      saveAs(blob, `${safeName}_${selectedClass}_${selectedYear}_${selectedTerm}.docx`);
      toast.success('Word document downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate Word document: ' + err.message);
    }
  };

  /* ============================================================
     WORD — Bulk report cards
     ============================================================ */
  const generateAllReportCards = async () => {
    if (!filteredData.length) return toast.error('Generate a report first');
    setPrintingAll(true);
    try {
      const thinBorder = { style: BorderStyle.SINGLE, size: 2, color: '999999' };
      const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
      const children = [];

      filteredData.forEach((student, idx) => {
        if (idx > 0) children.push(new Paragraph({ children: [new PageBreak()] }));

        const studentSkills = skillsSummary[String(student.id)] || [];
        const careers = buildCareerInsights(student, studentSkills);
        const hasFee = reportCardConfig.showFeesOnReportCard && (student.feeSummary?.totalFee > 0 || student.feeSummary?.paid > 0);

        const units = estimateCardDensity(student, {
          subjectsCount: allSubjects.length, skillsCount: studentSkills.length, careersCount: careers.length,
          showSkills: showSkillsOnReport, showCareer: showCareerOnReport, showFees: reportCardConfig.showFeesOnReportCard,
          hasFeeRecord: hasFee, isCombined: isCombinedReport,
        });
        const scale = pickCardScale(units);

        children.push(...buildWordLogoParagraph(schoolInfo, {
          schoolNameSize: scale.nameSize, contactSize: scale.contactSize, mottoSize: scale.contactSize + 2,
          logoWidth: scale.logoSize, logoHeight: scale.logoSize,
        }));

        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: Math.round(60 * scale.spacingMul), after: Math.round(60 * scale.spacingMul) },
            children: [new TextRun({ text: 'STUDENT REPORT CARD', bold: true, size: scale.subjectSize + 2 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER, spacing: { after: Math.round(80 * scale.spacingMul) },
            children: [new TextRun({ text: `${selectedTerm} ${selectedYear} | ${selectedClass}${showStreamColumns && student.stream ? ` / ${student.stream}` : ''}`, size: scale.contactSize })],
          }),
        );

        children.push(
          new Paragraph({
            spacing: { after: Math.round(20 * scale.spacingMul) },
            children: [
              new TextRun({ text: 'Name: ', bold: true, size: scale.tableSize }), new TextRun({ text: student.name, size: scale.tableSize }),
              new TextRun({ text: '    Adm: ', bold: true, size: scale.tableSize }), new TextRun({ text: student.admNo, size: scale.tableSize }),
              new TextRun({ text: '    Class Pos: ', bold: true, size: scale.tableSize }), new TextRun({ text: String(student.classPosition), size: scale.tableSize }),
              ...(showStreamColumns ? [new TextRun({ text: '    Stream Pos: ', bold: true, size: scale.tableSize }), new TextRun({ text: String(student.streamPosition), size: scale.tableSize })] : []),
            ],
          }),
          new Paragraph({
            spacing: { after: Math.round(60 * scale.spacingMul) },
            children: [
              new TextRun({ text: 'Avg: ', bold: true, size: scale.tableSize }), new TextRun({ text: `${student.averageScore}%`, size: scale.tableSize }),
              new TextRun({ text: '    Grade: ', bold: true, size: scale.tableSize }), new TextRun({ text: student.grade, size: scale.tableSize }),
            ],
          }),
        );

        // ===== EXAM RESULTS TABLE =====
        if (isCombinedReport) {
          const headerCells1 = [
            new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, rowSpan: 2, children: [new Paragraph({ alignment: AlignmentType.LEFT, spacing: { before: Math.round(20 * scale.spacingMul), after: Math.round(20 * scale.spacingMul) }, children: [new TextRun({ text: 'Subject', bold: true, size: scale.tableSize - 2 })] })] }),
            ...examNamesList.map(examName => new TableCell({ borders: cellBorders, shading: { fill: 'E0EEFF' }, colSpan: 3, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: Math.round(20 * scale.spacingMul), after: Math.round(20 * scale.spacingMul) }, children: [new TextRun({ text: examName, bold: true, size: scale.tableSize - 2 })] })] })),
            new TableCell({ borders: cellBorders, shading: { fill: 'E0FFE0' }, colSpan: 3, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: Math.round(20 * scale.spacingMul), after: Math.round(20 * scale.spacingMul) }, children: [new TextRun({ text: 'Weighted Final', bold: true, size: scale.tableSize - 2 })] })] }),
          ];
          const headerCells2 = [
            ...examNamesList.flatMap(examName => [
              new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Score', bold: true, size: scale.tableSize - 4 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Gr', bold: true, size: scale.tableSize - 4 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Comp', bold: true, size: scale.tableSize - 4 })] })] }),
            ]),
            new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Score', bold: true, size: scale.tableSize - 4 })] })] }),
            new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Gr', bold: true, size: scale.tableSize - 4 })] })] }),
            new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Comp', bold: true, size: scale.tableSize - 4 })] })] }),
          ];

          const bodyRows = allSubjects.map(subj => {
            const finalMarks = student[subj] || 0;
            const finalGrade = getGrade(finalMarks);
            const finalComp = getCompetencyLevel(finalMarks);
            const cells = [new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: subj, size: scale.tableSize - 2 })] })] })];

            examNamesList.forEach(examName => {
              const marks = combinedExamData?.[examName]?.[student.id]?.[subj];
              const hasMarks = marks !== undefined && marks !== null && marks !== 0;
              const g = hasMarks ? getGrade(marks) : '-';
              const c = hasMarks ? getCompetencyLevel(marks) : null;
              cells.push(
                new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: hasMarks ? String(marks) : '-', size: scale.tableSize - 2 })] })] }),
                new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: g, size: scale.tableSize - 2 })] })] }),
                new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: c?.level || '-', size: scale.tableSize - 2 })] })] })
              );
            });

            cells.push(
              new TableCell({ borders: cellBorders, shading: { fill: 'F0FFF0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(finalMarks), bold: true, size: scale.tableSize - 2 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: 'F0FFF0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: finalGrade, bold: true, size: scale.tableSize - 2 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: 'F0FFF0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: finalComp.level, bold: true, size: scale.tableSize - 2 })] })] })
            );
            return new TableRow({ children: cells });
          });

          const finalTotalsCells = [new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ children: [new TextRun({ text: 'Total / Average', bold: true, size: scale.tableSize - 2 })] })] })];
          examNamesList.forEach(examName => {
            const subjectMarks = allSubjects.map(s => combinedExamData?.[examName]?.[student.id]?.[s]).filter(m => m !== undefined && m !== null && m !== 0);
            const examTotal = subjectMarks.reduce((a, b) => a + Number(b), 0);
            const examAvg = subjectMarks.length > 0 ? (examTotal / subjectMarks.length) : 0;
            finalTotalsCells.push(
              new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: examAvg ? examAvg.toFixed(1) : '-', bold: true, size: scale.tableSize - 2 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '-', size: scale.tableSize - 2 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '-', size: scale.tableSize - 2 })] })] })
            );
          });
          finalTotalsCells.push(
            new TableCell({ borders: cellBorders, shading: { fill: 'F0FFF0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${student.averageScore}%`, bold: true, size: scale.tableSize - 2 })] })] }),
            new TableCell({ borders: cellBorders, shading: { fill: 'F0FFF0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: student.grade, bold: true, size: scale.tableSize - 2 })] })] }),
            new TableCell({ borders: cellBorders, shading: { fill: 'F0FFF0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: student.competency.level, bold: true, size: scale.tableSize - 2 })] })] })
          );

          children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: headerCells1 }), new TableRow({ children: headerCells2 }), ...bodyRows, new TableRow({ children: finalTotalsCells })] }));
        } else {
          const subjectRows = [
            new TableRow({ children: ['Subject', 'Score', 'Grade', 'Comp'].map(h => new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, size: scale.tableSize - 2 })] })] })) }),
            ...allSubjects.map(subj => {
              const marks = student[subj];
              const has = marks !== undefined;
              return new TableRow({
                children: [
                  new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: subj, size: scale.tableSize - 2 })] })] }),
                  new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: has ? String(marks) : 'X', size: scale.tableSize - 2 })] })] }),
                  new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: has ? getGrade(marks) : 'X', size: scale.tableSize - 2 })] })] }),
                  new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: has ? getCompetencyLevel(marks).level : 'X', size: scale.tableSize - 2 })] })] }),
                ]
              });
            }),
            new TableRow({
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ children: [new TextRun({ text: 'Total / Average', bold: true, size: scale.tableSize - 2 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${student.totalMarks} / ${student.averageScore}%`, bold: true, size: scale.tableSize - 2 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: student.grade, bold: true, size: scale.tableSize - 2 })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: student.competency.level, bold: true, size: scale.tableSize - 2 })] })] }),
              ]
            }),
          ];
          children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: subjectRows }));
        }

        children.push(new Paragraph({ spacing: { before: Math.round(80 * scale.spacingMul) }, children: [new TextRun({ text: 'Recommendation: ', bold: true, size: scale.tableSize - 2 }), new TextRun({ text: student.recommendation, size: scale.tableSize - 2 })] }));

        if (showSkillsOnReport) {
          children.push(new Paragraph({ spacing: { before: Math.round(80 * scale.spacingMul), after: Math.round(30 * scale.spacingMul) }, children: [new TextRun({ text: 'Skills & Talents', bold: true, size: scale.tableSize })] }));
          if (studentSkills.length === 0) {
            children.push(new Paragraph({ children: [new TextRun({ text: 'No skills recorded for this student.', size: scale.tableSize - 3, italics: true })] }));
          } else {
            const skillRows = [
              new TableRow({ children: ['Category', 'Skill', 'Proficiency', 'Evidence'].map(h => new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, size: scale.tableSize - 3 })] })] })) }),
              ...studentSkills.map(sk => new TableRow({ children: [sk.category || '', sk.skill || '', sk.proficiency || '', sk.evidence || '-'].map(v => new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: String(v), size: scale.tableSize - 3 })] })] })) }))
            ];
            children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: skillRows }));
          }
        }

        if (showCareerOnReport && careers.length > 0) {
          children.push(new Paragraph({ spacing: { before: Math.round(80 * scale.spacingMul), after: Math.round(30 * scale.spacingMul) }, children: [new TextRun({ text: 'Career Insights', bold: true, size: scale.tableSize })] }));
          careers.forEach((c, i) => {
            children.push(new Paragraph({ spacing: { before: 0, after: Math.round(20 * scale.spacingMul) }, children: [new TextRun({ text: `${i + 1}. ${c.career} — `, bold: true, size: scale.tableSize - 2 }), new TextRun({ text: `${c.match}% match. `, size: scale.tableSize - 2 }), new TextRun({ text: c.rationale, size: scale.tableSize - 3, italics: true })] }));
          });
        }

        if (reportCardConfig.showFeesOnReportCard && hasFee) {
          const fee = student.feeSummary;
          children.push(new Paragraph({ spacing: { before: Math.round(80 * scale.spacingMul), after: Math.round(30 * scale.spacingMul) }, children: [new TextRun({ text: `Fee Statement — ${selectedYear}`, bold: true, size: scale.tableSize })] }));
          const balanceText = fee.balance < 0 ? `-KSh ${Math.abs(fee.balance).toLocaleString()} (credit)` : `KSh ${fee.balance.toLocaleString()}`;
          const feeRows = [
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Total Fee', bold: true, size: scale.tableSize - 3 })] })] }), new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `KSh ${fee.totalFee.toLocaleString()}`, size: scale.tableSize - 3 })] })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Paid', bold: true, size: scale.tableSize - 3 })] })] }), new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `KSh ${fee.paid.toLocaleString()}`, size: scale.tableSize - 3 })] })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ children: [new TextRun({ text: fee.balance < 0 ? 'Credit' : 'Balance', bold: true, size: scale.tableSize - 3 })] })] }), new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: balanceText, bold: true, size: scale.tableSize - 3 })] })] })] }),
          ];
          children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: feeRows }));
        }

        const ntf = nextTermFees[student.id];
        if (ntf && ntf.nextTermFee > 0) {
          children.push(
            new Paragraph({ spacing: { before: Math.round(80 * scale.spacingMul), after: Math.round(20 * scale.spacingMul) }, children: [new TextRun({ text: `Next Term Fee — ${ntf.nextTerm} ${ntf.nextYear}`, bold: true, size: scale.tableSize - 1, color: '1a365d' })] }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({ children: [new TableCell({ borders: cellBorders, shading: { fill: 'EEF6FF' }, children: [new Paragraph({ children: [new TextRun({ text: 'Term', bold: true, size: scale.tableSize - 3 })] })] }), new TableCell({ borders: cellBorders, shading: { fill: 'EEF6FF' }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${ntf.nextTerm} • ${ntf.nextYear}`, size: scale.tableSize - 3 })] })] })] }),
                new TableRow({ children: [new TableCell({ borders: cellBorders, shading: { fill: 'EEF6FF' }, children: [new Paragraph({ children: [new TextRun({ text: 'Amount Due', bold: true, size: scale.tableSize - 3 })] })] }), new TableCell({ borders: cellBorders, shading: { fill: 'EEF6FF' }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `KSh ${Number(ntf.nextTermFee).toLocaleString()}`, bold: true, size: scale.tableSize - 3 })] })] })] }),
              ],
            }),
          );
        }

        children.push(new Paragraph({ spacing: { before: Math.round(150 * scale.spacingMul) }, children: [new TextRun({ text: 'Class Teacher: __________________     Principal: __________________     Parent: __________________', size: scale.tableSize - 4 })] }));
      });

      const doc = new Document({ sections: [{ properties: { page: { size: A4_PAGE.size, margin: A4_PAGE.margin } }, children }] });
      const blob = await Packer.toBlob(doc);
      const safeName = (schoolInfo.name || 'School').replace(/[^a-z0-9]/gi, '_');
      saveAs(blob, `${safeName}_${selectedClass}_${selectedYear}_${selectedTerm}_ReportCards.docx`);
      toast.success(`Downloaded ${filteredData.length} report cards`);
    } catch (err) {
      toast.error('Failed to generate report cards: ' + err.message);
    } finally { setPrintingAll(false); }
  };

  /* ============================================================
     UI HANDLERS
     ============================================================ */
  const resetFilters = () => {
    setSelectedClass(''); setSelectedStream(''); setSelectedTerm('');
    setSelectedExamType(''); setSelectedExamName('');
    setSelectedYear(new Date().getFullYear());
    setReportType('single');
    setIsCombinedReport(false);
    setSelectedCombinedExams([]); setExamWeights({});
    setSkillsReportRows([]); setSkillsSummary({});
    toast.success('Filters reset');
  };

  const handleCombinedExamToggle = (examName) => {
    setSelectedCombinedExams(prev => {
      let next;
      if (prev.includes(examName)) next = prev.filter(e => e !== examName);
      else next = [...prev, examName];

      const equal = next.length > 0 ? parseFloat((100 / next.length).toFixed(1)) : 0;
      const newWeights = {};
      next.forEach(n => { newWeights[n] = equal; });
      if (next.length > 0) {
        const total = Object.values(newWeights).reduce((a, b) => a + b, 0);
        const diff = 100 - total;
        if (Math.abs(diff) > 0.001) newWeights[next[next.length - 1]] = parseFloat((newWeights[next[next.length - 1]] + diff).toFixed(1));
      }
      setExamWeights(newWeights);
      return next;
    });
  };

  const handleWeightChange = (examName, value) => {
    const w = parseFloat(value);
    if (!isNaN(w) && w >= 0 && w <= 100) setExamWeights(prev => ({ ...prev, [examName]: w }));
  };

  const handlePrintReportCard = (student) => {
    setSelectedStudent(student);
    setShowReportCard(true);
    if (Object.keys(skillsSummary).length === 0) loadSkillsData();
  };
  const closeReportCard = () => { setShowReportCard(false); setSelectedStudent(null); };

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <Layout title="Reports" subtitle="Generate performance reports">
      <div className={`bg-gradient-to-r from-green-600 to-blue-600 rounded-xl ${deviceInfo.isMobile ? 'p-3' : 'p-4'} mb-4 text-white`}>
        <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'items-center gap-2'}`}>
          <FiBarChart2 className={deviceInfo.isMobile ? 'w-5 h-5' : 'w-6 h-6'} />
          <div>
            <h2 className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-bold`}>Performance Reports</h2>
            <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} opacity-90`}>Instant filtering & report generation</p>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className={`bg-white rounded-xl shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-4'} mb-4`}>
        <h2 className={`${deviceInfo.isMobile ? 'text-sm' : 'text-md'} font-bold text-gray-800 mb-3 flex items-center gap-2`}>
          <FiFilter className="text-green-600" /> Select Criteria
        </h2>

        <div className={`flex flex-wrap gap-2 mb-3`}>
          {[
            { key: 'single', label: 'Single Exam' },
            { key: 'combined', label: 'Combined Exams' },
            { key: 'skills', label: 'Skills & Talents' },
          ].map(rt => (
            <button
              key={rt.key}
              onClick={() => {
                setReportType(rt.key);
                setIsCombinedReport(rt.key === 'combined');
              }}
              className={`px-3 py-1.5 rounded-lg text-sm border ${reportType === rt.key ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300'}`}
            >
              {rt.label}
            </button>
          ))}
        </div>

        <div className={`grid ${responsive.filterGrid} ${responsive.gridGap}`}>
          <div>
            <label className="block text-gray-600 text-xs mb-1">Year</label>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="input-field w-full text-sm py-1.5">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-gray-600 text-xs mb-1">Term</label>
            <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className="input-field w-full text-sm py-1.5">
              <option value="">Select</option>
              {terms.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-gray-600 text-xs mb-1">Class</label>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="input-field w-full text-sm py-1.5">
              <option value="">Select</option>
              {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {selectedClass && classHasStreams(selectedClass) && (
            <div>
              <label className="block text-gray-600 text-xs mb-1">Stream</label>
              <select value={selectedStream} onChange={(e) => setSelectedStream(e.target.value)} className="input-field w-full text-sm py-1.5">
                <option value="">Select</option>
                <option value="all">All Streams</option>
                {availableStreams.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>

        {reportType !== 'skills' && (
          <div className="mt-4 border-t pt-4">
            {!isCombinedReport ? (
              <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-2 md:grid-cols-3 gap-3'}`}>
                <div>
                  <label className="block text-gray-600 text-xs mb-1">Exam Type</label>
                  <select value={selectedExamType} onChange={(e) => setSelectedExamType(e.target.value)} className="input-field w-full text-sm py-1.5">
                    <option value="">Select Type</option>
                    {availableExamTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 text-xs mb-1">Exam Name</label>
                  <select value={selectedExamName} onChange={(e) => setSelectedExamName(e.target.value)} className="input-field w-full text-sm py-1.5" disabled={!selectedExamType}>
                    <option value="">{!selectedExamType ? 'Select type first' : 'Select exam'}</option>
                    {availableExamNames.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {availableCombinedExams.length === 0 && (
                  <p className="text-xs text-gray-500 italic">No exams found for {selectedTerm} {selectedYear}.</p>
                )}
                <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-2 md:grid-cols-3 gap-3'}`}>
                  {availableCombinedExams.map(exam => (
                    <div key={exam} className="flex items-center gap-2 p-2 border rounded-lg">
                      <input type="checkbox" checked={selectedCombinedExams.includes(exam)} onChange={() => handleCombinedExamToggle(exam)} className="w-4 h-4 text-blue-600" />
                      <span className="text-sm flex-1">{exam}</span>
                      {selectedCombinedExams.includes(exam) && (
                        <div className="flex items-center gap-1">
                          <input type="number" value={examWeights[exam] ?? 0} onChange={(e) => handleWeightChange(exam, e.target.value)} className="w-14 border rounded px-1 py-0.5 text-sm" min="0" max="100" step="1" />
                          <span className="text-xs text-gray-500">%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {selectedCombinedExams.length > 0 && (
                  <div className={`text-xs font-medium ${Math.abs(Object.values(examWeights).reduce((a, b) => a + b, 0) - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                    Total Weight: {Object.values(examWeights).reduce((a, b) => a + b, 0).toFixed(1)}% {Math.abs(Object.values(examWeights).reduce((a, b) => a + b, 0) - 100) >= 0.01 && '(must equal 100%)'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {(reportType === 'single' || reportType === 'combined') && (
          <div className="mt-3 flex flex-wrap gap-4 text-xs">
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={showSkillsOnReport} onChange={(e) => setShowSkillsOnReport(e.target.checked)} />
              Show Skills & Talents on report cards
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={showCareerOnReport} onChange={(e) => setShowCareerOnReport(e.target.checked)} />
              Show Career Insights on report cards
            </label>
          </div>
        )}

        <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'gap-2'} mt-4`}>
          {reportType === 'skills' && (
            <button
              onClick={loadSkillsReport}
              disabled={loading || !selectedClass || !selectedTerm}
              className="btn-primary flex items-center justify-center gap-1 text-sm py-1.5 px-3"
            >
              <FiBarChart2 className="w-4 h-4" /> {loading ? 'Loading...' : 'Generate Skills Report'}
            </button>
          )}
          <button onClick={resetFilters} className="bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm py-1.5 px-3">Reset</button>
          <button onClick={loadAllData} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-1 text-sm py-1.5 px-3">
            <FiRefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {/* SKILLS REPORT */}
      {reportType === 'skills' && skillsReportRows.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-3">
          <div className="px-3 py-2 border-b bg-gray-50 flex justify-between items-center flex-wrap gap-2">
            <h3 className="text-sm font-bold">SKILLS & TALENTS REPORT — {skillsReportRows.length} records</h3>
            <div className="flex gap-2">
              <button onClick={downloadSkillsExcel} className="bg-green-600 text-white rounded px-2 py-1 text-xs flex items-center gap-1"><FiDownload className="w-3 h-3" /> Excel</button>
              <button onClick={downloadSkillsWord} className="bg-blue-600 text-white rounded px-2 py-1 text-xs flex items-center gap-1"><FiFileText className="w-3 h-3" /> Word</button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs min-w-[900px]">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-2 py-1 text-left">Student</th>
                  <th className="px-2 py-1 text-left">Adm</th>
                  <th className="px-2 py-1 text-left">Category</th>
                  <th className="px-2 py-1 text-left">Skill</th>
                  <th className="px-2 py-1 text-left">Proficiency</th>
                  <th className="px-2 py-1 text-left">Evidence</th>
                  <th className="px-2 py-1 text-left">Recorded By</th>
                  <th className="px-2 py-1 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {skillsReportRows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-2 py-1 font-medium">{r.student}</td>
                    <td className="px-2 py-1 text-gray-600">{r.admNo}</td>
                    <td className="px-2 py-1">{r.category}</td>
                    <td className="px-2 py-1">{r.skill}</td>
                    <td className="px-2 py-1">{r.proficiency}</td>
                    <td className="px-2 py-1 text-gray-600">{r.evidence}</td>
                    <td className="px-2 py-1 text-gray-600">{r.recordedBy}</td>
                    <td className="px-2 py-1 text-gray-600">{r.date ? new Date(r.date).toLocaleDateString() : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RESULTS TABLE (INSTANT) */}
      {reportType !== 'skills' && filteredData.length > 0 && analysisStats && (
        <>
          <div className={`bg-gradient-to-r from-green-600 to-blue-600 rounded-lg ${deviceInfo.isMobile ? 'p-2' : 'p-3'} mb-3 text-white`}>
            <h2 className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-bold`}>{schoolInfo.name || 'School Name'}</h2>
            <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} font-semibold mt-1`}>
              Exam: {isCombinedReport ? `Combined (${selectedCombinedExams.join(' + ')})` : (selectedExamName || 'N/A')}
            </p>
            <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} opacity-90`}>
              {selectedClass}{showStreamColumns && selectedStream && selectedStream !== 'all' ? ` / ${selectedStream}` : ''} | Year: {selectedYear} | Term: {selectedTerm}
            </p>
          </div>

          <div className={`grid ${responsive.statsGrid} ${deviceInfo.isMobile ? 'gap-1' : 'gap-2'} mb-3`}>
            {[
              { label: 'Students', value: analysisStats.totalStudents, color: 'text-blue-600' },
              { label: 'Complete', value: analysisStats.completeCount, color: 'text-green-600' },
              { label: 'Missing', value: analysisStats.incompleteCount, color: 'text-red-600' },
              { label: 'Class Avg', value: `${analysisStats.classAverage}%`, color: 'text-green-600' },
              { label: 'Pass Rate', value: `${analysisStats.passRate}%`, color: 'text-yellow-600' },
              { label: 'Mean Dev', value: analysisStats.meanDeviation, color: 'text-purple-600' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-2 text-center">
                <p className="text-gray-500 text-[10px]">{stat.label}</p>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden mb-3">
            <div className="px-2 py-1.5 border-b bg-gray-50 flex justify-between items-center flex-wrap gap-2">
              <h3 className="text-xs font-bold">RESULTS TABLE</h3>
              <div className="flex gap-1 flex-wrap">
                <button onClick={downloadExcel} className="bg-green-600 text-white rounded px-2 py-0.5 text-[10px] flex items-center gap-0.5"><FiDownload className="w-3 h-3" /> Excel</button>
                <button onClick={generateWordDocument} className="bg-blue-600 text-white rounded px-2 py-0.5 text-[10px] flex items-center gap-0.5"><FiFileText className="w-3 h-3" /> Word</button>
                <button onClick={generateAllReportCards} disabled={printingAll} className={`bg-purple-600 text-white rounded px-2 py-0.5 text-[10px] flex items-center gap-0.5 ${printingAll ? 'opacity-60' : 'hover:bg-purple-700'}`}>
                  <FiPrinter className="w-3 h-3" /> {printingAll ? 'Printing...' : 'Print All Cards'}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-[11px] min-w-[900px]">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-1 py-1 text-center">Pos</th>
                    {showStreamColumns && <th className="px-1 py-1 text-center">Str Pos</th>}
                    <th className="px-1 py-1 text-left">Name</th>
                    <th className="px-1 py-1 text-left">Adm</th>
                    {showStreamColumns && <th className="px-1 py-1 text-left">Str</th>}
                    {allSubjects.map(subj => <th key={subj} className="px-1 py-1 text-center" title={subj}>{subj.substring(0, 4)}</th>)}
                    <th className="px-1 py-1 text-center bg-blue-50">Tot</th>
                    <th className="px-1 py-1 text-center bg-green-50">Avg%</th>
                    <th className="px-1 py-1 text-center">Gr</th>
                    <th className="px-1 py-1 text-center">Comp</th>
                    <th className="px-1 py-1 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredData.map((s, idx) => {
                    const rankBg = s.classPosition === 1 ? 'bg-yellow-50' : s.classPosition === 2 ? 'bg-gray-50' : s.classPosition === 3 ? 'bg-orange-50' : '';
                    return (
                      <tr key={idx} className={`${rankBg} ${s.hasMissingMarks ? 'opacity-75' : ''} hover:bg-gray-50`}>
                        <td className="px-1 py-1 text-center font-bold">{s.classPosition}</td>
                        {showStreamColumns && <td className="px-1 py-1 text-center font-bold text-blue-600">{s.streamPosition}</td>}
                        <td className="px-1 py-1 font-medium truncate max-w-[120px]">{s.name}</td>
                        <td className="px-1 py-1 text-gray-600">{s.admNo}</td>
                        {showStreamColumns && <td className="px-1 py-1">{s.stream?.charAt(0) || '-'}</td>}
                        {allSubjects.map(subj => {
                          const marks = s[subj];
                          const markClass = marks === undefined ? 'text-red-400' :
                            marks >= 80 ? 'text-purple-600 font-bold' :
                            marks >= 60 ? 'text-green-600 font-bold' :
                            marks >= 40 ? 'text-blue-600' : 'text-red-600';
                          return <td key={subj} className={`px-1 py-1 text-center ${markClass}`}>{marks !== undefined ? marks : 'X'}</td>;
                        })}
                        <td className="px-1 py-1 text-center font-bold text-blue-600 bg-blue-50">{s.totalMarks}</td>
                        <td className="px-1 py-1 text-center font-bold text-green-600 bg-green-50">{s.averageScore}</td>
                        <td className="px-1 py-1 text-center font-bold">{s.grade}</td>
                        <td className="px-1 py-1 text-center font-bold" style={{ color: s.competency?.color || '#333' }}>{s.competency?.level || 'N/A'}</td>
                        <td className="px-1 py-1 text-center">
                          <button onClick={() => handlePrintReportCard(s)} className="bg-blue-500 text-white rounded hover:bg-blue-600 px-2 py-0.5 text-[9px]">Print</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {showStreamColumns && streamAnalysis.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden mb-3">
              <div className="px-3 py-2 border-b bg-gradient-to-r from-blue-50 to-green-50">
                <h3 className="text-sm font-bold text-gray-800">STREAM ANALYSIS (Best → Lowest)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[700px]">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-1 text-left">Stream</th>
                      <th className="px-2 py-1 text-center">Students</th>
                      <th className="px-2 py-1 text-center">Mean</th>
                      <th className="px-2 py-1 text-center">Grade</th>
                      {allSubjects.map(subj => <th key={subj} className="px-2 py-1 text-center" title={subj}>{subj.substring(0, 4)}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {streamAnalysis.map((sa, i) => (
                      <tr key={i} className={i === 0 ? 'bg-yellow-50' : ''}>
                        <td className="px-2 py-1 font-medium">{sa.stream}</td>
                        <td className="px-2 py-1 text-center">{sa.count}</td>
                        <td className="px-2 py-1 text-center font-bold text-green-700">{sa.mean}</td>
                        <td className="px-2 py-1 text-center font-bold">{sa.grade}</td>
                        {allSubjects.map(subj => (
                          <td key={subj} className="px-2 py-1 text-center text-blue-700">{sa.subjectMeans[subj] || 0}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {reportType !== 'skills' && (!selectedClass || !selectedTerm || (!isCombinedReport && (!selectedExamType || !selectedExamName)) || (isCombinedReport && selectedCombinedExams.length === 0)) && (
         <div className="bg-blue-50 rounded-xl p-8 text-center border border-blue-100">
           <FiBarChart2 className="w-12 h-12 text-blue-400 mx-auto mb-3" />
           <p className="text-gray-600">Select the criteria above to instantly view and print the class report.</p>
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
          skills={skillsSummary[String(selectedStudent.id)] || []}
          careerInsights={careerInsights[selectedStudent.id] || []}
          showSkillsOnReport={showSkillsOnReport}
          showCareerOnReport={showCareerOnReport}
          showFeesOnReportCard={reportCardConfig.showFeesOnReportCard}
          classHasAnySkills={Object.values(skillsSummary).some(a => a.length > 0)}
          nextTermFee={nextTermFees[selectedStudent.id] || null}
        />
      )}
    </Layout>
  );
};

export default Reports;