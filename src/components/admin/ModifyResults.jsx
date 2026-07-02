import React, { useState, useEffect } from 'react';
import Layout from '../common/Layout';
import toast from 'react-hot-toast';
import { 
  FiSearch, FiFilter, FiSave, FiX, FiAward, FiTarget, 
  FiBookOpen, FiFileText, FiLock, FiEdit2, FiRefreshCw
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const ModifyRecords = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [learners, setLearners] = useState([]);
  const [results, setResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState(null);
  
  // Filter states
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
  const [availableTerms, setAvailableTerms] = useState(['Term 1', 'Term 2', 'Term 3']);
  const [availableExamTypes, setAvailableExamTypes] = useState([]);
  const [availableExamNames, setAvailableExamNames] = useState([]);
  
  // Results state
  const [filteredResults, setFilteredResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Track changes locally
  const [localScores, setLocalScores] = useState({});

  // CBE Subjects by Grade Level - INCLUDING PLAY GROUP (PG)
  const subjectsByGrade = {
    // Early Years Education (Play Group / Pre-Primary)
    'PG': ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Psychomotor and Creative Activities', 'Religious Education Activities', 'Social Skills'],
    'Play Group': ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Psychomotor and Creative Activities', 'Religious Education Activities', 'Social Skills'],
    'PP1': ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Psychomotor and Creative Activities', 'Religious Education Activities'],
    'PP2': ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Psychomotor and Creative Activities', 'Religious Education Activities'],
    'Pre-Primary 1': ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Psychomotor and Creative Activities', 'Religious Education Activities'],
    'Pre-Primary 2': ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Psychomotor and Creative Activities', 'Religious Education Activities'],
    
    // Lower Primary (Grade 1-3)
    'Grade 1': ['English', 'Kiswahili', 'Mathematics', 'Environmental Activities', 'Hygiene and Nutrition', 'Religious Education', 'Creative Arts'],
    'Grade 2': ['English', 'Kiswahili', 'Mathematics', 'Environmental Activities', 'Hygiene and Nutrition', 'Religious Education', 'Creative Arts'],
    'Grade 3': ['English', 'Kiswahili', 'Mathematics', 'Environmental Activities', 'Hygiene and Nutrition', 'Religious Education', 'Creative Arts'],
    
    // Upper Primary (Grade 4-6)
    'Grade 4': ['English', 'Kiswahili', 'Mathematics', 'Science and Technology', 'Social Studies', 'Religious Education', 'Creative Arts', 'Physical and Health Education'],
    'Grade 5': ['English', 'Kiswahili', 'Mathematics', 'Science and Technology', 'Social Studies', 'Religious Education', 'Creative Arts', 'Physical and Health Education', 'Agriculture and Nutrition'],
    'Grade 6': ['English', 'Kiswahili', 'Mathematics', 'Science and Technology', 'Social Studies', 'Religious Education', 'Creative Arts', 'Physical and Health Education', 'Agriculture and Nutrition'],
    
    // Junior Secondary (Grade 7-9)
    'Grade 7': ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Health Education', 'Pre-Technical Studies', 'Social Studies', 'Religious Education', 'Creative Arts and Sports', 'Business Studies', 'Agriculture', 'Computer Science'],
    'Grade 8': ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Health Education', 'Pre-Technical Studies', 'Social Studies', 'Religious Education', 'Creative Arts and Sports', 'Business Studies', 'Agriculture', 'Computer Science'],
    'Grade 9': ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Health Education', 'Pre-Technical Studies', 'Social Studies', 'Religious Education', 'Creative Arts and Sports', 'Business Studies', 'Agriculture', 'Computer Science'],
    
    // Senior Secondary (Grade 10-12)
    'Grade 10': ['English', 'Kiswahili', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Religious Education', 'Business Studies', 'Computer Studies', 'Agriculture'],
    'Grade 11': ['English', 'Kiswahili', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Religious Education', 'Business Studies', 'Computer Studies', 'Agriculture'],
    'Grade 12': ['English', 'Kiswahili', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Religious Education', 'Business Studies', 'Computer Studies', 'Agriculture']
  };

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

  // Load initial data
  useEffect(() => {
    loadAllData();
  }, []);

  // Update subjects when class changes - INCLUDES PLAY GROUP
  useEffect(() => {
    if (selectedClass) {
      // Check if the class exists in subjectsByGrade, if not use empty array
      const subjects = subjectsByGrade[selectedClass] || [];
      setAvailableSubjects(subjects);
      setSelectedSubject('');
    }
  }, [selectedClass]);

  // Update streams when class changes
  useEffect(() => {
    if (selectedClass) {
      const learnersInClass = learners.filter(l => l.class === selectedClass);
      const streams = [...new Set(learnersInClass.map(l => l.stream).filter(Boolean))];
      setAvailableStreams(streams);
      setSelectedStream('');
    }
  }, [selectedClass, learners]);

  // Update exam names when exam type changes
  useEffect(() => {
    if (selectedExamType) {
      const filteredExams = exams.filter(e => e.type === selectedExamType);
      const examNames = [...new Set(filteredExams.map(e => e.title).filter(Boolean))];
      setAvailableExamNames(examNames);
      setSelectedExamName('');
    } else {
      setAvailableExamNames([]);
      setSelectedExamName('');
    }
  }, [selectedExamType, exams]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      console.log('Loading data for Modify Results...');
      
      // Load school info
      const schoolRes = await api.get('/school/settings');
      if (schoolRes.data?.success && schoolRes.data?.data) {
        const school = schoolRes.data.data;
        setSchoolInfo(school);
        const classes = school.classes || [];
        const activeClasses = classes
          .filter(c => c.isActive !== false)
          .map(c => c.name);
        setAvailableClasses(activeClasses);
      }
      
      // Load learners
      const learnersRes = await api.get('/pupils');
      if (learnersRes.data?.success) {
        setLearners(learnersRes.data.data || []);
        console.log(`Loaded ${learnersRes.data.data?.length || 0} learners`);
      }
      
      // Load results
      const resultsRes = await api.get('/results');
      if (resultsRes.data?.success) {
        setResults(resultsRes.data.data || []);
        console.log(`Loaded ${resultsRes.data.data?.length || 0} results`);
      }
      
      // Load exams
      const examsRes = await api.get('/exams');
      if (examsRes.data?.success) {
        const examsData = examsRes.data.data || [];
        setExams(examsData);
        
        // Extract exam types from loaded exams
        const examTypes = [...new Set(examsData.map(e => e.type).filter(Boolean))];
        setAvailableExamTypes(examTypes);
        console.log(`Loaded ${examsData.length} exams, ${examTypes.length} exam types`);
      }
      
      toast.success('Data loaded successfully');
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data from server');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const loadResults = async () => {
    if (!selectedClass) {
      toast.error('Please select a class');
      return;
    }
    
    if (!selectedSubject) {
      toast.error('Please select a subject');
      return;
    }
    
    setLoading(true);
    
    try {
      // Filter learners by class and stream
      let filteredLearners = learners.filter(l => l.class === selectedClass);
      
      // Apply stream filter if selected
      if (selectedStream && selectedStream !== 'all' && selectedStream !== '') {
        filteredLearners = filteredLearners.filter(l => l.stream === selectedStream);
      }
      
      if (filteredLearners.length === 0) {
        toast.error('No learners found for the selected criteria');
        setShowResults(false);
        setLoading(false);
        return;
      }
      
      // Build query parameters for results
      const params = {
        class: selectedClass,
        subject: selectedSubject,
        year: selectedYear
      };
      
      // Add stream filter if selected
      if (selectedStream && selectedStream !== 'all' && selectedStream !== '') {
        params.stream = selectedStream;
      }
      if (selectedTerm) {
        params.term = selectedTerm;
      }
      if (selectedExamType) {
        params.examType = selectedExamType;
      }
      if (selectedExamName) {
        params.examName = selectedExamName;
      }
      
      console.log('Fetching results with params:', params);
      
      // Fetch results from API
      const response = await api.get('/results', { params });
      const existingResults = response.data?.data || [];
      console.log(`Found ${existingResults.length} existing results`);
      
      // Create a map of pupilId to result
      const resultsMap = new Map();
      existingResults.forEach(r => {
        const pupilId = r.pupilId?._id || r.pupilId;
        resultsMap.set(pupilId, r);
      });
      
      // Build the results list for each learner
      const learnerResults = filteredLearners.map(learner => {
        const existingResult = resultsMap.get(learner._id);
        const marks = existingResult?.marks !== undefined && existingResult?.marks !== null ? existingResult.marks : '';
        
        return {
          _id: existingResult?._id,
          pupilId: learner._id,
          learnerName: learner.name || learner.fullName || 'Unknown',
          admNo: learner.admNo || learner.admissionNumber || 'N/A',
          stream: learner.stream || '',
          class: learner.class || selectedClass,
          marks: marks,
          competencyLevel: existingResult?.competencyLevel || 
            (marks !== '' ? getCompetencyFromMarks(marks)?.level : 'Not Assessed') || 'Not Assessed',
          examType: selectedExamType || existingResult?.examType || '',
          examName: selectedExamName || existingResult?.examName || '',
          term: selectedTerm || existingResult?.term || '',
          year: selectedYear || existingResult?.year || new Date().getFullYear()
        };
      });
      
      setFilteredResults(learnerResults);
      
      // Initialize local scores with existing marks
      const initialScores = {};
      learnerResults.forEach(r => {
        initialScores[r.pupilId] = r.marks !== '' && r.marks !== null && r.marks !== undefined ? r.marks : '';
      });
      setLocalScores(initialScores);
      
      setShowResults(true);
      toast.success(`Found ${learnerResults.length} learners with ${existingResults.length} existing results`);
      
    } catch (error) {
      console.error('Error loading results:', error);
      toast.error('Failed to load results: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (pupilId, value) => {
    // Allow empty string, 0, and positive numbers
    if (value === '' || value === null || value === undefined) {
      setLocalScores(prev => ({ ...prev, [pupilId]: '' }));
      return;
    }
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setLocalScores(prev => ({ ...prev, [pupilId]: numValue }));
    } else if (value === '0') {
      setLocalScores(prev => ({ ...prev, [pupilId]: 0 }));
    }
  };

  const handleSaveAllChanges = async () => {
    if (!isAdmin) {
      toast.error('Only administrators can save changes');
      return;
    }
    
    setSaving(true);
    let savedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    for (const result of filteredResults) {
      const newMarks = localScores[result.pupilId];
      const oldMarks = result.marks;
      
      // Skip if no change
      if (newMarks === oldMarks || (newMarks === '' && oldMarks === '')) {
        skippedCount++;
        continue;
      }
      
      // Skip if empty
      if (newMarks === '' || newMarks === null || newMarks === undefined) {
        skippedCount++;
        continue;
      }
      
      const marks = parseFloat(newMarks);
      if (isNaN(marks) || marks < 0 || marks > 100) {
        errorCount++;
        continue;
      }
      
      const competencyLevel = getCompetencyFromMarks(marks)?.level || 'Not Assessed';
      
      try {
        const resultData = {
          pupilId: result.pupilId,
          subject: selectedSubject,
          marks: marks,
          competencyLevel: competencyLevel,
          class: selectedClass,
          stream: selectedStream || result.stream || '',
          examType: selectedExamType || result.examType || '',
          examName: selectedExamName || result.examName || '',
          term: selectedTerm || result.term || '',
          year: selectedYear || result.year || new Date().getFullYear(),
          updatedBy: user?.name || 'Admin'
        };
        
        if (result._id) {
          // Update existing result
          await api.put(`/results/${result._id}`, resultData);
          console.log(`Updated result for ${result.learnerName}`);
        } else {
          // Create new result
          await api.post('/results', {
            ...resultData,
            createdBy: user?.name || 'Admin'
          });
          console.log(`Created new result for ${result.learnerName}`);
        }
        savedCount++;
      } catch (error) {
        console.error('Error saving result for', result.learnerName, error);
        errorCount++;
      }
    }
    
    if (savedCount > 0) {
      toast.success(`Saved ${savedCount} result(s) successfully`);
      // Reload results to get updated data
      await loadResults();
    } else if (errorCount > 0) {
      toast.error(`Failed to save ${errorCount} result(s)`);
    } else if (skippedCount > 0) {
      toast.info(`No changes to save (${skippedCount} skipped)`);
    } else {
      toast.info('No changes to save');
    }
    
    setSaving(false);
  };

  const resetFilters = () => {
    setSelectedClass('');
    setSelectedSubject('');
    setSelectedStream('');
    setSelectedTerm('');
    setSelectedExamType('');
    setSelectedExamName('');
    setSelectedYear(new Date().getFullYear());
    setSearchTerm('');
    setFilteredResults([]);
    setLocalScores({});
    setShowResults(false);
    toast.success('Filters reset');
  };

  const filteredBySearch = filteredResults.filter(result =>
    searchTerm === '' ||
    result.learnerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    result.admNo?.toString().includes(searchTerm)
  );

  const years = [2023, 2024, 2025, 2026, 2027];

  return (
    <Layout title="Modify Class Results" subtitle="Edit or update student assessment results">
      
      {/* Refresh Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 px-4 py-2 text-sm transition-colors disabled:opacity-50"
        >
          <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {!isAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <FiLock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-800">View Only Mode</h3>
            <p className="text-sm text-blue-700">Only administrators can edit results.</p>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <FiAward className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-800">Administrator Access</h3>
            <p className="text-sm text-green-700">You can edit scores directly in the table below.</p>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-5 mb-6 text-white">
        <div className="flex items-center gap-3">
          <FiEdit2 className="w-8 h-8" />
          <div>
            <h2 className="text-xl font-bold">Modify Class Results</h2>
            <p className="text-sm opacity-90">Select criteria and edit student assessment scores</p>
          </div>
        </div>
      </div>

      {/* Select Criteria Section */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FiFilter className="text-green-600" /> Select Criteria
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Year - First */}
          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="input-field text-sm py-2">
            <option value="">Year</option>
            {years.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
          
          {/* Class - Second */}
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="input-field text-sm py-2">
            <option value="">Select Class</option>
            {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
          </select>
          
          {/* Stream - Third */}
          <select 
            value={selectedStream} 
            onChange={(e) => setSelectedStream(e.target.value)} 
            className="input-field text-sm py-2"
          >
            <option value="">All Streams</option>
            {availableStreams.map(stream => <option key={stream} value={stream}>{stream}</option>)}
          </select>
          
          {/* Term - Fourth */}
          <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className="input-field text-sm py-2">
            <option value="">Term</option>
            {availableTerms.map(term => <option key={term} value={term}>{term}</option>)}
          </select>
          
          {/* Exam Type - Fifth */}
          <select value={selectedExamType} onChange={(e) => setSelectedExamType(e.target.value)} className="input-field text-sm py-2">
            <option value="">Exam Type</option>
            {availableExamTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          
          {/* Exam Name - Sixth */}
          <select value={selectedExamName} onChange={(e) => setSelectedExamName(e.target.value)} className="input-field text-sm py-2" disabled={!selectedExamType}>
            <option value="">{!selectedExamType ? 'Select type first' : 'Exam Name'}</option>
            {availableExamNames.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          
          {/* Subject - LAST (Seventh) */}
          <select 
            value={selectedSubject} 
            onChange={(e) => setSelectedSubject(e.target.value)} 
            className="input-field text-sm py-2" 
            disabled={!selectedClass}
          >
            <option value="">Select Subject</option>
            {availableSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
          </select>
        </div>
        
        <div className="flex gap-3 mt-4 flex-wrap">
          <button onClick={loadResults} disabled={loading} className="btn-primary text-sm py-2 px-4">
            <FiSearch className="inline mr-1" /> {loading ? 'Loading...' : 'LOAD RESULTS'}
          </button>
          <button onClick={resetFilters} className="bg-gray-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-600 transition-colors">RESET</button>
          <button onClick={loadAllData} className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors flex items-center gap-1">
            <FiRefreshCw className="w-3 h-3" /> RELOAD DATA
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showResults && filteredResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-3 mb-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name or admission..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>
        </div>
      )}

      {/* Results Table - Inline Editable */}
      {showResults && filteredBySearch.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-3 bg-gray-50 border-b">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h3 className="font-semibold text-gray-800">
                {selectedClass} - {selectedSubject} ({filteredBySearch.length} student{filteredBySearch.length !== 1 ? 's' : ''})
                {selectedStream && selectedStream !== '' && selectedStream !== 'all' && ` | Stream: ${selectedStream}`}
                {selectedTerm && ` | ${selectedTerm}`}
                {selectedExamName && ` | ${selectedExamName}`}
              </h3>
              <div className="text-xs text-gray-500">
                {filteredResults.filter(r => r._id).length} have results • {filteredResults.filter(r => !r._id).length} pending
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">#</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Admission No</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Stream</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-32">Score (%)</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Competency Level</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredBySearch.map((result, index) => {
                  const currentScore = localScores[result.pupilId] !== undefined ? localScores[result.pupilId] : (result.marks !== '' ? result.marks : '');
                  const competency = getCompetencyFromMarks(currentScore);
                  const hasExistingResult = !!result._id;
                  
                  return (
                    <tr key={result.pupilId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{result.learnerName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{result.admNo}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{result.stream || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={currentScore !== '' ? currentScore : ''}
                          onChange={(e) => handleScoreChange(result.pupilId, e.target.value)}
                          className="w-24 px-3 py-1.5 text-center text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="-"
                          disabled={!isAdmin}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {competency ? (
                          <span className={`px-2 py-1 text-xs rounded-full ${competency.color}`}>
                            {competency.level}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">Enter score</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {hasExistingResult ? (
                          <span className="text-green-600 text-xs font-medium">✓ Saved</span>
                        ) : (
                          <span className="text-yellow-600 text-xs font-medium">⏳ Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Save Button */}
          {isAdmin && filteredBySearch.length > 0 && (
            <div className="p-4 bg-gray-50 border-t flex justify-between items-center flex-wrap gap-2">
              <div className="text-xs text-gray-500">
                {filteredBySearch.filter(r => {
                  const current = localScores[r.pupilId];
                  return current !== '' && current !== null && current !== undefined;
                }).length} students have scores entered
              </div>
              <button 
                onClick={handleSaveAllChanges} 
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                <FiSave className="w-4 h-4" /> {saving ? 'SAVING...' : 'SAVE ALL CHANGES'}
              </button>
            </div>
          )}
        </div>
      )}

      {showResults && filteredResults.length === 0 && !loading && (
        <div className="bg-yellow-50 rounded-xl p-8 text-center">
          <FiFileText className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <p className="text-gray-600">No students found for the selected criteria.</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or load more data.</p>
        </div>
      )}

      {/* Competency Legend */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-4">
        <h4 className="text-sm font-semibold text-gray-800 mb-3">CBE Competency Levels Guide</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {competencyLevels.map(level => (
            <div key={level.level} className="text-center">
              <span className={`px-3 py-1 text-xs rounded-full ${level.color}`}>
                {level.level}
              </span>
              <p className="text-xs text-gray-500 mt-1">{level.minScore}-{level.maxScore}%</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default ModifyRecords;