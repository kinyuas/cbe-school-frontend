import React, { useState, useEffect } from 'react';
import Layout from '../common/Layout';
import toast from 'react-hot-toast';
import { 
  FiSearch, FiFilter, FiSave, FiX, FiAward, FiTarget, 
  FiBookOpen, FiFileText, FiLock, FiEdit2
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
  
  // Track changes locally
  const [localScores, setLocalScores] = useState({});

  // CBC Subjects by Grade Level
  const subjectsByGrade = {
    'PG': ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Psychomotor and Creative Activities'],
    'PP1': ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Psychomotor and Creative Activities'],
    'PP2': ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Psychomotor and Creative Activities'],
    'Grade 1': ['English', 'Kiswahili', 'Mathematics', 'Environmental Activities', 'Hygiene and Nutrition', 'Religious Education', 'Creative Arts'],
    'Grade 2': ['English', 'Kiswahili', 'Mathematics', 'Environmental Activities', 'Hygiene and Nutrition', 'Religious Education', 'Creative Arts'],
    'Grade 3': ['English', 'Kiswahili', 'Mathematics', 'Environmental Activities', 'Hygiene and Nutrition', 'Religious Education', 'Creative Arts'],
    'Grade 4': ['English', 'Kiswahili', 'Mathematics', 'Science and Technology', 'Social Studies', 'Religious Education', 'Creative Arts', 'Physical and Health Education'],
    'Grade 5': ['English', 'Kiswahili', 'Mathematics', 'Science and Technology', 'Social Studies', 'Religious Education', 'Creative Arts', 'Physical and Health Education', 'Agriculture and Nutrition'],
    'Grade 6': ['English', 'Kiswahili', 'Mathematics', 'Science and Technology', 'Social Studies', 'Religious Education', 'Creative Arts', 'Physical and Health Education', 'Agriculture and Nutrition'],
    'Grade 7': ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Health Education', 'Pre-Technical Studies', 'Social Studies', 'Religious Education', 'Creative Arts and Sports', 'Business Studies', 'Agriculture', 'Computer Science'],
    'Grade 8': ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Health Education', 'Pre-Technical Studies', 'Social Studies', 'Religious Education', 'Creative Arts and Sports', 'Business Studies', 'Agriculture', 'Computer Science'],
    'Grade 9': ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Health Education', 'Pre-Technical Studies', 'Social Studies', 'Religious Education', 'Creative Arts and Sports', 'Business Studies', 'Agriculture', 'Computer Science'],
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

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      const subjects = subjectsByGrade[selectedClass] || [];
      setAvailableSubjects(subjects);
      setSelectedSubject('');
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass) {
      const learnersInClass = learners.filter(l => l.class === selectedClass);
      const streams = [...new Set(learnersInClass.map(l => l.stream).filter(Boolean))];
      setAvailableStreams(streams);
      setSelectedStream('');
    }
  }, [selectedClass, learners]);

  const loadAllData = async () => {
    try {
      const storedSchool = localStorage.getItem('schoolInfo');
      if (storedSchool) {
        const school = JSON.parse(storedSchool);
        setSchoolInfo(school);
        const activeClasses = (school.classes || [])
          .filter(c => c.isActive !== false)
          .map(c => c.name);
        setAvailableClasses(activeClasses);
      }
      
      const learnersRes = await api.get('/pupils');
      setLearners(learnersRes.data?.data || []);
      
      const resultsRes = await api.get('/results');
      setResults(resultsRes.data?.data || []);
      
      const examsRes = await api.get('/exams');
      setExams(examsRes.data?.data || []);
      
      const examTypes = [...new Set(examsRes.data?.data?.map(e => e.type).filter(Boolean))];
      const examNames = [...new Set(examsRes.data?.data?.map(e => e.title).filter(Boolean))];
      setAvailableExamTypes(examTypes);
      setAvailableExamNames(examNames);
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    }
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
      let filteredLearners = learners.filter(l => l.class === selectedClass);
      if (selectedStream && selectedStream !== 'all') {
        filteredLearners = filteredLearners.filter(l => l.stream === selectedStream);
      }
      
      const response = await api.get('/results', {
        params: {
          subject: selectedSubject,
          examType: selectedExamType,
          examName: selectedExamName,
          term: selectedTerm,
          year: selectedYear,
          class: selectedClass,
          stream: selectedStream
        }
      });
      
      const existingResults = response.data?.data || [];
      const resultsMap = new Map();
      existingResults.forEach(r => {
        const pupilId = r.pupilId?._id || r.pupilId;
        resultsMap.set(pupilId, r);
      });
      
      const learnerResults = filteredLearners.map(learner => {
        const existingResult = resultsMap.get(learner._id);
        const marks = existingResult?.marks !== undefined ? existingResult.marks : '';
        
        return {
          _id: existingResult?._id,
          pupilId: learner._id,
          learnerName: learner.name,
          admNo: learner.admNo,
          stream: learner.stream,
          class: learner.class,
          marks: marks,
          competencyLevel: existingResult?.competencyLevel || getCompetencyFromMarks(marks)?.level || 'Not Assessed',
          examType: selectedExamType,
          examName: selectedExamName,
          term: selectedTerm,
          year: selectedYear
        };
      });
      
      setFilteredResults(learnerResults);
      
      // Initialize local scores with existing marks
      const initialScores = {};
      learnerResults.forEach(r => {
        initialScores[r.pupilId] = r.marks !== '' ? r.marks : '';
      });
      setLocalScores(initialScores);
      
      setShowResults(true);
      toast.success(`Found ${learnerResults.length} learners`);
      
    } catch (error) {
      console.error('Error loading results:', error);
      toast.error('Failed to load results');
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
    
    for (const result of filteredResults) {
      const newMarks = localScores[result.pupilId];
      const oldMarks = result.marks;
      
      // Skip if no change
      if (newMarks === oldMarks || (newMarks === '' && oldMarks === '')) {
        continue;
      }
      
      // Skip if empty
      if (newMarks === '' || newMarks === null || newMarks === undefined) {
        continue;
      }
      
      const marks = parseFloat(newMarks);
      if (isNaN(marks) || marks < 0 || marks > 100) {
        errorCount++;
        continue;
      }
      
      const competencyLevel = getCompetencyFromMarks(marks)?.level || 'Not Assessed';
      
      try {
        if (result._id) {
          // Update existing result
          await api.put(`/results/${result._id}`, { 
            marks, 
            competencyLevel,
            updatedBy: user?.name || 'Admin'
          });
        } else {
          // Create new result
          await api.post('/results', {
            pupilId: result.pupilId,
            subject: selectedSubject,
            marks,
            competencyLevel,
            examType: selectedExamType,
            examName: selectedExamName,
            term: selectedTerm,
            year: selectedYear,
            createdBy: user?.name || 'Admin'
          });
        }
        savedCount++;
      } catch (error) {
        console.error('Error saving result:', error);
        errorCount++;
      }
    }
    
    if (savedCount > 0) {
      toast.success(`Saved ${savedCount} result(s) successfully`);
      // Reload results to get updated data
      await loadResults();
    } else if (errorCount > 0) {
      toast.error(`Failed to save ${errorCount} result(s)`);
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

  const years = [2023, 2024, 2025, 2026];

  return (
    <Layout title="Modify Class Results" subtitle="Edit or update student assessment results">
      
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
          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="input-field text-sm py-2">
            <option value="">Year</option>
            {years.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="input-field text-sm py-2">
            <option value="">Select Class</option>
            {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
          </select>
          <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="input-field text-sm py-2" disabled={!selectedClass}>
            <option value="">Select Subject</option>
            {availableSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
          </select>
          {availableStreams.length > 0 && (
            <select value={selectedStream} onChange={(e) => setSelectedStream(e.target.value)} className="input-field text-sm py-2">
              <option value="">Stream</option>
              <option value="all">All Streams</option>
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
            <option value="">Exam Name</option>
            {availableExamNames.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        
        <div className="flex gap-3 mt-4">
          <button onClick={loadResults} disabled={loading} className="btn-primary text-sm py-2">
            <FiSearch className="inline mr-1" /> {loading ? 'Loading...' : 'LOAD RESULTS'}
          </button>
          <button onClick={resetFilters} className="bg-gray-500 text-white px-4 py-2 rounded-lg text-sm">RESET</button>
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
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" 
            />
          </div>
        </div>
      )}

      {/* Results Table - Inline Editable */}
      {showResults && filteredBySearch.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-3 bg-gray-50 border-b">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">
                {selectedClass} - {selectedSubject} ({filteredBySearch.length} student{filteredBySearch.length !== 1 ? 's' : ''})
              </h3>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Admission No</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-32">Score (%)</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Competency Level</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredBySearch.map((result) => {
                  const currentScore = localScores[result.pupilId] !== undefined ? localScores[result.pupilId] : (result.marks !== '' ? result.marks : '');
                  const competency = getCompetencyFromMarks(currentScore);
                  
                  return (
                    <tr key={result.pupilId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{result.learnerName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{result.admNo}</td>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Save Button */}
          {isAdmin && filteredBySearch.length > 0 && (
            <div className="p-4 bg-gray-50 border-t flex justify-end">
              <button 
                onClick={handleSaveAllChanges} 
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
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
        </div>
      )}

      {/* Competency Legend */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-4">
        <h4 className="text-sm font-semibold text-gray-800 mb-3">CBC Competency Levels Guide</h4>
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