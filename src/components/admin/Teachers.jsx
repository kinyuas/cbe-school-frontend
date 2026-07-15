import React, { useState, useEffect } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import AddTeacherModal from '../modals/AddTeacherModal';
import toast from 'react-hot-toast';
import { 
  FiEdit2, FiTrash2, FiSave, FiX, FiSearch, FiEye, FiBarChart2, 
  FiCalendar, FiBookOpen, FiUsers, FiAward, FiTrendingUp, FiTrendingDown
} from 'react-icons/fi';

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // View Performance State
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherPerformance, setTeacherPerformance] = useState([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceStats, setPerformanceStats] = useState({
    totalExams: 0,
    totalResults: 0,
    totalPassing: 0,
    totalFailing: 0,
    overallAverage: 0
  });
  
  // Edit state
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    subject: '',
    email: '',
    phone: '',
    tscNumber: ''
  });
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, []);

  // Filter teachers when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredTeachers(teachers);
    } else {
      const searchLower = searchTerm.toLowerCase();
      const filtered = teachers.filter(teacher =>
        teacher.name?.toLowerCase().includes(searchLower) ||
        teacher.email?.toLowerCase().includes(searchLower) ||
        teacher.tscNumber?.toLowerCase().includes(searchLower) ||
        teacher.phoneNumber?.toLowerCase().includes(searchLower) ||
        teacher.subject?.toLowerCase().includes(searchLower)
      );
      setFilteredTeachers(filtered);
    }
  }, [searchTerm, teachers]);

  const fetchTeachers = async () => {
    try {
      const response = await api.get('/teachers');
      if (response.data.success) {
        setTeachers(response.data.data || []);
        setFilteredTeachers(response.data.data || []);
      } else {
        setTeachers([]);
        setFilteredTeachers([]);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      if (error.response?.status !== 401) {
        toast.error('Error fetching teachers');
      }
      setTeachers([]);
      setFilteredTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = async (teacherData) => {
    try {
      const response = await api.post('/teachers', teacherData);
      if (response.data.success) {
        setTeachers([...teachers, response.data.data]);
        setFilteredTeachers([...teachers, response.data.data]);
        toast.success('Teacher added successfully');
        setIsModalOpen(false);
        
        toast.success(`Teacher can login with Email: ${teacherData.email} and Password: ${teacherData.tscNumber.slice(-6)}`, {
          duration: 8000,
        });
      } else {
        toast.error(response.data.message || 'Error adding teacher');
      }
    } catch (error) {
      console.error('Error adding teacher:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Error adding teacher');
      }
    }
  };

  const handleEditClick = (teacher) => {
    setEditingTeacherId(teacher._id);
    setEditFormData({
      name: teacher.name || '',
      subject: teacher.subject || '',
      email: teacher.email || '',
      phone: teacher.phoneNumber || '',
      tscNumber: teacher.tscNumber || ''
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateTeacher = async (teacherId) => {
    if (!editFormData.name.trim()) {
      toast.error('Please enter teacher name');
      return;
    }
    if (!editFormData.email.trim()) {
      toast.error('Please enter email address');
      return;
    }
    if (!editFormData.tscNumber.trim()) {
      toast.error('Please enter TSC number');
      return;
    }
    if (!editFormData.phone.trim()) {
      toast.error('Please enter phone number');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editFormData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setEditLoading(true);
    
    try {
      const response = await api.put(`/teachers/${teacherId}`, {
        name: editFormData.name,
        subject: editFormData.subject,
        email: editFormData.email,
        phoneNumber: editFormData.phone,
        tscNumber: editFormData.tscNumber
      });
      
      if (response.data.success) {
        const updatedTeachers = teachers.map(teacher => 
          teacher._id === teacherId ? response.data.data : teacher
        );
        setTeachers(updatedTeachers);
        setFilteredTeachers(updatedTeachers);
        toast.success('Teacher updated successfully');
        setEditingTeacherId(null);
        setEditFormData({ name: '', subject: '', email: '', phone: '', tscNumber: '' });
      } else {
        toast.error(response.data.message || 'Error updating teacher');
      }
    } catch (error) {
      console.error('Error updating teacher:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Error updating teacher');
      }
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingTeacherId(null);
    setEditFormData({ name: '', subject: '', email: '', phone: '', tscNumber: '' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        const response = await api.delete(`/teachers/${id}`);
        if (response.data.success) {
          const updatedTeachers = teachers.filter(teacher => teacher._id !== id);
          setTeachers(updatedTeachers);
          setFilteredTeachers(updatedTeachers);
          toast.success('Teacher deleted successfully');
        } else {
          toast.error(response.data.message || 'Error deleting teacher');
        }
      } catch (error) {
        console.error('Error deleting teacher:', error);
        toast.error('Error deleting teacher');
      }
    }
  };

  // ============================================================
  // VIEW TEACHER PERFORMANCE - FIXED WITH SUBJECTS, CLASSES & STREAMS
  // ============================================================
  const handleViewPerformance = async (teacher) => {
    setSelectedTeacher(teacher);
    setShowPerformanceModal(true);
    setPerformanceLoading(true);
    setTeacherPerformance([]);
    
    try {
      console.log(`📊 Fetching performance for teacher: ${teacher.name}`);
      console.log(`📊 Teacher ID: ${teacher._id}`);
      console.log(`📊 Teacher Email: ${teacher.email}`);
      
      // 1. Fetch all results
      const resultsRes = await api.get('/results');
      const allResults = resultsRes.data?.data || [];
      console.log(`📊 Total results in system: ${allResults.length}`);
      
      // 2. Fetch all exams
      const examsRes = await api.get('/exams');
      const allExams = examsRes.data?.data || [];
      console.log(`📊 Total exams in system: ${allExams.length}`);
      
      // 3. Fetch all pupils to get class and stream information
      const pupilsRes = await api.get('/pupils');
      const allPupils = pupilsRes.data?.data || [];
      console.log(`📊 Total pupils in system: ${allPupils.length}`);
      
      // Build a map for quick pupil lookup by ID
      const pupilMap = {};
      allPupils.forEach(pupil => {
        if (pupil._id) {
          pupilMap[pupil._id.toString()] = pupil;
        }
        if (pupil.id) {
          pupilMap[pupil.id.toString()] = pupil;
        }
      });
      
      // Helper to get pupil by ID
      const getPupilById = (pupilId) => {
        if (!pupilId) return null;
        const idStr = pupilId.toString();
        return pupilMap[idStr] || null;
      };
      
      // 4. Find the user associated with this teacher to get the user ID
      let userRes = null;
      let userData = null;
      try {
        userRes = await api.get(`/users/by-email?email=${encodeURIComponent(teacher.email)}`);
        if (userRes.data?.success) {
          userData = userRes.data.data;
          console.log(`📊 Found user: ${userData?._id} - ${userData?.name}`);
        }
      } catch (err) {
        console.log('⚠️ Could not fetch user by email, trying alternative method');
      }
      
      // 5. Filter results for this teacher using multiple methods
      const teacherResults = allResults.filter(r => {
        // Method 1: Check recordedBy (User ID)
        const recordedBy = r.recordedBy || r.teacherId || r.createdBy;
        const matchesByUser = userData && recordedBy === userData._id;
        
        // Method 2: Check teacher name matches
        const submittedBy = r.submittedBy || r.updatedBy || r.createdBy || '';
        const matchesByName = submittedBy === teacher.name || 
                              submittedBy.includes(teacher.name) ||
                              teacher.name.includes(submittedBy);
        
        // Method 3: Check recordedBy matches teacher ID (if stored directly)
        const matchesByTeacherId = recordedBy === teacher._id;
        
        return matchesByUser || matchesByName || matchesByTeacherId;
      });
      
      console.log(`📊 Found ${teacherResults.length} results for teacher: ${teacher.name}`);
      
      if (teacherResults.length === 0) {
        // Try a broader search
        const broaderResults = allResults.filter(r => {
          const searchStr = JSON.stringify(r).toLowerCase();
          return searchStr.includes(teacher.name.toLowerCase()) || 
                 searchStr.includes(teacher.email?.toLowerCase() || '') ||
                 searchStr.includes(teacher.tscNumber || '');
        });
        
        if (broaderResults.length > 0) {
          console.log(`📊 Broader search found ${broaderResults.length} results`);
          setTeacherPerformance([]);
          setPerformanceStats({
            totalExams: 0,
            totalResults: broaderResults.length,
            totalPassing: broaderResults.filter(r => (r.marks || r.score || 0) >= 60).length,
            totalFailing: broaderResults.filter(r => (r.marks || r.score || 0) < 60).length,
            overallAverage: broaderResults.length > 0 
              ? broaderResults.reduce((sum, r) => sum + (r.marks || r.score || 0), 0) / broaderResults.length 
              : 0
          });
          setPerformanceLoading(false);
          return;
        }
      }
      
      if (teacherResults.length === 0) {
        setTeacherPerformance([]);
        setPerformanceStats({
          totalExams: 0,
          totalResults: 0,
          totalPassing: 0,
          totalFailing: 0,
          overallAverage: 0
        });
        setPerformanceLoading(false);
        return;
      }
      
      // Group results by exam
      const examGroups = {};
      
      teacherResults.forEach(result => {
        const examName = result.examName || result.examType || 'Unknown Exam';
        const term = result.term || 'Unknown Term';
        const year = result.year || new Date().getFullYear();
        const key = `${examName}_${term}_${year}`;
        
        if (!examGroups[key]) {
          // Find the exam details from exams list
          const examDetails = allExams.find(e => 
            e.title === result.examName || 
            (e.type === result.examType && e.term === result.term && e.year === result.year)
          );
          
          examGroups[key] = {
            examName: examName,
            examType: result.examType || 'Unknown',
            term: term,
            year: year,
            startDate: examDetails?.startDateTime || result.createdAt,
            endDate: examDetails?.endDateTime || result.updatedAt,
            results: [],
            subjects: {},
            classes: {},
            streams: {}
          };
        }
        
        examGroups[key].results.push(result);
        
        // ============================================================
        // Group by Subject
        // ============================================================
        const subject = result.subject || 'Unknown Subject';
        if (!examGroups[key].subjects[subject]) {
          examGroups[key].subjects[subject] = {
            total: 0,
            count: 0,
            scores: [],
            passing: 0,
            failing: 0
          };
        }
        const marks = result.marks || result.score || 0;
        examGroups[key].subjects[subject].total += marks;
        examGroups[key].subjects[subject].count++;
        examGroups[key].subjects[subject].scores.push(marks);
        if (marks >= 60) {
          examGroups[key].subjects[subject].passing++;
        } else {
          examGroups[key].subjects[subject].failing++;
        }
        
        // ============================================================
        // Get pupil info for class/stream using the pupil map
        // ============================================================
        const pupilId = result.pupilId?._id || result.pupilId || result.studentId;
        let pupil = null;
        
        if (pupilId) {
          pupil = getPupilById(pupilId);
          if (!pupil) {
            // Try to find pupil by admNo if available
            const admNo = result.admNo || result.admissionNumber;
            if (admNo) {
              pupil = allPupils.find(p => 
                p.admNo === admNo || 
                p.admissionNumber === admNo ||
                p.registrationNumber === admNo
              );
            }
          }
        }
        
        // Get class and stream from pupil data
        let className = 'Unknown Class';
        let stream = 'Unknown Stream';
        
        if (pupil) {
          className = pupil.class || pupil.grade || pupil.className || 'Unknown Class';
          stream = pupil.stream || pupil.streamName || 'Unknown Stream';
          
          // If class is not set on pupil, try to get from result
          if (className === 'Unknown Class') {
            className = result.class || result.grade || result.className || 'Unknown Class';
          }
          if (stream === 'Unknown Stream') {
            stream = result.stream || result.streamName || 'Unknown Stream';
          }
        } else {
          // Fallback to result fields
          className = result.class || result.grade || result.className || 'Unknown Class';
          stream = result.stream || result.streamName || 'Unknown Stream';
        }
        
        // Track classes
        if (!examGroups[key].classes[className]) {
          examGroups[key].classes[className] = { 
            total: 0, 
            count: 0, 
            streams: {} 
          };
        }
        examGroups[key].classes[className].total += marks;
        examGroups[key].classes[className].count++;
        
        // Track streams within class
        if (!examGroups[key].classes[className].streams[stream]) {
          examGroups[key].classes[className].streams[stream] = { 
            total: 0, 
            count: 0,
            subjects: {} // Track subjects per stream
          };
        }
        examGroups[key].classes[className].streams[stream].total += marks;
        examGroups[key].classes[className].streams[stream].count++;
        
        // Track subjects per stream
        if (!examGroups[key].classes[className].streams[stream].subjects[subject]) {
          examGroups[key].classes[className].streams[stream].subjects[subject] = {
            total: 0,
            count: 0,
            scores: []
          };
        }
        examGroups[key].classes[className].streams[stream].subjects[subject].total += marks;
        examGroups[key].classes[className].streams[stream].subjects[subject].count++;
        examGroups[key].classes[className].streams[stream].subjects[subject].scores.push(marks);
      });
      
      // Calculate averages and format performance data
      const performanceData = Object.values(examGroups)
        .map(group => {
          // Calculate subject averages with passing/failing counts
          const subjectAverages = Object.entries(group.subjects).map(([name, data]) => ({
            name,
            average: data.count > 0 ? (data.total / data.count).toFixed(1) : 0,
            count: data.count,
            passing: data.passing || 0,
            failing: data.failing || 0
          }));
          
          // Calculate class averages with stream and subject breakdown
          const classAverages = Object.entries(group.classes).map(([className, classData]) => {
            // Calculate streams with subject breakdown
            const streamData = Object.entries(classData.streams).map(([streamName, streamData]) => ({
              name: streamName,
              average: streamData.count > 0 ? (streamData.total / streamData.count).toFixed(1) : 0,
              count: streamData.count,
              subjects: Object.entries(streamData.subjects || {}).map(([subjectName, subjectData]) => ({
                name: subjectName,
                average: subjectData.count > 0 ? (subjectData.total / subjectData.count).toFixed(1) : 0,
                count: subjectData.count
              }))
            }));
            
            return {
              name: className,
              average: classData.count > 0 ? (classData.total / classData.count).toFixed(1) : 0,
              count: classData.count,
              streams: streamData
            };
          });
          
          // Calculate overall average
          const overallAvg = group.results.reduce((sum, r) => sum + (r.marks || r.score || 0), 0) / group.results.length;
          
          return {
            examName: group.examName,
            examType: group.examType,
            term: group.term,
            year: group.year,
            startDate: group.startDate,
            endDate: group.endDate,
            totalResults: group.results.length,
            overallAverage: overallAvg.toFixed(1),
            subjects: subjectAverages,
            classes: classAverages,
            passing: group.results.filter(r => (r.marks || r.score || 0) >= 60).length,
            failing: group.results.filter(r => (r.marks || r.score || 0) < 60).length
          };
        })
        .sort((a, b) => {
          const dateA = new Date(a.endDate || a.startDate || 0);
          const dateB = new Date(b.endDate || b.startDate || 0);
          return dateB - dateA;
        })
        .slice(0, 6);
      
      // Calculate overall stats
      const totalResults = teacherResults.length;
      const totalPassing = teacherResults.filter(r => (r.marks || r.score || 0) >= 60).length;
      const totalFailing = teacherResults.filter(r => (r.marks || r.score || 0) < 60).length;
      const overallAvg = totalResults > 0 
        ? teacherResults.reduce((sum, r) => sum + (r.marks || r.score || 0), 0) / totalResults 
        : 0;
      
      setTeacherPerformance(performanceData);
      setPerformanceStats({
        totalExams: performanceData.length,
        totalResults: totalResults,
        totalPassing: totalPassing,
        totalFailing: totalFailing,
        overallAverage: overallAvg
      });
      
    } catch (error) {
      console.error('Error loading teacher performance:', error);
      toast.error('Failed to load teacher performance data');
      setTeacherPerformance([]);
    } finally {
      setPerformanceLoading(false);
    }
  };

  // ============================================================
  // PERFORMANCE MODAL COMPONENT
  // ============================================================
  const PerformanceModal = () => {
    if (!showPerformanceModal || !selectedTeacher) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
        <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FiBarChart2 className="text-green-600" /> 
                {selectedTeacher.name} - Performance
              </h2>
              <p className="text-sm text-gray-500">
                {selectedTeacher.subject || 'No subject'} • {selectedTeacher.email}
              </p>
            </div>
            <button 
              onClick={() => {
                setShowPerformanceModal(false);
                setSelectedTeacher(null);
                setTeacherPerformance([]);
              }} 
              className="text-gray-500 hover:text-gray-700"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
          
          {/* Performance Content */}
          <div className="p-6">
            {performanceLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              </div>
            ) : teacherPerformance.length === 0 && performanceStats.totalResults === 0 ? (
              <div className="text-center py-12">
                <FiBarChart2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No Performance Data</h3>
                <p className="text-gray-500">This teacher hasn't uploaded any results yet.</p>
                <p className="text-xs text-gray-400 mt-2">Results are linked to teachers via the recordedBy field in results.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{performanceStats.totalExams}</p>
                    <p className="text-xs text-gray-500">Exams</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{performanceStats.totalResults}</p>
                    <p className="text-xs text-gray-500">Total Results</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">{performanceStats.totalPassing}</p>
                    <p className="text-xs text-gray-500">Passing</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{performanceStats.totalFailing}</p>
                    <p className="text-xs text-gray-500">Failing</p>
                  </div>
                </div>
                
                {/* Overall Average */}
                {performanceStats.totalResults > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 text-center border border-green-200">
                    <p className="text-sm text-gray-600">Overall Average</p>
                    <p className={`text-3xl font-bold ${
                      performanceStats.overallAverage >= 80 ? 'text-purple-600' :
                      performanceStats.overallAverage >= 60 ? 'text-green-600' :
                      performanceStats.overallAverage >= 40 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {performanceStats.overallAverage.toFixed(1)}%
                    </p>
                  </div>
                )}
                
                {/* Exam Cards */}
                {teacherPerformance.map((exam, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    {/* Exam Header */}
                    <div className={`p-4 ${exam.overallAverage >= 60 ? 'bg-green-50 border-b border-green-200' : 'bg-red-50 border-b border-red-200'}`}>
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <div>
                          <h4 className="font-bold text-gray-800 flex items-center gap-2">
                            <FiCalendar className="w-4 h-4 text-gray-500" />
                            {exam.examName}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {exam.examType} • {exam.term} {exam.year}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                            exam.overallAverage >= 80 ? 'bg-purple-100 text-purple-700' :
                            exam.overallAverage >= 60 ? 'bg-green-100 text-green-700' :
                            exam.overallAverage >= 40 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            Avg: {exam.overallAverage}%
                          </span>
                          <p className="text-xs text-gray-400 mt-1">
                            {exam.totalResults} results • ✓{exam.passing} ✗{exam.failing}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Exam Body */}
                    <div className="p-4 space-y-4">
                      {/* ============================================================
                          SUBJECTS SECTION - Shows all subjects with passing/failing
                          ============================================================ */}
                      {exam.subjects.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                            <FiBookOpen className="w-4 h-4 text-blue-600" /> Subjects
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {exam.subjects.map((subject, idx) => (
                              <div key={idx} className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-800">{subject.name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                      subject.average >= 80 ? 'bg-purple-100 text-purple-700' :
                                      subject.average >= 60 ? 'bg-green-100 text-green-700' :
                                      subject.average >= 40 ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {subject.average}%
                                    </span>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                  <span className="text-xs text-gray-500">{subject.count} results</span>
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-green-600">✓ {subject.passing || 0}</span>
                                    <span className="text-red-600">✗ {subject.failing || 0}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* ============================================================
                          CLASSES & STREAMS SECTION - Shows class, stream, and subject breakdown
                          ============================================================ */}
                      {exam.classes.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                            <FiUsers className="w-4 h-4 text-green-600" /> Classes & Streams
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {exam.classes.map((cls, idx) => (
                              <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm font-semibold text-gray-800">{cls.name}</span>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    cls.average >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {cls.average}%
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mb-2">{cls.count} students</p>
                                
                                {cls.streams && cls.streams.length > 0 && (
                                  <div className="space-y-2">
                                    {cls.streams.map((stream, sidx) => (
                                      <div key={sidx} className="bg-white rounded-lg p-2 border border-gray-200">
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs font-medium text-blue-700">{stream.name}</span>
                                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                            stream.average >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                          }`}>
                                            {stream.average}%
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-gray-400">{stream.count} students</p>
                                        
                                        {/* Subjects within stream */}
                                        {stream.subjects && stream.subjects.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {stream.subjects.map((subj, subIdx) => (
                                              <span key={subIdx} className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full border border-purple-200">
                                                {subj.name}: <strong>{subj.average}%</strong>
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Modal Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex justify-end">
            <button
              onClick={() => {
                setShowPerformanceModal(false);
                setSelectedTeacher(null);
                setTeacherPerformance([]);
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout title="Teachers Management" subtitle="Add and manage teachers">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Teachers Management" subtitle="Add and manage teachers">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          + Add New Teacher
        </button>
        
        {/* Search Input */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, TSC, phone or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Search Results Summary */}
      {searchTerm && (
        <div className="mb-4 text-sm text-gray-600">
          Found <span className="font-semibold text-green-600">{filteredTeachers.length}</span> teacher{filteredTeachers.length !== 1 ? 's' : ''} matching "{searchTerm}"
        </div>
      )}

      {filteredTeachers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          {searchTerm ? (
            <div>
              <p className="text-gray-500 mb-2">No teachers found matching "{searchTerm}"</p>
              <button 
                onClick={() => setSearchTerm('')} 
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Clear search
              </button>
            </div>
          ) : (
            <p className="text-gray-500">No teachers added yet. Click "Add New Teacher" to get started.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredTeachers.map((teacher) => (
            <div key={teacher._id} className="bg-white rounded-xl shadow-md p-6">
              {editingTeacherId === teacher._id ? (
                // Edit Mode
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1">Full Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={editFormData.name}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1">Subject/Specialization *</label>
                      <input
                        type="text"
                        name="subject"
                        value={editFormData.subject}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1">Email Address *</label>
                      <input
                        type="email"
                        name="email"
                        value={editFormData.email}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={editFormData.phone}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1">TSC Number *</label>
                      <input
                        type="text"
                        name="tscNumber"
                        value={editFormData.tscNumber}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-green-600 mt-1">
                        Login password will be last 6 digits of TSC
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                    <button
                      onClick={handleCancelEdit}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1"
                    >
                      <FiX className="w-4 h-4" /> Cancel
                    </button>
                    <button
                      onClick={() => handleUpdateTeacher(teacher._id)}
                      disabled={editLoading}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
                    >
                      <FiSave className="w-4 h-4" /> {editLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-gray-800">{teacher.name}</h3>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">TSC Registered</span>
                    </div>
                    <p className="text-gray-600 mb-2">{teacher.subject || 'No subject specified'}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <p className="text-gray-500">📧 Email: {teacher.email}</p>
                      <p className="text-gray-500">📱 Phone: {teacher.phoneNumber || 'N/A'}</p>
                      <p className="text-gray-500">🆔 TSC Number: {teacher.tscNumber}</p>
                      <p className="text-xs text-green-600">
                        🔑 Login Password: {teacher.tscNumber?.slice(-6)} (last 6 digits of TSC)
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleViewPerformance(teacher)}
                      className="text-indigo-600 hover:text-indigo-800 p-1 transition-colors"
                      title="View Performance"
                    >
                      <FiEye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleEditClick(teacher)}
                      className="text-blue-600 hover:text-blue-800 p-1 transition-colors"
                      title="Edit Teacher"
                    >
                      <FiEdit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(teacher._id)}
                      className="text-red-600 hover:text-red-800 p-1 transition-colors"
                      title="Delete Teacher"
                    >
                      <FiTrash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AddTeacherModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddTeacher}
      />
      
      {/* Performance Modal */}
      <PerformanceModal />
    </Layout>
  );
};

export default Teachers;