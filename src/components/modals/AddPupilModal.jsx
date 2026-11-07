// src/components/modals/AddPupilModal.jsx
import React, { useState, useEffect } from 'react';
import {
  FiX, FiUser, FiHash, FiBookOpen, FiUsers, FiAward, FiPhone, FiKey
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';

// Blank form shape — used both for init & reset
const EMPTY_FORM = {
  name: '',
  class: '',
  admNo: '',
  birthCertNumber: '',
  gender: '',
  parentName: '',
  parentPhone: '',
  parentIdNumber: '',
  stream: '',
};

const AddPupilModal = ({
  isOpen,
  onClose,
  onSave,
  editingPupil = null,
  retainedData = null,
  onDataChange = null,
}) => {
  const [formData, setFormData] = useState(EMPTY_FORM);

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
    } else if (!editingPupil && isOpen && retainedData) {
      // Hydrate from retained data (Add mode) — used when a previous
      // submission failed & admin doesn't want to re-type.
      setFormData((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(retainedData).filter(([k, v]) =>
            Object.prototype.hasOwnProperty.call(EMPTY_FORM, k) && v !== undefined && v !== null
          )
        ),
      }));
      if (retainedData.class) {
        loadStreamsForClass(retainedData.class);
      }
    }
  }, [editingPupil, isOpen]);

  const loadSchoolDataFromAPI = async () => {
    setLoadingData(true);
    try {
      const response = await api.get('/school/settings');

      if (response.data.success && response.data.data) {
        const school = response.data.data;

        const activeClasses = (school.classes || [])
          .filter((c) => c.isActive !== false)
          .map((c) => c.name);

        setAvailableClasses(activeClasses);

        // If a class is selected, load its streams
        const currentClass = formData.class || editingPupil?.class;
        if (currentClass) {
          const classData = (school.classes || []).find((c) => c.name === currentClass);
          if (classData && classData.streams) {
            setAvailableStreams(classData.streams);
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
    if (!editingPupil) return;

    // Support both new (birthCertNumber) & legacy (birthCertNo) field names
    const hydrated = {
      name: editingPupil.name || '',
      class: editingPupil.class || '',
      admNo: editingPupil.admNo || '',
      birthCertNumber:
        editingPupil.birthCertNumber || editingPupil.birthCertNo || '',
      gender: editingPupil.gender || '',
      parentName: editingPupil.parentName || '',
      parentPhone: editingPupil.parentPhone || '',
      parentIdNumber: editingPupil.parentIdNumber || '',
      stream: editingPupil.stream || '',
    };
    setFormData(hydrated);

    if (hydrated.class) {
      loadStreamsForClass(hydrated.class);
    }
  };

  const loadStreamsForClass = async (className) => {
    try {
      const response = await api.get('/school/settings');
      if (response.data.success && response.data.data) {
        const school = response.data.data;
        const classData = (school.classes || []).find((c) => c.name === className);
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
    const next = { ...formData, [name]: value };

    // Load streams when class changes
    if (name === 'class') {
      next.stream = '';
      setFormData(next);
      await loadStreamsForClass(value);
    } else {
      setFormData(next);
    }

    // Bubble up to parent for retained-data persistence (Add mode only)
    if (!editingPupil && typeof onDataChange === 'function') {
      onDataChange(next);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ── Core validation (required for backend model) ──
    if (!formData.name.trim()) return toast.error('Please enter student name');
    if (!formData.class) return toast.error('Please select a class');
    if (!formData.admNo.trim()) return toast.error('Please enter admission number');
    if (!formData.gender) return toast.error('Please select gender');

    // ── Optional parent fields: warn only if partially filled ──
    // (No hard requirement — schools may not use the Parent/Pupil portal.)
    if (formData.parentIdNumber.trim() && !formData.parentName.trim()) {
      return toast.error('Please provide parent name if parent ID is set');
    }
    if (formData.parentPhone.trim() && !formData.parentName.trim()) {
      return toast.error('Please provide parent name if parent phone is set');
    }

    setLoading(true);

    try {
      // ✨ Normalise payload to match backend Pupil model
      const pupilData = {
        name: formData.name.trim(),
        admNo: formData.admNo.trim(),
        class: formData.class,
        stream: formData.stream || '',
        gender: formData.gender || 'Male',
        birthCertNumber: (formData.birthCertNumber || '').trim(),
        parentName: (formData.parentName || '').trim(),
        parentPhone: (formData.parentPhone || '').trim(),
        parentIdNumber: (formData.parentIdNumber || '').trim(),
      };

      await onSave(pupilData);
      handleClose();
    } catch (error) {
      console.error('Error saving pupil:', error);
      toast.error(error?.response?.data?.message || 'Failed to save pupil');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(EMPTY_FORM);
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
                <label className="block text-gray-700 font-medium mb-2">Class *</label>
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
                    {availableClasses.map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stream (only if class has streams) */}
              {availableStreams.length > 0 && (
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Stream</label>
                  <div className="relative">
                    <FiUsers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <select
                      name="stream"
                      value={formData.stream}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select Stream</option>
                      {availableStreams.map((stream) => (
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

              {/* Birth Certificate Number (used as pupil login password) */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Birth Certificate Number
                </label>
                <div className="relative">
                  <FiAward className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="birthCertNumber"
                    value={formData.birthCertNumber}
                    onChange={handleChange}
                    placeholder="Optional — used for pupil portal login"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">Gender *</label>
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
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* ───────── PARENT SECTION ───────── */}
              <div className="md:col-span-2 mt-2">
                <div className="border-t pt-3">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Parent / Guardian <span className="text-gray-400 font-normal normal-case">(optional)</span>
                  </h3>
                </div>
              </div>

              {/* Parent Name */}
              <div className="md:col-span-2">
                <label className="block text-gray-700 font-medium mb-2">
                  Parent Name
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
                  />
                </div>
              </div>

              {/* Parent Phone */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Parent Phone Number
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
                  />
                </div>
              </div>

              {/* Parent ID Number (login credential) */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Parent ID Number
                </label>
                <div className="relative">
                  <FiKey className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="parentIdNumber"
                    value={formData.parentIdNumber}
                    onChange={handleChange}
                    placeholder="National ID / Passport"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Used by the parent to log into the Parent Portal.
                </p>
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