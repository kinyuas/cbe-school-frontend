// src/components/admin/ClassPerformance.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from '../common/Layout';
import {
  FiFilter, FiDownload, FiBarChart2, FiBookOpen,
  FiFileText, FiUsers, FiAward, FiAlertCircle,
  FiRefreshCw, FiCheckCircle, FiInfo, FiActivity
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle,
  ImageRun, VerticalAlign,
} from 'docx';
import { saveAs } from 'file-saver';
import ReportCard from '../admin/ReportCard';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDeviceDetection, useResponsiveClasses } from '../../hooks/useDeviceDetection';

/* ============================================================
   Constants (unchanged)
   ============================================================ */
const CLASS_ORDER = [
  'Play Group', 'Pre-Primary 1', 'Pre-Primary 2',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
];

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
  'Beginner': 0.3, 'Developing': 0.5, 'Proficient': 0.7, 'Advanced': 1.0, 'Exceptional': 1.3,
};

const normalizeSubjectName = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '').trim();
const getSkillName = (s) => (s?.skill || s?.skillName || '').trim();

const getClassOrder = (className) => {
  const i = CLASS_ORDER.indexOf(className);
  return i !== -1 ? i : 999;
};
const sortClassesByOrder = (classes) => [...classes].sort((a, b) => getClassOrder(a) - getClassOrder(b));

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

/* ============================================================
   Word header builder (unchanged)
   ============================================================ */
const buildWordLogoParagraph = (schoolInfo = {}, opts = {}) => {
  const { schoolNameSize = 28, contactSize = 16, mottoSize = 18, logoWidth = 80, logoHeight = 80 } = opts;
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
        alignment: AlignmentType.LEFT, spacing: { before: 0, after: 0 },
        children: [new ImageRun({ type: imageType, data: bytes, transformation: { width: logoWidth, height: logoHeight } })],
      }));
    } catch (e) { console.warn('Logo embed failed:', e.message); }
  }
  if (logoChildren.length === 0) logoChildren.push(new Paragraph({ children: [new TextRun({ text: '', size: 2 })] }));

  const infoChildren = [];
  infoChildren.push(new Paragraph({
    alignment: AlignmentType.LEFT, spacing: { before: 0, after: 40 },
    children: [new TextRun({ text: schoolName, bold: true, size: schoolNameSize, color: '1a365d' })],
  }));
  if (motto) infoChildren.push(new Paragraph({
    alignment: AlignmentType.LEFT, spacing: { before: 0, after: 40 },
    children: [new TextRun({ text: `"${motto}"`, italics: true, size: mottoSize, color: '6b7280' })],
  }));
  if (address) infoChildren.push(new Paragraph({
    alignment: AlignmentType.LEFT, spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: address, size: contactSize, color: '4b5563' })],
  }));
  const contactLine = [phone, email].filter(Boolean).join(' · ');
  if (contactLine) infoChildren.push(new Paragraph({
    alignment: AlignmentType.LEFT, spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: contactLine, size: contactSize, color: '4b5563' })],
  }));

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder };

  const innerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders, alignment: AlignmentType.CENTER,
    rows: [new TableRow({
      children: [
        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: noBorders, verticalAlign: VerticalAlign.CENTER, margins: { top: 0, bottom: 0, left: 0, right: 200 }, children: logoChildren }),
        new TableCell({ width: { size: 75, type: WidthType.PERCENTAGE }, borders: noBorders, verticalAlign: VerticalAlign.CENTER, margins: { top: 0, bottom: 0, left: 0, right: 0 }, children: infoChildren }),
      ],
    })],
  });
  const outerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBorders, alignment: AlignmentType.CENTER,
    rows: [new TableRow({
      children: [
        new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, borders: noBorders, children: [new Paragraph({ children: [new TextRun({ text: '', size: 2 })] })] }),
        new TableCell({ width: { size: 64, type: WidthType.PERCENTAGE }, borders: noBorders, verticalAlign: VerticalAlign.CENTER, children: [innerTable] }),
        new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, borders: noBorders, children: [new Paragraph({ children: [new TextRun({ text: '', size: 2 })] })] }),
      ],
    })],
  });
  return [outerTable];
};

const A4_PAGE = {
  size: { width: 11906, height: 16838 },
  margin: { top: 720, right: 720, bottom: 720, left: 720 },
};

/* ============================================================
   Fetchers
   ============================================================ */
const fetchConfig = async () => {
  const [schoolRes, studentsRes, examsRes, teachersRes] = await Promise.all([
    api.get('/school/settings').catch(() => ({ data: {} })),
    api.get('/pupils').catch(() => ({ data: { data: [] } })),
    api.get('/exams').catch(() => ({ data: { data: [] } })),
    api.get('/teachers').catch(() => ({ data: { data: [] } })),
  ]);

  let schoolFromApi = schoolRes.data?.data || null;
  if (!schoolFromApi) {
    try {
      const stored = localStorage.getItem('schoolInfo');
      if (stored) schoolFromApi = JSON.parse(stored);
    } catch { /* ignore */ }
  }
  const normalized = schoolFromApi
    ? {
        ...schoolFromApi,
        name: schoolFromApi.schoolName || schoolFromApi.name || '',
        phone: schoolFromApi.phoneNumber || schoolFromApi.phone || '',
        email: schoolFromApi.schoolEmail || schoolFromApi.email || '',
        poBox: schoolFromApi.poBox || schoolFromApi.address || '',
        schoolLogo: schoolFromApi.schoolLogo || schoolFromApi.logo || '',
      }
    : null;

  if (normalized) {
    try { localStorage.setItem('schoolInfo', JSON.stringify(normalized)); } catch { /* ignore */ }
  }

  return {
    schoolInfo: normalized,
    students: studentsRes.data?.data || [],
    exams: examsRes.data?.data || [],
    teachers: teachersRes.data?.data || [],
  };
};

/* ============================================================
   Component
   ============================================================ */
const ClassPerformance = () => {
  const deviceInfo = useDeviceDetection();
  const responsive = useResponsiveClasses(deviceInfo);
  const queryClient = useQueryClient();

  const { user } = useAuth();
  const teacherId = user?._id || user?.id || user?.teacherId;
  const teacherName = user?.name || user?.username || '';

  const [userRole] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      return stored.role || null;
    } catch { return null; }
  });

  const { isLowEnd, networkType } = deviceInfo;
  const slowNet = isLowEnd && ['slow-2g', '2g'].includes(networkType);

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('my-class');

  /* ---------- Config query ---------- */
  const {
    data: config,
    isLoading: configLoading,
    isError: configError,
  } = useQuery({
    queryKey: ['admin', 'class-performance-config'],
    queryFn: fetchConfig,
    staleTime: 5 * 60 * 1000,
    enabled: !slowNet,
    placeholderData: (prev) => prev, 
  });

  const schoolInfo = config?.schoolInfo || { name: '', classes: [], streams: [] };
  const students = config?.students || [];
  const exams = config?.exams || [];
  const teachers = config?.teachers || [];

  const teacherProfile = useMemo(() => {
    if (userRole === 'admin' || !user?.email) return null;
    return teachers.find(t => t.email === user.email) || null;
  }, [teachers, userRole, user?.email]);

  const displayExamResult = useMemo(() => getCurrentDisplayExam(exams), [exams]);
  const displayExam = displayExamResult.exam;
  const displayExamStatus = displayExamResult.status;

  const availableClasses = useMemo(() => {
    const active = (schoolInfo.classes || []).filter(c => c.isActive !== false).map(c => c.name);
    return sortClassesByOrder(active);
  }, [schoolInfo]);

  const availableExamTypes = useMemo(
    () => [...new Set(exams.map(e => e.type).filter(Boolean))],
    [exams]
  );

  /* ---------- Class-report bundle (only class-report, subject perf removed) ---------- */
  const examKey = displayExam
    ? `${displayExam.title}|${displayExam.type}|${displayExam.term}|${displayExam.year}`
    : 'none';

  const {
    data: classReportBundle,
    isLoading: classReportLoading,
  } = useQuery({
    queryKey: [
      'admin', 'class-report-bundle',
      teacherId, teacherName, examKey,
      teacherProfile?.classAssigned || '',
      teacherProfile?.streamAssigned || '',
    ],
    queryFn: async () => {
      if (!displayExam || !teacherProfile?.classAssigned) return null;

      let classData = null;
      const classRes = await api.get('/reports/class-report', {
        params: {
          className: teacherProfile.classAssigned,
          stream: teacherProfile.streamAssigned || undefined,
          examName: displayExam.title, examType: displayExam.type,
          term: displayExam.term, year: displayExam.year,
        },
      }).catch(() => ({ data: { data: null } }));

      classData = classRes.data?.data;

      if (!classData || !classData.students || classData.students.length === 0) {
        const fbClassRes = await api.get('/results', {
          params: {
            class: teacherProfile.classAssigned,
            stream: teacherProfile.streamAssigned || undefined,
            examName: displayExam.title, examType: displayExam.type,
            term: displayExam.term, year: displayExam.year,
          },
        }).catch(() => ({ data: { data: [] } }));

        const rawResults = fbClassRes.data?.data || [];
        if (rawResults.length > 0) {
          const subjectsSet = new Set();
          const studentMap = new Map();
          rawResults.forEach(r => {
            const pid = String(r.pupilId?._id || r.pupilId);
            const pupil = students.find(p => String(p._id) === pid);
            if (!pupil) return;
            const marks = parseFloat(r.marks ?? r.score ?? 0);
            if (isNaN(marks)) return;
            if (!studentMap.has(pid)) {
              studentMap.set(pid, {
                id: pid, name: pupil.name, admNo: pupil.admNo, stream: pupil.stream || '',
                subjectMarks: {}, totalMarks: 0, subjectsWithMarks: 0,
              });
            }
            const s = studentMap.get(pid);
            const prev = s.subjectMarks[r.subject];
            if (prev === undefined || marks > prev) {
              if (prev === undefined) { s.totalMarks += marks; s.subjectsWithMarks += 1; }
              else { s.totalMarks += (marks - prev); }
              s.subjectMarks[r.subject] = marks;
            }
            subjectsSet.add(r.subject);
          });
          classData = {
            subjects: [...subjectsSet],
            students: Array.from(studentMap.values()).map(s => ({
              ...s,
              averageScore: subjectsSet.size > 0 ? Math.round(s.totalMarks / subjectsSet.size) : 0,
            })),
          };
        }
      }

      return classData;
    },
    enabled: !slowNet && !!displayExam && !!teacherProfile?.classAssigned,
    staleTime: 60_000,
  });

  const classData = classReportBundle || null;

  /* ---------- Skills query (does not block paint) ---------- */
  const skillsParams = useMemo(() => {
    if (!teacherProfile?.classAssigned || !displayExam) return null;
    return {
      class: teacherProfile.classAssigned,
      stream: teacherProfile.streamAssigned || undefined,
      year: displayExam.year,
      term: displayExam.term,
    };
  }, [teacherProfile, displayExam]);

  const { data: skillsRaw = [] } = useQuery({
    queryKey: ['admin', 'class-performance-skills', skillsParams],
    queryFn: async () => {
      const res = await api.get('/skills', { params: skillsParams });
      return res.data?.data || [];
    },
    enabled: !slowNet && !!skillsParams,
    staleTime: 60_000,
  });

  const skillsSummary = useMemo(() => {
    const map = {};
    skillsRaw.forEach(row => {
      const sid = row.pupilId?._id || row.pupilId;
      if (!sid) return;
      if (!map[sid]) map[sid] = [];
      map[sid].push(row);
    });
    return map;
  }, [skillsRaw]);

  /* ---------- Competency / grade helpers ---------- */
  const competencyLevels = useMemo(() => [
    { level: 'EE', minScore: 80, maxScore: 100, color: '#9b59b6', description: 'Exceeding Expectation' },
    { level: 'ME', minScore: 60, maxScore: 79, color: '#27ae60', description: 'Meeting Expectation' },
    { level: 'AE', minScore: 40, maxScore: 59, color: '#3498db', description: 'Approaching Expectation' },
    { level: 'BE', minScore: 20, maxScore: 39, color: '#f1c40f', description: 'Below Expectation' },
    { level: 'WBE', minScore: 0, maxScore: 19, color: '#e74c3c', description: 'Well Below Expectation' },
  ], []);

  const getCompetencyFromMarks = useCallback((marks) => {
    if (marks === null || marks === undefined) return null;
    const score = parseFloat(marks);
    if (isNaN(score)) return null;
    return competencyLevels.find(l => score >= l.minScore && score <= l.maxScore);
  }, [competencyLevels]);

  const getGradeFromMarks = useCallback((marks) => {
    if (marks >= 80) return 'A'; if (marks >= 75) return 'A-';
    if (marks >= 70) return 'B+'; if (marks >= 65) return 'B';
    if (marks >= 60) return 'B-'; if (marks >= 55) return 'C+';
    if (marks >= 50) return 'C'; if (marks >= 45) return 'C-';
    if (marks >= 40) return 'D+'; if (marks >= 35) return 'D';
    if (marks >= 30) return 'D-'; return 'E';
  }, []);

  const getRecommendation = useCallback((avg) => {
    if (avg >= 80) return 'Excellent mastery. Continue challenging with advanced tasks.';
    if (avg >= 60) return 'Good understanding. Maintain and encourage more challenging tasks.';
    if (avg >= 40) return 'Approaching expectation. Provide extra practice and support.';
    if (avg >= 20) return 'Below expectation. Implement remedial support.';
    return 'Well below expectation. Immediate intensive intervention needed.';
  }, []);

  const getRemarksFromMarks = useCallback((marks) => {
    if (marks >= 80) return 'Excellent';
    if (marks >= 60) return 'Good';
    if (marks >= 50) return 'Average';
    if (marks >= 40) return 'Satisfactory';
    return 'Needs Improvement';
  }, []);

  /* ---------- Build class report (verbatim algorithm) ---------- */
  const { classReportData, classReportStats, classReportExam, allSubjectsInReport, streamAnalysis } = useMemo(() => {
    if (!classData || !classData.students || classData.students.length === 0 || !displayExam || !teacherProfile?.classAssigned) {
      return { classReportData: [], classReportStats: null, classReportExam: displayExam || null, allSubjectsInReport: [], streamAnalysis: [] };
    }

    const subjects = classData.subjects || [];
    const totalSubjects = subjects.length;

    let performance = (classData.students || []).map(s => {
      const hasMissing = s.subjectsWithMarks < totalSubjects;
      const averageScore = totalSubjects > 0 ? Math.round(s.totalMarks / totalSubjects) : 0;
      const comp = getCompetencyFromMarks(averageScore);
      return {
        ...s, averageScore, hasMissingMarks: hasMissing,
        grade: hasMissing ? 'X' : getGradeFromMarks(averageScore),
        competency: comp || competencyLevels[4],
        recommendation: getRecommendation(averageScore),
      };
    });

    const complete = performance.filter(s => !s.hasMissingMarks);
    const sortedComplete = [...complete].sort((a, b) => b.totalMarks - a.totalMarks);
    let rank = 1;
    sortedComplete.forEach((st, idx) => {
      if (idx > 0 && st.totalMarks === sortedComplete[idx - 1].totalMarks) {
        st.classPosition = sortedComplete[idx - 1].classPosition;
      } else {
        st.classPosition = rank;
      }
      rank++;
    });
    const incomplete = performance.filter(s => s.hasMissingMarks).sort((a, b) => b.totalMarks - a.totalMarks);
    incomplete.forEach(s => { s.classPosition = 'X'; });
    performance = [...sortedComplete, ...incomplete];

    const classAvg = complete.length > 0
      ? Math.round(complete.reduce((sum, s) => sum + s.averageScore, 0) / complete.length)
      : 0;
    const passRate = complete.length > 0
      ? Math.round(complete.filter(s => s.averageScore >= 40).length / complete.length * 100)
      : 0;

    const stats = {
      classAverage: classAvg,
      totalStudents: performance.length,
      completeCount: complete.length,
      incompleteCount: incomplete.length,
      passRate,
      examName: displayExam.title, term: displayExam.term, year: displayExam.year,
    };

    let streams = [];
    if (teacherProfile?.streamAssigned || performance.some(s => s.stream)) {
      const streamMap = {};
      performance.forEach(s => {
        const st = s.stream || 'No Stream';
        if (!streamMap[st]) streamMap[st] = { stream: st, students: [] };
        streamMap[st].students.push(s);
      });
      streams = Object.values(streamMap).map(({ stream, students }) => {
        const validAverages = students.map(s => s.averageScore).filter(v => typeof v === 'number' && !isNaN(v));
        const mean = validAverages.length
          ? Math.round(validAverages.reduce((a, b) => a + b, 0) / validAverages.length)
          : 0;
        const subjectMeans = {};
        subjects.forEach(subj => {
          const arr = students.map(s => s.subjectMarks[subj]).filter(v => typeof v === 'number');
          subjectMeans[subj] = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
        });
        return {
          stream, count: students.length,
          completeCount: students.filter(s => !s.hasMissingMarks).length,
          mean, grade: getGradeFromMarks(mean),
          competency: getCompetencyFromMarks(mean),
          subjectMeans,
        };
      });
      streams.sort((a, b) => b.mean - a.mean);
    }

    return {
      classReportData: performance,
      classReportStats: stats,
      classReportExam: displayExam,
      allSubjectsInReport: subjects,
      streamAnalysis: streams,
    };
  }, [classData, displayExam, teacherProfile, competencyLevels, getCompetencyFromMarks, getGradeFromMarks, getRecommendation]);

  /* ---------- Career insights (verbatim) ---------- */
  const buildCareerInsights = useCallback((student, studentSkills = []) => {
    const subjectEntries = allSubjectsInReport
      .map(subj => ({ name: subj, score: student.subjectMarks?.[subj] }))
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
          subjScore += sc; subjCount++;
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
        match: Math.round(finalScore * 10) / 10,
        academicScore: Math.round(academicScore),
        skillBoost: Math.round(skillBoost),
        matchedSubjects, matchedSkillsForField,
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
      if (c.coveragePercent < 100 && c.matchedSubjects.length > 0) {
        parts.push(`(${c.coveragePercent}% subjects)`);
      }
      const rationale = parts.length > 0 ? parts.join(' • ') : 'Matches overall performance';
      return { ...c, rationale };
    });
  }, [allSubjectsInReport]);

  const careerInsights = useMemo(() => {
    if (!classReportData.length) return {};
    const map = {};
    classReportData.forEach(s => {
      const studentSkills = skillsSummary[String(s.id)] || [];
      map[s.id] = buildCareerInsights(s, studentSkills);
    });
    return map;
  }, [classReportData, buildCareerInsights, skillsSummary]);

  /* ---------- UI state for Subject Analysis tab ---------- */
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('');
  const [selectedExamName, setSelectedExamName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const [showReportCard, setShowReportCard] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const terms = ['Term 1', 'Term 2', 'Term 3'];
  const years = [2023, 2024, 2025, 2026];

  useEffect(() => {
    if (teacherProfile?.classAssigned && !selectedClass) {
      setSelectedClass(teacherProfile.classAssigned);
      setSelectedStream(teacherProfile.streamAssigned || '');
    }
  }, [teacherProfile, selectedClass]);

  const availableSubjects = useMemo(() => {
    if (!selectedClass) return [];
    return SUBJECTS_BY_CLASS[selectedClass] || [];
  }, [selectedClass]);

  const availableStreams = useMemo(() => {
    if (!selectedClass) return [];
    const classData = schoolInfo.classes?.find(c => c.name === selectedClass);
    const schoolStreams = classData?.streams || [];
    const pupilStreams = [...new Set(
      students.filter(s => (s.class === selectedClass || s.grade === selectedClass) && s.stream).map(s => s.stream)
    )];
    return [...new Set([...schoolStreams, ...pupilStreams])];
  }, [selectedClass, schoolInfo, students]);

  const availableExamNames = useMemo(() => {
    if (!selectedExamType) return [];
    const filtered = exams.filter(e =>
      e.type === selectedExamType &&
      (!selectedTerm || e.term === selectedTerm) &&
      (!selectedYear || e.year === selectedYear)
    );
    return [...new Set(filtered.map(e => e.title))];
  }, [selectedExamType, selectedTerm, selectedYear, exams]);

  /* ---------- Auto-loading Subject Analysis query ---------- */
  const subjectAnalysisFiltersReady =
    !!selectedClass && !!selectedSubject && !!selectedExamType && !!selectedExamName;

  const {
    data: subjectAnalysis,
    isLoading: subjectAnalysisLoading,
    isFetching: subjectAnalysisFetching,
  } = useQuery({
    queryKey: [
      'admin', 'subject-analysis',
      selectedClass, selectedStream, selectedTerm, selectedYear,
      selectedExamType, selectedExamName, selectedSubject,
    ],
    queryFn: async () => {
      let classStudents = students.filter(s => (s.class === selectedClass || s.grade === selectedClass));
      if (selectedStream && selectedStream !== 'all' && selectedStream !== '') {
        classStudents = classStudents.filter(s => s.stream === selectedStream);
      }
      if (classStudents.length === 0) {
        return { students: [], average: 0, topStudent: null, empty: 'no-students' };
      }

      const response = await api.get('/results', {
        params: {
          class: selectedClass,
          examType: selectedExamType,
          examName: selectedExamName,
          term: selectedTerm,
          year: selectedYear,
          stream: (selectedStream && selectedStream !== 'all') ? selectedStream : undefined,
          subject: selectedSubject,
        },
      });

      const filteredResults = response.data?.data || [];
      if (filteredResults.length === 0) {
        return { students: [], average: 0, topStudent: null, empty: 'no-results' };
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
          ...student, marks,
          competencyLevel: competency ? competency.level : 'Not Assessed',
          grade: getGradeFromMarks(marks),
          remarks: getRemarksFromMarks(marks),
        };
      }).sort((a, b) => b.marks - a.marks);

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

      return { students: studentPerformance, average: avgScore, topStudent: topStudentData, empty: null };
    },
    enabled: !slowNet && subjectAnalysisFiltersReady,
    staleTime: 30_000,
  });

  const analysisStudents = subjectAnalysis?.students || [];
  const analysisAverage = subjectAnalysis?.average || 0;
  const analysisTopStudent = subjectAnalysis?.topStudent || null;
  const analysisEmpty = subjectAnalysis?.empty || null;

  const resetFilters = () => {
    setSelectedClass(teacherProfile?.classAssigned || '');
    setSelectedStream(teacherProfile?.streamAssigned || '');
    setSelectedTerm('');
    setSelectedExamType('');
    setSelectedExamName('');
    setSelectedSubject('');
    setSelectedYear(new Date().getFullYear());
    toast.success('Filters reset');
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'class-performance-config'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'class-report-bundle'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'class-performance-skills'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'subject-analysis'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  /* ---------- Excel / Word exports for Subject Analysis (reads from analysisStudents) ---------- */
  const downloadResultsExcel = () => {
    if (analysisStudents.length === 0) return toast.error('No data to download');
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
      ...analysisStudents.map(s => [
        s.name, s.admNo || 'N/A', s.stream || 'N/A',
        s.marks.toFixed(1), s.grade, s.competencyLevel, s.remarks,
      ]),
      [],
      ['Summary Statistics'],
      [`Total Students: ${analysisStudents.length}`],
      [`Class Average: ${analysisAverage.toFixed(1)}%`],
      [`Highest Score: ${Math.max(...analysisStudents.map(s => s.marks))}%`],
      [`Lowest Score: ${Math.min(...analysisStudents.map(s => s.marks))}%`],
    ];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${selectedSubject}_Performance`);
    XLSX.writeFile(wb, `${schoolInfo.name}_${selectedClass}_${streamLabel}_${selectedSubject}_${selectedExamName}_${selectedYear}.xlsx`);
    toast.success('Excel report downloaded');
  };

  const downloadResultsWord = async () => {
    if (analysisStudents.length === 0) return toast.error('No data to download');
    try {
      const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
      const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
      const streamLabel = selectedStream && selectedStream !== 'all' ? selectedStream : 'All Streams';
      const children = [];
      children.push(...buildWordLogoParagraph(schoolInfo, { schoolNameSize: 26 }));
      children.push(
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 150, after: 100 }, children: [new TextRun({ text: 'SUBJECT PERFORMANCE REPORT', bold: true, size: 24 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 150 }, children: [new TextRun({ text: selectedSubject, bold: true, size: 22 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `${selectedClass} — ${streamLabel} | Year: ${selectedYear} | Term: ${selectedTerm || 'All Terms'} | Exam: ${selectedExamName}`, size: 18 })] }),
      );

      const headerCells = ['#', 'Student Name', 'Adm No', 'Stream', 'Marks (%)', 'Grade', 'Competency', 'Remarks'].map((h, i) =>
        new TableCell({
          borders: cellBorders,
          shading: { fill: i === 4 ? 'E0EEFF' : i === 6 ? 'E0FFE0' : 'F0F0F0' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, size: 18 })] })],
        })
      );
      const tableHeader = new TableRow({ children: headerCells });
      const bodyRows = analysisStudents.map((s, idx) => new TableRow({
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

      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [tableHeader, ...bodyRows] }));
      children.push(
        new Paragraph({ spacing: { before: 300 }, children: [] }),
        new Paragraph({ children: [new TextRun({ text: 'SUMMARY', bold: true, size: 22 })] }),
        new Paragraph({ children: [new TextRun({ text: `Total Students: ${analysisStudents.length}`, size: 18 })] }),
        new Paragraph({ children: [new TextRun({ text: `Class Average: ${analysisAverage.toFixed(1)}%`, size: 18 })] }),
        new Paragraph({ children: [new TextRun({ text: `Highest Score: ${Math.max(...analysisStudents.map(s => s.marks)).toFixed(1)}%`, size: 18 })] }),
        new Paragraph({ children: [new TextRun({ text: `Lowest Score: ${Math.min(...analysisStudents.map(s => s.marks)).toFixed(1)}%`, size: 18 })] }),
        new Paragraph({ spacing: { before: 300 }, children: [] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Generated on ${new Date().toLocaleString()}`, size: 16, italics: true })] }),
      );

      const doc = new Document({ sections: [{ properties: { page: { size: A4_PAGE.size, margin: A4_PAGE.margin } }, children }] });
      const blob = await Packer.toBlob(doc);
      const safeName = (schoolInfo.name || 'School').replace(/[^a-z0-9]/gi, '_');
      const safeSubject = selectedSubject.replace(/[^a-z0-9]/gi, '_');
      saveAs(blob, `${safeName}_${selectedClass}_${streamLabel}_${safeSubject}_${selectedYear}.docx`);
      toast.success('Word report downloaded');
    } catch (error) {
      console.error('Word error:', error);
      toast.error('Failed: ' + error.message);
    }
  };

  /* ---------- Full-class Excel / Word (unchanged, uses classReportData) ---------- */
  const downloadFullClassExcel = () => {
    if (!classReportData.length) return toast.error('No data');
    const headers = [
      '#', 'Name', 'Adm',
      ...allSubjectsInReport.map(s => s.substring(0, 4).toUpperCase()),
      'Tot', 'Avg%', 'Gr', 'Comp',
    ];
    const rows = classReportData.map(s => [
      s.classPosition, s.name, s.admNo,
      ...allSubjectsInReport.map(subj => s.subjectMarks[subj] !== undefined ? s.subjectMarks[subj] : 'X'),
      s.totalMarks, s.averageScore, s.grade, s.competency?.level || 'N/A',
    ]);
    const wsData = [
      [schoolInfo.name || 'School'],
      [`Full Class Results - ${teacherProfile?.classAssigned}${teacherProfile?.streamAssigned ? ` / ${teacherProfile.streamAssigned}` : ''}`],
      [`Exam: ${classReportExam?.title || 'N/A'} | Term: ${classReportExam?.term || 'N/A'} | Year: ${classReportExam?.year || 'N/A'}`],
      [], headers, ...rows,
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, `${schoolInfo.name}_${teacherProfile?.classAssigned}_${classReportExam?.title}_Results.xlsx`);
    toast.success('Class Excel downloaded');
  };

  const downloadFullClassWord = async () => {
    if (!classReportData.length) return toast.error('No data');
    try {
      const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
      const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
      const children = [];
      children.push(...buildWordLogoParagraph(schoolInfo, { schoolNameSize: 30 }));
      children.push(
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 100 }, children: [new TextRun({ text: 'CLASS EXAM RESULTS', bold: true, size: 26 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `${teacherProfile?.classAssigned}${teacherProfile?.streamAssigned ? ` ${teacherProfile.streamAssigned}` : ''} | Year: ${classReportExam?.year} | Term: ${classReportExam?.term}`, size: 20 })] }),
      );

      const baseHeaders = [
        new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '#', bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ children: [new TextRun({ text: 'Name', bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Adm', bold: true, size: 18 })] })] }),
      ];
      const showStreamCol = !!teacherProfile?.streamAssigned || classReportData.some(s => s.stream);
      if (showStreamCol) {
        baseHeaders.push(new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Str', bold: true, size: 18 })] })] }));
      }

      const headerCells = [
        ...baseHeaders,
        ...allSubjectsInReport.map(subj => new TableCell({
          borders: cellBorders, shading: { fill: 'F0F0F0' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: subj.substring(0, 4).toUpperCase(), bold: true, size: 18 })] })],
        })),
        new TableCell({ borders: cellBorders, shading: { fill: 'E0EEFF' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tot', bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'E0FFE0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Avg%', bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Gr', bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'F0F0F0' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Comp', bold: true, size: 18 })] })] }),
      ];
      const tableHeader = new TableRow({ children: headerCells });

      const bodyRows = classReportData.map(s => {
        const cells = [
          new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(s.classPosition), size: 18 })] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: s.name, size: 18 })] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.admNo, size: 18 })] })] }),
        ];
        if (showStreamCol) cells.push(new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.stream || '-', size: 18 })] })] }));
        allSubjectsInReport.forEach(subj => {
          const m = s.subjectMarks[subj];
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

      const subjectAverages = {};
      allSubjectsInReport.forEach(subj => {
        const arr = classReportData.map(s => s.subjectMarks[subj]).filter(v => typeof v === 'number');
        subjectAverages[subj] = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
      });
      const avgTotal = Math.round(classReportData.reduce((sum, s) => sum + s.totalMarks, 0) / classReportData.length);
      const averagesCells = [
        new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, columnSpan: showStreamCol ? 4 : 3, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'AVERAGE', bold: true, size: 18 })] })] }),
        ...allSubjectsInReport.map(subj => new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(subjectAverages[subj] || 0), bold: true, size: 18 })] })] })),
        new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(avgTotal), bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${classReportStats?.classAverage || 0}%`, bold: true, size: 18 })] })] }),
        new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, columnSpan: 2, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '-', size: 18 })] })] }),
      ];

      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [tableHeader, ...bodyRows, new TableRow({ children: averagesCells })],
      }));

      if (showStreamCol && streamAnalysis.length > 0) {
        children.push(
          new Paragraph({ spacing: { before: 400 }, children: [] }),
          new Paragraph({ children: [new TextRun({ text: 'STREAM ANALYSIS (Best → Lowest)', bold: true, size: 22 })] }),
        );
        const sHeaders = ['Stream', 'Students', 'Mean', 'Grade', ...allSubjectsInReport.map(s => s.substring(0, 4).toUpperCase())];
        const sHeaderRow = new TableRow({
          children: sHeaders.map(h => new TableCell({ borders: cellBorders, shading: { fill: 'E0EEFF' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, size: 18 })] })] })),
        });
        const sBodyRows = streamAnalysis.map(sa => new TableRow({
          children: [
            new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: sa.stream, size: 18 })] })] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(sa.count), size: 18 })] })] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(sa.mean), bold: true, size: 18 })] })] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: sa.grade, bold: true, size: 18 })] })] }),
            ...allSubjectsInReport.map(subj => new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(sa.subjectMeans[subj] || 0), size: 18 })] })] })),
          ],
        }));
        children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [sHeaderRow, ...sBodyRows] }));
      }

      children.push(
        new Paragraph({ spacing: { before: 300 }, children: [] }),
        new Paragraph({ children: [new TextRun({ text: 'SUMMARY', bold: true, size: 22 })] }),
        new Paragraph({ children: [new TextRun({ text: `Total Students: ${classReportStats?.totalStudents || 0} (Complete: ${classReportStats?.completeCount || 0}, Missing: ${classReportStats?.incompleteCount || 0})`, size: 20 })] }),
        new Paragraph({ children: [new TextRun({ text: `Class Average: ${classReportStats?.classAverage || 0}%`, size: 20 })] }),
        new Paragraph({ children: [new TextRun({ text: `Pass Rate: ${classReportStats?.passRate || 0}%`, size: 20 })] }),
        new Paragraph({ spacing: { before: 300 }, children: [] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Generated on ${new Date().toLocaleString()}`, size: 18, italics: true })] }),
      );

      const doc = new Document({ sections: [{ properties: { page: { size: A4_PAGE.size, margin: A4_PAGE.margin } }, children }] });
      const blob = await Packer.toBlob(doc);
      const safeName = (schoolInfo.name || 'School').replace(/[^a-z0-9]/gi, '_');
      saveAs(blob, `${safeName}_${teacherProfile?.classAssigned}_${classReportExam?.year}_${classReportExam?.term}.docx`);
      toast.success('Class Word downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed: ' + err.message);
    }
  };

  /* ---------- Loading / error ---------- */
  if (configLoading && !slowNet) {
    return (
      <Layout title="Class Performance" subtitle="Track class performance metrics">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
        </div>
      </Layout>
    );
  }

  if (configError) {
    return (
      <Layout title="Class Performance" subtitle="Track class performance metrics">
        <div className="text-center py-16">
          <FiAlertCircle className="w-14 h-14 mx-auto text-red-500 mb-3" />
          <h3 className="font-bold text-gray-800 mb-1">Could not load class performance</h3>
          <p className="text-sm text-gray-500 mb-4">Check your connection and try again.</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'class-performance-config'] })}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            Try again
          </button>
        </div>
      </Layout>
    );
  }

  /* ---------- Render ---------- */
  return (
    <Layout title="Subject Performance" subtitle="View and analyze subject-specific performance">
      <div className={responsive.textDensity}>

        {/* Header */}
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
            <button
              onClick={handleRefresh}
              disabled={refreshing || classReportLoading || subjectAnalysisFetching}
              className={`${deviceInfo.isMobile ? 'w-full mt-2' : 'ml-auto'} bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center justify-center gap-2 px-3 py-2 text-sm disabled:opacity-60`}
            >
              <FiRefreshCw className={`w-4 h-4 ${(refreshing || classReportLoading || subjectAnalysisFetching) ? 'animate-spin' : ''}`} />
              {(refreshing || classReportLoading || subjectAnalysisFetching) ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Status banner */}
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
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 flex items-center gap-3">
            <FiInfo className="w-5 h-5 text-gray-500 flex-shrink-0" />
            <div className="text-sm text-gray-600"><span className="font-semibold">📋 No exams available</span></div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4 bg-white rounded-t-lg px-2">
          <button
            onClick={() => setActiveTab('my-class')}
            className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'my-class' ? 'border-green-600 text-green-700 bg-green-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
          >
            <FiUsers className="w-4 h-4" /> My Class Results
          </button>
          <button
            onClick={() => setActiveTab('subject-analysis')}
            className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'subject-analysis' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
          >
            <FiActivity className="w-4 h-4" /> Subject Analysis
          </button>
        </div>

        {/* ======================= MY CLASS TAB ======================= */}
        {activeTab === 'my-class' && (
          <div className="space-y-4">
            {classReportData.length > 0 && classReportStats && classReportExam ? (
              <>
                <div className={`bg-gradient-to-r from-green-600 to-blue-600 rounded-lg ${deviceInfo.isMobile ? 'p-2' : 'p-3'} mb-3 text-white`}>
                  <h2 className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-bold`}>{teacherProfile?.classAssigned} {teacherProfile?.streamAssigned ? `- ${teacherProfile.streamAssigned}` : ''}</h2>
                  <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} font-semibold mt-1`}>Exam: {classReportExam.title}</p>
                  <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} opacity-90`}>Term: {classReportExam.term} | Year: {classReportExam.year}</p>
                </div>

                <div className={`grid ${responsive.statsGrid} ${deviceInfo.isMobile ? 'gap-1' : 'gap-2'} mb-3`}>
                  {[
                    { label: 'Students', value: classReportStats.totalStudents, color: 'text-blue-600' },
                    { label: 'Complete', value: classReportStats.completeCount, color: 'text-green-600' },
                    { label: 'Missing', value: classReportStats.incompleteCount, color: 'text-red-600' },
                    { label: 'Class Avg', value: `${classReportStats.classAverage}%`, color: 'text-green-600' },
                    { label: 'Pass Rate', value: `${classReportStats.passRate}%`, color: 'text-yellow-600' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-lg shadow p-2 text-center">
                      <p className="text-gray-500 text-[10px]">{stat.label}</p>
                      <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden mb-3">
                  <div className="px-2 py-1.5 border-b bg-gray-50 flex justify-between items-center flex-wrap gap-2">
                    <h3 className="text-xs font-bold">CLASS RESULTS TABLE</h3>
                    <div className="flex gap-1 flex-wrap">
                      <button onClick={downloadFullClassExcel} className="bg-green-600 text-white rounded px-2 py-0.5 text-[10px] flex items-center gap-0.5"><FiDownload className="w-3 h-3" /> Excel</button>
                      <button onClick={downloadFullClassWord} className="bg-blue-600 text-white rounded px-2 py-0.5 text-[10px] flex items-center gap-0.5"><FiFileText className="w-3 h-3" /> Word</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-[11px] min-w-[900px]">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-1 py-1 text-center">Pos</th>
                          <th className="px-1 py-1 text-left">Name</th>
                          <th className="px-1 py-1 text-left">Adm</th>
                          {allSubjectsInReport.map(subj => <th key={subj} className="px-1 py-1 text-center" title={subj}>{subj.substring(0, 4)}</th>)}
                          <th className="px-1 py-1 text-center bg-blue-50">Tot</th>
                          <th className="px-1 py-1 text-center bg-green-50">Avg%</th>
                          <th className="px-1 py-1 text-center">Gr</th>
                          <th className="px-1 py-1 text-center">Comp</th>
                          <th className="px-1 py-1 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {classReportData.map((s, idx) => {
                          const rankBg = s.classPosition === 1 ? 'bg-yellow-50' : s.classPosition === 2 ? 'bg-gray-50' : s.classPosition === 3 ? 'bg-orange-50' : '';
                          return (
                            <tr key={idx} className={`${rankBg} ${s.hasMissingMarks ? 'opacity-75' : ''} hover:bg-gray-50`}>
                              <td className="px-1 py-1 text-center font-bold">{s.classPosition}</td>
                              <td className="px-1 py-1 font-medium truncate max-w-[120px]">{s.name}</td>
                              <td className="px-1 py-1 text-gray-600">{s.admNo}</td>
                              {allSubjectsInReport.map(subj => {
                                const marks = s.subjectMarks[subj];
                                const markClass = marks === undefined ? 'text-red-400'
                                  : marks >= 80 ? 'text-purple-600 font-bold'
                                    : marks >= 60 ? 'text-green-600 font-bold'
                                      : marks >= 40 ? 'text-blue-600' : 'text-red-600';
                                return <td key={subj} className={`px-1 py-1 text-center ${markClass}`}>{marks !== undefined ? marks : 'X'}</td>;
                              })}
                              <td className="px-1 py-1 text-center font-bold text-blue-600 bg-blue-50">{s.totalMarks}</td>
                              <td className="px-1 py-1 text-center font-bold text-green-600 bg-green-50">{s.averageScore}</td>
                              <td className="px-1 py-1 text-center font-bold">{s.grade}</td>
                              <td className="px-1 py-1 text-center font-bold" style={{ color: s.competency?.color || '#333' }}>{s.competency?.level || 'N/A'}</td>
                              <td className="px-1 py-1 text-center">
                                <button onClick={() => { setSelectedStudent(s); setShowReportCard(true); }} className="bg-blue-500 text-white rounded hover:bg-blue-600 px-2 py-0.5 text-[9px]">Print</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {streamAnalysis.length > 0 && (
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
                            {allSubjectsInReport.map(subj => <th key={subj} className="px-2 py-1 text-center" title={subj}>{subj.substring(0, 4)}</th>)}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {streamAnalysis.map((sa, i) => (
                            <tr key={i} className={i === 0 ? 'bg-yellow-50' : ''}>
                              <td className="px-2 py-1 font-medium">{sa.stream}</td>
                              <td className="px-2 py-1 text-center">{sa.count}</td>
                              <td className="px-2 py-1 text-center font-bold text-green-700">{sa.mean}</td>
                              <td className="px-2 py-1 text-center font-bold">{sa.grade}</td>
                              {allSubjectsInReport.map(subj => (
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
            ) : (
              <div className="bg-white border rounded-lg p-12 text-center shadow-sm">
                <FiBarChart2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-800 mb-1">No results uploaded yet</h3>
                <p className="text-sm text-gray-500">Results for your assigned class/stream will appear here once uploaded.</p>
              </div>
            )}
          </div>
        )}

        {/* ======================= SUBJECT ANALYSIS TAB ======================= */}
        {activeTab === 'subject-analysis' && (
          <div className="space-y-4">
            <div className={`bg-white rounded-lg shadow-md ${responsive.cardPadding} mb-4`}>
              <h2 className={`${responsive.headingSize} font-bold text-gray-800 mb-3 flex items-center gap-2`}>
                <FiFilter className="text-blue-600" /> Filter Subject Analysis
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
                <div>
                  <label className={`block text-gray-700 font-medium mb-1 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>Subject</label>
                  <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className={`input-field w-full ${deviceInfo.isMobile ? 'text-base' : ''}`} disabled={!selectedClass}>
                    <option value="">{!selectedClass ? 'Select class first' : 'All Subjects'}</option>
                    {availableSubjects.map(subject => <option key={subject} value={subject}>{subject}</option>)}
                  </select>
                </div>
              </div>
              <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'justify-end gap-3'} mt-4`}>
                <button onClick={resetFilters} className={`bg-gray-500 hover:bg-gray-600 text-white rounded-lg ${deviceInfo.isMobile ? 'w-full px-4 py-2.5 text-sm' : 'px-4 py-2'}`}>RESET</button>
              </div>
            </div>

            {/* Auto-loading state: shows spinner while query runs once last field chosen */}
            {subjectAnalysisLoading && subjectAnalysisFiltersReady && (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Loading {selectedSubject} results…</p>
              </div>
            )}

            {!subjectAnalysisLoading && analysisStudents.length > 0 && (
              <>
                <div className={`grid ${responsive.statsGrid} ${responsive.gridGap} mb-4`}>
                  <div className={`bg-white rounded-lg shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-4'} text-center`}>
                    <FiUsers className={`${deviceInfo.isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-blue-500 mx-auto mb-1`} />
                    <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-sm'} text-gray-500`}>Students</p>
                    <p className={`${deviceInfo.isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-800`}>{analysisStudents.length}</p>
                  </div>
                  <div className={`bg-white rounded-lg shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-4'} text-center`}>
                    <FiBarChart2 className={`${deviceInfo.isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-green-500 mx-auto mb-1`} />
                    <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-sm'} text-gray-500`}>Average</p>
                    <p className={`${deviceInfo.isMobile ? 'text-xl' : 'text-2xl'} font-bold text-green-600`}>{analysisAverage.toFixed(1)}%</p>
                  </div>
                  <div className={`bg-white rounded-lg shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-4'} text-center`}>
                    <FiAward className={`${deviceInfo.isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-yellow-500 mx-auto mb-1`} />
                    <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-sm'} text-gray-500`}>Highest</p>
                    <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} font-bold text-gray-800 truncate`}>{analysisTopStudent?.name || 'N/A'}</p>
                    <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500`}>{analysisTopStudent?.score?.toFixed(1)}%</p>
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

                <div className={`bg-white rounded-lg shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-4'} mb-4`}>
                  <h3 className={`font-bold text-gray-800 ${deviceInfo.isMobile ? 'text-sm' : 'text-lg'} mb-3`}>Competency - {selectedSubject}</h3>
                  <div className="space-y-3">
                    {competencyLevels.map(level => {
                      const count = analysisStudents.filter(s => getCompetencyFromMarks(s.marks)?.level === level.level).length;
                      const percentage = analysisStudents.length > 0 ? (count / analysisStudents.length) * 100 : 0;
                      return (
                        <div key={level.level}>
                          <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-0.5' : 'justify-between'} text-sm mb-0.5`}>
                            <span className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'}`}>{level.level}</span>
                            <span className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-bold`}>{count} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className={`rounded-full h-1.5 ${level.level === 'EE' ? 'bg-purple-500' : level.level === 'ME' ? 'bg-green-500' : level.level === 'AE' ? 'bg-blue-500' : level.level === 'BE' ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
                  <div className={`${deviceInfo.isMobile ? 'px-3 py-2' : 'px-6 py-4'} border-b border-gray-200 flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'justify-between items-center'} flex-wrap`}>
                    <h3 className={`${deviceInfo.isMobile ? 'text-sm' : 'text-lg'} font-bold text-gray-800`}>{selectedSubject} - Students</h3>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={downloadResultsExcel} className={`bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-1 ${deviceInfo.isMobile ? 'flex-1 px-2 py-1.5 text-xs' : 'px-4 py-2 text-sm'}`}>
                        <FiDownload className={deviceInfo.isMobile ? 'w-3 h-3' : 'w-4 h-4'} /> Excel
                      </button>
                      <button onClick={downloadResultsWord} className={`bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-1 ${deviceInfo.isMobile ? 'flex-1 px-2 py-1.5 text-xs' : 'px-4 py-2 text-sm'}`}>
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
                        {analysisStudents.map((student, index) => {
                          const competency = getCompetencyFromMarks(student.marks);
                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className={`${deviceInfo.isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-3 text-sm'} font-medium text-gray-800`}>{student.name}</td>
                              {!deviceInfo.isMobile && <td className="px-4 py-3 text-sm text-gray-600">{student.admNo || '-'}</td>}
                              <td className={`${deviceInfo.isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-3 text-sm'}`}>{student.stream || '-'}</td>
                              <td className={`${deviceInfo.isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-3 text-sm'} text-center font-semibold`}>{student.marks.toFixed(1)}%</td>
                              <td className={`${deviceInfo.isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-3 text-sm'} text-center font-bold`}>{student.grade}</td>
                              <td className={`${deviceInfo.isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-3 text-sm'}`}>
                                {competency ? <span className="px-1.5 py-0.5 text-[10px] rounded-full" style={{ backgroundColor: competency.color, color: '#fff' }}>{competency.level}</span> : '-'}
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

            {!subjectAnalysisLoading && subjectAnalysisFiltersReady && analysisStudents.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
                <FiBarChart2 className={`${deviceInfo.isMobile ? 'w-10 h-10' : 'w-12 h-12'} text-yellow-500 mx-auto mb-3`} />
                <h3 className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-800 mb-2`}>No Data Found</h3>
                <p className={`${deviceInfo.isMobile ? 'text-sm' : 'text-base'} text-gray-600`}>
                  {analysisEmpty === 'no-students'
                    ? `No students found in ${selectedClass}${selectedStream && selectedStream !== 'all' ? ` - ${selectedStream}` : ''}`
                    : `No performance data found for ${selectedSubject} in ${selectedClass}`}
                </p>
              </div>
            )}

            {!subjectAnalysisFiltersReady && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <FiInfo className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-sm text-blue-700">
                  Select <strong>Class</strong>, <strong>Exam Type</strong>, <strong>Exam Name</strong> and <strong>Subject</strong> — results will load automatically once the last field is set.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Competency guide */}
        <div className={`mt-4 bg-white rounded-lg shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-4'}`}>
          <h3 className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} font-semibold text-gray-700 mb-2`}>CBE Competency Levels</h3>
          <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-2 gap-1' : 'grid-cols-2 md:grid-cols-5 gap-2'}`}>
            {competencyLevels.map(level => (
              <div key={level.level} className={`flex items-center gap-1 ${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'}`}>
                <span className="px-1.5 py-0.5 text-[10px] rounded-full text-white" style={{ backgroundColor: level.color }}>{level.level}</span>
                <span className="text-gray-500">{level.minScore}-{level.maxScore}%</span>
              </div>
            ))}
          </div>
        </div>

        {showReportCard && selectedStudent && (
          <ReportCard
            student={{ ...selectedStudent, ...selectedStudent.subjectMarks }}
            schoolInfo={schoolInfo}
            selectedClass={teacherProfile?.classAssigned}
            selectedStream={teacherProfile?.streamAssigned}
            selectedTerm={classReportExam?.term}
            selectedYear={classReportExam?.year}
            allSubjects={allSubjectsInReport}
            subjectAverages={{}}
            competencyLevels={competencyLevels}
            getGrade={getGradeFromMarks}
            getCompetencyLevel={getCompetencyFromMarks}
            getRecommendation={getRecommendation}
            onClose={() => { setShowReportCard(false); setSelectedStudent(null); }}
            combinedExamResults={null}
            examNames={[classReportExam?.title]}
            feeSummary={null}
            showStreamColumn={!!teacherProfile?.streamAssigned}
            skills={skillsSummary[String(selectedStudent.id)] || []}
            careerInsights={careerInsights[selectedStudent.id] || []}
            showSkillsOnReport={true}
            showCareerOnReport={true}
            showFeesOnReportCard={false}
            classHasAnySkills={Object.values(skillsSummary).some(a => a.length > 0)}
          />
        )}

        <style>{`
          @media (max-width: 768px) {
            .input-field { font-size: 16px !important; }
            input, select { font-size: 16px !important; }
          }
        `}</style>
      </div>
    </Layout>
  );
};

export default ClassPerformance;