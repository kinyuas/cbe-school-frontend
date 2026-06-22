import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';

const AddResultModal = ({ isOpen, onClose, onSave, students }) => {
  const [formData, setFormData] = useState({
    pupilId: '',
    subject: '',
    marks: '',
    term: 'Term 1',
    year: new Date().getFullYear()
  });

  const calculateGrade = (marks) => {
    if (marks >= 80) return 'A';
    if (marks >= 70) return 'B';
    if (marks >= 60) return 'C';
    if (marks >= 50) return 'D';
    return 'E';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const grade = calculateGrade(parseFloat(formData.marks));
    onSave({ ...formData, grade, marks: parseFloat(formData.marks) });
    setFormData({
      pupilId: '',
      subject: '',
      marks: '',
      term: 'Term 1',
      year: new Date().getFullYear()
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Add Student Result</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Select Student</label>
              <select
                value={formData.pupilId}
                onChange={(e) => setFormData({ ...formData, pupilId: e.target.value })}
                className="input-field"
                required
              >
                <option value="">Choose a student...</option>
                {students.map((student) => (
                  <option key={student._id} value={student._id}>
                    {student.name} - {student.admNo} ({student.class})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">Subject</label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="input-field"
                required
              >
                <option value="">Select Subject</option>
                <option value="Mathematics">Mathematics</option>
                <option value="English">English</option>
                <option value="Kiswahili">Kiswahili</option>
                <option value="Science">Science</option>
                <option value="Social Studies">Social Studies</option>
                <option value="CRE">CRE</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">Marks (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.marks}
                onChange={(e) => setFormData({ ...formData, marks: e.target.value })}
                className="input-field"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">Term</label>
              <select
                value={formData.term}
                onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                className="input-field"
                required
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
          </div>
          
          <div className="flex space-x-3 mt-6">
            <button type="submit" className="flex-1 btn-primary">Save Result</button>
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddResultModal;