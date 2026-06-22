import React, { useState, useEffect } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import AddTeacherModal from '../modals/AddTeacherModal';
import toast from 'react-hot-toast';
import { FiEdit2, FiTrash2, FiSave, FiX, FiSearch } from 'react-icons/fi';

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
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
        teacher.phone?.toLowerCase().includes(searchLower) ||
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
      phone: teacher.phone || '',
      tscNumber: teacher.tscNumber || ''
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateTeacher = async (teacherId) => {
    // Validation
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
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editFormData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setEditLoading(true);
    
    try {
      const response = await api.put(`/teachers/${teacherId}`, editFormData);
      if (response.data.success) {
        // Update the teacher in the local state
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
                    <p className="text-gray-600 mb-2">{teacher.subject}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <p className="text-gray-500">📧 Email: {teacher.email}</p>
                      <p className="text-gray-500">📱 Phone: {teacher.phone}</p>
                      <p className="text-gray-500">🆔 TSC Number: {teacher.tscNumber}</p>
                      <p className="text-xs text-green-600">
                        🔑 Login Password: {teacher.tscNumber?.slice(-6)} (last 6 digits of TSC)
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
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
    </Layout>
  );
};

export default Teachers;