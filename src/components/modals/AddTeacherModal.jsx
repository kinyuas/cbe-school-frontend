import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';

const AddTeacherModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    email: '',
    phone: '',
    tscNumber: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    // Show password info after successful save
    setFormData({ name: '', subject: '', email: '', phone: '', tscNumber: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Add New Teacher</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field w-full"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">Subject/Specialization *</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="input-field w-full"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">Email Address *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field w-full"
                required
              />
              <p className="text-xs text-blue-600 mt-1">This will be the teacher's login email</p>
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">Phone Number *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-field w-full"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">TSC Number *</label>
              <input
                type="text"
                value={formData.tscNumber}
                onChange={(e) => setFormData({ ...formData, tscNumber: e.target.value })}
                className="input-field w-full"
                required
              />
              <p className="text-xs text-green-600 mt-1">
                🔑 Last 6 digits of TSC number will be used as default password
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Example: If TSC is 123456789, password will be 456789
              </p>
            </div>
          </div>
          
          <div className="flex space-x-3 mt-6">
            <button type="submit" className="flex-1 btn-primary">Save Teacher</button>
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTeacherModal;