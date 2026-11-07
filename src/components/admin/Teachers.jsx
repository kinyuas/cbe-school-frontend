// src/components/admin/Teachers.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import AddTeacherModal from '../modals/AddTeacherModal';
import toast from 'react-hot-toast';
import {
  FiEdit2, FiTrash2, FiSave, FiX, FiSearch, FiEye, FiBarChart2,
  FiCalendar, FiBookOpen, FiUsers, FiAward, FiActivity, FiPower, FiLayers,
  FiAlertCircle, FiCheckCircle, FiChevronDown, FiChevronUp, FiStar
} from 'react-icons/fi';

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Analytics Modal State
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState('results'); // 'results' | 'skills'
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Results Data
  const [teacherPerformance, setTeacherPerformance] = useState([]);
  const [performanceStats, setPerformanceStats] = useState({
    totalExams: 0, totalResults: 0, totalPassing: 0, totalFailing: 0, overallAverage: 0
  });
  const [expandedExamIndex, setExpandedExamIndex] = useState(0);

  // Skills Data
  const [skillsActivityData, setSkillsActivityData] = useState(null);
  const [skillsCoverage, setSkillsCoverage] = useState({ totalStudents: 0, studentsWithSkills: 0, percentage: 0 });

  // Edit state
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '', subject: '', email: '', phone: '', tscNumber: '',
    classAssigned: '', streamAssigned: '', canRecordSkills: true
  });
  const [editLoading, setEditLoading] = useState(false);
  
  // Available options for edit modal
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableStreams, setAvailableStreams] = useState([]);

  useEffect(() => {
    fetchTeachers();
    loadAvailableClasses();
  }, []);

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
        teacher.subject?.toLowerCase().includes(searchLower) ||
        teacher.classAssigned?.toLowerCase().includes(searchLower)
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
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      if (error.response?.status !== 401) toast.error('Error fetching teachers');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableClasses = async () => {
    try {
      const res = await api.get('/teachers/classes/available');
      if (res.data?.success) {
        setAvailableClasses(res.data.data.classes || []);
      }
    } catch (err) {
      console.warn('Could not load classes list:', err.message);
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
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error adding teacher');
    }
  };

  const handleEditClick = (teacher) => {
    setEditingTeacherId(teacher._id);
    setEditFormData({
      name: teacher.name || '', subject: teacher.subject || '', email: teacher.email || '',
      phone: teacher.phoneNumber || '', tscNumber: teacher.tscNumber || '',
      classAssigned: teacher.classAssigned || '', streamAssigned: teacher.streamAssigned || '',
      canRecordSkills: teacher.canRecordSkills !== false
    });
    const cls = availableClasses.find(c => c.name === teacher.classAssigned);
    setAvailableStreams(cls?.streams || []);
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'classAssigned') {
      const cls = availableClasses.find(c => c.name === value);
      setAvailableStreams(cls?.streams || []);
      setEditFormData(prev => ({ ...prev, classAssigned: value, streamAssigned: '' }));
    } else {
      setEditFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleUpdateTeacher = async (teacherId) => {
    if (!editFormData.name.trim() || !editFormData.email.trim() || !editFormData.tscNumber.trim()) {
      return toast.error('Name, Email, and TSC are required');
    }
    setEditLoading(true);
    try {
      const response = await api.put(`/teachers/${teacherId}`, {
        ...editFormData, phoneNumber: editFormData.phone
      });
      if (response.data.success) {
        const updated = teachers.map(t => t._id === teacherId ? response.data.data : t);
        setTeachers(updated);
        setFilteredTeachers(updated);
        toast.success('Teacher updated');
        setEditingTeacherId(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        await api.delete(`/teachers/${id}`);
        const updated = teachers.filter(t => t._id !== id);
        setTeachers(updated);
        setFilteredTeachers(updated);
        toast.success('Teacher deleted');
      } catch (error) {
        toast.error('Error deleting teacher');
      }
    }
  };

  const handleToggleStatus = async (teacher) => {
    const newStatus = teacher.isActive === false ? true : false;
    const action = newStatus ? 'activate' : 'suspend';
    
    if (window.confirm(`Are you sure you want to ${action} ${teacher.name}?`)) {
      try {
        const res = await api.put(`/teachers/${teacher._id}/status`, { isActive: newStatus });
        if (res.data.success) {
          const updated = teachers.map(t => t._id === teacher._id ? { ...t, isActive: newStatus } : t);
          setTeachers(updated);
          setFilteredTeachers(updated);
          toast.success(`Teacher ${action}d successfully`);
        }
      } catch (error) {
        toast.error(`Failed to ${action} teacher`);
      }
    }
  };

  // ============================================================
  // COMBINED ANALYTICS FETCHING (RESULTS + SKILLS)
  // ============================================================
  const handleViewAnalytics = async (teacher) => {
    setSelectedTeacher(teacher);
    setShowAnalyticsModal(true);
    setAnalyticsTab('results'); // default
    setAnalyticsLoading(true);
    setTeacherPerformance([]);
    setSkillsActivityData(null);

    try {
      const [resultsRes, examsRes, pupilsRes, userRes, skillsRes] = await Promise.all([
        api.get('/results').catch(() => ({ data: { data: [] } })),
        api.get('/exams').catch(() => ({ data: { data: [] } })),
        api.get('/pupils').catch(() => ({ data: { data: [] } })),
        api.get(`/users/by-email?email=${encodeURIComponent(teacher.email)}`).catch(() => ({ data: { success: false } })),
        api.get(`/teachers/${teacher._id}/skills-activity`).catch(() => ({ data: { success: false, data: { totalEntries: 0, recentSkills: [] } } }))
      ]);

      const allResults = resultsRes.data?.data || [];
      const allExams = examsRes.data?.data || [];
      const allPupils = pupilsRes.data?.data || [];
      const userData = userRes.data?.success ? userRes.data.data : null;
      const skillsData = skillsRes.data?.success ? skillsRes.data.data : { totalEntries: 0, recentSkills: [] };

      // ---------------------------------------------------------
      // PROCESS RESULTS (Filtered to Teacher's uploads)
      // ---------------------------------------------------------
      const teacherResults = allResults.filter(r => {
        const recordedBy = r.recordedBy || r.teacherId || r.createdBy;
        const matchesByUser = userData && recordedBy === userData._id;
        const submittedBy = r.submittedBy || r.updatedBy || r.createdBy || '';
        const matchesByName = submittedBy === teacher.name || submittedBy.includes(teacher.name) || teacher.name.includes(submittedBy);
        const matchesByTeacherId = recordedBy === teacher._id;
        return matchesByUser || matchesByName || matchesByTeacherId;
      });

      const pupilMap = {};
      allPupils.forEach(pupil => {
        if (pupil._id) pupilMap[pupil._id.toString()] = pupil;
        if (pupil.id) pupilMap[pupil.id.toString()] = pupil;
      });

      const examGroups = {};
      teacherResults.forEach(result => {
        const examName = result.examName || result.examType || 'Unknown Exam';
        const term = result.term || 'Unknown Term';
        const year = result.year || new Date().getFullYear();
        const key = `${examName}_${term}_${year}`;

        if (!examGroups[key]) {
          const examDetails = allExams.find(e =>
            e.title === result.examName ||
            (e.type === result.examType && e.term === result.term && e.year === result.year)
          );
          examGroups[key] = {
            examName, examType: result.examType || 'Unknown', term, year,
            startDate: examDetails?.startDateTime || result.createdAt,
            endDate: examDetails?.endDateTime || result.updatedAt,
            results: [], subjects: {}, classes: {}
          };
        }

        examGroups[key].results.push(result);

        const subject = result.subject || 'Unknown Subject';
        if (!examGroups[key].subjects[subject]) {
          examGroups[key].subjects[subject] = { total: 0, count: 0, passing: 0, failing: 0 };
        }
        const marks = result.marks || result.score || 0;
        examGroups[key].subjects[subject].total += marks;
        examGroups[key].subjects[subject].count++;
        if (marks >= 60) examGroups[key].subjects[subject].passing++;
        else examGroups[key].subjects[subject].failing++;

        const pupilId = result.pupilId?._id || result.pupilId || result.studentId;
        const pupil = pupilId ? pupilMap[pupilId.toString()] : null;
        const className = pupil?.class || result.class || 'Unknown Class';
        const streamName = pupil?.stream || result.stream || 'Unknown Stream';

        if (!examGroups[key].classes[className]) {
          examGroups[key].classes[className] = { total: 0, count: 0, streams: {} };
        }
        examGroups[key].classes[className].total += marks;
        examGroups[key].classes[className].count++;

        if (!examGroups[key].classes[className].streams[streamName]) {
          examGroups[key].classes[className].streams[streamName] = { total: 0, count: 0 };
        }
        examGroups[key].classes[className].streams[streamName].total += marks;
        examGroups[key].classes[className].streams[streamName].count++;
      });

      const performanceData = Object.values(examGroups).map(group => {
        const overallAvg = group.results.reduce((sum, r) => sum + (r.marks || r.score || 0), 0) / group.results.length;
        return {
          examName: group.examName,
          examType: group.examType,
          term: group.term,
          year: group.year,
          totalResults: group.results.length,
          overallAverage: overallAvg.toFixed(1),
          subjects: Object.entries(group.subjects).map(([name, data]) => ({
            name,
            average: (data.total / data.count).toFixed(1),
            count: data.count,
            passing: data.passing,
            failing: data.failing
          })),
          classes: Object.entries(group.classes).map(([name, data]) => ({
            name,
            average: (data.total / data.count).toFixed(1),
            count: data.count,
            streams: Object.entries(data.streams).map(([sName, sData]) => ({
              name: sName,
              average: (sData.total / sData.count).toFixed(1),
              count: sData.count
            }))
          })),
          passing: group.results.filter(r => (r.marks || r.score || 0) >= 60).length,
          failing: group.results.filter(r => (r.marks || r.score || 0) < 60).length
        };
      }).sort((a, b) => new Date(b.endDate || 0) - new Date(a.endDate || 0)).slice(0, 10);

      const totalResults = teacherResults.length;
      const totalPassing = teacherResults.filter(r => (r.marks || r.score || 0) >= 60).length;
      const overallAvg = totalResults > 0 ? teacherResults.reduce((sum, r) => sum + (r.marks || r.score || 0), 0) / totalResults : 0;

      setTeacherPerformance(performanceData);
      setPerformanceStats({
        totalExams: performanceData.length,
        totalResults,
        totalPassing,
        totalFailing: totalResults - totalPassing,
        overallAverage: overallAvg
      });

      // ---------------------------------------------------------
      // PROCESS SKILLS
      // ---------------------------------------------------------
      setSkillsActivityData(skillsData);

      if (teacher.classAssigned) {
        const assignedPupils = allPupils.filter(p => 
          p.class === teacher.classAssigned && 
          (!teacher.streamAssigned || p.stream === teacher.streamAssigned)
        );
        
        const totalStudents = assignedPupils.length;
        const uniqueStudentsWithSkills = new Set(
          (skillsData.recentSkills || []).map(s => s.studentId || s._id)
        ).size;

        const percentage = totalStudents > 0 ? Math.round((uniqueStudentsWithSkills / totalStudents) * 100) : 0;
        setSkillsCoverage({ totalStudents, studentsWithSkills: uniqueStudentsWithSkills, percentage });
      } else {
        setSkillsCoverage({ totalStudents: 0, studentsWithSkills: 0, percentage: 0 });
      }

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const toggleExam = (index) => {
    setExpandedExamIndex(prev => prev === index ? null : index);
  };

  if (loading) return <Layout><div className="flex justify-center h-64 items-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div></div></Layout>;

  return (
    <Layout title="Teachers Management" subtitle="Add and manage teachers">
      
      {/* Header & Search */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">+ Add New Teacher</button>
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Search teachers..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-80 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Teacher Cards */}
      <div className="grid gap-6">
        {filteredTeachers.map((teacher) => (
          <div key={teacher._id} className={`bg-white rounded-xl shadow-md p-6 border-l-4 ${teacher.isActive === false ? 'border-red-500 opacity-75' : 'border-green-500'}`}>
            {editingTeacherId === teacher._id ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="name" value={editFormData.name} onChange={handleEditChange} placeholder="Name" className="input-field" />
                <input type="text" name="subject" value={editFormData.subject} onChange={handleEditChange} placeholder="Subject" className="input-field" />
                <input type="email" name="email" value={editFormData.email} onChange={handleEditChange} placeholder="Email" className="input-field" />
                <input type="tel" name="phone" value={editFormData.phone} onChange={handleEditChange} placeholder="Phone" className="input-field" />
                <input type="text" name="tscNumber" value={editFormData.tscNumber} onChange={handleEditChange} placeholder="TSC Number" className="input-field" />
                
                <select name="classAssigned" value={editFormData.classAssigned} onChange={handleEditChange} className="input-field">
                  <option value="">— No Class Assigned —</option>
                  {availableClasses.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <select name="streamAssigned" value={editFormData.streamAssigned} onChange={handleEditChange} className="input-field" disabled={!editFormData.classAssigned || availableStreams.length === 0}>
                  <option value="">— All Streams —</option>
                  {availableStreams.map(s => <option key={s} value={s}>Stream {s}</option>)}
                </select>

                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                  <button onClick={() => setEditingTeacherId(null)} className="btn-secondary">Cancel</button>
                  <button onClick={() => handleUpdateTeacher(teacher._id)} className="btn-primary" disabled={editLoading}>
                    {editLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-xl font-bold text-gray-800">{teacher.name}</h3>
                    {teacher.isActive === false ? (
                      <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                        <FiAlertCircle className="w-3 h-3" /> Suspended
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                        <FiCheckCircle className="w-3 h-3" /> Active
                      </span>
                    )}
                    {teacher.classAssigned && (
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                        🏫 {teacher.classAssigned} {teacher.streamAssigned ? `(Stream ${teacher.streamAssigned})` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mb-2">{teacher.subject}</p>
                  <div className="text-sm text-gray-500">
                    📧 {teacher.email} | 📱 {teacher.phoneNumber} | 🆔 {teacher.tscNumber}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => handleViewAnalytics(teacher)} className="text-indigo-600 hover:text-indigo-800" title="View Analytics">
                    <FiActivity className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleToggleStatus(teacher)} className={`${teacher.isActive === false ? 'text-green-600' : 'text-orange-600'}`} title="Toggle Status">
                    <FiPower className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleEditClick(teacher)} className="text-blue-600 hover:text-blue-800">
                    <FiEdit2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDelete(teacher._id)} className="text-red-600 hover:text-red-800">
                    <FiTrash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <AddTeacherModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleAddTeacher} />

      {/* ==================== COMBINED ANALYTICS MODAL ==================== */}
      {showAnalyticsModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{selectedTeacher.name} - Analytics</h2>
                <p className="text-sm text-gray-500">{selectedTeacher.subject} • {selectedTeacher.classAssigned || 'No class'} {selectedTeacher.streamAssigned ? `(Stream ${selectedTeacher.streamAssigned})` : ''}</p>
              </div>
              <button onClick={() => setShowAnalyticsModal(false)} className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-200 rounded-full transition"><FiX className="w-6 h-6" /></button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b bg-white">
              <button 
                onClick={() => setAnalyticsTab('results')}
                className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${analyticsTab === 'results' ? 'border-green-600 text-green-700 bg-green-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
              >
                <FiBarChart2 /> Academic Results
              </button>
              <button 
                onClick={() => setAnalyticsTab('skills')}
                className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${analyticsTab === 'skills' ? 'border-orange-500 text-orange-600 bg-orange-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
              >
                <FiAward /> Skills Coverage
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
              {analyticsLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                  <p className="mt-4 text-sm text-gray-500">Loading analytics...</p>
                </div>
              ) : analyticsTab === 'results' ? (
                
                /* --- TAB 1: RESULTS --- */
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                      <p className="text-3xl font-bold text-blue-600">{performanceStats.totalResults}</p>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mt-1">Results Uploaded</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                      <p className="text-3xl font-bold text-green-600">{performanceStats.totalPassing}</p>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mt-1">Passing (≥60%)</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                      <p className="text-3xl font-bold text-red-600">{performanceStats.totalFailing}</p>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mt-1">Failing (&lt;60%)</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                      <p className="text-3xl font-bold text-purple-600">{performanceStats.overallAverage.toFixed(1)}%</p>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mt-1">Overall Average</p>
                    </div>
                  </div>

                  {teacherPerformance.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-xl shadow-sm border">
                      <FiBookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No results found for this teacher.</p>
                      <p className="text-sm text-gray-400 mt-1">Results uploaded by this teacher will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {teacherPerformance.map((exam, index) => (
                        <div key={index} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all">
                          {/* Collapsible Header */}
                          <button 
                            onClick={() => toggleExam(index)}
                            className={`w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${exam.overallAverage >= 60 ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'}`}
                          >
                            <div>
                              <h4 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                                <FiCalendar className="w-5 h-5 text-gray-400" />
                                {exam.examName}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">{exam.examType} • {exam.term} {exam.year}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className={`text-sm font-bold px-3 py-1 rounded-full ${exam.overallAverage >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  Avg: {exam.overallAverage}%
                                </span>
                                <p className="text-xs text-gray-400 mt-1">{exam.totalResults} entries • ✓{exam.passing} ✗{exam.failing}</p>
                              </div>
                              {expandedExamIndex === index ? <FiChevronUp className="w-5 h-5 text-gray-400" /> : <FiChevronDown className="w-5 h-5 text-gray-400" />}
                            </div>
                          </button>
                          
                          {/* Expanded Content */}
                          {expandedExamIndex === index && (
                            <div className="p-4 border-t bg-gray-50/50">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Subjects Table */}
                                {exam.subjects.length > 0 && (
                                  <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                                    <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 flex items-center gap-2">
                                      <FiBookOpen className="text-blue-600 w-4 h-4" /> 
                                      <h5 className="font-semibold text-blue-900 text-sm">Subject Breakdown</h5>
                                    </div>
                                    <table className="w-full text-sm text-left">
                                      <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                        <tr>
                                          <th className="px-4 py-2 font-medium">Subject</th>
                                          <th className="px-2 py-2 font-medium text-center">Avg</th>
                                          <th className="px-2 py-2 font-medium text-center">In</th>
                                          <th className="px-2 py-2 font-medium text-center text-green-600">P</th>
                                          <th className="px-2 py-2 font-medium text-center text-red-600">F</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {exam.subjects.map((subject, idx) => (
                                          <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 font-medium text-gray-800">{subject.name}</td>
                                            <td className="px-2 py-2 text-center">
                                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${subject.average >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {subject.average}%
                                              </span>
                                            </td>
                                            <td className="px-2 py-2 text-center text-gray-500">{subject.count}</td>
                                            <td className="px-2 py-2 text-center text-green-600 font-medium">{subject.passing}</td>
                                            <td className="px-2 py-2 text-center text-red-600 font-medium">{subject.failing}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                                
                                {/* Classes Table */}
                                {exam.classes.length > 0 && (
                                  <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                                    <div className="bg-green-50 px-4 py-2 border-b border-green-100 flex items-center gap-2">
                                      <FiUsers className="text-green-600 w-4 h-4" /> 
                                      <h5 className="font-semibold text-green-900 text-sm">Class & Stream Performance</h5>
                                    </div>
                                    <table className="w-full text-sm text-left">
                                      <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                        <tr>
                                          <th className="px-4 py-2 font-medium">Class</th>
                                          <th className="px-2 py-2 font-medium">Stream</th>
                                          <th className="px-2 py-2 font-medium text-center">Avg</th>
                                          <th className="px-4 py-2 font-medium text-center">Entries</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {exam.classes.map((cls, idx) => {
                                          if (cls.streams && cls.streams.length > 0) {
                                            return cls.streams.map((stream, sidx) => (
                                              <tr key={`${idx}-${sidx}`} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 font-medium text-gray-800">{sidx === 0 ? cls.name : ''}</td>
                                                <td className="px-2 py-2 text-blue-700 text-xs">{stream.name || 'All'}</td>
                                                <td className="px-2 py-2 text-center">
                                                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${stream.average >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {stream.average}%
                                                  </span>
                                                </td>
                                                <td className="px-4 py-2 text-center text-gray-500">{stream.count}</td>
                                              </tr>
                                            ));
                                          }
                                          return (
                                            <tr key={idx} className="hover:bg-gray-50">
                                              <td className="px-4 py-2 font-medium text-gray-800">{cls.name}</td>
                                              <td className="px-2 py-2 text-gray-400 italic text-xs">N/A</td>
                                              <td className="px-2 py-2 text-center">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${cls.average >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                  {cls.average}%
                                                </span>
                                              </td>
                                              <td className="px-4 py-2 text-center text-gray-500">{cls.count}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              ) : (

                /* --- TAB 2: SKILLS COVERAGE --- */
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between shadow-sm">
                    <div className="text-center md:text-left mb-4 md:mb-0">
                      <h3 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2"><FiLayers className="text-orange-500"/> Class Coverage</h3>
                      <p className="text-sm text-gray-600 max-w-md">How many students in <strong>{selectedTeacher.classAssigned || 'the assigned class'} {selectedTeacher.streamAssigned ? `(Stream ${selectedTeacher.streamAssigned})` : ''}</strong> have received a skill entry?</p>
                    </div>
                    <div className="flex items-center gap-6 mt-4 md:mt-0 bg-white p-4 rounded-xl shadow-sm border border-orange-100">
                      <div className="text-center">
                        <p className={`text-4xl font-extrabold ${skillsCoverage.percentage >= 50 ? 'text-green-600' : 'text-orange-600'}`}>{skillsCoverage.percentage}%</p>
                        <p className="text-xs text-gray-500 uppercase font-semibold mt-1">Coverage</p>
                      </div>
                      <div className="h-12 w-px bg-gray-200"></div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-800">{skillsCoverage.studentsWithSkills}</p>
                        <p className="text-xs text-gray-500 mt-1">of {skillsCoverage.totalStudents} students</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border rounded-xl p-5 shadow-sm text-center">
                      <p className="text-4xl font-bold text-orange-600">{skillsActivityData?.totalEntries || 0}</p>
                      <p className="text-sm text-gray-500 mt-1">Total Skills Uploaded by {selectedTeacher.name.split(' ')[0]}</p>
                    </div>
                    <div className="bg-white border rounded-xl p-5 shadow-sm text-center">
                      <p className="text-2xl font-bold text-blue-600 mt-2">{skillsActivityData?.lastEntryAt ? new Date(skillsActivityData.lastEntryAt).toLocaleDateString() : '—'}</p>
                      <p className="text-sm text-gray-500 mt-1">Last Upload Date</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
                      <FiStar className="text-purple-600 w-4 h-4" />
                      <h4 className="font-semibold text-gray-800 text-sm">Skills Logged by this Teacher</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b">
                          <tr>
                            <th className="px-4 py-3 font-medium">Student</th>
                            <th className="px-4 py-3 font-medium">Skill</th>
                            <th className="px-4 py-3 font-medium">Category</th>
                            <th className="px-4 py-3 font-medium text-center">Proficiency</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(skillsActivityData?.recentSkills || []).map((s, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <strong className="text-gray-800">{s.studentName}</strong>
                                <br/><span className="text-xs text-gray-500">{s.admNo}</span>
                              </td>
                              <td className="px-4 py-3 font-medium text-purple-700">{s.skillName}</td>
                              <td className="px-4 py-3 text-gray-600 text-xs">{s.category}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide">
                                  {s.proficiency}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {(skillsActivityData?.recentSkills || []).length === 0 && (
                            <tr><td colSpan="4" className="p-12 text-center text-gray-500 italic">No skills uploaded yet.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
};

export default Teachers;