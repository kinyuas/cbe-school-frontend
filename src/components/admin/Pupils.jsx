// src/components/admin/Pupils.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../common/Layout';
import AddPupilModal from '../modals/AddPupilModal';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  FiX, FiSearch, FiUsers, FiDownload, FiFileText, FiFile,
  FiArrowRight, FiAward, FiUserPlus, FiInfo, FiEdit2, FiTrash2,
  FiAlertTriangle, FiFilter, FiBookOpen, FiArrowDown, FiEye,
  FiBarChart2, FiBriefcase, FiTarget, FiRefreshCw, FiStar, FiActivity
} from 'react-icons/fi';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ImageRun, VerticalAlign,
} from 'docx';
import { saveAs } from 'file-saver';

// ===== Device detection =====
const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false, isTablet: false, isDesktop: true
  });
  useEffect(() => {
    const detect = () => {
      const w = window.innerWidth;
      const isMobile = w < 768;
      const isTablet = w >= 768 && w < 1024;
      setDeviceInfo({ isMobile, isTablet, isDesktop: !isMobile && !isTablet });
    };
    detect();
    window.addEventListener('resize', detect);
    return () => window.removeEventListener('resize', detect);
  }, []);
  return deviceInfo;
};

const useResponsiveGrid = (deviceInfo) => {
  if (deviceInfo.isMobile) return 'grid-cols-1';
  if (deviceInfo.isTablet) return 'grid-cols-2';
  return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
};

// ===== Constants =====
const CLASS_ORDER = [
  'Play Group', 'Pre-Primary 1', 'Pre-Primary 2',
  'Grade 1', 'Grade 2', 'Grade 3',
  'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9',
  'Grade 10', 'Grade 11', 'Grade 12'
];

const LEVEL_ORDER = [
  'Early Years Education', 'Lower Primary', 'Upper Primary',
  'Junior Secondary', 'Senior Secondary'
];

const A4_PAGE = {
  size: { width: 11906, height: 16838 },
  margin: { top: 720, right: 720, bottom: 720, left: 720 },
};

// ─── EXPANDED CBE CAREER DATABASE ─────────────────────────────
const SKILL_BOOST = {
  'Sports':              { field: 'Sports & Recreation',         boost: 25 },
  'Music':               { field: 'Creative & Performing Arts',  boost: 25 },
  'Drama':               { field: 'Creative & Performing Arts',  boost: 20 },
  'Art & Design':        { field: 'Creative & Visual Arts',      boost: 20 },
  'Leadership':          { field: 'Business & Management',       boost: 15 },
  'ICT':                 { field: 'ICT & Engineering',           boost: 25 },
  'Agriculture':         { field: 'Agriculture & Environment',   boost: 15 },
  'Home Science':        { field: 'Hospitality & Culinary',      boost: 15 },
  'Debate':              { field: 'Law & Humanities',            boost: 15 },
  'Community Service':   { field: 'Education & Social Sciences', boost: 12 },
  'Technical/Practical': { field: 'Technical & Vocational',      boost: 20 }
};

const CAREER_DB = [
  { name: 'Medicine & Surgery (MBChB)', field: 'Medicine & Health Sciences', icon: '🩺', subjects: ['Biology', 'Chemistry'], minAvg: 75 },
  { name: 'Pharmacy', field: 'Medicine & Health Sciences', icon: '💊', subjects: ['Biology', 'Chemistry'], minAvg: 70 },
  { name: 'Nursing', field: 'Medicine & Health Sciences', icon: '🏥', subjects: ['Biology', 'Chemistry'], minAvg: 65 },
  { name: 'Clinical Medicine & Surgery', field: 'Medicine & Health Sciences', icon: '🧑‍⚕️', subjects: ['Biology', 'Chemistry'], minAvg: 60 },
  { name: 'Public Health', field: 'Medicine & Health Sciences', icon: '🧬', subjects: ['Biology', 'Mathematics'], minAvg: 60 },
  { name: 'Medical Laboratory Sciences', field: 'Medicine & Health Sciences', icon: '🔬', subjects: ['Biology', 'Chemistry'], minAvg: 65 },
  { name: 'Computer Science', field: 'ICT & Engineering', icon: '💻', subjects: ['Mathematics', 'Physics'], minAvg: 65 },
  { name: 'Software Engineering', field: 'ICT & Engineering', icon: '🖥️', subjects: ['Mathematics', 'Physics'], minAvg: 65 },
  { name: 'Data Science & Analytics', field: 'ICT & Engineering', icon: '📊', subjects: ['Mathematics', 'Computer Science'], minAvg: 65 },
  { name: 'Cybersecurity', field: 'ICT & Engineering', icon: '🛡️', subjects: ['Mathematics', 'Computer Science'], minAvg: 65 },
  { name: 'Electrical & Electronics Engineering', field: 'ICT & Engineering', icon: '⚡', subjects: ['Mathematics', 'Physics'], minAvg: 68 },
  { name: 'Mechanical Engineering', field: 'ICT & Engineering', icon: '⚙️', subjects: ['Mathematics', 'Physics'], minAvg: 68 },
  { name: 'Civil Engineering', field: 'ICT & Engineering', icon: '🏗️', subjects: ['Mathematics', 'Physics'], minAvg: 68 },
  { name: 'Commerce (BCom)', field: 'Business & Management', icon: '📈', subjects: ['Mathematics', 'Business Studies'], minAvg: 60 },
  { name: 'Business Administration', field: 'Business & Management', icon: '💼', subjects: ['Mathematics', 'Business Studies'], minAvg: 60 },
  { name: 'Economics', field: 'Business & Management', icon: '💰', subjects: ['Mathematics', 'Economics'], minAvg: 65 },
  { name: 'Actuarial Science', field: 'Business & Management', icon: '📉', subjects: ['Mathematics'], minAvg: 70 },
  { name: 'Digital Marketing', field: 'Business & Management', icon: '📱', subjects: ['Business Studies', 'English'], minAvg: 55 },
  { name: 'Supply Chain Management', field: 'Business & Management', icon: '🚚', subjects: ['Business Studies', 'Mathematics'], minAvg: 55 },
  { name: 'Music & Performing Arts', field: 'Creative & Performing Arts', icon: '🎼', subjects: ['Music', 'English'], minAvg: 50 },
  { name: 'Theatre Arts & Film Technology', field: 'Creative & Performing Arts', icon: '🎬', subjects: ['English', 'Literature'], minAvg: 50 },
  { name: 'Dance & Choreography', field: 'Creative & Performing Arts', icon: '💃', subjects: ['Physical Education', 'English'], minAvg: 45 },
  { name: 'Fine Art & Design', field: 'Creative & Visual Arts', icon: '🎨', subjects: ['Art & Design', 'English'], minAvg: 50 },
  { name: 'Graphic Design & Animation', field: 'Creative & Visual Arts', icon: '🖌️', subjects: ['Art & Design', 'Computer Science'], minAvg: 55 },
  { name: 'Fashion & Textile Design', field: 'Creative & Visual Arts', icon: '👗', subjects: ['Art & Design', 'Home Science'], minAvg: 50 },
  { name: 'Interior Design', field: 'Creative & Visual Arts', icon: '🛋️', subjects: ['Art & Design', 'Mathematics'], minAvg: 55 },
  { name: 'Sports Science & Management', field: 'Sports & Recreation', icon: '🏅', subjects: ['Physical Education', 'Biology'], minAvg: 50 },
  { name: 'Physical Education & Coaching', field: 'Sports & Recreation', icon: '🏃', subjects: ['Physical Education', 'English'], minAvg: 45 },
  { name: 'Sports Journalism', field: 'Sports & Recreation', icon: '🎙️', subjects: ['English', 'Physical Education'], minAvg: 50 },
  { name: 'Agriculture', field: 'Agriculture & Environment', icon: '🌾', subjects: ['Biology', 'Agriculture'], minAvg: 55 },
  { name: 'Environmental Science', field: 'Agriculture & Environment', icon: '🌍', subjects: ['Biology', 'Geography'], minAvg: 55 },
  { name: 'Agribusiness Management', field: 'Agriculture & Environment', icon: '🚜', subjects: ['Agriculture', 'Business Studies'], minAvg: 55 },
  { name: 'Animal Science', field: 'Agriculture & Environment', icon: '🐄', subjects: ['Biology', 'Agriculture'], minAvg: 55 },
  { name: 'Law (LLB)', field: 'Law & Humanities', icon: '⚖️', subjects: ['English', 'History'], minAvg: 70 },
  { name: 'International Relations', field: 'Law & Humanities', icon: '🌐', subjects: ['History', 'English'], minAvg: 65 },
  { name: 'Journalism & Media', field: 'Law & Humanities', icon: '📰', subjects: ['English', 'Kiswahili'], minAvg: 60 },
  { name: 'Psychology', field: 'Law & Humanities', icon: '🧠', subjects: ['Biology', 'English'], minAvg: 60 },
  { name: 'Automotive Engineering', field: 'Technical & Vocational', icon: '🚗', subjects: ['Mathematics', 'Physics'], minAvg: 50 },
  { name: 'Electrical Installation', field: 'Technical & Vocational', icon: '🔌', subjects: ['Mathematics', 'Physics'], minAvg: 45 },
  { name: 'Welding & Fabrication', field: 'Technical & Vocational', icon: '🛠️', subjects: ['Mathematics'], minAvg: 40 },
  { name: 'Plumbing & Water Technology', field: 'Technical & Vocational', icon: '🚰', subjects: ['Mathematics'], minAvg: 40 },
  { name: 'Culinary Arts & Food Technology', field: 'Hospitality & Culinary', icon: '👨‍🍳', subjects: ['Home Science', 'Biology'], minAvg: 45 },
  { name: 'Hotel & Hospitality Management', field: 'Hospitality & Culinary', icon: '🏨', subjects: ['English', 'Business Studies'], minAvg: 55 },
  { name: 'Tourism Management', field: 'Hospitality & Culinary', icon: '✈️', subjects: ['Geography', 'English'], minAvg: 55 },
  { name: 'Education (B.Ed)', field: 'Education & Social Sciences', icon: '👩‍🏫', subjects: ['English', 'Mathematics'], minAvg: 55 },
  { name: 'Social Work & Community Development', field: 'Education & Social Sciences', icon: '🤝', subjects: ['English', 'Social Studies'], minAvg: 55 },
  { name: 'Early Childhood Education', field: 'Education & Social Sciences', icon: '🧸', subjects: ['English', 'Social Studies'], minAvg: 50 }
];

const PROFICIENCY_MULTIPLIER = {
  'Beginner': 0.3, 'Developing': 0.5, 'Proficient': 0.8,
  'Advanced': 1.1, 'Exceptional': 1.4
};

const normalizeSubject = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '').trim();
const getSkillName = (s) => (s?.skill || s?.skillName || '').trim();

// ─── ADVANCED AI CAREER ENGINE ─────────────────────────────
const analyzeCareer = (results, options = {}) => {
  const { skills = [] } = options;

  if (!results || results.length === 0) {
    return { insights: [], avgScore: 0, skillsUsed: skills };
  }

  const bySubject = {};
  results.forEach(r => {
    const s = (r.subject || '').trim();
    if (!s) return;
    if (!bySubject[s]) bySubject[s] = [];
    bySubject[s].push(Number(r.marks) || 0);
  });

  const subjectAvg = {};
  Object.entries(bySubject).forEach(([subj, marks]) => {
    subjectAvg[subj] = marks.reduce((a, b) => a + b, 0) / marks.length;
  });

  const subjectKeys = Object.keys(subjectAvg);
  const avgScore = subjectKeys.length > 0
    ? subjectKeys.reduce((sum, k) => sum + subjectAvg[k], 0) / subjectKeys.length
    : 0;

  const getScore = (target) => {
    const t = normalizeSubject(target);
    for (const key of subjectKeys) {
      const n = normalizeSubject(key);
      if (n === t || n.includes(t) || t.includes(n)) return subjectAvg[key];
    }
    return null;
  };

  const skillBoosts = skills.map(sk => {
    const b = SKILL_BOOST[sk.category];
    if (!b) return null;
    const multiplier = PROFICIENCY_MULTIPLIER[sk.proficiency] || 0.5;
    return { field: b.field, boost: b.boost * multiplier, skill: sk };
  }).filter(Boolean);

  const scored = CAREER_DB.map(career => {
    let subjScore = 0, subjCount = 0;
    const matchedSubjects = [];

    career.subjects.forEach(s => {
      const sc = getScore(s);
      if (sc !== null) {
        subjScore += sc;
        subjCount++;
        matchedSubjects.push({ name: s, score: sc });
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

    const finalScore = Math.min(100, (academicScore * 0.7) + skillBoost);
    const meetsMin = avgScore >= career.minAvg || skillBoost >= 15;

    return {
      ...career,
      matchScore: Math.round(finalScore),
      meetsMin,
      academicScore: Math.round(academicScore),
      skillBoost: Math.round(skillBoost),
      matchedSubjects,
      matchedSkillsForField,
      coveragePercent: Math.round(coverageFactor * 100),
    };
  });

  const top3 = scored
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3)
    .map(c => {
      const parts = [];
      if (c.matchedSkillsForField.length > 0) {
        const names = c.matchedSkillsForField
          .slice(0, 2)
          .map(sk => `${getSkillName(sk)} (${sk.proficiency})`)
          .filter(Boolean);
        if (names.length > 0) parts.push(`Talent in ${names.join(' & ')}`);
      }
      if (c.matchedSubjects.length > 0) {
        const subjList = c.matchedSubjects
          .slice(0, 2)
          .map(m => `${m.name} (${Math.round(m.score)}%)`)
          .join(', ');
        parts.push(`Strong in ${subjList}`);
      }
      const reason = parts.length > 0 ? parts.join(' • ') : 'Matches overall performance';
      return { ...c, reason };
    });

  return { insights: top3, avgScore: Math.round(avgScore), skillsUsed: skills };
};

const abbreviateExam = (name) => {
  if (!name) return 'EXAM';
  const cleaned = String(name).replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'EXAM';
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words.slice(0, 4).map(w => w[0]).join('').toUpperCase();
};

const buildExamAbbreviations = (exams) => {
  const out = {};
  const used = new Set();
  exams.forEach(ex => {
    let abbr = abbreviateExam(ex);
    let attempt = abbr;
    let n = 2;
    while (used.has(attempt)) { attempt = `${abbr}${n++}`; }
    used.add(attempt);
    out[ex] = attempt;
  });
  return out;
};

const getGradeFromMark = (m) => {
  if (m >= 80) return 'A';  if (m >= 75) return 'A-';
  if (m >= 70) return 'B+'; if (m >= 65) return 'B';
  if (m >= 60) return 'B-'; if (m >= 55) return 'C+';
  if (m >= 50) return 'C';  if (m >= 45) return 'C-';
  if (m >= 40) return 'D+'; if (m >= 35) return 'D';
  if (m >= 30) return 'D-'; return 'E';
};

const getCompFromMark = (m) => {
  if (m >= 80) return { label: 'EE', color: 'text-purple-600' };
  if (m >= 60) return { label: 'ME', color: 'text-green-600' };
  if (m >= 40) return { label: 'AE', color: 'text-blue-600' };
  if (m >= 20) return { label: 'BE', color: 'text-yellow-600' };
  return { label: 'WBE', color: 'text-red-600' };
};

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

const admNumeric = (s) => {
  const n = parseInt(String(s?.admNo ?? '').replace(/\D/g, ''), 10);
  return isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
};

// ============================================================
// ✅ HELPER — Sanitise pupil payload for backend (handle optional parent fields)
// ============================================================
const buildPupilPayload = (formData) => {
  const payload = { ...formData };

  // Clean system fields
  delete payload._id;
  delete payload.__v;
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.schoolId;
  delete payload.parentIdPassword;
  delete payload.birthCertPassword;

  // The backend model requires `parentIdNumber` & `birthCertNumber` as strings.
  // If a school chooses not to use the parent/pupil portal, we must still
  // satisfy model validation — generate a safe unique placeholder.
  const uniqueSuffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;

  if (!payload.parentIdNumber || !String(payload.parentIdNumber).trim()) {
    payload.parentIdNumber = `N/A-${payload.admNo || uniqueSuffix}`;
  }
  if (!payload.birthCertNumber || !String(payload.birthCertNumber).trim()) {
    payload.birthCertNumber = `N/A-${payload.admNo || uniqueSuffix}`;
  }

  return payload;
};

// ============================================================
// ✅ REBUILT RESULTS MODAL
// ============================================================
const ResultsModal = ({ viewingPupilResults, pupilResults, loadingResults, onClose }) => {
  if (!viewingPupilResults) return null;

  const subjectMap = {};
  const examOrder = [];
  const examSeen = new Set();

  pupilResults.forEach(r => {
    const subj = (r.subject || 'Unknown').trim();
    const exam = (r.examName || 'Exam').trim();
    const marks = Number(r.marks) || 0;

    if (!subjectMap[subj]) subjectMap[subj] = {};
    if (!subjectMap[subj][exam] || subjectMap[subj][exam] < marks) {
      subjectMap[subj][exam] = marks;
    }
    if (!examSeen.has(exam)) {
      examSeen.add(exam);
      examOrder.push(exam);
    }
  });

  const exams = examOrder.slice(0, 5);
  const abbr = buildExamAbbreviations(exams);

  const rows = Object.entries(subjectMap).map(([subject, examMarks]) => {
    const scores = exams.map(ex => examMarks[ex]).filter(v => typeof v === 'number');
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { subject, examMarks, avg };
  });

  rows.sort((a, b) => b.avg - a.avg);

  const overallAvg = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.avg, 0) / rows.length)
    : 0;

  const overallComp = getCompFromMark(overallAvg);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{viewingPupilResults.name}</h2>
            <p className="text-xs text-gray-500">
              {viewingPupilResults.admNo} • {viewingPupilResults.class}
              {viewingPupilResults.stream && ` • ${viewingPupilResults.stream}`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><FiX className="w-5 h-5" /></button>
        </div>

        <div className="p-4">
          {loadingResults ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FiBookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No results recorded yet</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-gray-500 uppercase">Subjects</p>
                  <p className="text-lg font-bold text-blue-600">{rows.length}</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-gray-500 uppercase">Exams</p>
                  <p className="text-lg font-bold text-indigo-600">{exams.length}</p>
                </div>
                <div className={`bg-green-50 border border-green-100 rounded-lg p-3 text-center`}>
                  <p className="text-[10px] text-gray-500 uppercase">Overall Avg</p>
                  <p className={`text-lg font-bold ${overallComp.color}`}>
                    {overallAvg}% <span className="text-xs">{overallComp.label}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3 text-[10px]">
                {exams.map(ex => (
                  <span key={ex} className="bg-gray-100 rounded px-2 py-0.5 text-gray-700">
                    <strong>{abbr[ex]}</strong> = {ex}
                  </span>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 py-2 text-left">Subject</th>
                      {exams.map(ex => (
                        <th key={ex} className="border border-gray-300 px-2 py-2 text-center" title={ex}>
                          {abbr[ex]}
                        </th>
                      ))}
                      <th className="border border-gray-300 px-2 py-2 text-center bg-green-50">Avg</th>
                      <th className="border border-gray-300 px-2 py-2 text-center bg-blue-50">Grade</th>
                      <th className="border border-gray-300 px-2 py-2 text-center bg-purple-50">Comp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const comp = getCompFromMark(row.avg);
                      const grade = getGradeFromMark(row.avg);
                      return (
                        <tr key={row.subject} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-2 py-2 font-medium">{row.subject}</td>
                          {exams.map(ex => {
                            const m = row.examMarks[ex];
                            const cls = m === undefined ? 'text-gray-300' :
                              m >= 80 ? 'text-purple-600 font-bold' :
                              m >= 60 ? 'text-green-600 font-bold' :
                              m >= 40 ? 'text-blue-600' : 'text-red-600';
                            return (
                              <td key={ex} className={`border border-gray-300 px-2 py-2 text-center ${cls}`}>
                                {m !== undefined ? m : '—'}
                              </td>
                            );
                          })}
                          <td className="border border-gray-300 px-2 py-2 text-center bg-green-50 font-bold text-green-700">
                            {row.avg}%
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center bg-blue-50 font-bold">
                            {grade}
                          </td>
                          <td className={`border border-gray-300 px-2 py-2 text-center bg-purple-50 font-bold ${comp.color}`}>
                            {comp.label}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-100 font-bold">
                      <td className="border border-gray-300 px-2 py-2 text-left">Exam Average</td>
                      {exams.map(ex => {
                        const scores = rows.map(r => r.examMarks[ex]).filter(v => typeof v === 'number');
                        const colAvg = scores.length
                          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                          : null;
                        return (
                          <td key={ex} className="border border-gray-300 px-2 py-2 text-center">
                            {colAvg !== null ? `${colAvg}%` : '—'}
                          </td>
                        );
                      })}
                      <td className="border border-gray-300 px-2 py-2 text-center bg-green-50 text-green-700">
                        {overallAvg}%
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-center bg-blue-50">
                        {getGradeFromMark(overallAvg)}
                      </td>
                      <td className={`border border-gray-300 px-2 py-2 text-center bg-purple-50 ${overallComp.color}`}>
                        {overallComp.label}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-[10px] text-gray-400 mt-3 text-center">
                Subjects sorted by average (highest first). Missing marks show as —.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------- Career Insights Modal ----------
const CareerInsightsModal = ({ viewingCareerPupil, careerInsights, careerAnalysisMeta, loadingCareers, onClose }) => {
  if (!viewingCareerPupil) return null;
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-3">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex justify-between items-center rounded-t-xl">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <FiBriefcase className="w-5 h-5" />
              AI Career & Talent Insights
            </h2>
            <p className="text-xs text-white/80 mt-0.5">
              {viewingCareerPupil.name} • {viewingCareerPupil.class}
              {viewingCareerPupil.stream && ` • ${viewingCareerPupil.stream}`}
            </p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-1.5 rounded-lg">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {loadingCareers ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              <p className="mt-3 text-sm text-gray-600">Analysing results & talents...</p>
            </div>
          ) : careerInsights.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FiBriefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Not enough data to suggest careers</p>
              <p className="text-xs text-gray-400 mt-1">Add exam results and skills first</p>
            </div>
          ) : (
            <>
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-4 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-indigo-900 uppercase">Academic Avg Score</p>
                  <p className="text-xl font-bold text-indigo-700">{careerAnalysisMeta.avgScore}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-indigo-900 uppercase">Talents Analysed</p>
                  <p className="text-xl font-bold text-indigo-700">{careerAnalysisMeta.skillsUsed?.length || 0}</p>
                </div>
              </div>

              <div className="space-y-3">
                {careerInsights.map((c, i) => (
                  <div key={i} className="flex flex-col border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow bg-white">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl flex-shrink-0">{medals[i]}</span>
                      <span className="text-3xl flex-shrink-0">{c.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 text-sm truncate">{c.name}</h3>
                        <p className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">{c.field}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-bold text-indigo-600">{c.matchScore}%</p>
                        <p className="text-[9px] text-gray-400 uppercase">Match</p>
                      </div>
                    </div>
                    <div className="bg-indigo-50/50 rounded p-2 text-[11px] text-indigo-900 border border-indigo-100">
                      <span className="font-bold">Why?</span> {c.reason}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-gray-400 text-center mt-4">
                Suggestions are based on combined term talents and last 3 exam averages. Consider the learner's interests too.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------- Download Modal ----------
const DownloadModal = ({ pupils, classesWithStudents, sortClassesByOrder, downloadFormat, setDownloadFormat, downloadClass, setDownloadClass, downloadStream, setDownloadStream, availableStreamsForDownload, onClose, onSubmit }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl p-5 w-full max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-800">Download Class Lists</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><FiX className="w-5 h-5" /></button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">Format</label>
          <div className="flex gap-3">
            <button onClick={() => setDownloadFormat('excel')}
              className={`flex-1 py-2 px-3 rounded-lg border-2 flex items-center justify-center gap-1 text-sm ${downloadFormat === 'excel' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300'}`}>
              <FiFile className="w-4 h-4" /> Excel
            </button>
            <button onClick={() => setDownloadFormat('word')}
              className={`flex-1 py-2 px-3 rounded-lg border-2 flex items-center justify-center gap-1 text-sm ${downloadFormat === 'word' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300'}`}>
              <FiFileText className="w-4 h-4" /> Word
            </button>
          </div>
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">Class</label>
          <select value={downloadClass} onChange={(e) => setDownloadClass(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">Select Class</option>
            <option value="all">All ({pupils.length})</option>
            {sortClassesByOrder(classesWithStudents).map(c => {
              const count = pupils.filter(p => p.class === c).length;
              return <option key={c} value={c}>{c} ({count})</option>;
            })}
          </select>
        </div>

        {downloadClass && downloadClass !== 'all' && availableStreamsForDownload.length > 0 && (
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">Stream</label>
            <select value={downloadStream} onChange={(e) => setDownloadStream(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="all">All Streams</option>
              {availableStreamsForDownload.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg text-sm">Cancel</button>
        <button onClick={onSubmit} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700">Download</button>
      </div>
    </div>
  </div>
);

// ---------- Student Detail Modal ----------
const StudentDetailModal = ({
  viewingStudent, highestClass, 
  getPreviousClass, getNextClass,
  onClose, onEditStudent, onTransfer, onViewResults, onViewCareerInsights,
  onDemote, onPromote, onGraduate, onDelete
}) => {
  if (!viewingStudent) return null;
  const previousClass = getPreviousClass(viewingStudent.class);
  const nextClass = getNextClass(viewingStudent.class);
  const isHighest = viewingStudent.class === highestClass;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-3">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{viewingStudent.name}</h2>
            <p className="text-xs text-gray-500">
              {viewingStudent.admNo} • {viewingStudent.class}
              {isHighest && <span className="ml-2 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px]">Graduating</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><FiX className="w-5 h-5" /></button>
        </div>

        <div className="p-4">
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Parent ID No:</span> {viewingStudent.parentIdNumber || 'N/A'}</div>
              <div><span className="text-gray-500">Birth Cert No:</span> {viewingStudent.birthCertNumber || 'N/A'}</div>
              <div><span className="text-gray-500">Stream:</span> {viewingStudent.stream || 'N/A'}</div>
              <div><span className="text-gray-500">Parent:</span> {viewingStudent.parentName || 'N/A'}</div>
              <div><span className="text-gray-500">Contact:</span> {viewingStudent.parentPhone || 'N/A'}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-3 border-t">
            <button onClick={onEditStudent} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs">Edit</button>
            <button onClick={onTransfer} className="bg-yellow-600 text-white px-3 py-1.5 rounded-lg text-xs">Transfer</button>
            <button onClick={onViewResults} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs">Results</button>
            <button onClick={onViewCareerInsights} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs">Careers</button>
            {previousClass && (
              <button onClick={onDemote} className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs">Demote</button>
            )}
            {!isHighest && nextClass && nextClass !== 'graduate' && (
              <button onClick={onPromote} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs">Promote → {nextClass}</button>
            )}
            {isHighest && (
              <button onClick={onGraduate} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs">Graduate</button>
            )}
            <button onClick={onDelete} className="text-red-600 border border-red-300 px-3 py-1.5 rounded-lg text-xs">Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------- Student Action Modal ----------
const StudentActionModal = ({ studentActionData, studentActionType, onClose, onConfirm }) => {
  if (!studentActionData) return null;
  const { student, currentClass, nextClass } = studentActionData;
  const isGrad = studentActionType === 'graduate';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl p-5 w-full max-w-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-3">
          {isGrad ? 'Graduate Student' : 'Promote Student'}
        </h2>
        <div className={`mb-4 p-3 rounded-lg text-sm ${isGrad ? 'bg-purple-50 text-purple-800' : 'bg-green-50 text-green-800'}`}>
          <p className="font-semibold">{student.name}</p>
          <p>{currentClass} → {isGrad ? 'Alumni' : nextClass}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg text-sm">Cancel</button>
          <button onClick={onConfirm}
            className={`flex-1 text-white py-2 rounded-lg text-sm ${isGrad ? 'bg-purple-600' : 'bg-green-600'}`}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- Promote Modal ----------
const PromoteModal = ({ promoteClassData, promoteAction, selectedStudents, onToggleStudent, onSelectAll, onConfirm, onClose }) => {
  if (!promoteClassData) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-5 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold">{promoteAction === 'graduate' ? 'Graduate Class' : 'Promote Class'}</h2>
          <button onClick={onClose} className="text-gray-500"><FiX className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-600 mb-3">{promoteClassData.className} → {promoteClassData.nextClass}</p>
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs text-gray-500">Selected: {selectedStudents.length}/{promoteClassData.students.length}</span>
          <button onClick={onSelectAll} className="text-blue-600 text-xs">
            {selectedStudents.length === promoteClassData.students.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="border rounded-lg overflow-x-auto max-h-72">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-2 py-2 text-left text-xs w-10"></th>
                <th className="px-2 py-2 text-left text-xs">Adm</th>
                <th className="px-2 py-2 text-left text-xs">Name</th>
                <th className="px-2 py-2 text-left text-xs">Stream</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {promoteClassData.students.map(s => (
                <tr key={s._id}>
                  <td className="px-2 py-1.5">
                    <input type="checkbox" checked={selectedStudents.includes(s._id)} onChange={() => onToggleStudent(s._id)} />
                  </td>
                  <td className="px-2 py-1.5">{s.admNo}</td>
                  <td className="px-2 py-1.5 font-medium">{s.name}</td>
                  <td className="px-2 py-1.5">{s.stream || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg text-sm">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm">Confirm</button>
        </div>
      </div>
    </div>
  );
};

// ---------- Transfer Modal ----------
const TransferModal = ({ selectedPupil, transferData, setTransferData, onClose, onSubmit }) => {
  if (!selectedPupil) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-5 w-full max-w-md">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold">Transfer Learner</h2>
          <button onClick={onClose} className="text-gray-500"><FiX className="w-5 h-5" /></button>
        </div>
        <div className="mb-3 p-2 bg-yellow-50 rounded-lg text-sm text-yellow-800">
          {selectedPupil.name} ({selectedPupil.admNo})
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <select value={transferData.reason}
              onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">Select</option>
              <option>Change of School</option>
              <option>Family Relocation</option>
              <option>Financial Reasons</option>
              <option>Academic Reasons</option>
              <option>Health Reasons</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Destination School</label>
            <input type="text" value={transferData.destinationSchool}
              onChange={(e) => setTransferData({ ...transferData, destinationSchool: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <textarea value={transferData.remarks}
              onChange={(e) => setTransferData({ ...transferData, remarks: e.target.value })}
              rows="2" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg text-sm">Cancel</button>
          <button onClick={onSubmit} className="flex-1 bg-yellow-600 text-white py-2 rounded-lg text-sm">Transfer</button>
        </div>
      </div>
    </div>
  );
};

// ---------- Demote Modal ----------
const DemoteModal = ({ demoteData, onClose, onConfirm }) => {
  if (!demoteData) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-5 w-full max-w-sm">
        <h2 className="text-lg font-bold mb-3">Demote Student</h2>
        <div className="mb-4 p-3 bg-orange-50 rounded-lg text-sm text-orange-800">
          <p className="font-semibold">{demoteData.student.name}</p>
          <p>{demoteData.currentClass} → {demoteData.previousClass}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg text-sm">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-orange-600 text-white py-2 rounded-lg text-sm">Confirm</button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================
const Pupils = () => {
  const navigate = useNavigate();
  const deviceInfo = useDeviceDetection();
  const responsiveGrid = useResponsiveGrid(deviceInfo);

  const [pupils, setPupils] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPupil, setEditingPupil] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStream, setSelectedStream] = useState('');
  const [availableStreams, setAvailableStreams] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState({ classes: [], name: '', motto: '', phone: '', email: '' });
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [loading, setLoading] = useState(true);
  const [highestClass, setHighestClass] = useState('');
  const [classOrder, setClassOrder] = useState([]);

  const [showDemoteModal, setShowDemoteModal] = useState(false);
  const [demoteData, setDemoteData] = useState(null);

  const [showResultsModal, setShowResultsModal] = useState(false);
  const [viewingPupilResults, setViewingPupilResults] = useState(null);
  const [pupilResults, setPupilResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);

  const [showCareerModal, setShowCareerModal] = useState(false);
  const [viewingCareerPupil, setViewingCareerPupil] = useState(null);
  const [careerInsights, setCareerInsights] = useState([]);
  const [careerAnalysisMeta, setCareerAnalysisMeta] = useState({ avgScore: 0, skillsUsed: [] });
  const [loadingCareers, setLoadingCareers] = useState(false);

  const [showStudentActionModal, setShowStudentActionModal] = useState(false);
  const [studentActionData, setStudentActionData] = useState(null);
  const [studentActionType, setStudentActionType] = useState('promote');

  // Retained data for "Add Pupil" — now includes parentIdNumber
  const [retainedData, setRetainedData] = useState({
    studentName: '', admNo: '', birthCertNumber: '', dateOfBirth: '',
    gender: '', className: '', stream: '', parentName: '',
    parentPhone: '', parentEmail: '', parentIdNumber: '',
    address: '', medicalInfo: '', previousSchool: ''
  });

  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteClassData, setPromoteClassData] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [promoteAction, setPromoteAction] = useState('promote');

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedPupil, setSelectedPupil] = useState(null);
  const [transferData, setTransferData] = useState({ reason: '', destinationSchool: '', remarks: '' });

  const [showStudentDetail, setShowStudentDetail] = useState(false);
  const [viewingStudent, setViewingStudent] = useState(null);

  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('excel');
  const [downloadClass, setDownloadClass] = useState('');
  const [downloadStream, setDownloadStream] = useState('');
  const [availableStreamsForDownload, setAvailableStreamsForDownload] = useState([]);

  const getClassOrder = (name) => {
    const i = CLASS_ORDER.indexOf(name);
    return i === -1 ? 999 : i;
  };
  const sortClassesByOrder = (arr) =>
    [...arr].sort((a, b) => getClassOrder(a.name || a) - getClassOrder(b.name || b));

  const saveRetainedData = (formData) => {
    const next = { ...retainedData, ...formData };
    setRetainedData(next);
    try { localStorage.setItem('retainedStudentData', JSON.stringify(next)); } catch (e) {}
  };
  const clearRetainedData = () => {
    setRetainedData({
      studentName: '', admNo: '', birthCertNumber: '', dateOfBirth: '', gender: '',
      className: '', stream: '', parentName: '', parentPhone: '', parentEmail: '',
      parentIdNumber: '', address: '', medicalInfo: '', previousSchool: ''
    });
    try { localStorage.removeItem('retainedStudentData'); } catch (e) {}
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('retainedStudentData');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate old keys gracefully
        if (parsed.birthCertNo && !parsed.birthCertNumber) parsed.birthCertNumber = parsed.birthCertNo;
        if (parsed.studentName && !parsed.name) parsed.name = parsed.studentName;
        setRetainedData(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedClass !== 'all') {
      const streams = [...new Set(pupils.filter(p => p.class === selectedClass).map(s => s.stream).filter(Boolean))];
      setAvailableStreams(streams);
      setSelectedStream('');
    } else {
      setAvailableStreams([]);
      setSelectedStream('');
    }
  }, [selectedClass, pupils]);

  useEffect(() => {
    if (downloadClass && downloadClass !== 'all') {
      const streams = [...new Set(pupils.filter(p => p.class === downloadClass).map(s => s.stream).filter(Boolean))];
      setAvailableStreamsForDownload(streams);
      setDownloadStream('');
    } else {
      setAvailableStreamsForDownload([]);
      setDownloadStream('');
    }
  }, [downloadClass, pupils]);

  const loadData = async () => {
    setLoading(true);
    try {
      const schoolRes = await api.get('/school/settings');
      if (schoolRes.data?.success && schoolRes.data?.data) {
        const school = schoolRes.data.data;
        setSchoolInfo({
          ...school,
          name: school.schoolName || school.name || '',
          email: school.schoolEmail || school.email || '',
          phone: school.phoneNumber || school.phone || '',
          schoolLogo: school.schoolLogo || school.logo || '',
        });
        const classes = school.classes || [];
        const active = classes.filter(c => c.isActive !== false).map(c => c.name);
        const sorted = sortClassesByOrder(active);
        setClassOrder(sorted);
        if (sorted.length > 0) setHighestClass(sorted[sorted.length - 1]);
      }

      const pupilsRes = await api.get('/pupils');
      if (pupilsRes.data.success) setPupils(pupilsRes.data.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const generateCareerInsights = async (pupil) => {
    setLoadingCareers(true);
    try {
      const resultsRes = await api.get(`/results/pupil/${pupil._id}`);
      const results = resultsRes.data?.success ? (resultsRes.data.data || []) : [];

      let skills = [];
      try {
        const skRes = await api.get(`/skills/pupil/${pupil._id}`);
        if (skRes.data?.success) skills = skRes.data.data || [];
      } catch (e) {}

      const analysis = analyzeCareer(results, { skills });

      setCareerInsights(analysis.insights);
      setCareerAnalysisMeta({ avgScore: analysis.avgScore, skillsUsed: analysis.skillsUsed });
    } catch (err) {
      console.error(err);
      setCareerInsights([]);
    } finally {
      setLoadingCareers(false);
    }
  };

  const handleViewCareerInsights = async (pupil) => {
    setViewingCareerPupil(pupil);
    setShowCareerModal(true);
    setCareerInsights([]);
    await generateCareerInsights(pupil);
  };

  const fetchPupilResults = async (pupilId) => {
    setLoadingResults(true);
    try {
      const res = await api.get(`/results/pupil/${pupilId}`);
      setPupilResults(res.data?.success ? (res.data.data || []) : []);
    } catch (err) {
      setPupilResults([]);
    } finally {
      setLoadingResults(false);
    }
  };

  const handleViewResults = (pupil) => {
    setViewingPupilResults(pupil);
    setShowResultsModal(true);
    fetchPupilResults(pupil._id);
  };

  const handleEditStudent = (pupil) => { setEditingPupil(pupil); setIsEditModalOpen(true); };

  const handleUpdatePupil = async (data) => {
    try {
      if (!data.name?.trim()) return toast.error('Name required');
      if (!data.admNo?.trim()) return toast.error('Adm required');

      const payload = buildPupilPayload(data);
      const res = await api.put(`/pupils/${editingPupil._id}`, payload);
      if (res.data.success) {
        toast.success('Student updated');
        loadData();
        setIsEditModalOpen(false);
        setEditingPupil(null);
      } else toast.error(res.data.message || 'Failed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const handleAddPupil = async (pupilData) => {
    try {
      if (!pupilData.name?.trim()) return toast.error('Name required');
      if (!pupilData.admNo?.trim()) return toast.error('Adm required');

      const payload = buildPupilPayload(pupilData);
      const res = await api.post('/pupils', payload);
      if (res.data.success) {
        toast.success('Student added');
        clearRetainedData();
        loadData();
        setIsModalOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add');
      saveRetainedData(pupilData);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Delete this student? Cannot be undone.')) return;
    try {
      const res = await api.delete(`/pupils/${id}`);
      if (res.data.success) { toast.success('Deleted'); loadData(); }
    } catch (err) { toast.error('Failed to delete'); }
  };

  const getNextClass = (current) => {
    const i = classOrder.indexOf(current);
    if (i === -1) return null;
    if (i === classOrder.length - 1) return 'graduate';
    return classOrder[i + 1];
  };
  const getPreviousClass = (current) => {
    const i = classOrder.indexOf(current);
    if (i === -1 || i === 0) return null;
    return classOrder[i - 1];
  };

  const handleDemoteStudent = (student) => {
    const prev = getPreviousClass(student.class);
    if (!prev) return toast.error('Already in lowest class');
    setDemoteData({ student, previousClass: prev, currentClass: student.class });
    setShowDemoteModal(true);
  };

  const confirmDemote = async () => {
    if (!demoteData) return;
    try {
      const res = await api.put(`/pupils/${demoteData.student._id}`, { class: demoteData.previousClass });
      if (res.data.success) {
        toast.success(`Demoted to ${demoteData.previousClass}`);
        setShowDemoteModal(false);
        setDemoteData(null);
        loadData();
      }
    } catch (err) { toast.error('Failed to demote'); }
  };

  const handlePromoteClass = (className) => {
    const students = pupils.filter(p => p.class === className);
    if (students.length === 0) return toast.error('No students');
    const next = getNextClass(className);
    if (!next) return toast.error('No higher class');
    setPromoteClassData({ className, nextClass: next, students });
    setSelectedStudents(students.map(s => s._id));
    setPromoteAction(next === 'graduate' ? 'graduate' : 'promote');
    setShowPromoteModal(true);
  };

  const handleGraduateClass = (className) => {
    if (className !== highestClass) return toast.error(`Only ${highestClass} can graduate`);
    const students = pupils.filter(p => p.class === className);
    if (students.length === 0) return toast.error('No students');
    setPromoteClassData({ className, nextClass: 'alumni', students });
    setSelectedStudents(students.map(s => s._id));
    setPromoteAction('graduate');
    setShowPromoteModal(true);
  };

  const toggleStudentSelection = (id) => {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAllStudents = () => {
    if (selectedStudents.length === promoteClassData?.students.length) setSelectedStudents([]);
    else setSelectedStudents(promoteClassData?.students.map(s => s._id) || []);
  };

  const confirmPromotion = async () => {
    if (!promoteClassData || selectedStudents.length === 0) return toast.error('Select students');
    try {
      if (promoteAction === 'graduate') {
        const res = await api.post('/pupils/graduate', { pupilIds: selectedStudents });
        if (res.data.success) { toast.success(res.data.message); loadData(); }
      } else {
        const res = await api.post('/pupils/promote', {
          pupilIds: selectedStudents,
          currentClass: promoteClassData.className,
          nextClass: promoteClassData.nextClass
        });
        if (res.data.success) { toast.success(res.data.message); loadData(); }
      }
    } catch (err) { toast.error('Promotion failed'); }
    setShowPromoteModal(false);
    setPromoteClassData(null);
    setSelectedStudents([]);
  };

  const handlePromoteStudent = (student) => {
    const next = getNextClass(student.class);
    if (!next) return toast.error('No higher class');
    if (next === 'graduate') return handleGraduateStudent(student);
    setStudentActionData({ student, nextClass: next, currentClass: student.class });
    setStudentActionType('promote');
    setShowStudentActionModal(true);
  };

  const handleGraduateStudent = (student) => {
    setStudentActionData({ student, nextClass: 'alumni', currentClass: student.class });
    setStudentActionType('graduate');
    setShowStudentActionModal(true);
  };

  const confirmStudentAction = async () => {
    if (!studentActionData) return;
    const { student } = studentActionData;
    try {
      if (studentActionType === 'graduate') {
        const res = await api.post('/pupils/graduate', { pupilIds: [student._id] });
        if (res.data.success) {
          toast.success(`${student.name} graduated`);
          setShowStudentActionModal(false);
          setStudentActionData(null);
          setShowStudentDetail(false);
          setViewingStudent(null);
          loadData();
        }
      } else {
        const res = await api.post('/pupils/promote', {
          pupilIds: [student._id],
          currentClass: studentActionData.currentClass,
          nextClass: studentActionData.nextClass
        });
        if (res.data.success) {
          toast.success(`${student.name} promoted`);
          setShowStudentActionModal(false);
          setStudentActionData(null);
          setShowStudentDetail(false);
          setViewingStudent(null);
          loadData();
        }
      }
    } catch (err) { toast.error('Failed'); }
  };

  const handleTransferClick = (pupil) => {
    setSelectedPupil(pupil);
    setTransferData({ reason: '', destinationSchool: '', remarks: '' });
    setShowTransferModal(true);
  };

  const handleTransferSubmit = async () => {
    if (!transferData.reason) return toast.error('Select reason');
    try {
      const res = await api.post(`/pupils/${selectedPupil._id}/transfer`, transferData);
      if (res.data.success) {
        toast.success('Transferred');
        loadData();
        setShowTransferModal(false);
        setSelectedPupil(null);
      }
    } catch (err) { toast.error('Failed to transfer'); }
  };

  const handleViewStudent = (pupil) => {
    setViewingStudent(pupil);
    setShowStudentDetail(true);
  };

  const classesWithStudents = [...new Set(pupils.map(p => p.class).filter(Boolean))];
  const sortedClassesWithStudents = sortClassesByOrder(classesWithStudents);

  const filteredPupils = pupils.filter(p => {
    const searchMatch = searchTerm === '' ||
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.admNo?.toLowerCase().includes(searchTerm.toLowerCase());
    const classMatch = selectedClass === 'all' || p.class === selectedClass;
    const streamMatch = !selectedStream || p.stream === selectedStream;
    return searchMatch && classMatch && streamMatch;
  });

  const sortedPupils = [...filteredPupils].sort((a, b) => {
    const key = sortBy === 'name' ? 'name' : 'admNo';
    const aV = a[key] || '';
    const bV = b[key] || '';
    return sortOrder === 'asc' ? aV.localeCompare(bV) : bV.localeCompare(aV);
  });

  const groupedPupils = sortedPupils.reduce((acc, p) => {
    if (!acc[p.class]) acc[p.class] = [];
    acc[p.class].push(p);
    return acc;
  }, {});

  const sortedGroupedPupils = {};
  sortClassesByOrder(Object.keys(groupedPupils)).forEach(c => {
    sortedGroupedPupils[c] = groupedPupils[c];
  });

  const groupedByLevel = {};
  Object.keys(sortedGroupedPupils).forEach(className => {
    let level = 'Other';
    if (CLASS_ORDER.slice(0, 3).includes(className)) level = 'Early Years Education';
    else if (CLASS_ORDER.slice(3, 6).includes(className)) level = 'Lower Primary';
    else if (CLASS_ORDER.slice(6, 9).includes(className)) level = 'Upper Primary';
    else if (CLASS_ORDER.slice(9, 12).includes(className)) level = 'Junior Secondary';
    else if (CLASS_ORDER.slice(12, 15).includes(className)) level = 'Senior Secondary';
    if (!groupedByLevel[level]) groupedByLevel[level] = [];
    groupedByLevel[level].push(className);
  });

  const handleDownloadSubmit = async () => {
    if (!downloadClass) return toast.error('Select class');
    let students = downloadClass === 'all' ? pupils : pupils.filter(p => p.class === downloadClass);

    const hasStreamFilter =
      downloadStream &&
      downloadStream !== 'all' &&
      downloadStream !== '';

    if (hasStreamFilter) {
      students = students.filter(p => p.stream === downloadStream);
    }
    if (students.length === 0) return toast.error('No students');

    students = [...students].sort((a, b) => admNumeric(a) - admNumeric(b));

    const fileStreamPart = hasStreamFilter ? `_${downloadStream}` : '';
    const fileName = `${downloadClass}${fileStreamPart}_students`;

    const classLabel = downloadClass === 'all' ? 'All Students' : downloadClass;
    const streamLabel = hasStreamFilter ? ` (${downloadStream})` : '';
    const titleText = `${classLabel}${streamLabel} STUDENT LIST`.toUpperCase();

    const showStrCol = !hasStreamFilter;

    if (downloadFormat === 'excel') {
      const data = students.map((s, i) => {
        const row = {
          '#': i + 1,
          ADM: s.admNo,
          NAME: s.name,
          GEN: s.gender === 'Male' ? 'M' : (s.gender === 'Female' ? 'F' : (s.gender || 'N/A')),
        };
        if (showStrCol) row.STR = s.stream || 'N/A';
        row.REMARKS = '';
        return row;
      });
      const headers = Object.keys(data[0]);
      const rows = [
        `"${(schoolInfo.name || schoolInfo.schoolName || 'SCHOOL').toUpperCase()}"`,
        `"${schoolInfo.motto || ''}"`,
        `"${schoolInfo.address || ''} | Tel: ${schoolInfo.phone || schoolInfo.phoneNumber || ''}"`,
        `"${titleText}"`,
        `"Generated: ${new Date().toLocaleString()}"`,
        '',
        headers.join(','),
        ...data.map(r => headers.map(h => `"${r[h] || ''}"`).join(','))
      ].join('\n');
      const blob = new Blob(["\uFEFF" + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      try {
        const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
        const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
        const children = [];

        children.push(...buildWordLogoParagraph(schoolInfo, {
          schoolNameSize: 28, contactSize: 16, mottoSize: 18,
          logoWidth: 80, logoHeight: 80,
        }));

        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 120 },
            children: [new TextRun({ text: titleText, bold: true, size: 24, underline: {} })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({
              text: `Generated: ${new Date().toLocaleDateString()}    |    Total: ${students.length}`,
              size: 18,
            })],
          }),
        );

        const headers = ['#', 'ADM', 'NAME', 'GEN'];
        if (showStrCol) headers.push('STR');
        headers.push('REMARKS');

        const headerRow = new TableRow({
          children: headers.map(h => new TableCell({
            borders: cellBorders, shading: { fill: 'F0F0F0' },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: h, bold: true, size: 18 })],
            })],
          })),
        });

        const bodyRows = students.map((s, i) => {
          const cells = [
            new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(i + 1), size: 18 })] })] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.admNo || '-', size: 18 })] })] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: s.name || '-', size: 18 })] })] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.gender === 'Male' ? 'M' : (s.gender === 'Female' ? 'F' : '-'), size: 18 })] })] }),
          ];
          if (showStrCol) {
            cells.push(new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.stream || '-', size: 18 })] })] }));
          }
          cells.push(new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: '', size: 18 })] })] }));
          return new TableRow({ children: cells });
        });

        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...bodyRows],
        }));

        children.push(
          new Paragraph({ spacing: { before: 600 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({
              text: 'Class Teacher: __________________     Deputy: __________________     Head Teacher: __________________',
              size: 18,
            })],
          }),
        );

        const doc = new Document({
          sections: [{
            properties: { page: { size: A4_PAGE.size, margin: A4_PAGE.margin } },
            children,
          }],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${fileName}_${new Date().toISOString().split('T')[0]}.docx`);
      } catch (err) {
        console.error(err);
        toast.error('Failed to generate Word document: ' + err.message);
        return;
      }
    }
    toast.success(`Downloaded ${students.length} students`);
    setShowDownloadModal(false);
    setDownloadClass('');
    setDownloadStream('');
  };

  if (loading) {
    return (
      <Layout title="All Students" subtitle="Manage students">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="All Students" subtitle="Manage students">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <button onClick={() => setShowDownloadModal(true)}
          className="bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 px-4 py-2 text-sm">
          <FiDownload className="w-4 h-4" /> Download Lists
        </button>
        <button onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
          <FiUsers className="w-4 h-4" /> Add Student
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search name or adm..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="all">All Classes</option>
            {sortedClassesWithStudents.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {selectedClass !== 'all' && availableStreams.length > 0 && (
            <select value={selectedStream} onChange={(e) => setSelectedStream(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All Streams</option>
              {availableStreams.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <button onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
            className="px-3 py-2 text-xs bg-gray-100 rounded-lg">
            Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      {LEVEL_ORDER.map(level => {
        const classesInLevel = groupedByLevel[level] || [];
        if (classesInLevel.length === 0) return null;
        return (
          <div key={level} className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-2 px-1">{level}</h3>
            {classesInLevel.map(className => {
              const classPupils = sortedGroupedPupils[className] || [];
              if (classPupils.length === 0) return null;
              const isHighest = className === highestClass;

              return (
                <div key={className} className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-base font-semibold text-gray-800">
                      {className} <span className="text-xs text-gray-500 font-normal">({classPupils.length})</span>
                      {isHighest && <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Graduating</span>}
                    </h4>
                    <button onClick={() => isHighest ? handleGraduateClass(className) : handlePromoteClass(className)}
                      className={`text-xs px-3 py-1 rounded-lg text-white ${isHighest ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                      {isHighest ? 'Graduate All' : 'Promote All'}
                    </button>
                  </div>

                  <div className={`grid ${responsiveGrid} gap-2`}>
                    {classPupils.map(pupil => (
                      <div key={pupil._id}
                        className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 p-3 cursor-pointer"
                        onClick={() => handleViewStudent(pupil)}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-800 truncate">{pupil.name}</h3>
                            <p className="text-xs text-gray-500">
                              {pupil.admNo}
                              {pupil.stream && ` • ${pupil.stream}`}
                            </p>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <button onClick={(e) => { e.stopPropagation(); handleViewResults(pupil); }}
                              className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="Results">
                              <FiEye className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleViewCareerInsights(pupil); }}
                              className="p-1 text-purple-600 hover:bg-purple-50 rounded" title="Careers">
                              <FiBriefcase className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {pupils.length === 0 && (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <FiUsers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Students Yet</h3>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">Add First Student</button>
        </div>
      )}

      {/* Modals */}
      <AddPupilModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        onSave={handleAddPupil} retainedData={retainedData} onDataChange={saveRetainedData} />

      <AddPupilModal isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingPupil(null); }}
        onSave={handleUpdatePupil} editingPupil={editingPupil} />

      {showPromoteModal && (
        <PromoteModal promoteClassData={promoteClassData} promoteAction={promoteAction}
          selectedStudents={selectedStudents} onToggleStudent={toggleStudentSelection}
          onSelectAll={selectAllStudents} onConfirm={confirmPromotion}
          onClose={() => setShowPromoteModal(false)} />
      )}

      {showTransferModal && (
        <TransferModal selectedPupil={selectedPupil} transferData={transferData}
          setTransferData={setTransferData} onClose={() => setShowTransferModal(false)}
          onSubmit={handleTransferSubmit} />
      )}

      {showStudentDetail && (
        <StudentDetailModal viewingStudent={viewingStudent} highestClass={highestClass}
          getPreviousClass={getPreviousClass} getNextClass={getNextClass}
          onClose={() => setShowStudentDetail(false)}
          onEditStudent={() => { setShowStudentDetail(false); handleEditStudent(viewingStudent); }}
          onTransfer={() => { setShowStudentDetail(false); handleTransferClick(viewingStudent); }}
          onViewResults={() => { setShowStudentDetail(false); handleViewResults(viewingStudent); }}
          onViewCareerInsights={() => { setShowStudentDetail(false); handleViewCareerInsights(viewingStudent); }}
          onDemote={() => { setShowStudentDetail(false); handleDemoteStudent(viewingStudent); }}
          onPromote={() => handlePromoteStudent(viewingStudent)}
          onGraduate={() => handleGraduateStudent(viewingStudent)}
          onDelete={() => { setShowStudentDetail(false); handleDeleteStudent(viewingStudent._id); }} />
      )}

      {showDownloadModal && (
        <DownloadModal pupils={pupils} classesWithStudents={classesWithStudents}
          sortClassesByOrder={sortClassesByOrder} downloadFormat={downloadFormat}
          setDownloadFormat={setDownloadFormat} downloadClass={downloadClass}
          setDownloadClass={setDownloadClass} downloadStream={downloadStream}
          setDownloadStream={setDownloadStream} availableStreamsForDownload={availableStreamsForDownload}
          onClose={() => setShowDownloadModal(false)} onSubmit={handleDownloadSubmit} />
      )}

      {showDemoteModal && (
        <DemoteModal demoteData={demoteData} onClose={() => setShowDemoteModal(false)}
          onConfirm={confirmDemote} />
      )}

      {showResultsModal && (
        <ResultsModal viewingPupilResults={viewingPupilResults} pupilResults={pupilResults}
          loadingResults={loadingResults}
          onClose={() => { setShowResultsModal(false); setViewingPupilResults(null); setPupilResults([]); }} />
      )}

      {showStudentActionModal && (
        <StudentActionModal studentActionData={studentActionData}
          studentActionType={studentActionType}
          onClose={() => { setShowStudentActionModal(false); setStudentActionData(null); }}
          onConfirm={confirmStudentAction} />
      )}

      {showCareerModal && (
        <CareerInsightsModal viewingCareerPupil={viewingCareerPupil}
          careerInsights={careerInsights} careerAnalysisMeta={careerAnalysisMeta}
          loadingCareers={loadingCareers}
          onClose={() => { setShowCareerModal(false); setViewingCareerPupil(null); setCareerInsights([]); }} />
      )}
    </Layout>
  );
};

export default Pupils;