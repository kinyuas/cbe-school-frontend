// src/components/modals/PublishEventModal.jsx
import React, { useState, useEffect } from 'react';
import {
  FiX,
  FiCalendar,
  FiMapPin,
  FiUser,
  FiAlertCircle,
  FiUsers,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// ============================================================
// AUDIENCE OPTIONS
// ============================================================
const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Everyone (Parents, Students & Teachers)' },
  { value: 'parents', label: 'Parents Only' },
  { value: 'students', label: 'Students Only' },
  { value: 'teachers', label: 'Teachers Only' },
  { value: 'parents_teachers', label: 'Parents & Teachers' },
];

const AUDIENCE_HINTS = {
  all: 'Everyone in the school will see this event in their portal.',
  parents: 'Only parents/guardians will see this event.',
  students: 'Only students will see this event.',
  teachers: 'Only teachers will see this event.',
  parents_teachers: 'Parents and teachers will see this event. Students will not.',
};

// Empty form factory
const EMPTY_FORM = {
  title: '',
  description: '',
  date: '',
  venue: '',
  organizer: '',
  targetAudience: 'all',
};

const PublishEventModal = ({ isOpen, onClose, onSave, userRole, userName }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const isAdmin = userRole === 'admin';

  // Auto-fill organizer when userName becomes available
  useEffect(() => {
    if (userName) {
      setFormData((prev) => ({ ...prev, organizer: userName }));
    }
  }, [userName]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...EMPTY_FORM,
        date: new Date().toISOString().split('T')[0],
        organizer: userName || '',
      });
      setErrors({});
    }
  }, [isOpen, userName]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.targetAudience) newErrors.targetAudience = 'Please select an audience';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Permission gate
    if (!isAdmin) {
      toast.error('Only administrators can publish events');
      return;
    }

    if (!validate()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      // Parent closes the modal after successful save
    } catch (error) {
      console.error('Error in modal submit:', error);
      toast.error('Failed to publish event');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-gray-800">Publish New Event</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            disabled={loading}
            title="Close"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter event title"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={loading || !isAdmin}
            />
            {errors.title && (
              <p className="text-red-500 text-xs mt-1">{errors.title}</p>
            )}
          </div>

          {/* 👇 NEW: Target Audience */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Who should see this event? <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FiUsers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                name="targetAudience"
                value={formData.targetAudience}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none ${
                  errors.targetAudience ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading || !isAdmin}
              >
                {AUDIENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {/* Custom dropdown caret */}
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                ▾
              </span>
            </div>
            {errors.targetAudience && (
              <p className="text-red-500 text-xs mt-1">{errors.targetAudience}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {AUDIENCE_HINTS[formData.targetAudience] || AUDIENCE_HINTS.all}
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the event..."
              rows="4"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={loading || !isAdmin}
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">{errors.description}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.date ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading || !isAdmin}
              />
            </div>
            {errors.date && (
              <p className="text-red-500 text-xs mt-1">{errors.date}</p>
            )}
          </div>

          {/* Venue */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">Venue</label>
            <div className="relative">
              <FiMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                name="venue"
                value={formData.venue}
                onChange={handleChange}
                placeholder="Event venue (optional)"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading || !isAdmin}
              />
            </div>
          </div>

          {/* Organizer */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">Organizer</label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                name="organizer"
                value={formData.organizer}
                onChange={handleChange}
                placeholder="Organizer name"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading || !isAdmin}
              />
            </div>
          </div>

          {/* Permission Warning (non-admin) */}
          {!isAdmin && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-3">
              <div className="flex items-start">
                <FiAlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="ml-3 text-sm text-yellow-700">
                  <p className="font-semibold">Admin Access Required</p>
                  <p>Only administrators can publish events. Please contact an admin.</p>
                  <p className="text-xs mt-1">
                    Your role: <strong>{userRole || 'teacher'}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 ${
                loading || !isAdmin ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={loading || !isAdmin}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Publishing...
                </>
              ) : (
                'Publish Event'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublishEventModal;