import React, { useState, useEffect } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiEdit2, FiCalendar, FiClock, FiAlertCircle } from 'react-icons/fi';

const Exams = () => {
  const [exams, setExams] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null); // Track user role
  const [formData, setFormData] = useState({
    title: '',
    type: 'End of Term',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    term: 'Term 1',
    year: new Date().getFullYear(),
    isActive: true
  });

  useEffect(() => {
    loadExams();
    getUserRole();
  }, []);

  const getUserRole = () => {
    // Get user role from localStorage or auth context
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserRole(user.role);
  };

  const loadExams = async () => {
    setLoading(true);
    try {
      const response = await api.get('/exams');
      if (response.data.success) {
        setExams(response.data.data || []);
      } else {
        setExams([]);
      }
    } catch (error) {
      console.error('Error loading exams:', error);
      toast.error('Failed to load exams');
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.startDate || !formData.endDate || !formData.startTime || !formData.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate dates and times
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
    
    if (startDateTime >= endDateTime) {
      toast.error('End date/time must be after start date/time');
      return;
    }

    const examData = {
      title: formData.title,
      type: formData.type,
      term: formData.term,
      year: formData.year,
      startDate: formData.startDate,
      startTime: formData.startTime,
      endDate: formData.endDate,
      endTime: formData.endTime,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      isActive: formData.isActive
    };

    try {
      let response;
      if (editingExam) {
        // Update existing exam
        response = await api.put(`/exams/${editingExam._id}`, examData);
        if (response.data.success) {
          toast.success('Exam updated successfully');
          setIsModalOpen(false);
          setEditingExam(null);
          resetForm();
          loadExams(); // Refresh the list
        }
      } else {
        // Create new exam
        response = await api.post('/exams', examData);
        if (response.data.success) {
          toast.success('Exam added successfully');
          setIsModalOpen(false);
          resetForm();
          loadExams(); // Refresh the list
        }
      }
    } catch (error) {
      console.error('Error saving exam:', error);
      if (error.response?.status === 403) {
        toast.error('You do not have permission to perform this action. Admin access required.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to save exam');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'End of Term',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      term: 'Term 1',
      year: new Date().getFullYear(),
      isActive: true
    });
  };

  const handleDelete = async (id) => {
    if (!userRole === 'admin') {
      toast.error('Only administrators can delete exams');
      return;
    }

    if (window.confirm('Are you sure you want to delete this exam?')) {
      try {
        const response = await api.delete(`/exams/${id}`);
        if (response.data.success) {
          toast.success('Exam deleted successfully');
          loadExams(); // Refresh the list
        } else {
          toast.error(response.data.message || 'Failed to delete exam');
        }
      } catch (error) {
        console.error('Error deleting exam:', error);
        if (error.response?.status === 403) {
          toast.error('You do not have permission to delete exams. Admin access required.');
        } else {
          toast.error('Failed to delete exam');
        }
      }
    }
  };

  const handleEdit = (exam) => {
    if (!userRole === 'admin') {
      toast.error('Only administrators can edit exams');
      return;
    }

    // Extract date and time from startDateTime and endDateTime
    const startDateTime = new Date(exam.startDateTime);
    const endDateTime = new Date(exam.endDateTime);
    
    setEditingExam(exam);
    setFormData({
      title: exam.title,
      type: exam.type,
      term: exam.term,
      year: exam.year,
      startDate: startDateTime.toISOString().split('T')[0],
      startTime: startDateTime.toTimeString().slice(0, 5),
      endDate: endDateTime.toISOString().split('T')[0],
      endTime: endDateTime.toTimeString().slice(0, 5),
      isActive: exam.isActive
    });
    setIsModalOpen(true);
  };

  const toggleExamStatus = async (examId, currentStatus) => {
    if (!userRole === 'admin') {
      toast.error('Only administrators can change exam status');
      return;
    }

    try {
      const response = await api.put(`/exams/${examId}`, { isActive: !currentStatus });
      if (response.data.success) {
        toast.success(`Exam ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
        loadExams(); // Refresh the list
      } else {
        toast.error(response.data.message || 'Failed to update exam status');
      }
    } catch (error) {
      console.error('Error updating exam status:', error);
      if (error.response?.status === 403) {
        toast.error('You do not have permission to change exam status. Admin access required.');
      } else {
        toast.error('Failed to update exam status');
      }
    }
  };

  const isExamOngoing = (exam) => {
    const now = new Date();
    const start = new Date(exam.startDateTime);
    const end = new Date(exam.endDateTime);
    return now >= start && now <= end;
  };

  const isExamExpired = (exam) => {
    const now = new Date();
    const end = new Date(exam.endDateTime);
    return now > end;
  };

  const getExamStatus = (exam) => {
    if (!exam.isActive) return { text: 'Inactive', color: 'bg-gray-200 text-gray-600' };
    if (isExamExpired(exam)) return { text: 'Expired', color: 'bg-red-100 text-red-800' };
    if (isExamOngoing(exam)) return { text: 'Ongoing', color: 'bg-green-100 text-green-800' };
    return { text: 'Upcoming', color: 'bg-blue-100 text-blue-800' };
  };

  if (loading) {
    return (
      <Layout title="Exam Management" subtitle="Schedule and manage school exams with time constraints">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Exam Management" subtitle="Schedule and manage school exams with time constraints">
      {/* Only show "Schedule Exam" button for admins */}
      {userRole === 'admin' && (
        <div className="mb-6">
          <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
            <FiPlus /> Schedule Exam
          </button>
        </div>
      )}

      {exams.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <div className="flex flex-col items-center">
            <FiCalendar className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Exams Scheduled</h3>
            <p className="text-gray-500">Click "Schedule Exam" to create your first exam</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {exams.map((exam) => {
            const status = getExamStatus(exam);
            const startDateTime = new Date(exam.startDateTime);
            const endDateTime = new Date(exam.endDateTime);
            const isAdmin = userRole === 'admin';
            
            return (
              <div key={exam._id} className="bg-white rounded-xl shadow-md p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-xl font-bold text-gray-800">{exam.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${status.color}`}>
                        {status.text}
                      </span>
                      {!exam.isActive && (
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-600">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Type: {exam.type} | Term: {exam.term} | Year: {exam.year}
                    </p>
                    <div className="flex flex-wrap items-center gap-6 mt-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-500">
                        <FiCalendar className="w-4 h-4" />
                        <span>Start: {startDateTime.toLocaleDateString()}</span>
                        <FiClock className="w-4 h-4 ml-2" />
                        <span>{startDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <FiCalendar className="w-4 h-4" />
                        <span>End: {endDateTime.toLocaleDateString()}</span>
                        <FiClock className="w-4 h-4 ml-2" />
                        <span>{endDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Only show action buttons for admins */}
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => toggleExamStatus(exam._id, exam.isActive)} 
                        className={`px-3 py-1 rounded-lg text-sm ${exam.isActive ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                        title={exam.isActive ? 'Disable Exam' : 'Enable Exam'}
                      >
                        {exam.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => handleEdit(exam)} className="text-blue-600 hover:text-blue-800">
                        <FiEdit2 />
                      </button>
                      <button onClick={() => handleDelete(exam._id)} className="text-red-600 hover:text-red-800">
                        <FiTrash2 />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal - Only show for admins */}
      {isModalOpen && userRole === 'admin' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {editingExam ? 'Edit Exam' : 'Schedule New Exam'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Exam Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="input-field w-full"
                  placeholder="e.g., End of Term Examination"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Exam Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="input-field w-full"
                >
                  <option value="End of Term">End of Term</option>
                  <option value="Opener">Opener</option>
                  <option value="Mid Term">Mid Term</option>
                  <option value="Mock">Mock</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Term</label>
                <select
                  value={formData.term}
                  onChange={(e) => setFormData({...formData, term: e.target.value})}
                  className="input-field w-full"
                >
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Year</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                  className="input-field w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Start Time *</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    className="input-field w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">End Date *</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">End Time *</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    className="input-field w-full"
                  />
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <FiAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <p className="text-xs text-yellow-800">
                    Teachers can only upload results during the exam period. 
                    After the end time, results become read-only and only admins can modify them.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button onClick={handleSubmit} className="flex-1 btn-primary">Save</button>
              <button onClick={() => {
                setIsModalOpen(false);
                setEditingExam(null);
                resetForm();
              }} className="flex-1 btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Exams;