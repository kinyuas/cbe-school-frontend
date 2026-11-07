// src/components/admin/UpdateResults.jsx
import React, { useState, useEffect, useRef } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
  FiSearch, FiFilter, FiSave, FiBookOpen, 
  FiClock, FiAlertCircle, FiLock, FiMonitor, 
  FiSmartphone, FiTablet, FiRefreshCw, FiCheck,
  FiStar, FiPlus, FiTrash2, FiEdit2, FiX, FiUser, FiCalendar
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

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
    cardPadding: deviceInfo.isMobile ? 'p-3' : 'p-4',
    headingSize: deviceInfo.isMobile ? 'text-sm' : 'text-md',
    textSize: deviceInfo.isMobile ? 'text-xs' : 'text-sm',
    buttonSize: deviceInfo.isMobile ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm',
    gridGap: deviceInfo.isMobile ? 'gap-1.5' : 'gap-3',
    tablePadding: deviceInfo.isMobile ? 'px-2 py-1.5' : 'px-4 py-2'
  };
};

// ===== CLASS ORDER DEFINITION =====
const CLASS_ORDER = [
  'Play Group', 'Pre-Primary 1', 'Pre-Primary 2',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
];

// ===== Subject Configuration =====
const getSubjectConfig = (className) => {
  const config = {
    'Play Group': { subjects: ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Psychomotor and Creative Activities'], streamRequired: false },
    'Pre-Primary 1': { subjects: ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Psychomotor and Creative Activities'], streamRequired: false },
    'Pre-Primary 2': { subjects: ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Psychomotor and Creative Activities'], streamRequired: false },
    'Grade 1': { subjects: ['English', 'Kiswahili', 'Mathematics', 'Environmental Activities', 'Hygiene and Nutrition', 'Religious Education', 'Creative Arts'], streamRequired: false },
    'Grade 2': { subjects: ['English', 'Kiswahili', 'Mathematics', 'Environmental Activities', 'Hygiene and Nutrition', 'Religious Education', 'Creative Arts'], streamRequired: false },
    'Grade 3': { subjects: ['English', 'Kiswahili', 'Mathematics', 'Environmental Activities', 'Hygiene and Nutrition', 'Religious Education', 'Creative Arts'], streamRequired: false },
    'Grade 4': { subjects: ['English', 'Kiswahili', 'Mathematics', 'Science and Technology', 'Social Studies', 'Religious Education', 'Creative Arts', 'Physical and Health Education'], streamRequired: false },
    'Grade 5': { subjects: ['English', 'Kiswahili', 'Mathematics', 'Science and Technology', 'Social Studies', 'Religious Education', 'Creative Arts', 'Physical and Health Education', 'Agriculture and Nutrition'], streamRequired: false },
    'Grade 6': { subjects: ['English', 'Kiswahili', 'Mathematics', 'Science and Technology', 'Social Studies', 'Religious Education', 'Creative Arts', 'Physical and Health Education', 'Agriculture and Nutrition'], streamRequired: false },
    'Grade 7': { subjects: ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Health Education', 'Pre-Technical Studies', 'Social Studies', 'Religious Education', 'Creative Arts and Sports', 'Business Studies', 'Agriculture', 'Computer Science'], streamRequired: true },
    'Grade 8': { subjects: ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Health Education', 'Pre-Technical Studies', 'Social Studies', 'Religious Education', 'Creative Arts and Sports', 'Business Studies', 'Agriculture', 'Computer Science'], streamRequired: true },
    'Grade 9': { subjects: ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Health Education', 'Pre-Technical Studies', 'Social Studies', 'Religious Education', 'Creative Arts and Sports', 'Business Studies', 'Agriculture', 'Computer Science'], streamRequired: true },
    'Grade 10': { subjects: ['English', 'Kiswahili', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Religious Education', 'Business Studies', 'Computer Studies', 'Agriculture'], streamRequired: true },
    'Grade 11': { subjects: ['English', 'Kiswahili', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Religious Education', 'Business Studies', 'Computer Studies', 'Agriculture'], streamRequired: true },
    'Grade 12': { subjects: ['English', 'Kiswahili', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Religious Education', 'Business Studies', 'Computer Studies', 'Agriculture'], streamRequired: true }
  };
  return config[className] || { subjects: [], streamRequired: false };
};

const DEFAULT_SKILL_CATEGORIES = [
  'Sports', 'Music', 'Drama', 'Art & Design', 'Leadership',
  'ICT', 'Agriculture', 'Home Science', 'Debate',
  'Community Service', 'Technical/Practical'
];
const DEFAULT_PROFICIENCY_LEVELS = [
  'Beginner', 'Developing', 'Proficient', 'Advanced', 'Exceptional'
];

const UpdateResults = () => {
  const { user } = useAuth();
  const deviceInfo = useDeviceDetection();
  const responsive = useResponsiveClasses(deviceInfo);
  
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [canUploadResults, setCanUploadResults] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timeWarning, setTimeWarning] = useState(false);
  const [examNotStarted, setExamNotStarted] = useState(false);
  
  const [schoolInfo, setSchoolInfo] = useState({ name: '', classes: [], streams: [] });
  
  // Tabs: 'academic' | 'skills'
  const [activeTab, setActiveTab] = useState('academic');

  // Filter states
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('');
  const [selectedExamName, setSelectedExamName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Academic States
  const [studentScores, setStudentScores] = useState({});
  const [saveStatus, setSaveStatus] = useState({}); 
  const saveTimeouts = useRef({}); 
  const [saving, setSaving] = useState(false); 
  
  // Skills States
  const [skillsConfig, setSkillsConfig] = useState({ categories: [], proficiencyLevels: [], requireEvidenceNotes: false });
  const [skillsData, setSkillsData] = useState({});
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [skillTargetStudent, setSkillTargetStudent] = useState(null);
  const [editingSkill, setEditingSkill] = useState(null);
  const [skillForm, setSkillForm] = useState({ category: '', skillName: '', proficiency: '', notes: '' });

  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableStreams, setAvailableStreams] = useState([]);
  const [availableExamNames, setAvailableExamNames] = useState([]);
  const [subjectConfig, setSubjectConfig] = useState({ subjects: [], streamRequired: false });
  const [availableExamTypes, setAvailableExamTypes] = useState([]);

  const terms = ['Term 1', 'Term 2', 'Term 3'];

  const competencyLevels = [
    { level: 'Exceeding Expectation (EE)', minScore: 80, maxScore: 100, color: 'bg-purple-100 text-purple-800' },
    { level: 'Meeting Expectation (ME)', minScore: 60, maxScore: 79, color: 'bg-green-100 text-green-800' },
    { level: 'Approaching Expectation (AE)', minScore: 40, maxScore: 59, color: 'bg-blue-100 text-blue-800' },
    { level: 'Below Expectation (BE)', minScore: 20, maxScore: 39, color: 'bg-yellow-100 text-yellow-800' },
    { level: 'Well Below Expectation (WBE)', minScore: 0, maxScore: 19, color: 'bg-red-100 text-red-800' }
  ];

  const getCompetencyFromMarks = (marks) => {
    if (marks === null || marks === undefined || marks === '') return null;
    const score = parseFloat(marks);
    if (isNaN(score)) return null;
    return competencyLevels.find(l => score >= l.minScore && score <= l.maxScore);
  };

  const getClassOrder = (className) => {
    const index = CLASS_ORDER.indexOf(className);
    return index !== -1 ? index : 999;
  };

  const sortClassesByOrder = (classes) => {
    return [...classes].sort((a, b) => getClassOrder(a) - getClassOrder(b));
  };

  useEffect(() => {
    loadData();
    loadSkillsConfig();
  }, []);

  const loadSkillsConfig = async () => {
    try {
      const res = await api.get('/school/skills-config');
      if (res.data?.success && res.data.data) {
        setSkillsConfig({
          categories: res.data.data.categories || [],
          proficiencyLevels: res.data.data.proficiencyLevels || [],
          requireEvidenceNotes: !!res.data.data.requireEvidenceNotes
        });
      }
    } catch (err) {
      console.warn('Using default skills config');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const schoolResponse = await api.get('/school/settings');
      if (schoolResponse.data.success && schoolResponse.data.data) {
        const school = schoolResponse.data.data;
        setSchoolInfo(school);
        const activeClassNames = (school.classes || []).filter(c => c.isActive !== false).map(c => c.name);
        const sortedClasses = sortClassesByOrder(activeClassNames);
        setAvailableClasses(sortedClasses);
        if (sortedClasses.length === 0) {
          const fallbackClasses = ['Play Group', 'Pre-Primary 1', 'Pre-Primary 2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'];
          setAvailableClasses(sortClassesByOrder(fallbackClasses));
        }
      }
      
      const studentsRes = await api.get('/pupils');
      setStudents(studentsRes.data?.data || []);
      setFilteredStudents(studentsRes.data?.data || []);
      
      const examsRes = await api.get('/exams');
      if (examsRes.data.success) {
        const examsData = examsRes.data.data || [];
        setExams(examsData);
        setAvailableExamTypes([...new Set(examsData.map(e => e.type).filter(Boolean))]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      const classData = schoolInfo.classes?.find(c => c.name === selectedClass);
      setAvailableStreams(classData?.streams || []);
      setSelectedStream('');
      setSubjectConfig(getSubjectConfig(selectedClass));
    } else {
      setAvailableStreams([]);
      setSelectedStream('');
    }
  }, [selectedClass, schoolInfo]);

  useEffect(() => {
    if (selectedExamType && selectedTerm) {
      const filteredExams = exams.filter(e => e.type === selectedExamType && e.term === selectedTerm);
      const examNames = [...new Set(filteredExams.map(e => e.title))];
      setAvailableExamNames(examNames);
      setSelectedExamName('');
      setSelectedExam(null);
      setCanUploadResults(false);
      setExamNotStarted(false);
      setSelectedSubject('');
    }
  }, [selectedExamType, selectedTerm, exams]);

  const checkExamUploadDeadline = (examName, examType) => {
    const exam = exams.find(e => e.title === examName && e.type === examType);
    if (exam) {
      setSelectedExam(exam);
      const now = new Date();
      const startDateTime = new Date(exam.startDateTime);
      const endDateTime = new Date(exam.endDateTime);
      
      // 1. Check if exam hasn't started yet
      if (now < startDateTime) {
        setCanUploadResults(false);
        setExamNotStarted(true);
        setTimeRemaining(null);
        return false;
      }

      // 2. Check if exam deadline has passed
      if (now > endDateTime) {
        setCanUploadResults(false);
        setExamNotStarted(false);
        toast.error(`The submission deadline for ${examName} has passed.`);
        return false;
      }
      
      // 3. Exam is active - allow uploads
      setCanUploadResults(true);
      setExamNotStarted(false);
      
      const diffMs = endDateTime - now;
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % 3600000) / 60000);
      setTimeRemaining({ hours: diffHrs, minutes: diffMins });
      
      if (diffHrs < 1) setTimeWarning(true);
      else setTimeWarning(false);
      
      return true;
    }
    return true;
  };

  useEffect(() => {
    if (selectedExamName && selectedExamType) checkExamUploadDeadline(selectedExamName, selectedExamType);
  }, [selectedExamName, selectedExamType]);

  const filterStudents = () => {
    let filtered = [...students];
    if (selectedClass) filtered = filtered.filter(s => s.class === selectedClass);
    if (selectedStream && selectedStream !== 'all' && availableStreams.length > 1) {
      filtered = filtered.filter(s => s.stream === selectedStream);
    }
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(searchLower) || s.admNo?.toString().includes(searchTerm));
    }
    setFilteredStudents(filtered);
  };

  useEffect(() => {
    filterStudents();
  }, [selectedClass, selectedStream, searchTerm, students, availableStreams]);

  // Load Academic Results
  useEffect(() => {
    const loadExistingScores = async () => {
      if (!selectedClass || !selectedSubject || !selectedExamName || !selectedExamType || !selectedTerm) return;
      try {
        const response = await api.get('/results', {
          params: { class: selectedClass, subject: selectedSubject, examType: selectedExamType, examName: selectedExamName, term: selectedTerm, year: new Date().getFullYear() }
        });
        const existingResults = response.data?.data || [];
        const scoresMap = {};
        existingResults.forEach(r => {
          if (r.pupilId?._id || r.pupilId) {
            scoresMap[r.pupilId?._id || r.pupilId] = r.marks;
          }
        });
        setStudentScores(scoresMap);
      } catch (error) { console.error(error); }
    };
    loadExistingScores();
  }, [selectedClass, selectedSubject, selectedExamName, selectedExamType, selectedTerm]);

  // Load Skills Data when class/term changes (for the skills tab)
  useEffect(() => {
    const loadSkillsForClass = async () => {
      if (!selectedClass || !selectedTerm) return;
      try {
        const res = await api.get('/skills', {
          params: { class: selectedClass, stream: selectedStream === 'all' ? undefined : selectedStream, year: new Date().getFullYear(), term: selectedTerm }
        });
        const map = {};
        if (res.data?.success) {
          (res.data.data || []).forEach(sk => {
            const sid = sk.pupilId?._id || sk.pupilId;
            if (!map[sid]) map[sid] = [];
            map[sid].push(sk);
          });
        }
        setSkillsData(map);
      } catch (err) { console.error('Failed to load skills', err); }
    };
    loadSkillsForClass();
  }, [selectedClass, selectedStream, selectedTerm]);

  const handleScoreChange = (studentId, value) => {
    setStudentScores(prev => ({ ...prev, [studentId]: value }));
    setSaveStatus(prev => ({ ...prev, [studentId]: null }));
  };

  const handleBlurAutoSave = async (studentId, value) => {
    if (!canUploadResults) return;
    const marks = parseFloat(value);
    if (isNaN(marks) || marks < 0 || marks > 100) return;

    setSaveStatus(prev => ({ ...prev, [studentId]: 'saving' }));
    try {
      const payload = {
        pupilId: studentId, subject: selectedSubject, marks: marks,
        examType: selectedExamType, examName: selectedExamName, term: selectedTerm, year: new Date().getFullYear()
      };
      const response = await api.post('/results', payload);
      if (response.data.success) {
        setSaveStatus(prev => ({ ...prev, [studentId]: 'saved' }));
        if (saveTimeouts.current[studentId]) clearTimeout(saveTimeouts.current[studentId]);
        saveTimeouts.current[studentId] = setTimeout(() => {
          setSaveStatus(prev => { const n = { ...prev }; delete n[studentId]; return n; });
        }, 3000);
      } else {
        setSaveStatus(prev => ({ ...prev, [studentId]: 'error' }));
      }
    } catch (error) {
      setSaveStatus(prev => ({ ...prev, [studentId]: 'error' }));
    }
  };

  const handleSubmitAll = async () => {
    if (!canUploadResults) return toast.error('Cannot save. Uploads are currently disabled.');
    setSaving(true);
    const resultsToSave = [];
    for (const student of filteredStudents) {
      const score = studentScores[student._id];
      if (score && score !== '') {
        const marks = parseFloat(score);
        if (!isNaN(marks) && marks >= 0 && marks <= 100) {
          resultsToSave.push({
            pupilId: student._id, subject: selectedSubject, marks: marks,
            examType: selectedExamType, examName: selectedExamName, term: selectedTerm, year: new Date().getFullYear()
          });
        }
      }
    }
    if (resultsToSave.length === 0) { toast.error('No valid results'); setSaving(false); return; }
    try {
      const response = await api.post('/results/bulk', { results: resultsToSave });
      if (response.data.success) { toast.success('Saved successfully'); setSaveStatus({}); }
    } catch (error) { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  // ====== SKILLS CRUD ======
  const handleOpenSkillModal = (student, skill = null) => {
    setSkillTargetStudent(student);
    setEditingSkill(skill);
    if (skill) {
      setSkillForm({
        category: skill.category, skillName: skill.skill || skill.skillName, proficiency: skill.proficiency, notes: skill.notes || skill.evidence || ''
      });
    } else {
      setSkillForm({ category: '', skillName: '', proficiency: '', notes: '' });
    }
    setShowSkillModal(true);
  };

  const handleSaveSkill = async () => {
    if (!skillForm.category) return toast.error('Select category');
    if (!skillForm.skillName.trim()) return toast.error('Enter skill name');
    if (!skillForm.proficiency) return toast.error('Select proficiency');
    if (skillsConfig.requireEvidenceNotes && !skillForm.notes.trim()) return toast.error('Evidence notes required');

    try {
      const payload = {
        ...skillForm, skill: skillForm.skillName, skillName: skillForm.skillName,
        pupilId: skillTargetStudent._id, term: selectedTerm, year: new Date().getFullYear()
      };

      let res;
      if (editingSkill) res = await api.put(`/skills/${editingSkill._id}`, payload);
      else res = await api.post('/skills', payload);

      if (res.data?.success) {
        toast.success(editingSkill ? 'Skill updated' : 'Skill added');
        setShowSkillModal(false);
        
        setSkillsData(prev => {
          const existing = prev[skillTargetStudent._id] || [];
          if (editingSkill) {
            return { ...prev, [skillTargetStudent._id]: existing.map(s => s._id === editingSkill._id ? res.data.data : s) };
          } else {
            return { ...prev, [skillTargetStudent._id]: [...existing, res.data.data] };
          }
        });
      } else { toast.error(res.data?.message || 'Failed'); }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save skill'); }
  };

  const handleDeleteSkill = async (studentId, skillId) => {
    if (!window.confirm('Delete this skill?')) return;
    try {
      const res = await api.delete(`/skills/${skillId}`);
      if (res.data?.success) {
        toast.success('Skill deleted');
        setSkillsData(prev => ({
          ...prev, [studentId]: (prev[studentId] || []).filter(s => s._id !== skillId)
        }));
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  const resetFilters = () => {
    setSelectedClass(''); setSelectedStream(''); setSelectedTerm('');
    setSelectedExamType(''); setSelectedExamName(''); setSelectedSubject('');
    setSearchTerm(''); setStudentScores({}); setSelectedExam(null); setCanUploadResults(false); setSaveStatus({});
    setSkillsData({}); setExamNotStarted(false);
    toast.success('Filters reset');
  };

  const availableSubjects = subjectConfig.subjects || [];
  const classHasMultipleStreams = (className) => {
    const classData = schoolInfo.classes?.find(c => c.name === className);
    return classData?.streams && classData.streams.length > 1;
  };

  const getSubjectGridCols = () => deviceInfo.isMobile ? 'grid-cols-2' : deviceInfo.isTablet ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6';
  const getFilterGridCols = () => deviceInfo.isMobile ? 'grid-cols-1' : deviceInfo.isTablet ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5';

  if (loading) {
    return (
      <Layout title="Update Class Results" subtitle="Record learner competencies">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Update Class Results" subtitle="CBE - Record learner competencies">
      
      {/* Header */}
      <div className={`bg-gradient-to-r from-green-600 to-blue-600 rounded-xl ${deviceInfo.isMobile ? 'p-3' : 'p-4'} mb-4 text-white`}>
        <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'items-center gap-3'}`}>
          <div className="flex items-center gap-3">
            <FiBookOpen className={`${deviceInfo.isMobile ? 'w-5 h-5' : 'w-6 h-6'}`} />
            <div>
              <h2 className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-bold`}>Update Class Data</h2>
              <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} opacity-90`}>Record academic scores and co-curricular talents</p>
            </div>
          </div>
          {!deviceInfo.isMobile && (
            <button onClick={loadData} className="ml-auto bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
              <FiRefreshCw className="w-4 h-4" /> Refresh
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        <button 
          onClick={() => setActiveTab('academic')}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === 'academic' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500'}`}
        >
          <FiBookOpen className="w-4 h-4" /> Academic Results
        </button>
        <button 
          onClick={() => setActiveTab('skills')}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === 'skills' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500'}`}
        >
          <FiStar className="w-4 h-4" /> Skills & Talents
        </button>
      </div>

      {/* ======================= ACADEMIC TAB ======================= */}
      {activeTab === 'academic' && (
        <>
          {/* Alerts for Exam Status */}
          {examNotStarted && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center gap-2">
              <FiCalendar className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-blue-700 font-medium">This exam has not started yet. Results cannot be uploaded.</p>
            </div>
          )}

          {timeWarning && canUploadResults && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
              <FiAlertCircle className="w-4 h-4 text-red-600" />
              <p className="text-xs text-red-700">Only {timeRemaining?.minutes} minutes remaining!</p>
            </div>
          )}
          {canUploadResults && timeRemaining && !timeWarning && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center gap-2">
              <FiClock className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-blue-700">{timeRemaining.hours}h {timeRemaining.minutes}m remaining</p>
            </div>
          )}
          {selectedExamName && !canUploadResults && !examNotStarted && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 flex items-center gap-2">
              <FiLock className="w-4 h-4 text-gray-600" />
              <p className="text-xs text-gray-600">Submission closed. Results are read-only.</p>
            </div>
          )}

          <div className={`bg-white rounded-lg shadow-md ${responsive.cardPadding} mb-4`}>
            <h2 className={`${responsive.headingSize} font-bold text-gray-800 mb-3 flex items-center gap-2`}>
              <FiFilter className="text-green-600" /> Select Criteria
            </h2>
            <div className={`grid ${getFilterGridCols()} ${responsive.gridGap}`}>
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className={`input-field ${responsive.textSize} py-2`}>
                <option value="">Select Class</option>
                {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
              </select>
              {selectedClass && classHasMultipleStreams(selectedClass) && (
                <select value={selectedStream} onChange={(e) => setSelectedStream(e.target.value)} className={`input-field ${responsive.textSize} py-2`}>
                  <option value="">Stream</option>
                  <option value="all">All Streams</option>
                  {availableStreams.map(stream => <option key={stream} value={stream}>{stream}</option>)}
                </select>
              )}
              <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className={`input-field ${responsive.textSize} py-2`}>
                <option value="">Term</option>
                {terms.map(term => <option key={term} value={term}>{term}</option>)}
              </select>
              <select value={selectedExamType} onChange={(e) => setSelectedExamType(e.target.value)} className={`input-field ${responsive.textSize} py-2`}>
                <option value="">Exam Type</option>
                {availableExamTypes.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
              <select value={selectedExamName} onChange={(e) => setSelectedExamName(e.target.value)} className={`input-field ${responsive.textSize} py-2`} disabled={!selectedExamType}>
                <option value="">{!selectedExamType ? 'Select type first' : 'Exam Name'}</option>
                {availableExamNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
          </div>

          {selectedClass && selectedExamName && selectedExamType && selectedTerm && (
            <div className={`bg-white rounded-lg shadow-md ${responsive.cardPadding} mb-4`}>
              <h2 className={`${responsive.headingSize} font-bold text-gray-800 mb-3 flex items-center gap-2`}>
                <FiBookOpen className="text-blue-600" /> Select Subject
              </h2>
              <div className={`grid ${getSubjectGridCols()} ${responsive.gridGap}`}>
                {availableSubjects.map(subject => (
                  <button key={subject} onClick={() => setSelectedSubject(subject)}
                    className={`px-3 py-2 rounded-lg text-left transition-all ${selectedSubject === subject ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} ${deviceInfo.isMobile ? 'text-xs py-1.5 px-2' : 'text-sm py-2 px-3'}`}>
                    {subject}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedClass && selectedSubject && selectedExamName && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className={`${deviceInfo.isMobile ? 'p-2' : 'p-3'} bg-gray-50 border-b flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'justify-between items-center'}`}>
                <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2 w-full' : 'items-center gap-3'}`}>
                  <h2 className={`${deviceInfo.isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-800`}>Enter Results</h2>
                  <div className={`relative ${deviceInfo.isMobile ? 'w-full' : ''}`}>
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                    <input type="text" placeholder="Search student..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`pl-8 pr-3 py-1 border border-gray-300 rounded-lg ${deviceInfo.isMobile ? 'w-full text-base' : 'w-48 text-sm'}`} />
                  </div>
                </div>
                {canUploadResults && (
                  <button onClick={handleSubmitAll} disabled={saving} className={`bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 ${deviceInfo.isMobile ? 'w-full justify-center px-3 py-2 text-sm' : 'px-4 py-1.5 text-sm'}`}>
                    <FiSave className="w-3 h-3" /> {saving ? 'SAVING...' : 'SAVE ALL'}
                  </button>
                )}
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className={`${responsive.tablePadding} text-left text-xs font-medium text-gray-500`}>Student Name</th>
                      <th className={`${responsive.tablePadding} text-left text-xs font-medium text-gray-500`}>Adm</th>
                      <th className={`${responsive.tablePadding} text-center text-xs font-medium text-gray-500`}>Score (%)</th>
                      <th className={`${responsive.tablePadding} text-left text-xs font-medium text-gray-500`}>Competency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStudents.map((student) => {
                      const score = studentScores[student._id] || '';
                      const competency = getCompetencyFromMarks(score);
                      const status = saveStatus[student._id];
                      return (
                        <tr key={student._id} className="hover:bg-gray-50">
                          <td className={`${responsive.tablePadding} text-xs font-medium text-gray-800`}>{student.name}</td>
                          <td className={`${responsive.tablePadding} text-xs text-gray-600`}>{student.admNo}</td>
                          <td className={`${responsive.tablePadding} text-center`}>
                            <div className="relative inline-flex items-center justify-center">
                              <input type="number" min="0" max="100" value={score} onChange={(e) => handleScoreChange(student._id, e.target.value)} onBlur={(e) => handleBlurAutoSave(student._id, e.target.value)}
                                className={`${deviceInfo.isMobile ? 'w-16 text-base' : 'w-24'} px-2 py-1 text-center text-sm border border-gray-300 rounded-lg`} placeholder="-" disabled={!canUploadResults} />
                              <div className="absolute -right-5 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-4 h-4">
                                {status === 'saving' && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>}
                                {status === 'saved' && <FiCheck className="text-green-500 w-4 h-4 font-bold" />}
                                {status === 'error' && <FiAlertCircle className="text-red-500 w-4 h-4" />}
                              </div>
                            </div>
                          </td>
                          <td className={`${responsive.tablePadding} text-xs`}>
                            {competency ? <span className={`px-2 py-0.5 text-xs rounded-full ${competency.color}`}>{competency.level.split(' ')[0]}</span> : <span className="text-gray-400 text-xs">-</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ======================= SKILLS TAB ======================= */}
      {activeTab === 'skills' && (
        <>
          <div className={`bg-white rounded-lg shadow-md ${responsive.cardPadding} mb-4`}>
            <h2 className={`${responsive.headingSize} font-bold text-gray-800 mb-3 flex items-center gap-2`}>
              <FiFilter className="text-purple-600" /> Select Class & Term to Manage Skills
            </h2>
            <div className={`grid ${getFilterGridCols()} ${responsive.gridGap}`}>
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className={`input-field ${responsive.textSize} py-2`}>
                <option value="">Select Class</option>
                {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
              </select>
              {selectedClass && classHasMultipleStreams(selectedClass) && (
                <select value={selectedStream} onChange={(e) => setSelectedStream(e.target.value)} className={`input-field ${responsive.textSize} py-2`}>
                  <option value="">Stream</option>
                  <option value="all">All Streams</option>
                  {availableStreams.map(stream => <option key={stream} value={stream}>{stream}</option>)}
                </select>
              )}
              <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className={`input-field ${responsive.textSize} py-2`}>
                <option value="">Term</option>
                {terms.map(term => <option key={term} value={term}>{term}</option>)}
              </select>
            </div>
          </div>

          {selectedClass && selectedTerm && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className={`${deviceInfo.isMobile ? 'p-2' : 'p-3'} bg-gray-50 border-b flex items-center justify-between`}>
                <h2 className={`${deviceInfo.isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-800`}>
                  Skills & Talents Directory ({selectedClass})
                </h2>
                <div className={`relative ${deviceInfo.isMobile ? 'w-full mt-2' : ''}`}>
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                  <input type="text" placeholder="Search student..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`pl-8 pr-3 py-1 border border-gray-300 rounded-lg text-sm w-full md:w-64`} />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className={`${responsive.tablePadding} text-left text-xs font-medium text-gray-500`}>Student Name</th>
                      <th className={`${responsive.tablePadding} text-left text-xs font-medium text-gray-500`}>Adm</th>
                      <th className={`${responsive.tablePadding} text-left text-xs font-medium text-gray-500 w-1/2`}>Recorded Talents / Skills</th>
                      <th className={`${responsive.tablePadding} text-center text-xs font-medium text-gray-500`}>Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStudents.map((student) => {
                      const sSkills = skillsData[student._id] || [];
                      return (
                        <tr key={student._id} className="hover:bg-gray-50">
                          <td className={`${responsive.tablePadding} text-xs font-medium text-gray-800`}>{student.name}</td>
                          <td className={`${responsive.tablePadding} text-xs text-gray-600`}>{student.admNo}</td>
                          <td className={`${responsive.tablePadding} text-xs`}>
                            <div className="flex flex-wrap gap-1.5">
                              {sSkills.length === 0 ? (
                                <span className="text-gray-400 italic">No skills recorded</span>
                              ) : (
                                sSkills.map(sk => (
                                  <div key={sk._id} className="group relative bg-purple-50 border border-purple-200 rounded-lg px-2 py-1 flex flex-col">
                                    <div className="flex items-center gap-1">
                                      <span className="font-semibold text-purple-900">{sk.skill || sk.skillName}</span>
                                      <span className="text-purple-600 text-[10px] uppercase font-bold">({sk.proficiency})</span>
                                    </div>
                                    {/* Show who recorded it to avoid confusion */}
                                    <div className="text-[9px] text-gray-500 flex items-center gap-1 mt-0.5">
                                      <FiUser className="w-2.5 h-2.5" /> 
                                      {sk.recordedByName || 'Admin/Teacher'}
                                    </div>
                                    <div className="hidden group-hover:flex items-center gap-1 ml-2 absolute right-1 top-1 bg-purple-50 rounded pl-1">
                                      <button onClick={() => handleOpenSkillModal(student, sk)} className="text-blue-600 hover:text-blue-800 p-0.5" title="Edit"><FiEdit2 className="w-3 h-3" /></button>
                                      <button onClick={() => handleDeleteSkill(student._id, sk._id)} className="text-red-600 hover:text-red-800 p-0.5" title="Delete"><FiTrash2 className="w-3 h-3" /></button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </td>
                          <td className={`${responsive.tablePadding} text-center`}>
                            <button onClick={() => handleOpenSkillModal(student)} className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1">
                              <FiPlus className="w-3 h-3" /> Add Skill
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Reset Button */}
      <div className={`mt-4 flex ${deviceInfo.isMobile ? 'justify-center' : 'justify-end'}`}>
        <button onClick={resetFilters} className={`bg-gray-500 hover:bg-gray-600 text-white rounded-lg ${deviceInfo.isMobile ? 'w-full px-4 py-2.5 text-sm' : 'px-4 py-2 text-sm'}`}>
          RESET FILTERS
        </button>
      </div>

      {/* SKILL FORM MODAL */}
      {showSkillModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-2">
          <div className="bg-white rounded-xl p-5 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">{editingSkill ? 'Edit Skill' : 'Add Skill'}</h3>
              <button onClick={() => setShowSkillModal(false)} className="text-gray-500 hover:text-gray-700"><FiX className="w-5 h-5" /></button>
            </div>
            <div className="text-xs text-gray-500 mb-3">Student: <strong>{skillTargetStudent?.name}</strong></div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select value={skillForm.category} onChange={(e) => setSkillForm(prev => ({ ...prev, category: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">Select</option>
                  {(skillsConfig.categories?.length > 0 ? skillsConfig.categories.map(c => c.name) : DEFAULT_SKILL_CATEGORIES).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skill Name *</label>
                <input type="text" value={skillForm.skillName} onChange={(e) => setSkillForm(prev => ({ ...prev, skillName: e.target.value }))} placeholder="e.g., Football, Coding" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proficiency *</label>
                <select value={skillForm.proficiency} onChange={(e) => setSkillForm(prev => ({ ...prev, proficiency: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">Select</option>
                  {(skillsConfig.proficiencyLevels?.length > 0 ? skillsConfig.proficiencyLevels.map(l => l.name) : DEFAULT_PROFICIENCY_LEVELS).map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes {skillsConfig.requireEvidenceNotes && '*'}</label>
                <textarea value={skillForm.notes} onChange={(e) => setSkillForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Brief note" rows="2" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowSkillModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleSaveSkill} className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm hover:bg-purple-700">{editingSkill ? 'Update' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Competency Guide */}
      {activeTab === 'academic' && (
        <div className={`mt-4 bg-white rounded-lg shadow-md ${deviceInfo.isMobile ? 'p-2' : 'p-3'}`}>
          <h3 className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} font-semibold text-gray-700 mb-2`}>CBE Competency Levels</h3>
          <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-2 gap-1' : 'grid-cols-5 gap-2'}`}>
            {competencyLevels.map(level => (
              <div key={level.level} className="text-center">
                <span className={`px-2 py-0.5 text-xs rounded-full ${level.color}`}>{level.level.split(' ')[0]}</span>
                <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500 mt-1`}>{level.minScore}-{level.maxScore}%</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default UpdateResults;