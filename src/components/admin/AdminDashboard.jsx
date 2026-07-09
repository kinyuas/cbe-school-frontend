import React, { useState, useEffect } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import AddPupilModal from '../modals/AddPupilModal';
import AddTeacherModal from '../modals/AddTeacherModal';
import toast from 'react-hot-toast';
import { 
  FiUsers, 
  FiUserCheck, 
  FiCalendar, 
  FiBookOpen, 
  FiFileText, 
  FiBarChart2, 
  FiAward,
  FiTrendingUp,
  FiTarget,
  FiPlus,
  FiEdit3,
  FiPrinter,
  FiClock,
  FiMapPin,
  FiMonitor,
  FiSmartphone,
  FiTablet,
  FiRefreshCw,
  FiUser,
  FiMail,
  FiPhone,
  FiBriefcase
} from 'react-icons/fi';
import { Link } from 'react-router-dom';

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
    cardPadding: deviceInfo.isMobile ? 'p-3' : 'p-4',
    headingSize: deviceInfo.isMobile ? 'text-base' : 'text-xl',
    textSize: deviceInfo.isMobile ? 'text-xs' : 'text-sm',
    buttonSize: deviceInfo.isMobile ? 'px-2 py-1.5 text-xs' : 'px-4 py-3 text-sm',
    gridGap: deviceInfo.isMobile ? 'gap-2' : 'gap-3',
    statsGrid: deviceInfo.isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6'
  };
};

const AdminDashboard = () => {
  // AI Device Detection
  const deviceInfo = useDeviceDetection();
  const responsive = useResponsiveClasses(deviceInfo);
  
  // Store all numbers we need to show on the dashboard
  const [stats, setStats] = useState({
    learners: 0,
    teachers: 0,
    events: 0,
    exams: 0,
    alumni: 0,
    transferred: 0
  });
  
  // Store lists of students and teachers
  const [recentStudents, setRecentStudents] = useState([]);
  const [recentTeachers, setRecentTeachers] = useState([]);
  
  // Store upcoming exams and events
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schoolName, setSchoolName] = useState('School');
  const [schoolMotto, setSchoolMotto] = useState('Excellence in Education');
  
  // Modal states for quick actions
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);

  // When page loads, fetch data from API
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Fetch all data from database API
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load school info
      const schoolResponse = await api.get('/school/settings').catch(() => ({ data: { data: {} } }));
      if (schoolResponse.data?.success && schoolResponse.data?.data) {
        const school = schoolResponse.data.data;
        setSchoolName(school.schoolName || school.name || 'School');
        setSchoolMotto(school.motto || 'Excellence in Education');
      }

      // Fetch all data in parallel for better performance
      const [
        pupilsResponse,
        teachersResponse,
        eventsResponse,
        examsResponse,
        alumniResponse,
        transferredResponse
      ] = await Promise.all([
        api.get('/pupils').catch(() => ({ data: { data: [] } })),
        api.get('/teachers').catch(() => ({ data: { data: [] } })),
        api.get('/events').catch(() => ({ data: { data: [] } })),
        api.get('/exams').catch(() => ({ data: { data: [] } })),
        api.get('/alumni').catch(() => ({ data: { data: [] } })),
        api.get('/transferred').catch(() => ({ data: { data: [] } }))
      ]);
      
      const pupils = pupilsResponse.data?.data || [];
      const teachers = teachersResponse.data?.data || [];
      const events = eventsResponse.data?.data || [];
      const exams = examsResponse.data?.data || [];
      const alumni = alumniResponse.data?.data || [];
      const transferred = transferredResponse.data?.data || [];
      
      // Get recent students (last 5)
      const recentPupils = pupils.slice(0, 5);
      setRecentStudents(recentPupils);
      
      // Get recent teachers (last 5)
      const recentTeachersList = teachers.slice(0, 5);
      setRecentTeachers(recentTeachersList);
      
      // Filter upcoming exams (not expired) - limit to 5
      const now = new Date();
      const activeExams = exams.filter(exam => {
        if (!exam.endDateTime) return true;
        const examEnd = new Date(exam.endDateTime);
        return examEnd >= now;
      }).slice(0, 5);
      
      // Show all events sorted by date
      const allEvents = [...events].sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        return dateB - dateA; // Newest first
      }).slice(0, 5);
      
      setUpcomingExams(activeExams);
      setUpcomingEvents(allEvents);
      
      // Update all numbers on the dashboard (removed outcomes/results)
      setStats({
        learners: pupils.length,
        teachers: teachers.length,
        events: events.length,
        exams: exams.length,
        alumni: alumni.length,
        transferred: transferred.length
      });
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    toast.success('Dashboard refreshed');
  };

  // Handle adding a new student
  const handleAddStudent = async (studentData) => {
    try {
      const response = await api.post('/pupils', studentData);
      if (response.data.success) {
        toast.success('Student added successfully');
        setShowAddStudentModal(false);
        loadDashboardData();
      } else {
        toast.error(response.data.message || 'Failed to add student');
      }
    } catch (error) {
      console.error('Error adding student:', error);
      toast.error(error.response?.data?.message || 'Failed to add student');
    }
  };

  // Handle adding a new teacher
  const handleAddTeacher = async (teacherData) => {
    try {
      const response = await api.post('/teachers', teacherData);
      if (response.data.success) {
        toast.success(`Teacher added successfully. Login password: ${teacherData.tscNumber.slice(-6)}`);
        setShowAddTeacherModal(false);
        loadDashboardData();
      } else {
        toast.error(response.data.message || 'Failed to add teacher');
      }
    } catch (error) {
      console.error('Error adding teacher:', error);
      toast.error(error.response?.data?.message || 'Failed to add teacher');
    }
  };

  // Format date nicely
  const formatDate = (dateString) => {
    if (!dateString) return 'Date TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Format time nicely
  const formatTime = (timeString) => {
    if (!timeString) return '';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-KE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <Layout title="Control Panel" subtitle="CBE - Competency Based Education">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  // Get stats cards array for responsive rendering (removed Results)
  const statCards = [
    { title: 'Students', value: stats.learners, icon: FiUsers, color: 'text-blue-500', link: '/admin/pupils' },
    { title: 'Teachers', value: stats.teachers, icon: FiUserCheck, color: 'text-green-500', link: '/admin/teachers' },
    { title: 'Exams', value: stats.exams, icon: FiFileText, color: 'text-indigo-500', link: '/admin/exams' },
    { title: 'Graduates', value: stats.alumni, icon: FiAward, color: 'text-purple-500', link: '/admin/alumni' },
    { title: 'Transferred', value: stats.transferred, icon: FiTrendingUp, color: 'text-yellow-500', link: '/admin/transferred-learners' },
    { title: 'Events', value: stats.events, icon: FiCalendar, color: 'text-pink-500', link: '/admin/events' },
  ];

  return (
    <Layout 
      title={`${schoolName} - Control Panel`} 
      subtitle={`CBE - Competency Based Education | ${schoolMotto}`}
    >
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 ${
            deviceInfo.isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-2 text-sm'
          }`}
        >
          <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Dashboard'}
        </button>
      </div>

      {/* Welcome Message - CBE Dashboard Card */}
      <div className={`bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl ${deviceInfo.isMobile ? 'p-3' : 'p-4'} mb-6`}>
        <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'items-center justify-between'}`}>
          <div>
            <h2 className={`${deviceInfo.isMobile ? 'text-base' : 'text-xl'} font-bold`}>
              Competency Based Education (CBE) Dashboard
            </h2>
            {/* <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-sm'} opacity-90`}>
              Track student progress, manage teachers, and view competencies all in one place
            </p> */}
          </div>
          <div className={`flex items-center gap-2 ${deviceInfo.isMobile ? 'mt-1' : ''}`}>
            <FiTarget className={`${deviceInfo.isMobile ? 'w-6 h-6' : 'w-10 h-10'} opacity-80`} />
            <span className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} font-semibold bg-white/20 px-3 py-1 rounded-full`}>
              {schoolName}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions - Below CBE Dashboard Card */}
      <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding} mb-6`}>
        <h2 className={`${responsive.headingSize} font-bold text-gray-800 mb-4`}>Quick Actions</h2>
        <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-3 md:grid-cols-6 gap-3'}`}>
          <button 
            onClick={() => setShowAddStudentModal(true)}
            className={`bg-blue-600 text-white rounded-lg text-center hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 ${deviceInfo.isMobile ? 'px-2 py-2 text-xs' : 'px-4 py-3 text-sm'}`}
          >
            <FiPlus className="w-4 h-4" /> Add Student
          </button>
          <button 
            onClick={() => setShowAddTeacherModal(true)}
            className={`bg-green-600 text-white rounded-lg text-center hover:bg-green-700 transition-colors flex items-center justify-center gap-2 ${deviceInfo.isMobile ? 'px-2 py-2 text-xs' : 'px-4 py-3 text-sm'}`}
          >
            <FiPlus className="w-4 h-4" /> Add Teacher
          </button>
          <Link to="/admin/exams" className={`bg-indigo-600 text-white rounded-lg text-center hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 ${deviceInfo.isMobile ? 'px-2 py-2 text-xs' : 'px-4 py-3 text-sm'}`}>
            <FiFileText className="w-4 h-4" /> Assessment
          </Link>
          <Link to="/admin/modify-results" className={`bg-orange-600 text-white rounded-lg text-center hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 ${deviceInfo.isMobile ? 'px-2 py-2 text-xs' : 'px-4 py-3 text-sm'}`}>
            <FiEdit3 className="w-4 h-4" /> Results
          </Link>
          <Link to="/admin/reports" className={`bg-teal-600 text-white rounded-lg text-center hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 ${deviceInfo.isMobile ? 'px-2 py-2 text-xs' : 'px-4 py-3 text-sm'}`}>
            <FiBarChart2 className="w-4 h-4" /> Reports
          </Link>
          <Link to="/admin/pupils" className={`bg-purple-600 text-white rounded-lg text-center hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 ${deviceInfo.isMobile ? 'px-2 py-2 text-xs' : 'px-4 py-3 text-sm'}`}>
            <FiUsers className="w-4 h-4" /> Students
          </Link>
        </div>
      </div>
      
      {/* Quick Stats Cards - AI Responsive */}
      <div className={`grid ${responsive.statsGrid} ${responsive.gridGap} mb-6`}>
        {statCards.map((stat, index) => (
          <Link 
            key={index} 
            to={stat.link} 
            className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all ${deviceInfo.isMobile ? 'p-2' : 'p-3'}`}
          >
            <div className={`flex ${deviceInfo.isMobile ? 'items-center gap-2' : 'items-center justify-between'}`}>
              <div>
                <p className={`text-gray-500 ${deviceInfo.isMobile ? 'text-[8px]' : 'text-xs'}`}>{stat.title}</p>
                <p className={`${deviceInfo.isMobile ? 'text-base' : 'text-xl'} font-bold`}>{stat.value}</p>
              </div>
              <stat.icon className={`${deviceInfo.isMobile ? 'w-4 h-4' : 'w-5 h-5'} ${stat.color}`} />
            </div>
          </Link>
        ))}
      </div>

      <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-1' : 'lg:grid-cols-2'} gap-6`}>
        
        {/* Recent Students Section - Replaces Competency Levels */}
        <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`${responsive.headingSize} font-bold text-gray-800 flex items-center gap-2`}>
              <FiUsers className="text-blue-600" /> Recent Students
            </h2>
            <Link to="/admin/pupils" className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-blue-600 hover:text-blue-800`}>
              View All →
            </Link>
          </div>
          {recentStudents.length > 0 ? (
            <div className="space-y-3">
              {recentStudents.map((student, index) => (
                <div key={student._id || index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FiUser className="text-blue-600 text-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-800 truncate`}>
                      {student.name || student.fullName || 'Unknown Student'}
                    </p>
                    <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-0.5' : 'items-center gap-2'} text-[10px] text-gray-500`}>
                      <span>Class: {student.class || student.grade || 'N/A'}</span>
                      {student.admNo && <span>• Adm: {student.admNo}</span>}
                    </div>
                  </div>
                  <Link 
                    to={`/admin/pupils/${student._id}`}
                    className="text-xs text-blue-600 hover:text-blue-800 flex-shrink-0"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <FiUsers className={`${deviceInfo.isMobile ? 'w-8 h-8' : 'w-10 h-10'} text-gray-300 mx-auto mb-2`} />
              <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-500`}>No students registered yet</p>
              <button 
                onClick={() => setShowAddStudentModal(true)}
                className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-blue-600 hover:text-blue-800 mt-2 inline-block`}
              >
                Add First Student →
              </button>
            </div>
          )}
        </div>

        {/* Recent Teachers Section - Replaces Upcoming Exams */}
        <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`${responsive.headingSize} font-bold text-gray-800 flex items-center gap-2`}>
              <FiUserCheck className="text-green-600" /> Recent Teachers
            </h2>
            <Link to="/admin/teachers" className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-green-600 hover:text-green-800`}>
              View All →
            </Link>
          </div>
          {recentTeachers.length > 0 ? (
            <div className="space-y-3">
              {recentTeachers.map((teacher, index) => (
                <div key={teacher._id || index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <FiUserCheck className="text-green-600 text-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-800 truncate`}>
                      {teacher.name || teacher.fullName || 'Unknown Teacher'}
                    </p>
                    <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-0.5' : 'items-center gap-2'} text-[10px] text-gray-500`}>
                      <span>TSC: {teacher.tscNumber || 'N/A'}</span>
                      {teacher.phone && <span>• {teacher.phone}</span>}
                    </div>
                  </div>
                  <Link 
                    to={`/admin/teachers/${teacher._id}`}
                    className="text-xs text-green-600 hover:text-green-800 flex-shrink-0"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <FiUserCheck className={`${deviceInfo.isMobile ? 'w-8 h-8' : 'w-10 h-10'} text-gray-300 mx-auto mb-2`} />
              <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-500`}>No teachers registered yet</p>
              <button 
                onClick={() => setShowAddTeacherModal(true)}
                className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-green-600 hover:text-green-800 mt-2 inline-block`}
              >
                Add First Teacher →
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-1' : 'lg:grid-cols-2'} gap-6 mt-6`}>
        
        {/* Upcoming Exams Section */}
        <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding}`}>
          <h2 className={`${responsive.headingSize} font-bold text-gray-800 mb-4 flex items-center gap-2`}>
            <FiFileText className="text-indigo-600" /> Upcoming Exams
          </h2>
          {upcomingExams.length > 0 ? (
            <div className="space-y-3">
              {upcomingExams.map((exam, index) => (
                <div key={exam._id || index} className="border-l-4 border-indigo-500 pl-3 py-2 hover:bg-gray-50 transition-colors">
                  <h3 className={`${deviceInfo.isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-800`}>{exam.title}</h3>
                  <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500`}>
                    {exam.type || 'Assessment'} • {exam.term || 'Current Term'}
                  </p>
                  <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'items-center gap-3'} mt-1 text-xs text-gray-500`}>
                    <span className="flex items-center gap-1">
                      <FiCalendar className="w-3 h-3" />
                      {formatDate(exam.startDate || exam.startDateTime)}
                    </span>
                    {exam.startTime && (
                      <span className="flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        {formatTime(exam.startTime)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <FiFileText className={`${deviceInfo.isMobile ? 'w-8 h-8' : 'w-10 h-10'} text-gray-300 mx-auto mb-2`} />
              <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-500`}>No upcoming exams</p>
              <Link to="/admin/exams" className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-indigo-600 hover:text-indigo-800 mt-2 inline-block`}>
                Schedule Exam →
              </Link>
            </div>
          )}
          <Link to="/admin/exams" className={`block text-center ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-indigo-600 hover:text-indigo-800 mt-4`}>
            View All Exams →
          </Link>
        </div>

        {/* Upcoming Events Section */}
        <div className={`bg-white rounded-xl shadow-md ${responsive.cardPadding}`}>
          <h2 className={`${responsive.headingSize} font-bold text-gray-800 mb-4 flex items-center gap-2`}>
            <FiCalendar className="text-pink-600" /> Recent & Upcoming Events
          </h2>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.map((event, index) => {
                // Check if event is past or future
                const isPast = event.date ? new Date(event.date) < new Date() : false;
                return (
                  <div key={event._id || index} className={`border-l-4 ${isPast ? 'border-gray-400' : 'border-pink-500'} pl-3 py-2 hover:bg-gray-50 transition-colors`}>
                    <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'justify-between items-start'}`}>
                      <h3 className={`${deviceInfo.isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-800`}>
                        {event.title}
                      </h3>
                      {isPast && (
                        <span className={`${deviceInfo.isMobile ? 'text-[8px]' : 'text-[10px]'} bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full flex-shrink-0`}>
                          Past Event
                        </span>
                      )}
                    </div>
                    <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'items-center gap-3'} mt-1 text-xs text-gray-500`}>
                      <span className="flex items-center gap-1">
                        <FiCalendar className="w-3 h-3" />
                        {formatDate(event.date)}
                      </span>
                      {event.venue && (
                        <span className="flex items-center gap-1">
                          <FiMapPin className="w-3 h-3" />
                          {event.venue}
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600 mt-1 line-clamp-2`}>
                        {event.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <FiCalendar className={`${deviceInfo.isMobile ? 'w-8 h-8' : 'w-10 h-10'} text-gray-300 mx-auto mb-2`} />
              <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-500`}>No events created yet</p>
              <Link to="/admin/events" className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-pink-600 hover:text-pink-800 mt-2 inline-block`}>
                Create Event →
              </Link>
            </div>
          )}
          <Link to="/admin/events" className={`block text-center ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-pink-600 hover:text-pink-800 mt-4`}>
            View All Events →
          </Link>
        </div>
      </div>

      {/* Add Student Modal */}
      <AddPupilModal
        isOpen={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
        onSave={handleAddStudent}
      />

      {/* Add Teacher Modal */}
      <AddTeacherModal
        isOpen={showAddTeacherModal}
        onClose={() => setShowAddTeacherModal(false)}
        onSave={handleAddTeacher}
      />

      {/* AI Responsive CSS */}
      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-view .p-4 {
            padding: 12px !important;
          }
          .mobile-view .gap-6 {
            gap: 12px !important;
          }
          .mobile-view .text-xl {
            font-size: 1.125rem !important;
          }
          .mobile-view .text-lg {
            font-size: 1rem !important;
          }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .tablet-view .grid-cols-4 {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }
        .responsive-wrapper {
          transition: all 0.3s ease;
        }
        .stat-card {
          transition: all 0.3s ease;
        }
        .stat-card:hover {
          transform: translateY(-2px);
        }
      `}</style>
    </Layout>
  );
};

export default AdminDashboard;