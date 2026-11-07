// src/components/teacher/MyStudents.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { 
  FiSearch, FiArrowUp, FiArrowDown, FiUsers, FiDownload, 
  FiFile, FiFileText, FiFilter, FiX, FiMonitor, FiSmartphone, 
  FiTablet, FiUserCheck, FiBriefcase, FiTarget, FiTrendingUp,
  FiZap, FiAlertCircle, FiCheckCircle, FiInfo, FiCompass
} from 'react-icons/fi';

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
    cardPadding: deviceInfo.isMobile ? 'p-4' : 'p-6',
    headingSize: deviceInfo.isMobile ? 'text-lg' : 'text-xl',
    textSize: deviceInfo.isMobile ? 'text-sm' : 'text-base',
    buttonSize: deviceInfo.isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
    gridGap: deviceInfo.isMobile ? 'gap-2' : 'gap-4',
    statsGrid: deviceInfo.isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'
  };
};

// ─── EXACT ADMIN AI LOGIC & DATABASE ─────────────────────────────
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

const normalizeSubject = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '').trim();
const getSkillName = (s) => (s?.skill || s?.skillName || '').trim();

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
    const multiplier = {
      'Beginner': 0.3, 'Developing': 0.5, 'Proficient': 0.7,
      'Advanced': 1.0, 'Exceptional': 1.3
    }[sk.proficiency] || 0.5;
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

    const finalScore = Math.min(100, academicScore + skillBoost);
    const meetsMin = avgScore >= career.minAvg;

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

      if (c.matchedSubjects.length > 0) {
        const subjList = c.matchedSubjects
          .slice(0, 2)
          .map(m => `${m.name} (${Math.round(m.score)}%)`)
          .join(', ');
        parts.push(`Strong in ${subjList}`);
      }

      if (c.matchedSkillsForField.length > 0) {
        const names = c.matchedSkillsForField
          .slice(0, 2)
          .map(sk => getSkillName(sk))
          .filter(Boolean);
        if (names.length > 0) parts.push(`Talent in ${names.join(' & ')}`);
      }

      if (c.coveragePercent < 100 && c.matchedSubjects.length > 0) {
        parts.push(`(${c.coveragePercent}% subjects)`);
      }

      const reason = parts.length > 0 ? parts.join(' • ') : 'Matches overall performance';
      return { ...c, reason };
    });

  return { insights: top3, avgScore: Math.round(avgScore), skillsUsed: skills };
};

// ─── EXACT UI MODAL FROM ADMIN ───
const CareerInsightsModal = ({ viewingCareerPupil, careerInsights, careerAnalysisMeta, loadingCareers, onClose }) => {
  if (!viewingCareerPupil) return null;

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-3">
      <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
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
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2.5 mb-3 text-center flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-indigo-900 uppercase">Academic Avg Score</p>
                  <p className="text-xl font-bold text-indigo-700">{careerAnalysisMeta.avgScore}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-indigo-900 uppercase">Talents Analysed</p>
                  <p className="text-xl font-bold text-indigo-700">{careerAnalysisMeta.skillsUsed?.length || 0}</p>
                </div>
              </div>

              <div className="space-y-2">
                {careerInsights.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow bg-white">
                    <span className="text-2xl flex-shrink-0">{medals[i]}</span>
                    <span className="text-2xl flex-shrink-0">{c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 text-sm truncate">{c.name}</h3>
                      <p className="text-[10px] text-gray-500 truncate">{c.field}</p>
                      <p className="text-[11px] text-indigo-600 mt-0.5 truncate font-medium bg-indigo-50/50 px-1.5 py-0.5 rounded inline-block">✓ {c.reason}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-bold text-indigo-600">{c.matchScore}%</p>
                      <p className="text-[9px] text-gray-400">match</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-gray-400 text-center mt-3">
                Suggestions are indicative. Consider the learner's interests too.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const MyStudents = () => {
  const deviceInfo = useDeviceDetection();
  const responsive = useResponsiveClasses(deviceInfo);
  
  const { user } = useAuth();
  
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sortBy, setSortBy] = useState('admNo');
  const [sortOrder, setSortOrder] = useState('asc');
  
  const [teacherProfile, setTeacherProfile] = useState(null);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableStreams, setAvailableStreams] = useState([]);
  
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('excel');
  const [downloadClass, setDownloadClass] = useState('');
  const [downloadStream, setDownloadStream] = useState('');
  const [downloadStreams, setDownloadStreams] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState({ name: '', motto: '', phone: '', email: '', poBox: '', schoolLogo: '' });

  const [showCareerModal, setShowCareerModal] = useState(false);
  const [viewingCareerStudent, setViewingCareerStudent] = useState(null);
  const [careerInsights, setCareerInsights] = useState([]);
  const [careerAnalysisMeta, setCareerAnalysisMeta] = useState({ avgScore: 0, skillsUsed: [] });
  const [loadingCareers, setLoadingCareers] = useState(false);

  useEffect(() => {
    fetchData();
    loadSchoolInfo();
  }, [user]);

  useEffect(() => {
    filterAndSortStudents();
  }, [searchTerm, sortBy, sortOrder, students, selectedClass, selectedStream]);

  const loadSchoolInfo = () => {
    try {
      const storedSchool = localStorage.getItem('schoolInfo');
      if (storedSchool) {
        const school = JSON.parse(storedSchool);
        setSchoolInfo({
          name: school.name || school.schoolName || 'SCHOOL NAME',
          motto: school.motto || 'Excellence in Education',
          phone: school.phone || school.phoneNumber || '+254 XXX XXX XXX',
          email: school.email || school.schoolEmail || 'info@school.ac.ke',
          poBox: school.poBox || school.address || 'P.O. Box 00000',
          schoolLogo: school.schoolLogo || school.logo || ''
        });
      }
    } catch (error) {
      console.error('Error loading school info:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let learners = [];
      let myProfile = null;

      await Promise.all([
        api.get('/pupils').then(res => {
          if (res.data && res.data.success) learners = res.data.data || [];
          else if (Array.isArray(res.data)) learners = res.data;
        }).catch(err => console.error('Pupils error:', err)),
        api.get('/teachers').then(res => {
          if (res.data?.success) {
            myProfile = (res.data.data || []).find(t => t.email === user?.email);
          }
        }).catch(err => console.error('Teacher Profile error:', err))
      ]);

      // Default to teacher's assigned class but keep all learners in state
      if (myProfile && myProfile.classAssigned) {
        setTeacherProfile(myProfile);
        setSelectedClass(myProfile.classAssigned);
        setSelectedStream(myProfile.streamAssigned || '');
      }
      
      // We no longer filter the learners array, so the teacher can filter to other classes
      setStudents(learners);
      setFilteredStudents(learners);
      
      // Populate the class dropdown with ALL classes in the school
      const classes = [...new Set(learners.map(s => s.class).filter(Boolean))];
      setAvailableClasses(classes);
      
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Error fetching students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      // Get streams for the currently selected class (whether it's the teacher's or not)
      const studentsInClass = students.filter(s => s.class === selectedClass);
      const streams = [...new Set(studentsInClass.map(s => s.stream).filter(Boolean))];
      setAvailableStreams(streams);
      setSelectedStream('');
    } else {
      setAvailableStreams([]);
      setSelectedStream('');
    }
  }, [selectedClass, students]);

  useEffect(() => {
    if (downloadClass && downloadClass !== 'all') {
      const studentsInClass = students.filter(s => s.class === downloadClass);
      const streams = [...new Set(studentsInClass.map(s => s.stream).filter(Boolean))];
      setDownloadStreams(streams);
      setDownloadStream('all');
    } else {
      setDownloadStreams([]);
      setDownloadStream('all');
    }
  }, [downloadClass, students]);

  const filterAndSortStudents = () => {
    if (!Array.isArray(students)) {
      setFilteredStudents([]);
      return;
    }
    
    let filtered = [...students];
    
    if (selectedClass) {
      filtered = filtered.filter(student => student.class === selectedClass);
    }
    
    if (selectedStream && selectedStream !== 'all') {
      filtered = filtered.filter(student => student.stream === selectedStream);
    }
    
    if (searchTerm.trim()) {
      filtered = filtered.filter(student => 
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.admNo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    filtered.sort((a, b) => {
      let aValue = sortBy === 'name' ? (a.name || '').toLowerCase() : (a.admNo || '');
      let bValue = sortBy === 'name' ? (b.name || '').toLowerCase() : (b.admNo || '');
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredStudents(filtered);
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const generateCareerInsights = async (student) => {
    setLoadingCareers(true);
    try {
      const [resultsRes, skillsRes] = await Promise.all([
        api.get(`/results/pupil/${student._id}`),
        api.get(`/skills/pupil/${student._id}`)
      ]);

      const results = resultsRes.data?.success ? (resultsRes.data.data || []) : [];
      const skills = skillsRes.data?.success ? (skillsRes.data.data || []) : [];

      const analysis = analyzeCareer(results, { skills });

      setCareerInsights(analysis.insights);
      setCareerAnalysisMeta({ avgScore: analysis.avgScore, skillsUsed: analysis.skillsUsed });
    } catch (error) {
      console.error('Error generating career insights:', error);
      toast.error('Could not fetch results or skills for analysis');
    } finally {
      setLoadingCareers(false);
    }
  };

  const handleViewCareerInsights = async (student) => {
    setViewingCareerStudent(student);
    setShowCareerModal(true);
    setCareerInsights([]);
    await generateCareerInsights(student);
  };

  const generateWordHTML = (studentsToDownload, className, streamName, schoolData) => {
    const includeStreamColumn = !(streamName && streamName !== 'all');
    const titleText = `${className}${streamName && streamName !== 'all' ? ` - ${streamName}` : ''} Student List`;
    
    const tableRows = studentsToDownload.map((student, index) => `
        <tr>
          <td style="text-align: center; padding: 8px 4px; border: 1px solid #000;">${index + 1}</td>
          <td style="padding: 8px 4px; border: 1px solid #000;">${student.name || '-'}</td>
          <td style="text-align: center; padding: 8px 4px; border: 1px solid #000;">${student.admNo || '-'}</td>
          ${includeStreamColumn ? `<td style="text-align: center; padding: 8px 4px; border: 1px solid #000;">${student.stream || '-'}</td>` : ''}
          <td style="text-align: center; padding: 8px 4px; border: 1px solid #000;">${student.gender === 'Male' ? 'M' : (student.gender === 'Female' ? 'F' : '-')}</td>
          <td style="padding: 8px 4px; border: 1px solid #000;">&nbsp;</td>
        </tr>
      `).join('');

    const streamHeader = includeStreamColumn
      ? '<th style="border: 1px solid #000; padding: 8px 4px; text-align: center; background-color: #f2f2f2;">STREAM</th>'
      : '';

    const logoHtml = schoolData.schoolLogo 
      ? `<img src="${schoolData.schoolLogo}" alt="Logo" style="max-height: 80px; max-width: 80px; margin-bottom: 10px;" />` 
      : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${titleText}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', 'Arial', serif; margin: 0; padding: 20px; background: white; }
    .header { text-align: center; width: 100%; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #000; }
    .school-logo { margin-bottom: 10px; }
    .school-name { font-size: 24px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
    .motto { font-size: 12px; font-style: italic; margin-bottom: 8px; }
    .address { font-size: 10px; margin-bottom: 10px; }
    .title { font-size: 18px; font-weight: bold; text-decoration: underline; margin: 10px 0; text-transform: uppercase; }
    .info-row { font-size: 10px; margin-bottom: 5px; display: flex; justify-content: space-between; }
    .student-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px; }
    .student-table th { border: 1px solid #000; padding: 8px 4px; text-align: center; background-color: #f2f2f2; font-weight: bold; }
    .student-table td { border: 1px solid #000; padding: 8px 4px; vertical-align: middle; }
    .signature-line { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; width: 100%; }
    .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 9px; text-align: center; width: 100%; }
  </style>
</head>
<body>
  <div class="header">
    ${logoHtml}
    <div class="school-name">${schoolData.name}</div>
    <div class="motto">"${schoolData.motto}"</div>
    <div class="address">${schoolData.poBox} | Tel: ${schoolData.phone} | Email: ${schoolData.email}</div>
    <div class="title">${titleText}</div>
    <div class="info-row">
      <span>Generated on: ${new Date().toLocaleDateString()}</span>
      <span>Time: ${new Date().toLocaleTimeString()}</span>
    </div>
    <div class="info-row">
      <span>Academic Year: ${new Date().getFullYear()}</span>
      <span>Total Students: ${studentsToDownload.length}</span>
    </div>
  </div>
  
  <table class="student-table">
    <thead>
      <tr>
        <th style="width: 5%;">#</th>
        <th style="width: ${includeStreamColumn ? '35%' : '45%'};">NAME</th>
        <th style="width: 10%;">ADM</th>
        ${streamHeader}
        <th style="width: 5%;">GEN</th>
        <th style="width: ${includeStreamColumn ? '35%' : '45%'};">REMARKS</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
  
  <div class="signature-line">
    <div>_____________________<br>Class Teacher's Signature</div>
    <div>_____________________<br>Deputy Head Teacher</div>
    <div>_____________________<br>Head Teacher</div>
  </div>
  
  <div class="footer">
    <p>This is a computer-generated document. No signature required.</p>
  </div>
</body>
</html>`;
  };

  const handleDownload = () => {
    if (!downloadClass) {
      toast.error('Please select a class to download');
      return;
    }
    
    let studentsToDownload = [];
    
    if (downloadClass === 'all') {
      studentsToDownload = students;
    } else {
      studentsToDownload = students.filter(s => s.class === downloadClass);
      if (downloadStream && downloadStream !== 'all') {
        studentsToDownload = studentsToDownload.filter(s => s.stream === downloadStream);
      }
    }
    
    if (studentsToDownload.length === 0) {
      toast.error('No students found to download');
      return;
    }
    
    const includeStreamColumn = !(downloadStream && downloadStream !== 'all');
    
    const fileName = `${downloadClass}${downloadStream && downloadStream !== 'all' ? `_${downloadStream}` : ''}_students`;
    const titleText = `${downloadClass}${downloadStream && downloadStream !== 'all' ? ` - ${downloadStream}` : ''} Student List`;
    
    if (downloadFormat === 'excel') {
      const downloadData = studentsToDownload.map((student, index) => {
        const row = {
          '#': index + 1,
          'Name': student.name,
          'Admission': student.admNo,
        };
        if (includeStreamColumn) row['Stream'] = student.stream || 'N/A';
        row['Gender'] = student.gender === 'Male' ? 'M' : (student.gender === 'Female' ? 'F' : 'N/A');
        row['REMARKS'] = '';
        return row;
      });
      
      const headers = Object.keys(downloadData[0]);
      const csvRows = [
        `"${schoolInfo.name}"`,
        `"${schoolInfo.motto}"`,
        `"${schoolInfo.poBox} | Tel: ${schoolInfo.phone} | Email: ${schoolInfo.email}"`,
        `"${titleText}"`,
        `"Generated: ${new Date().toLocaleString()}"`,
        `"Total Students: ${studentsToDownload.length}"`,
        '',
        headers.join(','),
        ...downloadData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
      ];
      const csvContent = csvRows.join('\n');
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${studentsToDownload.length} students`);
    } else {
      const htmlContent = generateWordHTML(
        studentsToDownload, 
        downloadClass, 
        downloadStream, 
        schoolInfo
      );
      
      const blob = new Blob([htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}_${new Date().toISOString().split('T')[0]}.doc`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${studentsToDownload.length} students`);
    }
    
    setShowDownloadModal(false);
    setDownloadClass('');
    setDownloadStream('');
  };

  const groupedStudents = filteredStudents.reduce((acc, student) => {
    const className = student.class || 'Unassigned';
    if (!acc[className]) acc[className] = [];
    acc[className].push(student);
    return acc;
  }, {});

  const totalStudents = filteredStudents.length;

  const DownloadModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-xl ${deviceInfo.isMobile ? 'p-4 mx-4 w-full max-w-sm' : 'p-6 w-full max-w-md'}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`${deviceInfo.isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-800`}>
            Download Class Lists
          </h2>
          <button onClick={() => setShowDownloadModal(false)} className="text-gray-500 hover:text-gray-700">
            <FiX className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Download Format:</label>
            <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'gap-4'}`}>
              <button
                onClick={() => setDownloadFormat('excel')}
                className={`${deviceInfo.isMobile ? 'w-full' : 'flex-1'} py-2 px-4 rounded-lg border-2 flex items-center justify-center gap-2 ${
                  downloadFormat === 'excel' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300'
                }`}
              >
                <FiFile className="w-4 h-4" /> EXCEL
              </button>
              <button
                onClick={() => setDownloadFormat('word')}
                className={`${deviceInfo.isMobile ? 'w-full' : 'flex-1'} py-2 px-4 rounded-lg border-2 flex items-center justify-center gap-2 ${
                  downloadFormat === 'word' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300'
                }`}
              >
                <FiFileText className="w-4 h-4" /> WORD
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-gray-700 font-medium mb-2">Class</label>
            <select
              value={downloadClass}
              onChange={(e) => setDownloadClass(e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                deviceInfo.isMobile ? 'text-base' : ''
              }`}
            >
              <option value="">Select Class</option>
              <option value="all">All Classes ({students.length} students)</option>
              {availableClasses.map((className) => {
                const classCount = students.filter(s => s.class === className).length;
                return (
                  <option key={className} value={className}>
                    {className} ({classCount} students)
                  </option>
                );
              })}
            </select>
          </div>
          
          {downloadClass && downloadClass !== 'all' && downloadStreams.length > 0 && (
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Stream <span className="text-xs text-gray-500 font-normal">(optional)</span>
              </label>
              <select
                value={downloadStream}
                onChange={(e) => setDownloadStream(e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  deviceInfo.isMobile ? 'text-base' : ''
                }`}
              >
                <option value="all">All Streams (Whole Class)</option>
                {downloadStreams.map(stream => (
                  <option key={stream} value={stream}>{stream}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'space-x-3'} mt-6`}>
          <button 
            onClick={() => setShowDownloadModal(false)} 
            className={`${deviceInfo.isMobile ? 'w-full' : 'flex-1'} bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400`}
          >
            CANCEL
          </button>
          <button 
            onClick={handleDownload} 
            className={`${deviceInfo.isMobile ? 'w-full' : 'flex-1'} bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700`}
          >
            DOWNLOAD SELECTED
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Layout title="My Learners" subtitle="CBE - View all learners by class">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="My Learners" subtitle="CBE - View and manage learners">
      
      {/* Search, Filter and Download Bar */}
      <div className={`bg-white rounded-xl shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-4'} mb-6`}>
        <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-3' : 'flex-wrap gap-4'} items-center`}>
          <div className={`${deviceInfo.isMobile ? 'w-full' : 'flex-1 min-w-[200px]'}`}>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={deviceInfo.isMobile ? "Search learners..." : "Search by learner name or admission number..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  deviceInfo.isMobile ? 'text-base' : ''
                }`}
              />
            </div>
          </div>
          
          {availableClasses.length > 0 && (
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white ${
                deviceInfo.isMobile ? 'w-full text-base' : ''
              }`}
            >
              <option value="">All Classes</option>
              {availableClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          )}
          
          {selectedClass && availableStreams.length > 0 && (
            <select
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value)}
              className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white ${
                deviceInfo.isMobile ? 'w-full text-base' : ''
              }`}
            >
              <option value="">All Streams</option>
              {availableStreams.map(stream => (
                <option key={stream} value={stream}>{stream}</option>
              ))}
            </select>
          )}
          
          <button
            onClick={() => setShowDownloadModal(true)}
            className={`bg-green-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-colors ${
              deviceInfo.isMobile ? 'w-full px-4 py-2.5 text-base' : 'px-4 py-2'
            }`}
          >
            <FiDownload /> DOWNLOAD LISTS
          </button>
          
          <div className={`flex ${deviceInfo.isMobile ? 'w-full gap-2' : 'gap-2'}`}>
            <button
              onClick={() => toggleSort('name')}
              className={`flex-1 px-4 py-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                sortBy === 'name'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-green-50'
              }`}
            >
              <span className={deviceInfo.isMobile ? 'text-xs' : 'text-sm'}>Name</span>
              {sortBy === 'name' && (
                sortOrder === 'asc' ? <FiArrowUp className="w-4 h-4" /> : <FiArrowDown className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => toggleSort('admNo')}
              className={`flex-1 px-4 py-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                sortBy === 'admNo'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-green-50'
              }`}
            >
              <span className={deviceInfo.isMobile ? 'text-xs' : 'text-sm'}>Adm</span>
              {sortBy === 'admNo' && (
                sortOrder === 'asc' ? <FiArrowUp className="w-4 h-4" /> : <FiArrowDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        
        {searchTerm && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>
              Found <span className="font-semibold text-green-600">{totalStudents}</span> learners matching "{searchTerm}"
            </p>
          </div>
        )}
      </div>

      {/* Students Count Summary */}
      <div className={`grid ${responsive.statsGrid} ${responsive.gridGap} mb-6`}>
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
          <p className="text-sm opacity-90">Total Learners</p>
          <p className={`${deviceInfo.isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>{totalStudents}</p>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <p className="text-sm opacity-90">Classes</p>
          <p className={`${deviceInfo.isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>{Object.keys(groupedStudents).length}</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <p className="text-sm opacity-90">Sort By</p>
          <p className={`${deviceInfo.isMobile ? 'text-base' : 'text-xl'} font-bold capitalize`}>
            {sortBy === 'name' ? 'Name' : 'Admission No'}
          </p>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 text-white">
          <p className="text-sm opacity-90">Order</p>
          <p className={`${deviceInfo.isMobile ? 'text-base' : 'text-xl'} font-bold capitalize`}>
            {sortOrder === 'asc' ? 'A to Z' : 'Z to A'}
          </p>
        </div>
      </div>

      {/* No Results Message */}
      {totalStudents === 0 && (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <FiUsers className={`${deviceInfo.isMobile ? 'w-12 h-12' : 'w-16 h-16'} text-gray-400 mx-auto mb-4`} />
          <h3 className={`${deviceInfo.isMobile ? 'text-lg' : 'text-xl'} font-semibold text-gray-800 mb-2`}>
            No Learners Found
          </h3>
          <p className="text-gray-500">Try adjusting your search or check back later</p>
        </div>
      )}

      {/* Class-wise Student Cards */}
      {totalStudents > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedStudents).map(([className, classStudents]) => (
            <div key={className} className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b">
                <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'justify-between items-center'}`}>
                  <div>
                    <h2 className={`${deviceInfo.isMobile ? 'text-base' : 'text-xl'} font-bold text-gray-800`}>
                      {className}
                    </h2>
                    <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>
                      {classStudents.length} learners
                    </p>
                  </div>
                  <div className="bg-green-100 px-3 py-1 rounded-full">
                    <span className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-semibold text-green-700`}>
                      CBE Class
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {classStudents.map((student, index) => (
                  <div 
                    key={student._id || index} 
                    className={`${deviceInfo.isMobile ? 'px-3 py-3' : 'px-6 py-4'} hover:bg-green-50 transition-colors duration-150`}
                  >
                    <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'justify-between items-center'}`}>
                      <div className="flex-1">
                        <div className={`flex ${deviceInfo.isMobile ? 'items-start gap-2' : 'items-center gap-3'}`}>
                          <div className={`${deviceInfo.isMobile ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'} rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white font-semibold flex-shrink-0`}>
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <h3 className={`${deviceInfo.isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-800 truncate`}>
                              {student.name || 'Unknown'}
                            </h3>
                            <div className={`flex ${deviceInfo.isMobile ? 'flex-wrap gap-2' : 'items-center gap-3'} mt-0.5`}>
                              <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500`}>
                                Adm: {student.admNo || 'N/A'}
                              </p>
                              {student.stream && (
                                <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-400`}>
                                  Stream: {student.stream}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {!deviceInfo.isMobile && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            {student.class || 'Unassigned'}
                          </span>
                          <button
                            onClick={() => handleViewCareerInsights(student)}
                            className="text-xs bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 px-2.5 py-1 rounded-lg flex items-center gap-1 hover:from-purple-200 hover:to-pink-200 transition-colors font-medium"
                            title="AI Career Insights"
                          >
                            <FiBriefcase className="w-3 h-3" /> Careers
                          </button>
                        </div>
                      )}
                      {deviceInfo.isMobile && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {student.class || 'Unassigned'}
                          </span>
                          <button
                            onClick={() => handleViewCareerInsights(student)}
                            className="text-[10px] bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 px-2 py-0.5 rounded flex items-center gap-1 hover:from-purple-200 hover:to-pink-200 transition-colors font-medium"
                            title="AI Career Insights"
                          >
                            <FiBriefcase className="w-2.5 h-2.5" /> Careers
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showDownloadModal && <DownloadModal />}
      {showCareerModal && (
        <CareerInsightsModal 
          viewingCareerPupil={viewingCareerStudent}
          careerInsights={careerInsights}
          careerAnalysisMeta={careerAnalysisMeta}
          loadingCareers={loadingCareers}
          onClose={() => { setShowCareerModal(false); setViewingCareerStudent(null); setCareerInsights([]); }}
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          .mobile-view .p-4 { padding: 12px !important; }
          .mobile-view .gap-4 { gap: 12px !important; }
          .mobile-view input, .mobile-view select { font-size: 16px !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .tablet-view .grid-cols-2 { grid-template-columns: repeat(2, 1fr) !important; }
        }
        .responsive-wrapper { transition: all 0.3s ease; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </Layout>
  );
};

export default MyStudents;