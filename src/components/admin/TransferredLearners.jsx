// src/components/admin/TransferredLearners.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  FiSearch, FiRefreshCw, FiArrowLeft, FiTrash2, FiRotateCcw,
  FiAward, FiEye, FiX
} from 'react-icons/fi';
import { Link } from 'react-router-dom';

const TransferredLearners = () => {
  const [transferredLearners, setTransferredLearners] = useState([]);
  const [filteredLearners, setFilteredLearners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ NEW: Skills preview state
  const [skillsPreviewStudent, setSkillsPreviewStudent] = useState(null);
  const [skillsPreviewList, setSkillsPreviewList] = useState([]);
  const [loadingSkillsPreview, setLoadingSkillsPreview] = useState(false);

  useEffect(() => {
    fetchTransferredLearners();
  }, []);

  useEffect(() => {
    filterLearners();
  }, [searchTerm, transferredLearners]);

  const fetchTransferredLearners = async () => {
    try {
      const response = await api.get('/transferred');
      console.log('Transferred response:', response.data);

      if (response.data && response.data.success) {
        const learners = response.data.data || [];
        setTransferredLearners(learners);
        setFilteredLearners(learners);
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

  // ✅ NEW: Check if a learner has any skills on record
  const hasSkillsProfile = (learner) => {
    // Prefer backend-provided flag if present
    if (typeof learner.hasSkillsProfile === 'boolean') {
      return learner.hasSkillsProfile;
    }
    if (typeof learner.skillsCount === 'number') {
      return learner.skillsCount > 0;
    }
    // Fallback: check archived skills array if backend includes it
    if (Array.isArray(learner.archivedSkills)) {
      return learner.archivedSkills.length > 0;
    }
    // Default: unknown → assume no
    return false;
  };

  const getSkillsCount = (learner) => {
    if (typeof learner.skillsCount === 'number') return learner.skillsCount;
    if (Array.isArray(learner.archivedSkills)) return learner.archivedSkills.length;
    return 0;
  };

  // ✅ NEW: Fetch + show skills preview
  const handleViewSkills = async (learner) => {
    setSkillsPreviewStudent(learner);
    setSkillsPreviewList([]);
    setLoadingSkillsPreview(true);

    // 1. If learner already has archived skills embedded, use them
    if (Array.isArray(learner.archivedSkills) && learner.archivedSkills.length > 0) {
      setSkillsPreviewList(learner.archivedSkills);
      setLoadingSkillsPreview(false);
      return;
    }

    // 2. Otherwise try to fetch from the skills endpoint
    try {
      const res = await api.get(`/skills/pupil/${learner._id}`);
      if (res.data?.success) {
        setSkillsPreviewList(res.data.data || []);
      } else {
        setSkillsPreviewList([]);
      }
    } catch (err) {
      // Endpoint may not exist or pupil may be detached — fail gracefully
      console.warn('Could not fetch archived skills:', err.message);
      setSkillsPreviewList([]);
    } finally {
      setLoadingSkillsPreview(false);
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
                {/* ✅ NEW: Skills Profile Attached column */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Skills Profile Attached
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLearners.length > 0 ? (
                filteredLearners.map((learner) => {
                  const attached = hasSkillsProfile(learner);
                  const skillsCount = getSkillsCount(learner);

                  return (
                    <tr key={learner._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{learner.name}</td>
                      <td className="px-6 py-4 text-gray-600">{learner.admNo}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {learner.previousClass || learner.class}
                        {learner.stream ? ` • ${learner.stream}` : ''}
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

                      {/* ✅ NEW: Skills Profile Attached cell */}
                      <td className="px-6 py-4">
                        {attached ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">
                              <FiAward className="w-3 h-3" />
                              Yes
                              {skillsCount > 0 && <span className="text-[10px]">({skillsCount})</span>}
                            </span>
                            <button
                              onClick={() => handleViewSkills(learner)}
                              className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-0.5"
                              title="View archived skills"
                            >
                              <FiEye className="w-3 h-3" /> View
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-500">
                            No
                          </span>
                        )}
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
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
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

      {/* ✅ NEW: Skills Preview Modal */}
      {skillsPreviewStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <FiAward className="text-orange-600" /> Skills & Talents Profile
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {skillsPreviewStudent.name} • Adm: {skillsPreviewStudent.admNo}
                </p>
              </div>
              <button
                onClick={() => {
                  setSkillsPreviewStudent(null);
                  setSkillsPreviewList([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="p-5">
              {loadingSkillsPreview ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
                </div>
              ) : skillsPreviewList.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <FiAward className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    No archived skills found for this learner.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {skillsPreviewList.map((skill, idx) => (
                    <div
                      key={skill._id || idx}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-medium">
                          {skill.category}
                        </span>
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                          {skill.proficiency}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-800 text-sm">{skill.skillName}</p>
                      {skill.notes && (
                        <p className="text-xs text-gray-600 mt-1 italic">"{skill.notes}"</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">
                        {skill.term && `${skill.term} • `}
                        {skill.year}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => {
                  setSkillsPreviewStudent(null);
                  setSkillsPreviewList([]);
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default TransferredLearners;