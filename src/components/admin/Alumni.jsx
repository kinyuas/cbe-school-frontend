// src/components/admin/Alumni.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import { 
  FiUsers, FiTrendingUp, FiCalendar, FiAward, FiRefreshCw, 
  FiTrash2, FiRotateCcw, FiClock, FiCheckCircle, FiAlertCircle,
  FiUserCheck, FiUserX, FiArrowDown, FiInfo, FiGithub, FiX,
  FiUserPlus, FiCornerDownLeft
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// ===== AI Device Detection Hook =====
const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    type: 'desktop',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    viewportWidth: 0,
    viewportHeight: 0,
    pixelRatio: 1,
    isTouchDevice: false,
    connectionType: 'unknown'
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
      
      let connectionType = 'unknown';
      if (navigator.connection) {
        connectionType = navigator.connection.effectiveType || 'unknown';
      }
      
      let type = 'desktop';
      if (isMobile) type = 'mobile';
      else if (isTablet) type = 'tablet';
      
      setDeviceInfo({
        type,
        isMobile,
        isTablet,
        isDesktop,
        viewportWidth: width,
        viewportHeight: height,
        pixelRatio,
        isTouchDevice,
        connectionType
      });
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  return deviceInfo;
};

// ===== AI Responsive Grid Helper =====
const useResponsiveGrid = (deviceInfo) => {
  if (deviceInfo.isMobile) return 'grid-cols-1';
  if (deviceInfo.isTablet) return 'grid-cols-2';
  return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
};

// ===== AI Responsive Layout Classes =====
const useResponsiveClasses = (deviceInfo) => {
  return {
    cardPadding: deviceInfo.isMobile ? 'p-4' : 'p-6',
    headingSize: deviceInfo.isMobile ? 'text-lg' : 'text-xl',
    textSize: deviceInfo.isMobile ? 'text-sm' : 'text-base',
    buttonSize: deviceInfo.isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-2 text-sm',
    gapSize: deviceInfo.isMobile ? 'gap-3' : 'gap-6',
    gridGap: deviceInfo.isMobile ? 'gap-2' : 'gap-4'
  };
};

const Alumni = () => {
  // AI Device Detection
  const deviceInfo = useDeviceDetection();
  const responsiveGrid = useResponsiveGrid(deviceInfo);
  const responsive = useResponsiveClasses(deviceInfo);
  
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlumnus, setSelectedAlumnus] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnYear, setReturnYear] = useState('');
  const [returnClass, setReturnClass] = useState('');
  const [availableClasses, setAvailableClasses] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState({ classes: [] });
  const [returnReason, setReturnReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [classOrderMap, setClassOrderMap] = useState({});
  const [highestClass, setHighestClass] = useState('');

  useEffect(() => {
    loadData();
    loadSchoolInfo();
  }, []);

  const loadSchoolInfo = () => {
    try {
      const storedSchool = localStorage.getItem('schoolInfo');
      if (storedSchool) {
        const school = JSON.parse(storedSchool);
        setSchoolInfo(school);
        
        // Get active classes in the correct order
        const activeClasses = (school.classes || [])
          .filter(c => c.isActive !== false)
          .map(c => c.name);
        
        setAvailableClasses(activeClasses);
        
        // Set highest class (last in the order)
        if (activeClasses.length > 0) {
          setHighestClass(activeClasses[activeClasses.length - 1]);
        }
        
        // Create a map of class to its index for easy lookup
        const orderMap = {};
        activeClasses.forEach((cls, index) => {
          orderMap[cls] = index;
        });
        setClassOrderMap(orderMap);
        
        console.log('Loaded class order from school settings:', activeClasses);
        console.log('Highest class:', activeClasses[activeClasses.length - 1]);
      } else {
        // Fallback classes if no school info
        const fallbackClasses = [
          'Play Group', 'Pre-Primary 1', 'Pre-Primary 2',
          'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 
          'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'
        ];
        setAvailableClasses(fallbackClasses);
        setHighestClass(fallbackClasses[fallbackClasses.length - 1]);
        const orderMap = {};
        fallbackClasses.forEach((cls, index) => {
          orderMap[cls] = index;
        });
        setClassOrderMap(orderMap);
      }
    } catch (error) {
      console.error('Error loading school info:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const alumniResponse = await api.get('/alumni');
      if (alumniResponse.data.success) {
        const uniqueAlumni = alumniResponse.data.data.reduce((acc, current) => {
          const x = acc.find(item => item._id === current._id);
          if (!x) {
            return acc.concat([current]);
          } else {
            return acc;
          }
        }, []);
        setAlumni(uniqueAlumni);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data from server');
    } finally {
      setLoading(false);
    }
  };

  // ===== Get the Highest Class =====
  const getHighestClass = () => {
    return highestClass || availableClasses[availableClasses.length - 1] || '';
  };

  // ===== RE-ADMIT / RETURN FUNCTIONALITY =====
  const handleReturnAlumni = (alumnus) => {
    setSelectedAlumnus(alumnus);
    // Pre-fill with current year
    const currentYear = new Date().getFullYear();
    setReturnYear(currentYear.toString());
    
    // Set to the highest class (for repeating)
    const highest = getHighestClass();
    
    console.log(`Returning ${alumnus.name}: Graduated from ${alumnus.graduationClass || alumnus.class}, Will return to: ${highest}`);
    
    setReturnClass(highest);
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
      // Get the return data
      const returnData = {
        year: returnYear,
        className: returnClass,
        reason: returnReason || 'Re-admitted after graduation',
        previousStatus: 'alumni',
        returnedAt: new Date().toISOString(),
        previousClass: selectedAlumnus.graduationClass || selectedAlumnus.class,
        actionType: 'readmission'
      };

      // Update pupil status to active and set class
      const response = await api.put(`/pupils/${selectedAlumnus._id}`, {
        status: 'active',
        class: returnClass,
        graduatedAt: null,
        graduationClass: '',
        // Store return history
        returnHistory: [
          ...(selectedAlumnus.returnHistory || []),
          returnData
        ],
        // Keep track of alumni status change
        statusHistory: [
          ...(selectedAlumnus.statusHistory || []),
          {
            from: 'alumni',
            to: 'active',
            reason: `Re-admitted to ${returnClass} (${returnYear}) - Returning student`,
            date: new Date().toISOString(),
            returnData: returnData,
            action: 'readmission'
          }
        ]
      });

      if (response.data.success) {
        toast.success(`${selectedAlumnus.name} has been re-admitted to ${returnClass} for year ${returnYear}`);
        setShowReturnModal(false);
        setSelectedAlumnus(null);
        await loadData();
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
        graduationClass: ''
      });

      if (response.data.success) {
        toast.success(`${alumnus.name} removed from alumni`);
        await loadData();
      } else {
        toast.error('Failed to remove alumni');
      }
    } catch (error) {
      console.error('Error removing alumni:', error);
      toast.error('Failed to remove alumni');
    }
  };

  const clearLocalStorageData = () => {
    if (window.confirm('Clear local alumni data? This will not affect the database.')) {
      localStorage.removeItem('alumni');
      localStorage.removeItem('pupils');
      toast.success('Local storage cleared. Refreshing data...');
      loadData();
    }
  };

  const stats = {
    total: alumni.length,
    graduates: alumni.filter(a => {
      const gradClass = a.graduationClass || a.class;
      const lastClass = availableClasses[availableClasses.length - 1];
      return gradClass === lastClass;
    }).length,
    yearsTracked: [...new Set(alumni.map(a => new Date(a.graduatedAt || a.createdAt).getFullYear()))].length,
    byYear: alumni.reduce((acc, curr) => {
      const year = new Date(curr.graduatedAt || curr.createdAt).getFullYear();
      acc[year] = (acc[year] || 0) + 1;
      return acc;
    }, {})
  };

  // ===== RETURN MODAL =====
  const ReturnModal = () => {
    if (!showReturnModal || !selectedAlumnus) return null;

    const graduationYear = new Date(selectedAlumnus.graduatedAt || selectedAlumnus.createdAt).getFullYear();
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = graduationYear; y <= currentYear; y++) {
      years.push(y);
    }

    const highest = getHighestClass();

    return (
      <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${
        deviceInfo.isMobile ? 'p-2' : ''
      }`}>
        <div className={`bg-white rounded-xl w-full max-w-md ${
          deviceInfo.isMobile ? 'mx-2 p-4' : 'p-6'
        } max-h-[90vh] overflow-y-auto`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`${deviceInfo.isMobile ? 'text-lg' : 'text-2xl'} font-bold text-gray-800`}>
              Re-admit from Alumni
            </h2>
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
              <p>Graduated: {new Date(selectedAlumnus.graduatedAt || selectedAlumnus.createdAt).toLocaleDateString()}</p>
              <p className="text-xs text-blue-600 mt-1">
                <strong>Note:</strong> This student will be re-admitted to the highest class: <strong>{highest}</strong>
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Re-admission Year *</label>
              <select
                value={returnYear}
                onChange={(e) => setReturnYear(e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  deviceInfo.isMobile ? 'text-base' : ''
                }`}
              >
                <option value="">Select Year</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Re-admit to Class *</label>
              <select
                value={returnClass}
                onChange={(e) => setReturnClass(e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  deviceInfo.isMobile ? 'text-base' : ''
                }`}
              >
                <option value="">Select Class</option>
                <option value={highest} className="font-semibold text-blue-600">
                  {highest} (Highest Class - Recommended)
                </option>
                {availableClasses.filter(cls => cls !== highest).map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
              <p className="text-xs text-blue-500 mt-1">
                <FiInfo className="inline mr-1" /> 
                Students returning after graduation typically re-join the highest class: <strong>{highest}</strong>
              </p>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Reason for Re-admission (Optional)</label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Why is this student returning after graduation? (e.g., Wanting to repeat, Family reasons, etc.)"
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  deviceInfo.isMobile ? 'text-base' : ''
                }`}
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
                <li>Placed in the highest class ({highest})</li>
                <li>Retains all academic history</li>
                <li>A record of this re-admission is kept</li>
              </ul>
            </div>
          </div>

          <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'space-x-3'} mt-6`}>
            <button
              onClick={confirmReturn}
              disabled={isProcessing || !returnYear || !returnClass}
              className={`${deviceInfo.isMobile ? 'w-full' : 'flex-1'} bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50`}
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
              className={`${deviceInfo.isMobile ? 'w-full' : 'flex-1'} bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg`}
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout title="Alumni Management" subtitle="AI-Powered Alumni Tracking System">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className={`ml-4 text-gray-600 ${deviceInfo.isMobile ? 'text-sm' : ''}`}>Loading alumni data...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Alumni Management" subtitle="AI-Powered Alumni Tracking System">
      
      {/* Stats Cards - AI Responsive */}
      <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-3 gap-6'} mb-${deviceInfo.isMobile ? '4' : '8'}`}>
        <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding}`}>
          <div className={`flex items-center ${deviceInfo.isMobile ? 'justify-start gap-4' : 'justify-between'}`}>
            <div>
              <p className="text-gray-500 text-sm">Total Alumni</p>
              <p className={`${deviceInfo.isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-800`}>{stats.total}</p>
            </div>
            <FiUsers className={`${deviceInfo.isMobile ? 'w-8 h-8' : 'w-10 h-10'} text-blue-500`} />
          </div>
        </div>
        <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding}`}>
          <div className={`flex items-center ${deviceInfo.isMobile ? 'justify-start gap-4' : 'justify-between'}`}>
            <div>
              <p className="text-gray-500 text-sm">Graduates</p>
              <p className={`${deviceInfo.isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-800`}>{stats.graduates}</p>
            </div>
            <FiAward className={`${deviceInfo.isMobile ? 'w-8 h-8' : 'w-10 h-10'} text-green-500`} />
          </div>
        </div>
        <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding}`}>
          <div className={`flex items-center ${deviceInfo.isMobile ? 'justify-start gap-4' : 'justify-between'}`}>
            <div>
              <p className="text-gray-500 text-sm">Years Tracked</p>
              <p className={`${deviceInfo.isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-800`}>{stats.yearsTracked}</p>
            </div>
            <FiCalendar className={`${deviceInfo.isMobile ? 'w-8 h-8' : 'w-10 h-10'} text-purple-500`} />
          </div>
        </div>
      </div>

      {/* Actions Bar - AI Responsive */}
      <div className={`bg-white rounded-xl shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-4'} mb-${deviceInfo.isMobile ? '4' : '8'} flex flex-wrap gap-3 items-center justify-between`}>
        <div className={`flex ${deviceInfo.isMobile ? 'flex-wrap' : 'flex'} items-center gap-3`}>
          <button
            onClick={loadData}
            className={`bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 ${
              deviceInfo.isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-2 text-sm'
            }`}
          >
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={clearLocalStorageData}
            className={`bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 ${
              deviceInfo.isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-2 text-sm'
            }`}
          >
            Clear Cache
          </button>
        </div>
        <div className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-500`}>
          <span>Total: {stats.total} alumni</span>
        </div>
      </div>

      {/* Alumni List - AI Responsive */}
      <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding}`}>
        <h2 className={`${responsive.headingSize} font-bold text-gray-800 mb-4`}>Alumni Directory</h2>
        
        {alumni.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No alumni records yet</p>
        ) : (
          <div className={`grid ${responsiveGrid} ${responsive.gridGap}`}>
            {alumni.map((alumnus) => {
              const graduationYear = new Date(alumnus.graduatedAt || alumnus.createdAt).getFullYear();
              const gradClass = alumnus.graduationClass || alumnus.class;
              const lastClass = availableClasses[availableClasses.length - 1];
              const isGraduate = gradClass === lastClass;
              
              return (
                <div 
                  key={alumnus._id} 
                  className={`border rounded-lg hover:shadow-lg transition-shadow ${
                    deviceInfo.isMobile ? 'p-3' : 'p-4'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className={`${deviceInfo.isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-800 truncate`}>
                        {alumnus.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-500`}>
                          {gradClass}
                        </span>
                        {isGraduate && (
                          <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full">
                            Graduate
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <FiCheckCircle className="text-green-500 w-4 h-4" />
                    </div>
                  </div>

                  <div className={`space-y-1 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>
                    <p className="text-gray-500 flex items-center gap-1">
                      <FiCalendar className="w-3 h-3" />
                      Graduated: {graduationYear}
                    </p>
                    <p className="text-gray-500 flex items-center gap-1">
                      <FiClock className="w-3 h-3" />
                      Alumni since: {new Date(alumnus.graduatedAt || alumnus.updatedAt).toLocaleDateString()}
                    </p>
                    {alumnus.parentName && (
                      <p className="text-gray-400 truncate">Parent: {alumnus.parentName}</p>
                    )}
                  </div>

                  <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'flex'} mt-3 pt-3 border-t border-gray-100`}>
                    <button
                      onClick={() => handleReturnAlumni(alumnus)}
                      className={`bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center gap-1 flex-1 ${
                        deviceInfo.isMobile ? 'px-2 py-1.5 text-xs' : 'px-3 py-1.5 text-xs'
                      }`}
                      title="Re-admit to school"
                    >
                      <FiUserPlus className="w-3 h-3" /> RE-ADMIT
                    </button>
                    <button
                      onClick={() => handleRemoveAlumni(alumnus)}
                      className={`bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center gap-1 flex-1 ${
                        deviceInfo.isMobile ? 'px-2 py-1.5 text-xs' : 'px-3 py-1.5 text-xs'
                      }`}
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

      {/* Return/Re-admit Modal */}
      <ReturnModal />

      {/* AI Responsive CSS - No visible device info */}
      <style jsx>{`
        @media (max-width: 768px) {
          .alumni-card {
            padding: 12px !important;
          }
          .alumni-stats {
            gap: 12px !important;
          }
          .alumni-actions {
            padding: 12px !important;
          }
          .alumni-grid {
            gap: 12px !important;
          }
          input, select, textarea {
            font-size: 16px !important;
          }
        }
        
        @media (min-width: 769px) and (max-width: 1024px) {
          .alumni-grid-tablet {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        
        .responsive-wrapper {
          transition: all 0.3s ease;
        }
      `}</style>
    </Layout>
  );
};

export default Alumni;