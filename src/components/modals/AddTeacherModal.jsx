// src/components/modals/AddTeacherModal.jsx
import React, { useState, useEffect } from 'react';
import { FiX, FiAward } from 'react-icons/fi';
import api from '../../services/api';

const AddTeacherModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '', subject: '', email: '', phone: '', tscNumber: '',
    classAssigned: '', streamAssigned: '', canRecordSkills: true
  });

  const [availableClasses, setAvailableClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [availableStreams, setAvailableStreams] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadAvailableClasses();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!formData.classAssigned) {
      setAvailableStreams([]);
      return;
    }
    const selectedClass = availableClasses.find(c => c.name === formData.classAssigned);
    if (selectedClass && Array.isArray(selectedClass.streams)) {
      setAvailableStreams(selectedClass.streams.filter(s => s && s.trim() !== ''));
    } else {
      setAvailableStreams([]);
    }
  }, [formData.classAssigned, availableClasses]);

  const loadAvailableClasses = async () => {
    setLoadingClasses(true);
    try {
      const res = await api.get('/teachers/classes/available');
      if (res.data?.success) {
        setAvailableClasses(res.data.data.classes || []);
      }
    } catch (err) {
      console.warn('Could not load classes list:', err.message);
      setAvailableClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setFormData({
      name: '', subject: '', email: '', phone: '', tscNumber: '',
      classAssigned: '', streamAssigned: '', canRecordSkills: true
    });
    setAvailableStreams([]);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleClassChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, classAssigned: value, streamAssigned: '' }));
  };

  const handleCancel = () => {
    setFormData({
      name: '', subject: '', email: '', phone: '', tscNumber: '',
      classAssigned: '', streamAssigned: '', canRecordSkills: true
    });
    setAvailableStreams([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Add New Teacher</h2>
          <button onClick={handleCancel} className="text-gray-500 hover:text-gray-700"><FiX className="w-6 h-6" /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Full Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="input-field w-full" required />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Subject/Specialization *</label>
              <input type="text" name="subject" value={formData.subject} onChange={handleChange} className="input-field w-full" required />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Email Address *</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-field w-full" required />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Phone Number *</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="input-field w-full" required />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">TSC Number *</label>
              <input type="text" name="tscNumber" value={formData.tscNumber} onChange={handleChange} className="input-field w-full" required />
              <p className="text-xs text-green-600 mt-1">🔑 Last 6 digits will be the default password</p>
            </div>

            {/* Class Assignment Section */}
            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-3">Class Assignment (Optional)</p>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Class Assigned</label>
                <select name="classAssigned" value={formData.classAssigned} onChange={handleClassChange} className="input-field w-full" disabled={loadingClasses}>
                  <option value="">{loadingClasses ? 'Loading classes...' : '— No class assigned —'}</option>
                  {availableClasses.map(cls => <option key={cls.name} value={cls.name}>{cls.name}</option>)}
                </select>
              </div>

              <div className="mt-3">
                <label className="block text-gray-700 font-medium mb-2">Stream</label>
                {!formData.classAssigned ? (
                  <select disabled className="input-field w-full bg-gray-100"><option>Choose a class first</option></select>
                ) : availableStreams.length === 0 ? (
                  <select disabled className="input-field w-full bg-gray-100"><option>No streams registered</option></select>
                ) : (
                  <select name="streamAssigned" value={formData.streamAssigned} onChange={handleChange} className="input-field w-full">
                    <option value="">— All Streams (no restriction) —</option>
                    {availableStreams.map(stream => <option key={stream} value={stream}>Stream {stream}</option>)}
                  </select>
                )}
              </div>

              <div className="mt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="canRecordSkills" checked={formData.canRecordSkills} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm text-gray-700 flex items-center gap-1"><FiAward className="w-4 h-4 text-orange-500" /> Can record Skills</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button type="submit" className="flex-1 btn-primary">Save Teacher</button>
            <button type="button" onClick={handleCancel} className="flex-1 btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTeacherModal;