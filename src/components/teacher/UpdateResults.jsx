import React, { useState, useEffect } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
  FiSearch, FiFilter, FiSave, FiBookOpen, 
  FiClock, FiAlertCircle, FiLock, FiMonitor, 
  FiSmartphone, FiTablet, FiRefreshCw
} from 'react-icons/fi';

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
    buttonSize: deviceInfo.isMobile ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm',
    gridGap: deviceInfo.isMobile ? 'gap-1.5' : 'gap-3',
    tablePadding: deviceInfo.isMobile ? 'px-2 py-1.5' : 'px-4 py-2'
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

// ===== Subject Configuration =====
const getSubjectConfig = (className) => {
  const config = {
    'Play Group': {
      subjects: ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Psychomotor and Creative Activities'],
      streamRequired: false
    },
    'Pre-Primary 1': {
      subjects: ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Psychomotor and Creative Activities'],
      streamRequired: false
    },
    'Pre-Primary 2': {
      subjects: ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Psychomotor and Creative Activities'],
      streamRequired: false
    },
    'Grade 1': {
      subjects: ['English', 'Kiswahili', 'Mathematics', 'Environmental Activities', 'Hygiene and Nutrition', 'Religious Education', 'Creative Arts'],
      streamRequired: false
    },
    'Grade 2': {
      subjects: ['English', 'Kiswahili', 'Mathematics', 'Environmental Activities', 'Hygiene and Nutrition', 'Religious Education', 'Creative Arts'],
      streamRequired: false
    },
    'Grade 3': {
      subjects: ['English', 'Kiswahili', 'Mathematics', 'Environmental Activities', 'Hygiene and Nutrition', 'Religious Education', 'Creative Arts'],
      streamRequired: false
    },
    'Grade 4': {
      subjects: ['English', 'Kiswahili', 'Mathematics', 'Science and Technology', 'Social Studies', 'Religious Education', 'Creative Arts', 'Physical and Health Education'],
      streamRequired: false
    },
    'Grade 5': {
      subjects: ['English', 'Kiswahili', 'Mathematics', 'Science and Technology', 'Social Studies', 'Religious Education', 'Creative Arts', 'Physical and Health Education', 'Agriculture and Nutrition'],
      streamRequired: false
    },
    'Grade 6': {
      subjects: ['English', 'Kiswahili', 'Mathematics', 'Science and Technology', 'Social Studies', 'Religious Education', 'Creative Arts', 'Physical and Health Education', 'Agriculture and Nutrition'],
      streamRequired: false
    },
    'Grade 7': {
      subjects: ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Health Education', 'Pre-Technical Studies', 'Social Studies', 'Religious Education', 'Creative Arts and Sports', 'Business Studies', 'Agriculture', 'Computer Science'],
      streamRequired: true
    },
    'Grade 8': {
      subjects: ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Health Education', 'Pre-Technical Studies', 'Social Studies', 'Religious Education', 'Creative Arts and Sports', 'Business Studies', 'Agriculture', 'Computer Science'],
      streamRequired: true
    },
    'Grade 9': {
      subjects: ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Health Education', 'Pre-Technical Studies', 'Social Studies', 'Religious Education', 'Creative Arts and Sports', 'Business Studies', 'Agriculture', 'Computer Science'],
      streamRequired: true
    },
    'Grade 10': {
      subjects: ['English', 'Kiswahili', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Religious Education', 'Business Studies', 'Computer Studies', 'Agriculture'],
      streamRequired: true
    },
    'Grade 11': {
      subjects: ['English', 'Kiswahili', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Religious Education', 'Business Studies', 'Computer Studies', 'Agriculture'],
      streamRequired: true
    },
    'Grade 12': {
      subjects: ['English', 'Kiswahili', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Religious Education', 'Business Studies', 'Computer Studies', 'Agriculture'],
      streamRequired: true
    }
  };
  
  return config[className] || { subjects: [], streamRequired: false };
};

const UpdateResults = () => {
  // AI Device Detection
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
  
  const [schoolInfo, setSchoolInfo] = useState({
    name: '',
    classes: [],
    streams: []
  });
  
  // Filter states
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('');
  const [selectedExamName, setSelectedExamName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [studentScores, setStudentScores] = useState({});
  const [saving, setSaving] = useState(false);
  
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

  const checkExamUploadDeadline = (examName, examType) => {
    const exam = exams.find(e => e.title === examName && e.type === examType);
    if (exam) {
      setSelectedExam(exam);
      const now = new Date();
      const endDateTime = new Date(exam.endDateTime);
      if (now > endDateTime) {
        setCanUploadResults(false);
        toast.error(`The submission deadline for ${examName} has passed.`);
        return false;
      }
      setCanUploadResults(true);
      const diffMs = endDateTime - now;
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % 3600000) / 60000);
      setTimeRemaining({ hours: diffHrs, minutes: diffMins });
      if (diffHrs < 1) setTimeWarning(true);
      return true;
    }
    return true;
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
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load school info from database
      const schoolResponse = await api.get('/school/settings');
      if (schoolResponse.data.success && schoolResponse.data.data) {
        const school = schoolResponse.data.data;
        setSchoolInfo(school);
        
        // Get active classes from database configuration
        const activeClassNames = (school.classes || [])
          .filter(c => c.isActive !== false)
          .map(c => c.name);
        
        // Sort classes from lowest to highest
        const sortedClasses = sortClassesByOrder(activeClassNames);
        setAvailableClasses(sortedClasses);
        
        // If no classes configured, use fallback
        if (sortedClasses.length === 0) {
          const fallbackClasses = ['Play Group', 'Pre-Primary 1', 'Pre-Primary 2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'];
          setAvailableClasses(sortClassesByOrder(fallbackClasses));
        }
      } else {
        // Fallback if school info not found
        const fallbackClasses = ['Play Group', 'Pre-Primary 1', 'Pre-Primary 2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'];
        setAvailableClasses(sortClassesByOrder(fallbackClasses));
      }
      
      // Load students
      const studentsRes = await api.get('/pupils');
      setStudents(studentsRes.data?.data || []);
      setFilteredStudents(studentsRes.data?.data || []);
      
      // Load exams
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
      
      // Fallback data if API fails
      const fallbackClasses = ['Play Group', 'Pre-Primary 1', 'Pre-Primary 2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'];
      setAvailableClasses(sortClassesByOrder(fallbackClasses));
      
      // Try to load from localStorage as fallback
      try {
        const storedSchool = localStorage.getItem('schoolInfo');
        if (storedSchool) {
          const school = JSON.parse(storedSchool);
          setSchoolInfo(school);
          const activeClassNames = (school.classes || [])
            .filter(c => c.isActive !== false)
            .map(c => c.name);
          if (activeClassNames.length > 0) {
            setAvailableClasses(sortClassesByOrder(activeClassNames));
          }
        }
      } catch (e) {
        console.error('Error loading from localStorage:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  // Update streams when class changes using database configuration
  useEffect(() => {
    if (selectedClass) {
      const classData = schoolInfo.classes?.find(c => c.name === selectedClass);
      const streams = classData?.streams || [];
      
      // Only show streams if there are multiple streams configured
      setAvailableStreams(streams);
      setSelectedStream('');
      
      // Update subject configuration based on selected class
      const config = getSubjectConfig(selectedClass);
      setSubjectConfig(config);
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
      setSelectedSubject('');
    }
  }, [selectedExamType, selectedTerm, exams]);

  useEffect(() => {
    if (selectedExamName && selectedExamType) {
      checkExamUploadDeadline(selectedExamName, selectedExamType);
    }
  }, [selectedExamName, selectedExamType]);

  useEffect(() => {
    if (!canUploadResults || !selectedExam) return;
    const timer = setInterval(() => {
      const now = new Date();
      const endDateTime = new Date(selectedExam.endDateTime);
      const diffMs = endDateTime - now;
      if (diffMs <= 0) {
        setCanUploadResults(false);
        setTimeRemaining(null);
        setTimeWarning(false);
        toast.error('Submission deadline has passed!');
        clearInterval(timer);
      } else {
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % 3600000) / 60000);
        setTimeRemaining({ hours: diffHrs, minutes: diffMins });
        setTimeWarning(diffHrs < 1);
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [canUploadResults, selectedExam]);

  const filterStudents = () => {
    let filtered = [...students];
    if (selectedClass) filtered = filtered.filter(s => s.class === selectedClass);
    if (selectedStream && selectedStream !== 'all' && availableStreams.length > 1) {
      filtered = filtered.filter(s => s.stream === selectedStream);
    }
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchLower) || s.admNo?.toString().includes(searchTerm)
      );
    }
    setFilteredStudents(filtered);
  };

  useEffect(() => {
    filterStudents();
  }, [selectedClass, selectedStream, searchTerm, students, availableStreams]);

  // Load existing scores when subject changes
  useEffect(() => {
    const loadExistingScores = async () => {
      if (!selectedClass || !selectedSubject || !selectedExamName || !selectedExamType || !selectedTerm) return;
      
      try {
        const response = await api.get('/results', {
          params: {
            class: selectedClass,
            subject: selectedSubject,
            examType: selectedExamType,
            examName: selectedExamName,
            term: selectedTerm,
            year: new Date().getFullYear()
          }
        });
        
        const existingResults = response.data?.data || [];
        const scoresMap = {};
        existingResults.forEach(r => {
          if (r.pupilId?._id || r.pupilId) {
            const pupilId = r.pupilId?._id || r.pupilId;
            scoresMap[pupilId] = r.marks;
          }
        });
        setStudentScores(scoresMap);
      } catch (error) {
        console.error('Error loading existing scores:', error);
      }
    };
    
    loadExistingScores();
  }, [selectedClass, selectedSubject, selectedExamName, selectedExamType, selectedTerm]);

  const handleScoreChange = (studentId, value) => {
    setStudentScores(prev => ({ ...prev, [studentId]: value }));
  };

  const handleSubmitAll = async () => {
    if (!canUploadResults) {
      toast.error('Cannot save results. Submission deadline has passed.');
      return;
    }
    
    setSaving(true);
    
    const resultsToSave = [];
    for (const student of filteredStudents) {
      const score = studentScores[student._id];
      if (score && score !== '') {
        const marks = parseFloat(score);
        if (!isNaN(marks) && marks >= 0 && marks <= 100) {
          resultsToSave.push({
            pupilId: student._id,
            subject: selectedSubject,
            marks: marks,
            examType: selectedExamType,
            examName: selectedExamName,
            term: selectedTerm,
            year: new Date().getFullYear(),
            teacherNotes: ''
          });
        }
      }
    }
    
    if (resultsToSave.length === 0) {
      toast.error('No valid results to save');
      setSaving(false);
      return;
    }
    
    try {
      const response = await api.post('/results/bulk', { results: resultsToSave });
      if (response.data.success) {
        toast.success(response.data.message);
      } else {
        toast.error('Some results failed to save');
      }
    } catch (error) {
      console.error('Error saving results:', error);
      toast.error(error.response?.data?.message || 'Failed to save results');
    } finally {
      setSaving(false);
    }
  };

  const resetFilters = () => {
    setSelectedClass('');
    setSelectedStream('');
    setSelectedTerm('');
    setSelectedExamType('');
    setSelectedExamName('');
    setSelectedSubject('');
    setSearchTerm('');
    setStudentScores({});
    setSelectedExam(null);
    setCanUploadResults(false);
    toast.success('Filters reset');
  };

  const availableSubjects = subjectConfig.subjects || [];

  // Check if a class has streams (more than 1 stream)
  const classHasMultipleStreams = (className) => {
    const classData = schoolInfo.classes?.find(c => c.name === className);
    return classData?.streams && classData.streams.length > 1;
  };

  // Get grid columns based on device
  const getSubjectGridCols = () => {
    if (deviceInfo.isMobile) return 'grid-cols-2';
    if (deviceInfo.isTablet) return 'grid-cols-3';
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6';
  };

  // Get filter grid columns
  const getFilterGridCols = () => {
    if (deviceInfo.isMobile) return 'grid-cols-1';
    if (deviceInfo.isTablet) return 'grid-cols-2';
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5';
  };

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
      {/* Header - AI Responsive */}
      <div className={`bg-gradient-to-r from-green-600 to-blue-600 rounded-xl ${deviceInfo.isMobile ? 'p-3' : 'p-4'} mb-4 text-white`}>
        <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'items-center gap-3'}`}>
          <div className="flex items-center gap-3">
            <FiBookOpen className={`${deviceInfo.isMobile ? 'w-5 h-5' : 'w-6 h-6'}`} />
            <div>
              <h2 className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'} font-bold`}>Update Class Results</h2>
              <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} opacity-90`}>
                Select criteria and enter student assessment scores
              </p>
            </div>
          </div>
          {!deviceInfo.isMobile && (
            <button 
              onClick={loadData} 
              className="ml-auto bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2"
            >
              <FiRefreshCw className="w-4 h-4" /> Refresh
            </button>
          )}
        </div>
        {deviceInfo.isMobile && (
          <button 
            onClick={loadData} 
            className="mt-2 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 w-full justify-center"
          >
            <FiRefreshCw className="w-4 h-4" /> Refresh Data
          </button>
        )}
      </div>

      {/* Time Warning */}
      {timeWarning && canUploadResults && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
          <FiAlertCircle className={`${deviceInfo.isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-red-600 flex-shrink-0`} />
          <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-red-700`}>
            Only {timeRemaining?.minutes} minutes remaining!
          </p>
        </div>
      )}

      {canUploadResults && timeRemaining && !timeWarning && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center gap-2">
          <FiClock className={`${deviceInfo.isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-blue-600 flex-shrink-0`} />
          <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-blue-700`}>
            {timeRemaining.hours}h {timeRemaining.minutes}m remaining
          </p>
        </div>
      )}

      {selectedExamName && !canUploadResults && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 flex items-center gap-2">
          <FiLock className={`${deviceInfo.isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-gray-600 flex-shrink-0`} />
          <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>
            Submission closed. Results are read-only.
          </p>
        </div>
      )}

      {/* Select Criteria - AI Responsive */}
      <div className={`bg-white rounded-lg shadow-md ${responsive.cardPadding} mb-4`}>
        <h2 className={`${responsive.headingSize} font-bold text-gray-800 mb-3 flex items-center gap-2`}>
          <FiFilter className="text-green-600" /> Select Criteria
        </h2>
        <div className={`grid ${getFilterGridCols()} ${responsive.gridGap}`}>
          <select 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value)} 
            className={`input-field ${responsive.textSize} py-2 ${deviceInfo.isMobile ? 'text-base' : ''}`}
          >
            <option value="">Select Class</option>
            {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
          </select>
          
          {/* Only show Stream dropdown if class has MORE than 1 stream */}
          {selectedClass && classHasMultipleStreams(selectedClass) && (
            <select 
              value={selectedStream} 
              onChange={(e) => setSelectedStream(e.target.value)} 
              className={`input-field ${responsive.textSize} py-2 ${deviceInfo.isMobile ? 'text-base' : ''}`}
            >
              <option value="">Stream</option>
              <option value="all">All Streams</option>
              {availableStreams.map(stream => <option key={stream} value={stream}>{stream}</option>)}
            </select>
          )}
          
          <select 
            value={selectedTerm} 
            onChange={(e) => setSelectedTerm(e.target.value)} 
            className={`input-field ${responsive.textSize} py-2 ${deviceInfo.isMobile ? 'text-base' : ''}`}
          >
            <option value="">Term</option>
            {terms.map(term => <option key={term} value={term}>{term}</option>)}
          </select>
          
          <select 
            value={selectedExamType} 
            onChange={(e) => setSelectedExamType(e.target.value)} 
            className={`input-field ${responsive.textSize} py-2 ${deviceInfo.isMobile ? 'text-base' : ''}`}
          >
            <option value="">Exam Type</option>
            {availableExamTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
            {availableExamTypes.length === 0 && (
              <option value="" disabled>No exam types scheduled</option>
            )}
          </select>
          
          <select 
            value={selectedExamName} 
            onChange={(e) => setSelectedExamName(e.target.value)} 
            className={`input-field ${responsive.textSize} py-2 ${deviceInfo.isMobile ? 'text-base' : ''}`}
            disabled={!selectedExamType}
          >
            <option value="">{!selectedExamType ? 'Select exam type first' : 'Exam Name'}</option>
            {availableExamNames.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
      </div>

      {/* Select Subject - AI Responsive */}
      {selectedClass && selectedExamName && selectedExamType && selectedTerm && (
        <div className={`bg-white rounded-lg shadow-md ${responsive.cardPadding} mb-4`}>
          <h2 className={`${responsive.headingSize} font-bold text-gray-800 mb-3 flex items-center gap-2`}>
            <FiBookOpen className="text-blue-600" /> Select Subject
          </h2>
          <div className={`grid ${getSubjectGridCols()} ${responsive.gridGap}`}>
            {availableSubjects.map(subject => (
              <button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                className={`px-3 py-2 rounded-lg text-left transition-all ${
                  selectedSubject === subject
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${deviceInfo.isMobile ? 'text-xs py-1.5 px-2' : 'text-sm py-2 px-3'}`}
              >
                {subject}
              </button>
            ))}
            {availableSubjects.length === 0 && (
              <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-500 col-span-full text-center py-4`}>
                No subjects configured for {selectedClass}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Results Entry Table - AI Responsive */}
      {selectedClass && selectedSubject && selectedExamName && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className={`${deviceInfo.isMobile ? 'p-2' : 'p-3'} bg-gray-50 border-b flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'justify-between items-center'}`}>
            <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2 w-full' : 'items-center gap-3'}`}>
              <h2 className={`${deviceInfo.isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-800`}>
                Enter Results
              </h2>
              <div className={`relative ${deviceInfo.isMobile ? 'w-full' : ''}`}>
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                <input 
                  type="text" 
                  placeholder={deviceInfo.isMobile ? "Search..." : "Search student..."} 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className={`pl-8 pr-3 py-1 border border-gray-300 rounded-lg ${deviceInfo.isMobile ? 'w-full text-base' : 'w-48 text-sm'}`} 
                />
              </div>
            </div>
            {canUploadResults && (
              <button 
                onClick={handleSubmitAll} 
                disabled={saving}
                className={`bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 ${
                  deviceInfo.isMobile ? 'w-full justify-center px-3 py-2 text-sm' : 'px-4 py-1.5 text-sm'
                }`}
              >
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
                  <th className={`${responsive.tablePadding} text-center text-xs font-medium text-gray-500 ${deviceInfo.isMobile ? 'w-16' : 'w-28'}`}>Score (%)</th>
                  <th className={`${responsive.tablePadding} text-left text-xs font-medium text-gray-500`}>Competency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                      No students found in {selectedClass}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const score = studentScores[student._id] || '';
                    const competency = getCompetencyFromMarks(score);
                    return (
                      <tr key={student._id} className="hover:bg-gray-50">
                        <td className={`${responsive.tablePadding} text-xs font-medium text-gray-800`}>
                          {student.name}
                        </td>
                        <td className={`${responsive.tablePadding} text-xs text-gray-600`}>
                          {student.admNo}
                        </td>
                        <td className={`${responsive.tablePadding} text-center`}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={score}
                            onChange={(e) => handleScoreChange(student._id, e.target.value)}
                            className={`${deviceInfo.isMobile ? 'w-16 text-base' : 'w-24'} px-2 py-1 text-center text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500`}
                            placeholder="-"
                            disabled={!canUploadResults}
                          />
                        </td>
                        <td className={`${responsive.tablePadding} text-xs`}>
                          {competency ? (
                            <span className={`px-2 py-0.5 text-xs rounded-full ${competency.color}`}>
                              {deviceInfo.isMobile ? competency.level.split(' ')[0] : competency.level.split(' ')[0]}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Competency Guide - AI Responsive */}
      <div className={`mt-4 bg-white rounded-lg shadow-md ${deviceInfo.isMobile ? 'p-2' : 'p-3'}`}>
        <h3 className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} font-semibold text-gray-700 mb-2`}>
          CBE Competency Levels
        </h3>
        <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-2 gap-1' : 'grid-cols-5 gap-2'}`}>
          {competencyLevels.map(level => (
            <div key={level.level} className="text-center">
              <span className={`px-2 py-0.5 text-xs rounded-full ${level.color}`}>
                {deviceInfo.isMobile ? level.level.split(' ')[0] : level.level.split(' ')[0]}
              </span>
              <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500 mt-1`}>
                {level.minScore}-{level.maxScore}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Reset Button - AI Responsive */}
      <div className={`mt-4 flex ${deviceInfo.isMobile ? 'justify-center' : 'justify-end'}`}>
        <button 
          onClick={resetFilters} 
          className={`bg-gray-500 hover:bg-gray-600 text-white rounded-lg ${deviceInfo.isMobile ? 'w-full px-4 py-2.5 text-sm' : 'px-4 py-2 text-sm'}`}
        >
          RESET FILTERS
        </button>
      </div>

      {/* AI Responsive CSS */}
      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-view .input-field {
            font-size: 16px !important;
          }
          .mobile-view input, .mobile-view select {
            font-size: 16px !important;
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

export default UpdateResults;