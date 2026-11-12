// src/pages/admin/ModifyRecords.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Layout from '../common/Layout';
import toast from 'react-hot-toast';
import { 
  FiSearch, FiFilter, FiSave, FiX, FiAward, FiTarget, 
  FiBookOpen, FiFileText, FiLock, FiEdit2, FiRefreshCw,
  FiCheck, FiAlertCircle, FiStar, FiPlus, FiTrash2, FiUser,
  FiClock
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

// ===== CLASS ORDER =====
const CLASS_ORDER = [
  'Play Group', 'Pre-Primary 1', 'Pre-Primary 2',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
];

const DEFAULT_SKILL_CATEGORIES = [
  'Sports', 'Music', 'Drama', 'Art & Design', 'Leadership',
  'ICT', 'Agriculture', 'Home Science', 'Debate',
  'Community Service', 'Technical/Practical'
];
const DEFAULT_PROFICIENCY_LEVELS = [
  'Beginner', 'Developing', 'Proficient', 'Advanced', 'Exceptional'
];

const CBE_SUBJECTS_BY_GRADE = {
  'Play Group': ['Language', 'Mathematical', 'Environmental', 'Psychomotor', 'Creative'],
  'Pre-Primary 1': ['Language', 'Mathematical', 'Environmental', 'Psychomotor', 'Creative'],
  'Pre-Primary 2': ['Language', 'Mathematical', 'Environmental', 'Psychomotor', 'Creative'],
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
  'Grade 12': ['English', 'Kiswahili', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Religious Education', 'Business Studies', 'Computer Studies', 'Agriculture'],
};

const ModifyRecords = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  // Global Data
  const [learners, setLearners] = useState([]);
  const [globalResults, setGlobalResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Tabs
  const [activeTab, setActiveTab] = useState('academic');

  // Filters
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('');
  const [selectedExamName, setSelectedExamName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Available options
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableStreams, setAvailableStreams] = useState([]);
  const [availableTerms] = useState(['Term 1', 'Term 2', 'Term 3']);
  const [availableExamTypes, setAvailableExamTypes] = useState([]);
  const [availableExamNames, setAvailableExamNames] = useState([]);
  
  // Local Edits & Save Status
  const [localScores, setLocalScores] = useState({});
  const [saveStatus, setSaveStatus] = useState({}); 
  const saveTimeouts = useRef({});
  const [savingAll, setSavingAll] = useState(false);

  // Skills States
  const [skillsConfig, setSkillsConfig] = useState({ categories: [], proficiencyLevels: [], requireEvidenceNotes: false });
  const [skillsData, setSkillsData] = useState({});
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [skillTargetStudent, setSkillTargetStudent] = useState(null);
  const [editingSkill, setEditingSkill] = useState(null);
  const [skillForm, setSkillForm] = useState({ category: '', skillName: '', proficiency: '', notes: '' });

  // ===== SORTING =====
  const getClassOrder = (className) => CLASS_ORDER.indexOf(className) !== -1 ? CLASS_ORDER.indexOf(className) : 999;
  const sortClassesByOrder = (classes) => [...classes].sort((a, b) => getClassOrder(a) - getClassOrder(b));

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

  // ===== INITIAL LOAD =====
  useEffect(() => {
    loadAllData();
    loadSkillsConfig();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const schoolRes = await api.get('/school/settings');
      if (schoolRes.data?.success && schoolRes.data?.data) {
        const school = schoolRes.data.data;
        setSchoolInfo(school);
        const activeClasses = (school.classes || []).filter(c => c.isActive !== false).map(c => c.name);
        setAvailableClasses(sortClassesByOrder(activeClasses));
      }
      
      const learnersRes = await api.get('/pupils');
      if (learnersRes.data?.success) setLearners(learnersRes.data.data || []);
      
      const resultsRes = await api.get('/results');
      if (resultsRes.data?.success) setGlobalResults(resultsRes.data.data || []);
      
      const examsRes = await api.get('/exams');
      if (examsRes.data?.success) {
        const examsData = examsRes.data.data || [];
        setExams(examsData);
        setAvailableExamTypes([...new Set(examsData.map(e => e.type).filter(Boolean))]);
      }
      
      toast.success('Data loaded');
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

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
    } catch (err) { console.warn('Using default skills config'); }
  };

  // ===== DERIVED FILTER DATA (Memoized to prevent unnecessary resets) =====
  const filteredExamsByType = useMemo(() => {
    if (!selectedExamType) return [];
    return exams.filter(e => e.type === selectedExamType);
  }, [selectedExamType, exams]);

  useEffect(() => {
    setAvailableExamNames([...new Set(filteredExamsByType.map(e => e.title).filter(Boolean))]);
    // Don't reset selectedExamName unless absolutely necessary
  }, [filteredExamsByType]);

  const classHasStreams = useCallback((className) => {
    const classData = schoolInfo?.classes?.find(c => c.name === className);
    return classData?.streams && classData.streams.length > 0;
  }, [schoolInfo]);

  useEffect(() => {
    if (selectedClass) {
      const learnersInClass = learners.filter(l => l.class === selectedClass);
      const streams = [...new Set(learnersInClass.map(l => l.stream).filter(Boolean))];
      const hasStreams = classHasStreams(selectedClass);
      setAvailableStreams(hasStreams ? streams : []);
    } else {
      setAvailableStreams([]);
    }
  }, [selectedClass, learners, classHasStreams]);

  useEffect(() => {
    if (!selectedClass) {
      setAvailableSubjects([]);
      return;
    }
    const baseSubjects = CBE_SUBJECTS_BY_GRADE[selectedClass] || [];
    const examSubjects = exams.filter(e => e.class === selectedClass || e.classes?.includes(selectedClass))
                               .flatMap(e => e.subjects || []);
    const resultSubjects = globalResults.filter(r => r.pupilId?.class === selectedClass || r.class === selectedClass)
                                       .map(r => r.subject);
    const allUnique = [...new Set([...baseSubjects, ...examSubjects, ...resultSubjects])].filter(Boolean).sort();
    setAvailableSubjects(allUnique);
  }, [selectedClass, exams, globalResults]);

  // Check if exam has started
  const isExamStarted = useCallback((examType, examName, term, year) => {
    if (!examType || !examName || !term || !year) return true;
    const targetExam = exams.find(e => 
      e.type === examType && e.title === examName && e.term === term && Number(e.year) === Number(year)
    );
    if (!targetExam || !targetExam.startDateTime) return true;
    return new Date() >= new Date(targetExam.startDateTime);
  }, [exams]);

  const canEdit = isAdmin && isExamStarted(selectedExamType, selectedExamName, selectedTerm, selectedYear);

  // ===== ACTIVE RESULTS (only depends on filters, not globalResults directly) =====
  const activeResults = useMemo(() => {
    if (!selectedClass || !selectedSubject || !selectedTerm || !selectedExamName) return [];

    let filteredLearnersList = learners.filter(l => l.class === selectedClass);
    if (selectedStream && selectedStream !== 'all' && classHasStreams(selectedClass)) {
      filteredLearnersList = filteredLearnersList.filter(l => l.stream === selectedStream);
    }

    const matchingResults = globalResults.filter(r => {
      const isSameExam = (r.examName === selectedExamName) && (r.term === selectedTerm) && (Number(r.year) === Number(selectedYear));
      const isSameSubject = r.subject === selectedSubject;
      return isSameExam && isSameSubject;
    });

    const resultsMap = new Map();
    matchingResults.forEach(r => {
      const pid = r.pupilId?._id || r.pupilId;
      resultsMap.set(pid, r);
    });

    return filteredLearnersList.map(learner => {
      const existingResult = resultsMap.get(learner._id);
      return {
        _id: existingResult?._id,
        pupilId: learner._id,
        learnerName: learner.name,
        admNo: learner.admNo,
        stream: learner.stream || '',
        class: learner.class,
        marks: existingResult?.marks ?? '',
        competencyLevel: existingResult?.competencyLevel || '',
        examType: selectedExamType,
        examName: selectedExamName,
        term: selectedTerm,
        year: selectedYear
      };
    });
  }, [selectedClass, selectedSubject, selectedTerm, selectedExamName, selectedYear, selectedStream, learners, globalResults, selectedExamType, classHasStreams]);

  // SAFE: Only reset local scores when filters change (not on globalResults update)
  const filterSignature = `${selectedClass}|${selectedSubject}|${selectedTerm}|${selectedExamName}|${selectedYear}|${selectedStream}`;
  const lastFilterSignature = useRef(filterSignature);

  useEffect(() => {
    if (lastFilterSignature.current !== filterSignature) {
      lastFilterSignature.current = filterSignature;
      const initialScores = {};
      activeResults.forEach(r => {
        initialScores[r.pupilId] = r.marks;
      });
      setLocalScores(initialScores);
      setSaveStatus({});
    }
  }, [filterSignature, activeResults]);

  // ===== SAVE LOGIC =====
  const handleScoreChange = (pupilId, value) => {
    if (value === '' || value === null || value === undefined) {
      setLocalScores(prev => ({ ...prev, [pupilId]: '' }));
      setSaveStatus(prev => ({ ...prev, [pupilId]: null }));
      return;
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setLocalScores(prev => ({ ...prev, [pupilId]: numValue }));
      setSaveStatus(prev => ({ ...prev, [pupilId]: null }));
    }
  };

  const handleBlurAutoSave = async (result, value) => {
    if (!canEdit) return;
    const marks = parseFloat(value);
    if (isNaN(marks) || marks < 0 || marks > 100) return;
    if (marks === result.marks) return;

    setSaveStatus(prev => ({ ...prev, [result.pupilId]: 'saving' }));

    try {
      const competencyLevel = getCompetencyFromMarks(marks)?.level || 'Not Assessed';
      
      const resultData = {
        pupilId: result.pupilId,
        subject: selectedSubject,
        marks: marks,
        competencyLevel: competencyLevel,
        class: selectedClass,
        stream: selectedStream || result.stream || '',
        examType: selectedExamType || 'End of Term', 
        examName: selectedExamName || 'Exam',
        term: selectedTerm,
        year: parseInt(selectedYear, 10),
        updatedBy: user?.name || 'Admin'
      };

      let savedResult;
      if (result._id) {
        const res = await api.put(`/results/${result._id}`, resultData);
        savedResult = res.data?.data;
      } else {
        const res = await api.post('/results', { ...resultData, createdBy: user?.name || 'Admin' });
        savedResult = res.data?.data;
      }

      // Update global cache silently
      setGlobalResults(prev => {
        const exists = prev.find(r => r._id === (savedResult?._id || result._id));
        if (exists) return prev.map(r => r._id === exists._id ? { ...r, ...resultData } : r);
        return [...prev, { ...resultData, _id: savedResult?._id || Date.now().toString() }];
      });

      setSaveStatus(prev => ({ ...prev, [result.pupilId]: 'saved' }));

      if (saveTimeouts.current[result.pupilId]) clearTimeout(saveTimeouts.current[result.pupilId]);
      saveTimeouts.current[result.pupilId] = setTimeout(() => {
        setSaveStatus(prev => {
          const newState = { ...prev };
          if (newState[result.pupilId] === 'saved') delete newState[result.pupilId];
          return newState;
        });
      }, 3000);

    } catch (error) {
      console.error('Auto-save failed:', error);
      setSaveStatus(prev => ({ ...prev, [result.pupilId]: 'error' }));
      toast.error(`Failed to auto-save marks for ${result.learnerName}.`);
    }
  };

  const handleSaveAllChanges = async () => {
    if (!canEdit) return toast.error('Cannot save. Check permissions or exam start time.');
    setSavingAll(true);
    let savedCount = 0;
    let errorCount = 0;

    for (const result of activeResults) {
      const newMarks = localScores[result.pupilId];
      if (newMarks === result.marks || newMarks === '') continue;
      
      const marks = parseFloat(newMarks);
      if (isNaN(marks) || marks < 0 || marks > 100) continue;

      try {
        const competencyLevel = getCompetencyFromMarks(marks)?.level || 'Not Assessed';
        const resultData = {
          pupilId: result.pupilId, subject: selectedSubject, marks, competencyLevel,
          class: selectedClass, stream: selectedStream || result.stream || '',
          examType: selectedExamType || 'End of Term', examName: selectedExamName || 'Exam',
          term: selectedTerm, year: parseInt(selectedYear, 10), updatedBy: user?.name || 'Admin'
        };

        if (result._id) await api.put(`/results/${result._id}`, resultData);
        else await api.post('/results', { ...resultData, createdBy: user?.name || 'Admin' });
        savedCount++;
      } catch (error) { errorCount++; }
    }

    if (savedCount > 0) {
      toast.success(`Saved ${savedCount} result(s)`);
      await handleRefresh();
    } else if (errorCount > 0) {
      toast.error(`Failed to save ${errorCount} result(s)`);
    } else {
      toast('No changes to save');
    }
    setSavingAll(false);
  };

  // ===== SKILLS =====
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

  useEffect(() => {
    if (activeTab === 'skills') loadSkillsForClass();
  }, [activeTab, selectedClass, selectedStream, selectedTerm]);

  const handleOpenSkillModal = (student, skill = null) => {
    setSkillTargetStudent(student);
    setEditingSkill(skill);
    if (skill) {
      setSkillForm({ category: skill.category, skillName: skill.skill || skill.skillName, proficiency: skill.proficiency, notes: skill.notes || skill.evidence || '' });
    } else {
      setSkillForm({ category: '', skillName: '', proficiency: '', notes: '' });
    }
    setShowSkillModal(true);
  };

  const handleSaveSkill = async () => {
    if (!skillForm.category) return toast.error('Select category');
    if (!skillForm.skillName.trim()) return toast.error('Enter skill name');
    if (!skillForm.proficiency) return toast.error('Select proficiency');

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
          if (editingSkill) return { ...prev, [skillTargetStudent._id]: existing.map(s => s._id === editingSkill._id ? res.data.data : s) };
          return { ...prev, [skillTargetStudent._id]: [...existing, res.data.data] };
        });
      } else { toast.error(res.data?.message || 'Failed'); }
    } catch (err) { toast.error('Failed to save skill'); }
  };

  const handleDeleteSkill = async (studentId, skillId) => {
    if (!window.confirm('Delete this skill?')) return;
    try {
      const res = await api.delete(`/skills/${skillId}`);
      if (res.data?.success) {
        toast.success('Skill deleted');
        setSkillsData(prev => ({ ...prev, [studentId]: (prev[studentId] || []).filter(s => s._id !== skillId) }));
      }
    } catch (err) { toast.error('Failed to delete'); }
  };

  const resetFilters = () => {
    setSelectedClass(''); setSelectedSubject(''); setSelectedStream('');
    setSelectedTerm(''); setSelectedExamType(''); setSelectedExamName('');
    setSearchTerm('');
  };

  const filteredBySearch = activeResults.filter(r => 
    searchTerm === '' || r.learnerName?.toLowerCase().includes(searchTerm.toLowerCase()) || r.admNo?.toString().includes(searchTerm)
  );

  const filteredLearnersForSkills = learners.filter(l => {
    if (selectedClass && l.class !== selectedClass) return false;
    if (selectedStream && selectedStream !== 'all' && l.stream !== selectedStream) return false;
    if (searchTerm) return l.name?.toLowerCase().includes(searchTerm.toLowerCase()) || l.admNo?.toString().includes(searchTerm);
    return true;
  });

  const years = [2023, 2024, 2025, 2026, 2027];

  return (
    <Layout title="Modify Class Results" subtitle="Edit or update student assessment results">
      
      <div className="flex justify-end mb-4">
        <button onClick={handleRefresh} disabled={refreshing} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50">
          <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {!isAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <FiLock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div><h3 className="font-semibold text-blue-800">View Only Mode</h3><p className="text-sm text-blue-700">Only administrators can edit results and skills.</p></div>
        </div>
      )}

      {isAdmin && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <FiAward className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div><h3 className="font-semibold text-green-800">Administrator Access</h3><p className="text-sm text-green-700">Changes save automatically when you click away. However, you cannot edit marks before the exam has started.</p></div>
        </div>
      )}

      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-5 mb-6 text-white">
        <div className="flex items-center gap-3">
          <FiEdit2 className="w-8 h-8" />
          <div><h2 className="text-xl font-bold">Modify Class Data</h2><p className="text-sm opacity-90">Select criteria to instantly edit scores or talents</p></div>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-4">
        <button onClick={() => setActiveTab('academic')} className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === 'academic' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500'}`}>
          <FiBookOpen className="w-4 h-4" /> Academic Results
        </button>
        <button onClick={() => setActiveTab('skills')} className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === 'skills' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500'}`}>
          <FiStar className="w-4 h-4" /> Skills & Talents
        </button>
      </div>

      {activeTab === 'academic' && (
        <>
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FiFilter className="text-green-600" /> Select Criteria
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="input-field text-sm py-2">
                {years.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
              
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="input-field text-sm py-2">
                <option value="">Select Class</option>
                {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
              </select>
              
              {selectedClass && classHasStreams(selectedClass) && (
                <select value={selectedStream} onChange={(e) => setSelectedStream(e.target.value)} className="input-field text-sm py-2">
                  <option value="">All Streams</option>
                  {availableStreams.map(stream => <option key={stream} value={stream}>{stream}</option>)}
                </select>
              )}
              
              <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className="input-field text-sm py-2">
                <option value="">Term</option>
                {availableTerms.map(term => <option key={term} value={term}>{term}</option>)}
              </select>
              
              <select value={selectedExamType} onChange={(e) => setSelectedExamType(e.target.value)} className="input-field text-sm py-2">
                <option value="">Exam Type</option>
                {availableExamTypes.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
              
              <select value={selectedExamName} onChange={(e) => setSelectedExamName(e.target.value)} className="input-field text-sm py-2" disabled={!selectedExamType}>
                <option value="">{!selectedExamType ? 'Select type first' : 'Exam Name'}</option>
                {availableExamNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
              
              <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="input-field text-sm py-2" disabled={!selectedClass}>
                <option value="">Select Subject</option>
                {availableSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
            </div>
            
            <div className="flex gap-3 mt-4">
              <button onClick={resetFilters} className="bg-gray-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-600">RESET FILTERS</button>
            </div>
          </div>

          {selectedExamName && !canEdit && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 flex items-center gap-3">
              <FiClock className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-yellow-800 font-medium">
                The exam <strong>{selectedExamName}</strong> has not started yet. You can view but cannot edit results until {new Date(exams.find(e => e.title === selectedExamName)?.startDateTime).toLocaleString()}.
              </p>
            </div>
          )}

          {!loading && activeResults.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-3 mb-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search by name or admission..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          )}

          {!loading && activeResults.length > 0 && filteredBySearch.length > 0 && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-3 bg-gray-50 border-b flex justify-between items-center flex-wrap gap-2">
                <h3 className="font-semibold text-gray-800">
                  {selectedClass} - {selectedSubject} ({filteredBySearch.length} students)
                  {selectedStream && selectedStream !== 'all' && ` | Stream: ${selectedStream}`}
                  {selectedTerm && ` | ${selectedTerm}`}
                  {selectedExamName && ` | ${selectedExamName}`}
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">#</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Admission No</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Stream</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-36">Score (%)</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Competency Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredBySearch.map((result, index) => {
                      const currentScore = localScores[result.pupilId] !== undefined ? localScores[result.pupilId] : result.marks;
                      const competency = getCompetencyFromMarks(currentScore);
                      const status = saveStatus[result.pupilId];
                      
                      return (
                        <tr key={result.pupilId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-800">{result.learnerName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{result.admNo}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{result.stream || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="relative inline-flex items-center justify-center">
                              <input
                                type="number" min="0" max="100" step="1"
                                value={currentScore}
                                onChange={(e) => handleScoreChange(result.pupilId, e.target.value)}
                                onBlur={(e) => handleBlurAutoSave(result, e.target.value)}
                                className={`w-24 px-3 py-1.5 text-center text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${!canEdit ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                                placeholder="-"
                                disabled={!canEdit}
                              />
                              <div className="absolute -right-6 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                                {status === 'saving' && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>}
                                {status === 'saved' && <FiCheck className="text-green-500 w-5 h-5 font-bold" />}
                                {status === 'error' && <FiAlertCircle className="text-red-500 w-5 h-5" />}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {competency ? (
                              <span className={`px-2 py-1 text-xs rounded-full ${competency.color}`}>{competency.level}</span>
                            ) : (
                              <span className="text-gray-400 text-sm">Enter score</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {canEdit && filteredBySearch.length > 0 && (
                <div className="p-4 bg-gray-50 border-t flex justify-between items-center flex-wrap gap-2">
                  <div className="text-xs text-gray-500">Auto-save is active. Use this button as a failsafe.</div>
                  <button onClick={handleSaveAllChanges} disabled={savingAll} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
                    <FiSave className="w-4 h-4" /> {savingAll ? 'SAVING ALL...' : 'SAVE ALL CHANGES'}
                  </button>
                </div>
              )}
            </div>
          )}

          {!loading && (!selectedClass || !selectedSubject || !selectedTerm || !selectedExamName) && (
             <div className="bg-blue-50 rounded-xl p-8 text-center border border-blue-100">
               <FiFilter className="w-12 h-12 text-blue-400 mx-auto mb-3" />
               <p className="text-gray-600">Select Class, Term, Exam and Subject above to instantly view and edit scores.</p>
             </div>
          )}

          {!loading && selectedClass && selectedSubject && selectedTerm && selectedExamName && activeResults.length === 0 && (
            <div className="bg-yellow-50 rounded-xl p-8 text-center">
              <FiFileText className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
              <p className="text-gray-600">No learners found for the selected criteria.</p>
            </div>
          )}

          <div className="mt-6 bg-white rounded-lg shadow-md p-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">CBE Competency Levels Guide</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {competencyLevels.map(level => (
                <div key={level.level} className="text-center">
                  <span className={`px-3 py-1 text-xs rounded-full ${level.color}`}>{level.level}</span>
                  <p className="text-xs text-gray-500 mt-1">{level.minScore}-{level.maxScore}%</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'skills' && (
        <>
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FiFilter className="text-purple-600" /> Select Class & Term to Manage Skills
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="input-field text-sm py-2">
                <option value="">Select Class</option>
                {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
              </select>
              {selectedClass && classHasStreams(selectedClass) && (
                <select value={selectedStream} onChange={(e) => setSelectedStream(e.target.value)} className="input-field text-sm py-2">
                  <option value="">All Streams</option>
                  {availableStreams.map(stream => <option key={stream} value={stream}>{stream}</option>)}
                </select>
              )}
              <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className="input-field text-sm py-2">
                <option value="">Term</option>
                {availableTerms.map(term => <option key={term} value={term}>{term}</option>)}
              </select>
            </div>
          </div>

          {selectedClass && selectedTerm && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-800">Skills & Talents Directory ({selectedClass})</h2>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                  <input type="text" placeholder="Search student..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 pr-3 py-1 border border-gray-300 rounded-lg text-sm w-full md:w-64" />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Student Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Adm</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 w-1/2">Recorded Talents / Skills</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLearnersForSkills.map((student) => {
                      const sSkills = skillsData[student._id] || [];
                      return (
                        <tr key={student._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-xs font-medium text-gray-800">{student.name}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{student.admNo}</td>
                          <td className="px-4 py-3 text-xs">
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
                                    <div className="text-[9px] text-gray-500 flex items-center gap-1 mt-0.5">
                                      <FiUser className="w-2.5 h-2.5" /> {sk.recordedByName || 'Admin/Teacher'}
                                    </div>
                                    <div className="hidden group-hover:flex items-center gap-1 ml-2 absolute right-1 top-1 bg-purple-50 rounded pl-1">
                                      <button onClick={() => handleOpenSkillModal(student, sk)} className="text-blue-600 hover:text-blue-800 p-0.5"><FiEdit2 className="w-3 h-3" /></button>
                                      <button onClick={() => handleDeleteSkill(student._id, sk._id)} className="text-red-600 hover:text-red-800 p-0.5"><FiTrash2 className="w-3 h-3" /></button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
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
    </Layout>
  );
};

export default ModifyRecords;