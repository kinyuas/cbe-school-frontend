// src/components/modals/AddPupilModal.jsx
import React, { useState, useEffect } from 'react';
import { FiX, FiUser, FiHash, FiCalendar, FiMail, FiPhone, FiBookOpen, FiUsers, FiAward } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';

const AddPupilModal = ({ isOpen, onClose, onSave, editingPupil = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    class: '',
    admNo: '',
    birthCertNo: '',
    gender: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    dateOfBirth: '',
    stream: '',
    previousClass: ''
  });
  
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableStreams, setAvailableStreams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Load school data from API on mount
  useEffect(() => {
    if (isOpen) {
      loadSchoolDataFromAPI();
    }
  }, [isOpen]);

  // Load pupil data if editing
  useEffect(() => {
    if (editingPupil && isOpen) {
      loadPupilData();
    }
  }, [editingPupil, isOpen]);

  const loadSchoolDataFromAPI = async () => {
    setLoadingData(true);
    try {
      console.log('Loading school data from API for AddPupilModal...');
      const response = await api.get('/school/settings');
      
      if (response.data.success && response.data.data) {
        const school = response.data.data;
        console.log('School data from API:', school);
        
        // Get active classes from database
        const activeClasses = (school.classes || [])
          .filter(c => c.isActive !== false)
          .map(c => c.name);
        
        setAvailableClasses(activeClasses);
        console.log('Available classes from database:', activeClasses);
        
        // If a class is selected, load its streams
        if (formData.class) {
          const classData = (school.classes || []).find(c => c.name === formData.class);
          if (classData && classData.streams) {
            setAvailableStreams(classData.streams);
            console.log(`Streams for ${formData.class}:`, classData.streams);
          }
        }
      } else {
        toast.error('Failed to load school data');
      }
    } catch (error) {
      console.error('Error loading school data:', error);
      toast.error('Failed to load school data from server');
    } finally {
      setLoadingData(false);
    }
  };

  const loadPupilData = () => {
    if (editingPupil) {
      setFormData({
        name: editingPupil.name || '',
        class: editingPupil.class || '',
        admNo: editingPupil.admNo || '',
        birthCertNo: editingPupil.birthCertNo || '',
        gender: editingPupil.gender || '',
        parentName: editingPupil.parentName || '',
        parentPhone: editingPupil.parentPhone || '',
        parentEmail: editingPupil.parentEmail || '',
        dateOfBirth: editingPupil.dateOfBirth || '',
        stream: editingPupil.stream || '',
        previousClass: editingPupil.previousClass || ''
      });
      
      // Load streams for the selected class
      if (editingPupil.class) {
        loadStreamsForClass(editingPupil.class);
      }
    }
  };

  const loadStreamsForClass = async (className) => {
    try {
      const response = await api.get('/school/settings');
      if (response.data.success && response.data.data) {
        const school = response.data.data;
        const classData = (school.classes || []).find(c => c.name === className);
        if (classData && classData.streams) {
          setAvailableStreams(classData.streams);
        } else {
          setAvailableStreams([]);
        }
      }
    } catch (error) {
      console.error('Error loading streams:', error);
      setAvailableStreams([]);
    }
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Load streams when class changes
    if (name === 'class') {
      await loadStreamsForClass(value);
      setFormData(prev => ({ ...prev, stream: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast.error('Please enter student name');
      return;
    }
    if (!formData.class) {
      toast.error('Please select a class');
      return;
    }
    if (!formData.admNo.trim()) {
      toast.error('Please enter admission number');
      return;
    }
    if (!formData.birthCertNo.trim()) {
      toast.error('Please enter birth certificate number');
      return;
    }
    if (!formData.gender) {
      toast.error('Please select gender');
      return;
    }
    if (!formData.parentName.trim()) {
      toast.error('Please enter parent name');
      return;
    }
    if (!formData.parentPhone.trim()) {
      toast.error('Please enter parent phone number');
      return;
    }
    
    setLoading(true);
    
    try {
      // Prepare data for saving
      const pupilData = {
        ...formData,
        schoolId: localStorage.getItem('schoolId') || '',
        status: 'active'
      };
      
      await onSave(pupilData);
      handleClose();
    } catch (error) {
      console.error('Error saving pupil:', error);
      toast.error('Failed to save pupil');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      class: '',
      admNo: '',
      birthCertNo: '',
      gender: '',
      parentName: '',
      parentPhone: '',
      parentEmail: '',
      dateOfBirth: '',
      stream: '',
      previousClass: ''
    });
    setAvailableStreams([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-2xl m-4 my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            {editingPupil ? 'Edit Student' : 'Add New Student'}
          </h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <FiX className="w-6 h-6" />
          </button>
        </div>
        
        {loadingData ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <p className="ml-4 text-gray-600">Loading school data from database...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Student Name */}
              <div className="md:col-span-2">
                <label className="block text-gray-700 font-medium mb-2">
                  Learner Name *
                </label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              {/* Class Selection */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Class *
                </label>
                <div className="relative">
                  <FiBookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    name="class"
                    value={formData.class}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  >
                    <option value="">Select Class</option>
                    {availableClasses.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Stream (if available) */}
              {availableStreams.length > 0 && (
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Stream
                  </label>
                  <div className="relative">
                    <FiUsers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <select
                      name="stream"
                      value={formData.stream}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select Stream</option>
                      {availableStreams.map(stream => (
                        <option key={stream} value={stream}>{stream}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              
              {/* Admission Number */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Admission Number *
                </label>
                <div className="relative">
                  <FiHash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="admNo"
                    value={formData.admNo}
                    onChange={handleChange}
                    placeholder="Enter admission number"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              {/* Birth Certificate Number */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Birth Certificate Number *
                </label>
                <div className="relative">
                  <FiAward className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="birthCertNo"
                    value={formData.birthCertNo}
                    onChange={handleChange}
                    placeholder="Enter birth certificate number"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              {/* Gender */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Gender *
                </label>
                <div className="relative">
                  <FiUsers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
              
              {/* Parent Name */}
              <div className="md:col-span-2">
                <label className="block text-gray-700 font-medium mb-2">
                  Parent Name *
                </label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="parentName"
                    value={formData.parentName}
                    onChange={handleChange}
                    placeholder="Enter parent/guardian full name"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              {/* Parent Phone Number */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Parent Phone Number *
                </label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    name="parentPhone"
                    value={formData.parentPhone}
                    onChange={handleChange}
                    placeholder="e.g., 0712345678"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              {/* Parent Email (Optional) */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Parent Email (Optional)
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    name="parentEmail"
                    value={formData.parentEmail}
                    onChange={handleChange}
                    placeholder="parent@example.com"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Date of Birth (Optional) */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Date of Birth (Optional)
                </label>
                <div className="relative">
                  <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Previous Class (Optional - for transfers/promotions) */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Previous Class (Optional)
                </label>
                <div className="relative">
                  <FiBookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    name="previousClass"
                    value={formData.previousClass}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select Previous Class</option>
                    {availableClasses.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {/* Form Actions */}
            <div className="flex space-x-3 mt-6 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'SAVING...' : (editingPupil ? 'UPDATE STUDENT' : 'ADD STUDENT')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddPupilModal;