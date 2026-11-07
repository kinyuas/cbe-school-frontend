// src/components/admin/TransferredAlumni.jsx
import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  FiSearch, FiRefreshCw, FiArrowLeft, FiTrash2, FiRotateCcw,
  FiAward, FiEye, FiX, FiUsers, FiTrendingUp, FiCalendar,
  FiClock, FiCheckCircle, FiAlertCircle, FiUserCheck, FiUserX,
  FiInfo, FiUserPlus, FiRepeat, FiArrowRight
} from 'react-icons/fi';

// ===== AI Device Detection Hook =====
const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    type: 'desktop', isMobile: false, isTablet: false, isDesktop: true,
    viewportWidth: 0, viewportHeight: 0, pixelRatio: 1, isTouchDevice: false,
  });

  useEffect(() => {
    const detectDevice = () => {
      const ua = navigator.userAgent;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const pixelRatio = window.devicePixelRatio || 1;

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || width < 768;
      const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua) || (width >= 768 && width < 1024);
      const isDesktop = !isMobile && !isTablet;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      let type = 'desktop';
      if (isMobile) type = 'mobile';
      else if (isTablet) type = 'tablet';

      setDeviceInfo({ type, isMobile, isTablet, isDesktop, viewportWidth: width, viewportHeight: height, pixelRatio, isTouchDevice });
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  return deviceInfo;
};

// ============================================================
// MAIN COMPONENT
// ============================================================
const TransferredAlumni = () => {
  const deviceInfo = useDeviceDetection();

  const [activeTab, setActiveTab] = useState('transferred'); // 'transferred' | 'alumni'
  const [refreshing, setRefreshing] = useState(false);

  // ---------- TRANSFERRED STATE ----------
  const [transferredLearners, setTransferredLearners] = useState([]);
  const [filteredLearners, setFilteredLearners] = useState([]);
  const [transferredLoading, setTransferredLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [skillsPreviewStudent, setSkillsPreviewStudent] = useState(null);
  const [skillsPreviewList, setSkillsPreviewList] = useState([]);
  const [loadingSkillsPreview, setLoadingSkillsPreview] = useState(false);

  // ---------- ALUMNI STATE ----------
  const [alumni, setAlumni] = useState([]);
  const [alumniLoading, setAlumniLoading] = useState(true);
  const [selectedAlumnus, setSelectedAlumnus] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnYear, setReturnYear] = useState('');
  const [returnClass, setReturnClass] = useState('');
  const [availableClasses, setAvailableClasses] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState({ classes: [] });
  const [returnReason, setReturnReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [highestClass, setHighestClass] = useState('');

  // ============================================================
  // LOAD SCHOOL INFO (shared)
  // ============================================================
  const loadSchoolInfo = useCallback(() => {
    try {
      const storedSchool = localStorage.getItem('schoolInfo');
      if (storedSchool) {
        const school = JSON.parse(storedSchool);
        setSchoolInfo(school);
        const activeClasses = (school.classes || [])
          .filter((c) => c.isActive !== false)
          .map((c) => c.name);
        setAvailableClasses(activeClasses);
        if (activeClasses.length > 0) {
          setHighestClass(activeClasses[activeClasses.length - 1]);
        }
      } else {
        const fallback = [
          'Play Group', 'Pre-Primary 1', 'Pre-Primary 2',
          'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
          'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9',
        ];
        setAvailableClasses(fallback);
        setHighestClass(fallback[fallback.length - 1]);
      }
    } catch (error) {
      console.error('Error loading school info:', error);
    }
  }, []);

  // ============================================================
  // TRANSFERRED FETCHERS
  // ============================================================
  const fetchTransferredLearners = useCallback(async () => {
    setTransferredLoading(true);
    try {
      const response = await api.get('/transferred');
      if (response.data?.success) {
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
      setTransferredLoading(false);
    }
  }, []);

  // ============================================================
  // ALUMNI FETCHERS
  // ============================================================
  const fetchAlumni = useCallback(async () => {
    setAlumniLoading(true);
    try {
      const response = await api.get('/alumni');
      if (response.data?.success) {
        // De-dupe by _id
        const unique = response.data.data.reduce((acc, current) => {
          const exists = acc.find((item) => item._id === current._id);
          return exists ? acc : acc.concat([current]);
        }, []);
        setAlumni(unique);
      } else {
        setAlumni([]);
      }
    } catch (error) {
      console.error('Error loading alumni:', error);
      toast.error('Failed to load alumni data');
      setAlumni([]);
    } finally {
      setAlumniLoading(false);
    }
  }, []);

  // ============================================================
  // INIT
  // ============================================================
  useEffect(() => {
    loadSchoolInfo();
    fetchTransferredLearners();
    fetchAlumni();
    // eslint-disable-next-line
  }, []);

  // Filter transferred learners by search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredLearners(transferredLearners);
    } else {
      const q = searchTerm.toLowerCase();
      setFilteredLearners(
        transferredLearners.filter(
          (learner) =>
            learner.name?.toLowerCase().includes(q) ||
            learner.admNo?.toLowerCase().includes(q) ||
            learner.transferDetails?.destinationSchool?.toLowerCase().includes(q)
        )
      );
    }
  }, [searchTerm, transferredLearners]);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    await Promise.all([fetchTransferredLearners(), fetchAlumni()]);
    toast.success('Refreshed');
    setRefreshing(false);
  };

  // ============================================================
  // TRANSFERRED ACTIONS
  // ============================================================
  const handleRestore = async (id) => {
    if (!window.confirm('Restore this student back to active students?')) return;
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
  };

  const handlePermanentDelete = async (id) => {
    if (!window.confirm('Permanently delete this student? This action cannot be undone.')) return;
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
  };

  const hasSkillsProfile = (learner) => {
    if (typeof learner.hasSkillsProfile === 'boolean') return learner.hasSkillsProfile;
    if (typeof learner.skillsCount === 'number') return learner.skillsCount > 0;
    if (Array.isArray(learner.archivedSkills)) return learner.archivedSkills.length > 0;
    return false;
  };

  const getSkillsCount = (learner) => {
    if (typeof learner.skillsCount === 'number') return learner.skillsCount;
    if (Array.isArray(learner.archivedSkills)) return learner.archivedSkills.length;
    return 0;
  };

  const handleViewSkills = async (learner) => {
    setSkillsPreviewStudent(learner);
    setSkillsPreviewList([]);
    setLoadingSkillsPreview(true);

    if (Array.isArray(learner.archivedSkills) && learner.archivedSkills.length > 0) {
      setSkillsPreviewList(learner.archivedSkills);
      setLoadingSkillsPreview(false);
      return;
    }

    try {
      const res = await api.get(`/skills/pupil/${learner._id}`);
      setSkillsPreviewList(res.data?.success ? res.data.data || [] : []);
    } catch (err) {
      console.warn('Could not fetch archived skills:', err.message);
      setSkillsPreviewList([]);
    } finally {
      setLoadingSkillsPreview(false);
    }
  };

  // ============================================================
  // ALUMNI ACTIONS
  // ============================================================
  const getHighestClass = () => highestClass || availableClasses[availableClasses.length - 1] || '';

  const handleReturnAlumni = (alumnus) => {
    setSelectedAlumnus(alumnus);
    setReturnYear(new Date().getFullYear().toString());
    setReturnClass(getHighestClass());
    setReturnReason('');
    setShowReturnModal(true);
  };

  const confirmReturn = async () => {
    if (!selectedAlumnus) return;
    if (!returnYear || !returnClass) {
      toast.error('Please select both year and class for re-admission');
      return;
    }
    setIsProcessing(true);
    try {
      const returnData = {
        year: returnYear,
        className: returnClass,
        reason: returnReason || 'Re-admitted after graduation',
        previousStatus: 'alumni',
        returnedAt: new Date().toISOString(),
        previousClass: selectedAlumnus.graduationClass || selectedAlumnus.class,
        actionType: 'readmission',
      };

      const response = await api.put(`/pupils/${selectedAlumnus._id}`, {
        status: 'active',
        class: returnClass,
        graduatedAt: null,
        graduationClass: '',
        returnHistory: [...(selectedAlumnus.returnHistory || []), returnData],
        statusHistory: [
          ...(selectedAlumnus.statusHistory || []),
          {
            from: 'alumni',
            to: 'active',
            reason: `Re-admitted to ${returnClass} (${returnYear}) - Returning student`,
            date: new Date().toISOString(),
            returnData,
            action: 'readmission',
          },
        ],
      });

      if (response.data.success) {
        toast.success(`${selectedAlumnus.name} re-admitted to ${returnClass} (${returnYear})`);
        setShowReturnModal(false);
        setSelectedAlumnus(null);
        await fetchAlumni();
      } else {
        toast.error('Failed to re-admit alumni');
      }
    } catch (error) {
      console.error('Error re-admitting alumni:', error);
      toast.error(error.response?.data?.message || 'Failed to re-admit alumni');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveAlumni = async (alumnus) => {
    if (!window.confirm(`Remove ${alumnus.name} from alumni?`)) return;
    try {
      const response = await api.put(`/pupils/${alumnus._id}`, {
        status: 'active',
        graduatedAt: null,
        graduationClass: '',
      });
      if (response.data.success) {
        toast.success(`${alumnus.name} removed from alumni`);
        await fetchAlumni();
      } else {
        toast.error('Failed to remove alumni');
      }
    } catch (error) {
      console.error('Error removing alumni:', error);
      toast.error('Failed to remove alumni');
    }
  };

  // ============================================================
  // DERIVED
  // ============================================================
  const alumniStats = {
    total: alumni.length,
    graduates: alumni.filter((a) => {
      const gradClass = a.graduationClass || a.class;
      const lastClass = availableClasses[availableClasses.length - 1];
      return gradClass === lastClass;
    }).length,
    yearsTracked: [...new Set(alumni.map((a) => new Date(a.graduatedAt || a.createdAt).getFullYear()))].length,
  };

  const loading = transferredLoading && alumniLoading;

  if (loading) {
    return (
      <Layout title="Transferred / Alumni" subtitle="Manage transferred learners and alumni">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  const TABS = [
    { key: 'transferred', label: 'Transferred Learners', icon: FiRepeat, count: transferredLearners.length },
    { key: 'alumni', label: 'Alumni', icon: FiAward, count: alumni.length },
  ];

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <Layout
      title="Transferred / Alumni"
      subtitle="Manage transferred learners and alumni in one place"
    >
      {/* Tabs */}
      <div className="flex overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-green-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-white/20' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Global Refresh */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleRefreshAll}
          disabled={refreshing}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
        >
          <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh All'}
        </button>
      </div>

      {/* ============ TRANSFERRED TAB ============ */}
      {activeTab === 'transferred' && (
        <div>
          {/* Stats */}
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

          {/* Search */}
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

          {/* Table */}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skills Profile</th>
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
                          <FiRepeat className="w-12 h-12 text-gray-300 mb-2" />
                          <p className="text-lg mb-2">No transferred learners found</p>
                          <Link
                            to="/admin/pupils"
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                          >
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
        </div>
      )}

      {/* ============ ALUMNI TAB ============ */}
      {activeTab === 'alumni' && (
        <div>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-md p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Alumni</p>
                  <p className="text-3xl font-bold text-gray-800">{alumniStats.total}</p>
                </div>
                <FiUsers className="w-10 h-10 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Graduates</p>
                  <p className="text-3xl font-bold text-gray-800">{alumniStats.graduates}</p>
                </div>
                <FiAward className="w-10 h-10 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Years Tracked</p>
                  <p className="text-3xl font-bold text-gray-800">{alumniStats.yearsTracked}</p>
                </div>
                <FiCalendar className="w-10 h-10 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Alumni List */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Alumni Directory</h2>

            {alumni.length === 0 ? (
              <div className="text-center py-12">
                <FiAward className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No alumni records yet</p>
              </div>
            ) : (
              <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'}`}>
                {alumni.map((alumnus) => {
                  const graduationYear = new Date(alumnus.graduatedAt || alumnus.createdAt).getFullYear();
                  const gradClass = alumnus.graduationClass || alumnus.class;
                  const lastClass = availableClasses[availableClasses.length - 1];
                  const isGraduate = gradClass === lastClass;

                  return (
                    <div
                      key={alumnus._id}
                      className="border rounded-lg hover:shadow-lg transition-shadow p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-gray-800 truncate">
                            {alumnus.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500">{gradClass}</span>
                            {isGraduate && (
                              <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full">
                                Graduate
                              </span>
                            )}
                          </div>
                        </div>
                        <FiCheckCircle className="text-green-500 w-4 h-4 flex-shrink-0" />
                      </div>

                      <div className="space-y-1 text-sm">
                        <p className="text-gray-500 flex items-center gap-1">
                          <FiCalendar className="w-3 h-3" /> Graduated: {graduationYear}
                        </p>
                        <p className="text-gray-500 flex items-center gap-1">
                          <FiClock className="w-3 h-3" />
                          Alumni since: {new Date(alumnus.graduatedAt || alumnus.updatedAt).toLocaleDateString()}
                        </p>
                        {alumnus.parentName && (
                          <p className="text-gray-400 truncate">Parent: {alumnus.parentName}</p>
                        )}
                      </div>

                      <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : ''} mt-3 pt-3 border-t border-gray-100`}>
                        <button
                          onClick={() => handleReturnAlumni(alumnus)}
                          className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center gap-1 flex-1 px-3 py-1.5 text-xs"
                          title="Re-admit to school"
                        >
                          <FiUserPlus className="w-3 h-3" /> RE-ADMIT
                        </button>
                        <button
                          onClick={() => handleRemoveAlumni(alumnus)}
                          className={`bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center gap-1 flex-1 px-3 py-1.5 text-xs ${deviceInfo.isMobile ? '' : 'ml-2'}`}
                          title="Remove from alumni"
                        >
                          <FiUserX className="w-3 h-3" /> REMOVE
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ SKILLS PREVIEW MODAL ============ */}
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
                  <p className="text-gray-500 text-sm">No archived skills found for this learner.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {skillsPreviewList.map((skill, idx) => (
                    <div key={skill._id || idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
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
                        {skill.term && `${skill.term} • `}{skill.year}
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

      {/* ============ ALUMNI RE-ADMIT MODAL ============ */}
      {showReturnModal && selectedAlumnus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Re-admit from Alumni</h2>
              <button
                onClick={() => setShowReturnModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-start gap-2 border border-blue-200">
              <FiInfo className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold">{selectedAlumnus.name}</p>
                <p>Current Status: Alumni ({selectedAlumnus.graduationClass || selectedAlumnus.class})</p>
                <p>
                  Graduated:{' '}
                  {new Date(selectedAlumnus.graduatedAt || selectedAlumnus.createdAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  <strong>Note:</strong> This student will be re-admitted to the highest class:{' '}
                  <strong>{getHighestClass()}</strong>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Re-admission Year *</label>
                <select
                  value={returnYear}
                  onChange={(e) => setReturnYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Year</option>
                  {(() => {
                    const graduationYear = new Date(selectedAlumnus.graduatedAt || selectedAlumnus.createdAt).getFullYear();
                    const currentYear = new Date().getFullYear();
                    const years = [];
                    for (let y = graduationYear; y <= currentYear; y++) years.push(y);
                    return years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ));
                  })()}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Re-admit to Class *</label>
                <select
                  value={returnClass}
                  onChange={(e) => setReturnClass(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Class</option>
                  <option value={getHighestClass()} className="font-semibold text-blue-600">
                    {getHighestClass()} (Highest Class - Recommended)
                  </option>
                  {availableClasses
                    .filter((cls) => cls !== getHighestClass())
                    .map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                </select>
                <p className="text-xs text-blue-500 mt-1">
                  <FiInfo className="inline mr-1" />
                  Students returning after graduation typically re-join the highest class:{' '}
                  <strong>{getHighestClass()}</strong>
                </p>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Reason for Re-admission (Optional)
                </label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Why is this student returning after graduation?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>

              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-800">
                  <strong>What happens when you re-admit a student?</strong>
                </p>
                <ul className="text-xs text-green-700 mt-2 list-disc list-inside space-y-1">
                  <li>Removed from the alumni list</li>
                  <li>Reactivated as a current student</li>
                  <li>Placed in the highest class ({getHighestClass()})</li>
                  <li>Retains all academic history</li>
                  <li>A record of this re-admission is kept</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-6">
              <button
                onClick={confirmReturn}
                disabled={isProcessing || !returnYear || !returnClass}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    PROCESSING...
                  </>
                ) : (
                  <>
                    <FiUserPlus className="w-4 h-4" /> RE-ADMIT STUDENT
                  </>
                )}
              </button>
              <button
                onClick={() => setShowReturnModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default TransferredAlumni;