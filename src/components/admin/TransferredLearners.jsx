import React, { useState, useEffect } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiSearch, FiRefreshCw, FiArrowLeft, FiTrash2, FiRotateCcw } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const TransferredLearners = () => {
  const [transferredLearners, setTransferredLearners] = useState([]);
  const [filteredLearners, setFilteredLearners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTransferredLearners();
  }, []);

  useEffect(() => {
    filterLearners();
  }, [searchTerm, transferredLearners]);

  const fetchTransferredLearners = async () => {
    try {
      // CHANGE THIS - Use the correct endpoint
      const response = await api.get('/transferred');
      console.log('Transferred response:', response.data);
      
      if (response.data && response.data.success) {
        setTransferredLearners(response.data.data || []);
        setFilteredLearners(response.data.data || []);
      } else {
        setTransferredLearners([]);
        setFilteredLearners([]);
      }
    } catch (error) {
      console.error('Error fetching transferred learners:', error);
      if (error.response?.status !== 401) {
        toast.error('Error fetching transferred learners');
      }
      setTransferredLearners([]);
      setFilteredLearners([]);
    } finally {
      setLoading(false);
    }
  };

  const filterLearners = () => {
    if (!searchTerm) {
      setFilteredLearners(transferredLearners);
    } else {
      const filtered = transferredLearners.filter(learner =>
        learner.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        learner.admNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (learner.transferDetails?.destinationSchool && 
         learner.transferDetails.destinationSchool.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredLearners(filtered);
    }
  };

  const handleRestore = async (id) => {
    if (window.confirm('Restore this student back to active students?')) {
      try {
        const response = await api.put(`/transferred/${id}/restore`);
        if (response.data.success) {
          toast.success('Student restored successfully');
          fetchTransferredLearners();
        } else {
          toast.error(response.data.message || 'Error restoring student');
        }
      } catch (error) {
        console.error('Error restoring student:', error);
        toast.error('Error restoring student');
      }
    }
  };

  const handlePermanentDelete = async (id) => {
    if (window.confirm('Permanently delete this student? This action cannot be undone.')) {
      try {
        const response = await api.delete(`/transferred/${id}/permanent`);
        if (response.data.success) {
          toast.success('Student permanently deleted');
          fetchTransferredLearners();
        } else {
          toast.error(response.data.message || 'Error deleting student');
        }
      } catch (error) {
        console.error('Error deleting student:', error);
        toast.error('Error deleting student');
      }
    }
  };

  if (loading) {
    return (
      <Layout title="Transferred Learners" subtitle="View and manage transferred students">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Transferred Learners" subtitle="View and manage learners who have been transferred">
      {/* Stats Card */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">{filteredLearners.length}</h2>
            <p className="text-gray-600">Transferred Learners</p>
          </div>
          <div className="bg-blue-100 p-3 rounded-full">
            <FiRefreshCw className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search transferred learners..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Learners Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admission No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class & Stream</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transfer Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLearners.length > 0 ? (
                filteredLearners.map((learner) => (
                  <tr key={learner._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{learner.name}</td>
                    <td className="px-6 py-4 text-gray-600">{learner.admNo}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {learner.previousClass || learner.class}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-800">
                          To: <span className="font-medium">{learner.transferDetails?.destinationSchool || 'Unknown'}</span>
                        </p>
                        <p className="text-gray-500 text-xs">
                          Reason: {learner.transferDetails?.reason || 'N/A'}
                        </p>
                        <p className="text-gray-400 text-xs">
                          Date: {learner.transferDetails?.transferDate 
                            ? new Date(learner.transferDetails.transferDate).toLocaleDateString() 
                            : 'N/A'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {learner.parentPhone || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                        Transferred
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleRestore(learner._id)}
                          className="text-green-600 hover:text-green-800 text-sm flex items-center gap-1"
                        >
                          <FiRotateCcw className="w-3 h-3" /> Restore
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(learner._id)}
                          className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
                        >
                          <FiTrash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <p className="text-lg mb-2">No transferred learners found</p>
                      <Link to="/admin/pupils" className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
                        <FiArrowLeft className="w-4 h-4" /> Back to All Students
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default TransferredLearners;