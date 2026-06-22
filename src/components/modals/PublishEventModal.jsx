import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';

const PublishEventModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    description: '',
    venue: '',
    organizer: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setFormData({ title: '', date: '', description: '', venue: '', organizer: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Publish New Event</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Event Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input-field"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input-field"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">Venue (Optional)</label>
              <input
                type="text"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                className="input-field"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">Organizer (Optional)</label>
              <input
                type="text"
                value={formData.organizer}
                onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                className="input-field"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
                rows="3"
                required
              ></textarea>
            </div>
          </div>
          
          <div className="flex space-x-3 mt-6">
            <button type="submit" className="flex-1 btn-primary">Publish Event</button>
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublishEventModal;