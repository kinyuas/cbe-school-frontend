import React, { useState, useEffect } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import { FiCalendar, FiMapPin, FiMonitor, FiSmartphone, FiTablet, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
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
    isTouchDevice: false
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
      
      setDeviceInfo({
        type,
        isMobile,
        isTablet,
        isDesktop,
        viewportWidth: width,
        viewportHeight: height,
        pixelRatio,
        isTouchDevice
      });
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  return deviceInfo;
};

// ===== AI Responsive Helper =====
const useResponsiveClasses = (deviceInfo) => {
  return {
    cardPadding: deviceInfo.isMobile ? 'p-4' : 'p-6',
    headingSize: deviceInfo.isMobile ? 'text-lg' : 'text-xl',
    textSize: deviceInfo.isMobile ? 'text-sm' : 'text-base',
    buttonSize: deviceInfo.isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
    gridGap: deviceInfo.isMobile ? 'gap-3' : 'gap-6'
  };
};

const Announcements = () => {
  // AI Device Detection
  const deviceInfo = useDeviceDetection();
  const responsive = useResponsiveClasses(deviceInfo);
  
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setError(null);
      const response = await api.get('/events');
      console.log('📡 Announcements response:', response.data);
      
      // Handle different response formats
      let eventsData = [];
      if (response.data && response.data.success) {
        eventsData = response.data.data || [];
      } else if (Array.isArray(response.data)) {
        eventsData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        eventsData = response.data.data;
      }
      
      // Sort events by date (newest first)
      eventsData.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt);
        const dateB = new Date(b.date || b.createdAt);
        return dateB - dateA;
      });
      
      setAnnouncements(eventsData);
      
      if (eventsData.length === 0) {
        console.log('📭 No announcements found');
      } else {
        console.log(`✅ Found ${eventsData.length} announcements`);
      }
    } catch (error) {
      console.error('❌ Error fetching announcements:', error);
      setError(error.response?.data?.message || 'Failed to load announcements');
      toast.error('Error fetching announcements');
      setAnnouncements([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnnouncements();
    toast.success('Announcements refreshed');
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Date TBA';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-KE', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  // Get event type badge color
  const getEventTypeColor = (type) => {
    const types = {
      'Academic': 'bg-blue-100 text-blue-800',
      'Sports': 'bg-green-100 text-green-800',
      'Cultural': 'bg-purple-100 text-purple-800',
      'Meeting': 'bg-yellow-100 text-yellow-800',
      'Holiday': 'bg-red-100 text-red-800',
      'Exam': 'bg-orange-100 text-orange-800',
      'Other': 'bg-gray-100 text-gray-800'
    };
    return types[type] || types['Other'];
  };

  if (loading) {
    return (
      <Layout title="Announcements" subtitle="Stay updated with school events and news">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className={`mt-4 text-gray-600 ${deviceInfo.isMobile ? 'text-sm' : ''}`}>Loading announcements...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Announcements" subtitle="Stay updated with school events and news">
      
      {/* Header with Refresh Button - AI Responsive */}
      <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-3' : 'justify-between items-center'} mb-4`}>
        <div>
          <h2 className={`${deviceInfo.isMobile ? 'text-base' : 'text-xl'} font-bold text-gray-800`}>
            School Announcements
          </h2>
          <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-500`}>
            {announcements.length} {announcements.length === 1 ? 'announcement' : 'announcements'} available
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
            deviceInfo.isMobile ? 'w-full px-4 py-2.5 text-sm' : 'px-4 py-2 text-sm'
          }`}
        >
          <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Announcements'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
          <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Error loading announcements</p>
            <p className="text-sm text-red-600">{error}</p>
            <button 
              onClick={fetchAnnouncements} 
              className="mt-2 text-sm text-red-700 hover:text-red-900 font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Announcements List - AI Responsive */}
      <div className={`space-y-${deviceInfo.isMobile ? '4' : '6'}`}>
        {announcements.length > 0 ? (
          announcements.map((announcement) => (
            <div 
              key={announcement._id} 
              className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 ${
                responsive.cardPadding
              } border-l-4 ${announcement.type ? 'border-blue-500' : 'border-green-500'}`}
            >
              <div className={`flex ${deviceInfo.isMobile ? 'flex-col' : 'items-start'} gap-4`}>
                {/* Icon - AI Responsive */}
                <div className={`bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-full flex-shrink-0 ${
                  deviceInfo.isMobile ? 'self-start' : ''
                }`}>
                  <FiCalendar className={`${deviceInfo.isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-white`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* Title & Badge */}
                  <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'items-center'} justify-between flex-wrap`}>
                    <h3 className={`${deviceInfo.isMobile ? 'text-base' : 'text-xl'} font-bold text-gray-800 break-words`}>
                      {announcement.title}
                    </h3>
                    {announcement.type && (
                      <span className={`${getEventTypeColor(announcement.type)} px-2 py-1 rounded-full text-xs font-medium flex-shrink-0`}>
                        {announcement.type}
                      </span>
                    )}
                  </div>
                  
                  {/* Date & Venue - AI Responsive */}
                  <div className={`flex ${deviceInfo.isMobile ? 'flex-wrap gap-2' : 'items-center gap-4'} mt-2 text-sm text-gray-500`}>
                    <span className="flex items-center gap-1">
                      <FiCalendar className="w-4 h-4 flex-shrink-0" />
                      <span className={deviceInfo.isMobile ? 'text-xs' : 'text-sm'}>
                        {formatDate(announcement.date || announcement.createdAt)}
                      </span>
                    </span>
                    {announcement.venue && (
                      <span className="flex items-center gap-1">
                        <FiMapPin className="w-4 h-4 flex-shrink-0" />
                        <span className={deviceInfo.isMobile ? 'text-xs' : 'text-sm'}>
                          {announcement.venue}
                        </span>
                      </span>
                    )}
                    {announcement.time && (
                      <span className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-400`}>
                        ⏰ {announcement.time}
                      </span>
                    )}
                  </div>
                  
                  {/* Description - AI Responsive */}
                  <p className={`${deviceInfo.isMobile ? 'text-sm' : 'text-base'} text-gray-700 mt-3 leading-relaxed`}>
                    {announcement.description}
                  </p>
                  
                  {/* Organizer & Footer */}
                  <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'justify-between items-center'} mt-3 pt-3 border-t border-gray-100`}>
                    {announcement.organizer && (
                      <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-500`}>
                        👤 Organizer: <span className="font-medium text-gray-700">{announcement.organizer}</span>
                      </p>
                    )}
                    <span className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-400`}>
                      Posted: {new Date(announcement.createdAt || announcement.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="flex flex-col items-center">
              <div className="bg-gray-100 p-4 rounded-full mb-4">
                <FiCalendar className={`${deviceInfo.isMobile ? 'w-12 h-12' : 'w-16 h-16'} text-gray-400`} />
              </div>
              <h3 className={`${deviceInfo.isMobile ? 'text-lg' : 'text-xl'} font-semibold text-gray-800 mb-2`}>
                No Announcements Yet
              </h3>
              <p className={`${deviceInfo.isMobile ? 'text-sm' : 'text-base'} text-gray-500 max-w-md mx-auto`}>
                Check back later for updates on school events, holidays, and important announcements.
              </p>
              <button
                onClick={handleRefresh}
                className={`mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 ${
                  deviceInfo.isMobile ? 'px-4 py-2.5 text-sm' : 'px-6 py-2.5'
                }`}
              >
                <FiRefreshCw className="w-4 h-4" /> Check for Updates
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats - AI Responsive */}
      {announcements.length > 0 && (
        <div className={`mt-4 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-500 text-center border-t border-gray-200 pt-4`}>
          <p>
            Showing {announcements.length} {announcements.length === 1 ? 'announcement' : 'announcements'} 
            {announcements.length > 0 && ` • Latest: ${formatDate(announcements[0]?.date || announcements[0]?.createdAt)}`}
          </p>
        </div>
      )}

      {/* AI Responsive CSS */}
      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-view .p-6 {
            padding: 16px !important;
          }
          .mobile-view .gap-6 {
            gap: 16px !important;
          }
          .mobile-view .text-xl {
            font-size: 1.125rem !important;
          }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .tablet-view .grid-cols-2 {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        .responsive-wrapper {
          transition: all 0.3s ease;
        }
        .announcement-card {
          transition: all 0.3s ease;
        }
        .announcement-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
      `}</style>
    </Layout>
  );
};

export default Announcements;